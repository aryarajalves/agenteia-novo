import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from api.main import app
from fastapi.testclient import TestClient

client = TestClient(app)

@pytest.mark.asyncio
async def test_update_webhook_syncs_funnels_steps():
    """Valida se ao atualizar followup_steps, o funil padrão em followup_funnels é sincronizado automaticamente."""
    from webhooks.configs import update_webhook
    from webhooks.schemas import WebhookConfigUpdate

    mock_db = AsyncMock()
    mock_config = MagicMock()
    mock_config.id = 113
    mock_config.name = "Teste Sync"
    mock_config.token = "token123"
    mock_config.followup_steps = '[{"delay_minutes": 60}]'
    mock_config.followup_funnels = '[{"id": "followup_default", "name": "Padrão / Principal", "is_default": true, "steps": [{"delay_minutes": 60}]}]'

    mock_db.get.return_value = mock_config

    payload = WebhookConfigUpdate(
        followup_steps=[
            {"delay_minutes": 60, "unit": "minutes", "value": 60},
            {"delay_minutes": 1440, "unit": "hours", "value": 24},
            {"delay_minutes": 2880, "unit": "hours", "value": 48}
        ]
    )

    res = await update_webhook(webhook_id=113, payload=payload, db=mock_db)

    assert mock_config.followup_steps is not None
    assert mock_config.followup_funnels is not None
    assert "1440" in str(mock_config.followup_funnels)
    assert "2880" in str(mock_config.followup_funnels)
