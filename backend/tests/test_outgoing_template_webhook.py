import pytest
import uuid
import json
from datetime import datetime
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from models import WebhookConfigModel, WebhookEventModel, AgentConfigModel
from webhooks.service import ensure_leads_table
from webhook_services_modules.context import retrieve_context_history


@pytest.mark.asyncio
async def test_outgoing_template_webhook_creates_event_and_history(client: AsyncClient, db_session: AsyncSession):
    """
    Valida se ao receber um webhook de eco de mensagem de saída (ex: Template disparado via ZapVoice)
    o sistema cria o evento em webhook_events com dono='agente', message_type='template'
    e alimenta o histórico de contexto que a IA utiliza.
    """
    # 1. Configurar Webhook e Tabela de Leads
    token = f"test-tpl-{uuid.uuid4().hex[:8]}"
    leads_tbl = f"leads_{uuid.uuid4().hex[:8]}"
    await ensure_leads_table(leads_tbl)

    wh = WebhookConfigModel(
        name="Teste Template Outgoing",
        token=token,
        leads_table=leads_tbl,
        is_active=True,
        zapvoice_client_id="11"
    )
    db_session.add(wh)
    await db_session.commit()
    await db_session.refresh(wh)

    # 2. Simular payload de eco de Template vindo do ZapVoice
    phone = "5585998259497"
    msg_id = f"tpl_msg_{uuid.uuid4().hex[:8]}"
    template_text = (
        "Você estava a um passo de dominar o que 99% dos homens nunca vão saber sobre satisfação real... e parou?\n\n"
        "O mundo está cheio de caras comuns. Na Escola Sexologia Sem Tabu, a gente prepara você para ser a referência dela."
    )

    zapvoice_payload = {
        "event": "message_created",
        "client_id": "11",
        "contact": {
            "phone": phone,
            "name": "Aryaraj Fernandes",
            "labels": ["robo", "whatsapp"]
        },
        "message": {
            "id": msg_id,
            "conversation_id": "28018",
            "sender_type": "system",  # Indica mensagem de saída (agente/sistema)
            "message_type": "template",
            "template_name": "oferta_relampago_sexologia",
            "template_content": template_text,
            "content": template_text
        }
    }

    # 3. Enviar webhook para a rota de recepção
    resp = await client.post(f"/webhooks/receive/{token}", json=zapvoice_payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data.get("ok") is True
    assert data.get("status") == "outgoing_recorded"

    # 4. Verificar se o evento foi criado em webhook_events
    evt_stmt = select(WebhookEventModel).where(
        WebhookEventModel.webhook_config_id == wh.id,
        WebhookEventModel.mensagem_id == msg_id
    )
    evt_res = await db_session.execute(evt_stmt)
    event = evt_res.scalar_one_or_none()

    assert event is not None
    assert event.dono == "agente"
    assert event.message_type == "template"
    assert event.status == "completed"
    assert event.agent_response == template_text
    assert event.telefone == phone
    assert event.contato_nome == "Aryaraj Fernandes"

    # 5. Testar deduplicação enviando o mesmo payload novamente
    resp_dup = await client.post(f"/webhooks/receive/{token}", json=zapvoice_payload)
    assert resp_dup.status_code == 200

    # Garantir que não duplicou o evento
    all_events_res = await db_session.execute(
        select(WebhookEventModel).where(
            WebhookEventModel.webhook_config_id == wh.id,
            WebhookEventModel.mensagem_id == msg_id
        )
    )
    assert len(all_events_res.scalars().all()) == 1

    # 6. Testar se retrieve_context_history carrega o template no histórico da IA
    class MockDbAgent:
        context_window = 10

    # Simula um evento seguinte enviado pelo usuário respondendo ao template
    user_event = WebhookEventModel(
        id=999999,
        webhook_config_id=wh.id,
        telefone=phone,
        mensagem="Quero saber mais!",
        dono="usuario",
        status="waiting"
    )

    # Cria mock de db síncrono para retrieve_context_history
    class SyncSessionWrapper:
        def __init__(self, async_s):
            self.s = async_s
        def commit(self):
            pass
        def query(self, model):
            class QueryObj:
                def __init__(self, m, s):
                    self.m = m
                    self.s = s
                    self.conds = []
                def filter(self, *conds):
                    self.conds.extend(conds)
                    return self
                def order_by(self, *args):
                    return self
                def limit(self, n):
                    return self
                def all(self):
                    if self.m == WebhookEventModel:
                        return [event]
                    return []
                def first(self):
                    if self.m == WebhookConfigModel:
                        return wh
                    if self.m == WebhookEventModel:
                        return user_event
                    return None
            return QueryObj(model, self.s)

    sync_db = SyncSessionWrapper(db_session)
    history = retrieve_context_history(
        db=sync_db,
        event=user_event,
        db_agent=MockDbAgent(),
        raw_phone=phone,
        clean_phone=phone,
        event_id=user_event.id
    )

    assert len(history) >= 1
    assert history[0]["role"] == "assistant"
    assert history[0]["content"] == template_text
