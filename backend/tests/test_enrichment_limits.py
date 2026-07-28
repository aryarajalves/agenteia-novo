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
