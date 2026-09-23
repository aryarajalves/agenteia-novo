import pytest
import json
from unittest.mock import MagicMock, patch, AsyncMock
import webhook_services
from webhook_services_modules.metrics import _get_cost
from webhook_services_modules.agent_builder import _build_agent_config, resolve_grouped_media
from webhook_services_modules.context import retrieve_context_history, get_project_assistant_context
from webhook_services_modules.messaging import _send_zapvoice_message, _send_zapvoice_media
from webhook_services_modules.traps import check_automation_trap, execute_keyword_deletion_trap


class DummyAgentModel:
    id = 1
    name = "Agente Teste"
    description = "Descrição"
    prompt = "Você é um atendente prestativo."
    system_prompt = "Você é um atendente prestativo."
    model = "gemini-2.5-flash"
    fallback_model = "gpt-4o-mini"
    temperature = 0.5
    top_p = 0.95
    date_awareness = True
    context_window = 10
    knowledge_base = json.dumps([{"title": "Doc", "content": "Texto"}])
    model_settings = json.dumps({"reasoning_effort": "low"})
    rag_retrieval_count = 3
    rag_translation_enabled = False
    rag_multi_query_enabled = False
    rag_rerank_enabled = False
    rag_agentic_eval_enabled = False
    rag_parent_expansion_enabled = False
    is_active = True
    simulated_time = None
    security_competitor_blacklist = None
    security_forbidden_topics = None
    security_discount_policy = None
    security_language_complexity = "standard"
    security_pii_filter = False
    security_bot_protection = False
    security_max_messages_per_session = 50
    security_semantic_threshold = 0.8
    security_loop_count = 3
    security_validator_ia = False
    inbox_capture_enabled = False
    router_enabled = False
    handoff_enabled = False
    response_translation_enabled = False
    zapvoice_api_url = "https://zap.api"
    zapvoice_api_key = "key"
    audio_response_enabled = True
    audio_chance_percentage = 80
    audio_voice_id = "alloy"
    audio_model = "eleven_multilingual_v2"
    audio_stability = 0.7
    audio_similarity_boost = 0.8
    audio_optimize_streaming_latency = 1
    auto_split_long_messages = True
    split_length_threshold = 300
    min_typing_delay_sec = 2
    max_typing_delay_sec = 5
    typing_speed_chars_per_sec = 25
    message_interval_sec = 3
    typing_delay_enabled = True
    message_interval_enabled = True
    split_by_paragraph = True
    split_by_period = False
    tools_enabled = []
    top_k = None
    presence_penalty = 0.0
    frequency_penalty = 0.0
    safety_settings = ""
    ui_primary_color = "#000"
    ui_header_color = "#000"
    ui_chat_title = "Chat"
    ui_welcome_message = "Olá"
    initial_question_message = ""
    router_simple_model = ""
    router_simple_fallback_model = ""
    router_complex_model = ""
    response_translation_fallback_lang = ""
    qualification_questions = ""
    qualification_labels = ""
    qualification_criteria = ""
    qualification_final_action = ""
    qualification_final_action_trigger = "all"
    qualification_funnels = None


def test_reexports_and_exports_completeness():
    """Valida se o barrel webhook_services reexporta todas as funções modulares esperadas."""
    expected_functions = [
        "auto_migrate_webhook_columns",
        "resolve_grouped_media",
        "_build_agent_config",
        "retrieve_context_history",
        "get_project_assistant_context",
        "_send_zapvoice_message",
        "_send_zapvoice_media",
        "_get_cost",
        "proactive_update_lead_table",
        "save_interaction_log",
        "execute_keyword_deletion_trap",
        "check_automation_trap",
    ]
    for fn_name in expected_functions:
        assert hasattr(webhook_services, fn_name), f"webhook_services não possui {fn_name}"
        assert callable(getattr(webhook_services, fn_name))


def test_get_cost_calculation():
    """Valida cálculo de custo baseado em tokens de entrada e saída."""
    usage = {"prompt_tokens": 1000, "completion_tokens": 1000}
    cost = _get_cost("gpt-4o-mini", usage)
    assert cost > 0

    cost_unknown = _get_cost("modelo-inexistente-xyz", usage)
    assert cost_unknown >= 0


def test_build_agent_config():
    """Valida mapeamento de modelo ORM para AgentConfig."""
    dummy_agent = DummyAgentModel()
    config = _build_agent_config(dummy_agent)
    assert config.name == "Agente Teste"
    assert config.model == "gemini-2.5-flash"
    assert config.temperature == 0.5
    assert len(config.knowledge_base) == 1
    assert config.model_settings == {"reasoning_effort": "low"}


@patch("webhook_tasks._add_step")
def test_resolve_grouped_media_fallback(mock_add_step):
    """Valida resolução de mídias quando não há mídias agrupadas pendentes."""
    db = MagicMock()
    event = MagicMock(telefone="5511999999999", mensagem="Mensagem teste", created_at=MagicMock())
    config = MagicMock(id=1)
    db.query.return_value.filter.return_value.all.return_value = []

    resolve_grouped_media(db, event, config, "evt-123")
    assert event.mensagem == "Mensagem teste"
    assert mock_add_step.call_count == 2


@patch("webhook_tasks._add_step")
def test_retrieve_context_history(mock_add_step):
    """Valida recuperação de contexto histórico ordenado."""
    db = MagicMock()
    event = MagicMock(webhook_config_id=1, webhook_config={}, telefone="5511999999999")
    db_agent = MagicMock(context_window=5)

    past_event1 = MagicMock(
        dono="user",
        event_type="message",
        agent_response=None,
        mensagem="Olá",
        created_at=1
    )
    past_event2 = MagicMock(
        dono="agente",
        event_type="message",
        agent_response="Olá, como posso ajudar?",
        mensagem=None,
        created_at=2
    )

    q_mock = db.query.return_value
    f_mock = q_mock.filter.return_value
    o_mock = f_mock.order_by.return_value
    l_mock = o_mock.limit.return_value
    l_mock.all.return_value = [past_event2, past_event1]

    history = retrieve_context_history(db, event, db_agent, "5511999999999", "5511999999999", "evt-current")
    assert len(history) == 2
    assert history[0]["role"] == "user"
    assert history[0]["content"] == "Olá"
    assert history[1]["role"] == "assistant"
    assert history[1]["content"] == "Olá, como posso ajudar?"


@pytest.mark.asyncio
async def test_get_project_assistant_context_empty():
    """Valida retorno do contexto consolidado para assistente de projeto sem leads e sem vendas."""
    db = AsyncMock()
    config = MagicMock(leads_table=None)

    sales_res = MagicMock()
    sales_res.fetchone.return_value = (0, 0.0)

    support_res = MagicMock()
    support_res.fetchall.return_value = []

    db.execute.side_effect = [sales_res, support_res]

    context = await get_project_assistant_context(db, config)
    assert isinstance(context, dict)
    assert context["leads_count"] == 0
    assert context["sales_count"] == 0
    assert context["sales_total"] == 0.0
    assert context["support_requests"] == []


def test_dynamic_patching_send_zapvoice_message():
    """Valida que patches em webhook_services._send_zapvoice_message continuam funcionando."""
    with patch("webhook_services._send_zapvoice_message") as mock_send:
        mock_send.return_value = {"success": True}
        res = webhook_services._send_zapvoice_message(
            zapvoice_url="https://api.zap",
            zapvoice_key="key",
            target_phone="5511999999999",
            text="Mensagem teste"
        )
        assert res == {"success": True}
        mock_send.assert_called_once()
