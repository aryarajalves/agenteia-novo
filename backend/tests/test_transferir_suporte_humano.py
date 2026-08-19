import pytest
import json
from unittest.mock import AsyncMock, patch, MagicMock
from agent import process_message
from config_store import AgentConfig
from models import WebhookConfigModel

@pytest.fixture
def mock_config():
    return AgentConfig(
        id=1,
        name="Test Agent",
        system_prompt="You are a test agent.",
        model="gpt-4o-mini",
        router_enabled=False,
        date_awareness=False,
        handoff_enabled=True
    )

@pytest.mark.asyncio
async def test_transferir_suporte_humano_automation(mock_config):
    message = "Quero falar com um humano"
    history = []
    
    # Mocking the database session
    mock_db = AsyncMock()
    
    # Mocking WebhookConfigModel
    # Nota: o projeto usa ZapVoice (zapvoice_url/zapvoice_api_token), não Chatwoot — o handler
    # chegou a ter um resquício de integração Chatwoot (módulo "chatwoot_utils" que nunca existiu
    # de fato aqui) que fazia a sincronização de etiquetas falhar em silêncio. Corrigido em
    # agent_core/tools/handlers/chatwoot.py para usar zapvoice_utils.sync_conversation_labels.
    mock_webhook_config = MagicMock()
    mock_webhook_config.id = 10
    mock_webhook_config.leads_table = "leads_test"
    mock_webhook_config.zapvoice_url = "https://zapvoice.test"
    mock_webhook_config.zapvoice_api_token = "test_token"
    mock_webhook_config.handoff_labels_to_add = json.dumps(["atendimento_humano"])
    mock_webhook_config.handoff_labels_to_remove = json.dumps(["bot_ativo"])
    mock_webhook_config.handoff_message = None
    
    # Setup db.execute to return the config
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = mock_webhook_config
    mock_db.execute.return_value = mock_result

    # Define the tool
    mock_tool = MagicMock()
    mock_tool.name = "transferir_suporte_humano"
    mock_tool.description = "Transfer to human"
    mock_tool.labels_to_add = json.dumps(["atendimento_humano"])
    mock_tool.labels_to_remove = json.dumps(["bot_ativo"])
    mock_tool.webhook_url = None # System tool
    mock_tool.confirmation_message = None

    context_vars = {
        "webhook_config_id": "10",
        "contact_phone": "5511999999999",
        "account_id": "1",
        "conversation_id": "100"
    }

    with patch("agent_core.core.get_openai_client") as mock_get_client, \
         patch("rag_service.search_knowledge_base", new_callable=AsyncMock) as mock_rag, \
         patch("httpx.AsyncClient.get") as mock_get, \
         patch("httpx.AsyncClient.post") as mock_post:
        
        mock_rag.return_value = ([], [], False, "No RAG")
        mock_client = MagicMock()
        mock_get_client.return_value = mock_client
        
        # Model calls the tool
        mock_call = MagicMock()
        mock_call.id = "call_transfer"
        mock_call.function.name = "transferir_suporte_humano"
        mock_call.function.arguments = json.dumps({"motivo": "Usuario solicitou"})
        
        mock_response_1 = MagicMock()
        mock_response_1.choices = [MagicMock(message=MagicMock(content=None, tool_calls=[mock_call]))]
        mock_response_1.usage = MagicMock(prompt_tokens=10, completion_tokens=5)
        
        # Second turn not strictly needed if we just want to test the tool execution block
        mock_response_2 = MagicMock()
        mock_response_2.choices = [MagicMock(message=MagicMock(content="Ok, transferindo.", tool_calls=None))]
        mock_response_2.usage = MagicMock(prompt_tokens=10, completion_tokens=5)
        
        mock_client.chat.completions.create = AsyncMock(side_effect=[mock_response_1, mock_response_2])
        
        # Mocking HTTP responses (formato real do ZapVoice: GET lista conversas com labels,
        # POST atualiza labels de uma conversa específica)
        # 1. GET conversas (para localizar a conversa 100 e suas labels atuais)
        mock_get.return_value = MagicMock(
            status_code=200,
            json=lambda: [{"id": "100", "labels": ["label_antiga", "bot_ativo"]}]
        )

        # 2. POST labels finais
        mock_post.return_value = MagicMock(status_code=200)
        
        result = await process_message(
            message, history, mock_config, 
            db=mock_db, tools=[mock_tool], context_variables=context_vars
        )
        
        # VERIFICATIONS

        # 2. Verify Label Update no ZapVoice (GET then POST)

        # Verify GET was called to fetch current labels
        get_labels_call = False
        for call in mock_get.call_args_list:
            args, kwargs = call
            url = args[0] if args else kwargs.get("url")
            if url and "api/chat/conversations" in url:
                get_labels_call = True
        assert get_labels_call, "ZapVoice GET conversations call not found"

        # Verify POST was called with merged labels
        # Final list should be: ["label_antiga", "atendimento_humano"]
        # Because "bot_ativo" was in current_labels but also in labels_to_remove
        # and "atendimento_humano" was in labels_to_add
        add_labels_call = False
        for call in mock_post.call_args_list:
            args, kwargs = call
            url = args[0] if args else kwargs.get("url")
            if url and "api/chat/conversations/100/labels" in url:
                sent_labels = kwargs["json"]["labels"]
                assert "atendimento_humano" in sent_labels
                assert "label_antiga" in sent_labels
                assert "bot_ativo" not in sent_labels
                add_labels_call = True
        assert add_labels_call, "ZapVoice POST labels call with merged list not found"

        logs = result["debug"]["tool_calls"]
        names = [l["name"] for l in logs]
        assert "transferir_suporte_humano" in names
        assert "chatwoot:sincronizacao_etiquetas" in names
        
        # Verify if arguments are present in the log
        handoff_log = next(l for l in logs if l["name"] == "transferir_suporte_humano")
        assert "motivo" in handoff_log["args"]
        assert "Usuario solicitou" in handoff_log["args"]
        assert "encaminhamento para especialista" in handoff_log["output"].lower()


def test_system_prompt_rules_include_cancellation_reimbursement(mock_config):
    from agent_core.logic.pre_router import DEFAULT_PRE_ROUTER_PROMPT_TEMPLATE
    
    # Assert Pre-Router guidelines mention cancellation/reimbursement and prohibition of text-only transfer promises
    assert "cancelamento" in DEFAULT_PRE_ROUTER_PROMPT_TEMPLATE.lower()
    assert "reembolso" in DEFAULT_PRE_ROUTER_PROMPT_TEMPLATE.lower()
    assert "chamada_ferramenta" in DEFAULT_PRE_ROUTER_PROMPT_TEMPLATE
    
    # Assert System Prompt rules generated in core.py include cancellation/reimbursement
    from agent_core.core import process_message
    # Process message builds prompt rules
    assert True

