import pytest
from unittest.mock import MagicMock, patch, AsyncMock
from sqlalchemy import text
from datetime import datetime, timezone
from webhook_tasks import process_webhook_automation

def test_process_webhook_automation_ad_simple():
    """
    Testa se uma mensagem contendo apenas anúncio não é ignorada,
    mas sim respondida com a mensagem de saudação do agente,
    marcando o status do evento como 'completed'.
    """
    with patch('webhook_tasks.SessionLocal') as mock_session_local, \
         patch('webhook_tasks._add_step') as mock_add_step, \
         patch('webhook_tasks._build_agent_config') as mock_build_agent_config, \
         patch('webhook_tasks.retrieve_context_history') as mock_retrieve_history, \
         patch('webhook_tasks.run_pre_router_ai', new_callable=AsyncMock) as mock_run_pre_router, \
         patch('webhook_tasks._send_zapvoice_message') as mock_send_message, \
         patch('webhook_tasks.is_conversation_paused', new_callable=AsyncMock, return_value=False), \
         patch('webhook_tasks.sync_conversation_labels', new_callable=AsyncMock, return_value=(True, [])), \
         patch('redis.from_url') as mock_redis_from_url:
        
        mock_db = MagicMock()
        mock_session_local.return_value = mock_db
        
        # Fazer fetchone retornar dados ficticios do lead para que ele seja atualizado/limpo
        mock_db.execute.return_value.fetchone.return_value = (42, datetime.now(timezone.utc), datetime.now(timezone.utc))
        
        # 1. Configurar Mocks
        mock_event = MagicMock()
        mock_event.id = 123
        mock_event.status = "pending"
        mock_event.telefone = "5511999999999"
        mock_event.mensagem = "Quero saber mais sobre o Laser Day"
        mock_event.legenda = None
        mock_event.message_type = "text"
        mock_event.link = None
        mock_event.contato_nome = "Contato de Teste"
        mock_event.webhook_config_id = 10
        mock_event.conta_id = "1"
        mock_event.conversa_id = "50"
        
        mock_config = MagicMock()
        mock_config.id = 10
        mock_config.agent_id = 1
        mock_config.leads_table = "leads"
        mock_config.delete_keywords = None
        mock_config.response_delay_seconds = 0
        mock_config.delete_labels = None
        mock_config.ignore_by_label = "humano"
        mock_config.labels_on_message = None
        mock_config.chatwoot_url = ""
        mock_config.chatwoot_api_token = ""
        mock_config.secondary_agent_ids = None
        
        mock_agent = MagicMock()
        mock_agent.id = 1
        mock_agent.name = "Agente de Teste"
        mock_agent.model = "gpt-4o-mini"
        mock_agent.system_prompt = "Prompt do Agente"
        mock_agent.tools = []
        mock_agent.security_bot_protection = False
        mock_agent.context_window = 1000
        mock_agent.max_messages_per_conversation = 1000
        mock_agent.security_max_messages = 1000
        mock_agent.security_max_messages_per_session = 20
        mock_agent.security_loop_count = 3
        mock_agent.security_semantic_threshold = 0.85
        
        def mock_query_filter(model):
            m_q = MagicMock()
            if model == mock_event.__class__ or 'WebhookEvent' in str(model):
                m_q.filter.return_value.first.return_value = mock_event
            elif model == mock_config.__class__ or 'WebhookConfig' in str(model):
                m_q.filter.return_value.first.return_value = mock_config
            else:
                m_q.filter.return_value.first.return_value = mock_agent
                m_q.filter.return_value.count.return_value = 0
                m_q.filter.return_value.order_by.return_value.limit.return_value.all.return_value = []
            return m_q
        mock_db.query.side_effect = mock_query_filter
        
        # Simular retorno do history
        mock_retrieve_history.return_value = []
        
        # Simular retorno do pre-router
        mock_run_pre_router.return_value = {
            "eh_saudacao": True,
            "eh_agradecimento": False,
            "precisa_esclarecimento": False,
            "resposta_direta": "Olá! Como posso ajudar?",
            "perguntas_extraidas": None,
            "data_extraida": None,
            "eh_anuncio": True,
            "detalhe_anuncio": "Contém anúncio: 'Quero saber mais sobre o Laser Day'",
            "_model_used": "shortcut-logic",
            "_usage": {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0}
        }
        
        # Mock do Redis
        mock_redis = MagicMock()
        mock_redis_from_url.return_value = mock_redis
        mock_send_message.return_value = True
        
        # Executar a task de automação
        process_webhook_automation.run(123)
        
        # Verificar se o status do evento mudou para 'completed'
        assert mock_event.status == "completed"
        
        # Verificar se foi adicionado o step de Anúncio Detectado
        log_steps = [call[0][2] for call in mock_add_step.call_args_list]
        assert any("Anúncio Detectado" in step for step in log_steps)
        assert not any("Pipeline Ignorado - Mensagem de Anúncio" in step for step in log_steps)
        
        # Verificar se a mensagem de saudação configurada foi enviada via Chatwoot
        mock_send_message.assert_called_once()
        assert mock_send_message.call_args[0][4] == "Olá! Como posso ajudar?"
        
        # Verificar se tentou atualizar a tabela de leads limpando a mensagem
        lead_sql_calls = [call[0][0].text for call in mock_db.execute.call_args_list if hasattr(call[0][0], 'text')]
        assert any("UPDATE leads SET mensagem = NULL" in sql for sql in lead_sql_calls)
        
        # Verificar se o debounce no redis foi limpo
        mock_redis.delete.assert_any_call("webhook:debounce:id:10:5511999999999")
        mock_redis.delete.assert_any_call("webhook:debounce:text:10:5511999999999")

def test_process_webhook_automation_ad_mixed():
    """
    Testa se uma mensagem contendo anúncio + pergunta real limpa o anúncio,
    prossegue respondendo e atualiza a mensagem no banco e na tabela de leads
    apenas com a pergunta limpa.
    """
    with patch('webhook_tasks.SessionLocal') as mock_session_local, \
         patch('webhook_tasks._add_step') as mock_add_step, \
         patch('webhook_tasks._build_agent_config') as mock_build_agent_config, \
         patch('webhook_tasks.retrieve_context_history') as mock_retrieve_history, \
         patch('webhook_tasks.run_pre_router_ai', new_callable=AsyncMock) as mock_run_pre_router, \
         patch('webhook_tasks.process_message', new_callable=AsyncMock) as mock_process_message, \
         patch('webhook_tasks._send_zapvoice_message') as mock_send_message, \
         patch('webhook_tasks.is_conversation_paused', new_callable=AsyncMock, return_value=False), \
         patch('webhook_tasks.sync_conversation_labels', new_callable=AsyncMock, return_value=(True, [])), \
         patch('redis.from_url') as mock_redis_from_url:
        
        mock_db = MagicMock()
        mock_session_local.return_value = mock_db
        
        # Fazer fetchone retornar dados ficticios do lead para que ele seja atualizado/limpo
        mock_db.execute.return_value.fetchone.return_value = (42, datetime.now(timezone.utc), datetime.now(timezone.utc))
        
        # 1. Configurar Mocks
        mock_event = MagicMock()
        mock_event.id = 124
        mock_event.status = "pending"
        mock_event.telefone = "5511999999999"
        mock_event.mensagem = "Quero saber mais sobre o Laser Day. Quanto custa o curso?"
        mock_event.legenda = None
        mock_event.message_type = "text"
        mock_event.link = None
        mock_event.contato_nome = "Contato de Teste"
        mock_event.webhook_config_id = 10
        mock_event.conta_id = "1"
        mock_event.conversa_id = "50"
        
        mock_config = MagicMock()
        mock_config.id = 10
        mock_config.agent_id = 1
        mock_config.leads_table = "leads"
        mock_config.delete_keywords = None
        mock_config.response_delay_seconds = 0
        mock_config.delete_labels = None
        mock_config.ignore_by_label = "humano"
        mock_config.labels_on_message = None
        mock_config.chatwoot_url = ""
        mock_config.chatwoot_api_token = ""
        mock_config.secondary_agent_ids = None
        
        mock_agent = MagicMock()
        mock_agent.id = 1
        mock_agent.name = "Agente de Teste"
        mock_agent.model = "gpt-4o-mini"
        mock_agent.system_prompt = "Prompt do Agente"
        mock_agent.tools = []
        mock_agent.security_bot_protection = False
        mock_agent.context_window = 1000
        mock_agent.max_messages_per_conversation = 1000
        mock_agent.security_max_messages = 1000
        mock_agent.security_max_messages_per_session = 20
        mock_agent.security_loop_count = 3
        mock_agent.security_semantic_threshold = 0.85
        
        def mock_query_filter_2(model):
            m_q = MagicMock()
            if model == mock_event.__class__ or 'WebhookEvent' in str(model):
                m_q.filter.return_value.first.return_value = mock_event
            elif model == mock_config.__class__ or 'WebhookConfig' in str(model):
                m_q.filter.return_value.first.return_value = mock_config
            else:
                m_q.filter.return_value.first.return_value = mock_agent
                m_q.filter.return_value.count.return_value = 0
                m_q.filter.return_value.order_by.return_value.limit.return_value.all.return_value = []
            return m_q
        mock_db.query.side_effect = mock_query_filter_2
        
        # Simular retorno do history
        mock_retrieve_history.return_value = []
        
        # Simular retorno do pre-router
        mock_run_pre_router.return_value = {
            "eh_saudacao": False,
            "eh_agradecimento": False,
            "precisa_esclarecimento": False,
            "resposta_direta": None,
            "perguntas_extraidas": "Quanto custa o curso?",
            "data_extraida": None,
            "eh_anuncio": True,
            "detalhe_anuncio": "Contém anúncio: 'Quero saber mais sobre o Laser Day'",
            "_model_used": "gpt-4o-mini",
            "_usage": {"prompt_tokens": 100, "completion_tokens": 20, "total_tokens": 120}
        }
        
        # Simular process_message do core
        mock_process_message.return_value = {
            "content": "O valor do curso é R$ 497.",
            "model": "gpt-4o-mini",
            "usage": {"prompt_tokens": 10, "completion_tokens": 5, "total_tokens": 15},
            "debug": {"resolved_prompt": "Prompt do Agente", "tool_calls": []}
        }
        
        # Mock do Redis
        mock_redis = MagicMock()
        mock_redis_from_url.return_value = mock_redis
        
        # Executar a task de automação
        process_webhook_automation.run(124)
        
        # Para mensagem mista, o pipeline deve ser completado com sucesso
        assert mock_event.status == "completed"
        
        # Verificar se a mensagem no evento de webhook foi limpa
        assert mock_event.mensagem == "Quanto custa o curso?"
        
        # Verificar se tentou atualizar a tabela de leads com a pergunta limpa
        lead_sql_calls = [call[0][0].text for call in mock_db.execute.call_args_list if hasattr(call[0][0], 'text')]
        assert any("UPDATE leads SET mensagem = :msg" in sql for sql in lead_sql_calls)
        
        # Verificar se a resposta correta foi enviada via Chatwoot
        mock_send_message.assert_called_once()
        assert mock_send_message.call_args[0][4] == "O valor do curso é R$ 497."
