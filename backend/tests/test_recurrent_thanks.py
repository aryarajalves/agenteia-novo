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
async def test_first_thank_you_returns_full_response():
    config = MockConfig()
    history = [
        {"role": "user", "content": "Qual o valor do curso?"},
        {"role": "assistant", "content": "O curso custa R$ 500."}
    ]
    
    # 1º Agradecimento do usuário após uma resposta normal
    result = await run_pre_router_ai("Obrigada ❤️", history, config)
    assert result["eh_saudacao"] is True
    assert result["eh_agradecimento"] is True
    assert result["resposta_direta"] == "Por nada! Se precisar de mais alguma coisa, é só chamar."

@pytest.mark.asyncio
async def test_second_thank_you_returns_none_to_silence_automation():
    config = MockConfig()
    # Histórico onde a última resposta do assistente já foi um encerramento/agradecimento
    history_after_closing = [
        {"role": "user", "content": "Qual o valor do curso?"},
        {"role": "assistant", "content": "O curso custa R$ 500."},
        {"role": "user", "content": "Obrigada ❤️"},
        {"role": "assistant", "content": "Por nada! Se precisar de mais alguma coisa, é só chamar."}
    ]
    
    # 2º Agradecimento/Encerramento do usuário (Ex: "Perfeito ❤️" ou "Valeu")
    result1 = await run_pre_router_ai("Perfeito ❤️", history_after_closing, config)
    assert result1["eh_saudacao"] is True
    assert result1["eh_agradecimento_recorrente"] is True
    assert result1["resposta_direta"] is None
    assert "Não Responder" in result1["tipo_mensagem"]
    
    result2 = await run_pre_router_ai("Valeu!", history_after_closing, config)
    assert result2["eh_saudacao"] is True
    assert result2["eh_agradecimento_recorrente"] is True
    assert result2["resposta_direta"] is None

@pytest.mark.asyncio
async def test_subsequent_emojis_or_confirmations_silenced():
    config = MockConfig()
    history_after_recurrent = [
        {"role": "user", "content": "Obrigada ❤️"},
        {"role": "assistant", "content": "Por nada! Se precisar de mais alguma coisa, é só chamar."},
        {"role": "user", "content": "Perfeito ❤️"}
    ]
    
    # Próxima reação/agradecimento também não gera mensagem de resposta
    result = await run_pre_router_ai("👍", history_after_recurrent, config)
    assert result["eh_saudacao"] is True
    assert result["eh_agradecimento_recorrente"] is True
    assert result["resposta_direta"] is None

@pytest.mark.asyncio
async def test_new_question_bypasses_silence():
    config = MockConfig()
    history_after_closing = [
        {"role": "user", "content": "Obrigada ❤️"},
        {"role": "assistant", "content": "Por nada! Se precisar de mais alguma coisa, é só chamar."}
    ]
    
    # Se o usuário fizer uma nova pergunta real, NÃO deve silenciar, deve passar para o agente
    result = await run_pre_router_ai("Qual o horário das aulas?", history_after_closing, config)
    assert result.get("eh_agradecimento_recorrente") is not True
    assert result["eh_saudacao"] is False

@pytest.mark.asyncio
async def test_process_message_returns_ignored_recurrent_thanks():
    config = MockConfig()
    history_after_closing = [
        {"role": "user", "content": "Qual o valor do curso?"},
        {"role": "assistant", "content": "O curso custa R$ 500."},
        {"role": "user", "content": "Obrigada ❤️"},
        {"role": "assistant", "content": "Por nada! Se precisar de mais alguma coisa, é só chamar."}
    ]
    
    # Testa no core (process_message)
    result = await process_message("Perfeito ❤️", history_after_closing, config)
    assert result["content"] is None
    assert result.get("ignored_recurrent_thanks") is True
