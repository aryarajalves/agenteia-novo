import pytest
import json
from unittest.mock import AsyncMock, patch, MagicMock
from models import WebhookEventModel, WebhookConfigModel

@pytest.mark.asyncio
async def test_list_webhook_events_filters_agent_memory_echos():
    from webhooks.router import list_webhook_events
    
    mock_db = AsyncMock()
    
    # Simula o banco retornando o evento original do usuario (3230) com a agent_response,
    # e 2 eventos de memoria de agente (3231, 3232) que sao apenas echos da mesma resposta da IA.
    items_rows = [
        (3232, 1, "memory", "text", "c1", "i1", "inbox", "conv1", "m3", "ct1", "5511999999999", "[]", "Cintia", "Sobre o custo de locação: ele varia bastante por fornecedor", None, "completed", None, None, None, "agente", None, None, None, False),
        (3231, 1, "memory", "text", "c1", "i1", "inbox", "conv1", "m2", "ct1", "5511999999999", "[]", "Cintia", "Vou te transferir para outro setor para te ajudar com o cancelamento", None, "completed", None, None, None, "agente", None, None, None, False),
        (3230, 1, "message", "text", "c1", "i1", "inbox", "conv1", "m1", "ct1", "5511999999999", "[]", "Cintia", "Boa tarde eu comprei ontem o curso mais não quero mais", None, "completed", None, "Vou te transferir para outro setor para te ajudar com o cancelamento e solicitar o reembolso. Sobre o custo de locação: ele varia bastante por fornecedor", None, "usuario", None, None, None, False),
    ]
    
    mock_res_count = MagicMock()
    mock_res_count.scalar.return_value = 3
    
    mock_res_items = MagicMock()
    mock_res_items.keys.return_value = [
        "id", "webhook_config_id", "event_type", "message_type", "conta_id", "inbox_id", "inbox_nome",
        "conversa_id", "mensagem_id", "contato_id", "telefone", "labels", "contato_nome", "mensagem",
        "link", "status", "task_id", "agent_response", "legenda", "dono", "scheduled_at", "created_at",
        "updated_at", "is_automatic"
    ]
    mock_res_items.fetchall.return_value = items_rows
    
    mock_db.execute.side_effect = [mock_res_count, mock_res_items]
    mock_db.bind.dialect.name = "postgresql"
    
    res = await list_webhook_events(webhook_id=1, db=mock_db, event_type="all")
    
    # Verifica se os eventos 3231 e 3232 (echos da resposta do agente) foram filtrados do retorno visual
    returned_ids = [item["id"] for item in res["items"]]
    assert 3230 in returned_ids
    assert 3231 not in returned_ids
    assert 3232 not in returned_ids
    assert len(res["items"]) == 1
