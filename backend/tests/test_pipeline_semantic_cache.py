import pytest
import json
from unittest.mock import AsyncMock, MagicMock, patch
from webhook_tasks.pipeline_ai import execute_agent_pipeline
from webhook_tasks.dispatch import handle_post_execution_and_dispatch
from models import AgentConfigModel, WebhookEventModel, WebhookConfigModel

@pytest.mark.asyncio
async def test_execute_agent_pipeline_semantic_cache_hit():
    mock_db = MagicMock()
    mock_async_db = AsyncMock()

    db_agent = MagicMock(spec=AgentConfigModel)
    db_agent.id = 42
    db_agent.semantic_cache_enabled = True
    db_agent.semantic_cache_threshold = 92
    db_agent.client_id = 1
    db_agent.security_bot_protection = False
    db_agent.system_prompt = "Você é um atendente prestativo."

    config = MagicMock(spec=WebhookConfigModel)
    config.secondary_agent_ids = None
    config.leads_table = "leads_test"

    event = MagicMock(spec=WebhookEventModel)
    event.id = 999
    event.mensagem = "qual o horario de atendimento?"
    event.telefone = "5511999999999"
    event.contato_nome = "Carlos"
    event.conta_id = "1"
    event.conversa_id = "100"
    event.event_type = "message"

    cached_item = MagicMock()
    cached_item.id = 15
    cached_item.user_query = "qual o horario de atendimento?"
    cached_item.approved_response = "Atendemos de segunda a sexta, das 09h às 18h."

    with patch("services.semantic_cache_service.lookup_semantic_cache", new_callable=AsyncMock) as mock_lookup, \
         patch("webhook_tasks._add_step") as mock_add_step:

        mock_lookup.return_value = (cached_item, 0.965)

        result = await execute_agent_pipeline(
            db=mock_db,
            event=event,
            config=config,
            db_agent=db_agent,
            agent_config={},
            history=[],
            mensagem="qual o horario de atendimento?",
            raw_phone="5511999999999",
            clean_phone="5511999999999",
            session_id="tel_5511999999999",
            lead_internal_id=1,
            lead_created_at=None,
            event_id=999,
            is_simulated=False,
            async_db=mock_async_db
        )

        assert result["from_semantic_cache"] is True
        assert result["model"] == "semantic-cache"
        assert result["cached_similarity"] == 0.965
        assert result["cached_similarity_pct"] == "96.5%"
        assert result["content"] == "Atendemos de segunda a sexta, das 09h às 18h."
        assert result["usage"]["total_tokens"] == 0

        # Valida que o passo foi adicionado no pipeline
        mock_add_step.assert_called()
        call_args = mock_add_step.call_args[0]
        step_title = call_args[2]
        step_detail = call_args[3]
        metadata = mock_add_step.call_args[1]["metadata"]

        assert "Cache Semântico" in step_title
        assert "96.5%" in step_title
        assert metadata["from_semantic_cache"] is True
        assert metadata["cost"] == 0.0

@pytest.mark.asyncio
async def test_dispatch_with_semantic_cache_result():
    mock_db = MagicMock()
    event = MagicMock(spec=WebhookEventModel)
    event.id = 999
    event.mensagem = "obrigado"
    event.telefone = "5511999999999"

    config = MagicMock(spec=WebhookConfigModel)
    config.leads_table = None

    db_agent = MagicMock(spec=AgentConfigModel)
    db_agent.system_prompt = "Prompt"
    db_agent.model = "gpt-4o-mini"
    db_agent.tools = []

    result = {
        "content": "Por nada!",
        "model": "semantic-cache",
        "from_semantic_cache": True,
        "cached_similarity": 0.95,
        "cached_similarity_pct": "95.0%",
        "cached_original_query": "obrigado",
        "cached_id": 10,
        "usage": {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0},
        "debug": {}
    }

    with patch("webhook_tasks._add_step") as mock_add_step, \
         patch("webhook_tasks.save_interaction_log"):

        handle_post_execution_and_dispatch(
            db=mock_db,
            event=event,
            config=config,
            db_agent=db_agent,
            result=result,
            history=[],
            session_id="123",
            lead_internal_id=1,
            event_id=999,
            is_simulated=False
        )

        assert event.agent_response == "Por nada!"
        # Verifica se o passo final de resposta reporta Cache Semântico
        calls = mock_add_step.call_args_list
        found_cache_step = any("Cache Semântico" in call[0][2] for call in calls)
        assert found_cache_step is True

@pytest.mark.asyncio
async def test_execute_agent_pipeline_semantic_cache_miss_registers_step():
    mock_db = MagicMock()
    mock_async_db = AsyncMock()

    db_agent = MagicMock(spec=AgentConfigModel)
    db_agent.id = 42
    db_agent.semantic_cache_enabled = True
    db_agent.semantic_cache_threshold = 92
    db_agent.client_id = 1
    db_agent.security_bot_protection = False
    db_agent.system_prompt = "Você é um atendente prestativo."

    config = MagicMock(spec=WebhookConfigModel)
    config.secondary_agent_ids = None
    config.leads_table = "leads_test"

    event = MagicMock(spec=WebhookEventModel)
    event.id = 1001
    event.mensagem = "pergunta inédita sem cache"
    event.telefone = "5511999999999"
    event.contato_nome = "Ana"
    event.conta_id = "1"
    event.conversa_id = "100"
    event.event_type = "message"

    with patch("services.semantic_cache_service.lookup_semantic_cache", new_callable=AsyncMock) as mock_lookup, \
         patch("webhook_tasks._add_step") as mock_add_step:

        # Simula retorno None (miss) com similaridade baixa de 45.0%
        mock_lookup.return_value = (None, 0.45)

        try:
            await execute_agent_pipeline(
                db=mock_db,
                event=event,
                config=config,
                db_agent=db_agent,
                agent_config={},
                history=[],
                mensagem="pergunta inédita sem cache",
                raw_phone="5511999999999",
                clean_phone="5511999999999",
                session_id="tel_5511999999999",
                lead_internal_id=1,
                lead_created_at=None,
                event_id=1001,
                is_simulated=False,
                async_db=mock_async_db
            )
        except Exception:
            pass

        # Valida que o passo de verificação foi adicionado antes do Pre-Router
        calls = [call[0][2] for call in mock_add_step.call_args_list]
        found_verification = any("Verificação de Cache Semântico" in title for title in calls)
        assert found_verification is True, f"Esperava encontrar 'Verificação de Cache Semântico', mas chamou: {calls}"

