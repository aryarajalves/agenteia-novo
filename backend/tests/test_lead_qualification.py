import pytest
import json
from unittest.mock import AsyncMock, patch, MagicMock
from agent import process_message
from config_store import AgentConfig
from agent_core.tools.handlers.internal import handle_lead_qualified

class MockTool:
    def __init__(self, name, description="", parameters_schema=None):
        self.name = name
        self.description = description
        self.parameters_schema = parameters_schema or {}

@pytest.fixture
def lead_qualificado_tool():
    return MockTool(
        name="lead_qualificado",
        description="Chame esta ferramenta quando o usuário responder com sucesso todas as perguntas de qualificação.",
        parameters_schema={"type": "object", "properties": {"respostas": {"type": "object"}}, "required": ["respostas"]}
    )

class MockMessage:
    def __init__(self, content, tool_calls=None):
        self.content = content
        self.tool_calls = tool_calls

class MockChoice:
    def __init__(self, content, tool_calls=None):
        self.message = MockMessage(content, tool_calls)

class MockResponse:
    def __init__(self, content, tool_calls=None, prompt_tokens=5, completion_tokens=5):
        self.choices = [MockChoice(content, tool_calls)]
        self.usage = MagicMock(prompt_tokens=prompt_tokens, completion_tokens=completion_tokens)

@pytest.fixture
def qualification_config():
    return AgentConfig(
        id=1,
        name="Agent Qualificador",
        system_prompt="Você é um assistente qualificador.",
        model="gpt-4o-mini",
        router_enabled=False,
        date_awareness=False,
        handoff_enabled=False,
        qualification_questions='["Qual seu nome?", "Qual seu e-mail?", "Qual sua empresa?"]',
        qualification_labels='["Lead-Qualificado", "Interessado"]'
    )

@pytest.mark.asyncio
async def test_qualification_prompt_injection(qualification_config, lead_qualificado_tool):
    message = "Olá"
    history = []
    
    with patch("agent_core.core.get_openai_client") as mock_get_client, \
         patch("agent_core.core.run_pre_router_ai", new_callable=AsyncMock) as mock_pre_router:
        
        mock_pre_router.return_value = {"eh_saudacao": False, "id_agente_alvo": 1, "perguntas_extraidas": "Olá"}
        mock_client = MagicMock()
        mock_get_client.return_value = mock_client
        mock_client.chat.completions.create = AsyncMock(return_value=MockResponse("Olá! Qual seu nome?"))
        
        await process_message(message, history, qualification_config, tools=[lead_qualificado_tool])
        
        called_args, called_kwargs = mock_client.chat.completions.create.call_args
        messages = called_kwargs["messages"]
        system_msg = next(m for m in messages if m["role"] == "system")
        
        assert "QUALIFICAÇÃO DE LEAD" in system_msg["content"]
        assert "Qual seu nome?" in system_msg["content"]
        assert "Qual seu e-mail?" in system_msg["content"]
        assert "Qual sua empresa?" in system_msg["content"]

@pytest.mark.asyncio
async def test_qualification_tool_declaration(qualification_config, lead_qualificado_tool):
    message = "Olá"
    history = []
    
    with patch("agent_core.core.get_openai_client") as mock_get_client, \
         patch("agent_core.core.run_pre_router_ai", new_callable=AsyncMock) as mock_pre_router:
        
        mock_pre_router.return_value = {"eh_saudacao": False, "id_agente_alvo": 1, "perguntas_extraidas": "Olá"}
        mock_client = MagicMock()
        mock_get_client.return_value = mock_client
        mock_client.chat.completions.create = AsyncMock(return_value=MockResponse("Olá! Qual seu nome?"))
        
        await process_message(message, history, qualification_config, tools=[lead_qualificado_tool])
        
        called_args, called_kwargs = mock_client.chat.completions.create.call_args
        tools = called_kwargs["tools"]
        
        tool_names = [t["function"]["name"] for t in tools]
        assert "lead_qualificado" in tool_names

@pytest.mark.asyncio
async def test_handler_lead_qualified():
    # Mock do DB session
    mock_db = AsyncMock()
    
    # Mock do AgentConfigModel
    mock_agent = MagicMock()
    mock_agent.qualification_labels = '["Lead-Qualificado", "Interessado"]'
    
    # Mock do WebhookConfigModel
    mock_webhook = MagicMock()
    mock_webhook.id = 1
    mock_webhook.chatwoot_url = "https://chatwoot.example.com"
    mock_webhook.chatwoot_api_token = "token_secreto_cw"
    
    # Simular os retornos de execute do banco
    mock_agent_result = MagicMock()
    mock_agent_result.scalars.return_value.first.return_value = mock_agent
    
    mock_webhook_result = MagicMock()
    mock_webhook_result.scalars.return_value.first.return_value = mock_webhook
    
    mock_lead_row_result = MagicMock()
    mock_lead_row_result.fetchone.return_value = (None,)
    
    mock_update_result = MagicMock()
    mock_update_result.rowcount = 1
    
    mock_db.execute.side_effect = [
        mock_agent_result,      # SELECT AgentConfigModel (no handle_lead_qualified)
        mock_webhook_result,    # SELECT WebhookConfigModel
        mock_agent_result,      # SELECT AgentConfigModel (dentro de calculate_lead_score)
        mock_lead_row_result,   # SELECT labels FROM leads WHERE telefone = ...
        mock_update_result,     # UPDATE da tabela leads
    ]
    
    # Context variables
    context_vars = {
        "leads_table": "leads_cliente_1",
        "contact_phone": "558199999999",
        "contact_name": "João Teste",
        "conversation_id": 456,
        "account_id": 12,
    }
    
    tool_args = {
        "respostas": {
            "Qual seu nome?": "João da Silva",
            "Qual seu e-mail?": "joao@empresa.com",
            "Qual sua empresa?": "Empresa X"
        }
    }
    
    with patch("zapvoice_utils.sync_conversation_labels", new_callable=AsyncMock) as mock_sync_labels:
        
        result = await handle_lead_qualified(
            db=mock_db,
            context_variables=context_vars,
            func_args_str=json.dumps(tool_args),
            agent_id=1
        )
        
        assert "sucesso" in result.lower()
        assert "Etiquetas sincronizadas na conversa: Lead-Qualificado, Interessado, qualificado" in result
        
        mock_sync_labels.assert_called_once_with(
            cw_url="https://chatwoot.example.com",
            account_id=12,
            conversation_id=456,
            token="token_secreto_cw",
            to_add=["Lead-Qualificado", "Interessado", "qualificado"]
        )
        
        assert mock_db.execute.called

@pytest.mark.asyncio
async def test_handler_lead_qualified_creates_lead():
    # Mock do DB session
    mock_db = AsyncMock()
    
    # Mock do AgentConfigModel
    mock_agent = MagicMock()
    mock_agent.qualification_labels = '["Lead-Qualificado"]'
    
    # Mock do WebhookConfigModel
    mock_webhook = MagicMock()
    mock_webhook.id = 7
    mock_webhook.chatwoot_url = "https://chatwoot.example.com"
    mock_webhook.chatwoot_api_token = "token_secreto_cw"
    
    # Simular os retornos de execute do banco
    mock_agent_result = MagicMock()
    mock_agent_result.scalars.return_value.first.return_value = mock_agent
    
    mock_webhook_result = MagicMock()
    mock_webhook_result.scalars.return_value.first.return_value = mock_webhook
    
    # Mock do resultado do UPDATE com rowcount = 0
    mock_update_result = MagicMock()
    mock_update_result.rowcount = 0
    
    mock_lead_row_result = MagicMock()
    mock_lead_row_result.fetchone.return_value = (None,)
    
    mock_db.execute.side_effect = [
        mock_agent_result,      # SELECT AgentConfigModel (no handle_lead_qualified)
        mock_webhook_result,    # SELECT WebhookConfigModel
        mock_agent_result,      # SELECT AgentConfigModel (dentro de calculate_lead_score)
        mock_lead_row_result,   # SELECT labels FROM leads WHERE telefone = ...
        mock_update_result,     # UPDATE da tabela leads (retorna 0 rows)
        MagicMock(),            # INSERT da tabela leads
    ]
    
    # Context variables
    context_vars = {
        "leads_table": "leads_cliente_1",
        "contact_phone": "558199999999",
        "contact_name": "João Novo",
        "conversation_id": 456,
        "account_id": 12,
    }
    
    tool_args = {
        "respostas": {
            "Qual seu nome?": "João Novo",
        }
    }
    
    with patch("zapvoice_utils.sync_conversation_labels", new_callable=AsyncMock) as mock_sync_labels:
        result = await handle_lead_qualified(
            db=mock_db,
            context_variables=context_vars,
            func_args_str=json.dumps(tool_args),
            agent_id=1
        )
        
        assert "sucesso" in result.lower()
        # Valida que o execute foi chamado com o INSERT
        calls = mock_db.execute.call_args_list
        assert len(calls) == 6
        # O último execute deve conter o comando INSERT
        last_call_sql = str(calls[5][0][0])
        assert "INSERT" in last_call_sql
        assert "leads_cliente_1" in last_call_sql

@pytest.mark.asyncio
async def test_pre_router_greeting_without_qualification_questions(qualification_config):
    from agent_core.logic.pre_router import run_pre_router_ai
    
    # Configurar mensagem inicial específica no config mock
    qualification_config.initial_message = "Olá! Seja bem-vindo ao suporte."
    
    message = "oi"
    history = []
    
    result = await run_pre_router_ai(message, history, qualification_config)
    
    assert result["eh_saudacao"] is True
    # A resposta deve conter apenas a mensagem inicial, sem a primeira pergunta
    assert result["resposta_direta"] == "Olá! Seja bem-vindo ao suporte."
    assert "Qual seu nome?" not in result["resposta_direta"]

@pytest.mark.asyncio
async def test_handler_lead_qualified_env_fallback():
    # Mock do DB session
    mock_db = AsyncMock()
    
    # Mock do AgentConfigModel
    mock_agent = MagicMock()
    mock_agent.qualification_labels = '["Lead-Qualificado", "Interessado"]'
    
    # Mock do WebhookConfigModel sem credenciais
    mock_webhook = MagicMock()
    mock_webhook.id = 1
    mock_webhook.chatwoot_url = ""
    mock_webhook.chatwoot_api_token = ""
    
    # Simular os retornos de execute do banco
    mock_agent_result = MagicMock()
    mock_agent_result.scalars.return_value.first.return_value = mock_agent
    
    mock_webhook_result = MagicMock()
    mock_webhook_result.scalars.return_value.first.return_value = mock_webhook
    
    mock_update_result = MagicMock()
    mock_update_result.rowcount = 1
    
    mock_lead_row_result = MagicMock()
    mock_lead_row_result.fetchone.return_value = (None,)
    
    mock_db.execute.side_effect = [
        mock_agent_result,      # SELECT AgentConfigModel (no handle_lead_qualified)
        mock_webhook_result,    # SELECT WebhookConfigModel
        mock_agent_result,      # SELECT AgentConfigModel (dentro de calculate_lead_score)
        mock_lead_row_result,   # SELECT labels FROM leads WHERE telefone = ...
        mock_update_result,     # UPDATE da tabela leads
    ]
    
    # Context variables sem account_id (para testar fallback de account_id do ambiente também)
    context_vars = {
        "leads_table": "leads_cliente_1",
        "contact_phone": "558199999999",
        "contact_name": "João Teste",
        "conversation_id": 456,
    }
    
    tool_args = {
        "respostas": {
            "Qual seu nome?": "João da Silva",
        }
    }
    
    # Mock das variáveis de ambiente e da sincronização
    with patch.dict("os.environ", {
             "CHATWOOT_URL": "https://chatwoot-env.example.com",
             "CHATWOOT_API_TOKEN": "token_env_secreto",
             "CHATWOOT_ACCOUNT_ID": "99"
         }), \
         patch("zapvoice_utils.sync_conversation_labels", new_callable=AsyncMock) as mock_sync_labels:
         
        result = await handle_lead_qualified(
            db=mock_db,
            context_variables=context_vars,
            func_args_str=json.dumps(tool_args),
            agent_id=1
        )
        
        assert "sucesso" in result.lower()
        assert "Etiquetas sincronizadas na conversa: Lead-Qualificado, Interessado, qualificado" in result
        
        mock_sync_labels.assert_called_once_with(
            cw_url="https://chatwoot-env.example.com",
            account_id=99,
            conversation_id=456,
            token="token_env_secreto",
            to_add=["Lead-Qualificado", "Interessado", "qualificado"]
        )

@pytest.mark.asyncio
async def test_unanswered_question_prompt_rules_injection(qualification_config):
    message = "Olá"
    history = []
    
    with patch("agent_core.core.get_openai_client") as mock_get_client, \
         patch("agent_core.core.run_pre_router_ai", new_callable=AsyncMock) as mock_pre_router:
        
        mock_pre_router.return_value = {"eh_saudacao": False, "id_agente_alvo": 1, "perguntas_extraidas": "Olá"}
        mock_client = MagicMock()
        mock_get_client.return_value = mock_client
        mock_client.chat.completions.create = AsyncMock(return_value=MockResponse("Ok"))
        
        await process_message(message, history, qualification_config)
        
        called_args, called_kwargs = mock_client.chat.completions.create.call_args
        messages = called_kwargs["messages"]
        system_content = messages[0]["content"]
        
        assert "PROTOCOLO DE RESPOSTA DA FERRAMENTA 'registrar_duvida_sem_resposta'" in system_content
        assert "vou verificar com a equipe e já te retorno certinho sobre" in system_content.lower()
        assert "TERMINANTEMENTE PROIBIDO" in system_content


@pytest.mark.asyncio
async def test_qualification_prompt_injection_with_structured_questions(qualification_config, lead_qualificado_tool):
    # Definindo perguntas estruturadas (novos objetos)
    qualification_config.qualification_questions = '[{"text": "Qual seu nome?", "instruction": "Validar se possui pelo menos sobrenome"}, {"text": "Qual seu email?", "instruction": ""}]'
    
    message = "Olá"
    history = []
    
    with patch("agent_core.core.get_openai_client") as mock_get_client, \
         patch("agent_core.core.run_pre_router_ai", new_callable=AsyncMock) as mock_pre_router:
        
        mock_pre_router.return_value = {"eh_saudacao": False, "id_agente_alvo": 1, "perguntas_extraidas": "Olá"}
        mock_client = MagicMock()
        mock_get_client.return_value = mock_client
        mock_client.chat.completions.create = AsyncMock(return_value=MockResponse("Olá! Qual seu nome?"))
        
        await process_message(message, history, qualification_config, tools=[lead_qualificado_tool])
        
        called_args, called_kwargs = mock_client.chat.completions.create.call_args
        messages = called_kwargs["messages"]
        system_msg = next(m for m in messages if m["role"] == "system")
        
        assert "QUALIFICAÇÃO DE LEAD" in system_msg["content"]
        assert "Qual seu nome?" in system_msg["content"]
        assert "↳ Instrução de validação para esta pergunta: Validar se possui pelo menos sobrenome" in system_msg["content"]
        assert "Qual seu email?" in system_msg["content"]


@pytest.mark.asyncio
async def test_qualification_prompt_injection_mixed_questions(qualification_config, lead_qualificado_tool):
    # Mistura de string simples antiga e dicionário estruturado novo
    qualification_config.qualification_questions = '["Qual sua empresa?", {"text": "Qual seu cargo?", "instruction": "Exigir cargo de gerência"}]'
    
    message = "Olá"
    history = []
    
    with patch("agent_core.core.get_openai_client") as mock_get_client, \
         patch("agent_core.core.run_pre_router_ai", new_callable=AsyncMock) as mock_pre_router:
        
        mock_pre_router.return_value = {"eh_saudacao": False, "id_agente_alvo": 1, "perguntas_extraidas": "Olá"}
        mock_client = MagicMock()
        mock_get_client.return_value = mock_client
        mock_client.chat.completions.create = AsyncMock(return_value=MockResponse("Olá!"))
        
        await process_message(message, history, qualification_config, tools=[lead_qualificado_tool])
        
        called_args, called_kwargs = mock_client.chat.completions.create.call_args
        messages = called_kwargs["messages"]
        system_msg = next(m for m in messages if m["role"] == "system")
        
        assert "QUALIFICAÇÃO DE LEAD" in system_msg["content"]
        assert "Qual sua empresa?" in system_msg["content"]
        assert "Qual seu cargo?" in system_msg["content"]
        assert "↳ Instrução de validação para esta pergunta: Exigir cargo de gerência" in system_msg["content"]

@pytest.mark.asyncio
async def test_no_qualification_injection_when_tool_absent(qualification_config):
    # Quando o agente tem perguntas configuradas mas a ferramenta lead_qualificado não está na lista,
    # nem o prompt de qualificação nem a ferramenta devem ser injetados.
    message = "Olá"
    history = []
    
    with patch("agent_core.core.get_openai_client") as mock_get_client, \
         patch("agent_core.core.run_pre_router_ai", new_callable=AsyncMock) as mock_pre_router:
        
        mock_pre_router.return_value = {"eh_saudacao": False, "id_agente_alvo": 1, "perguntas_extraidas": "Olá"}
        mock_client = MagicMock()
        mock_get_client.return_value = mock_client
        mock_client.chat.completions.create = AsyncMock(return_value=MockResponse("Olá! Como posso ajudar?"))
        
        # Chamamos process_message sem passar a ferramenta lead_qualificado (tools vazio ou com outra ferramenta)
        await process_message(message, history, qualification_config, tools=[])
        
        called_args, called_kwargs = mock_client.chat.completions.create.call_args
        messages = called_kwargs["messages"]
        system_msg = next(m for m in messages if m["role"] == "system")
        
        # O prompt de qualificação NÃO deve estar presente no system prompt
        assert "QUALIFICAÇÃO DE LEAD" not in system_msg["content"]
        assert "Qual seu nome?" not in system_msg["content"]
        
        # A ferramenta lead_qualificado NÃO deve estar declarada nas ferramentas do OpenAI
        openai_tools = called_kwargs.get("tools", [])
        tool_names = [t["function"]["name"] for t in openai_tools]
        assert "lead_qualificado" not in tool_names


