import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from agent_core.logic.pre_router import run_pre_router_ai
from webhook_services import retrieve_context_history
from models import AgentConfigModel, WebhookEventModel, WebhookConfigModel

@pytest.mark.asyncio
async def test_pre_router_detects_automatic_message():
    # Setup mocks
    main_agent = MagicMock(spec=AgentConfigModel)
    main_agent.id = 1
    main_agent.name = "Main"
    main_agent.description = "Principal"
    main_agent.router_simple_model = "gpt-4o-mini"
    main_agent.initial_message = "Olá! Seja bem-vindo à nossa empresa."
    main_agent.initial_ignore_message = None
    main_agent.system_prompt = ""
    main_agent.dynamic_prompt = ""
    main_agent.pre_router_prompt = ""
    main_agent.date_awareness = False
    main_agent.date_awareness_past_days = 7
    main_agent.date_awareness_future_days = 7
    main_agent.context_window = 5
    
    # Mock da resposta do LLM contendo eh_mensagem_automatica = True e eh_saudacao = False
    mock_response = MagicMock()
    mock_response.choices = [MagicMock()]
    mock_response.choices[0].message.content = (
        '{"eh_saudacao": false, "eh_agradecimento": false, "eh_mensagem_automatica": true, '
        '"precisa_esclarecimento": false, "resposta_direta": null, "resposta_esclarecimento": null, '
        '"id_agente_alvo": 1, "perguntas_extraidas": null, "data_extraida": null}'
    )
    mock_response.usage = MagicMock()
    mock_response.usage.prompt_tokens = 10
    mock_response.usage.completion_tokens = 5
    mock_response.usage.total_tokens = 15
    
    with patch("os.getenv", return_value="fake-key"):
        with patch("openai.AsyncOpenAI") as mock_openai:
            mock_client = MagicMock()
            mock_openai.return_value = mock_client
            mock_client.chat.completions.create = AsyncMock(return_value=mock_response)
            
            result = await run_pre_router_ai(
                "Olá! Obrigado por entrar em contato. No momento não estamos disponíveis...",
                [],
                main_agent,
                []
            )
            
            assert result["eh_mensagem_automatica"] is True
            assert result["eh_saudacao"] is False
            assert result["resposta_direta"] is None

@pytest.mark.asyncio
async def test_pre_router_automatic_message_fallback():
    # Setup mocks sem initial_message configurada
    main_agent = MagicMock(spec=AgentConfigModel)
    main_agent.id = 1
    main_agent.name = "Main"
    main_agent.description = "Principal"
    main_agent.router_simple_model = "gpt-4o-mini"
    main_agent.initial_message = None  # Sem saudação
    main_agent.initial_ignore_message = None
    main_agent.system_prompt = ""
    main_agent.dynamic_prompt = ""
    main_agent.pre_router_prompt = ""
    main_agent.date_awareness = False
    main_agent.date_awareness_past_days = 7
    main_agent.date_awareness_future_days = 7
    main_agent.context_window = 5
    
    mock_response = MagicMock()
    mock_response.choices = [MagicMock()]
    mock_response.choices[0].message.content = (
        '{"eh_saudacao": false, "eh_agradecimento": false, "eh_mensagem_automatica": true, '
        '"precisa_esclarecimento": false, "resposta_direta": null, "resposta_esclarecimento": null, '
        '"id_agente_alvo": 1, "perguntas_extraidas": null, "data_extraida": null}'
    )
    mock_response.usage = MagicMock()
    mock_response.usage.prompt_tokens = 10
    mock_response.usage.completion_tokens = 5
    mock_response.usage.total_tokens = 15
    
    with patch("os.getenv", return_value="fake-key"):
        with patch("openai.AsyncOpenAI") as mock_openai:
            mock_client = MagicMock()
            mock_openai.return_value = mock_client
            mock_client.chat.completions.create = AsyncMock(return_value=mock_response)
            
            result = await run_pre_router_ai(
                "Catálogo de Serviços da Clinica...",
                [],
                main_agent,
                []
            )
            
            assert result["eh_mensagem_automatica"] is True
            assert result["eh_saudacao"] is False
            assert result["resposta_direta"] is None

@patch("webhook_tasks._add_step")
def test_retrieve_context_history_ignores_automatic_messages(mock_add_step):
    # Mock do DB e Queries do SQLAlchemy
    db_mock = MagicMock()
    
    # Criamos eventos passados de teste: um automático e um normal
    event_normal = MagicMock(spec=WebhookEventModel)
    event_normal.id = 10
    event_normal.mensagem = "Quero saber o preço"
    event_normal.agent_response = "Custa R$ 100"
    event_normal.dono = "usuario"
    event_normal.is_automatic = False
    
    event_automatic = MagicMock(spec=WebhookEventModel)
    event_automatic.id = 11
    event_automatic.mensagem = "Olá, seja bem-vindo ao Jessica Beauty"
    event_automatic.agent_response = "Olá! Como posso ajudar?"
    event_automatic.dono = "usuario"
    event_automatic.is_automatic = True
    
    # Configurar o mock de query para retornar apenas o evento normal
    query_mock = MagicMock()
    db_mock.query.return_value = query_mock
    filter_mock = MagicMock()
    query_mock.filter.return_value = filter_mock
    order_mock = MagicMock()
    filter_mock.order_by.return_value = order_mock
    limit_mock = MagicMock()
    order_mock.limit.return_value = limit_mock
    
    # O mock deve retornar apenas a mensagem normal no all()
    limit_mock.all.return_value = [event_normal]
    
    event = MagicMock(spec=WebhookEventModel)
    event.webhook_config_id = 1
    
    db_agent = MagicMock(spec=AgentConfigModel)
    db_agent.context_window = 5
    
    # Chamamos o service
    history = retrieve_context_history(
        db=db_mock,
        event=event,
        db_agent=db_agent,
        raw_phone="123456789",
        clean_phone="123456789",
        event_id=12
    )
    
    # Deve conter a mensagem normal e não conter a automática
    assert len(history) == 2  # (user: Quero saber o preço, assistant: Custa R$ 100)
    assert history[0]["content"] == "Quero saber o preço"
    assert history[1]["content"] == "Custa R$ 100"
    
    # Verificar se a mensagem automática foi excluída do histórico
    for msg in history:
        assert "Jessica Beauty" not in msg["content"]


@patch("webhook_tasks.SessionLocal")
@patch("webhook_tasks.async_session_worker")
@patch("redis.from_url")
@patch("webhook_tasks._build_agent_config")
def test_process_webhook_ignores_automatic_message(mock_build_config, mock_redis, mock_async_session, mock_session_local):
    from webhook_tasks import process_webhook_automation
    
    # Configura o db mock
    db_mock = MagicMock()
    mock_session_local.return_value = db_mock
    
    # Evento de teste
    event = MagicMock(spec=WebhookEventModel)
    event.id = 999
    event.status = "pending"
    event.mensagem = "Olá, seja bem-vindo ao Jessica Beauty"
    event.telefone = "+55 85 9999-9999"
    event.message_type = "text"
    event.webhook_config_id = 1
    event.legenda = None
    event.processing_steps = "[]"
    event.labels = "[]"
    event.raw_payload = "{}"
    event.is_automatic = False
    
    # Configuração de webhook mock
    config = MagicMock()
    config.id = 1
    config.agent_id = 10
    config.secondary_agent_ids = None
    config.leads_table = None
    config.delete_keywords = None
    config.project_assistant_keyword = None
    config.project_assistant_deactivate_keyword = None
    config.project_assistant_label = None
    config.zapvoice_url = None
    config.allowed_contacts = None
    config.blocked_messages = None
    config.project_assistant_active = False
    
    # Agente mock
    agent = MagicMock()
    agent.id = 10
    agent.name = "Agente Teste"
    agent.context_window = 5
    agent.model = "gpt-4o-mini"
    
    # Configura o retorno das queries
    def db_query_side_effect(model):
        q = MagicMock()
        if model == WebhookEventModel:
            q.filter.return_value.first.return_value = event
        elif model == WebhookConfigModel or model == "WebhookConfigModel":
            q.filter.return_value.first.return_value = config
        elif model == AgentConfigModel or model == "AgentConfigModel":
            q.options.return_value.filter.return_value.first.return_value = agent
        return q
        
    db_mock.query.side_effect = db_query_side_effect
    
    # Mock do _run que é executado por asyncio.run
    # Retorna o dicionário com ignored_automatic
    def mock_run_side_effect(coro):
        event.is_automatic = True
        return {"ignored_automatic": True}
        
    with patch("asyncio.run", side_effect=mock_run_side_effect):
        process_webhook_automation.run(event_id=999)
        
        # O status do evento deve ter sido atualizado para "ignored"
        assert event.status == "ignored"
        assert event.is_automatic is True
        # db_mock.commit deve ter sido chamado
        assert db_mock.commit.called

@pytest.mark.asyncio
async def test_pre_router_ad_click_to_chat_not_automatic():
    """Garante que mensagens pre-configuradas de anuncio (ex: 'Olá! Quero saber mais sobre o método laser day') NAO sao tratadas como mensagem automatica de ausencia."""
    main_agent = MagicMock(spec=AgentConfigModel)
    main_agent.id = 1
    main_agent.name = "Main"
    main_agent.description = "Principal"
    main_agent.router_simple_model = "gpt-4o-mini"
    main_agent.initial_message = None
    main_agent.initial_ignore_message = None
    main_agent.system_prompt = ""
    main_agent.dynamic_prompt = ""
    main_agent.pre_router_prompt = ""
    main_agent.date_awareness = False
    main_agent.date_awareness_past_days = 7
    main_agent.date_awareness_future_days = 7
    main_agent.context_window = 5

    mock_response = MagicMock()
    mock_response.choices = [MagicMock()]
    mock_response.choices[0].message.content = (
        '{"eh_saudacao": true, "eh_agradecimento": false, "eh_mensagem_automatica": false, '
        '"precisa_esclarecimento": false, "resposta_direta": "Olá! Que ótimo ver seu interesse no método Laser Day!", '
        '"resposta_esclarecimento": null, "id_agente_alvo": 1, "perguntas_extraidas": "método laser day", "data_extraida": null, "precisa_rag": true}'
    )
    mock_response.usage = MagicMock()
    mock_response.usage.prompt_tokens = 10
    mock_response.usage.completion_tokens = 5
    mock_response.usage.total_tokens = 15

    with patch("os.getenv", return_value="fake-key"):
        with patch("openai.AsyncOpenAI") as mock_openai:
            mock_client = MagicMock()
            mock_openai.return_value = mock_client
            mock_client.chat.completions.create = AsyncMock(return_value=mock_response)

            result = await run_pre_router_ai(
                "Olá! Quero saber mais sobre o método laser day",
                [],
                main_agent,
                []
            )

            assert result["eh_mensagem_automatica"] is False
            assert result["precisa_rag"] is True

@pytest.mark.asyncio
async def test_pre_router_praise_and_affective_reaction_not_automatic():
    # Setup mocks
    main_agent = MagicMock(spec=AgentConfigModel)
    main_agent.id = 1
    main_agent.name = "Main"
    main_agent.description = "Principal"
    main_agent.router_simple_model = "gpt-4o-mini"
    main_agent.initial_message = "Olá! Seja bem-vindo."
    main_agent.initial_ignore_message = None
    main_agent.system_prompt = ""
    main_agent.dynamic_prompt = ""
    main_agent.pre_router_prompt = ""
    main_agent.date_awareness = False
    main_agent.date_awareness_past_days = 7
    main_agent.date_awareness_future_days = 7
    main_agent.context_window = 5

    mock_response = MagicMock()
    mock_response.choices = [MagicMock()]
    mock_response.choices[0].message.content = (
        '{"eh_saudacao": true, "eh_agradecimento": true, "eh_mensagem_automatica": false, '
        '"precisa_esclarecimento": false, "resposta_direta": "Fico muito feliz que tenha gostado! 🥰", '
        '"resposta_esclarecimento": null, "id_agente_alvo": 1, "perguntas_extraidas": null, "data_extraida": null}'
    )
    mock_response.usage = MagicMock()
    mock_response.usage.prompt_tokens = 10
    mock_response.usage.completion_tokens = 5
    mock_response.usage.total_tokens = 15

    with patch("os.getenv", return_value="fake-key"):
        with patch("openai.AsyncOpenAI") as mock_openai:
            mock_client = MagicMock()
            mock_openai.return_value = mock_client
            mock_client.chat.completions.create = AsyncMock(return_value=mock_response)

            result = await run_pre_router_ai(
                "Amei.",
                [],
                main_agent,
                []
            )

            # Validações rígidas
            assert result["eh_mensagem_automatica"] is False
            assert result["eh_saudacao"] is True
            assert result["eh_agradecimento"] is True
            assert result["resposta_direta"] is not None


