import os
import json
import pytest
from httpx import Response
from respx import MockRouter
from datetime import datetime

from main import app  # assuming FastAPI app is exported from main.py
from models import WebhookConfigModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, text
from database import engine as global_engine

# Helper to create a webhook config with empty Chatwoot fields
async def create_config(db: AsyncSession, token: str):
    config = WebhookConfigModel(
        name="Teste",
        token=token,
        leads_table="leads",
        is_active=True,
        delay_seconds=0,
        zapvoice_url=None,
        zapvoice_api_token=None,
    )
    db.add(config)
    await db.commit()
    await db.refresh(config)
    return config

async def create_config_with_table(db: AsyncSession, token: str, table_name: str):
    config = WebhookConfigModel(
        name="Teste Outgoing",
        token=token,
        leads_table=table_name,
        is_active=True,
        delay_seconds=0,
        zapvoice_url=None,
        zapvoice_api_token=None,
    )
    db.add(config)
    await db.commit()
    await db.refresh(config)
    return config

@pytest.mark.asyncio
async def test_receive_webhook_uses_env_vars(client, db_session, monkeypatch, respx_mock: MockRouter):
    # Descartar conexões do pool global da aplicação para garantir snapshots limpos
    try:
        await global_engine.dispose()
    except TypeError:
        global_engine.dispose()

    # Set environment variables that should be used as fallback
    monkeypatch.setenv("CHATWOOT_URL", "https://example.chatwoot.com")
    monkeypatch.setenv("CHATWOOT_API_TOKEN", "test-token")

    # Mock the Chatwoot label API call
    cw_url = "https://example.chatwoot.com/api/v1/accounts/1/conversations/123/labels"
    respx_mock.get(cw_url).mock(return_value=Response(200, json={"payload": []}))
    respx_mock.post(cw_url).mock(return_value=Response(200, json={"payload": []}))

    token = "dummy-token"
    await create_config(db_session, token)

    payload = {
        "event": "message_created",
        "content": "Olá",
        "conversation": {"id": 123, "account_id": 1, "inbox_id": 10, "labels": []},
        "sender": {"id": 5, "name": "Teste", "phone_number": "+123456789"},
        "inbox": {"id": 10, "name": "Inbox Test"},
        "account": {"id": 1},
        "message_type": "incoming",
    }

    response = await client.post(f"/webhooks/receive/{token}", json=payload)
    
    assert response.status_code == 200
    data = response.json()
    assert data["ok"] is True
    assert "event_id" in data

@pytest.mark.asyncio
async def test_receive_webhook_outgoing_extracts_correct_sender(client, db_session, db_engine, monkeypatch, respx_mock: MockRouter):
    # Descartar conexões do pool global da aplicação para garantir snapshots limpos
    try:
        await global_engine.dispose()
    except TypeError:
        global_engine.dispose()

    # Set environment variables that should be used as fallback
    monkeypatch.setenv("CHATWOOT_URL", "https://example.chatwoot.com")
    monkeypatch.setenv("CHATWOOT_API_TOKEN", "test-token")

    # Mock the Chatwoot label API call
    cw_url = "https://example.chatwoot.com/api/v1/accounts/1/conversations/123/labels"
    respx_mock.get(cw_url).mock(return_value=Response(200, json={"payload": []}))
    respx_mock.post(cw_url).mock(return_value=Response(200, json={"payload": []}))

    token = "outgoing-token"
    table_name = "leads_outgoing"
    config = await create_config_with_table(db_session, token, table_name)
    
    # Criamos a tabela dinâmica de leads_outgoing exclusivamente para este teste
    # e inserimos o lead de baseline prévio usando o db_engine no mesmo loop do pytest.
    # Isso evita qualquer poluição ou concorrência com o primeiro teste na tabela padrão "leads".
    async with db_engine.begin() as conn:
        from webhooks.service import LEADS_TABLE_DDL
        await conn.execute(text(LEADS_TABLE_DDL.format(table=table_name)))
        
        await conn.execute(text(f"DELETE FROM {table_name}"))
        
        now_utc = datetime.utcnow()
        await conn.execute(text(f"""
            INSERT INTO {table_name} (webhook_config_id, telefone, contato_nome, mensagem, created_at, updated_at)
            VALUES (:webhook_config_id, '5511999999999', 'Cliente Antigo', 'Oi', :now, :now)
        """), {"webhook_config_id": config.id, "now": now_utc})

    payload = {
        "event": "message_created",
        "content": "Olá cliente, sou a IA",
        "conversation": {
            "id": 123, 
            "account_id": 1, 
            "inbox_id": 10, 
            "labels": [],
            "meta": {
                "sender": {
                    "id": 100,
                    "name": "Cliente Real",
                    "phone_number": "+5511999999999"
                }
            }
        },
        "sender": {"id": 5, "name": "IA (Agente)", "phone_number": None},
        "inbox": {"id": 10, "name": "Inbox Test"},
        "account": {"id": 1},
        "message_type": "outgoing",
    }

    response = await client.post(f"/webhooks/receive/{token}", json=payload)
    assert response.status_code == 200
    
    # Expiramos todos os caches para fazer um SELECT real no banco de dados de teste
    db_session.expire_all()
    
    # Consultamos a tabela dinâmica de leads diretamente usando o db_engine do teste para validar o update!
    async with db_engine.begin() as conn:
        res = await conn.execute(text(f"SELECT contato_nome FROM {table_name}"))
        row = res.fetchone()
        assert row is not None
        # O lead antigo deve ter sido atualizado com o nome do contato real extraído do meta sender!
        assert row[0] == "Cliente Real"
        
        # Limpar a tabela dinâmica de teste
        await conn.execute(text(f"DROP TABLE IF EXISTS {table_name}"))

@pytest.mark.asyncio
async def test_webhook_debounce_grouping_only_if_waiting(client, db_session, monkeypatch, respx_mock: MockRouter, mocker):
    # Descartar conexões do pool global da aplicação para garantir snapshots limpos
    try:
        await global_engine.dispose()
    except TypeError:
        global_engine.dispose()

    mocker.patch("webhooks.receiver.process_webhook_automation.apply_async")

    # Set environment variables
    monkeypatch.setenv("CHATWOOT_URL", "https://example.chatwoot.com")
    monkeypatch.setenv("CHATWOOT_API_TOKEN", "test-token")

    # Mock the Chatwoot label API call
    cw_url = "https://example.chatwoot.com/api/v1/accounts/1/conversations/123/labels"
    respx_mock.get(cw_url).mock(return_value=Response(200, json={"payload": []}))
    respx_mock.post(cw_url).mock(return_value=Response(200, json={"payload": []}))

    # Limpar qualquer debounce residual no Redis para o número de teste
    import redis as redis_lib
    redis_url = os.getenv("REDIS_URL", "redis://localhost:6382/0")
    try:
        _redis = redis_lib.from_url(redis_url, decode_responses=True)
        _redis.ping()
    except Exception:
        _redis = redis_lib.from_url("redis://localhost:6382/0", decode_responses=True)
        
    try:
        _redis.delete("webhook:debounce:id:999:+5511999999999")
        _redis.delete("webhook:debounce:text:999:+5511999999999")
    except Exception:
        pass

    # Criar uma config de webhook com delay_seconds = 10 para ativar agrupamento
    from models import WebhookConfigModel
    config = WebhookConfigModel(
        id=999,
        name="Debounce Test",
        token="debounce-token",
        leads_table="leads",
        is_active=True,
        delay_seconds=10,
        zapvoice_url=None,
        zapvoice_api_token=None,
    )
    db_session.add(config)
    await db_session.commit()

    # 1. Enviar primeira mensagem ("oie")
    payload1 = {
        "event": "message_created",
        "content": "oie",
        "conversation": {"id": 123, "account_id": 1, "inbox_id": 10, "labels": []},
        "sender": {"id": 5, "name": "Arya", "phone_number": "+5511999999999"},
        "inbox": {"id": 10, "name": "Inbox Test"},
        "account": {"id": 1},
        "message_type": "incoming",
    }
    
    response1 = await client.post("/webhooks/receive/debounce-token", json=payload1)
    assert response1.status_code == 200
    
    data1 = response1.json()
    event1_id = data1.get("event_id")
    assert event1_id is not None
    
    # Expiramos todos os caches antes da busca assíncrona
    db_session.expire_all()
    
    # Buscamos colunas cruas via query SQL para prevenir erros de MissingGreenlet do SQLAlchemy
    from models import WebhookEventModel
    res_first = await db_session.execute(
        select(WebhookEventModel.mensagem, WebhookEventModel.status)
        .where(WebhookEventModel.id == event1_id)
    )
    row_first = res_first.fetchone()
    assert row_first is not None
    assert row_first[0] == "oie"
    assert row_first[1] == "waiting"
    
    # Simular que a automação falhou ou deu erro de "Sem agente configurado", 
    # mudando o status de "waiting" para "failed" usando UPDATE direto via SQL (previne MissingGreenlet)
    await db_session.execute(
        update(WebhookEventModel)
        .where(WebhookEventModel.id == event1_id)
        .values(status="failed")
    )
    await db_session.commit()

    # 2. Enviar segunda mensagem consecutiva ("oieoie")
    payload2 = {
        "event": "message_created",
        "content": "oieoie",
        "conversation": {"id": 123, "account_id": 1, "inbox_id": 10, "labels": []},
        "sender": {"id": 5, "name": "Arya", "phone_number": "+5511999999999"},
        "inbox": {"id": 10, "name": "Inbox Test"},
        "account": {"id": 1},
        "message_type": "incoming",
    }
    
    response2 = await client.post("/webhooks/receive/debounce-token", json=payload2)
    assert response2.status_code == 200
    
    data2 = response2.json()
    event2_id = data2.get("event_id")
    assert event2_id is not None

    # Expiramos todos os caches para carregar o segundo evento e o primeiro atualizado
    db_session.expire_all()

    # 3. Validar que o primeiro evento NÃO foi marcado como "grouped" (pois já estava failed)
    # e que o segundo evento foi criado separadamente sem a concatenação "oie\n\noieoie"
    res1_check = await db_session.execute(
        select(WebhookEventModel.status)
        .where(WebhookEventModel.id == event1_id)
    )
    status_first = res1_check.scalar()
    assert status_first == "failed" # Continua failed, não agrupou!
    
    res2_check = await db_session.execute(
        select(WebhookEventModel.mensagem)
        .where(WebhookEventModel.id == event2_id)
    )
    msg_second = res2_check.scalar()
    assert msg_second == "oieoie"
