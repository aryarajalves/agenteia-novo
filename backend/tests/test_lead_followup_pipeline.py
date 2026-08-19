import pytest
import json
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi.testclient import TestClient
from main import app
from webhooks.router import get_db

@pytest.fixture
def mock_db_session():
    session = AsyncMock()
    return session

@pytest.fixture
def client(mock_db_session):
    app.dependency_overrides[get_db] = lambda: mock_db_session
    yield TestClient(app)
    app.dependency_overrides.clear()

def test_get_lead_followup_pipeline_success(client, mock_db_session):
    # Mock do WebhookConfig
    mock_config = MagicMock()
    mock_config.id = 1
    mock_config.name = "WhatsApp Vendas"
    mock_config.leads_table = "leads"
    mock_config.followup_enabled = True
    mock_config.followup_steps = json.dumps([
        {"delay_minutes": 5, "type": "ai", "custom_prompt": "Retome a conversa"},
        {"delay_minutes": 60, "type": "fixed", "fixed_message": "Ainda tem interesse?"}
    ])
    mock_config.followup_business_hours = json.dumps({"enabled": True, "start": "08:00", "end": "18:00"})
    mock_config.ignore_by_label = "humano"
    mock_config.followup_cancel_label = "compra-aprovada"
    mock_config.followup_required_label = None

    mock_db_session.get.return_value = mock_config

    # Mock do Lead
    lead_row = (10, 1, "Aryaraj", "5585996123586", "2026-08-15 10:00:00", 0, "[]", True)
    lead_keys = ["id", "webhook_config_id", "contato_nome", "telefone", "ultima_mensagem_em", "followup_step", "labels", "pode_enviar_mensagem"]

    lead_res_mock = MagicMock()
    lead_res_mock.fetchone.return_value = lead_row
    lead_res_mock.keys.return_value = lead_keys

    # Mock de Eventos executados
    events_res_mock = MagicMock()
    events_res_mock.fetchall.return_value = []
    events_res_mock.keys.return_value = ["id", "event_type", "message_type", "mensagem", "agent_response", "status", "created_at", "scheduled_at", "processing_steps", "dono"]

    mock_db_session.execute.side_effect = [lead_res_mock, events_res_mock]

    response = client.get("/webhooks/1/leads/10/followup-pipeline", headers={"X-API-Key": "test"})
    assert response.status_code == 200
    data = response.json()

    assert data["lead"]["id"] == 10
    assert data["lead"]["telefone"] == "5585996123586"
    assert data["webhook"]["name"] == "WhatsApp Vendas"
    assert len(data["steps"]) == 2
    assert data["steps"][0]["delay_minutes"] == 5
    assert data["steps"][0]["status"] == "active"
    assert data["steps"][1]["status"] == "pending"
    assert data["overall_status"] == "active"

def test_get_lead_followup_pipeline_not_found(client, mock_db_session):
    mock_db_session.get.return_value = None
    response = client.get("/webhooks/999/leads/10/followup-pipeline", headers={"X-API-Key": "test"})
    assert response.status_code == 404
