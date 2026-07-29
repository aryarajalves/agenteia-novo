import os
os.environ["S3_ENDPOINT_URL"] = "http://localhost:9000"
os.environ["S3_ACCESS_KEY"] = "dummy"
os.environ["S3_SECRET_KEY"] = "dummy"
os.environ["S3_BUCKET_NAME"] = "dummy"
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///./test_webhook_detail.db"

import pytest
from fastapi.testclient import TestClient
import json
from models import WebhookConfigModel, WebhookEventModel
from main import app
from database import Base, engine_sync
from sqlalchemy.orm import Session

@pytest.fixture
def client():
    Base.metadata.create_all(bind=engine_sync)
    with TestClient(app) as c:
        yield c
    Base.metadata.drop_all(bind=engine_sync)
    if os.path.exists("./test_webhook_detail.db"):
        try:
            os.remove("./test_webhook_detail.db")
        except Exception:
            pass

def test_get_webhook_event_detail_by_id(client: TestClient):
    with Session(engine_sync) as db:
        config = WebhookConfigModel(
            name="Webhook Teste Event Detail",
            token="test-event-detail-slug-2",
            zapvoice_url="https://api.zapvoice.com",
            zapvoice_api_token="token_test"
        )
        db.add(config)
        db.commit()
        db.refresh(config)

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
        event_id = event.id
        config_id = config.id

    # 1. Testar buscar pelo endpoint com webhook_id
    resp = client.get(f"/webhooks/{config_id}/events/{event_id}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == event_id
    assert data["status"] == "completed"
    assert "processing_steps" in data
    steps_res = json.loads(data["processing_steps"])
    assert len(steps_res) == 3
    assert steps_res[0]["step"] == "📝 Mensagem Recebida"

    # 2. Testar buscar pelo endpoint direto por event_id (/webhooks/events/{event_id})
    resp_direct = client.get(f"/webhooks/events/{event_id}")
    assert resp_direct.status_code == 200
    data_direct = resp_direct.json()
    assert data_direct["id"] == event_id
    assert data_direct["webhook_config_id"] == config_id
    assert data_direct["status"] == "completed"
    assert "processing_steps" in data_direct
    steps_direct = json.loads(data_direct["processing_steps"])
    assert len(steps_direct) == 3
