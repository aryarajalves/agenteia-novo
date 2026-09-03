import pytest
from unittest.mock import AsyncMock
from agent_core.logic.pre_router import enrich_user_message

@pytest.mark.asyncio
async def test_enrich_user_message_bypasses_long_and_complete_messages():
    """Valida se mensagens estruturadas/longas (>70 chars ou >10 palavras) não passam por reescrita do enrich_user_message."""
    msg = "Já faço laser fiz 2 cursos on line mas tenho dificuldade em remover tatuagem Tenho medo de comprar outro curso e não resolver essa minha dificuldade"
    history = [{"role": "user", "content": "Olá"}, {"role": "assistant", "content": "Como posso ajudar?"}]
    mock_client = AsyncMock()

    result = await enrich_user_message(msg, history, mock_client)

    # Must return original message untouched without calling OpenAI API
    assert result == msg
    assert mock_client.chat.completions.create.call_count == 0

@pytest.mark.asyncio
async def test_enrich_user_message_bypasses_self_contained_course_query():
    """Valida se mensagens completas com assunto explícito não são reescritas."""
    msg = "Olá! Quero saber mais sobre o método laser day"
    history = [
        {"role": "user", "content": "."},
        {"role": "assistant", "content": "Posso ajudar você com mais alguma dúvida sobre o Método Laser Day?"}
    ]
    mock_client = AsyncMock()

    result = await enrich_user_message(msg, history, mock_client)

    assert result == msg
    assert mock_client.chat.completions.create.call_count == 0

@pytest.mark.asyncio
async def test_enrich_user_message_rejects_attendant_phrases_guardrail():
    """Valida se a salvaguarda rejeita inversão de papéis caso o modelo retorne frase de atendente."""
    msg = "Quero"
    history = [
        {"role": "assistant", "content": "Posso ajudar você com mais alguma dúvida sobre o Método Laser Day?"}
    ]
    mock_client = AsyncMock()
    mock_choice = AsyncMock()
    mock_choice.message.content = "Posso ajudar você com mais alguma dúvida sobre o Método Laser Day?"
    mock_response = AsyncMock()
    mock_response.choices = [mock_choice]
    mock_client.chat.completions.create.return_value = mock_response

    result = await enrich_user_message(msg, history, mock_client)

    # A salvaguarda deve detectar 'posso ajudar você' e rejeitar, mantendo o fallback correto
    assert "posso ajudar você" not in result.lower()

