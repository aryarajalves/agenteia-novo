import pytest
from agent_core.logic.pre_router import run_pre_router_ai, _is_generic_doubt_or_vague_topic

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

def test_is_generic_doubt_or_vague_topic_detection():
    assert _is_generic_doubt_or_vague_topic("Não finalizei tive umas duvida") is True
    assert _is_generic_doubt_or_vague_topic("Sobre a máquina") is True
    assert _is_generic_doubt_or_vague_topic("Tenho dúvidas") is True
    assert _is_generic_doubt_or_vague_topic("estou com dúvida no pagamento") is True
    assert _is_generic_doubt_or_vague_topic("sobre o curso") is True

    # Perguntas reais NÃO devem ser classificadas como vaga
    assert _is_generic_doubt_or_vague_topic("Qual máquina o curso indica?") is False
    assert _is_generic_doubt_or_vague_topic("Quanto custa a máquina?") is False
    assert _is_generic_doubt_or_vague_topic("Como funciona o aluguel?") is False
    assert _is_generic_doubt_or_vague_topic("Tem certificado no final?") is False

@pytest.mark.asyncio
async def test_vague_doubt_returns_clarification_question():
    config = MockConfig()
    history = [
        {"role": "user", "content": "Bom dia"},
        {"role": "assistant", "content": "Olá! Como posso te ajudar?"}
    ]

    # Mensagem 1: "Não finalizei tive umas duvida"
    res1 = await run_pre_router_ai("Não finalizei tive umas duvida", history, config)
    assert res1["precisa_esclarecimento"] is True
    assert res1["precisa_rag"] is False
    assert res1["resposta_esclarecimento"] is not None
    assert "dúvida" in res1["resposta_esclarecimento"].lower() or "ajudar" in res1["resposta_esclarecimento"].lower()

    # Mensagem 2: "Sobre a máquina"
    res2 = await run_pre_router_ai("Sobre a máquina", history, config)
    assert res2["precisa_esclarecimento"] is True
    assert res2["precisa_rag"] is False
    assert res2["resposta_esclarecimento"] is not None
    assert "máquina" in res2["resposta_esclarecimento"].lower()

@pytest.mark.asyncio
async def test_specific_question_after_vague_topic_triggers_rag():
    config = MockConfig()
    history = [
        {"role": "user", "content": "Sobre a máquina"},
        {"role": "assistant", "content": "Olá! Quais são as suas dúvidas sobre a máquina? Me diga o que gostaria de saber!"}
    ]

    # Quando o usuário manda a pergunta específica ("Qual máquina indica?")
    res = await run_pre_router_ai("Qual máquina o curso indica?", history, config)
    assert res["precisa_esclarecimento"] is False
    assert res["eh_saudacao"] is False
