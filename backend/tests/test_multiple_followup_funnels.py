import pytest
import json
from unittest.mock import AsyncMock, MagicMock
from fastapi.testclient import TestClient
from main import app
from webhooks.router import get_db
from api.deps import verify_api_key

@pytest.fixture
def mock_db_session():
    session = AsyncMock()
    return session

@pytest.fixture
def client(mock_db_session):
    app.dependency_overrides[get_db] = lambda: mock_db_session
    app.dependency_overrides[verify_api_key] = lambda: None
    yield TestClient(app)
    app.dependency_overrides.clear()

def test_assign_followup_endpoint_success(client, mock_db_session):
    # Mock de execução do banco
    mock_res_update = MagicMock()
    mock_res_update.rowcount = 1

    mock_res_existing = MagicMock()
    mock_res_existing.fetchall.return_value = [("5511999999999",)]

    mock_db_session.execute.side_effect = [mock_res_update, mock_res_existing]

    payload = {
        "phones": ["+55 11 99999-9999"],
        "followup_id": "mentoria_high_ticket"
    }

    response = client.post("/leads/assign-followup", json=payload, headers={"X-API-Key": "test"})
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["followup_id"] == "mentoria_high_ticket"
    assert data["phones_received"] == 1

def test_assign_funnel_with_followup_id(client, mock_db_session):
    mock_res_update = MagicMock()
    mock_res_update.rowcount = 1

    mock_res_existing = MagicMock()
    mock_res_existing.fetchall.return_value = [("5511888888888",)]

    mock_db_session.execute.side_effect = [mock_res_update, mock_res_existing]

    payload = {
        "phones": ["5511888888888"],
        "funnel_id": "qualif_mentoria",
        "followup_id": "mentoria_high_ticket"
    }

    response = client.post("/leads/assign-funnel", json=payload, headers={"X-API-Key": "test"})
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["funnel_id"] == "qualif_mentoria"
    assert data["followup_id"] == "mentoria_high_ticket"

def test_get_lead_followup_pipeline_with_specific_funnel(client, mock_db_session):
    mock_config = MagicMock()
    mock_config.id = 1
    mock_config.name = "WhatsApp ZapJords"
    mock_config.leads_table = "leads"
    mock_config.followup_enabled = True
    mock_config.followup_funnels = json.dumps([
        {
            "id": "followup_default",
            "name": "Padrão / Principal",
            "is_default": True,
            "steps": [{"delay_minutes": 10, "type": "ai", "custom_prompt": "Step 1 Default"}]
        },
        {
            "id": "mentoria",
            "name": "Mentoria Exclusiva",
            "is_default": False,
            "steps": [
                {"delay_minutes": 15, "type": "ai", "custom_prompt": "Step 1 Mentoria"},
                {"delay_minutes": 120, "type": "fixed", "fixed_message": "Step 2 Mentoria"}
            ]
        }
    ])
    mock_config.followup_business_hours = None
    mock_config.ignore_by_label = "humano"
    mock_config.followup_cancel_label = "comprou"
    mock_config.followup_required_label = None

    mock_db_session.get.return_value = mock_config

    lead_row = (15, 1, "Aryaraj Cliente", "5511977777777", "2026-09-05 10:00:00", 0, "mentoria", "[]", True)
    lead_keys = ["id", "webhook_config_id", "contato_nome", "telefone", "ultima_mensagem_em", "followup_step", "active_followup_funnel_id", "labels", "pode_enviar_mensagem"]

    lead_res_mock = MagicMock()
    lead_res_mock.fetchone.return_value = lead_row
    lead_res_mock.keys.return_value = lead_keys

    events_res_mock = MagicMock()
    events_res_mock.fetchall.return_value = []
    events_res_mock.keys.return_value = ["id", "event_type", "message_type", "mensagem", "agent_response", "status", "created_at", "scheduled_at", "processing_steps", "dono"]

    mock_db_session.execute.side_effect = [lead_res_mock, events_res_mock]

    response = client.get("/webhooks/1/leads/15/followup-pipeline", headers={"X-API-Key": "test"})
    assert response.status_code == 200
    data = response.json()

    assert data["active_funnel"]["id"] == "mentoria"
    assert data["active_funnel"]["name"] == "Mentoria Exclusiva"
    assert len(data["steps"]) == 2
    assert data["steps"][0]["delay_minutes"] == 15
    assert data["steps"][1]["delay_minutes"] == 120
