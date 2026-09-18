import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from config_store import AgentConfig
from agent_core.core import process_message

@pytest.fixture
def mock_config():
    return AgentConfig(
        id=1,
        name="Agente Teste",
        system_prompt="Você é um assistente útil.",
        model="gpt-4o-mini",
        context_window=5,
        semantic_cache_enabled=False
    )

@pytest.mark.asyncio
async def test_message_preservation_when_pre_router_extracts_question(mock_config):
    """
    Testa que quando o Pre-Router extrai uma pergunta encurtada (ex: 'Qual é o seu nome?' a partir
    de 'Me chamo Aryaraj, qual é o seu nome?'), o prompt final entregue ao Agente Principal
    preserva a mensagem original completa com o nome e contexto do lead.
    """
    raw_message = "Me chamo Aryaraj, qual é o seu nome?"
    extracted_question = "Qual é o seu nome?"

    mock_pre_router_result = {
        "eh_saudacao": False,
        "eh_agradecimento": False,
        "eh_mensagem_automatica": False,
        "precisa_esclarecimento": False,
        "eh_anuncio": False,
        "resposta_direta": None,
        "id_agente_alvo": 1,
        "perguntas_extraidas": extracted_question,
        "lista_perguntas_extraidas": [extracted_question],
        "precisa_rag": False,
        "_model_used": "gpt-4o-mini",
        "_usage": {"prompt_tokens": 100, "completion_tokens": 20}
    }

    mock_openai_response = MagicMock()
    mock_openai_response.choices = [
        MagicMock(message=MagicMock(content="Olá Aryaraj! Eu sou o assistente virtual.", tool_calls=None))
    ]
    mock_openai_response.usage = MagicMock(prompt_tokens=50, completion_tokens=30, total_tokens=80)

    captured_messages = []

    async def fake_create(**kwargs):
        captured_messages.extend(kwargs.get("messages", []))
        return mock_openai_response

    mock_client = MagicMock()
    mock_client.chat.completions.create = AsyncMock(side_effect=fake_create)

    with patch("agent_core.core.run_pre_router_ai", AsyncMock(return_value=mock_pre_router_result)), \
         patch("agent_core.core.get_openai_client", return_value=mock_client), \
         patch("agent_core.core.handle_semantic_cache_check", AsyncMock(return_value=(None, None, {"status": "miss"}))):

        res = await process_message(
            message=raw_message,
            history=[],
            config=mock_config,
            context_variables={"raw_user_message": raw_message}
        )

        assert res.get("error") is False
        assert len(captured_messages) >= 2

        # A última mensagem do usuário enviada à OpenAI deve conter a mensagem original íntegra
        user_message_entry = [m for m in captured_messages if m.get("role") == "user"][-1]
        assert user_message_entry["content"] == raw_message
        assert "Aryaraj" in user_message_entry["content"]

        # No debug, a chave user_message_sent deve refletir a mensagem integral
        assert res.get("debug", {}).get("user_message_sent") == raw_message


@pytest.mark.asyncio
async def test_cache_funnel_handled_step_in_pipeline():
    """
    Testa a lógica da pipeline: quando o cache atende com hit e há funil de qualificação ativo,
    o atalho programático dispensa a triagem do Pre-Router e a busca vetorial no RAG.
    """
    from webhook_tasks.pipeline_ai import execute_agent_pipeline
    
    # Mock do evento e banco
    mock_event = MagicMock()
    mock_event.id = 999
    mock_event.mensagem = "Qual o valor do curso?"
    mock_event.telefone = "5511999999999"
    mock_event.contato_nome = "Lead Teste"
    mock_event.conta_id = "1"
    mock_event.conversa_id = "100"
    mock_event.webhook_config_id = 1
    mock_event.message_type = "text"
    mock_event.link = None
    mock_event.labels = None

    mock_db_agent = MagicMock()
    mock_db_agent.id = 1
    mock_db_agent.name = "Agente Vendas"
    mock_db_agent.model = "gpt-4o-mini"
    mock_db_agent.semantic_cache_enabled = True
    mock_db_agent.semantic_cache_threshold = 0.90
    mock_db_agent.qualification_questions = '["Você já atua na área?"]'
    mock_db_agent.tools = []

    mock_agent_config = AgentConfig(
        id=1,
        name="Agente Vendas",
        system_prompt="Assistente de vendas",
        model="gpt-4o-mini"
    )

    mock_cached_item = MagicMock()
    mock_cached_item.id = 42
    mock_cached_item.user_query = "Qual o valor do curso?"
    mock_cached_item.approved_response = "O curso custa R$ 997,00 à vista."
    mock_cached_item.similarity_threshold = 0.90

    steps_added = []
    def fake_add_step(db, event_id, title, detail, metadata=None):
        steps_added.append((title, detail))

    mock_db = MagicMock()
    mock_async_db = AsyncMock()
    # Mock de consulta ao banco para checar qualificação prévia
    mock_exec_result = MagicMock()
    mock_exec_result.fetchone.return_value = None
    mock_async_db.execute = AsyncMock(return_value=mock_exec_result)

    with patch("services.semantic_cache_service.lookup_semantic_cache", AsyncMock(return_value=(mock_cached_item, 0.98, mock_cached_item))), \
         patch("webhook_tasks._add_step", side_effect=fake_add_step), \
         patch("webhook_tasks.run_pre_router_ai") as mock_run_pr, \
         patch("webhook_tasks.pipeline_ai.execute_pre_rag_search") as mock_rag_search, \
         patch("webhook_tasks.process_message", AsyncMock(return_value={"content": "Resposta OK", "usage": MagicMock(prompt_tokens=10, completion_tokens=10, total_tokens=20), "debug": {}})):

        mock_config_webhook = MagicMock()
        mock_config_webhook.secondary_agent_ids = None
        mock_config_webhook.leads_table = None
        mock_config_webhook.project_assistant_label = None

        result = await execute_agent_pipeline(
            db=mock_db,
            event=mock_event,
            config=mock_config_webhook,
            db_agent=mock_db_agent,
            agent_config=mock_agent_config,
            history=[],
            mensagem="Qual o valor do curso?",
            raw_phone="5511999999999",
            clean_phone="5511999999999",
            session_id="session_999",
            lead_internal_id=None,
            lead_created_at=None,
            event_id=999,
            is_simulated=False,
            async_db=mock_async_db
        )

        # Pre-Router via LLM NÃO deve ser chamado (dispensado pelo atalho do Cache)
        mock_run_pr.assert_not_called()
        # Busca RAG prévia NÃO deve ser chamada (dispensada pelo atalho do Cache)
        mock_rag_search.assert_not_called()

        # O step de atalho deve ter sido gravado
        step_titles = [s[0] for s in steps_added]
        assert any("Atalho Cache Semântico" in t or "Atalho de Cache Semântico" in t for t in step_titles)


def test_strict_rules_prohibit_repeated_bot_presentation():
    """
    Testa que as regras de integridade do prompt proíbem explicitamente que o bot
    repita sua apresentação ('Eu sou o Bot...') sem que o usuário tenha perguntado.
    """
    from agent_core.logic.strict_rules_prompt import get_core_system_prompt_rules, get_strict_rules_prompt

    core_rules = get_core_system_prompt_rules()
    strict_rules = get_strict_rules_prompt()

    assert "PROIBIDO REPETIR APRESENTAÇÃO" in core_rules
    assert "PROIBIÇÃO DE REAPRESENTAÇÃO NÃO SOLICITADA" in strict_rules


def test_strict_rules_qualification_no_hardcoded_aesthetic_example():
    """
    Testa que as regras de integridade do prompt NÃO possuem exemplos hardcoded de perguntas
    (como 'estética' ou 'começando do zero') e instruem o robô a seguir estritamente o funil de qualificação.
    """
    from agent_core.logic.strict_rules_prompt import get_core_system_prompt_rules, get_strict_rules_prompt

    core_rules = get_core_system_prompt_rules()
    strict_rules = get_strict_rules_prompt()

    assert "estética" not in core_rules.lower()
    assert "começando do zero" not in core_rules.lower()
    assert "estética" not in strict_rules.lower()
    assert "começando do zero" not in strict_rules.lower()

    assert "próxima etapa pendente do funil de qualificação" in core_rules
    assert "próxima etapa pendente do funil de qualificação" in strict_rules
    assert "PROIBIDO inventar perguntas" in core_rules
    assert "PROIBIDO inventar perguntas" in strict_rules
