import asyncio
import os
import sys

# Adiciona o diretório backend ao path para importação dos módulos
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database.connection import async_session
from models import AgentConfigModel
from sqlalchemy import select

EXCEPTIONS_BLOCK = """
    ⛔ EXCEÇÕES RÍGIDAS (EXEMPLOS QUE NUNCA DEVEM SER CLASSIFICADOS COMO MENSAGEM AUTOMÁTICA):
    - Mensagens enviadas ao clicar em botões de anúncios, botões de templates ou links do WhatsApp (Ex: "Olá! Quero saber mais sobre...", "Tenho interesse").
    - Perguntas diretas do usuário sobre valores, preços, horários, cursos, serviços ou dúvidas gerais.
    - Qualquer interação iniciada por um cliente real querendo atendimento.
    - Para todas as exceções acima, você DEVE OBRIGATORIAMENTE definir 'eh_mensagem_automatica' como FALSE.
"""

PRAISE_EXC_LINE = '   - **Elogios, reações humanas e mensagens de afeto/satisfação** (Ex: "Amei", "Amei.", "Adorei", "Gostei", "Top", "Muito bom", "Show", "Valeu", "Obrigada", "Obrigado", "❤️", "🥰", "👏") NUNCA SÃO MENSAGENS AUTOMÁTICAS DE AUSÊNCIA. Elas são mensagens humanas legítimas e \'eh_mensagem_automatica\' DEVE SER OBRIGATORIAMENTE FALSE.'

PRAISE_RULE_BLOCK = '''   - Se a mensagem for um ELOGIO, AGRADECIMENTO ou REAÇÃO AFETIVA/POSITIVA (Ex: "Amei", "Amei.", "Adorei", "Gostei muito", "Muito bom", "Maravilha", "Top", "Obrigado", "Obrigada", "Valeu", "❤️", "🥰"):
     * Se for a primeira reação/agradecimento do usuário (o assistente ainda não enviou mensagem de encerramento recente no histórico), defina 'eh_agradecimento' como true, 'eh_saudacao' como true e use uma resposta calorosa e simpática em 'resposta_direta' (Ex: "Fico muito feliz que tenha gostado! 🥰 Se precisar de mais alguma coisa ou tiver qualquer dúvida, é só me chamar.").
     * Se for o SEGUNDO (ou subsequente) agradecimento/encerramento do usuário (o assistente JÁ enviou uma resposta de encerramento como "Por nada", "é só chamar", "estou à disposição" ou emoji no histórico recente), NUNCA responda com mensagens de novo. Defina 'eh_agradecimento' como true, 'eh_saudacao' como true, 'eh_agradecimento_recorrente' como true e 'resposta_direta' como null para silenciar a automação sem enviar nada.'''

NEGATIVE_DOUBT_BLOCK = '''   ⛔ **REGRA CRÍTICA DE NEGAÇÃO DE DÚVIDAS (ESTRITAMENTE PROIBIDO PEDIR ESCLARECIMENTO):**
   - Se o usuário afirmar que **NÃO TEM DÚVIDAS** ou responder negativamente a uma pergunta do assistente/template sobre dúvidas (Ex: "Não tenho", "Não tenho dúvida", "Não tenho dúvidas", "Nenhuma", "Não ficou dúvida", "Tudo claro", "Sem dúvidas", "Tranquilo", "Não"):
     * Você **NUNCA DEVE** definir `precisa_esclarecimento` como true!
     * Você **NUNCA DEVE** perguntar qual é a dúvida dele (Ex: "Qual é a sua dúvida?", "Você não tem o quê?"), pois o cliente disse expressamente que NÃO tem dúvidas!
     * Defina `precisa_esclarecimento` como false, `eh_saudacao` como false, `perguntas_extraidas` como "O cliente informou que não possui dúvidas" ou deixe o Agente Principal responder para conduzir o fechamento comercial (oferecer o link de compra/inscrição ou verificar se pode ajudar na finalização).'''

TEMPLATE_RESOLUTION_BLOCK = '''  5e. **RESOLUÇÃO CONTEXTUAL DE RESPOSTAS A PERGUNTAS DO TEMPLATE OU HISTÓRICO RECENTE:**
       - Se no turno anterior o assistente ou o template enviou uma pergunta direta (Ex: "Você tem alguma dúvida?", "Quer receber o link?", "Qual sua dúvida?"):
         * Se o usuário responder "Não tenho", "Não", "Nenhuma": Isso significa que ele NÃO tem dúvidas e está respondendo diretamente ao assistente. NUNCA pergunte "Você não tem o quê?".
         * Se o usuário responder "Tenho", "Quero", "Sim", "Gostaria": Trate como confirmação legítima de interesse.'''

async def update_prompts():
    async with async_session() as db:
        result = await db.execute(select(AgentConfigModel))
        agents = result.scalars().all()
        updated_count = 0

        for agent in agents:
            if not agent.pre_router_prompt:
                continue

            prompt = agent.pre_router_prompt
            modified = False

            if "Elogios, reações humanas" not in prompt:
                if "⛔ EXCEÇÕES RÍGIDAS" in prompt:
                    prompt = prompt.replace(
                        "⛔ EXCEÇÕES RÍGIDAS (EXEMPLOS QUE NUNCA DEVEM SER CLASSIFICADOS COMO MENSAGEM AUTOMÁTICA):",
                        "⛔ EXCEÇÕES RÍGIDAS (EXEMPLOS QUE NUNCA DEVEM SER CLASSIFICADOS COMO MENSAGEM AUTOMÁTICA):\n" + PRAISE_EXC_LINE
                    )
                    modified = True

            if "Se a mensagem for um ELOGIO" not in prompt:
                if "- Se a mensagem for um AGRADECIMENTO" in prompt:
                    prompt = prompt.replace(
                        "- Se a mensagem for um AGRADECIMENTO",
                        PRAISE_RULE_BLOCK + "\n   - Se a mensagem for um AGRADECIMENTO"
                    )
                    modified = True

            if "REGRA CRÍTICA DE NEGAÇÃO DE DÚVIDAS" not in prompt:
                if "⚠️ EXCEÇÃO PARA SAUDAÇÕES EM HISTÓRICO:" in prompt:
                    prompt = prompt.replace(
                        "⚠️ EXCEÇÃO PARA SAUDAÇÕES EM HISTÓRICO:",
                        NEGATIVE_DOUBT_BLOCK + "\n   \n   ⚠️ EXCEÇÃO PARA SAUDAÇÕES EM HISTÓRICO:"
                    )
                    modified = True

            if "RESOLUÇÃO CONTEXTUAL DE RESPOSTAS A PERGUNTAS DO TEMPLATE" not in prompt:
                if "6. **DECIDIR E MAPEAR ACIONAMENTO DE FERRAMENTAS" in prompt:
                    prompt = prompt.replace(
                        "6. **DECIDIR E MAPEAR ACIONAMENTO DE FERRAMENTAS",
                        TEMPLATE_RESOLUTION_BLOCK + "\n\n 6. **DECIDIR E MAPEAR ACIONAMENTO DE FERRAMENTAS"
                    )
                    modified = True

            if modified:
                agent.pre_router_prompt = prompt
                updated_count += 1

        if updated_count > 0:
            await db.commit()
            print(f"✅ {updated_count} agente(s) atualizado(s) no banco de dados com a regra de negação de dúvidas e resolução contextual!")
        else:
            print("ℹ️ Nenhum agente precisou ser atualizado ou todos já possuem a regra.")

if __name__ == "__main__":
    asyncio.run(update_prompts())
