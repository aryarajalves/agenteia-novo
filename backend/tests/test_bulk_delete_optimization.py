import pytest
import asyncio
from unittest.mock import AsyncMock, MagicMock, patch
from zapvoice_utils import bulk_reset_conversation_labels


@pytest.mark.asyncio
async def test_bulk_reset_conversation_labels_empty():
    """Testa se bulk_reset_conversation_labels lida graciosamente com listas vazias ou sem token/url."""
    res = await bulk_reset_conversation_labels("", "1", [(10, "1")], "token")
    assert res == {"total": 0, "success": 0, "failed": 0}

    res = await bulk_reset_conversation_labels("https://api.zapvoice.com", "1", [], "token")
    assert res == {"total": 0, "success": 0, "failed": 0}

    res = await bulk_reset_conversation_labels("https://api.zapvoice.com", "1", [(10, "1")], "")
    assert res == {"total": 0, "success": 0, "failed": 0}


@pytest.mark.asyncio
async def test_bulk_reset_conversation_labels_deduplication_and_concurrency():
    """Testa se IDs duplicados são deduplicados e se as requisições concorrentes são feitas com sucesso."""
    calls = []

    mock_resp = MagicMock()
    mock_resp.status_code = 200

    async def mock_post(url, json=None, headers=None):
        calls.append({"url": url, "json": json, "headers": headers})
        await asyncio.sleep(0.01)
        return mock_resp

    mock_client = AsyncMock()
    mock_client.post = AsyncMock(side_effect=mock_post)
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)

    conv_info_list = [
        ("101", "acc1"),
        ("102", "acc1"),
        ("101", "acc1"),  # duplicado
        ("103", None),
    ]

    with patch("httpx.AsyncClient", return_value=mock_client):
        res = await bulk_reset_conversation_labels(
            zapvoice_url="https://api.zapvoice.com",
            default_client_id="default_acc",
            conv_info_list=conv_info_list,
            token="secret_token",
            labels=["robo"],
            concurrency=5
        )

    assert res["total"] == 3
    assert res["success"] == 3
    assert res["failed"] == 0
    assert len(calls) == 3

    # Verificar se as chamadas foram formatadas corretamente
    urls = [c["url"] for c in calls]
    assert "https://api.zapvoice.com/api/chat/conversations/101/labels" in urls
    assert "https://api.zapvoice.com/api/chat/conversations/102/labels" in urls
    assert "https://api.zapvoice.com/api/chat/conversations/103/labels" in urls

    for c in calls:
        assert c["json"] == {"labels": ["robo"]}
        assert c["headers"]["Authorization"] == "Bearer secret_token"

    # Conversa 103 deve usar o default_client_id
    call_103 = [c for c in calls if "103" in c["url"]][0]
    assert call_103["headers"]["X-Client-ID"] == "default_acc"


@pytest.mark.asyncio
async def test_bulk_reset_conversation_labels_handles_errors():
    """Testa se erros individuais em requisições HTTP são contabilizados sem interromper os demais."""
    async def mock_post(url, json=None, headers=None):
        if "fail" in url:
            mock_fail = MagicMock()
            mock_fail.status_code = 500
            return mock_fail
        elif "exc" in url:
            raise Exception("Network error")
        mock_ok = MagicMock()
        mock_ok.status_code = 200
        return mock_ok

    mock_client = AsyncMock()
    mock_client.post = AsyncMock(side_effect=mock_post)
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)

    conv_list = [
        ("success1", "1"),
        ("fail1", "1"),
        ("exc1", "1"),
        ("success2", "1"),
    ]

    with patch("httpx.AsyncClient", return_value=mock_client):
        res = await bulk_reset_conversation_labels(
            zapvoice_url="https://api.zapvoice.com",
            default_client_id="1",
            conv_info_list=conv_list,
            token="token",
            concurrency=2
        )

    assert res["total"] == 4
    assert res["success"] == 2
    assert res["failed"] == 2


@pytest.mark.asyncio
async def test_delete_leads_batch_dispatches_bulk_reset(client, db_session, monkeypatch):
    """Testa que o endpoint delete_leads_batch agenda o reset em lote via create_task e responde 204 de imediato."""
    from models import WebhookConfigModel
    from sqlalchemy import text

    config = WebhookConfigModel(
        name="Webhook Bulk Delete Test",
        token="bulk-del-token",
        leads_table="leads",
        is_active=True,
        zapvoice_url="https://api.zapvoice.com",
        zapvoice_api_token="zv-token-123",
        zapvoice_client_id="client_abc"
    )
    db_session.add(config)
    await db_session.commit()
    await db_session.refresh(config)

    # Inserir leads fictícios no sqlite para simular a busca de conversa_id
    try:
        await db_session.execute(text(
            f"CREATE TABLE IF NOT EXISTS leads (id INTEGER PRIMARY KEY, telefone TEXT, conversa_id TEXT, conta_id TEXT, webhook_config_id INTEGER)"
        ))
        await db_session.execute(text(
            f"INSERT INTO leads (id, telefone, conversa_id, conta_id, webhook_config_id) VALUES (901, '5511999990001', 'conv_1', 'acc_1', :wid), (902, '5511999990002', 'conv_2', 'acc_1', :wid)"
        ), {"wid": config.id})
        await db_session.commit()
    except Exception:
        pass

    dispatched = []

    async def mock_bulk_reset(**kwargs):
        dispatched.append(kwargs)
        return {"total": 2, "success": 2, "failed": 0}

    with patch("webhooks.leads.delete_contact_data", new=AsyncMock()), \
         patch("zapvoice_utils.bulk_reset_conversation_labels", side_effect=mock_bulk_reset) as mock_b_reset:
        
        response = await client.post(
            f"/webhooks/{config.id}/leads/delete-batch",
            json={"lead_ids": [901, 902]}
        )

        assert response.status_code == 204
        # Deixar o loop rodar as tasks agendadas
        await asyncio.sleep(0.05)
        assert mock_b_reset.called

