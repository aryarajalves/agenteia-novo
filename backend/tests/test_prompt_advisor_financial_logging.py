import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from prompt_lab import log_advisor_interaction

@pytest.mark.asyncio
async def test_log_advisor_interaction_success():
    """Valida se o registro de custo financeiro do advisor cria um InteractionLog com valores corretos."""
    mock_db = AsyncMock()
    
    with patch("database.SessionLocal") as mock_session_local, \
         patch("api.services.cost_service.calculate_ai_cost", return_value=(0.01, 0.06)):
        
        mock_session_local.return_value.__aenter__.return_value = mock_db
        
        await log_advisor_interaction(
            agent_id=1,
            user_message="Como melhorar meu prompt?",
            agent_response="Sugiro alterar a linha 10",
            model_used="gpt-5.2",
            input_tokens=1500,
            output_tokens=500,
            origin="Assistente de Prompt"
        )
        
        assert mock_db.add.called
        log_instance = mock_db.add.call_args[0][0]
        
        assert log_instance.agent_id == 1
        assert log_instance.session_id == "advisor_1"
        assert log_instance.user_message == "Como melhorar meu prompt?"
        assert log_instance.agent_response == "Sugiro alterar a linha 10"
        assert "gpt-5.2" in log_instance.model_used
        assert log_instance.input_tokens == 1500
        assert log_instance.output_tokens == 500
        assert log_instance.cost_brl == 0.06
        assert log_instance.cost_usd == 0.01
        assert mock_db.commit.called

@pytest.mark.asyncio
async def test_log_advisor_interaction_without_agent_id():
    """Valida registro quando o agente não foi salvo ou agent_id é None/new."""
    mock_db = AsyncMock()
    
    with patch("database.SessionLocal") as mock_session_local, \
         patch("api.services.cost_service.calculate_ai_cost", return_value=(0.005, 0.03)):
        
        mock_session_local.return_value.__aenter__.return_value = mock_db
        
        await log_advisor_interaction(
            agent_id=None,
            user_message="Gerar prompt inicial",
            agent_response="System prompt gerado",
            model_used="gpt-4o-mini",
            input_tokens=800,
            output_tokens=300,
            origin="Gerador de Prompt"
        )
        
        assert mock_db.add.called
        log_instance = mock_db.add.call_args[0][0]
        
        assert log_instance.agent_id is None
        assert log_instance.session_id == "advisor_global"
        assert log_instance.cost_brl == 0.03
        assert mock_db.commit.called
