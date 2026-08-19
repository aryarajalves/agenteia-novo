import pytest
from unittest.mock import AsyncMock, patch, MagicMock
import json
from config_store import AgentConfig
from agent_core.core import process_message
from agent_core.security import validate_response_ai
from agent_core.bot_defense import verify_bot_defense, cosine_similarity, simple_string_similarity

@pytest.fixture
def mock_agent_config():
    return AgentConfig(
        id=1,
        name="Agente Jaime Teste",
        system_prompt="Você é o Jaime, especialista em vendas.",
        model="gpt-4o-mini",
        security_language_complexity="simple",
        security_forbidden_topics="financeiro, reembolso",
        security_competitor_blacklist="ConcorrenteA, ConcorrenteB",
        security_discount_policy="Máximo de 10% de desconto sob aprovação do gerente",
        security_validator_ia=True,
        security_bot_protection=True,
        security_max_messages_per_session=5,
        security_loop_count=3,
        security_semantic_threshold=0.85,
        router_simple_model="gpt-4o-mini",
        router_simple_fallback_model="gpt-3.5-turbo"
    )

@pytest.fixture(autouse=True)
def mock_pre_router():
    with patch("agent_core.core.run_pre_router_ai", new_callable=AsyncMock) as mock:
        mock.return_value = {
            "eh_saudacao": False,
            "resposta_direta": None,
            "data_extraida": None,
            "perguntas_extraidas": None,
            "_usage": {"prompt_tokens": 0, "completion_tokens": 0},
            "_model_used": "mock-pre-router"
        }
        yield mock

@pytest.mark.asyncio
async def test_security_prompt_injection(mock_agent_config):
    """Valida se as diretrizes de segurança e estilo são injetadas no system prompt do agente principal."""
    # Desativamos a validação de IA para focar no teste de injeção de prompt
    mock_agent_config.security_validator_ia = False
    
    with patch("agent_core.core.get_openai_client") as mock_get_client:
        mock_client = MagicMock()
        mock_get_client.return_value = mock_client
        
        mock_response = MagicMock()
        mock_response.choices = [MagicMock(message=MagicMock(content="Olá, tudo bem? Sou o especialista.", tool_calls=None))]
        mock_response.usage = MagicMock(prompt_tokens=10, completion_tokens=5)
        mock_client.chat.completions.create = AsyncMock(return_value=mock_response)
        
        result = await process_message(
            message="Olá",
            history=[],
            config=mock_agent_config,
            tools=[],
            context_variables={"session_id": "session_1"}
        )
        
        resolved_prompt = result["debug"]["resolved_prompt"]
        
        # Verifica injeção do estilo simples
        assert "Estilo de Linguagem Simples (OBRIGATÓRIO)" in resolved_prompt
        # Verifica injeção de tópicos proibidos
        assert "TÓPICOS PROIBIDOS" in resolved_prompt
        assert "financeiro, reembolso" in resolved_prompt
        # Verifica injeção de blacklist de concorrentes
        assert "CONCORRENTES PROIBIDOS" in resolved_prompt
        assert "ConcorrenteA, ConcorrenteB" in resolved_prompt
        # Verifica injeção de política de descontos
        assert "POLÍTICA DE DESCONTOS" in resolved_prompt
        assert "Máximo de 10% de desconto" in resolved_prompt

@pytest.mark.asyncio
async def test_security_double_check_safe(mock_agent_config):
    """Valida que uma resposta considerada SAFE passa direto pelo Double-Check."""
    with patch("agent_core.core.get_openai_client") as mock_get_client, \
         patch("agent_core.security.get_openai_client") as mock_get_sec_client:
        
        # Mock do agente principal
        mock_client = MagicMock()
        mock_get_client.return_value = mock_client
        mock_response = MagicMock()
        mock_response.choices = [MagicMock(message=MagicMock(content="Claro, temos o produto X.", tool_calls=None))]
        mock_response.usage = MagicMock(prompt_tokens=10, completion_tokens=5)
        mock_client.chat.completions.create = AsyncMock(return_value=mock_response)
        
        # Mock do auditor de segurança
        mock_sec_client = MagicMock()
        mock_get_sec_client.return_value = mock_sec_client
        mock_sec_response = MagicMock()
        mock_sec_response.choices = [MagicMock(message=MagicMock(content="SAFE", tool_calls=None))]
        mock_sec_client.chat.completions.create = AsyncMock(return_value=mock_sec_response)
        
        on_step_mock = MagicMock()
        result = await process_message(
            message="Você vende o produto X?",
            history=[],
            config=mock_agent_config,
            tools=[],
            context_variables={"session_id": "session_1"},
            on_step=on_step_mock
        )
        
        assert result["content"] == "Claro, temos o produto X."
        # Verifica se o on_step foi chamado para auditoria de IA
        any_call_starts_with_shield = any("🛡️" in call[0][0] for call in on_step_mock.call_args_list)
        assert any_call_starts_with_shield

@pytest.mark.asyncio
async def test_security_double_check_violation(mock_agent_config):
    """Valida que uma resposta contendo violações é bloqueada e substituída por uma mensagem amigável."""
    with patch("agent_core.core.get_openai_client") as mock_get_client, \
         patch("agent_core.security.get_openai_client") as mock_get_sec_client:
        
        # Mock do agente principal
        mock_client = MagicMock()
        mock_get_client.return_value = mock_client
        mock_response = MagicMock()
        mock_response.choices = [MagicMock(message=MagicMock(content="Ofereço 20% de desconto e recomendo o ConcorrenteA.", tool_calls=None))]
        mock_response.usage = MagicMock(prompt_tokens=10, completion_tokens=5)
        mock_client.chat.completions.create = AsyncMock(return_value=mock_response)
        
        # Mock do auditor de segurança
        mock_sec_client = MagicMock()
        mock_get_sec_client.return_value = mock_sec_client
        mock_sec_response = MagicMock()
        mock_sec_response.choices = [MagicMock(message=MagicMock(content="VIOLATION: Mentions blacklisted competitor and discount policy exceeded", tool_calls=None))]
        mock_sec_client.chat.completions.create = AsyncMock(return_value=mock_sec_response)
        
        on_step_mock = MagicMock()
        result = await process_message(
            message="Quero desconto",
            history=[],
            config=mock_agent_config,
            tools=[],
            context_variables={"session_id": "session_1"},
            on_step=on_step_mock
        )
        
        # Resposta deve ser a mensagem amigável de recusa configurada
        assert result["content"] == "Desculpe, não posso ajudar com este tema específico. Como posso te ajudar com outro assunto?"
        
        # Verifica se o on_step foi chamado com alerta de bloqueio
        any_call_block = any("🚨 Bloqueio por Segurança" in call[0][0] for call in on_step_mock.call_args_list)
        assert any_call_block

@pytest.mark.asyncio
async def test_security_auditor_fallback_chain(mock_agent_config):
    """Valida a cadeia de fallbacks do auditor de IA (modelo simples -> fallback simples -> gpt-4o-mini)."""
    clients_created = []
    
    def dummy_get_openai_client(model_name):
        clients_created.append(model_name)
        # Se for o modelo principal ou de fallback simples, falha
        if model_name in [mock_agent_config.router_simple_model, mock_agent_config.router_simple_fallback_model]:
            raise Exception(f"Erro simulado no modelo {model_name}")
        # Se for o gpt-4o-mini (fallback global), funciona
        mock_client = MagicMock()
        mock_response = MagicMock()
        mock_response.choices = [MagicMock(message=MagicMock(content="SAFE", tool_calls=None))]
        mock_client.chat.completions.create = AsyncMock(return_value=mock_response)
        return mock_client

    with patch("agent_core.security.get_openai_client", side_effect=dummy_get_openai_client):
        result = await validate_response_ai("Teste de fallback", mock_agent_config)
        assert result["is_safe"] is True
        
        # Deve ter tentado o simples, depois o fallback do simples e por fim o gpt-4o-mini
        assert mock_agent_config.router_simple_model in clients_created
        assert mock_agent_config.router_simple_fallback_model in clients_created
        assert "gpt-4o-mini" in clients_created

@pytest.mark.asyncio
async def test_bot_defense_message_limit(mock_agent_config):
    """Valida que o Bot Defense bloqueia e aciona handoff quando o número total de interações atinge o limite."""
    db_mock = MagicMock()
    # Simula contagem de mensagens maior do que o limite max_messages_per_session (5)
    db_mock.query().filter().count.return_value = 6
    
    event_mock = MagicMock()
    event_mock.id = 123
    event_mock.conversa_id = "456"
    event_mock.conta_id = "789"
    
    config_mock = MagicMock()
    config_mock.chatwoot_url = "http://chatwoot"
    config_mock.chatwoot_api_token = "token"
    
    with patch("webhook_tasks._add_step") as mock_add_step, \
         patch("zapvoice_utils.sync_conversation_labels", new_callable=AsyncMock) as mock_sync:
        
        is_blocked = await verify_bot_defense(
            db=db_mock,
            event=event_mock,
            config=config_mock,
            agent_config=mock_agent_config,
            session_id="session_123",
            message="Quero atendimento"
        )
        
        assert is_blocked is True
        # Verifica se o step foi registrado
        mock_add_step.assert_any_call(db_mock, 123, "🛡️ Bot Defense: Limite Excedido", "Sessão excedeu o limite máximo de 5 mensagens na sessão. Transferindo para suporte humano.")
        # Verifica se aplicou handoff no Chatwoot
        assert mock_sync.called

@pytest.mark.asyncio
async def test_bot_defense_loop_detection_semantic(mock_agent_config):
    """Valida que o Bot Defense detecta loops semânticos por similaridade de cosseno nos embeddings das mensagens do usuário."""
    db_mock = MagicMock()
    
    # Simular histórico de interações com o usuário
    log_mock_1 = MagicMock(user_message="Como funciona o cancelamento?")
    log_mock_2 = MagicMock(user_message="Como faço para cancelar?")
    db_mock.query().filter().order_by().limit().all.return_value = [log_mock_1, log_mock_2]
    # Limite não estourado
    db_mock.query().filter().count.return_value = 2
    
    event_mock = MagicMock()
    event_mock.id = 123
    event_mock.conversa_id = "456"
    event_mock.conta_id = "789"
    
    config_mock = MagicMock()
    config_mock.chatwoot_url = "http://chatwoot"
    config_mock.chatwoot_api_token = "token"
    
    # Mock dos embeddings retornando vetores idênticos (similaridade = 1.0)
    async def dummy_get_embedding(text):
        return [1.0, 0.0, 0.0], {}
        
    with patch("agent_core.bot_defense.get_embedding", side_effect=dummy_get_embedding), \
         patch("webhook_tasks._add_step") as mock_add_step, \
         patch("zapvoice_utils.sync_conversation_labels", new_callable=AsyncMock) as mock_sync:
        
        is_blocked = await verify_bot_defense(
            db=db_mock,
            event=event_mock,
            config=config_mock,
            agent_config=mock_agent_config,
            session_id="session_123",
            message="Quero cancelar minha conta"
        )
        
        assert is_blocked is True
        # Verifica se registrou loop detectado
        mock_add_step.assert_any_call(db_mock, 123, "🛡️ Bot Defense: Loop Detectado", "Mensagem atual é semanticamente idêntica às últimas 2 mensagens (Limiar: 0.85). Transferindo para suporte humano.")
        # Verifica se aplicou handoff no Chatwoot
        assert mock_sync.called

def test_similarity_utilities():
    """Valida o funcionamento correto das funções utilitárias de similaridade de cosseno e similaridade de string."""
    v1 = [1.0, 0.0, 0.0]
    v2 = [1.0, 0.0, 0.0]
    v3 = [0.0, 1.0, 0.0]
    
    # Cosseno idênticos
    assert cosine_similarity(v1, v2) == pytest.approx(1.0)
    # Cosseno ortogonais
    assert cosine_similarity(v1, v3) == pytest.approx(0.0)
    
    # Jaccard de string
    s1 = "Como posso cancelar?"
    s2 = "como posso cancelar"
    # Deve ser muito similar (limpeza de pontuações e caixa baixa)
    assert simple_string_similarity(s1, s2) == pytest.approx(1.0)
    
    s3 = "Outra pergunta totalmente diferente"
    assert simple_string_similarity(s1, s3) < 0.5
