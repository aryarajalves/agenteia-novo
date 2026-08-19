import pytest
from agent_core.logic.pre_router import run_pre_router_ai

class MockConfig:
    def __init__(self, **kwargs):
        self.id = 1
        self.name = "Test Agent"
        self.model = "gpt-4o-mini"
        self.system_prompt = "You are a helpful assistant."
        self.initial_message = "Olá! Como posso ajudar?"
        self.initial_question_message = "Você possui mais alguma dúvida?"
        self.initial_ignore_message = "{}"
        self.context_window = 5
        self.model_settings = "{}"
        self.router_enabled = False
        self.date_awareness = False
        for k, v in kwargs.items():
            setattr(self, k, v)

@pytest.mark.asyncio
async def test_course_general_query_is_not_rewritten_to_disponiveis():
    config = MockConfig()
    history = []

    # Mensagem enviada pelo cliente no print do usuário
    message = "Na vdd, gostaria de saber sobre os cursos"

    result = await run_pre_router_ai(message, history, config)
    
    assert result["eh_saudacao"] is False
    assert result.get("perguntas_extraidas") is not None
    
    pe = str(result["perguntas_extraidas"]).lower()
    
    # A reescrita NUNCA deve inventar a palavra 'disponíveis' nem alterar a semântica para consulta de catálogo
    assert "disponíveis" not in pe and "disponiveis" not in pe, f"Palavra 'disponíveis' foi erroneamente injetada: {pe}"
    assert "curso" in pe
