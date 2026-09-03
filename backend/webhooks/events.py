import re
import json
import logging
from typing import Optional
from datetime import timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from database import get_db
from core.timezone import get_now_br, get_now_utc
from core.websocket import manager
from models import WebhookConfigModel, WebhookEventModel
from .schemas import (
    WebhookEventsPaginatedResponse,
    LeadHistoryResponse,
    LeadHistoryItem,
    BulkDeleteRequest
)

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/{webhook_id}/events", response_model=WebhookEventsPaginatedResponse)
async def list_webhook_events(
    webhook_id: int, 
    page: int = 1, 
    limit: int = 50, 
    status: Optional[str] = None,
    search: Optional[str] = None,
    dono: Optional[str] = None,
    event_type: Optional[str] = "message",
    db: AsyncSession = Depends(get_db)
):
    offset = (page - 1) * limit
    where_clauses = ["webhook_config_id = :wid"]
    params = {"wid": webhook_id, "limit": limit, "offset": offset}

    if status and status != 'all':
        where_clauses.append("status = :status")
        params["status"] = status
    
    if dono:
        where_clauses.append("dono = :dono")
        params["dono"] = dono
    
    if event_type and event_type != "all":
        where_clauses.append("event_type = :event_type")
        params["event_type"] = event_type
        
    is_sqlite = db.bind.dialect.name == "sqlite"

    if search:
        digits_only = re.sub(r"\D", "", search)
        if len(digits_only) >= 7:
            suffix7 = digits_only[-7:]
            suffix8 = digits_only[-8:] if len(digits_only) >= 8 else digits_only
            clean_search = f"%{digits_only}%"
            plus_search = f"%+{digits_only}%"

            if is_sqlite:
                where_clauses.append("""(
                    telefone LIKE :search OR 
                    telefone LIKE :clean_search OR 
                    telefone LIKE :plus_search OR
                    RIGHT(telefone, 7) = :suffix7 OR 
                    RIGHT(telefone, 8) = :suffix8 OR 
                    contato_nome LIKE :search OR 
                    mensagem LIKE :search
                )""")
            else:
                where_clauses.append("""(
                    telefone ILIKE :search OR 
                    telefone ILIKE :clean_search OR 
                    telefone ILIKE :plus_search OR 
                    RIGHT(REGEXP_REPLACE(telefone, '[^0-9]', '', 'g'), 7) = :suffix7 OR 
                    RIGHT(REGEXP_REPLACE(telefone, '[^0-9]', '', 'g'), 8) = :suffix8 OR 
                    contato_nome ILIKE :search OR 
                    mensagem ILIKE :search
                )""")
            params["clean_search"] = clean_search
            params["plus_search"] = plus_search
            params["suffix7"] = suffix7
            params["suffix8"] = suffix8
        else:
            where_clauses.append("(telefone LIKE :search OR contato_nome ILIKE :search OR mensagem ILIKE :search)")
        params["search"] = f"%{search}%"

    where_str = " AND ".join(where_clauses)
    
    total_res = await db.execute(text(f"SELECT COUNT(*) FROM webhook_events WHERE {where_str}"), params)
    total = total_res.scalar() or 0

    # Fallback: busca sem restringir por wid se busca por telefone retornar 0
    if total == 0 and search and len(re.sub(r"\D", "", search)) >= 7:
        fallback_clauses = [c for c in where_clauses if not c.startswith("webhook_config_id")]
        fallback_where_str = " AND ".join(fallback_clauses)
        fb_total_res = await db.execute(text(f"SELECT COUNT(*) FROM webhook_events WHERE {fallback_where_str}"), params)
        fb_total = fb_total_res.scalar() or 0
        if fb_total > 0:
            where_str = fallback_where_str
            total = fb_total

    query = text(f"""
        SELECT id, webhook_config_id, event_type, message_type, conta_id, inbox_id, inbox_nome,
               conversa_id, mensagem_id, contato_id, telefone, labels, contato_nome, mensagem,
               link, status, task_id, agent_response, legenda, dono, scheduled_at, created_at,
               updated_at, is_automatic, processing_steps
        FROM webhook_events WHERE {where_str} ORDER BY created_at DESC LIMIT :limit OFFSET :offset
    """)
    res = await db.execute(query, params)
    columns = res.keys()
    items = [dict(zip(columns, row)) for row in res.fetchall()]

    agent_responses_in_batch = {item['agent_response'].strip() for item in items if item.get('agent_response')}
    filtered_items = []
    for item in items:
        msg = (item.get('mensagem') or '').strip()
        if item.get('event_type') == 'memory' and item.get('dono') not in ('agente', 'bot'):
            if msg and any(msg in resp or resp in msg for resp in agent_responses_in_batch if resp):
                item['dono'] = 'agente'
        
        is_agent_item = item.get('dono') in ('agente', 'bot') or item.get('event_type') == 'memory'
        if is_agent_item and not item.get('agent_response') and msg:
            if any(msg in resp or resp in msg for resp in agent_responses_in_batch if resp):
                continue

        # Enriquecer com informações de custo e se foi pelo cache semântico (de graça) ou pago (IA)
        p_steps_raw = item.get("processing_steps")
        is_cache = False
        is_partial = False
        cost = 0.0
        if p_steps_raw:
            try:
                p_steps = json.loads(p_steps_raw) if isinstance(p_steps_raw, str) else p_steps_raw
                if isinstance(p_steps, list):
                    for s in p_steps:
                        meta = s.get("metadata") or {}
                        if meta.get("from_semantic_cache") is True:
                            is_cache = True
                        elif meta.get("from_semantic_cache") == "partial":
                            is_partial = True
                        elif meta.get("from_semantic_cache") == "funnel" or meta.get("funnel_active"):
                            is_partial = True

                        if meta.get("cost"):
                            cost += float(meta.get("cost", 0))

                        title = (s.get("step") or "").lower()
                        if "cache semântico" in title or "cache semantico" in title:
                            if "funil" in title or "qualificação" in title or "qualificacao" in title or "parcial" in title:
                                is_partial = True
                            elif "custo zero" in title or "hit" in title or "resposta do cache" in title:
                                is_cache = True
            except Exception:
                pass

        if cost > 0:
            is_cache = False
            is_partial = True

        item["from_semantic_cache"] = is_cache
        item["is_partial_cache"] = is_partial
        item["is_free"] = (is_cache and cost == 0.0) or (item.get("event_type") == "followup" and cost == 0.0)
        item["cost"] = round(cost, 4)

        filtered_items.append(item)

    items = filtered_items
    return {"total": total, "items": items}


@router.get("/{webhook_id}/leads-by-phone/{phone}/history", response_model=LeadHistoryResponse)
async def get_lead_history(webhook_id: int, phone: str, page: int = 1, page_size: int = 50, db: AsyncSession = Depends(get_db)):
    config = await db.get(WebhookConfigModel, webhook_id)
    if not config: 
        raise HTTPException(status_code=404, detail="Webhook não encontrado")
    
    offset = (page - 1) * page_size
    
    total_query = text("""
        SELECT COALESCE(SUM(
            (CASE WHEN mensagem IS NOT NULL AND mensagem != '' THEN 1 ELSE 0 END) +
            (CASE WHEN agent_response IS NOT NULL AND agent_response != '' THEN 1 ELSE 0 END)
        ), 0)
        FROM webhook_events 
        WHERE webhook_config_id = :wid AND telefone = :tel
    """)
    total_res = await db.execute(total_query, {"wid": webhook_id, "tel": phone})
    total_messages = total_res.scalar() or 0

    query = text("SELECT id, contato_id, telefone, mensagem, dono, created_at, agent_response FROM webhook_events WHERE webhook_config_id = :wid AND telefone = :tel ORDER BY created_at DESC LIMIT :limit OFFSET :offset")
    res = await db.execute(query, {"wid": webhook_id, "tel": phone, "limit": page_size, "offset": offset})
    rows = res.fetchall()
    
    items = []
    for r in rows:
        evt_id, contato_id, telefone, mensagem, dono, created_at, agent_response = r
        if mensagem:
            items.append(LeadHistoryItem(
                id=evt_id,
                contato_id=contato_id,
                telefone=telefone,
                conteudo=mensagem,
                dono="Humano" if (dono and dono.lower() in ["cliente", "usuario"]) or not dono else "Agente",
                timestamp=created_at,
                index=0
            ))
        if agent_response:
            items.append(LeadHistoryItem(
                id=evt_id,
                contato_id=contato_id,
                telefone=telefone,
                conteudo=agent_response,
                dono="Agente",
                timestamp=created_at,
                index=0
            ))
            
    items.reverse()
    for idx, item in enumerate(items):
        item.index = idx + offset + 1
    items.reverse()
    
    return LeadHistoryResponse(total=total_messages, page=page, page_size=page_size, items=items)


@router.post("/{webhook_id}/events/bulk-delete", status_code=204)
async def delete_events_bulk(webhook_id: int, req: BulkDeleteRequest, db: AsyncSession = Depends(get_db)):
    await db.execute(text("DELETE FROM webhook_events WHERE id = ANY(:ids) AND webhook_config_id = :wid"), {"ids": req.event_ids, "wid": webhook_id})
    await db.commit()


@router.post("/{webhook_id}/events/{event_id}/cancel", status_code=200)
async def cancel_webhook_event_endpoint(webhook_id: int, event_id: int, db: AsyncSession = Depends(get_db)):
    event = await db.get(WebhookEventModel, event_id)
    if event and event.webhook_config_id == webhook_id:
        event.status = "canceled"
        
        steps = json.loads(event.processing_steps or "[]")
        steps.append({
            "step": "🚫 Automação Cancelada",
            "detail": "A automação para esta mensagem foi cancelada manualmente pelo usuário ou pelo sistema.",
            "timestamp": get_now_br().isoformat()
        })
        event.processing_steps = json.dumps(steps, ensure_ascii=False)
        
        await db.commit()
        
        await manager.broadcast({
            "type": "status_update",
            "webhook_id": webhook_id,
            "event_id": event_id,
            "status": "canceled",
            "steps": steps
        })
    return {"ok": True}


@router.post("/{webhook_id}/events/{event_id}/retry", status_code=200)
async def retry_webhook_event_endpoint(webhook_id: int, event_id: int, db: AsyncSession = Depends(get_db)):
    event = await db.get(WebhookEventModel, event_id)
    if not event or event.webhook_config_id != webhook_id:
        raise HTTPException(status_code=404, detail="Evento de webhook não encontrado")
        
    if event.status == "processing":
        last_update = event.updated_at or event.created_at
        if last_update.tzinfo is None:
            last_update = last_update.replace(tzinfo=timezone.utc)
        
        time_elapsed = get_now_utc() - last_update
        if time_elapsed.total_seconds() < 120:
            raise HTTPException(status_code=400, detail="Este evento já está sendo processado no momento.")
        
    from webhook_tasks import process_webhook_automation
    
    event.status = "processing"
    event.agent_response = None
    if event.legenda and event.legenda.startswith("❌ Erro técnico:"):
        event.legenda = None
    
    now_br = get_now_br()
    steps = [{
        "step": "🔄 Reiniciando Pipeline",
        "detail": "A retentativa da automação foi iniciada manualmente pelo usuário. Reprocessando mensagem original...",
        "timestamp": now_br.isoformat()
    }]
    event.processing_steps = json.dumps(steps, ensure_ascii=False)
    event.updated_at = now_br
    
    await db.commit()
    
    try:
        await manager.broadcast({
            "type": "status_update",
            "webhook_id": webhook_id,
            "event_id": event_id,
            "status": "processing",
            "steps": steps
        })
    except Exception as ws_err:
        logger.error(f"Erro ao transmitir status_update via WS no retry: {ws_err}")
        
    process_webhook_automation.delay(event_id)
    logger.info(f"🔄 Retentativa manual de automação iniciada para o evento {event_id} (Webhook Config ID: {webhook_id})")
    
    return {"ok": True, "status": "processing"}


@router.get("/{webhook_id}/events/{event_id}")
async def get_webhook_event_detail(webhook_id: int, event_id: int, db: AsyncSession = Depends(get_db)):
    event = await db.get(WebhookEventModel, event_id)
    if not event or event.webhook_config_id != webhook_id:
        raise HTTPException(status_code=404, detail="Evento não encontrado")
    
    return {
        "id": event.id,
        "webhook_config_id": event.webhook_config_id,
        "status": event.status,
        "processing_steps": event.processing_steps,
        "agent_response": event.agent_response,
        "updated_at": event.updated_at,
        "scheduled_at": event.scheduled_at,
        "created_at": event.created_at,
        "server_now": get_now_br()
    }


@router.get("/events/{event_id}")
async def get_webhook_event_detail_by_id(event_id: int, db: AsyncSession = Depends(get_db)):
    event = await db.get(WebhookEventModel, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Evento não encontrado")
    
    return {
        "id": event.id,
        "webhook_config_id": event.webhook_config_id,
        "status": event.status,
        "processing_steps": event.processing_steps,
        "agent_response": event.agent_response,
        "updated_at": event.updated_at,
        "scheduled_at": event.scheduled_at,
        "created_at": event.created_at,
        "server_now": get_now_br()
    }
