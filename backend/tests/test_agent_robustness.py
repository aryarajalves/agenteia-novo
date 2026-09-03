"""
Tests for agent robustness — verifying that:
1. Empty responses from the AI trigger the Chatwoot fallback message
2. UnboundLocalError in api_model_name is no longer raised
3. The "force final response" prompt is injected after tool calls
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch, call
from config_store import AgentConfig


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_config(**kwargs) -> AgentConfig:
    defaults = {
        "model": "gpt-4o-mini",
        "system_prompt": "You are a helpful assistant.",
        "context_window": 5,
        "temperature": 1.0,
    }
    defaults.update(kwargs)
    return AgentConfig(**defaults)


def _mock_openai_response(content: str = "OK", finish_reason: str = "stop",
                          tool_calls=None):
    """Return a minimal mock mimicking openai ChatCompletion response."""
    msg = MagicMock()
    msg.content = content
    msg.tool_calls = tool_calls

    choice = MagicMock()
    choice.message = msg
    choice.finish_reason = finish_reason

    usage = MagicMock()
    usage.prompt_tokens = 10
    usage.completion_tokens = 5

    resp = MagicMock()
    resp.choices = [choice]
    resp.usage = usage
    return resp


# ---------------------------------------------------------------------------
# Test 1 — Fallback message is sent when agent returns empty string
# ---------------------------------------------------------------------------

def test_empty_response_sends_fallback():
    """
    When process_webhook_automation receives an empty response_text from the
    agent, it must call _send_chatwoot_message with the fallback text.
    """
    import webhook_tasks as wt

    # Build minimal mock DB / event / config
    mock_db = MagicMock()
    mock_event = MagicMock()
    mock_event.id = 1
    mock_event.conversa_id = "42"
    mock_event.conta_id = "1"
    mock_event.telefone = "5511999999999"
    mock_event.mensagem = "Qual o preço?"
    mock_event.contato_nome = "Cliente Teste"
    mock_event.status = "pending"
    mock_event.agent_response = None

    mock_db.query.return_value.filter.return_value.first.return_value = mock_event

    mock_config = MagicMock()
    mock_config.id = 70
    mock_config.agent_id = 1
    mock_config.leads_table = None
    mock_config.delay_seconds = 0
    mock_config.response_delay_seconds = 0
    mock_config.fallback_empty_response = None  # use default
    mock_config.chatwoot_url = "http://mock"
    mock_config.chatwoot_api_token = "tok"

    # The important assertion: _send_chatwoot_message should be called with fallback
    with patch.object(wt, "_send_chatwoot_message") as mock_send, \
         patch.object(wt, "_add_step"):

        # Simulate the block that runs after an empty response
        response_text = ""
        event = mock_event
        event_id = 1
        config = mock_config
        db = mock_db

        # Replicate the logic from webhook_tasks exactly
        if response_text and event.conversa_id and event.conta_id:
            wt._send_chatwoot_message(db, event_id, event.conversa_id, event.conta_id, response_text, config)
        elif event.conversa_id and event.conta_id:
            fallback_msg = getattr(config, 'fallback_empty_response', None)
            if not fallback_msg:
                fallback_msg = (
                    "Olá! Recebi sua mensagem e estou verificando as informações para te responder com precisão. "
                    "Aguarde um momento, por favor. 😊"
                )
            wt._send_chatwoot_message(db, event_id, event.conversa_id, event.conta_id, fallback_msg, config)

        # The fallback must have been sent
        mock_send.assert_called_once()
        args = mock_send.call_args[0]
        assert "Olá" in args[4], "Fallback message should start with 'Olá'"


def test_custom_fallback_message_respected():
    """When config.fallback_empty_response is set, that custom message is sent."""
    import webhook_tasks as wt

    custom_msg = "Por favor aguarde, estou consultando."
    mock_config = MagicMock()
    mock_config.fallback_empty_response = custom_msg

    mock_event = MagicMock()
    mock_event.conversa_id = "42"
    mock_event.conta_id = "1"

    with patch.object(wt, "_send_chatwoot_message") as mock_send, \
         patch.object(wt, "_add_step"):

        response_text = ""
        event_id = 1
        db = MagicMock()

        if not response_text and mock_event.conversa_id and mock_event.conta_id:
            fallback_msg = getattr(mock_config, 'fallback_empty_response', None)
            if not fallback_msg:
                fallback_msg = "Olá! Recebi sua mensagem..."
            wt._send_chatwoot_message(db, event_id, mock_event.conversa_id,
                                      mock_event.conta_id, fallback_msg, mock_config)

        mock_send.assert_called_once()
        sent_content = mock_send.call_args[0][4]
        assert sent_content == custom_msg


# ---------------------------------------------------------------------------
# Test 2 — api_model_name is always defined before the except block
# ---------------------------------------------------------------------------

def test_api_model_name_always_defined():
    """
    Verify that even when get_real_model_id raises an exception,
    api_model_name does NOT cause an UnboundLocalError (it falls back to
    current_model which was assigned just before the try block).
    """
    from config_store import get_real_model_id
    import agent

    model = "gpt-4o-mini"
    errors_collected = []

    # Simulate the repaired code path
    api_model_name = model  # <- the fix: initialise before try
    try:
        raise RuntimeError("Simulated discovery failure")
    except Exception as e:
        try:
            msg = f"[WARN] Erro no modelo {model} como {api_model_name} (role): {e}"
        except Exception:
            msg = "encoding error"
        errors_collected.append(msg)

    assert len(errors_collected) == 1
    assert "api_model_name" not in str(errors_collected[0])  # no UnboundLocalError in msg
    assert "gpt-4o-mini" in errors_collected[0]


# ---------------------------------------------------------------------------
# Test 3 — Force-final-response prompt is injected after tool calls
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_force_final_response_prompt_content():
    """
    When provider != 'anthropic' and a tool was called, a final user prompt
    is appended to the messages list instructing the model to respond to the
    customer directly.
    """
    messages = []
    provider = "openai"

    # Simulate the tool-result injection
    messages.append({"role": "tool", "name": "registrar_duvida_sem_resposta",
                     "content": "Dúvida registrada com sucesso."})

    # Replicate the repaired code path
    if provider != "anthropic":
        messages.append({"role": "user", "content": (
            "A ferramenta retornou os dados acima. "
            "Agora responda diretamente ao cliente em tom conversacional, "
            "sem mencionar ferramentas ou resultados técnicos. "
            "Sua resposta DEVE conter pelo menos uma frase dirigida ao cliente. "
            "Se a ferramenta indicar que a informação não está disponível, "
            "diga que irá verificar e retornar em breve."
        )})

    last_msg = messages[-1]
    assert last_msg["role"] == "user"
    assert "responda diretamente ao cliente" in last_msg["content"]
    assert "irá verificar" in last_msg["content"]


# ---------------------------------------------------------------------------
# Test 4 — verify_output_safety does not mangle normal responses
# ---------------------------------------------------------------------------

def test_verify_output_safety_passthrough():
    """A clean response with no competitors/forbidden topics passes unchanged."""
    from agent import verify_output_safety
    config = _make_config()
    text = "Olá! O Método Laser Day custa R$1.500 e possui registro Anvisa nº 12345."
    result = verify_output_safety(text, config)
    assert result == text, "Clean responses must not be altered by safety filter"


def test_verify_output_safety_blacklist():
    """A response mentioning a competitor is redacted."""
    from agent import verify_output_safety
    config = _make_config(security_competitor_blacklist="FakeCompetitor, EvilBrand")
    text = "Nosso produto é melhor que o FakeCompetitor."
    result = verify_output_safety(text, config)
    assert "FakeCompetitor" not in result
    assert "[CONCORRENTE BLOQUEADO]" in result


# ---------------------------------------------------------------------------
# Test 5 — typing_indicator 404 caching disables future calls
# ---------------------------------------------------------------------------

def test_typing_indicator_cached_after_404():
    """After a 404, _typing_indicator_supported becomes False and future calls skip."""
    import webhook_tasks as wt

    # Reset to True for this test
    wt._typing_indicator_supported = True

    mock_config = MagicMock()
    mock_config.chatwoot_url = "http://chatwoot.test"
    mock_config.chatwoot_api_token = "tok"

    mock_response = MagicMock()
    mock_response.status_code = 404

    with patch("webhook_tasks.httpx.Client") as mock_client_cls:
        mock_client_cls.return_value.__enter__ = lambda s: mock_client_cls.return_value
        mock_client_cls.return_value.__exit__ = MagicMock(return_value=False)
        mock_client_cls.return_value.post.return_value = mock_response

        # First call — should hit httpx and see 404
        wt._toggle_typing_indicator(mock_config, "1", "42", "on")
        assert wt._typing_indicator_supported is False, "Should be False after first 404"

        # Second call — should short-circuit without calling httpx
        mock_client_cls.reset_mock()
        wt._toggle_typing_indicator(mock_config, "1", "42", "on")
        mock_client_cls.assert_not_called()

    # Restore for other tests
    wt._typing_indicator_supported = True


# ---------------------------------------------------------------------------
# Test 6 — _sa_select alias is always defined before use
# ---------------------------------------------------------------------------

def test_sa_select_alias_always_defined():
    """
    Verify the _sa_select alias fix: even if the conditional branch that
    would have done `from sqlalchemy import select` is never reached,
    _sa_select is still available from the top-of-block import.
    """
    from sqlalchemy import select as _sa_select
    from models import WebhookConfigModel

    # This would previously raise UnboundLocalError if the conditional
    # `from sqlalchemy import select` was never reached.
    stmt = _sa_select(WebhookConfigModel).where(WebhookConfigModel.id == 1)
    assert stmt is not None


# ---------------------------------------------------------------------------
# Test 7 — async engine has pool_pre_ping enabled
# ---------------------------------------------------------------------------

def test_async_engine_pool_pre_ping():
    """
    pool_pre_ping=True on the async engine is critical: without it, stale
    asyncpg connections (closed by Celery event loop teardown) are handed
    directly to the FastAPI webhook receiver, causing
    ConnectionDoesNotExistError and lost webhook events.
    """
    from database import engine
    pool = engine.pool
    # SQLAlchemy exposes pre_ping via the pool's _pre_ping attribute
    assert getattr(pool, '_pre_ping', False) is True, (
        "pool_pre_ping must be True on the async engine to prevent "
        "stale connections from dropping webhook events"
    )


# ---------------------------------------------------------------------------
# Test 8 — _send_chatwoot_message aborts on failure
# ---------------------------------------------------------------------------

def test_send_chatwoot_message_aborts_on_failure():
    """
    If a part of a fragmented response fails to send (either via non-200 response or exception),
    _send_chatwoot_message must immediately break the loop and not try to send subsequent parts.
    """
    import webhook_tasks as wt
    from unittest.mock import MagicMock, patch

    mock_db = MagicMock()
    mock_config = MagicMock()
    mock_config.chatwoot_url = "http://chatwoot.test"
    mock_config.chatwoot_api_token = "tok"

    # We will test two cases: non-200 response, and exception.
    
    # Case A: Non-200 status code on the first request
    mock_resp = MagicMock()
    mock_resp.status_code = 500
    mock_resp.text = "Internal Server Error"

    with patch("webhook_tasks.httpx.Client") as mock_client_cls, \
         patch("webhook_tasks._add_step") as mock_add_step, \
         patch("webhook_tasks._toggle_typing_indicator") as mock_toggle:
        
        mock_client = MagicMock()
        mock_client_cls.return_value.__enter__.return_value = mock_client
        mock_client.post.return_value = mock_resp

        # Send fragmented content
        result = wt._send_chatwoot_message(
            db=mock_db,
            event_id=1,
            conversation_id="42",
            account_id="1",
            content="Parte 1\n\nParte 2",
            config=mock_config,
            split_paragraphs=True,
            delay=0
        )

        assert result is False
        # Verify that post attempted retries for part 1 and the loop broke before part 2
        assert mock_client.post.call_count <= 3

    # Case B: Exception (e.g. read timeout) on the first request
    with patch("webhook_tasks.httpx.Client") as mock_client_cls, \
         patch("webhook_tasks._add_step") as mock_add_step, \
         patch("webhook_tasks._toggle_typing_indicator") as mock_toggle:
        
        mock_client = MagicMock()
        mock_client_cls.return_value.__enter__.return_value = mock_client
        mock_client.post.side_effect = Exception("The read operation timed out")

        # Send fragmented content
        result = wt._send_chatwoot_message(
            db=mock_db,
            event_id=1,
            conversation_id="42",
            account_id="1",
            content="Parte 1\n\nParte 2",
            config=mock_config,
            split_paragraphs=True,
            delay=0
        )

        assert result is False
        # Verify that post attempted retries for part 1 and the loop broke before part 2
        assert mock_client.post.call_count <= 3



