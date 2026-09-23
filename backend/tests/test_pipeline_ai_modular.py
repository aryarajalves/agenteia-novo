import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from models import AgentConfigModel, WebhookConfigModel, WebhookEventModel
from webhook_tasks.pipeline.cache_stage import check_semantic_cache_stage
from webhook_tasks.pipeline.prerouter_stage import execute_prerouter_stage
from webhook_tasks.pipeline.pre_execution_stage import prepare_and_pre_execute_stage
from webhook_tasks.pipeline_ai import execute_agent_pipeline


@pytest.mark.asyncio
async def test_check_semantic_cache_stage_skips_conversational():
    mock_db = MagicMock()
    mock_async_db = AsyncMock()
    mock_agent = MagicMock(spec=AgentConfigModel)
    mock_agent.semantic_cache_enabled = True

    is_term, term_res, partial, funnel_handled = await check_semantic_cache_stage(
        db=mock_db,
        async_db=mock_async_db,
        event=MagicMock(),
        db_agent=mock_agent,
        mensagem="ok",
        history=[],
        session_id="123",
        event_id=1,
        is_simulated=False
    )
    assert is_term is False
    assert term_res is None
    assert partial == []
    assert funnel_handled is False


@pytest.mark.asyncio
async def test_check_semantic_cache_stage_hit():
    mock_db = MagicMock()
    mock_async_db = AsyncMock()
    mock_agent = MagicMock(spec=AgentConfigModel)
    mock_agent.id = 1
    mock_agent.semantic_cache_enabled = True
    mock_agent.semantic_cache_threshold = 90
    mock_agent.client_id = 1
    mock_agent.qualification_questions = None

    mock_event = MagicMock()
    mock_event.conta_id = 1
    mock_event.conversa_id = 10
    mock_event.telefone = "11999999999"
    mock_event.contato_nome = "Ana"
    mock_event.event_type = "message"

    cached_item = MagicMock()
    cached_item.id = 99
    cached_item.user_query = "qual o valor?"
    cached_item.approved_response = "O valor é R$ 150."
    cached_item.similarity_threshold = 0.90

    with patch("services.semantic_cache_service.lookup_semantic_cache", new_callable=AsyncMock) as mock_lookup, \
         patch("webhook_tasks._add_step") as mock_add_step:
        
        mock_lookup.return_value = (cached_item, 0.95, cached_item)

        is_term, term_res, partial, funnel_handled = await check_semantic_cache_stage(
            db=mock_db,
            async_db=mock_async_db,
            event=mock_event,
            db_agent=mock_agent,
            mensagem="qual o valor?",
            history=[],
            session_id="123",
            event_id=1,
            is_simulated=False
        )

        assert is_term is True
        assert term_res is not None
        assert term_res["from_semantic_cache"] is True
        assert "R$ 150" in term_res["content"]
        assert term_res["usage"]["total_tokens"] == 0
        assert mock_add_step.called


@pytest.mark.asyncio
async def test_execute_prerouter_stage_automatic_message():
    mock_db = MagicMock()
    mock_async_db = AsyncMock()
    mock_event = MagicMock()
    mock_config = MagicMock()
    mock_agent = MagicMock()
    mock_agent.model = "gpt-4o-mini"

    pr_mock_res = {
        "eh_mensagem_automatica": True,
        "_model_used": "pre-router",
        "_usage": {}
    }

    with patch("webhook_tasks.run_pre_router_ai", new_callable=AsyncMock, return_value=pr_mock_res), \
         patch("webhook_tasks._add_step"):

        is_term, term_res, pr_res, final_ag, final_cfg, msg = await execute_prerouter_stage(
            db=mock_db,
            async_db=mock_async_db,
            event=mock_event,
            config=mock_config,
            db_agent=mock_agent,
            agent_config={},
            secondary_agents=[],
            mensagem="Olá, estou ausente no momento",
            history=[],
            session_id="123",
            lead_internal_id=None,
            event_id=1,
            is_simulated=False,
            cache_funnel_handled=False,
            multi_matched_items=[],
            is_multi_hit=False
        )

        assert is_term is True
        assert term_res.get("ignored_automatic") is True
        assert mock_event.status == "ignored"


@pytest.mark.asyncio
async def test_prepare_and_pre_execute_stage_qualified_suppression():
    mock_db = MagicMock()
    mock_async_db = AsyncMock()
    mock_event = MagicMock()
    mock_event.telefone = "5511988887777"
    mock_config = MagicMock()
    mock_config.leads_table = "leads"
    mock_config.project_assistant_label = None

    mock_tool_qual = MagicMock()
    mock_tool_qual.name = "lead_qualificado"
    mock_tool_other = MagicMock()
    mock_tool_other.name = "outra_ferramenta"

    mock_agent = MagicMock()
    mock_agent.id = 10
    mock_agent.tools = [mock_tool_qual, mock_tool_other]

    mock_exec_res = MagicMock()
    mock_exec_res.fetchone.return_value = ("{'qualificado': True}", None)
    mock_async_db.execute.return_value = mock_exec_res

    pr_res = {
        "perguntas_extraidas": "duvida",
        "precisa_rag": False,
        "chamada_ferramenta": None
    }

    with patch("webhook_tasks._add_step"):
        tools, pre_calls, rag_ctx, msg, raw_msg, is_qual, active_f = await prepare_and_pre_execute_stage(
            db=mock_db,
            async_db=mock_async_db,
            event=mock_event,
            config=mock_config,
            final_db_agent=mock_agent,
            final_agent_config=MagicMock(),
            pre_router_result=pr_res,
            mensagem="duvida",
            history=[],
            session_id="123",
            event_id=1,
            partial_cache_items=[],
            cache_funnel_handled=False
        )

        assert is_qual is True
        tool_names = [t.name for t in tools]
        assert "lead_qualificado" not in tool_names
        assert "outra_ferramenta" in tool_names


@pytest.mark.asyncio
async def test_execute_agent_pipeline_simulated():
    mock_db = MagicMock()
    mock_async_db = AsyncMock()
    mock_agent = MagicMock()
    mock_agent.id = 1
    mock_agent.name = "Agente Simulado"
    mock_agent.security_bot_protection = False
    mock_agent.semantic_cache_enabled = False
    mock_agent.tools = []

    mock_event = MagicMock()
    mock_event.id = 55
    mock_event.message_type = "text"
    mock_event.link = None
    mock_event.contato_nome = "Carlos"

    mock_config = MagicMock()
    mock_config.secondary_agent_ids = None
    mock_config.project_assistant_label = None
    mock_config.leads_table = None

    with patch("webhook_tasks._add_step"):
        res = await execute_agent_pipeline(
            db=mock_db,
            event=mock_event,
            config=mock_config,
            db_agent=mock_agent,
            agent_config=MagicMock(),
            history=[],
            mensagem="Olá agente",
            raw_phone="11999999999",
            clean_phone="11999999999",
            session_id="session_123",
            lead_internal_id=None,
            lead_created_at=None,
            event_id=55,
            is_simulated=True,
            async_db=mock_async_db
        )

        assert "[MOCK IA]" in res["content"]
        assert res["model"] == "gpt-4o-mini (MOCK)"
