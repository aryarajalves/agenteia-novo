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
    mock_webhook.zapvoice_url = "https://zapvoice.example.com"
    mock_webhook.zapvoice_api_token = "token_secreto_zv"
    
    # Simular os retornos de execute do banco
    mock_agent_result = MagicMock()
    mock_agent_result.scalars.return_value.first.return_value = mock_agent
    
    mock_webhook_result = MagicMock()
    mock_webhook_result.scalars.return_value.first.return_value = mock_webhook
    
    mock_lead_row_result = MagicMock()
    mock_lead_row_result.fetchone.return_value = (None, None)
    
    mock_update_result = MagicMock()
    mock_update_result.rowcount = 1
    
    mock_db.execute.side_effect = [
        mock_agent_result,      # SELECT AgentConfigModel (no handle_lead_qualified)
        mock_webhook_result,    # SELECT WebhookConfigModel
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
    
    with patch("lead_scoring_service.calculate_lead_score", new_callable=AsyncMock) as mock_score, \
         patch("zapvoice_utils.sync_conversation_labels", new_callable=AsyncMock) as mock_sync_labels:
        mock_score.return_value = {
            "lead_score": 10,
            "lead_classification": "Quente 🔥",
            "lead_justification": "Lead qualificado com alto interesse."
        }
        
        result = await handle_lead_qualified(
            db=mock_db,
            context_variables=context_vars,
            func_args_str=json.dumps(tool_args),
            agent_id=1
        )
        
        assert "sucesso" in result.lower()
        assert "Etiquetas sincronizadas: Lead-Qualificado, Interessado" in result
        
        mock_sync_labels.assert_called_once_with(
            zapvoice_url="https://zapvoice.example.com",
            client_id="12",
            conversation_id=456,
            token="token_secreto_zv",
            to_add=["Lead-Qualificado", "Interessado"],
            to_remove=[]
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
    mock_webhook.zapvoice_url = "https://zapvoice.example.com"
    mock_webhook.zapvoice_api_token = "token_secreto_zv"
    
    # Simular os retornos de execute do banco
    mock_agent_result = MagicMock()
    mock_agent_result.scalars.return_value.first.return_value = mock_agent
    
    mock_webhook_result = MagicMock()
    mock_webhook_result.scalars.return_value.first.return_value = mock_webhook
    
    # Mock do resultado do UPDATE com rowcount = 0
    mock_update_result = MagicMock()
    mock_update_result.rowcount = 0
    
    mock_lead_row_result = MagicMock()
    mock_lead_row_result.fetchone.return_value = (None, None)
    
    mock_db.execute.side_effect = [
        mock_agent_result,      # SELECT AgentConfigModel (no handle_lead_qualified)
        mock_webhook_result,    # SELECT WebhookConfigModel
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
    
    with patch("lead_scoring_service.calculate_lead_score", new_callable=AsyncMock) as mock_score, \
         patch("zapvoice_utils.sync_conversation_labels", new_callable=AsyncMock) as mock_sync_labels:
        mock_score.return_value = {
            "lead_score": 10,
            "lead_classification": "Quente 🔥",
            "lead_justification": "Novo lead qualificado."
        }
        result = await handle_lead_qualified(
            db=mock_db,
            context_variables=context_vars,
            func_args_str=json.dumps(tool_args),
            agent_id=1
        )
        
        assert "sucesso" in result.lower()
        # Valida que o execute foi chamado com o INSERT
        calls = mock_db.execute.call_args_list
        assert len(calls) == 5
        # O último execute deve conter o comando INSERT
        last_call_sql = str(calls[4][0][0])
        assert "INSERT" in last_call_sql
        assert "leads_cliente_1" in last_call_sql

@pytest.mark.asyncio
async def test_pre_router_greeting_without_qualification_questions(qualification_config):
    from agent_core.logic.pre_router import run_pre_router_ai
    
    # Configurar mensagem inicial específica no config mock
    qualification_config.greeting_mode = "panel"
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
    mock_webhook.zapvoice_url = ""
    mock_webhook.zapvoice_api_token = ""
    
    # Simular os retornos de execute do banco
    mock_agent_result = MagicMock()
    mock_agent_result.scalars.return_value.first.return_value = mock_agent
    
    mock_webhook_result = MagicMock()
    mock_webhook_result.scalars.return_value.first.return_value = mock_webhook
    
    mock_update_result = MagicMock()
    mock_update_result.rowcount = 1
    
    mock_lead_row_result = MagicMock()
    mock_lead_row_result.fetchone.return_value = (None, None)
    
    mock_db.execute.side_effect = [
        mock_agent_result,      # SELECT AgentConfigModel (no handle_lead_qualified)
        mock_webhook_result,    # SELECT WebhookConfigModel
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
             "ZAPVOICE_URL": "https://zapvoice-env.example.com",
             "ZAPVOICE_API_TOKEN": "token_env_secreto",
             "ZAPVOICE_CLIENT_ID": "99"
         }), \
         patch("lead_scoring_service.calculate_lead_score", new_callable=AsyncMock) as mock_score, \
         patch("zapvoice_utils.sync_conversation_labels", new_callable=AsyncMock) as mock_sync_labels:
        mock_score.return_value = {
            "lead_score": 10,
            "lead_classification": "Quente 🔥",
            "lead_justification": "Lead qualificado com alto interesse."
        }
        result = await handle_lead_qualified(
            db=mock_db,
            context_variables=context_vars,
            func_args_str=json.dumps(tool_args),
            agent_id=1
        )
        
        assert "sucesso" in result.lower()
        assert "Etiquetas sincronizadas: Lead-Qualificado, Interessado" in result
        
        mock_sync_labels.assert_called_once_with(
            zapvoice_url="https://zapvoice-env.example.com",
            client_id="99",
            conversation_id=456,
            token="token_env_secreto",
            to_add=["Lead-Qualificado", "Interessado"],
            to_remove=[]
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
        
        assert "QUALIFICAÇÃO DE LEAD & SONDAÇÃO ESTRATÉGICA" in system_msg["content"]
        assert "Qual seu nome?" in system_msg["content"]
        assert "↳ Objetivo / Prompt de Sondagem: Validar se possui pelo menos sobrenome" in system_msg["content"]
        assert "Qual seu email?" in system_msg["content"]


@pytest.mark.asyncio
async def test_qualification_prompt_injection_mixed_questions(qualification_config, lead_qualificado_tool):
    # Mistura de string simples antiga e dicionário estruturado novo com prompt e critérios
    qualification_config.qualification_questions = '["Qual sua empresa?", {"title": "Experiência", "prompt": "Descobrir se já atua na área", "criteria": "Ter respondido sim ou não"}]'
    
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
        
        assert "QUALIFICAÇÃO DE LEAD & SONDAÇÃO ESTRATÉGICA" in system_msg["content"]
        assert "Qual sua empresa?" in system_msg["content"]
        assert "[ETAPA: Experiência]" in system_msg["content"]
        assert "↳ Objetivo / Prompt de Sondagem: Descobrir se já atua na área" in system_msg["content"]
        assert "↳ Critério de Conclusão: Ter respondido sim ou não" in system_msg["content"]
        assert "MENSAGEM COMPOSTA" in system_msg["content"]

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

@pytest.mark.asyncio
async def test_qualification_final_action_injection(qualification_config, lead_qualificado_tool):
    """Valida que qualification_final_action é injetado como regra de fechamento pós-qualificação."""
    qualification_config.qualification_final_action = "Pergunte pro usuário se eu posso enviar o link do curso para ele."
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
        
        assert "AÇÃO / PERGUNTA FINAL DE FECHAMENTO PÓS-QUALIFICAÇÃO" in system_msg["content"]
        assert "Pergunte pro usuário se eu posso enviar o link do curso para ele." in system_msg["content"]

@pytest.mark.asyncio
async def test_lead_already_qualified_suppresses_tool_and_questions(qualification_config, lead_qualificado_tool):
    """Valida que quando o lead já foi qualificado, a ferramenta é suprimida e o prompt informa o status."""
    message = "Qual o valor do curso?"
    history = []
    
    with patch("agent_core.core.get_openai_client") as mock_get_client, \
         patch("agent_core.core.run_pre_router_ai", new_callable=AsyncMock) as mock_pre_router:
        
        mock_pre_router.return_value = {"eh_saudacao": False, "id_agente_alvo": 1, "perguntas_extraidas": message}
        mock_client = MagicMock()
        mock_get_client.return_value = mock_client
        mock_client.chat.completions.create = AsyncMock(return_value=MockResponse("O curso custa R$ 997."))
        
        await process_message(
            message, 
            history, 
            qualification_config, 
            tools=[lead_qualificado_tool],
            context_variables={"lead_already_qualified": True}
        )
        
        called_args, called_kwargs = mock_client.chat.completions.create.call_args
        messages = called_kwargs["messages"]
        system_msg = next(m for m in messages if m["role"] == "system")
        
        # O prompt deve avisar que o lead já está qualificado
        assert "STATUS DO LEAD: JÁ QUALIFICADO ANTERIORMENTE" in system_msg["content"]
        assert "TERMINANTEMENTE PROIBIDO repetir perguntas de qualificação" in system_msg["content"]
        
        # A ferramenta lead_qualificado NÃO deve estar presente na chamada OpenAI
        openai_tools = called_kwargs.get("tools", [])
        tool_names = [t["function"]["name"] for t in openai_tools]
        assert "lead_qualificado" not in tool_names

@pytest.mark.asyncio
async def test_handle_lead_qualified_idempotency(db_session):
    """Valida que o handler de lead_qualificado é estritamente idempotente se o lead já tiver qualificação."""
    from agent_core.tools.handlers.internal import handle_lead_qualified
    from sqlalchemy import text
    
    # Criar tabela de leads de teste
    table_name = "leads_test_idempotency"
    await db_session.execute(text(f"""
        CREATE TABLE IF NOT EXISTS {table_name} (
            id SERIAL PRIMARY KEY,
            webhook_config_id INTEGER,
            telefone VARCHAR(50),
            contato_nome VARCHAR(255),
            labels VARCHAR(255),
            respostas_qualificacao TEXT,
            lead_score INTEGER,
            lead_classification VARCHAR(50),
            lead_justification TEXT,
            qualified_by_agent_id INTEGER,
            pode_enviar_mensagem BOOLEAN,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """))
    
    # Inserir lead já qualificado
    await db_session.execute(text(f"""
        INSERT INTO {table_name} (telefone, contato_nome, respostas_qualificacao, lead_score)
        VALUES ('5511999998888', 'Lead Qualificado', '{{"experiencia": "sim"}}', 85)
    """))
    await db_session.commit()
    
    context_vars = {
        "contact_phone": "5511999998888",
        "leads_table": table_name,
        "webhook_config_id": 1
    }
    
    res = await handle_lead_qualified(db_session, context_vars, '{"respostas": {"experiencia": "sim"}}', agent_id=1)
    assert "já qualificado anteriormente" in res


@pytest.mark.asyncio
async def test_handle_lead_qualified_uses_strictly_configured_labels():
    """
    Garante que a ferramenta lead_qualificado use estritamente as etiquetas
    selecionadas no dropdown do agente (qualification_labels), sem injetar
    a tag hardcoded 'qualificado'.
    """
    mock_db = AsyncMock()
    mock_agent = MagicMock()
    # Apenas a etiqueta escolhida pelo usuário no dropdown
    mock_agent.qualification_labels = '["lead-qualificado"]'
    
    mock_webhook = MagicMock()
    mock_webhook.id = 10
    mock_webhook.zapvoice_url = "https://zapvoice.example.com"
    mock_webhook.zapvoice_api_token = "token_zv_123"
    
    mock_agent_result = MagicMock()
    mock_agent_result.scalars.return_value.first.return_value = mock_agent
    mock_wh_result = MagicMock()
    mock_wh_result.scalars.return_value.first.return_value = mock_webhook
    mock_lead_result = MagicMock()
    mock_lead_result.fetchone.return_value = (None, None)
    mock_update_result = MagicMock()
    mock_update_result.rowcount = 1
    
    mock_db.execute.side_effect = [
        mock_agent_result,
        mock_wh_result,
        mock_lead_result,
        mock_update_result,
    ]
    
    context_vars = {
        "leads_table": "leads_strict_test",
        "contact_phone": "5511999991111",
        "contact_name": "Aryaraj",
        "conversation_id": 999,
        "account_id": 88,
    }
    tool_args = {"respostas": {"nome": "Aryaraj", "email": "aryaraj@teste.com"}}
    
    with patch("lead_scoring_service.calculate_lead_score", new_callable=AsyncMock) as mock_score, \
         patch("zapvoice_utils.sync_conversation_labels", new_callable=AsyncMock) as mock_sync:
        mock_score.return_value = {
            "lead_score": 11,
            "lead_classification": "Quente 🔥",
            "lead_justification": "Lead qualificado."
        }
        result = await handle_lead_qualified(
            db=mock_db,
            context_variables=context_vars,
            func_args_str=json.dumps(tool_args),
            agent_id=1
        )
        assert "sucesso" in result.lower()
        assert "Etiquetas sincronizadas: lead-qualificado." in result
        
        # Valida que sync_conversation_labels recebeu estritamente ['lead-qualificado'] e to_remove vazio
        mock_sync.assert_called_once_with(
            zapvoice_url="https://zapvoice.example.com",
            client_id="88",
            conversation_id=999,
            token="token_zv_123",
            to_add=["lead-qualificado"],
            to_remove=[]
        )
        assert mock_sync.call_args[1]["to_add"] == ["lead-qualificado"]
        assert mock_sync.call_args[1]["to_remove"] == []


@pytest.mark.asyncio
async def test_handle_lead_qualified_does_not_tag_unqualified_cold_lead():
    """
    Garante que se o lead não se qualificar de fato (classificado como Frio ❄️ / desqualificado),
    ele NÃO recebe as etiquetas de qualificação do dropdown e nenhuma tag é adicionada no ZapVoice.
    """
    mock_db = AsyncMock()
    mock_agent = MagicMock()
    mock_agent.qualification_labels = '["lead-qualificado"]'
    mock_agent.qualification_final_action_trigger = 'all'
    mock_agent.qualification_final_action = 'Link: https://exemplo.com'
    
    mock_webhook = MagicMock()
    mock_webhook.id = 10
    mock_webhook.zapvoice_url = "https://zapvoice.example.com"
    mock_webhook.zapvoice_api_token = "token_zv_123"
    
    mock_agent_result = MagicMock()
    mock_agent_result.scalars.return_value.first.return_value = mock_agent
    mock_wh_result = MagicMock()
    mock_wh_result.scalars.return_value.first.return_value = mock_webhook
    mock_lead_result = MagicMock()
    mock_lead_result.fetchone.return_value = (json.dumps(["robo"]), None)
    mock_update_result = MagicMock()
    mock_update_result.rowcount = 1
    
    mock_db.execute.side_effect = [
        mock_agent_result,
        mock_wh_result,
        mock_lead_result,
        mock_update_result,
    ]
    
    context_vars = {
        "leads_table": "leads_cold_test",
        "contact_phone": "5511999992222",
        "contact_name": "Lead Desinteressado",
        "conversation_id": 1001,
        "account_id": 88,
    }
    tool_args = {"respostas": {"nome": "Aryaraj", "interesse": "nenhum", "orcamento": "zero"}}
    
    with patch("lead_scoring_service.calculate_lead_score", new_callable=AsyncMock) as mock_score, \
         patch("zapvoice_utils.sync_conversation_labels", new_callable=AsyncMock) as mock_sync:
        # IA avalia o lead como Frio ❄️ (desqualificado)
        mock_score.return_value = {
            "lead_score": 0,
            "lead_classification": "Frio ❄️",
            "lead_justification": "Lead sem interesse e sem orçamento para o produto."
        }
        
        result = await handle_lead_qualified(
            db=mock_db,
            context_variables=context_vars,
            func_args_str=json.dumps(tool_args),
            agent_id=1
        )
        
        # Resultado da ferramenta informa que foi avaliado mas NÃO qualificado
        assert "Nenhuma etiqueta de qualificação aplicada" in result
        assert "Frio ❄️" in result
        
        # sync_conversation_labels é chamado com to_add vazio e remove apenas lead-qualificado
        mock_sync.assert_called_once_with(
            zapvoice_url="https://zapvoice.example.com",
            client_id="88",
            conversation_id=1001,
            token="token_zv_123",
            to_add=[],
            to_remove=["lead-qualificado"]
        )
        assert mock_sync.call_args[1]["to_add"] == []
        
        # Valida que o UPDATE no banco gravou apenas ['robo'] em labels, sem lead-qualificado
        update_call = mock_db.execute.call_args_list[-1]
        saved_labels = update_call[0][1]["labels"]
        assert "lead-qualificado" not in saved_labels


@pytest.mark.asyncio
async def test_handle_lead_qualified_cleans_legacy_qualificado_tag():
    """
    Garante que se o lead já possuía a tag legada 'qualificado' salva anteriormente,
    ao se qualificar de fato com a tag do dropdown 'lead-qualificado', a tag 'qualificado'
    é removida e apenas 'lead-qualificado' e tags legítimas são mantidas.
    """
    mock_db = AsyncMock()
    mock_agent = MagicMock()
    mock_agent.qualification_labels = '["lead-qualificado"]'
    mock_agent.qualification_final_action_trigger = 'all'
    mock_agent.qualification_funnels = json.dumps([{"id": "funnel_default", "name": "Padrão", "labels": ["lead-qualificado"], "labels_to_remove": ["qualificado"]}])
    
    mock_webhook = MagicMock()
    mock_webhook.id = 10
    mock_webhook.zapvoice_url = "https://zapvoice.example.com"
    mock_webhook.zapvoice_api_token = "token_zv_123"
    
    mock_agent_result = MagicMock()
    mock_agent_result.scalars.return_value.first.return_value = mock_agent
    mock_wh_result = MagicMock()
    mock_wh_result.scalars.return_value.first.return_value = mock_webhook
    # Lead no banco possuía 'qualificado' legado e 'robo'
    mock_lead_result = MagicMock()
    mock_lead_result.fetchone.return_value = (json.dumps(["qualificado", "robo"]), None)
    mock_update_result = MagicMock()
    mock_update_result.rowcount = 1
    
    mock_db.execute.side_effect = [
        mock_agent_result,
        mock_wh_result,
        mock_lead_result,
        mock_update_result,
    ]
    
    context_vars = {
        "leads_table": "leads_clean_test",
        "contact_phone": "5511999993333",
        "contact_name": "Lead Teste Limpeza",
        "conversation_id": 1002,
        "account_id": 88,
    }
    tool_args = {"respostas": {"nome": "Teste", "interesse": "alto"}}
    
    with patch("lead_scoring_service.calculate_lead_score", new_callable=AsyncMock) as mock_score, \
         patch("zapvoice_utils.sync_conversation_labels", new_callable=AsyncMock) as mock_sync:
        mock_score.return_value = {
            "lead_score": 12,
            "lead_classification": "Quente 🔥",
            "lead_justification": "Lead altamente qualificado."
        }
        
        result = await handle_lead_qualified(
            db=mock_db,
            context_variables=context_vars,
            func_args_str=json.dumps(tool_args),
            agent_id=1
        )
        
        assert "sucesso" in result.lower()
        assert "Etiquetas sincronizadas: lead-qualificado." in result
        
        # Valida que sync_conversation_labels removeu 'qualificado'
        mock_sync.assert_called_once_with(
            zapvoice_url="https://zapvoice.example.com",
            client_id="88",
            conversation_id=1002,
            token="token_zv_123",
            to_add=["lead-qualificado"],
            to_remove=["qualificado"]
        )
        
        # Valida que o UPDATE no banco gravou ['robo', 'lead-qualificado'] SEM 'qualificado'
        update_call = mock_db.execute.call_args_list[-1]
        saved_labels = json.loads(update_call[0][1]["labels"])
        assert "qualificado" not in saved_labels
        assert "lead-qualificado" in saved_labels
        assert "robo" in saved_labels


@pytest.mark.asyncio
async def test_qualification_confidentiality_instructions(qualification_config, lead_qualificado_tool):
    """
    Testa se o prompt de qualificação e o handler de retorno proíbem expressamente
    que a IA mencione ao cliente termos técnicos como 'você está qualificado para prosseguir'.
    """
    from agent_core.logic.qualification_prompt import build_qualification_prompt
    
    prompt = build_qualification_prompt(qualification_config, tools=[lead_qualificado_tool])
    assert "SIGILO ABSOLUTO DO PROCESSO DE QUALIFICAÇÃO" in prompt
    assert "você está qualificado para prosseguir" in prompt
    assert "TERMOS PROIBIDOS" in prompt

    # Mock DB para handle_lead_qualified
    mock_db = AsyncMock()
    mock_agent = MagicMock()
    mock_agent.qualification_labels = '["Lead-Qualificado"]'
    mock_agent.qualification_final_action = "Pergunte se posso enviar o link do curso."
    mock_agent.qualification_final_action_trigger = "all"

    mock_agent_result = MagicMock()
    mock_agent_result.scalars.return_value.first.return_value = mock_agent

    mock_db.execute.return_value = mock_agent_result

    result = await handle_lead_qualified(
        db=mock_db,
        context_variables={"leads_table": None, "contact_phone": None},
        func_args_str=json.dumps({"respostas": {"nome": "Aryaraj"}}),
        agent_id=1
    )

    assert "SIGILO ABSOLUTO" in result
    assert "você está qualificado para prosseguir" in result
    assert "É expressamente proibido dizer ao cliente frases como" in result


@pytest.mark.asyncio
async def test_tool_retry_limit_circuit_breaker(qualification_config, lead_qualificado_tool):
    """
    Valida que se uma ferramenta falhar (erro ou exceção), o agente permite no máximo
    uma 2ª tentativa (retry) e, se falhar novamente, bloqueia novas chamadas da ferramenta
    e instrui a IA a informar instabilidade temporária ao invés de rodar 5 vezes em loop.
    """
    message = "Meu nome é Aryaraj e meu e-mail é aryaraj@gmail.com"
    history = []
    
    mock_tool_call = MagicMock()
    mock_tool_call.id = "call_lead_qual"
    mock_tool_call.function.name = "lead_qualificado"
    mock_tool_call.function.arguments = json.dumps({"respostas": {"nome": "Aryaraj"}})
    
    # Simula a LLM insistindo em chamar lead_qualificado a cada iteração
    response_with_tool = MockResponse("", tool_calls=[mock_tool_call])
    response_final_text = MockResponse("Desculpe pelo transtorno, tivemos uma instabilidade momentânea no sistema.")
    
    call_count = 0
    async def mock_chat_create(*args, **kwargs):
        nonlocal call_count
        call_count += 1
        tools_passed = kwargs.get("tools", [])
        tool_names = [t.get("function", {}).get("name") for t in tools_passed]
        
        # Se a ferramenta ainda estiver na lista e for iteração 1 ou 2, pede tool call
        if "lead_qualificado" in tool_names:
            return response_with_tool
        # Se foi removida pelo circuit breaker, gera a resposta final em texto
        return response_final_text

    with patch("agent_core.core.get_openai_client") as mock_get_client, \
         patch("agent_core.core.run_pre_router_ai", new_callable=AsyncMock) as mock_pre_router, \
         patch("agent_core.core.handle_lead_qualified", new_callable=AsyncMock) as mock_handler:
        
        mock_pre_router.return_value = {"eh_saudacao": False, "id_agente_alvo": 1, "perguntas_extraidas": message}
        mock_client = MagicMock()
        mock_get_client.return_value = mock_client
        mock_client.chat.completions.create = mock_chat_create
        
        # Simula erro na ferramenta
        mock_handler.return_value = "ERRO: Instabilidade temporária no servidor."
        
        result = await process_message(message, history, qualification_config, tools=[lead_qualificado_tool])
        
        # A ferramenta lead_qualificado DEVE ter sido acionada no máximo 2 vezes (1ª tentativa + 1 retry)
        assert mock_handler.call_count == 2
        # E o loop NÃO rodou 5 vezes
        assert call_count <= 3
        assert "instabilidade" in result["content"].lower() or "desculpe" in result["content"].lower()


@pytest.mark.asyncio
async def test_qualification_tool_preserved_when_pre_router_precisa_ferramenta_false(qualification_config, lead_qualificado_tool):
    """
    Valida que quando o Pre-Router identifica uma mensagem de dados/e-mail (precisa_ferramenta: False, precisa_rag: False),
    a ferramenta 'lead_qualificado' NÃO é removida de openai_tools, permitindo que o LLM a acione normalmente.
    """
    message = "aryarajunity@gmail.com"
    history = [{"role": "assistant", "content": "Por favor, me informe seu e-mail para continuarmos."}]
    
    with patch("agent_core.core.get_openai_client") as mock_get_client, \
         patch("agent_core.core.run_pre_router_ai", new_callable=AsyncMock) as mock_pre_router:
        
        # Pre-Router informa que NÃO precisa de ferramenta externa nem de RAG
        mock_pre_router.return_value = {
            "eh_saudacao": False,
            "id_agente_alvo": 1,
            "perguntas_extraidas": "aryarajunity@gmail.com",
            "precisa_ferramenta": False,
            "precisa_rag": False,
            "tipo_mensagem": "Resposta de Dados / E-mail do Usuário"
        }
        mock_client = MagicMock()
        mock_get_client.return_value = mock_client
        mock_client.chat.completions.create = AsyncMock(return_value=MockResponse("Recebido! Posso enviar o link?"))
        
        await process_message(message, history, qualification_config, tools=[lead_qualificado_tool])
        
        called_args, called_kwargs = mock_client.chat.completions.create.call_args
        tools = called_kwargs.get("tools", [])
        tool_names = [t["function"]["name"] for t in tools]
        
        # A ferramenta lead_qualificado DEVE estar presente em tools enviadas para a OpenAI
        assert "lead_qualificado" in tool_names



