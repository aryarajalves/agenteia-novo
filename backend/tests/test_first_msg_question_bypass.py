import pytest
from agent_core.logic.pre_router import run_pre_router_ai
from config_store import AgentConfig

class DummyAgent:
    def __init__(self):
        self.id = 1
        self.name = "Agente Teste"
        self.initial_message = "oiee! Qual sua dúvida sobre o Método Laser Day?"
        self.greeting_mode = "panel"

@pytest.mark.asyncio
async def test_first_message_with_question_bypasses_initial_message():
    """Valida se mensagens que contêm perguntas (mesmo sendo a primeira mensagem) NÃO retornam a mensagem inicial padrão."""
    agent = DummyAgent()
    msg = "Qual quer pessoa pode fazer curso"

    result = await run_pre_router_ai(msg, history=[], main_agent=agent)

    # Must NOT be treated as a simple greeting and must NOT return initial_message
    assert result["eh_saudacao"] is False
    assert result["resposta_direta"] is None
    assert result["precisa_rag"] is True
    assert result["perguntas_extraidas"] is not None
