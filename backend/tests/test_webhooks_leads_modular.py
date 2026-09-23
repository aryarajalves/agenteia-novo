import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi import HTTPException
from webhooks.leads import (
    router as webhook_leads_router,
    full_purge_lead_by_phone,
    list_webhook_lead_ids,
    delete_single_lead,
    delete_leads_batch,
    delete_all_leads,
    sync_all_leads_endpoint,
    get_lead_followup_pipeline,
    get_lead_variables,
    LeadBulkDeleteRequest,
    delete_contact_data,
)
from models import WebhookConfigModel


def test_webhook_leads_router_contains_all_routes():
    """Valida se todas as rotas esperadas estão registradas no router modular de webhooks.leads."""
    paths = set()
    for item in webhook_leads_router.routes:
        if hasattr(item, "path"):
            paths.add(item.path)
        elif hasattr(item, "original_router") and hasattr(item.original_router, "routes"):
            for sub in item.original_router.routes:
                if hasattr(sub, "path"):
                    paths.add(sub.path)

    assert "/{webhook_id}/leads-by-phone/{phone}/full-purge" in paths
    assert "/{webhook_id}/leads/ids" in paths
    assert "/{webhook_id}/leads" in paths
    assert "/{webhook_id}/leads/delete-batch" in paths
    assert "/{webhook_id}/leads/{lead_id}" in paths
    assert "/{webhook_id}/leads/all" in paths
    assert "/{webhook_id}/leads/sync-all" in paths
    assert "/{webhook_id}/leads/{lead_id}/followup-pipeline" in paths
    assert "/{webhook_id}/leads/{lead_id}/variables" in paths


@pytest.mark.asyncio
async def test_full_purge_lead_by_phone_not_found():
    """Valida que full_purge_lead_by_phone levanta 404 se webhook não existir."""
    mock_db = AsyncMock()
    mock_db.get.return_value = None

    with pytest.raises(HTTPException) as exc:
        await full_purge_lead_by_phone(webhook_id=999, phone="5585999999999", db=mock_db)
    assert exc.value.status_code == 404


@pytest.mark.asyncio
async def test_full_purge_lead_by_phone_success():
    """Valida fluxo de sucesso em full_purge_lead_by_phone."""
    mock_db = AsyncMock()
    mock_config = MagicMock(spec=WebhookConfigModel)
    mock_config.id = 1
    mock_config.leads_table = "leads"
    mock_config.zapvoice_url = None
    mock_config.zapvoice_api_token = None
    mock_db.get.return_value = mock_config

    mock_res = MagicMock()
    mock_res.fetchone.return_value = None
    mock_db.execute.return_value = mock_res

    with patch("webhooks.leads.delete_contact_data", new_callable=AsyncMock) as mock_del:
        await full_purge_lead_by_phone(webhook_id=1, phone="5585999999999", db=mock_db)
        assert mock_del.called
        assert mock_db.commit.called


@pytest.mark.asyncio
async def test_list_webhook_lead_ids_success():
    """Valida a listagem simplificada de IDs de leads."""
    mock_db = AsyncMock()
    mock_config = MagicMock(spec=WebhookConfigModel)
    mock_config.id = 1
    mock_config.leads_table = "leads"
    mock_db.get.return_value = mock_config

    mock_db.bind.dialect.name = "postgresql"

    mock_res = MagicMock()
    mock_res.fetchall.return_value = [(10,), (11,), (12,)]
    mock_db.execute.return_value = mock_res

    result = await list_webhook_lead_ids(webhook_id=1, q="joao", db=mock_db)
    assert result["total"] == 3
    assert result["ids"] == [10, 11, 12]
