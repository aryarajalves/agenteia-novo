import pytest
import json
from unittest.mock import AsyncMock, patch, MagicMock
from fastapi.testclient import TestClient
from api.main import app
from api.deps import get_db, verify_api_key
from models import AgentConfigModel, QuestionFunnelModel

@pytest.fixture
def mock_db():
    session = AsyncMock()
    return session

@pytest.fixture
def client(mock_db):
    app.dependency_overrides[get_db] = lambda: mock_db
    app.dependency_overrides[verify_api_key] = lambda: True
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()

@pytest.mark.asyncio
async def test_list_question_funnels(client, mock_db):
    mock_funnel = MagicMock()
    mock_funnel.id = 1
    mock_funnel.agent_id = 10
    mock_funnel.name = "Como Funciona o Curso"
    mock_funnel.trigger_question = "como funciona o curso de vocês?"
    mock_funnel.trigger_variations = ["como é o curso?", "me explica sobre o curso"]
    mock_funnel.similarity_threshold = 0.82
    mock_funnel.frequency_mode = "once_per_lead"
    mock_funnel.is_active = True
    mock_funnel.steps = [
        {"step_number": 1, "type": "audio", "media_url": "https://s3.com/audio.mp3", "delay_seconds": 0, "transcription": "O curso é 100% online..."},
        {"step_number": 2, "type": "text", "content": "Ficou com alguma dúvida?", "delay_seconds": 3}
    ]
    mock_funnel.total_executions = 5
    mock_funnel.embedding = [0.1] * 1536
    mock_funnel.created_at = None
    mock_funnel.updated_at = None

    mock_res = MagicMock()
    mock_res.scalars.return_value.all.return_value = [mock_funnel]
    mock_db.execute.return_value = mock_res

    response = client.get("/agents/10/question-funnels")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["name"] == "Como Funciona o Curso"
    assert len(data[0]["steps"]) == 2
    assert data[0]["frequency_mode"] == "once_per_lead"

@pytest.mark.asyncio
async def test_list_question_funnels_paginated(client, mock_db):
    mock_funnel = MagicMock()
    mock_funnel.id = 1
    mock_funnel.agent_id = 10
    mock_funnel.name = "Como Funciona o Curso"
    mock_funnel.trigger_question = "como funciona o curso de vocês?"
    mock_funnel.trigger_variations = ["como é o curso?"]
    mock_funnel.similarity_threshold = 0.82
    mock_funnel.frequency_mode = "once_per_lead"
    mock_funnel.is_active = True
    mock_funnel.steps = []
    mock_funnel.total_executions = 5
    mock_funnel.embedding = [0.1] * 1536
    mock_funnel.created_at = None
    mock_funnel.updated_at = None

    mock_res_count = MagicMock()
    mock_res_count.scalar.return_value = 25

    mock_res_active = MagicMock()
    mock_res_active.scalar.return_value = 20

    mock_res_items = MagicMock()
    mock_res_items.scalars.return_value.all.return_value = [mock_funnel]

    mock_db.execute.side_effect = [mock_res_count, mock_res_active, mock_res_items]

    response = client.get("/agents/10/question-funnels?page=1&page_size=20&search=curso")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, dict)
    assert data["total"] == 25
    assert data["page"] == 1
    assert data["page_size"] == 20
    assert data["total_pages"] == 2
    assert data["active_count"] == 20
    assert len(data["items"]) == 1
    assert data["items"][0]["name"] == "Como Funciona o Curso"

@pytest.mark.asyncio
async def test_create_question_funnel(client, mock_db):
    mock_agent = MagicMock()
    mock_agent.id = 10
    mock_db.get.return_value = mock_agent

    with patch("api.routers.question_funnels.get_embedding", new_callable=AsyncMock) as mock_emb:
        mock_emb.return_value = ([0.05] * 1536, 10)

        payload = {
            "name": "Como Funciona o Curso",
            "trigger_question": "como funciona o curso?",
            "trigger_variations": ["me explica as aulas"],
            "similarity_threshold": 0.85,
            "frequency_mode": "once_per_lead",
            "is_active": True,
            "steps": [
                {"step_number": 1, "type": "audio", "media_url": "https://s3.com/audio.mp3", "transcription": "Curso vitalício"},
                {"step_number": 2, "type": "text", "content": "Alguma dúvida?", "delay_seconds": 2}
            ]
        }

        response = client.post("/agents/10/question-funnels", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Como Funciona o Curso"
        assert data["similarity_threshold"] == 0.85
        assert len(data["steps"]) == 2
        assert mock_db.add.called
        assert mock_db.commit.called

@pytest.mark.asyncio
async def test_delete_question_funnel(client, mock_db):
    mock_funnel = MagicMock()
    mock_funnel.id = 42
    mock_db.get.return_value = mock_funnel

    response = client.delete("/question-funnels/42")
    assert response.status_code == 200
    assert response.json()["id"] == 42
    assert mock_db.delete.called
    assert mock_db.commit.called


def test_normalize_funnel_steps_media_urls():
    from api.routers.question_funnels import normalize_funnel_steps_media_urls
    raw_steps = [
        {
            "step_number": 1,
            "type": "audio",
            "media_url": "http://minio:9000/zap-voice/funnel-media/funnel_b065c649.ogg?token=123"
        },
        {
            "step_number": 2,
            "type": "audio",
            "media_url": "/uploads/test.mp3"
        },
        {
            "step_number": 3,
            "type": "text",
            "content": "Olá!"
        }
    ]
    normalized = normalize_funnel_steps_media_urls(raw_steps, "http://localhost:8002")
    assert normalized[0]["media_url"] == "http://localhost:8002/api/question-funnels/media/funnel_b065c649.ogg"
    assert normalized[1]["media_url"] == "http://localhost:8002/uploads/test.mp3"
    assert normalized[2]["content"] == "Olá!"


def test_get_funnel_media_file_local(client, tmp_path):
    import os
    os.makedirs("tmp_uploads", exist_ok=True)
    test_file = os.path.join("tmp_uploads", "test_audio_sample.ogg")
    with open(test_file, "wb") as f:
        f.write(b"OggS mock audio content")

    try:
        response = client.get("/question-funnels/media/test_audio_sample.ogg")
        assert response.status_code == 200
        assert "audio/ogg" in response.headers["content-type"]
        assert response.headers.get("accept-ranges") == "bytes"
        assert response.content == b"OggS mock audio content"
    finally:
        if os.path.exists(test_file):
            os.remove(test_file)


def test_get_funnel_media_file_not_found(client):
    response = client.get("/question-funnels/media/non_existent_media_xyz.ogg")
    assert response.status_code == 404

