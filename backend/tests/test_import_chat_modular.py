import pytest
from datetime import datetime, timezone
import webhooks.import_chat as import_chat
from webhooks.import_chat_modules.helpers import (
    resolve_fast_zapvoice_url,
    to_naive_datetime,
    to_aware_utc,
    is_system_or_badge_message,
)
from webhooks.import_chat_modules.state import (
    _update_status,
    _IMPORT_STATUS,
    _ACTIVE_IMPORTS,
    _CANCEL_REQUESTS,
)
from webhooks.import_chat_modules.processor import process_single_conversation


def test_reexports_and_completeness():
    """Verifica se o barrel import_chat exporta todas as funções e estruturas esperadas."""
    expected_attrs = [
        "router",
        "_ACTIVE_IMPORTS",
        "_CANCEL_REQUESTS",
        "_RUNNING_TASKS",
        "_IMPORT_STATUS",
        "_update_status",
        "resolve_fast_zapvoice_url",
        "to_naive_datetime",
        "to_aware_utc",
        "is_system_or_badge_message",
        "process_single_conversation",
        "run_chat_import_task",
        "import_chat_from_zapjords",
        "get_chat_import_status",
        "cancel_chat_import",
        "async_session",
        "manager",
        "ensure_leads_table",
        "httpx",
    ]
    for attr in expected_attrs:
        assert hasattr(import_chat, attr), f"webhooks.import_chat não exporta {attr}"


def test_resolve_fast_zapvoice_url():
    """Valida conversão para URL interna do Docker quando aplicável."""
    assert "zapvoice_app" in resolve_fast_zapvoice_url("https://api.aryaraj.shop")
    assert "zapvoice_app" in resolve_fast_zapvoice_url("http://localhost:8000")
    assert "zapvoice_app" in resolve_fast_zapvoice_url("http://127.0.0.1:8000")

    # URL externa real permanece inalterada
    assert resolve_fast_zapvoice_url("https://external-api.com") == "https://external-api.com"
    assert resolve_fast_zapvoice_url("") == ""


def test_to_naive_datetime():
    """Valida conversão de datas para UTC naive."""
    assert to_naive_datetime(None) is None

    # String ISO com timezone Z
    dt = to_naive_datetime("2026-09-18T10:00:00Z")
    assert dt.tzinfo is None
    assert dt.year == 2026

    # Datetime com timezone aware
    dt_aware = datetime.now(timezone.utc)
    dt_naive = to_naive_datetime(dt_aware)
    assert dt_naive.tzinfo is None


def test_to_aware_utc():
    """Valida conversão de datas para UTC aware."""
    dt_none = to_aware_utc(None)
    assert dt_none.tzinfo == timezone.utc

    dt_str = to_aware_utc("2026-09-18T10:00:00")
    assert dt_str.tzinfo is not None


def test_is_system_or_badge_message():
    """Valida regras de negócio de identificação de badges e templates."""
    # Templates do WhatsApp NUNCA são considerados badges
    assert is_system_or_badge_message({"message_type": "template", "content": "Olá!"}) is False
    assert is_system_or_badge_message({"content": "[Template: Boas-vindas]"}) is False
    assert is_system_or_badge_message({"meta_data": {"is_template": True}}) is False

    # Mensagens normais de lead ou atendente
    assert is_system_or_badge_message({"content": "Gostaria de saber o valor do curso", "sender_type": "contact"}) is False
    assert is_system_or_badge_message({"content": "Nosso curso custa R$ 197", "sender_type": "agent"}) is False

    # Badges do sistema
    assert is_system_or_badge_message({"sender_type": "system"}) is True
    assert is_system_or_badge_message({"message_type": "funnel_event"}) is True
    assert is_system_or_badge_message({"content": "Marcador(es) adicionado(s): aluno"}) is True
    assert is_system_or_badge_message({"content": "O atendente Super Admin adicionou marcador"}) is True
    assert is_system_or_badge_message({"content": "🚀 Funil iniciado para o contato"}) is True

    # Mensagem vazia sem mídia
    assert is_system_or_badge_message({"content": ""}) is True


def test_state_update_status():
    """Valida atualização de status em memória."""
    webhook_id = 9999
    st = _update_status(webhook_id, current=5, total=10, percentage=50, status="Processando...")
    assert st["current"] == 5
    assert st["total"] == 10
    assert st["percentage"] == 50
    assert st["status"] == "Processando..."

    # Atualização subsequente preserva campos anteriores
    st2 = _update_status(webhook_id, current=6, percentage=60)
    assert st2["current"] == 6
    assert st2["total"] == 10
    assert st2["percentage"] == 60


@pytest.mark.asyncio
async def test_process_single_conversation_empty():
    """Valida retorno rápido quando conversa não possui ID."""
    res = await process_single_conversation(
        conv={},
        http_client=None,
        webhook_id=1,
        zv_url="http://test",
        headers={},
        zv_client_id="",
        leads_table="leads",
        sem=None,
        is_cancelled_fn=lambda: False
    )
    assert res == (0, 0, "")
