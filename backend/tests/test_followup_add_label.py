import pytest
from unittest.mock import patch, AsyncMock, MagicMock
from models import WebhookConfigModel

def test_webhook_config_model_has_followup_add_label():
    """Valida que o modelo WebhookConfigModel possui o campo followup_add_label."""
    config = WebhookConfigModel(
        name="Teste Webhook",
        token="token_test_123",
        followup_add_label="followup-enviado"
    )
    assert config.followup_add_label == "followup-enviado"

@pytest.mark.asyncio
async def test_followup_add_label_task_sync():
    """Valida que o utilitário de sincronização de etiquetas do ZapVoice aceita a nova etiqueta."""
    with patch("zapvoice_utils.sync_conversation_labels", new_callable=AsyncMock) as mock_sync:
        mock_sync.return_value = (True, ["followup-enviado"])
        from zapvoice_utils import sync_conversation_labels
        
        success, labels = await sync_conversation_labels(
            zapvoice_url="http://localhost:8000",
            client_id="1",
            conversation_id=1083,
            token="token123",
            to_add=["followup-enviado"]
        )
        
        assert success is True
        assert "followup-enviado" in labels
        mock_sync.assert_called_once()
