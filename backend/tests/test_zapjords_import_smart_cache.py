import pytest
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, patch, MagicMock
from sqlalchemy import text
from models import WebhookConfigModel, WebhookEventModel
from webhooks.import_chat import run_chat_import_task


@pytest.mark.asyncio
async def test_smart_cache_skips_http_when_messages_match(db_session):
    """Testa que quando o lead já existe com a mesma data e possui mensagens no banco,
    a chamada HTTP para /messages é ignorada (otimização inteligente)."""
    config = WebhookConfigModel(
        name="Smart Cache Webhook",
        token="smart-cache-token",
        leads_table="leads",
        is_active=True,
        zapvoice_url="https://api.zapvoice-mock.shop",
        zapvoice_api_token="valid-token",
        zapvoice_client_id="12345"
    )
    db_session.add(config)
    await db_session.commit()
    await db_session.refresh(config)

    now_dt = datetime(2026, 9, 17, 12, 0, 0)
    iso_now = "2026-09-17T12:00:00Z"

    # Cria lead existente no banco com a mesma data
    await db_session.execute(text("""
        INSERT INTO leads (
            webhook_config_id, conta_id, conversa_id, telefone, contato_nome,
            mensagem, pode_enviar_mensagem, ultima_mensagem_em, created_at, updated_at
        ) VALUES (
            :wid, '12345', 'conv_cache_1', '5511999990001', 'Lead Existente',
            'Última mensagem conhecida', TRUE, :last_msg, :now, :now
        )
    """), {"wid": config.id, "last_msg": now_dt, "now": now_dt})

    # Cria evento de mensagem associado a essa conversa
    event = WebhookEventModel(
        webhook_config_id=config.id,
        event_type="message_created",
        message_type="text",
        conversa_id="conv_cache_1",
        mensagem_id="msg_cache_1",
        telefone="5511999990001",
        mensagem="Mensagem pré-existente",
        status="completed",
        dono="usuario",
        created_at=now_dt,
        updated_at=now_dt
    )
    db_session.add(event)
    await db_session.commit()

    # Mock das respostas HTTP do ZapVoice
    mock_conversations = {
        "conversations": [
            {
                "id": "conv_cache_1",
                "phone": "5511999990001",
                "contact_name": "Lead Existente",
                "last_message_content": "Última mensagem conhecida",
                "last_message_at": iso_now
            }
        ],
        "total_count": 1
    }

    mock_client = AsyncMock()

    async def mock_get(url, **kwargs):
        resp = MagicMock()
        resp.status_code = 200
        if "/api/chat/conversations/" in url and "/messages" in url:
            # Não deve ser chamado se o cache funcionar!
            resp.json.return_value = [{"id": "msg_should_not_call", "content": "Não deve chamar"}]
            return resp
        elif "/api/chat/conversations" in url:
            resp.json.return_value = mock_conversations
            return resp
        resp.status_code = 404
        return resp

    mock_client.get.side_effect = mock_get

    with patch("httpx.AsyncClient") as mock_async_client_cls:
        mock_async_client_cls.return_value.__aenter__.return_value = mock_client
        with patch("webhooks.import_chat.manager.broadcast", new=AsyncMock()):
            await run_chat_import_task(config.id)

    # Verifica se a chamada para /messages foi evitada!
    get_calls = [call.args[0] for call in mock_client.get.call_args_list if call.args]
    message_calls = [url for url in get_calls if "/messages" in url]
    assert len(message_calls) == 0, f"Chamadas HTTP desnecessárias foram feitas: {message_calls}"
