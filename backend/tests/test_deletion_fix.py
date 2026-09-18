import pytest
import json
from unittest.mock import AsyncMock, patch, MagicMock
from sqlalchemy import text, select, func, or_
from models import WebhookConfigModel, WebhookEventModel, InteractionLog, SessionSummary, KnowledgeItemModel, UserMemoryModel, AgentConfigModel, KnowledgeBaseModel
from datetime import datetime

@pytest.mark.asyncio
async def test_soft_deletion_vs_full_purge(client, db_session):
    print("\n--- START TEST: test_soft_deletion_vs_full_purge ---")
    import uuid
    uid = str(uuid.uuid4())[:8]
    
    # 1. Setup: Criar Webhook, Agente e KB
    config = WebhookConfigModel(name=f"Test Del {uid}", token=f"tk_{uid}", leads_table=f"leads_{uid}")
    db_session.add(config)
    kb = KnowledgeBaseModel(name=f"KB {uid}")
    db_session.add(kb)
    agent = AgentConfigModel(name=f"Agent {uid}")
    db_session.add(agent)
    await db_session.commit()
    await db_session.refresh(config)
    await db_session.refresh(kb)
    await db_session.refresh(agent)

    # Criar tabela de leads
    from webhooks.service import ensure_leads_table
    await ensure_leads_table(f"leads_{uid}")

    # --- CENÁRIO 1: SOFT DELETE (Somente Lead e Logs) ---
    phone1 = f"1{uid}"[:12]
    await db_session.execute(text(f"INSERT INTO leads_{uid} (webhook_config_id, telefone, contato_nome) VALUES ({config.id}, '{phone1}', 'User Soft')"))
    res = await db_session.execute(text(f"SELECT id FROM leads_{uid} WHERE telefone = '{phone1}'"))
    lead1_id = res.fetchone()[0]

    db_session.add(WebhookEventModel(webhook_config_id=config.id, telefone=phone1, event_type="message", status="completed"))
    db_session.add(UserMemoryModel(session_id=phone1, key="soft_key", value="manter"))
    await db_session.commit()

    # Executar Soft Delete
    response = await client.delete(f"/webhooks/{config.id}/leads/{lead1_id}")
    assert response.status_code == 204, f"Soft Delete falhou: {response.status_code} - {response.text}"

    # Verificar: Lead e Evento sumiram, e Memória também foi apagada (conforme regra do usuário)
    res = await db_session.execute(text(f"SELECT COUNT(*) FROM leads_{uid} WHERE id = {lead1_id}"))
    count_lead = res.scalar()
    assert count_lead == 0, f"Lead ainda existe na tabela leads_{uid} (count={count_lead})"
    
    res = await db_session.execute(select(func.count(WebhookEventModel.id)).where(WebhookEventModel.telefone == phone1))
    count_ev = res.scalar()
    assert count_ev == 0, f"Evento ainda existe (count={count_ev})"
    
    res = await db_session.execute(select(func.count(UserMemoryModel.id)).where(UserMemoryModel.session_id == phone1))
    count_mem = res.scalar()
    assert count_mem == 0, f"Memória deveria ter sido limpa (count={count_mem})"

    # --- CENÁRIO 2: FULL PURGE (Tudo) ---
    phone2 = f"2{uid}"[:12]
    await db_session.execute(text(f"INSERT INTO leads_{uid} (webhook_config_id, telefone, contato_nome) VALUES ({config.id}, '{phone2}', 'User Full')"))
    res = await db_session.execute(text(f"SELECT id FROM leads_{uid} WHERE telefone = '{phone2}'"))
    lead2_id = res.fetchone()[0]

    db_session.add(WebhookEventModel(webhook_config_id=config.id, telefone=phone2, event_type="message", status="completed"))
    db_session.add(UserMemoryModel(session_id=phone2, key="full_key", value="apagar"))
    db_session.add(InteractionLog(session_id=phone2, user_message="x", agent_response="y", agent_id=agent.id))
    db_session.add(KnowledgeItemModel(knowledge_base_id=kb.id, question="q", answer="a", metadata_val=f"phone:{phone2}"))
    await db_session.commit()

    # Executar Full Purge
    response = await client.delete(f"/webhooks/{config.id}/leads-by-phone/{phone2}/full-purge")
    if response.status_code != 204:
        print(f"DEBUG FULL PURGE ERROR: {response.status_code} - {response.text}")
    assert response.status_code == 204

    # Verificar: ABSOLUTAMENTE TUDO sumiu
    res = await db_session.execute(text(f"SELECT COUNT(*) FROM leads_{uid} WHERE id = {lead2_id}"))
    assert res.scalar() == 0
    res = await db_session.execute(select(func.count(WebhookEventModel.id)).where(WebhookEventModel.telefone == phone2))
    assert res.scalar() == 0
    res = await db_session.execute(select(func.count(UserMemoryModel.id)).where(UserMemoryModel.session_id == phone2))
    assert res.scalar() == 0
    # InteractionLog deve ser mantido mesmo após exclusão de contato para não afetar métricas de custo
    res = await db_session.execute(select(func.count(InteractionLog.id)).where(InteractionLog.session_id == phone2))
    assert res.scalar() == 1, "Interaction logs devem ser preservados para manter custos e tokens no dashboard"
    res = await db_session.execute(select(func.count(KnowledgeItemModel.id)).where(KnowledgeItemModel.metadata_val == f"phone:{phone2}"))
    assert res.scalar() == 0
