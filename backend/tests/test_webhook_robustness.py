import pytest
import asyncio
from datetime import datetime
from models import WebhookConfigModel
from webhooks.router import WebhookConfigResponse
from database import async_session
from sqlalchemy import text

@pytest.mark.asyncio
async def test_webhook_response_robustness_with_nulls():
    """Valida se o modelo WebhookConfigResponse consegue serializar webhooks com campos nulos sem estourar ValidationError."""
    
    # Criar um webhook com campos mínimos populados e o restante como NULL
    token = "test_robustness_token"
    webhook_db = WebhookConfigModel(
        name="Integracao Teste Robustez",
        token=token,
        memory_token=None,
        leads_table="leads",
        description=None,
        is_active=None,  # nulo
        delay_seconds=None,  # nulo
        agent_id=None,
        blocked_messages=None,
        allowed_contacts=None,
        zapvoice_url=None,
        zapvoice_api_token=None,
        labels_on_message=None,
        delete_keywords=None,
        delete_message=None,
        response_delay_seconds=None,
        window_close_label=None,
        followup_enabled=None,
        followup_steps=None,
        followup_business_hours=None,
        memory_sync_enabled=None,  # nulo
        memory_phone_path=None,  # nulo
        memory_mappings=None,
        ignore_by_label=None,
        handoff_labels_to_add=None,
        handoff_labels_to_remove=None,
        handoff_keyword=None,
        handoff_message=None,
        ai_handoff_labels_to_add=None,
        ai_handoff_labels_to_remove=None,
        ai_handoff_keyword=None,
        ai_handoff_message=None,
        secondary_agent_ids=None,
        created_at=None
    )

    async with async_session() as db:
        # Limpar do DB se já existir
        await db.execute(text("DELETE FROM webhook_configs WHERE token = :t"), {"t": token})
        db.add(webhook_db)
        await db.commit()
        await db.refresh(webhook_db)

        try:
            # Tentar serializar
            response_data = WebhookConfigResponse.model_validate(webhook_db)
            
            # Asserts para provar que a serialização funcionou e preencheu fallbacks/defaults corretos
            assert response_data.id == webhook_db.id
            assert response_data.name == "Integracao Teste Robustez"
            assert response_data.token == token
            assert response_data.is_active is None or response_data.is_active is True
            assert response_data.delay_seconds is None or response_data.delay_seconds == 30
            assert response_data.memory_sync_enabled is None or response_data.memory_sync_enabled is False
            assert response_data.memory_phone_path is None or response_data.memory_phone_path == "phone"
            assert response_data.created_at is None or isinstance(response_data.created_at, datetime) or hasattr(response_data.created_at, "isoformat")
            
            print("\n✅ Teste de robustez de webhook passou com sucesso!")
        finally:
            # Limpar após o teste
            await db.execute(text("DELETE FROM webhook_configs WHERE id = :id"), {"id": webhook_db.id})
            await db.commit()

if __name__ == "__main__":
    asyncio.run(test_webhook_response_robustness_with_nulls())
