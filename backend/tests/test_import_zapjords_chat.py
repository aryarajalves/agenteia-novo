import pytest
import json
from unittest.mock import patch, AsyncMock, MagicMock
from fastapi import HTTPException
from httpx import Response

from models import WebhookConfigModel, WebhookEventModel
from webhooks.import_chat import (
    import_chat_from_zapjords,
    run_chat_import_task,
    _ACTIVE_IMPORTS,
    to_naive_datetime,
    to_aware_utc,
    is_system_or_badge_message,
)
from datetime import datetime, timezone, timedelta


@pytest.mark.asyncio
async def test_import_chat_endpoint_validation():
    """Valida erros de validação do endpoint (webhook 404 ou credenciais ausentes)."""
    db_mock = AsyncMock()
    
    # 1. Webhook não encontrado
    db_mock.get.return_value = None
    with pytest.raises(HTTPException) as exc_info:
        await import_chat_from_zapjords(webhook_id=999, db=db_mock)
    assert exc_info.value.status_code == 404

    # 2. Credenciais ausentes
    cfg = WebhookConfigModel(id=1, name="Teste", leads_table="leads", zapvoice_url=None, zapvoice_api_token=None)
    db_mock.get.return_value = cfg
    with patch.dict("os.environ", {"ZAPVOICE_URL": "", "ZAPVOICE_API_TOKEN": ""}):
        with pytest.raises(HTTPException) as exc_info:
            await import_chat_from_zapjords(webhook_id=1, db=db_mock)
        assert exc_info.value.status_code == 400


@pytest.mark.asyncio
async def test_import_chat_endpoint_success():
    """Valida início com sucesso da importação quando configurado."""
    db_mock = AsyncMock()
    cfg = WebhookConfigModel(
        id=10,
        name="Teste Webhook",
        leads_table="leads",
        zapvoice_url="https://api.zapjords.test",
        zapvoice_api_token="token_123",
        zapvoice_client_id="42"
    )
    db_mock.get.return_value = cfg

    _ACTIVE_IMPORTS.clear()
    with patch("asyncio.create_task") as mock_create_task:
        res = await import_chat_from_zapjords(webhook_id=10, db=db_mock)
        assert res["ok"] is True
        assert res["active"] is True
        mock_create_task.assert_called_once()


@pytest.mark.asyncio
async def test_run_chat_import_task_creates_leads_and_messages():
    """Valida o fluxo completo de importação com criação de contatos (followup_step = -1) e ingestão de mensagens."""
    _ACTIVE_IMPORTS.clear()

    # Mocks de dados do ZapJords
    mock_conversations_p1 = {
        "conversations": [
            {
                "id": 101,
                "client_id": 42,
                "phone": "5511999990001",
                "contact_name": "Maria Silva",
                "last_message_content": "Olá, quanto custa?",
                "last_message_at": "2026-09-17T10:00:00Z",
                "labels": ["interessado"]
            }
        ],
        "total_count": 1,
        "page": 1,
        "limit": 100
    }

    mock_messages_101 = [
        {
            "id": 1001,
            "conversation_id": 101,
            "sender_type": "contact",
            "message_type": "text",
            "content": "Olá, quanto custa?",
            "media_url": None,
            "timestamp": "2026-09-17T10:00:00Z"
        },
        {
            "id": 1002,
            "conversation_id": 101,
            "sender_type": "agent",
            "message_type": "text",
            "content": "Olá Maria! Custa R$ 97.",
            "media_url": None,
            "timestamp": "2026-09-17T10:01:00Z"
        },
        # Badges e eventos de sistema que DEVEM ser filtrados
        {
            "id": 1003,
            "conversation_id": 101,
            "sender_type": "system",
            "message_type": "funnel_event",
            "content": "🚀 Funil \"Funil - Teste\" foi iniciado",
            "media_url": None,
            "timestamp": "2026-09-17T10:02:00Z"
        },
        {
            "id": 1004,
            "conversation_id": 101,
            "sender_type": "system",
            "message_type": "text",
            "content": "Marcador(es) 'lead_bussola' adicionado(s) via Funil",
            "media_url": None,
            "timestamp": "2026-09-17T10:03:00Z"
        },
        {
            "id": 1005,
            "conversation_id": 101,
            "sender_type": "system",
            "message_type": "text",
            "content": "O atendente Super Admin adicionou marcador(es): 24-horas",
            "media_url": None,
            "timestamp": "2026-09-17T10:04:00Z"
        }
    ]

    mock_config = WebhookConfigModel(
        id=20,
        name="Agente Teste",
        leads_table="leads",
        zapvoice_url="https://api.zapjords.test",
        zapvoice_api_token="token_xyz",
        zapvoice_client_id="42"
    )

    db_session_mock = AsyncMock()
    db_session_mock.get.return_value = mock_config

    # Simular retorno do banco: lead não existe na checagem
    fetchone_lead_mock = MagicMock(return_value=None)
    # Simular retorno do banco: mensagens existentes vazio
    fetchall_msgs_mock = MagicMock(return_value=[])

    async def mock_execute(statement, params=None):
        sql_str = str(statement).lower()
        res = MagicMock()
        if "select id" in sql_str and "from" in sql_str:
            res.fetchone = fetchone_lead_mock
        elif "select mensagem_id from webhook_events" in sql_str:
            res.fetchall = fetchall_msgs_mock
        return res

    db_session_mock.execute = AsyncMock(side_effect=mock_execute)
    db_session_mock.commit = AsyncMock()

    added_events = []
    def mock_add(inst):
        if isinstance(inst, WebhookEventModel):
            added_events.append(inst)
    db_session_mock.add = MagicMock(side_effect=mock_add)

    # Context manager para async_session
    class MockAsyncSessionContext:
        async def __aenter__(self):
            return db_session_mock
        async def __aexit__(self, exc_type, exc_val, exc_tb):
            pass

    async def mock_http_get(url, headers=None, params=None):
        if "/api/chat/conversations/101/messages" in url:
            return Response(200, json=mock_messages_101)
        elif "/api/chat/conversations" in url:
            return Response(200, json=mock_conversations_p1)
        return Response(404)

    mock_client = AsyncMock()
    mock_client.get = AsyncMock(side_effect=mock_http_get)

    class MockHttpxClientContext:
        def __init__(self, *args, **kwargs):
            pass
        async def __aenter__(self):
            return mock_client
        async def __aexit__(self, exc_type, exc_val, exc_tb):
            pass

    with patch("webhooks.import_chat.async_session", return_value=MockAsyncSessionContext()), \
         patch("webhooks.import_chat.ensure_leads_table", new=AsyncMock()), \
         patch("webhooks.import_chat.httpx.AsyncClient", MockHttpxClientContext), \
         patch("webhooks.import_chat.manager.broadcast", new=AsyncMock()) as mock_broadcast:

        await run_chat_import_task(webhook_id=20)

        # 1. Valida que executou o INSERT do lead com followup_step = -1
        found_insert_lead = False
        for call_args in db_session_mock.execute.call_args_list:
            stmt = str(call_args[0][0]).lower()
            params = call_args[0][1] if len(call_args[0]) > 1 else {}
            if "insert into leads" in stmt:
                found_insert_lead = True
                assert params["cid"] == "101"
                assert params["tel"] == "5511999990001"
                assert params["nome"] == "Maria Silva"
                assert "followup_step" in stmt
        assert found_insert_lead is True

        # 2. Valida que adicionou 2 eventos de mensagem (dono usuario e dono agente)
        assert len(added_events) == 2
        user_msg = next(e for e in added_events if e.dono == "usuario")
        agent_msg = next(e for e in added_events if e.dono == "agente")

        assert user_msg.mensagem == "Olá, quanto custa?"
        assert user_msg.agent_response is None
        assert agent_msg.agent_response == "Olá Maria! Custa R$ 97."
        assert agent_msg.mensagem is None
        assert agent_msg.mensagem_id == "1002"
        assert "Importação do ZapVoice" in agent_msg.processing_steps
        assert "zapvoice_import" in agent_msg.raw_payload
        assert "Importação do ZapVoice" in user_msg.processing_steps
        assert "zapvoice_import" in user_msg.raw_payload

        # 3. Valida transmissão do broadcast WebSocket de conclusão
        completed_call = any(
            c[0][0].get("type") == "chat_import_completed" and c[0][0].get("created_leads") == 1
            for c in mock_broadcast.call_args_list
        )
        assert completed_call is True


def test_datetime_helpers():
    """Valida conversão precisa para naive UTC e aware UTC prevenindo o erro do asyncpg."""
    # 1. to_naive_datetime
    assert to_naive_datetime(None) is None

    # String ISO com offset
    dt_iso = to_naive_datetime("2026-09-17T15:00:00-03:00")
    assert isinstance(dt_iso, datetime)
    assert dt_iso.tzinfo is None
    assert dt_iso.hour == 18  # -3h convertida para UTC naive

    # Datetime aware
    aware_dt = datetime(2026, 9, 17, 12, 0, 0, tzinfo=timezone(timedelta(hours=-3)))
    naive_dt = to_naive_datetime(aware_dt)
    assert naive_dt.tzinfo is None
    assert naive_dt.hour == 15

    # Datetime já naive
    already_naive = datetime(2026, 9, 17, 10, 0, 0)
    assert to_naive_datetime(already_naive) == already_naive
    assert to_naive_datetime(already_naive).tzinfo is None

    # 2. to_aware_utc
    aware_res = to_aware_utc("2026-09-17T15:00:00Z")
    assert isinstance(aware_res, datetime)
    assert aware_res.tzinfo == timezone.utc

    aware_from_naive = to_aware_utc(datetime(2026, 9, 17, 10, 0, 0))
    assert aware_from_naive.tzinfo == timezone.utc


@pytest.mark.asyncio
async def test_run_chat_import_task_handles_exception_and_broadcasts_error():
    """Valida que quando uma exceção é disparada, é enviado broadcast com done: False e mensagem amigável."""
    _ACTIVE_IMPORTS.clear()

    mock_config = WebhookConfigModel(
        id=30,
        name="Webhook Erro",
        leads_table="leads",
        zapvoice_url="https://api.zapjords.test",
        zapvoice_api_token="token_err",
        zapvoice_client_id="42"
    )

    db_session_mock = AsyncMock()
    db_session_mock.get.return_value = mock_config

    class MockAsyncSessionContext:
        async def __aenter__(self):
            return db_session_mock
        async def __aexit__(self, exc_type, exc_val, exc_tb):
            pass

    class BrokenHttpxClientContext:
        def __init__(self, *args, **kwargs):
            pass
        async def __aenter__(self):
            raise RuntimeError("Falha de conexão forçada com ZapJords")
        async def __aexit__(self, exc_type, exc_val, exc_tb):
            pass

    with patch("webhooks.import_chat.async_session", return_value=MockAsyncSessionContext()), \
         patch("webhooks.import_chat.httpx.AsyncClient", BrokenHttpxClientContext), \
         patch("webhooks.import_chat.manager.broadcast", new=AsyncMock()) as mock_broadcast:

        await run_chat_import_task(webhook_id=30)

        # Valida que foi enviado broadcast de erro
        error_broadcasts = [
            c[0][0] for c in mock_broadcast.call_args_list
            if c[0][0].get("error") is not None
        ]
        assert len(error_broadcasts) >= 1
        err = error_broadcasts[0]
        assert err["done"] is False
        assert "Falha de conexão forçada" in err["error"]
        assert 30 not in _ACTIVE_IMPORTS


def test_is_system_or_badge_message():
    """Valida que mensagens de badges, funis e marcadores são identificadas para exclusão."""
    # 1. Mensagens reais que DEVEM ser aceitas (não são badges)
    assert is_system_or_badge_message({
        "sender_type": "contact", "message_type": "text", "content": "Olá, tudo bem?"
    }) is False

    assert is_system_or_badge_message({
        "sender_type": "user", "message_type": "text", "content": "oiee! Qual sua dúvida sobre o Método Laser Day?"
    }) is False

    assert is_system_or_badge_message({
        "sender_type": "agent", "message_type": "text", "content": "Olá! Como posso te ajudar?"
    }) is False

    # 2. Badges de sistema que DEVEM ser filtrados
    # Por sender_type
    assert is_system_or_badge_message({
        "sender_type": "system", "message_type": "text", "content": "Marcador adicionado"
    }) is True

    # Por message_type
    assert is_system_or_badge_message({
        "sender_type": "user", "message_type": "funnel_event", "content": "🚀 Funil iniciado"
    }) is True

    # Por conteúdo característico (marcador adicionado via funil)
    assert is_system_or_badge_message({
        "sender_type": "text", "content": "Marcador(es) 'lead_bussola' adicionado(s) via Funil em 16/09/2026 às 17:00"
    }) is True

    # Por conteúdo de atendente adicionando ou removendo marcadores
    assert is_system_or_badge_message({
        "sender_type": "system", "content": "O atendente Super Admin adicionou marcador(es): 24-horas, robo, whatsapp"
    }) is True

    assert is_system_or_badge_message({
        "sender_type": "system", "content": "O atendente Super Admin removeu marcador(es): lead_bussola, 24-horas, g"
    }) is True

    # WhatsApp Templates (NUNCA DEVEM SER FILTRADOS!)
    assert is_system_or_badge_message({
        "sender_type": "user", "message_type": "template", "content": "Olá! Seja muito bem-vindo(a) à Bússola Astrológica! 🧭✨"
    }) is False

    assert is_system_or_badge_message({
        "sender_type": "system", "message_type": "template", "content": "Olá! Seu acesso foi liberado.",
        "meta_data": {"is_template": True, "template_name": "compra_aprovada_bussula"}
    }) is False

    assert is_system_or_badge_message({
        "sender_type": "system", "message_type": "text", "content": "[Template: compra_aprovada_bussula]"
    }) is False

    # Mensagem vazia sem mídia
    assert is_system_or_badge_message({"content": "", "media_url": None}) is True


@pytest.mark.asyncio
async def test_import_whatsapp_template_as_agent_message():
    """Valida que mensagens de template WhatsApp enviadas pelo ZapJords são importadas como respostas do agente."""
    _ACTIVE_IMPORTS.clear()

    mock_conversations = {
        "conversations": [
            {
                "id": 201,
                "client_id": 14,
                "phone": "5519992200220",
                "contact_name": "Thais Marins",
                "last_message_content": "Obrigada!",
                "last_message_at": "2026-09-17T16:55:00Z",
                "labels": ["compra_aprovada_bussula"]
            }
        ],
        "total_count": 1,
        "page": 1,
        "limit": 100
    }

    mock_messages_201 = [
        {
            "id": 9001,
            "conversation_id": 201,
            "sender_type": "user",
            "message_type": "template",
            "content": "Olá! Seja muito bem-vindo(a) à Bússola Astrológica! 🧭✨\n\nSeu pagamento foi confirmado...",
            "media_url": None,
            "timestamp": "2026-09-16T07:50:00Z",
            "meta_data": {
                "is_template": True,
                "template_name": "compra_aprovada_bussula"
            }
        },
        {
            "id": 9002,
            "conversation_id": 201,
            "sender_type": "contact",
            "message_type": "text",
            "content": "Não estou conseguindo acesso",
            "media_url": None,
            "timestamp": "2026-09-16T07:58:19Z"
        }
    ]

    added_events = []
    fake_db = AsyncMock()
    cfg = WebhookConfigModel(
        id=50,
        name="Webhook Thais",
        leads_table="leads_thais",
        zapvoice_url="https://api.zapjords.test",
        zapvoice_api_token="token_valid",
        zapvoice_client_id="14"
    )
    fake_db.get.return_value = cfg

    async def fake_execute(query, params=None):
        m = MagicMock()
        q_str = str(query)
        if "select id" in q_str.lower() and "from" in q_str.lower():
            m.fetchone.return_value = None
        elif "SELECT mensagem_id FROM webhook_events" in q_str:
            m.fetchall.return_value = []
        return m

    fake_db.execute = AsyncMock(side_effect=fake_execute)
    fake_db.commit = AsyncMock()
    fake_db.add = MagicMock(side_effect=lambda evt: added_events.append(evt))

    async def fake_get(url, **kwargs):
        if "/api/chat/conversations/201/messages" in url:
            return Response(200, json=mock_messages_201)
        elif "/api/chat/conversations" in url:
            return Response(200, json=mock_conversations)
        return Response(404)

    with patch("webhooks.import_chat.async_session") as mock_session_ctx, \
         patch("webhooks.import_chat.ensure_leads_table", new=AsyncMock()), \
         patch("httpx.AsyncClient.get", side_effect=fake_get), \
         patch("webhooks.import_chat.manager.broadcast", new=AsyncMock()):

        mock_session_ctx.return_value.__aenter__.return_value = fake_db
        mock_session_ctx.return_value.__aexit__.return_value = None

        await run_chat_import_task(webhook_id=50)

    # Valida que tanto o template quanto a mensagem do lead foram importados
    assert len(added_events) == 2

    template_event = next((e for e in added_events if e.mensagem_id == "9001"), None)
    lead_event = next((e for e in added_events if e.mensagem_id == "9002"), None)

    assert template_event is not None
    assert template_event.dono == "agente"
    assert template_event.message_type == "template"
    assert "Bússola Astrológica" in template_event.agent_response
    assert "is_template" in template_event.raw_payload

    assert lead_event is not None
    assert lead_event.dono == "usuario"
    assert lead_event.mensagem == "Não estou conseguindo acesso"


@pytest.mark.asyncio
async def test_live_zapvoice_message_is_not_tagged_as_import():
    """Valida que mensagens de resposta ao vivo enviadas via ZapVoice NÃO recebem a flag is_zapvoice_import."""
    from webhooks.events import list_webhook_events
    
    db_mock = AsyncMock()
    config_mock = WebhookConfigModel(id=1, name="WH Teste", leads_table="leads")
    db_mock.get.return_value = config_mock

    # Simula um evento de resposta em tempo real enviado ao ZapVoice
    live_steps = json.dumps([
        {"step": "Pré-Router (Classificação)", "metadata": {"cost": 0.0004}},
        {"step": "Agente Principal (GPT-4o)", "metadata": {"cost": 0.0021}},
        {"step": "📤 Resposta enviada ao ZapVoice", "detail": "Mensagem única entregue com sucesso."}
    ])

    columns = [
        "id", "webhook_config_id", "event_type", "message_type", "conta_id", "inbox_id", "inbox_nome",
        "conversa_id", "mensagem_id", "contato_id", "telefone", "labels", "contato_nome", "mensagem",
        "link", "status", "task_id", "agent_response", "legenda", "dono", "scheduled_at", "created_at",
        "updated_at", "is_automatic", "processing_steps", "raw_payload"
    ]
    fake_row = (
        579, 1, "message", "text", "conta_1", None, None,
        "conversa_1", "msg_1", None, "5585998259497", None, "Aryaraj", "Oie",
        None, "sent", None, "Olá! Como posso te ajudar?", None, "agente", None, datetime.utcnow(),
        datetime.utcnow(), False, live_steps, '{"source": "zapvoice_webhook"}'
    )

    fake_result = MagicMock()
    fake_result.keys.return_value = columns
    fake_result.fetchall.return_value = [fake_row]

    fake_count = MagicMock()
    fake_count.scalar.return_value = 1

    async def fake_execute(q, params=None):
        sql_str = str(q)
        if "COUNT" in sql_str:
            return fake_count
        return fake_result

    db_mock.execute = AsyncMock(side_effect=fake_execute)

    res = await list_webhook_events(webhook_id=1, db=db_mock)
    items = res["items"]
    assert len(items) == 1
    event_item = items[0]

    # Validações cruciais: NÃO pode ser importação, DEVE manter o custo de IA
    assert event_item["is_zapvoice_import"] is False
    assert event_item.get("origin") != "zapvoice_import"
    assert event_item["cost"] == 0.0025


