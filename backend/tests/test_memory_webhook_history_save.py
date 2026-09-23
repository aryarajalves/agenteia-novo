import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models import WebhookConfigModel, WebhookEventModel
import uuid

@pytest.mark.asyncio
async def test_memory_webhook_saves_agent_template_to_history(client: AsyncClient, db_session: AsyncSession):
    """Valida que mensagens de template e saídas enviadas via webhook de memória são salvas em webhook_events com status completed."""
    token = f"mem-token-{uuid.uuid4().hex[:8]}"
    slug = f"slug-{uuid.uuid4().hex[:8]}"
    webhook = WebhookConfigModel(
        name="Webhook Memória Teste",
        token=slug,
        memory_token=token,
        memory_sync_enabled=True,
        leads_table="leads_test_mem_hist"
    )
    db_session.add(webhook)
    await db_session.commit()
    await db_session.refresh(webhook)

    phone = "5511999998888"
    template_msg = "Você estava a um passo de dominar o que 99% dos homens nunca vão saber... e parou?"

    payload = {
        "phone": phone,
        "name": "Aryaraj Fernandes",
        "dono": "agente",
        "template_content": template_msg
    }

    res = await client.post(f"/webhooks/memory/{token}", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["ok"] is True
    assert "event_id" in data
    assert data["status"] == "agent_memory_saved_to_history"

    # Verifica se o evento foi criado na tabela webhook_events com status completed
    event_stmt = await db_session.execute(
        select(WebhookEventModel).where(WebhookEventModel.id == data["event_id"])
    )
    event = event_stmt.scalar_one_or_none()
    assert event is not None
    assert event.telefone == phone
    assert event.dono == "agente"
    assert event.message_type == "template"
    assert event.status == "completed"
    assert "Modo Silencioso" in event.agent_response
    assert template_msg in event.mensagem
