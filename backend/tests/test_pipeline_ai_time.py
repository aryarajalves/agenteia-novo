import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from webhook_tasks.pipeline_ai import execute_agent_pipeline

@pytest.mark.asyncio
async def test_execute_agent_pipeline_imports_and_pre_router():
    """Valida que execute_agent_pipeline executa o pre-router sem erro de time ou imports."""
    mock_db = MagicMock()
    mock_event = MagicMock()
    mock_config = MagicMock()
    mock_config.secondary_agent_ids = None
    mock_db_agent = MagicMock()
    mock_db_agent.security_bot_protection = False
    mock_agent_config = MagicMock()
    mock_async_db = MagicMock()

    with patch("webhook_tasks.run_pre_router_ai", new_callable=AsyncMock) as mock_pr, \
         patch("webhook_tasks._add_step") as mock_step, \
         patch("webhook_tasks.pipeline_ai.AgentConfigModel"), \
         patch("webhook_tasks.process_message", new_callable=AsyncMock) as mock_pm:
        
        mock_pr.return_value = {
            "eh_saudacao": True,
            "eh_mensagem_automatica": False,
            "eh_anuncio": False,
            "precisa_rag": False,
            "decisao": "Saudação",
            "_model_used": "gpt-4o-mini",
            "_usage": {"prompt_tokens": 10, "completion_tokens": 5, "total_tokens": 15}
        }
        
        mock_pm.return_value = {
            "resposta": "Olá! Como posso ajudar?",
            "tokens_utilizados": 25,
            "model_used": "gpt-4o-mini"
        }
        
        result = await execute_agent_pipeline(
            db=mock_db,
            event=mock_event,
            config=mock_config,
            db_agent=mock_db_agent,
            agent_config=mock_agent_config,
            history=[],
            mensagem="Oi, bom dia",
            raw_phone="558599999999",
            clean_phone="558599999999",
            session_id="tel_558599999999",
            lead_internal_id=1,
            lead_created_at=None,
            event_id=10,
            is_simulated=False,
            async_db=mock_async_db
        )
        
        assert result is not None
        assert mock_pr.called is True
        assert mock_step.called is True
