import os
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
1. Identificar se a mensagem é APENAS uma saudação curta, cumprimento, agradecimento (Ex: "Oi", "Olá", "Oie", "Oiee", "Bom dia", "Tudo bem?", "Obrigado") ou uma confirmação/reação curta (Ex: "Ok", "Entendi", "Certo", "Show", "Combinado", "👍", "👌", "Perfeito") ou emoji negativo (Ex: 👎, 🖕, 😡, 😠, 😕, 😢, 😭) OU uma mensagem de teste do usuário ("teste", "testando") e NÃO contém nenhuma pergunta ou requisição técnica.
   - SAUDAÇÃO CONFIGURADA: "{initial_msg}"
   - MENSAGEM DE ANÚNCIO (IGNORAR): "{initial_ignore_message}"
   - MODO DE SAUDAÇÃO: "{greeting_mode}"
   - MODO DE ANÚNCIO: "{ad_mode}"
   - SYSTEM PROMPT DO AGENTE PRINCIPAL (Utilize para guiar a saudação ou anúncio dinâmico se os modos forem 'prompt'): "{main_system_prompt}"

   CRITÉRIO RÍGIDO:
   - Se a mensagem for "Oi", "Oie", "Olá" ou similares curtos e MODO DE SAUDAÇÃO for "panel", você DEVE definir 'eh_saudacao' como true e usar a 'SAUDAÇÃO CONFIGURADA' como sua 'resposta_direta'.
   - Se a mensagem for "Oi", "Oie", "Olá" ou similares curtos e MODO DE SAUDAÇÃO for "prompt", você DEVE gerar uma resposta de saudação inicial amigável, personalizada e perfeitamente alinhada com as diretrizes de tom e regras do SYSTEM PROMPT DO AGENTE PRINCIPAL. Defina 'eh_saudacao' as true e retorne esta saudação em 'resposta_direta'.
   - Se a mensagem for um AGRADECIMENTO (Ex: "Obrigado", "Obrigada", "Valeu", "Muito obrigado"), você deve definir 'eh_agradecimento' as true, 'eh_saudacao' as true e usar uma resposta simpática de agradecimento (Ex: "Por nada! Se precisar de mais alguma coisa, é só chamar.") como 'resposta_direta'.
   - Se a mensagem for uma REAÇÃO NEGATIVA ou emoji de insatisfação/raiva/tristeza (Ex: 👎, 🖕, 😡, 😠, 🤬, 😕, 🙁, ☹️, 😢, 😭 e variações), você deve definir 'eh_saudacao' as true e usar a resposta empática: "Puxa, sinto muito! 😕 Percebi que algo não deu certo. O que aconteceu? Como posso te ajudar a resolver de uma forma melhor?" como 'resposta_direta'.
   - Se a mensagem for uma CONFIRMAÇÃO/REAÇÃO POSITIVA (Ex: "Ok", "Entendi", "Combinado", "Certo", "Perfeito", emojis de confirmação como 👍, 👌) e o assistente não fez uma pergunta direta por último, você deve definir 'eh_saudacao' as true e usar uma resposta simpática de confirmação (Ex: "Perfeito! Qualquer dúvida, estou à disposição." ou "Combinado! Se precisar de algo, é só chamar.") como 'resposta_direta'.

   NOTA SOBRE HISTÓRICO: Se a mensagem for um "sim", "não", ou resposta curta que responde a uma pergunta direta do histórico recente (ex: a IA perguntou 'Qual seu e-mail?' ou 'Você prefere X ou Y?'), NÃO é apenas confirmação, é parte do fluxo da conversa, logo eh_saudacao deve ser false. (Isso não se aplica a emojis negativos como 👎 que são sempre interceptados).

2. Identificar se a mensagem atual do usuário é uma MENSAGEM AUTOMÁTICA de ausência comercial ou mensagem enviada por um BOT do outro lado (por exemplo, mensagens informando horário de atendimento, saudações automáticas de bots de empresas. Exemplos: "Olá! No momento não posso atender...", "Nosso horário é de 8h às 18h...", "Obrigado por seu contato, responderemos em breve...").
   
   ⚠️ ATENÇÃO EXTREMA - MENSAGENS DE ANÚNCIO E CLICK-TO-CHAT (NÃO SÃO MENSAGENS AUTOMÁTICAS):
   - Mensagens pré-formatadas que o CLIENTE envia ao clicar em um anúncio ou link de WhatsApp (Ex: "Olá! Quero saber mais sobre o método laser day", "Olá, vi seu anúncio...", "Tenho interesse no curso X", "Vim do Instagram...") NUNCA SÃO MENSAGENS AUTOMÁTICAS DO CONTATO. Elas são a PRIMEIRA MENSAGEM REAL de um lead interessado!
   - Para essas mensagens pré-formatadas de anúncios/links do WhatsApp enviadas pelo cliente, você DEVE OBRIGATORIAMENTE definir 'eh_mensagem_automatica' como FALSE. Trate-as como uma pergunta/interesse legítimo do usuário (extraia a dúvida em 'perguntas_extraidas', defina 'precisa_rag' como true, ou trate como início de atendimento).

   ⛔ EXCEÇÕES RÍGIDAS (EXEMPLOS QUE NUNCA DEVEM SER CLASSIFICADOS COMO MENSAGEM AUTOMÁTICA):
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

4. Se a mensagem do usuário for TÃO vaga ou confusa que é IMPOSSÍVEL identificar qualquer intenção (ex: 'ta', 'ok', '...', '???'), defina 'precisa_esclarecimento' como true e forneça uma mensagem curta e simpática de esclarecimento em 'resposta_esclarecimento' (Ex: "Como posso te ajudar hoje?" ou "Olá! Poderia me dar mais detalhes sobre o que você precisa?").
   ⚠️ EXCEÇÃO PARA SAUDAÇÕES EM HISTÓRICO: Se a mensagem for apenas um cumprimento curto como "Oi", "Olá", "Oie", "Bom dia", "Tudo bem?" e houver histórico de conversa, NÃO a trate como vaga ou confusa e nem defina 'precisa_esclarecimento' como true. Em vez disso, defina 'eh_saudacao' as true e use a 'SAUDAÇÃO CONFIGURADA' ou gere a saudação dinâmica (caso MODO DE SAUDAÇÃO seja prompt).
   ⚠️ REGRA DE OURO ABSOLUTA: Se o usuário citar NOMES DE PESSOAS (ex: 'Mateus', 'Mirela', 'Lira'), nomes de cursos, termos técnicos ou qualquer assunto específico que possa estar no conhecimento (RAG ou Inbox), você NUNCA deve pedir esclarecimento. Defina 'precisa_esclarecimento' como false e 'id_agente_alvo' como o Agente Principal.

 5. Se o usuário perguntar por alguém (Quem é X?), isso NUNCA é vago. Deixe o Agente Principal responder.

 5b. **ENRIQUECIMENTO DE PERGUNTAS VAGAS / QUERY ENRICHMENT (OBRIGATÓRIO):**
     - Se o usuário enviar uma pergunta curta, vaga, com pronomes soltos ou ambígua (Ex: "como funciona?", "qual o valor?"), melhore a pergunta substituindo os pronomes soltos pelo assunto do histórico.
     - ⛔ **PROIBIDO INVENTAR OU ADICIONAR PERGUNTAS ADICIONAIS**: NUNCA invente perguntas suplementares, hipóteses ou perguntas do tipo 'oferece mentoria, suporte prático ou técnicas específicas?' se o usuário NÃO perguntou isso explicitamente.
     - Se a mensagem do usuário for um relato, objeção, desabafo ou frase completa (Ex: "Já faço laser fiz 2 cursos online mas tenho dificuldade..."), MANTENHA A INTENÇÃO E O TEXTO ORIGINAL em `perguntas_extraidas` SEM inventar perguntas adicionais no final.
     - **Exemplo**: Usuário envia: "E como funciona ele?" após estarem falando sobre curso. Você reescreve como: "Como funciona o curso?" no campo `perguntas_extraidas`.
     - **⚠️ REGRA DE OURO CRÍTICA DE NOMES PRÓPRIOS**: NUNCA invente, presuma ou insira nomes próprios de marcas, nomes de clínicas ou de cursos específicos na pergunta melhorada. Use termos genéricos adequados.
     - Certifique-se de que a resposta JSON contenha `"precisa_esclarecimento": false` ao enriquecer a pergunta com sucesso.

 5c. **MÚLTIPLAS PERGUNTAS / MULTIPLE QUESTIONS (OBRIGATÓRIO):**
      - Se o usuário fizer mais de 1 pergunta ou requisição na mesma mensagem (Ex: "Quanto custa o aluguel? E como funciona o curso?"), você DEVE identificar e extrair cada pergunta individualmente.
      - Melhore e enriqueça cada pergunta separadamente baseando-se no contexto do histórico e regras de nomes próprios acima.
      - Forneça a lista de perguntas limpas e enriquecidas individualmente no campo `"lista_perguntas_extraidas"` (um array de strings). Se houver apenas uma pergunta, coloque-a como o único elemento desse array. Se não houver perguntas, defina como `[]`.

 6. **DECIDIR E MAPEAR ACIONAMENTO DE FERRAMENTAS (MUITO IMPORTANTE):**
    Analise a mensagem atual e o histórico para determinar se o usuário está solicitando uma ação que corresponde a alguma destas ferramentas cadastradas:
    {tools_desc}
    - Se o usuário pedir para marcar/agendar, listar agendamentos, cancelar ou verificar horários, ou qualquer ação técnica equivalente, você DEVE preencher `chamada_ferramenta` estruturando a chamada com o nome da ferramenta e os argumentos necessários perfeitamente extraídos (ex: resolvendo datas relativas usando o contexto temporal abaixo).
    - **⚠️ REGRA DE OURO PARA SUPORTE HUMANO (`transferir_suporte_humano`)**: NUNCA acione esta ferramenta se o usuário estiver apenas tirando dúvidas comuns sobre o curso, preços, políticas ou fazendo perguntas gerais (Ex: "Quanto custa?", "Qual o valor em reais?"). Você deve acionar `transferir_suporte_humano` **APENAS** se o usuário solicitar explicitamente falar com um atendente humano, suporte, especialista ou demonstrar extrema insatisfação com a IA (Ex: "Quero falar com uma pessoa", "Suporte", "Humano por favor").
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

    history_text = ""
    for h in history:
        role = h.get('role', 'user').upper()
        content = h.get('content', '')
        history_text += f"{role}: {content}\n\n"

    system_prompt = (
        "Você é um assistente especializado em enriquecimento e desambiguação de mensagens (Query Enrichment).\n"
        "Sua única tarefa é substituir pronomes vagos (como 'ele', 'isso', 'quanto é?') pelo assunto citado no histórico recente.\n\n"
        "⚠️ REGRAS ANTI-ALUCINAÇÃO E ANTI-ESPECULAÇÃO (ESTRITAMENTE OBRIGATÓRIAS):\n"
        "1. PROIBIDO INVENTAR PERGUNTAS OU DETALHES: NUNCA crie, deduza ou adicione perguntas adicionais ou suposições que o usuário NÃO perguntou explicitamente (como mentoria, suporte prático, técnicas específicas, prazos, formas de pagamento, etc.).\n"
        "2. Se a mensagem do usuário for uma objeção, desabafo ou relato de experiência anterior, MANTENHA A MENSAGEM EXATAMENTE COMO ESTÁ sem inventar perguntas suplementares no final.\n"
        "3. Apenas substitua termos vagos (como 'sim', 'quero', 'quanto é?', 'como funciona?') pelo assunto do histórico.\n"
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
            return enriched
    except Exception as e:
        logger.error(f"Erro ao enriquecer mensagem no pre-router: {e}")
    return message


async def run_pre_router_ai(message: str, history: list, main_agent, secondary_agents: list = None, context_variables: dict = None, db = None) -> dict:
    """
    Triagem inicial da mensagem para identificar saudações, extrair datas e rotear agentes.
    """
    raw_user_message = message
    secondary_agents = secondary_agents or []
    
    # 0. Enriquecimento da Mensagem com IA baseado no Histórico no Início do Pre-Router
    api_key = os.getenv("OPENAI_API_KEY")
    client = openai.AsyncOpenAI(api_key=api_key) if api_key else None
    
    if client and history and len(message.strip()) < 150:
        message = await enrich_user_message(message, history, client)
        
    # --- ATALHO PROGRAMÁTICO PARA SAUDAÇÃO CURTA E ANÚNCIOS ---
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
    
    # Lista de termos de confirmação curtos comuns
    common_confirmations = ["ok", "blz", "show", "combinado", "perfeito", "certo", "beleza", "entendi", "tendi", "tá", "ta", "sim", "isso", "fechado"]
    
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
        import re
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

    # Identifica se a mensagem contém alguma pergunta ou intenção real de conhecimento
    has_real_question = "?" in raw_user_message or any(term in raw_user_message.lower() for term in [
        "qual", "como", "quanto", "quem", "onde", "quando", "pode", "precisa",
        "faz", "curso", "valor", "preço", "preco", "gostaria", "tenho interesse", "funciona",
        "endereço", "endereco", "horario", "horário", "ajuda", "duvida", "dúvida",
        "inscrição", "incrição", "requisito", "formação", "formacao", "posso", "consigo",
        "serve", "aula", "aulas", "plano", "planos", "comprar", "alugar", "saber mais"
    ])

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
    elif msg_clean_no_punct in common_thanks:
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
                resposta_confirmacao = "Perfeito! Se precisar de mais alguma coisa, é só chamar. 😊"
                if "combinado" in msg_clean_no_punct:
                    resposta_confirmacao = "Combinado! Qualquer dúvida, estou por aqui. 😉"
                elif "ok" in msg_clean_no_punct:
                    resposta_confirmacao = "Combinado! Se precisar de algo, é só chamar. 👍"
                elif "certo" in msg_clean_no_punct:
                    resposta_confirmacao = "Certo! Se precisar de mais alguma ajuda, estou à disposição. 👍"
                    
                return {
                    "eh_saudacao": True,
                    "eh_agradecimento": False,
                    "precisa_esclarecimento": False,
                    "id_agente_alvo": main_agent.id,
                    "resposta_direta": resposta_confirmacao,
                    "perguntas_extraidas": None,
                    "data_extraida": None,
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
        import re
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
        
        # Se houver pergunta real na mensagem, NUNCA enviar resposta direta padrão de saudação
        if has_real_question:
            result["eh_saudacao"] = False
            result["resposta_direta"] = None
            result["precisa_rag"] = True
            if not result.get("perguntas_extraidas"):
                result["perguntas_extraidas"] = raw_user_message
                result["lista_perguntas_extraidas"] = [raw_user_message]
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
        return result
    except Exception as e:
        logger.error(f"Erro no Pre-Router: {e}")
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
            "detalhe_anuncio": similarity_info
        }
