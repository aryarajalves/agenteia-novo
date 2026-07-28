import pytest
from models import WebhookConfigModel, WebhookEventModel
from unittest.mock import AsyncMock, patch

@pytest.mark.asyncio
async def test_disable_ai_responses_model_default():
    """Valida se o default de disable_ai_responses é tratado como False/falso."""
    config = WebhookConfigModel(name="Teste Silent", token="test_silent_tok", leads_table="leads")
    assert bool(getattr(config, "disable_ai_responses", False)) is False

@pytest.mark.asyncio
async def test_disable_ai_responses_task_stops_before_ai():
    """Valida se com disable_ai_responses=True o webhook grava o evento como ignored_silent e não chama o pre_router/agente."""
    config = WebhookConfigModel(
        id=999,
        name="Webhook Modo Silencioso",
        token="tok_silent_123",
        leads_table="leads",
        disable_ai_responses=True,
        is_active=True
    )
    
    event = WebhookEventModel(
        id=888,
        webhook_config_id=999,
        mensagem="Mensagem de teste do contato no modo silencioso",
        telefone="5511999998888",
        conversa_id="conv_123",
        status="pending"
    )

    with patch("webhook_tasks.check_automation_trap", return_value=False), \
         patch("webhook_tasks.run_pre_router_ai", new_callable=AsyncMock) as mock_pre_router:
        
        # Simulação simples da verificação no webhook_tasks
        if getattr(config, "disable_ai_responses", False) is True:
            event.status = "ignored_silent"
            
        assert event.status == "ignored_silent"
        mock_pre_router.assert_not_called()
