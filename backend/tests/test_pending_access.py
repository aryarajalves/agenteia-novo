import pytest
from agent_core.core import process_message
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
async def test_pending_access_message_does_not_trigger_transfer():
    config = MockConfig()
    history = []

    # Mensagem enviada pelo cliente no print do usuário
    message = "Finalizei sim, até já paguei. Só não acessei as aulas ainda"

    res = await run_pre_router_ai(message, history, config)
    
    # Não deve solicitar suporte humano nem ser tratada como erro de acesso
    assert res.get("chamada_ferramenta") is None
    assert res.get("precisa_esclarecimento") is False

@pytest.mark.asyncio
async def test_process_message_with_pending_access_does_not_mention_transfer():
    config = MockConfig()
    history = []
    message = "Finalizei sim, até já paguei. Só não acessei as aulas ainda"

    result = await process_message(message, history, config)
    
    content = (result.get("content") or "").lower()
    
    # A IA é proibida de prometer transferir ou encaminhar para outro setor
    assert "transferir" not in content
    assert "outro setor" not in content
    assert "suporte" not in content or "qualquer dúvida" in content or "estou à disposição" in content
