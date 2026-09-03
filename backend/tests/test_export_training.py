import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from datetime import datetime, timezone
from httpx import AsyncClient, ASGITransport
from api.main import app
from api.deps import get_db, verify_api_key
from models import InteractionLog, AgentConfigModel

@pytest.mark.asyncio
async def test_export_session_for_training_success():
    """Valida o endpoint GET /sessions/{session_id}/export-training retornando o dataset estruturado."""
    mock_log1 = InteractionLog(
        id=1,
        session_id="test-session-123",
        agent_id=10,
        user_message="Como funciona o curso?",
        agent_response="O curso é 100% online com acesso vitalício.",
        model_used="gpt-4o",
        input_tokens=50,
        output_tokens=30,
        cost_brl=0.05,
        timestamp=datetime(2026, 9, 1, 10, 0, 0, tzinfo=timezone.utc)
    )
    mock_log2 = InteractionLog(
        id=2,
        session_id="test-session-123",
        agent_id=10,
        user_message="Tem certificado?",
        agent_response="Sim, certificado reconhecido incluso.",
        model_used="gpt-4o",
        input_tokens=60,
        output_tokens=25,
        cost_brl=0.04,
        timestamp=datetime(2026, 9, 1, 10, 1, 0, tzinfo=timezone.utc)
    )
    mock_agent = AgentConfigModel(
        id=10,
        name="Agente - Tarcira",
        system_prompt="Você é a assistente virtual oficial da Tarcira."
    )

    async def override_get_db():
        mock_session = MagicMock()
        mock_session.execute = AsyncMock()

        # Primeiro execute: busca logs
        mock_result_logs = MagicMock()
        mock_result_logs.scalars.return_value.all.return_value = [mock_log1, mock_log2]

        # Segundo execute: busca agente
        mock_result_agent = MagicMock()
        mock_result_agent.scalars.return_value.first.return_value = mock_agent

        mock_session.execute.side_effect = [mock_result_logs, mock_result_agent]
        yield mock_session

    async def override_verify_api_key():
        return None

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[verify_api_key] = override_verify_api_key

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get("/sessions/test-session-123/export-training")

    app.dependency_overrides.clear()

    assert response.status_code == 200
    data = response.json()

    assert "export_info" in data
    assert data["export_info"]["agent_id"] == 10
    assert data["export_info"]["agent_name"] == "Agente - Tarcira"
    assert data["export_info"]["session_id"] == "test-session-123"
    assert data["export_info"]["total_messages"] == 4
    assert data["export_info"]["total_pairs"] == 2

    # OpenAI format
    assert "openai_fine_tuning" in data
    openai_msgs = data["openai_fine_tuning"]["messages"]
    assert len(openai_msgs) == 5  # 1 system + 2 user + 2 assistant
    assert openai_msgs[0]["role"] == "system"
    assert openai_msgs[1]["role"] == "user"
    assert openai_msgs[1]["content"] == "Como funciona o curso?"
    assert openai_msgs[2]["role"] == "assistant"

    # Alpaca format
    assert "alpaca_instruction_dataset" in data
    alpaca_pairs = data["alpaca_instruction_dataset"]
    assert len(alpaca_pairs) == 2
    assert alpaca_pairs[0]["instruction"] == "Como funciona o curso?"
    assert alpaca_pairs[0]["output"] == "O curso é 100% online com acesso vitalício."

@pytest.mark.asyncio
async def test_export_session_for_training_not_found():
    """Valida retorno 404 quando a sessão não existe."""
    async def override_get_db():
        mock_session = MagicMock()
        mock_result_logs = MagicMock()
        mock_result_logs.scalars.return_value.all.return_value = []
        mock_session.execute = AsyncMock(return_value=mock_result_logs)
        yield mock_session

    async def override_verify_api_key():
        return None

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[verify_api_key] = override_verify_api_key

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get("/sessions/inexistent-session/export-training")

    app.dependency_overrides.clear()

    assert response.status_code == 404
