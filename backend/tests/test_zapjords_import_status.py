import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from models import WebhookConfigModel
from webhooks.import_chat import _IMPORT_STATUS, _update_status, _ACTIVE_IMPORTS


@pytest.mark.asyncio
async def test_get_import_status_empty(client, db_session):
    """Testa que import-status retorna valores padrão seguros quando nenhuma importação ocorreu."""
    config = WebhookConfigModel(
        name="Webhook Status Test",
        token="status-token-1",
        leads_table="leads",
        is_active=True
    )
    db_session.add(config)
    await db_session.commit()
    await db_session.refresh(config)

    _IMPORT_STATUS.pop(config.id, None)
    _ACTIVE_IMPORTS.discard(config.id)

    res = await client.get(f"/webhooks/{config.id}/leads/import-status")
    assert res.status_code == 200
    data = res.json()
    assert data["active"] is False
    assert data["done"] is True
    assert data["percentage"] == 0
    assert "elapsed_seconds" in data
    assert data["elapsed_seconds"] == 0


@pytest.mark.asyncio
async def test_get_import_status_active(client, db_session):
    """Testa que import-status reflete o estado salvo em _IMPORT_STATUS."""
    config = WebhookConfigModel(
        name="Webhook Status Active Test",
        token="status-token-2",
        leads_table="leads",
        is_active=True
    )
    db_session.add(config)
    await db_session.commit()
    await db_session.refresh(config)

    _update_status(
        config.id,
        active=True,
        current=50,
        total=200,
        percentage=25,
        status="Importando conversa 50 de 200 - João Silva...",
        created_leads=30,
        imported_messages=120,
        current_contact="João Silva",
        done=False,
        error=None,
        started_at=1000.0,
        elapsed_seconds=42
    )

    res = await client.get(f"/webhooks/{config.id}/leads/import-status")
    assert res.status_code == 200
    data = res.json()
    assert data["active"] is True
    assert data["current"] == 50
    assert data["total"] == 200
    assert data["percentage"] == 25
    assert data["created_leads"] == 30
    assert data["imported_messages"] == 120
    assert data["current_contact"] == "João Silva"
    assert data["done"] is False
    assert data["elapsed_seconds"] == 42


@pytest.mark.asyncio
async def test_post_import_zapjords_endpoint(client, db_session):
    """Testa inicialização do endpoint import-zapjords."""
    config = WebhookConfigModel(
        name="Webhook Trigger Import Test",
        token="status-token-3",
        leads_table="leads",
        is_active=True,
        zapvoice_url="https://api.zapvoice.com",
        zapvoice_api_token="token-valid"
    )
    db_session.add(config)
    await db_session.commit()
    await db_session.refresh(config)

    with patch("webhooks.import_chat.run_chat_import_task", new=AsyncMock()) as mock_task:
        res = await client.post(f"/webhooks/{config.id}/leads/import-zapjords")
        assert res.status_code == 200
        data = res.json()
        assert data["ok"] is True
        assert data["active"] is True
