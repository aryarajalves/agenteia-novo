import pytest
from fastapi.testclient import TestClient
import json
from models import WebhookConfigModel, WebhookEventModel

def test_get_webhook_event_detail_by_id(client: TestClient, db):
    # Criar um webhook config
    config = WebhookConfigModel(
        nome="Webhook Teste Event Detail",
        url_slug="test-event-detail-slug",
        zapvoice_url="https://api.zapvoice.com",
        zapvoice_api_token="token_test"
    )
    db.add(config)
    db.commit()
    db.refresh(config)

    # Criar um evento de webhook com passos do pipeline
    steps = [
        {"step": "📝 Mensagem Recebida", "detail": "Olá", "timestamp": "2026-07-29T10:00:00Z"},
        {"step": "🧠 Pre-Router AI", "detail": "Mensagem normal", "timestamp": "2026-07-29T10:00:01Z"},
        {"step": "🤖 Resposta gerada pela IA", "detail": "Tudo bem?", "timestamp": "2026-07-29T10:00:02Z"}
    ]
    event = WebhookEventModel(
        webhook_config_id=config.id,
        status="completed",
        mensagem="Olá",
        agent_response="Tudo bem?",
        processing_steps=json.dumps(steps)
    )
    db.add(event)
    db.commit()
    db.refresh(event)

    # 1. Testar buscar pelo endpoint com webhook_id
    resp = client.get(f"/webhooks/{config.id}/events/{event.id}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == event.id
    assert data["status"] == "completed"
    assert "processing_steps" in data
    steps_res = json.loads(data["processing_steps"])
    assert len(steps_res) == 3
    assert steps_res[0]["step"] == "📝 Mensagem Recebida"

    # 2. Testar buscar pelo endpoint direto por event_id (/webhooks/events/{event_id})
    resp_direct = client.get(f"/webhooks/events/{event.id}")
    assert resp_direct.status_code == 200
    data_direct = resp_direct.json()
    assert data_direct["id"] == event.id
    assert data_direct["webhook_config_id"] == config.id
    assert data_direct["status"] == "completed"
    assert "processing_steps" in data_direct
    steps_direct = json.loads(data_direct["processing_steps"])
    assert len(steps_direct) == 3
