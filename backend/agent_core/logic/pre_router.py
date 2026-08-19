import os
import re
import json
import logging
import openai
from core.timezone import get_now_br

logger = logging.getLogger(__name__)

def get_date_context(config):
    from datetime import timedelta
    now = get_now_br()
    
    past_limit = getattr(config, 'date_awareness_past_days', 7)
    if past_limit is None:
        past_limit = 7
    future_limit = getattr(config, 'date_awareness_future_days', 7)
    if future_limit is None:
        future_limit = 7
        
    # Dias Anteriores
    past_days = []
    for i in range(-past_limit, 0):
        dt = now + timedelta(days=i)
        w_name = ["segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado", "domingo"][dt.weekday()]
        if i == -1:
            line = f"Ontem foi {w_name}, dia {dt.strftime('%d/%m/%y')}"
        else:
            suffix = "passado" if dt.weekday() in [5, 6] else "passada"
            line = f"{w_name.capitalize()} {suffix} foi dia {dt.strftime('%d/%m/%y')}"
        past_days.append(line)
        
    # Dias Posteriores
    future_days = []
    for i in range(1, future_limit + 1):
        dt = now + timedelta(days=i)
        w_name = ["segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado", "domingo"][dt.weekday()]
        if i == 1:
            line = f"Amanhã é {w_name}, dia {dt.strftime('%d/%m/%y')}"
        elif i == 2:
            line = f"Depois de amanhã é {w_name}, dia {dt.strftime('%d/%m/%y')}"
        elif i == 7:
            line = f"{w_name.capitalize()} que vem é dia {dt.strftime('%d/%m/%y')}"
        else:
            line = f"{w_name.capitalize()} é dia {dt.strftime('%d/%m/%y')}"
        future_days.append(line)
        
    past_str = "\n".join(past_days)
    future_str = "\n".join(future_days)
    
    context = (
        "### CONTEXTO DE CONSCIÊNCIA TEMPORAL (Use para resolver e preencher datas relativas citadas pelo usuário):\n\n"
        f"{past_limit} Dias Anteriores\n"
        f"{past_str}\n\n"
        f"{future_limit} Dias Posteriores\n"
        f"{future_str}\n\n"
        f"Hoje é {now.strftime('%d/%m/%y')} e são {now.strftime('%H:%M')}"
    )
    return context


# Template padrão (customizável por agente via campo `pre_router_prompt`).
# Placeholders disponíveis (usar exatamente com chaves simples, ex: {tools_desc}):
#   {initial_msg}, {initial_ignore_message}, {greeting_mode}, {ad_mode},
#   {main_system_prompt}, {tools_desc}, {agents_desc}, {main_agent_id}, {date_context}
# O rodapé com o schema JSON obrigatório (PRE_ROUTER_JSON_FOOTER) NUNCA é customizável:
# é sempre concatenado após este template para garantir que o Pre-Router continue
# retornando um JSON estruturado válido, mesmo que o usuário edite o texto acima.
DEFAULT_PRE_ROUTER_PROMPT_TEMPLATE = """Você é o "Pre-Router AI", o primeiro contato que lê a mensagem do usuário antes dela ser enviada aos Agentes.
Sua função é séxtupla:
1. Identificar se a mensagem é APENAS uma saudação curta, cumprimento, agradecimento (Ex: "Oi", "Olá", "Oie", "Oiee", "Bom dia", "Tudo bem?", "Obrigado") ou um ELOGIO / REAÇÃO AFETIVA OU POSITIVA (Ex: "Amei", "Amei.", "Adorei", "Adorei!", "Gostei", "Gostei muito", "Muito bom", "Maravilha", "Sensacional", "Top", "Show", "Que legal", "Que bom", "❤️", "🥰", "😍", "👏") ou uma confirmação/reação curta de encerramento (Ex: "Ta bom", "Tá bom", "Ta bem", "Tudo bem", "Ok", "Entendi", "Certo", "Combinado", "Beleza", "Ótimo", "Maravilha", "👍", "👌", "Perfeito") ou emoji negativo (Ex: 👎, 🖕, 😡, 😠, 😕, 😢, 😭) OU uma mensagem de teste do usuário ("teste", "testando") e NÃO contém nenhuma pergunta ou requisição técnica.
   - SAUDAÇÃO CONFIGURADA: "{initial_msg}"
   - MENSAGEM DE ANÚNCIO (IGNORAR): "{initial_ignore_message}"
   - MODO DE SAUDAÇÃO: "{greeting_mode}"
   - MODO DE ANÚNCIO: "{ad_mode}"
   - SYSTEM PROMPT DO AGENTE PRINCIPAL (Utilize para guiar a saudação ou anúncio dinâmico se os modos forem 'prompt'): "{main_system_prompt}"

   CRITÉRIO RÍGIDO:
   - Se a mensagem for "Oi", "Oie", "Olá" ou similares curtos e MODO DE SAUDAÇÃO for "panel", você DEVE definir 'eh_saudacao' como true e usar a 'SAUDAÇÃO CONFIGURADA' como sua 'resposta_direta'.
   - Se a mensagem for "Oi", "Oie", "Olá" ou similares curtos e MODO DE SAUDAÇÃO for "prompt", você DEVE gerar uma resposta de saudação inicial amigável, personalizada e perfeitamente alinhada com as diretrizes de tom e regras do SYSTEM PROMPT DO AGENTE PRINCIPAL. Defina 'eh_saudacao' as true e retorne esta saudação em 'resposta_direta'.
   - Se a mensagem for um ELOGIO, AGRADECIMENTO ou REAÇÃO AFETIVA/POSITIVA (Ex: "Amei", "Amei.", "Adorei", "Gostei muito", "Muito bom", "Maravilha", "Top", "Obrigado", "Obrigada", "Valeu", "❤️", "🥰"):
     * Se for a primeira reação/agradecimento do usuário (o assistente ainda não enviou mensagem de encerramento recente no histórico), defina 'eh_agradecimento' como true, 'eh_saudacao' como true e use uma resposta calorosa e simpática em 'resposta_direta' (Ex: "Fico muito feliz que tenha gostado! 🥰 Se precisar de mais alguma coisa ou tiver qualquer dúvida, é só me chamar.").
     * Se for o SEGUNDO (ou subsequente) agradecimento/encerramento do usuário (o assistente JÁ enviou uma resposta de encerramento como "Por nada", "é só chamar", "estou à disposição" ou emoji no histórico recente), NUNCA responda com mensagens de novo. Defina 'eh_agradecimento' como true, 'eh_saudacao' como true, 'eh_agradecimento_recorrente' como true e 'resposta_direta' como null para silenciar a automação sem enviar nada.
   - Se a mensagem for uma REAÇÃO NEGATIVA ou emoji de insatisfação/raiva/tristeza (Ex: 👎, 🖕, 😡, 😠, 🤬, 😕, 🙁, ☹️, 😢, 😭 e variações), você deve definir 'eh_saudacao' as true e usar a resposta empática: "Puxa, sinto muito! 😕 Percebi que algo não deu certo. O que aconteceu? Como posso te ajudar a resolver de uma forma melhor?" como 'resposta_direta'.
   - Se a mensagem for uma CONFIRMAÇÃO/REAÇÃO POSITIVA OU ENCERRAMENTO (Ex: "Ta bom", "Tá bom", "Ta bem", "Tudo bem", "Ok", "Entendi", "Combinado", "Certo", "Perfeito", "Beleza", "Ótimo", "Maravilha", emojis de confirmação como 👍, 👌) e o assistente não fez uma pergunta direta por último: se o assistente já deu mensagem de encerramento recente, defina 'resposta_direta' como null e 'eh_agradecimento_recorrente' como true; caso contrário, use uma resposta simpática e conclusiva de confirmação (Ex: "Combinado! Se precisar de qualquer ajuda, estou por aqui. 😊"). NUNCA reenvie links de checkout nem repita informações de formas de pagamento já fornecidas.

   NOTA SOBRE HISTÓRICO: Se a mensagem for um "sim", "não", ou resposta curta que responde a uma pergunta direta do histórico recente (ex: a IA perguntou 'Qual seu e-mail?' ou 'Você prefere X ou Y?'), NÃO é apenas confirmação, é parte do fluxo da conversa, logo eh_saudacao deve ser false. (Isso não se aplica a emojis negativos como 👎 que são sempre interceptados).

2. Identificar se a mensagem atual do usuário é uma MENSAGEM AUTOMÁTICA de ausência comercial ou mensagem enviada por um BOT do outro lado (por exemplo, mensagens informando horário de atendimento, saudações automáticas de bots de empresas. Exemplos: "Olá! No momento não posso atender...", "Nosso horário é de 8h às 18h...", "Obrigado por seu contato, responderemos em breve...").
   
   ⚠️ ATENÇÃO EXTREMA - MENSAGENS DE ANÚNCIO E CLICK-TO-CHAT (NÃO SÃO MENSAGENS AUTOMÁTICAS):
   - Mensagens pré-formatadas que o CLIENTE envia ao clicar em um anúncio ou link de WhatsApp (Ex: "Olá! Quero saber mais sobre o método laser day", "Olá, vi seu anúncio...", "Tenho interesse no curso X", "Vim do Instagram...") NUNCA SÃO MENSAGENS AUTOMÁTICAS DO CONTATO. Elas são a PRIMEIRA MENSAGEM REAL de um lead interessado!
   - Para essas mensagens pré-formatadas de anúncios/links do WhatsApp enviadas pelo cliente, você DEVE OBRIGATORIAMENTE definir 'eh_mensagem_automatica' como FALSE. Trate-as como uma pergunta/interesse legítimo do usuário (extraia a dúvida em 'perguntas_extraidas', defina 'precisa_rag' como true, ou trate como início de atendimento).

   ⛔ EXCEÇÕES RÍGIDAS (EXEMPLOS QUE NUNCA DEVEM SER CLASSIFICADOS COMO MENSAGEM AUTOMÁTICA):
   - **Elogios, reações humanas e mensagens de afeto/satisfação** (Ex: "Amei", "Amei.", "Adorei", "Gostei", "Top", "Muito bom", "Show", "Valeu", "Obrigada", "Obrigado", "❤️", "🥰", "👏") NUNCA SÃO MENSAGENS AUTOMÁTICAS DE AUSÊNCIA. Elas são mensagens humanas legítimas e 'eh_mensagem_automatica' DEVE SER OBRIGATORIAMENTE FALSE.
   - Mensagens enviadas ao clicar em botões de anúncios, botões de templates ou links do WhatsApp (Ex: "Olá! Quero saber mais sobre...", "Tenho interesse").
   - Perguntas diretas do usuário sobre valores, preços, horários, cursos, serviços ou dúvidas gerais.
   - Qualquer interação iniciada por um cliente real querendo atendimento.
   - Para todas as exceções acima, você DEVE OBRIGATORIAMENTE definir 'eh_mensagem_automatica' como FALSE.

   Se você identificar que a mensagem do usuário é VERDADEIRAMENTE uma mensagem automática de ausência comercial ou bot do outro lado:
   - Defina 'eh_mensagem_automatica' as true.
   - Defina 'eh_saudacao' as false.
   - Defina 'resposta_direta' como null (não responderemos nada para evitar loops).
   - Defina 'perguntas_extraidas' como null ou "".

3. Se a mensagem contiver perguntas ou requisições (e não for automática), você deve extrair APENAS a(s) pergunta(s)/requisição(ões) da mensagem (removendo saudações, áudios confusos, lixo). Combine tudo em 'perguntas_extraidas'. Se houver mais de uma pergunta, junte todas.

4. **DECLARAÇÃO DE DÚVIDA OU TÓPICO VAGO SEM PERGUNTA ESPECÍFICA (PROIBIDO GERAR LISTA DE FAQ):**
   - Se o usuário apenas declarar que TEM DÚVIDAS afirmativamente, que não finalizou por ter dúvidas, ou citar um assunto genérico sem fazer uma pergunta objetiva (Ex: "Não finalizei tive umas duvida", "Sobre a máquina", "Tenho dúvidas", "Quero tirar dúvidas"), você NUNCA DEVE inventar, selecionar ou expandir isso em uma lista de perguntas da base nem acionar o RAG.
   - NUNCA preencha `perguntas_extraidas` ou `lista_perguntas_extraidas` para mensagens sem perguntas objetivas.
   - Defina `precisa_esclarecimento` OBRIGATORIAMENTE como true e forneça uma resposta educada perguntando qual é a dúvida específica dele em `resposta_esclarecimento` (Ex: "Olá! Quais seriam as suas dúvidas? Me conte o que você gostaria de saber para que eu possa te ajudar!").
   
   ⛔ **REGRA CRÍTICA DE NEGAÇÃO DE DÚVIDAS (ESTRITAMENTE PROIBIDO PEDIR ESCLARECIMENTO):**
   - Se o usuário afirmar que **NÃO TEM DÚVIDAS** ou responder negativamente a uma pergunta do assistente/template sobre dúvidas (Ex: "Não tenho", "Não tenho dúvida", "Não tenho dúvidas", "Nenhuma", "Não ficou dúvida", "Tudo claro", "Sem dúvidas", "Tranquilo", "Não"):
     * Você **NUNCA DEVE** definir `precisa_esclarecimento` como true!
     * Você **NUNCA DEVE** perguntar qual é a dúvida dele (Ex: "Qual é a sua dúvida?", "Você não tem o quê?"), pois o cliente disse expressamente que NÃO tem dúvidas!
     * Defina `precisa_esclarecimento` como false, `eh_saudacao` como false, `perguntas_extraidas` como "O cliente informou que não possui dúvidas" ou deixe o Agente Principal responder para conduzir o fechamento comercial (oferecer o link de compra/inscrição ou verificar se pode ajudar na finalização).
   
   ⚠️ EXCEÇÃO PARA SAUDAÇÕES EM HISTÓRICO: Se a mensagem for apenas um cumprimento curto como "Oi", "Olá", "Oie", "Bom dia", "Tudo bem?" e houver histórico de conversa, NÃO a trate como vaga ou confusa e nem defina 'precisa_esclarecimento' como true. Em vez disso, defina 'eh_saudacao' as true e use a 'SAUDAÇÃO CONFIGURADA' ou gere a saudação dinâmica (caso MODO DE SAUDAÇÃO seja prompt).
   ⚠️ REGRA PARA PERGUNTAS DIRETAS: Defina 'precisa_esclarecimento' como false APENAS quando a mensagem contiver uma pergunta direta com intenção objetiva ("é curso online?", "como funciona?", "qual o valor?", "qual máquina indica?"). Citação isolada de assunto sem pergunta ("Sobre a máquina") exige esclarecimento.

 5. Se o usuário perguntar por alguém (Quem é X?), isso NUNCA é vago. Deixe o Agente Principal responder.

 5b. **ENRIQUECIMENTO DE PERGUNTAS VAGAS / QUERY ENRICHMENT (FIDELIDADE STRICTA):**
      - Se o usuário enviar uma pergunta curta, vaga, com pronomes soltos ou intenção geral de saber sobre o curso (Ex: "Na vdd, gostaria de saber sobre os cursos", "como funciona?", "qual o valor?"), melhore a pergunta substituindo os pronomes soltos pelo assunto do histórico ou pela dúvida geral direta.
      - 🎯 **REGRA DE OURO DE ALINHAMENTO COM A BASE DE CONHECIMENTO (OBRIGATÓRIO):**
        Se houver uma seção 'BASE DE CONHECIMENTO CADASTRADA (REFERÊNCIA PARA ALINHAMENTO)' fornecida neste prompt, verifique se a intenção da dúvida do usuário corresponde a alguma das Perguntas Cadastradas. Se HOUVER correspondência de intenção, REESCREVA a mensagem em `perguntas_extraidas` e na `lista_perguntas_extraidas` utilizando a pergunta cadastrada mais próxima (ex: "Como funciona o curso de remoção de tatuagem?").
      - ⛔ **PROIBIDO INVENTAR TERMOS, LOCAIS E CANAIS DE ATENDIMENTO NÃO DITOS (EX: 'INSTAGRAM', 'DISPONÍVEIS'):** NUNCA invente ou adicione canais de atendimento (ex: "Instagram", "WhatsApp"), locais ou marcas que o usuário NÃO mencionou explicitamente na mensagem dele. Se o usuário perguntou "Posso enviar áudio?", NUNCA altere para "Posso enviar áudio no Instagram..."! O alinhamento só deve acontecer se a pergunta do usuário for verdadeiramente sobre o assunto cadastrado no RAG.
      - **Exemplo de ERRO PROIBIDO:**
        - Usuário envia: "Posso enviar áudio?"
        - ❌ ERRO PROIBIDO: "Posso enviar áudio com minhas dúvidas sobre o perfil do Instagram da Tarcira?"
        - ✅ CORRETO: "Posso enviar áudio?" (Não alterar a pergunta nem inventar Instagram)
      - ⛔ **PROIBIDO INVENTAR OU ADICIONAR PERGUNTAS ADICIONAIS OU ENVIAR LISTA DE FAQ**: NUNCA invente perguntas suplementares, listas de dúvidas mais comuns nem pergunte/responda coisas que o usuário NÃO perguntou explicitamente.
      - Se a mensagem do usuário for um relato, objeção, desabafo, pergunta simples ou frase completa, MANTENHA A INTENÇÃO E O TEXTO ORIGINAL em `perguntas_extraidas` SEM inventar perguntas adicionais ou canais de mídia no final.
      - Certifique-se de que a resposta JSON contenha `"precisa_esclarecimento": false` ao enriquecer a pergunta com sucesso.

 5c. **MÚLTIPLAS PERGUNTAS E INTENÇÕES / MULTIPLE INTENTS (RIGOROSAMENTE OBRIGATÓRIO):**
       - O usuário frequentemente envia mais de uma pergunta ou dúvida na mesma mensagem (seja por quebras de linha, vírgulas, a palavra 'e', ou frases compostas). Exemplos: "O curso é on-line \n De onde vc é", "como funciona, quanto custa os equipamentos?", "é online? qual o valor?".
       - ⛔ **PROIBIDO OMITIR OU DESCARTAR QUALQUER UMA DAS PERGUNTAS:** NUNCA descarte a segunda ou terceira pergunta (ex: "De onde você é?", "De onde é?", "Onde fica a sede?", "Tem certificado?") só porque ela é curta ou veio em linha separada!
       - Você DEVE OBRIGATORIAMENTE extrair e separar CADA UMA das dúvidas em um elemento distinto do array `"lista_perguntas_extraidas"`.
       - E em `perguntas_extraidas`, você DEVE OBRIGATORIAMENTE combinar TODAS as perguntas do array separadas por quebra de linha `\n`.
       - Exemplo 1: Para "O curso é on-line \n De onde vc é", você DEVE retornar `"lista_perguntas_extraidas": ["O curso de remoção de tatuagem é online?", "De onde você é / onde fica a sede do curso?"]` e `"perguntas_extraidas": "O curso de remoção de tatuagem é online?\nDe onde você é / onde fica a sede do curso?"`.
       - Exemplo 2: Para "como funciona, quanto custa os equipamentos?", você DEVE retornar `"lista_perguntas_extraidas": ["Como funciona o curso?", "Qual é o valor dos equipamentos/máquinas?"]` e `"perguntas_extraidas": "Como funciona o curso?\nQual é o valor dos equipamentos/máquinas?"`.

  5d. **RESOLUÇÃO DE CONFIRMAÇÕES A OFERTAS ANTERIORES DO ASSISTENTE (MUITO IMPORTANTE):**
       - Se no turno anterior o assistente ofereceu opções ou informações (Ex: "Se quiser mais informações sobre o Método Laser Day, sobre pagamentos ou se quiser o link de compra, é só me avisar") e o usuário respondeu com uma confirmação/interesse EXPLÍCITO (Ex: "Gostaria", "Quero", "Sim", "Gostaria sim", "Pode enviar", "Aceito"):
       - Você DEVE OBRIGATORIAMENTE olhar todas as opções oferecidas pelo assistente no histórico e expandir "Gostaria" em TODAS as dúvidas correspondentes em `lista_perguntas_extraidas` e em `perguntas_extraidas` unidas por `\n`.
       - **Exemplo Real:**
         - Assistente disse anteriormente: "Se quiser mais informações sobre o Método Laser Day, sobre pagamentos ou se quiser o link de compra, é só me avisar."
         - Usuário respondeu: "Gostaria"
         - ✅ VOCÊ DEVE EXTRAIR:
           `"lista_perguntas_extraidas": ["Como funciona o curso?", "Quais são as formas de pagamento?", "Qual é o link de compra / inscrição?"]`
           `"perguntas_extraidas": "Como funciona o curso?\nQuais são as formas de pagamento?\nQual é o link de compra / inscrição?"`
       - ⛔ **PROIBIDO DESCARTAR AS OUTRAS OPÇÕES OFERECIDAS:** NUNCA reduza "Gostaria" a apenas "Gostaria de saber mais sobre o curso", pois o cliente aceitou receber TODAS as informações oferecidas pelo assistente!
       - ⚠️ **CONFIRMAÇÕES E ENCERRAMENTOS PASSIVOS (NUNCA EXPANDIR PARA OFERTAS):** Encerramentos e confirmações passivas como "Ta bom", "Tá bom", "Ta bem", "Tudo bem", "Ok", "Entendi", "Certo", "Beleza", "Ótimo", "Maravilha" NUNCA devem ser expandidos para ofertas de cursos/links/pagamentos. Trate-os como confirmação/saudação (eh_saudacao = true) com resposta conclusiva amigável.

  5e. **RESOLUÇÃO CONTEXTUAL DE RESPOSTAS A PERGUNTAS DO TEMPLATE OU HISTÓRICO RECENTE:**
       - Se no turno anterior o assistente ou o template enviou uma pergunta direta (Ex: "Você tem alguma dúvida?", "Quer receber o link?", "Qual sua dúvida?"):
         * Se o usuário responder "Não tenho", "Não", "Nenhuma": Isso significa que ele NÃO tem dúvidas e está respondendo diretamente ao assistente. NUNCA pergunte "Você não tem o quê?".
         * Se o usuário responder "Tenho", "Quero", "Sim", "Gostaria": Trate como confirmação legítima de interesse.

 6. **DECIDIR E MAPEAR ACIONAMENTO DE FERRAMENTAS (MUITO IMPORTANTE):**
    Analise a mensagem atual e o histórico para determinar se o usuário está solicitando uma ação que corresponde a alguma destas ferramentas cadastradas:
    {tools_desc}
    - Se o usuário pedir para marcar/agendar, listar agendamentos, cancelar ou verificar horários, ou qualquer ação técnica equivalente, você DEVE preencher `chamada_ferramenta` estruturando a chamada com o nome da ferramenta e os argumentos necessários perfeitamente extraídos (ex: resolvendo datas relativas usando o contexto temporal abaixo).
    - **⚠️ REGRA DE OURO PARA SUPORTE HUMANO (`transferir_suporte_humano`)**: NUNCA acione esta ferramenta se o usuário estiver apenas tirando dúvidas comuns sobre o curso, preços, políticas ou fazendo perguntas gerais (Ex: "Quanto custa?", "Qual o valor em reais?"). Você deve acionar `transferir_suporte_humano` se o usuário solicitar explicitamente falar com um atendente humano, suporte, especialista, demonstrar extrema insatisfação com a IA OU se solicitar cancelamento, devolução ou reembolso de compras/cursos. NUNCA mencione em texto que vai transferir para outro setor sem efetivamente preencher `chamada_ferramenta` com `transferir_suporte_humano`.
    - **⛔ MENSAGENS DE AVISO DE ACESSO PENDENTE (NÃO TRANSFERIR):** Frases como "já paguei, só não acessei ainda", "não assisti ainda", "não entrei ainda" NUNCA são erros técnicos nem pedidos de suporte. NUNCA acione `transferir_suporte_humano` e NUNCA responda prometendo transferir para outro setor. Responda apenas parabenizando e incentivando o aluno a acessar quando puder.
    - Se nenhuma ferramenta for necessária, defina `chamada_ferramenta` como null.

7. **DECIDIR NECESSIDADE DE CONSULTA A BASE VETORIAL (RAG):**
   - Se a mensagem do usuário envolver perguntas sobre informações do negócio, produtos, termos, preços, políticas, etc., defina `precisa_rag` como true. Se for saudação, agradecimento ou ação puramente de ferramenta (como agendamento/cancelamento puro), defina como false.

CRITÉRIO RÍGIDO DE ANÚNCIO (ad_mode == "prompt"):
- Se o MODO DE ANÚNCIO for "prompt", analise de forma inteligente se a mensagem do usuário é um disparo em massa, anúncio ou spam. Se for, marque 'eh_anuncio' como true e ignore ou responda com uma frase sutil coerente com as diretrizes do SYSTEM PROMPT DO AGENTE PRINCIPAL em 'resposta_direta'.

Baseado no que o usuário quer, escolha qual agente abaixo deve receber a mensagem:
{agents_desc}
Se estiver em dúvida, escolha SEMPRE o Agente Principal (ID: {main_agent_id}).

{date_context}"""

# Rodapé fixo (NÃO customizável) com o schema JSON obrigatório de retorno.
PRE_ROUTER_JSON_FOOTER = """

Retorne SEMPRE um JSON completo com TODAS as chaves:
{
  "eh_saudacao": boolean,
  "eh_agradecimento": boolean,
  "eh_agradecimento_recorrente": boolean,
  "eh_mensagem_automatica": boolean,
  "precisa_esclarecimento": boolean,
  "eh_anuncio": boolean,
  "resposta_direta": "string ou null",
  "resposta_esclarecimento": "string ou null",
  "id_agente_alvo": integer,
  "perguntas_extraidas": "string ou null",
  "lista_perguntas_extraidas": ["string"],
  "data_extraida": "YYYY-MM-DD ou null",
  "precisa_rag": boolean,
  "chamada_ferramenta": {
    "nome": "string",
    "argumentos": {}
  } ou null
}"""


class _SafeFormatDict(dict):
    """Evita KeyError quando o prompt customizado do usuário referencia uma
    chave inexistente ou tem chaves soltas ({}) — mantém o texto literal
    nesse caso em vez de quebrar o Pre-Router inteiro."""
    def __missing__(self, key):
        return "{" + key + "}"


def _build_pre_router_system_prompt(main_agent, template_vars: dict) -> str:
    custom_template = getattr(main_agent, 'pre_router_prompt', None)
    if custom_template and custom_template.strip():
        try:
            base = custom_template.format_map(_SafeFormatDict(**template_vars))
        except Exception as e:
            logger.error(f"Erro ao formatar pre_router_prompt customizado do agente {getattr(main_agent, 'id', '?')}: {e}. Usando template padrão.")
            base = DEFAULT_PRE_ROUTER_PROMPT_TEMPLATE.format(**template_vars)
    else:
        base = DEFAULT_PRE_ROUTER_PROMPT_TEMPLATE.format(**template_vars)
    return base + PRE_ROUTER_JSON_FOOTER


async def enrich_user_message(message: str, history: list, client) -> str:
    """Enriquece a mensagem atual com base no histórico de conversas recente (Query Enrichment)."""
    if not history or not message.strip():
        return message

    # Se a mensagem já for estruturada (>70 chars ou >10 palavras), não reescrevemos
    if len(message.strip()) > 70 or len(message.strip().split()) > 10:
        return message

    # Se a mensagem for uma confirmação ou encerramento puro (ex: "Ta bom", "Ok", "Entendi", "Combinado", "Beleza"), não reescrevemos
    msg_clean_check = message.strip().lower()
    for char in ["?", "!", ".", ",", ";", ":", "-", "_", "(", ")", "[", "]", "{", "}"]:
        msg_clean_check = msg_clean_check.replace(char, "")
    msg_clean_check = re.sub(r'\s+', ' ', msg_clean_check).strip()

    confirmation_closings = [
        "ta bom", "tá bom", "ta bem", "tá bem", "tudo bem", "tudo bom",
        "ok", "entendi", "tendi", "certo", "beleza", "blz", "perfeito", "combinado",
        "fechado", "tá certo", "ta certo", "ótimo", "otimo", "tá ótimo", "ta otimo",
        "maravilha", "belezinha", "tá joia", "ta joia", "joia", "jóia", "combinadíssimo", "combinadissimo"
    ]
    if msg_clean_check in confirmation_closings:
        return message

    history_text = ""
    for h in history:
        role = (h.get('role') if isinstance(h, dict) else getattr(h, 'role', 'user')).upper()
        content = (h.get('content') if isinstance(h, dict) else getattr(h, 'content', ''))
        history_text += f"{role}: {content}\n\n"

    system_prompt = (
        "Você é um assistente especializado em enriquecimento e desambiguação de mensagens (Query Enrichment).\n"
        "Sua única tarefa é substituir pronomes vagos (como 'ele', 'isso', 'quanto é?') pelo assunto citado no histórico recente.\n\n"
        "⚠️ REGRAS ANTI-ALUCINAÇÃO E ANTI-ESPECULAÇÃO (ESTRITAMENTE OBRIGATÓRIAS):\n"
        "1. PROIBIDO INVENTAR PERGUNTAS OU DETALHES NÃO DITOS E NÃO OFERECIDOS: NUNCA crie, deduza ou adicione perguntas adicionais que o usuário NÃO perguntou e que o assistente NÃO ofereceu.\n"
        "2. 🎯 EXCEÇÃO CRÍTICA PARA RESPOSTAS A OFERTAS DO ASSISTENTE: Se na mensagem anterior o assistente ofereceu opções ou tópicos (Ex: 'Se quiser mais informações sobre o Método Laser Day, sobre pagamentos ou se quiser o link de compra, é só me avisar') e o usuário respondeu com confirmação/interesse EXPLÍCITO (Ex: 'Gostaria', 'Quero', 'Sim', 'Gostaria sim', 'Aceito'): Você DEVE OBRIGATORIAMENTE expandir a resposta do usuário incluindo TODAS as opções que o assistente ofereceu no turno anterior! NUNCA aplique essa regra a mensagens de confirmação passiva ou encerramento (Ex: 'Ta bom', 'Ok', 'Entendi', 'Beleza', 'Certo').\n"
        "3. Se a mensagem do usuário for uma objeção, desabafo ou relato de experiência anterior, MANTENHA A MENSAGEM EXATAMENTE COMO ESTÁ sem inventar perguntas suplementares no final.\n"
        "4. NUNCA invente ou presuma nomes de marcas, pessoas ou clínicas específicas se não estiverem no histórico.\n\n"
        "Retorne APENAS a mensagem desambiguada resultante, sem qualquer introdução, explicação ou aspas."
    )
    user_prompt = f"{history_text}\nMENSAGEM ATUAL DO USUÁRIO:\n{message}"

    try:
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.0,
            max_tokens=200
        )
        enriched = response.choices[0].message.content.strip()
        if enriched:
            if enriched.startswith('"') and enriched.endswith('"'):
                enriched = enriched[1:-1]
            
            # Garantia determinística em Python para respostas verdadeiramente curtas de interesse ("Gostaria", "Quero", "Sim", etc.)
            msg_clean = message.strip().lower()
            words_count = len(msg_clean.split())
            if words_count <= 4 or len(msg_clean) <= 25:
                short_interest_words = ["gostaria", "quero", "sim", "pode ser", "gostaria sim", "aceito", "gostaria de saber", "manda", "envia", "mande", "envie"]
                if any(msg_clean == w or msg_clean.startswith(w) for w in short_interest_words):
                    last_assistant_msg = ""
                    for h in reversed(history):
                        role = (h.get('role') if isinstance(h, dict) else getattr(h, 'role', '')).lower()
                        content = (h.get('content') if isinstance(h, dict) else getattr(h, 'content', ''))
                        if role == "assistant" and content:
                            last_assistant_msg = str(content).lower()
                            break

                    if last_assistant_msg:
                        parts = ["mais informações sobre o curso"]
                        if ("pagamento" in last_assistant_msg or "pagamentos" in last_assistant_msg) and "pagamento" not in enriched.lower():
                            parts.append("sobre as formas de pagamento")
                        if ("link" in last_assistant_msg or "compra" in last_assistant_msg or "inscrição" in last_assistant_msg) and ("link" not in enriched.lower() and "compra" not in enriched.lower()):
                            parts.append("do link de compra / inscrição")

                        if len(parts) > 1:
                            enriched = f"Gostaria de {', '.join(parts[:-1])} e {parts[-1]}."

            return enriched
    except Exception as e:
        logger.error(f"Erro ao enriquecer mensagem no pre-router: {e}")
    return message
    return message


async def _get_kb_reference_context(main_agent, message: str, async_db=None):
    """Recupera contexto de referência da Base de Conhecimento para alinhar a reescrita de perguntas do Pre-Router.
    Fase 1: Pré-Busca Vetorial RAG com limite de relevância >= 0.60.
    Fase 2 (Fallback): Se a pré-busca vetorial retornar 0 itens >= 0.60, carrega todas as perguntas cadastradas
            nas bases de conhecimento do agente para que o Pre-Router selecione a pergunta correspondente.
    """
    if not main_agent or not message or not message.strip():
        return "", {
            "fase": "⚠️ Mensagem Vazia ou Agente Ausente",
            "status": "vazio",
            "perguntas_referencia": [],
            "custo": "R$ 0,00"
        }

    try:
        from database import async_session
        from services.rag.core import search_knowledge_base
        from models import KnowledgeItemModel, AgentConfigModel
        from sqlalchemy import select
        from sqlalchemy.orm import selectinload

        async def _fetch(db_session):
            agent_id = getattr(main_agent, 'id', None)
            kb_ids = []
            if agent_id:
                try:
                    stmt_agent = select(AgentConfigModel).options(selectinload(AgentConfigModel.knowledge_bases)).where(AgentConfigModel.id == agent_id)
                    res_agent = await db_session.execute(stmt_agent)
                    agent_obj = res_agent.scalars().first()
                    if agent_obj:
                        kb_ids = [kb.id for kb in agent_obj.knowledge_bases] or ([agent_obj.knowledge_base_id] if agent_obj.knowledge_base_id else [])
                except Exception as e_ag:
                    logger.warning(f"Erro ao buscar agent_obj no _fetch: {e_ag}")
            
            if not kb_ids:
                kb_ids = [kb.id for kb in getattr(main_agent, 'knowledge_bases', [])] or ([main_agent.knowledge_base_id] if getattr(main_agent, 'knowledge_base_id', None) else [])

            if not kb_ids:
                return "", {
                    "fase": "⚠️ Nenhuma Base de Conhecimento Vinculada",
                    "status": "sem_base",
                    "perguntas_referencia": [],
                    "detalhe": f"O agente '{getattr(main_agent, 'name', 'Principal')}' (ID: {agent_id}) não possui nenhuma Base de Conhecimento vinculada.",
                    "custo": "R$ 0,00"
                }

            # Carrega catálogo de perguntas via SQL sem realizar embeddings/busca vetorial antes do Pre-Router
            stmt = select(KnowledgeItemModel.question).where(KnowledgeItemModel.knowledge_base_id.in_(kb_ids))
            res = await db_session.execute(stmt)
            all_questions = [q for q in res.scalars().all() if q and q.strip()]

            if all_questions:
                ctx = "\n### BASE DE CONHECIMENTO CADASTRADA (REFERÊNCIA DE CATÁLOGO PARA ALINHAMENTO):\n"
                ctx += "Utilize o catálogo de perguntas cadastradas abaixo para ALINHAR E REESCREVER a dúvida do usuário no formato de pergunta oficial:\n"
                for idx, q in enumerate(all_questions[:100], 1): # limite defensivo de 100 perguntas
                    ctx += f"{idx}. \"{q}\"\n"

                info = {
                    "fase": "Catálogo de Referência (Pré-Router)",
                    "status": "catalogo_carregado",
                    "perguntas_referencia": all_questions[:100],
                    "usou_fallback": False,
                    "custo": "R$ 0,00 (Busca Vetorial será executada APÓS o Pre-Router)"
                }
                return ctx, info

            return "", {
                "fase": "⚠️ Nenhuma Pergunta Encontrada no Catálogo",
                "status": "catalogo_vazio",
                "perguntas_referencia": [],
                "detalhe": "Nenhum item cadastrado nas bases de conhecimento do agente.",
                "custo": custo_str
            }

        from sqlalchemy.ext.asyncio import AsyncSession
        from unittest.mock import AsyncMock
        
        is_real_async = isinstance(async_db, (AsyncSession, AsyncMock)) or getattr(async_db, 'is_async', False)
        if is_real_async:
            return await _fetch(async_db)
        else:
            async with async_session() as db_session:
                return await _fetch(db_session)
    except Exception as e:
        logger.error(f"Erro ao obter contexto de referência da Base de Conhecimento para o Pre-Router: {e}")
        return "", {
            "fase": "❌ Erro Geral de Consulta",
            "status": "erro_geral",
            "perguntas_referencia": [],
            "detalhe": f"Erro inesperado: {str(e)}",
            "custo": "R$ 0,00"
        }


def _has_previous_assistant_closing(history: list) -> bool:
    """Verifica se a mensagem mais recente do assistente no histórico
    já foi uma resposta de agradecimento/encerramento (ex: 'Por nada', 'é só chamar', 'estou à disposição', '❤️', etc.)."""
    if not history:
        return False

    closing_indicators = [
        "por nada",
        "se precisar de mais alguma coisa",
        "é só chamar",
        "e so chamar",
        "estou à disposição",
        "estou a disposição",
        "qualquer dúvida",
        "qualquer duvida",
        "estou por aqui",
        "disponha",
        "de nada",
        "sempre à disposição",
        "sempre a disposição",
        "qualquer coisa, estou por aqui",
        "qualquer coisa",
        "❤️",
        "♥️"
    ]

    for h in reversed(history):
        if h.get("role") == "assistant":
            content = (h.get("content") or "").lower().strip()
            if any(ind in content for ind in closing_indicators):
                return True
            if content in ["❤️", "♥️", "😊", "🥰", "🤗", "👍"]:
                return True
            break

    return False


def _count_payment_issue_occurrences(history: list, current_message: str) -> int:
    """Conta quantas mensagens do usuário na conversa relatam dificuldade para pagar ou comprar."""
    payment_terms = [
        "nao consigo pagar", "não consigo pagar", "nao estou conseguindo pagar", "não estou conseguindo pagar",
        "erro no cartao", "erro no cartão", "cartao recusado", "cartão recusado", "erro no pagamento",
        "tentando pagar", "outro link", "link de pagamento", "nao consigo comprar", "não consigo comprar",
        "erro na compra", "recusou", "tentando desde", "tentando", "desde ontem"
    ]
    
    count = 0
    all_user_msgs = []
    if history:
        for h in history:
            role = (h.get('role') if isinstance(h, dict) else getattr(h, 'role', '')).lower()
            content = (h.get('content') if isinstance(h, dict) else getattr(h, 'content', ''))
            if role == "user" and content:
                all_user_msgs.append(str(content).lower())
    
    if current_message:
        all_user_msgs.append(current_message.lower())
        
    for msg in all_user_msgs:
        if any(term in msg for term in payment_terms):
            count += 1
            
    return count


def _is_generic_doubt_or_vague_topic(raw_message: str) -> bool:
    """Verifica se a mensagem do usuário é apenas uma declaração afirmativa de dúvida ou citação de um tópico genérico
    sem fazer uma pergunta objetiva (ex: 'Não finalizei tive umas duvida', 'Sobre a máquina', 'tenho dúvidas')."""
    if not raw_message or not raw_message.strip():
        return False

    msg_clean = raw_message.lower().strip()

    # Negações de dúvida expressas (NUNCA devem ser tratadas como pedido de esclarecimento)
    negative_doubt_patterns = [
        r'\bn[aã]o\s+(?:tenho|tem|fiquei|restou|h[aá])\s+(?:nenhuma\s+)?d[uú]vidas?\b',
        r'\bsem\s+d[uú]vidas?\b',
        r'\bnenhuma\s+d[uú]vidas?\b',
        r'\bzero\s+d[uú]vidas?\b',
        r'\btudo\s+(?:certo|claro|esclarecido|tranquilo)\b',
        r'^n[aã]o\s+tenho$'
    ]
    if any(re.search(p, msg_clean) for p in negative_doubt_patterns):
        return False

    # Palavras explícitas que indicam uma pergunta real com intenção específica
    explicit_question_words = [
        "qual", "quais", "como", "quanto", "quantos", "quanta", "quantas",
        "quem", "onde", "quando", "por que", "porque", "porquê", "pode",
        "consigo", "funciona", "custa", "valor", "preço", "preco",
        "oferece", "disponibiliza", "inclui", "indica", "indicam", "comprar", "alugar"
    ]

    if any(re.search(r'\b' + re.escape(w) + r'\b', msg_clean) for w in explicit_question_words):
        return False

    if "?" in raw_message and len(msg_clean.split()) > 3:
        return False

    has_doubt_word = bool(re.search(r'\bd[uú]vidas?\b', msg_clean))
    is_about_topic = bool(re.search(r'^(?:sobre|a respeito|referente|relacionado)\s+(?:a|o|as|os)?\s*', msg_clean))
    is_unfinished = bool(re.search(r'\bn[aã]o\s+(?:finalizei|conclui|comprei|terminei)\b', msg_clean))

    if has_doubt_word or is_about_topic or is_unfinished:
        return True

    return False


async def run_pre_router_ai(message: str, history: list, main_agent, secondary_agents: list = None, context_variables: dict = None, db = None) -> dict:
    """
    Triagem inicial da mensagem para identificar saudações, extrair datas e rotear agentes.
    """
    raw_user_message = message
    secondary_agents = secondary_agents or []
    has_prev_closing = _has_previous_assistant_closing(history)
    
    msg_clean = message.lower().strip()
    is_first_msg = not history or len(history) == 0
    
    # Lista de saudações comuns
    common_greetings = ["oi", "ola", "oie", "oiee", "bom dia", "boa tarde", "boa noite"]
    
    # Lista de agradecimentos comuns
    common_thanks = ["obrigado", "obrigada", "valeu", "gratidao", "obrigadao", "thanks", "tanks"]
    
    # Lista de emojis de confirmação/reação comuns (inclui variações e múltiplos)
    common_emojis = ["👍🏻", "👍🏼", "👍🏽", "👍🏾", "👍🏿", "👌🏻", "👌🏼", "👌🏽", "👌🏾", "👌🏿", "👍", "👌", "👏", "🙌", "✌️", "❤️", "✔️", "☑️", "✅", "🆗"]
    
    # Lista de emojis negativos (insatisfação, raiva, tristeza, dedo do meio e variações de tons de pele)
    negative_emojis = ["👎🏻", "👎🏼", "👎🏽", "👎🏾", "👎🏿", "🖕🏻", "🖕🏼", "🖕🏽", "🖕🏾", "🖕🏿", "👎", "🖕", "😡", "😠", "🤬", "😕", "🙁", "☹️", "😢", "😭"]
    
    # Lista de termos de confirmação e encerramento curtos comuns
    common_confirmations = [
        "ok", "blz", "show", "combinado", "perfeito", "certo", "beleza", "entendi", "tendi",
        "tá", "ta", "sim", "isso", "fechado", "ta bom", "tá bom", "ta bem", "tá bem",
        "tudo bem", "tudo bom", "tá certo", "ta certo", "tá ótimo", "ta otimo", "ótimo", "otimo",
        "maravilha", "belezinha", "fechou", "tá joia", "ta joia", "joia", "jóia", "combinadíssimo", "combinadissimo"
    ]
    
    # Lista de anúncios configurada (se houver)
    ignore_messages = []
    initial_ignore = getattr(main_agent, 'initial_ignore_message', None)
    if initial_ignore:
        try:
            ignore_messages = json.loads(initial_ignore)
            if not isinstance(ignore_messages, list):
                ignore_messages = [initial_ignore]
        except:
            ignore_messages = [initial_ignore]
    
    # Check for match in ignore list (Ads) - only for first message
    is_ad = False
    similarity_info = None
    cleaned_message = message
    
    # Executa a triagem programática de anúncios apenas se ad_mode for 'panel'
    if getattr(main_agent, 'ad_mode', 'panel') == 'panel' and is_first_msg and ignore_messages:
        # Ordena anúncios pelo tamanho descendente para remover correspondências mais longas primeiro
        sorted_ads = sorted(ignore_messages, key=len, reverse=True)
        for ad_text in sorted_ads:
            ad_clean = ad_text.strip()
            if not ad_clean:
                continue
                
            # Busca insensível a maiúsculas/minúsculas para remover a parte do anúncio
            pattern = re.compile(re.escape(ad_clean), re.IGNORECASE)
            if pattern.search(cleaned_message):
                is_ad = True
                similarity_info = f"Contém anúncio: '{ad_text}'"
                cleaned_message = pattern.sub("", cleaned_message)
                logger.info(f"📢 [AD DETECTED] Removido trecho do anúncio: '{ad_text}'")
                
        # Se não detectou por substring, testa a similaridade por palavras da mensagem inteira
        if not is_ad:
            msg_words = re.findall(r'\b\w+\b', msg_clean)
            for ad_text in ignore_messages:
                ad_clean = ad_text.lower().strip()
                ad_words = re.findall(r'\b\w+\b', ad_clean)
                
                if msg_words and ad_words:
                    ad_set = set(ad_words)
                    matches = sum(1 for w in msg_words if w in ad_set)
                    pct = matches / len(msg_words)
                    if pct >= 0.60:
                        is_ad = True
                        similarity_info = f"Similaridade: {pct*100:.1f}% com '{ad_text}'"
                        cleaned_message = ""
                        logger.info(f"📢 [AD DETECTED] Mensagem similar ao anúncio configurado: {similarity_info}")
                        break

    cleaned_message = cleaned_message.strip()
    
    initial_msg = getattr(main_agent, 'initial_message', None)
    if not initial_msg or str(initial_msg).strip().lower() in ["", "none", "null"]:
        initial_msg = "Olá! Como posso ajudar?"
    
    # Limpa pontuação para identificar se restou apenas saudação ou se a mensagem ficou vazia
    msg_clean_no_punct = cleaned_message.lower().strip()
    for char in ["?", "!", ".", ",", ";", ":", "-", "_", "(", ")", "[", "]", "{", "}"]:
        msg_clean_no_punct = msg_clean_no_punct.replace(char, "")
    msg_clean_no_punct = msg_clean_no_punct.strip()

    # Limpa a mensagem de emojis para verificar se sobrou texto
    msg_no_emojis = msg_clean_no_punct
    has_reaction_emoji = False
    has_negative_emoji = False
    
    for em in negative_emojis:
        if em in msg_no_emojis:
            has_negative_emoji = True
        msg_no_emojis = msg_no_emojis.replace(em, "")
        
    for em in common_emojis:
        if em in msg_no_emojis:
            has_reaction_emoji = True
        msg_no_emojis = msg_no_emojis.replace(em, "")
        
    msg_no_emojis = msg_no_emojis.strip()

    # Identifica se a mensagem contém alguma pergunta ou intenção real de conhecimento
    has_real_question = "?" in raw_user_message or any(term in raw_user_message.lower() for term in [
        "qual", "como", "quanto", "quem", "onde", "quando", "pode", "precisa",
        "faz", "curso", "valor", "preço", "preco", "gostaria", "tenho interesse", "funciona",
        "endereço", "endereco", "horario", "horário", "ajuda",
        "inscrição", "incrição", "requisito", "formação", "formacao", "posso", "consigo",
        "serve", "aula", "aulas", "plano", "planos", "comprar", "alugar", "saber mais"
    ])

    # Atalho para Dificuldade Recorrente no Pagamento (>= 3 mensagens relatando erro/tentativa de pagamento)
    payment_issue_count = _count_payment_issue_occurrences(history, raw_user_message)
    if payment_issue_count >= 3:
        return {
            "eh_saudacao": False,
            "eh_agradecimento": False,
            "eh_agradecimento_recorrente": False,
            "precisa_esclarecimento": False,
            "resposta_esclarecimento": None,
            "id_agente_alvo": main_agent.id,
            "chamada_ferramenta": {
                "name": "transferir_suporte_humano",
                "arguments": {"motivo": f"Dificuldade recorrente de pagamento ({payment_issue_count} mensagens do cliente tentando pagar sem sucesso)"}
            },
            "resposta_direta": "Poxa, lamento muito que esteja com dificuldades para concluir o pagamento! Vou te transferir agora mesmo para nossa equipe de suporte humano para te ajudar a finalizar certinho. Um momento, por favor! 😊",
            "perguntas_extraidas": None,
            "lista_perguntas_extraidas": [],
            "data_extraida": None,
            "precisa_rag": False,
            "eh_anuncio": is_ad,
            "detalhe_anuncio": similarity_info,
            "mensagem_original": raw_user_message,
            "mensagem_melhorada": None,
            "tipo_mensagem": "Dificuldade Recorrente de Pagamento (Transferir para Suporte Humano)",
            "_model_used": "shortcut-logic"
        }

    if _is_generic_doubt_or_vague_topic(raw_user_message):
        topic_match = re.search(r'(?:sobre|a respeito|referente|relacionado)\s+(?:a|o|as|os)?\s*([a-z0-9áàâãéèêíïóôõöúçñ\s]+)', raw_user_message.lower().strip())
        if topic_match:
            topic_str = topic_match.group(1).strip()
            topic_str = re.sub(r'^(?:a|o|as|os)\s+', '', topic_str).strip()
            if topic_str:
                resposta_esclarecimento = f"Olá! Quais são as suas dúvidas sobre {topic_str}? Pode me dizer exatamente o que gostaria de saber para que eu possa te ajudar?"
            else:
                resposta_esclarecimento = "Olá! Pode me dizer exatamente qual é a sua dúvida? Me conte o que você gostaria de saber para que eu possa te ajudar!"
        else:
            resposta_esclarecimento = "Olá! Pode me dizer exatamente qual é a sua dúvida? Me conte o que você gostaria de saber para que eu possa te ajudar!"

        return {
            "eh_saudacao": False,
            "eh_agradecimento": False,
            "precisa_esclarecimento": True,
            "resposta_esclarecimento": resposta_esclarecimento,
            "id_agente_alvo": main_agent.id,
            "resposta_direta": None,
            "perguntas_extraidas": None,
            "lista_perguntas_extraidas": [],
            "data_extraida": None,
            "precisa_rag": False,
            "eh_anuncio": is_ad,
            "detalhe_anuncio": similarity_info,
            "mensagem_original": raw_user_message,
            "mensagem_melhorada": None,
            "tipo_mensagem": "Declaração de Dúvida / Tópico Vago (Solicitar Esclarecimento)",
            "_model_used": "shortcut-logic"
        }

    is_thank_you = (msg_clean_no_punct in common_thanks) or (msg_no_emojis in common_thanks)

    # Executa o atalho programático de saudação APENAS se não houver pergunta na mensagem
    if not has_real_question and (msg_clean_no_punct in common_greetings or (msg_clean_no_punct == "" and not raw_user_message.strip())) and getattr(main_agent, 'greeting_mode', 'panel') == 'panel':
        if is_first_msg:
            resposta = initial_msg
        else:
            resposta = "Olá! Como posso te ajudar?"

        return {
            "eh_saudacao": True,
            "eh_agradecimento": False,
            "precisa_esclarecimento": False,
            "id_agente_alvo": main_agent.id,
            "resposta_direta": resposta,
            "perguntas_extraidas": None,
            "data_extraida": None,
            "eh_anuncio": is_ad,
            "detalhe_anuncio": similarity_info,
            "mensagem_original": raw_user_message,
            "mensagem_melhorada": message if message != raw_user_message else None,
            "tipo_mensagem": "Saudação (Atalho Programático)",
            "_model_used": "shortcut-logic"
        }
    elif is_thank_you:
        if has_prev_closing:
            return {
                "eh_saudacao": True,
                "eh_agradecimento": True,
                "eh_agradecimento_recorrente": True,
                "precisa_esclarecimento": False,
                "id_agente_alvo": main_agent.id,
                "resposta_direta": None,
                "perguntas_extraidas": None,
                "data_extraida": None,
                "eh_anuncio": is_ad,
                "detalhe_anuncio": similarity_info,
                "mensagem_original": raw_user_message,
                "mensagem_melhorada": message if message != raw_user_message else None,
                "tipo_mensagem": "Agradecimento Recorrente (Não Responder)",
                "motivo_silencio": "2º agradecimento/encerramento consecutivo detectado. Automação silenciada para evitar envio de mensagens infinitamente.",
                "_model_used": "shortcut-logic"
            }
        else:
            return {
                "eh_saudacao": True,
                "eh_agradecimento": True,
                "precisa_esclarecimento": False,
                "id_agente_alvo": main_agent.id,
                "resposta_direta": "Por nada! Se precisar de mais alguma coisa, é só chamar.",
                "perguntas_extraidas": None,
                "data_extraida": None,
                "eh_anuncio": is_ad,
                "detalhe_anuncio": similarity_info,
                "mensagem_original": raw_user_message,
                "mensagem_melhorada": message if message != raw_user_message else None,
                "tipo_mensagem": "Agradecimento (Atalho Programático)",
                "_model_used": "shortcut-logic"
            }
    else:
        # Verifica se a mensagem contém apenas emojis de reação (ou se ficou vazia após removê-los)
        is_pure_emoji_reaction = (has_reaction_emoji or has_negative_emoji) and msg_no_emojis == ""
        
        # Verifica se a mensagem é um termo de confirmação curto
        is_confirmation_word = msg_clean_no_punct in common_confirmations or msg_no_emojis in common_confirmations
        
        if is_pure_emoji_reaction or is_confirmation_word:
            # Caso especial: Emoji negativo é atalho programático direto imediato,
            # ignorando se o assistente perguntou ou não no turno anterior
            if has_negative_emoji and is_pure_emoji_reaction:
                return {
                    "eh_saudacao": True,
                    "eh_agradecimento": False,
                    "eh_emoji_negativo": True,
                    "precisa_esclarecimento": False,
                    "id_agente_alvo": main_agent.id,
                    "resposta_direta": "Puxa, sinto muito! 😕 Percebi que algo não deu certo. O que aconteceu? Como posso te ajudar a resolver de uma forma melhor?",
                    "perguntas_extraidas": None,
                    "data_extraida": None,
                    "eh_anuncio": is_ad,
                    "detalhe_anuncio": similarity_info,
                    "mensagem_original": raw_user_message,
                    "mensagem_melhorada": message if message != raw_user_message else None,
                    "tipo_mensagem": "Emoji Negativo / Insatisfação (Atalho Empático)",
                    "_model_used": "shortcut-logic"
                }

            # Se for confirmação por texto ou emoji positivo, mas o assistente fez uma pergunta direta por último, não interceptamos como atalho,
            # pois o usuário pode estar respondendo a pergunta (ex: "você prefere Pix ou cartão?", "Pix")
            last_assistant_asked = False
            if history:
                for h in reversed(history):
                    if h.get("role") == "assistant":
                        content = h.get("content", "")
                        if "?" in content:
                            last_assistant_asked = True
                        break
            
            # Interceptamos se for reação de emoji pura OU (se for confirmação por texto e o assistente não perguntou por último)
            if is_pure_emoji_reaction or not last_assistant_asked:
                if has_prev_closing:
                    return {
                        "eh_saudacao": True,
                        "eh_agradecimento": True,
                        "eh_agradecimento_recorrente": True,
                        "precisa_esclarecimento": False,
                        "id_agente_alvo": main_agent.id,
                        "resposta_direta": None,
                        "perguntas_extraidas": None,
                        "data_extraida": None,
                        "eh_anuncio": is_ad,
                        "detalhe_anuncio": similarity_info,
                        "mensagem_original": raw_user_message,
                        "mensagem_melhorada": message if message != raw_user_message else None,
                        "tipo_mensagem": "Agradecimento Recorrente (Não Responder)",
                        "motivo_silencio": "2º agradecimento/encerramento consecutivo detectado. Automação silenciada para evitar envio de mensagens infinitamente.",
                        "_model_used": "shortcut-logic"
                    }
                else:
                    resposta_confirmacao = "Perfeito! Se precisar de mais alguma coisa, é só chamar. 😊"
                    if "combinado" in msg_clean_no_punct:
                        resposta_confirmacao = "Combinado! Qualquer dúvida, estou por aqui. 😉"
                    elif "ok" in msg_clean_no_punct:
                        resposta_confirmacao = "Combinado! Se precisar de algo, é só chamar. 👍"
                    elif "certo" in msg_clean_no_punct:
                        resposta_confirmacao = "Certo! Se precisar de mais alguma ajuda, estou à disposição. 👍"
                    elif any(t in msg_clean_no_punct for t in ["ta bom", "tá bom", "ta bem", "tá bem", "tudo bem", "tudo bom"]):
                        resposta_confirmacao = "Combinado! Se precisar de qualquer ajuda, estou por aqui. 😊"
                    elif any(t in msg_clean_no_punct for t in ["ótimo", "otimo", "maravilha", "show", "beleza", "blz"]):
                        resposta_confirmacao = "Maravilha! Qualquer dúvida, é só me chamar por aqui. 😊"
                        
                    return {
                        "eh_saudacao": True,
                        "eh_agradecimento": False,
                        "precisa_esclarecimento": False,
                        "id_agente_alvo": main_agent.id,
                        "resposta_direta": resposta_confirmacao,
                        "perguntas_extraidas": None,
                        "lista_perguntas_extraidas": [],
                        "data_extraida": None,
                        "precisa_rag": False,
                        "eh_anuncio": is_ad,
                        "detalhe_anuncio": similarity_info,
                        "mensagem_original": raw_user_message,
                        "mensagem_melhorada": message if message != raw_user_message else None,
                        "tipo_mensagem": "Confirmação / Reação (Atalho Programático)",
                        "_model_used": "shortcut-logic"
                    }

    # Se a mensagem contém algo além de saudação/anúncio, usamos o conteúdo limpo no processamento
    message = cleaned_message


    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return {
            "eh_saudacao": False, 
            "eh_agradecimento": False,
            "id_agente_alvo": main_agent.id, 
            "perguntas_extraidas": message,
            "eh_anuncio": False,
            "detalhe_anuncio": None
        }
        
    client = openai.AsyncOpenAI(api_key=api_key)
    
    # Enriquecimento da Mensagem com IA baseado no Histórico (apenas para mensagens que não usaram atalho)
    if client and history and len(message.strip()) < 150:
        message = await enrich_user_message(message, history, client)
    
    agents_desc = f"1 (PRINCIPAL). ID: {main_agent.id} | Nome: {main_agent.name} | Descrição: {getattr(main_agent, 'description', 'Agente Principal')}\n"
    for idx, sa in enumerate(secondary_agents):
        agents_desc += f"{idx + 2} (SECUNDÁRIO). ID: {sa.id} | Nome: {sa.name} | Descrição: {getattr(sa, 'description', 'Agente Secundário')}\n"
        
    history_text = ""
    if history:
        history_text = "HISTÓRICO RECENTE:\n"
        for h in history:
            role = h.get('role', 'user').upper()
            content = h.get('content', '')
            history_text += f"{role}: {content}\n\n"
            
    main_system_prompt_cleaned = getattr(main_agent, 'system_prompt', '') or ''
    main_dynamic_prompt = getattr(main_agent, 'dynamic_prompt', '') or ''
    if main_dynamic_prompt:
        main_system_prompt_cleaned += f"\n\n### DIRETRIZES E REGRAS DINÂMICAS DO AGENTE:\n{main_dynamic_prompt}"
        
    if main_system_prompt_cleaned:
        from agent_core.logic.substitution import resolve_conditional_blocks
        main_system_prompt_cleaned = resolve_conditional_blocks(main_system_prompt_cleaned, context_variables)
        main_system_prompt_cleaned = re.sub(r'(?m)^[ \t]*#+[ \t]*', '', main_system_prompt_cleaned)
    tools_list = getattr(main_agent, "tools", None) or []
    agent_tool_prompts = getattr(main_agent, "tool_prompts", None) or {}
    tools_desc = ""
    for t in tools_list:
        p_schema = t.parameters_schema
        if isinstance(p_schema, bytes):
            p_schema = p_schema.decode('utf-8')
        
        custom_hint = agent_tool_prompts.get(str(t.id))
        desc_to_use = custom_hint.strip() if custom_hint and custom_hint.strip() else t.description
        tools_desc += f"- {t.name}: {desc_to_use}. Parâmetros/Schema: {p_schema}\n"

    # Adicionar ferramentas internas e condicionais
    if getattr(main_agent, "handoff_enabled", False):
        custom_handoff = agent_tool_prompts.get("transferir_suporte_humano")
        desc_handoff = custom_handoff.strip() if custom_handoff and custom_handoff.strip() else "Transfere o atendimento para um atendente humano."
        tools_desc += f"- transferir_suporte_humano: {desc_handoff} Parâmetros/Schema: " + '{"type": "object", "properties": {"motivo": {"type": "string", "description": "Motivo solicitado pelo usuário"}}, "required": ["motivo"]}\n'
    
    custom_duvida = agent_tool_prompts.get("registrar_duvida_sem_resposta")
    desc_duvida = custom_duvida.strip() if custom_duvida and custom_duvida.strip() else "Registra apenas perguntas objetivas/fáticas com dados ausentes (ex: preço/endereço ausente). PROIBIDO para objeções ou medos do cliente."
    tools_desc += f"- registrar_duvida_sem_resposta: {desc_duvida} Parâmetros/Schema: " + '{"type": "object", "properties": {"pergunta": {"type": "string", "description": "A pergunta objetiva exata do usuário"}}, "required": ["pergunta"]}\n'

    if getattr(main_agent, "qualification_questions", None):
        custom_qual = agent_tool_prompts.get("lead_qualificado")
        desc_qual = custom_qual.strip() if custom_qual and custom_qual.strip() else "Registra que o lead respondeu todas as perguntas de qualificação."
        tools_desc += f"- lead_qualificado: {desc_qual} Parâmetros/Schema: " + '{"type": "object", "properties": {"respostas": {"type": "object", "description": "Objeto contendo as respostas para cada pergunta"}}, "required": ["respostas"]}\n'

    template_vars = dict(
        initial_msg=initial_msg,
        initial_ignore_message=getattr(main_agent, 'initial_ignore_message', '') or '',
        greeting_mode=getattr(main_agent, 'greeting_mode', 'panel'),
        ad_mode=getattr(main_agent, 'ad_mode', 'panel'),
        main_system_prompt=main_system_prompt_cleaned,
        tools_desc=tools_desc,
        agents_desc=agents_desc,
        main_agent_id=main_agent.id,
        date_context=(get_date_context(main_agent) if getattr(main_agent, 'date_awareness', False) else ''),
    )
    system_prompt = _build_pre_router_system_prompt(main_agent, template_vars)

    # Recupera contexto de alinhamento com a Base de Conhecimento (Fase 1 RAG / Fase 2 Fallback)
    kb_alignment_context, kb_info = await _get_kb_reference_context(main_agent, message, async_db=db)
    if kb_alignment_context:
        system_prompt += f"\n\n{kb_alignment_context}"

    if not is_first_msg:
        system_prompt += "\n⚠️ REGRA CRÍTICA DE HISTÓRICO: Há interações anteriores na conversa. Se a mensagem for apenas uma saudação curta ou cumprimento isolado (Ex: 'Oi', 'Olá', 'Bom dia', 'Tudo bem?'), você PODE definir 'eh_saudacao' como true. Mas se o usuário trouxer qualquer dúvida, resposta ou assunto novo, trate a mensagem como continuação normal da conversa (eh_saudacao = false)."

    user_prompt = f"{history_text}\nMENSAGEM ATUAL DO USUÁRIO:\n{message}"

    try:
        model_to_use = getattr(main_agent, 'router_simple_model', None) or getattr(main_agent, 'model', 'gpt-4o-mini')
        temp_to_use = 0.0
        if "o1" in model_to_use.lower() or "gpt-5" in model_to_use.lower(): temp_to_use = 1.0

        response = await client.chat.completions.create(
            model=model_to_use,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=temp_to_use,
            response_format={"type": "json_object"}
        )
        result = json.loads(response.choices[0].message.content.strip())
        
        # Se houver pergunta real na mensagem ou perguntas extraídas, NUNCA tratar como saudação ou esclarecimento
        has_extracted_q = bool(result.get("perguntas_extraidas") and len(str(result.get("perguntas_extraidas")).strip()) > 3)
        if has_real_question or has_extracted_q:
            result["eh_saudacao"] = False
            result["eh_agradecimento"] = False
            result["eh_agradecimento_recorrente"] = False
            result["resposta_direta"] = None
            result["precisa_esclarecimento"] = False
            result["resposta_esclarecimento"] = None
            result["precisa_rag"] = True
            if not result.get("perguntas_extraidas"):
                result["perguntas_extraidas"] = raw_user_message
                result["lista_perguntas_extraidas"] = [raw_user_message]
            
            # Garantia de separação de múltiplas perguntas em lista_perguntas_extraidas no Python
            raw_list = result.get("lista_perguntas_extraidas") or []
            split_list = []
            if isinstance(raw_list, list) and raw_list:
                for item in raw_list:
                    if isinstance(item, str):
                        # Caso 1: Múltiplas interrogações '?'
                        if item.count("?") > 1:
                            parts = [p.strip() + ("?" if not p.strip().endswith("?") else "") for p in item.split("?") if p.strip()]
                            split_list.extend(parts)
                        # Caso 2: Contém vírgula ou ';' juntando duas dúvidas (ex: 'como funciona, quanto custa os equipamentos?')
                        elif ("," in item or ";" in item) and any(qw in item.lower() for qw in ["quanto", "qual", "como", "onde", "valor", "preço", "preco"]):
                            sub_parts = re.split(r'[,;]|\s+e\s+(?=(?:quanto|qual|como|onde|o que|tem|possui)\b)', item, flags=re.IGNORECASE)
                            valid_sp = []
                            for sp in sub_parts:
                                sp_c = sp.strip()
                                if len(sp_c) >= 3:
                                    if not sp_c.endswith("?") and not sp_c.endswith("."):
                                        sp_c += "?"
                                    valid_sp.append(sp_c)
                            if len(valid_sp) >= 2:
                                split_list.extend(valid_sp)
                            else:
                                split_list.append(item.strip())
                        elif item.strip():
                            split_list.append(item.strip())
                if split_list:
                    result["lista_perguntas_extraidas"] = split_list

            # Garantia adicional: Verificar se o usuário enviou múltiplas linhas/perguntas e o LLM omitiu alguma delas
            raw_lines = [l.strip() for l in raw_user_message.splitlines() if l.strip()]
            if len(raw_lines) > 1 or "?" in raw_user_message:
                current_extracted_lower = " ".join([str(x).lower() for x in result.get("lista_perguntas_extraidas", [])])
                question_triggers = [
                    "de onde", "onde fica", "onde e", "onde é", "qual", "quais", "como", "quanto", "quantos",
                    "quem", "quando", "por que", "porque", "posso", "consigo", "tem", "oferece", "certificado",
                    "duracao", "duração", "suporte", "valor", "preco", "preço"
                ]

                for raw_line in raw_lines:
                    line_clean = raw_line.lower()
                    has_q_indicator = "?" in raw_line or any(trig in line_clean for trig in question_triggers)

                    if has_q_indicator:
                        keywords = [w for w in line_clean.replace("?", "").replace(",", "").split() if len(w) > 2 and w not in ["que", "com", "para", "uma", "uns", "curso", "esta", "está"]]
                        matched = any(kw in current_extracted_lower for kw in keywords) if keywords else False

                        if not matched:
                            missing_q = raw_line.strip()
                            if not missing_q.endswith("?") and not missing_q.endswith("."):
                                missing_q += "?"

                            if "de onde" in line_clean or "onde fica" in line_clean or "onde e" in line_clean or "onde é" in line_clean:
                                missing_q = "De onde você é / onde fica a sede do curso?"

                            if "lista_perguntas_extraidas" not in result or not isinstance(result["lista_perguntas_extraidas"], list):
                                result["lista_perguntas_extraidas"] = []

                            result["lista_perguntas_extraidas"].append(missing_q)
                            current_extracted_lower += " " + missing_q.lower()

            if isinstance(result.get("lista_perguntas_extraidas"), list) and len(result["lista_perguntas_extraidas"]) > 1:
                # Regra de Ordenação: Se houver pergunta sobre o link de compra / inscrição, colocar por último para que o link seja enviado no final
                link_qs = [q for q in result["lista_perguntas_extraidas"] if "link" in str(q).lower() or "inscrição" in str(q).lower() or "inscricao" in str(q).lower() or "comprar" in str(q).lower()]
                other_qs = [q for q in result["lista_perguntas_extraidas"] if q not in link_qs]
                if link_qs:
                    result["lista_perguntas_extraidas"] = other_qs + link_qs
                result["perguntas_extraidas"] = "\n".join(result["lista_perguntas_extraidas"])

            # Sanitização extra: Se o usuário perguntou sobre os cursos de forma geral (ex: 'gostaria de saber sobre os cursos')
            # e o LLM reescreveu adicionando 'estão disponíveis?' (o que faz a busca no RAG falhar), sanitizamos para 'Como funciona o curso?'
            if result.get("perguntas_extraidas"):
                pe_lower = str(result["perguntas_extraidas"]).lower()
                raw_lower = raw_user_message.lower()
                if "disponíveis" in pe_lower or "disponiveis" in pe_lower:
                    if "disponíveis" not in raw_lower and "disponiveis" not in raw_lower:
                        if "gostaria de saber" in raw_lower or "queria saber" in raw_lower or "saber sobre" in raw_lower or "quais os cursos" in raw_lower:
                            result["perguntas_extraidas"] = "Como funciona o curso de remoção de tatuagem?"
                            if isinstance(result.get("lista_perguntas_extraidas"), list) and len(result["lista_perguntas_extraidas"]) == 1:
                                result["lista_perguntas_extraidas"] = ["Como funciona o curso de remoção de tatuagem?"]

            # Resolução de confirmação a ofertas anteriores do assistente (ex: usuário diz 'Gostaria' após o assistente oferecer informações, pagamentos e link de compra)
            raw_clean = raw_user_message.strip().lower()
            raw_words_count = len(raw_clean.split())
            if (raw_words_count <= 4 or len(raw_clean) <= 25) and history:
                short_interest_words = ["gostaria", "quero", "sim", "pode ser", "gostaria sim", "aceito", "gostaria de saber", "manda", "envia", "mande", "envie"]
                if any(raw_clean == w or raw_clean.startswith(w) for w in short_interest_words):
                    last_assistant_msg = ""
                for h in reversed(history):
                    if isinstance(h, dict) and h.get("role") == "assistant" and h.get("content"):
                        last_assistant_msg = str(h["content"]).lower()
                        break
                
                if last_assistant_msg:
                    questions_to_add = []
                    current_pe_lower = str(result.get("perguntas_extraidas") or "").lower()
                    
                    if ("pagamento" in last_assistant_msg or "pagamentos" in last_assistant_msg) and "pagamento" not in current_pe_lower:
                        questions_to_add.append("Quais são as formas de pagamento?")
                    
                    if ("link" in last_assistant_msg or "compra" in last_assistant_msg or "inscrição" in last_assistant_msg) and ("link" not in current_pe_lower and "compra" not in current_pe_lower):
                        questions_to_add.append("Qual é o link de compra / inscrição?")

                    if questions_to_add:
                        if not isinstance(result.get("lista_perguntas_extraidas"), list) or not result.get("lista_perguntas_extraidas"):
                            result["lista_perguntas_extraidas"] = ["Como funciona o curso de remoção de tatuagem?"]
                        for q in questions_to_add:
                            if q not in result["lista_perguntas_extraidas"]:
                                result["lista_perguntas_extraidas"].append(q)
                        
                        # Garantir que pergunta do link de compra fique por último na lista
                        link_qs = [q for q in result["lista_perguntas_extraidas"] if "link" in str(q).lower() or "inscrição" in str(q).lower() or "inscricao" in str(q).lower() or "comprar" in str(q).lower()]
                        other_qs = [q for q in result["lista_perguntas_extraidas"] if q not in link_qs]
                        if link_qs:
                            result["lista_perguntas_extraidas"] = other_qs + link_qs
                        result["perguntas_extraidas"] = "\n".join(result["lista_perguntas_extraidas"])
        elif result.get("eh_saudacao") or result.get("eh_mensagem_automatica"):
            if result.get("eh_agradecimento"):
                if not result.get("resposta_direta") or str(result.get("resposta_direta")).strip().lower() in ["", "none", "null"]:
                    result["resposta_direta"] = "Por nada! Se precisar de mais alguma coisa, é só chamar."
            elif result.get("eh_mensagem_automatica"):
                result["resposta_direta"] = None
                result["eh_saudacao"] = False
                result["perguntas_extraidas"] = None
            else:
                if is_first_msg:
                    # No modo 'panel' forçamos a saudação configurada se o LLM falhar em preenchê-la
                    if getattr(main_agent, 'greeting_mode', 'panel') == 'panel':
                        if not result.get("resposta_direta") or str(result.get("resposta_direta")).strip().lower() in ["", "none", "null"]:
                            result["resposta_direta"] = initial_msg
                else:
                    if not result.get("resposta_direta"):
                        # Se contiver termos de confirmação, damos uma resposta de confirmação
                        is_conf = any(term in msg_clean_no_punct for term in common_confirmations) or has_reaction_emoji
                        if is_conf:
                            result["resposta_direta"] = "Perfeito! Qualquer dúvida, estou à disposição. 😊"
                        else:
                            result["resposta_direta"] = "Olá! Como posso te ajudar?"
            
        # Metadados para depuração (Raio-X)
        result["_model_used"] = model_to_use
        result["_debug_prompt"] = f"SYSTEM:\n{system_prompt}\n\nUSER:\n{user_prompt}"
        result["mensagem_original"] = raw_user_message
        if result.get("perguntas_extraidas"):
            lower_ext = str(result["perguntas_extraidas"]).lower()
            orig_lower = raw_user_message.lower()
            # Se a extração alucinou termos de garantia/vai resolver sem o usuário ter dito isso, limpamos a alucinação
            if any(term in lower_ext for term in ["garantia", "vai resolver", "resolver mesmo"]) and not any(term in orig_lower for term in ["garantia", "vai resolver"]):
                result["perguntas_extraidas"] = raw_user_message
                if result.get("lista_perguntas_extraidas"):
                    result["lista_perguntas_extraidas"] = [raw_user_message]
            result["mensagem_melhorada"] = result["perguntas_extraidas"]
        elif message != raw_user_message:
            result["mensagem_melhorada"] = message

        if not result.get("tipo_mensagem"):
            if result.get("eh_saudacao"):
                result["tipo_mensagem"] = "Saudação / Cortesia"
            elif result.get("eh_agradecimento"):
                result["tipo_mensagem"] = "Agradecimento"
            elif result.get("chamada_ferramenta"):
                result["tipo_mensagem"] = f"Solicitação de Ferramenta ({result['chamada_ferramenta'].get('nome', '')})"
            elif result.get("precisa_rag"):
                result["tipo_mensagem"] = "Dúvida / Pergunta de Conhecimento"
            else:
                result["tipo_mensagem"] = "Conversação Geral / Roteamento de Agente"
        
        # A "memória utilizada" exibida no Raio-X deve refletir EXATAMENTE o que foi
        # realmente enviado como contexto ao Pre-Router — ou seja, o próprio `history`
        # recebido por esta função (já é o histórico que o chamador monta respeitando
        # a janela de contexto do agente) — e não uma busca separada e sem limite no
        # banco, que antes ignorava `context_window` e mostrava a conversa inteira.
        # Respeita o limite configurado em `context_window`: N mensagens do usuário e
        # N respostas do agente (ex: context_window=5 -> até 5 + 5).
        context_window_limit = getattr(main_agent, 'context_window', None)
        if not context_window_limit or context_window_limit <= 0:
            context_window_limit = 5

        origens = []
        if history:
            user_count = 0
            agent_count = 0
            # Percorre do mais recente para o mais antigo para priorizar as últimas
            # N mensagens de cada lado, depois reordena cronologicamente para exibição.
            for h in reversed(history):
                role = h.get('role', 'user')
                content = (h.get('content') or '').strip()
                if not content:
                    continue
                if role == 'user' and user_count < context_window_limit:
                    origens.append((h, f"Usuário: {content}"))
                    user_count += 1
                elif role == 'assistant' and agent_count < context_window_limit:
                    origens.append((h, f"Agente: {content}"))
                    agent_count += 1
                if user_count >= context_window_limit and agent_count >= context_window_limit:
                    break
            origens.reverse()
            origens = [texto for _h, texto in origens]

        result["mensagens_origem_memorias"] = origens

        if response.usage:
            result["_usage"] = {
                "prompt_tokens": response.usage.prompt_tokens,
                "completion_tokens": response.usage.completion_tokens,
                "total_tokens": response.usage.total_tokens
            }
        if not result.get("id_agente_alvo"): result["id_agente_alvo"] = main_agent.id
        result["eh_anuncio"] = result.get("eh_anuncio", False) or is_ad
        result["detalhe_anuncio"] = result.get("detalhe_anuncio", None) or similarity_info
        if kb_info:
            result["_kb_alignment_info"] = kb_info
        return result
    except Exception as e:
        logger.error(f"❌ Erro no Pre-Router (OpenAI): {e}")
        return {
            "eh_saudacao": False, 
            "eh_agradecimento": False,
            "precisa_esclarecimento": False,
            "id_agente_alvo": main_agent.id, 
            "perguntas_extraidas": message,
            "resposta_direta": None,
            "resposta_esclarecimento": None,
            "data_extraida": None,
            "eh_anuncio": is_ad,
            "detalhe_anuncio": similarity_info,
            "pre_router_error": str(e)
        }
