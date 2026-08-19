import json
import logging
from sqlalchemy import select
from database.connection import async_session

logger = logging.getLogger(__name__)

async def seed_native_tools():
    """Garante que as ferramentas nativas existam no catálogo."""
    from models import ToolModel # Import local para evitar circular dependency
    
    NATIVE_TOOLS = [
        {
            "name": "google_calendar_manager",
            "description": "Ferramenta para gerenciar o Google Calendar. Ações: criar (agendar), listar (vagas livres), listar_ativos (ver agendamentos ativos), atualizar e cancelar. REGRA DE CRIAÇÃO: Toda vez que você criar/agendar um novo evento com sucesso, você deve incluir obrigatoriamente na mensagem de confirmação ao usuário o ID do evento criado (retornado pela ferramenta como 'ID do evento') e o link da video chamada/reunião. REGRA RÍGIDA DE CANCELAMENTO: 1. Quando o usuário pedir para cancelar, primeiro liste os ativos com a ação 'listar_ativos' para encontrar o evento correto. 2. Mostre os detalhes do evento encontrado ao usuário (Nome, Data, Hora e obrigatoriamente informe o ID do evento na mensagem) e pergunte explicitamente: 'Você confirma o cancelamento deste compromisso?'. 3. APENAS execute a ação 'cancelar' após o usuário responder confirmando explicitamente (ex: 'sim', 'confirmo'). Você tem autoridade total para fazer a exclusão direta após o sim do usuário, não precisa envolver humanos ou equipe.",
            "parameters_schema": json.dumps({
                "type": "object",
                "properties": {
                    "acao": {
                        "type": "string",
                        "enum": ["criar", "listar", "atualizar", "cancelar", "listar_ativos", "listar_compromissos"],
                        "description": "Ação a ser realizada: 'criar' para agendar, 'listar' para buscar vagas livres/slots disponíveis, 'listar_ativos' ou 'listar_compromissos' para listar mentorias já agendadas e marcadas, 'atualizar' para editar, 'cancelar' para excluir."
                    },
                    "titulo": {"type": "string", "description": "Título do evento. Formato OBRIGATÓRIO: [qual evento] - [Dono do evento] - [Pessoa que vai participar]. NUNCA coloque 'a confirmar' no título. Exemplo: 'Mentoria - Tarcira Martins - Aryaraj Alves'"},
                    "inicio": {"type": "string", "description": "Data/hora de início no formato ISO 8601 (ex: 2024-10-25T14:30:00-03:00)"},
                    "fim": {"type": "string", "description": "Data/hora de fim no formato ISO 8601 (opcional)"},
                    "descricao": {"type": "string", "description": "Notas, pauta ou detalhes do evento (opcional)"},
                    "local": {"type": "string", "description": "Localização ou link da reunião (opcional)"},
                    "convidados": {"type": "string", "description": "Lista de e-mails separados por vírgula (opcional)"},
                    "cor": {"type": "string", "description": "Cor: vermelho, azul, verde, amarelo, roxo, rosa, laranja (opcional)"},
                    "event_id": {"type": "string", "description": "ID único do evento (OBRIGATÓRIO para atualizar ou cancelar). REGRA RÍGIDA: Você deve obter este ID rodando primeiro a ação 'listar_ativos'."},
                    "max_resultados": {"type": "integer", "description": "Quantidade máxima de eventos ao listar (padrão 10)"},
                    "busca": {"type": "string", "description": "Termo de busca para filtrar eventos ao listar (opcional)"},
                    "duracao_minutos": {"type": "integer", "description": "Duração do slot de mentoria em minutos ao listar (padrão 60, ex: 30, 90)"}
                },
                "required": ["acao"]
            })
        },
        {
            "name": "transferir_suporte_humano",
            "description": (
                "Transfere o atendimento para um especialista humano. "
                "REGRAS RÍGIDAS: 1. Use se o usuário pedir EXPLICITAMENTE para falar com atendente ou se solicitar cancelamento/reembolso. "
                "2. NUNCA mencione em texto que vai transferir sem acionar esta ferramenta. "
                "3. NUNCA use se você não souber a resposta (use 'registrar_duvida_sem_resposta'). "
                "4. NUNCA assuma que nomes desconhecidos são de funcionários."
            ),
            "parameters_schema": json.dumps({
                "type": "object",
                "properties": {
                    "motivo": {"type": "string", "description": "Breve motivo da transferência"}
                }
            })
        },
        {
            "name": "transferir_robo",
            "description": "Retorna o atendimento para a automação do robô. Use quando o atendimento humano terminar ou o usuário pedir para voltar ao menu automático.",
            "parameters_schema": json.dumps({
                "type": "object",
                "properties": {}
            })
        },
        {
            "name": "internal_date_calculator",
            "description": "Calcula datas relativas (ex: 'próxima segunda', 'daqui a 3 dias') baseando-se na data atual.",
            "parameters_schema": json.dumps({
                "type": "object",
                "properties": {
                    "date_description": {"type": "string", "description": "Descrição da data (ex: próxima quinta)"}
                },
                "required": ["date_description"]
            })
        },
        {
            "name": "lead_qualificado",
            "description": (
                "Chame esta ferramenta quando o usuário tiver respondido TODAS as perguntas de qualificação configuradas. "
                "Registra o lead como qualificado e aciona as ações seguintes definidas pelo administrador. "
                "NUNCA chame antes de coletar todas as respostas."
            ),
            "parameters_schema": json.dumps({
                "type": "object",
                "properties": {
                    "respostas": {
                        "type": "object",
                        "description": "Objeto com as respostas coletadas. Chave = pergunta, Valor = resposta do usuário."
                    }
                },
                "required": ["respostas"]
            })
        },
        {
            "name": "registrar_duvida_sem_resposta",
            "description": "Chame esta ferramenta quando o conhecimento disponível não for suficiente para responder à dúvida do usuário. Isso notificará a equipe humana.",
            "parameters_schema": json.dumps({
                "type": "object",
                "properties": {
                    "pergunta": {"type": "string", "description": "A pergunta exata do usuário"}
                },
                "required": ["pergunta"]
            })
        }
    ]

    async with async_session() as session:
        for tool_data in NATIVE_TOOLS:
            try:
                # Busca exata ignorando case e espaços para evitar falsos negativos
                q = select(ToolModel).where(ToolModel.name == tool_data["name"])
                existing_result = await session.execute(q)
                existing = existing_result.scalars().first()
                
                if not existing:
                    logger.info(f"🌱 Semeando ferramenta nativa: {tool_data['name']}")
                    new_tool = ToolModel(**tool_data)
                    session.add(new_tool)
                    await session.commit() # Commit individual para evitar que um erro trave todos
                else:
                    # Atualiza a descrição se já existir (garante que as mudanças de schema/descrição reflitam)
                    existing.description = tool_data["description"]
                    existing.parameters_schema = tool_data["parameters_schema"]
                    await session.commit()
            except Exception as e:
                await session.rollback()
                logger.error(f"⚠️ Erro ao semear ferramenta {tool_data['name']}: {e}")

