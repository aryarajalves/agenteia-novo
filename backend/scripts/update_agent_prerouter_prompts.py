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

async def update_prompts():
    async with async_session() as db:
        result = await db.execute(select(AgentConfigModel))
        agents = result.scalars().all()
        updated_count = 0

        for agent in agents:
            if not agent.pre_router_prompt:
                continue

            prompt = agent.pre_router_prompt
            if "EXCEÇÕES RÍGIDAS" not in prompt:
                # Inserir o bloco de exceções antes do trecho "Se você identificar que a mensagem do usuário é"
                target_str = "Se você identificar que a mensagem do usuário é"
                if target_str in prompt:
                    prompt = prompt.replace(target_str, EXCEPTIONS_BLOCK + "\n    " + target_str)
                    agent.pre_router_prompt = prompt
                    updated_count += 1
                else:
                    # Se for o template antigo completo, atualizar se for necessário
                    pass

        if updated_count > 0:
            await db.commit()
            print(f"✅ {updated_count} agentes atualizados no banco de dados com a nova seção de exceções!")
        else:
            print("ℹ️ Nenhum agente precisou ser atualizado ou todos já possuem a seção.")

if __name__ == "__main__":
    asyncio.run(update_prompts())
