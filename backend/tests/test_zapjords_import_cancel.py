import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from models import WebhookConfigModel
from webhooks.import_chat import (
    _IMPORT_STATUS,
    _update_status,
    _ACTIVE_IMPORTS,
    _CANCEL_REQUESTS,
    _RUNNING_TASKS
)


@pytest.mark.asyncio
async def test_cancel_import_when_not_active(client, db_session):
    """Testa que cancelar importação quando não há nenhuma ativa retorna ok=False seguro."""
    config = WebhookConfigModel(
        name="Webhook Cancel Test 1",
        token="cancel-token-1",
        leads_table="leads",
        is_active=True
    )
    db_session.add(config)
    await db_session.commit()
    await db_session.refresh(config)

    _ACTIVE_IMPORTS.discard(config.id)
    _CANCEL_REQUESTS.discard(config.id)

    res = await client.post(f"/webhooks/{config.id}/leads/cancel-import")
    assert res.status_code == 200
    data = res.json()
    assert data["ok"] is False
    assert "Nenhuma importação ativa" in data["message"]


@pytest.mark.asyncio
async def test_cancel_import_when_active(client, db_session):
    """Testa cancelamento com importação ativa: adiciona à fila de cancelamento e atualiza status."""
    config = WebhookConfigModel(
        name="Webhook Cancel Test 2",
        token="cancel-token-2",
        leads_table="leads",
        is_active=True
    )
    db_session.add(config)
    await db_session.commit()
    await db_session.refresh(config)

    _ACTIVE_IMPORTS.add(config.id)
    _update_status(
        config.id,
        active=True,
        current=10,
        total=100,
        percentage=10,
        status="Importando...",
        done=False,
        cancelled=False
    )

    mock_task = MagicMock()
    mock_task.done.return_value = False
    _RUNNING_TASKS[config.id] = mock_task

    with patch("core.websocket.manager.broadcast", new=AsyncMock()) as mock_broadcast:
        res = await client.post(f"/webhooks/{config.id}/leads/cancel-import")
        assert res.status_code == 200
        data = res.json()
        assert data["ok"] is True
        assert "Importação cancelada" in data["message"]

        # Verifica que o cancelamento foi registrado
        assert config.id in _CANCEL_REQUESTS
        mock_task.cancel.assert_called_once()
        status = _IMPORT_STATUS[config.id]
        assert status["active"] is False
        assert status["cancelled"] is True
        assert status["done"] is True
        assert "cancelada pelo usuário" in status["status"]

        # Broadcast emitido
        mock_broadcast.assert_called()
