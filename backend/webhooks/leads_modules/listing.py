import logging
from typing import Optional
from collections import defaultdict
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from database import get_db
from models import WebhookConfigModel

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/{webhook_id}/leads/ids")
async def list_webhook_lead_ids(
    webhook_id: int,
    q: Optional[str] = None,
    pode_enviar: Optional[bool] = None,
    janela_aberta: Optional[bool] = None,
    date_start: Optional[str] = None,
    date_end: Optional[str] = None,
    sem_mensagem: Optional[bool] = None,
    db: AsyncSession = Depends(get_db)
):
    """Retorna todos os IDs dos leads filtrados de um webhook de forma rápida e leve."""
    config = await db.get(WebhookConfigModel, webhook_id)
    if not config: 
        raise HTTPException(status_code=404, detail="Webhook não encontrado")
    
    where_clauses = ["webhook_config_id = :wid"]
    params = {"wid": webhook_id}
    
    is_sqlite = db.bind.dialect.name == "sqlite"
    interval_expr = "datetime('now', '-24 hours')" if is_sqlite else "(NOW() - INTERVAL '24 hours')"
    
    if q:
        like_op = "LIKE" if is_sqlite else "ILIKE"
        where_clauses.append(f"(telefone {like_op} :q OR contato_nome {like_op} :q)")
        params["q"] = f"%{q}%"
    if pode_enviar is not None:
        where_clauses.append("pode_enviar_mensagem = :pe")
        params["pe"] = pode_enviar
    if janela_aberta is not None:
        if janela_aberta:
            where_clauses.append(f"(ultima_mensagem_em IS NOT NULL AND ultima_mensagem_em >= {interval_expr})")
        else:
            where_clauses.append(f"(ultima_mensagem_em IS NULL OR ultima_mensagem_em < {interval_expr})")
    if sem_mensagem is not None:
        if sem_mensagem:
            where_clauses.append(f"""
                NOT EXISTS (
                    SELECT 1 FROM webhook_events 
                    WHERE (webhook_events.telefone = {config.leads_table}.telefone OR webhook_events.telefone = '+' || {config.leads_table}.telefone)
                    AND webhook_events.webhook_config_id = :wid 
                    AND webhook_events.dono = 'usuario'
                )
            """)
        else:
            where_clauses.append(f"""
                EXISTS (
                    SELECT 1 FROM webhook_events 
                    WHERE (webhook_events.telefone = {config.leads_table}.telefone OR webhook_events.telefone = '+' || {config.leads_table}.telefone)
                    AND webhook_events.webhook_config_id = :wid 
                    AND webhook_events.dono = 'usuario'
                )
            """)
    if date_start:
        where_clauses.append("created_at >= :ds")
        params["ds"] = date_start
    if date_end:
        where_clauses.append("created_at <= :de")
        params["de"] = date_end
        
    where_str = " AND ".join(where_clauses)
    query = text(f"SELECT id FROM {config.leads_table} WHERE {where_str} ORDER BY id ASC")
    res = await db.execute(query, params)
    ids = [r[0] for r in res.fetchall() if r[0] is not None]
    
    return {"ids": ids, "total": len(ids)}


@router.get("/{webhook_id}/leads")
async def list_webhook_leads(
    webhook_id: int, 
    page: int = 1, 
    page_size: int = 20, 
    q: Optional[str] = None,
    pode_enviar: Optional[bool] = None,
    janela_aberta: Optional[bool] = None,
    date_start: Optional[str] = None,
    date_end: Optional[str] = None,
    sem_mensagem: Optional[bool] = None,
    db: AsyncSession = Depends(get_db)
):
    config = await db.get(WebhookConfigModel, webhook_id)
    if not config: 
        raise HTTPException(status_code=404, detail="Webhook não encontrado")
    
    offset = (page - 1) * page_size
    where_clauses = ["webhook_config_id = :wid"]
    params = {"wid": webhook_id, "limit": page_size, "offset": offset}
    
    is_sqlite = db.bind.dialect.name == "sqlite"
    interval_expr = "datetime('now', '-24 hours')" if is_sqlite else "(NOW() - INTERVAL '24 hours')"
    
    if q:
        like_op = "LIKE" if is_sqlite else "ILIKE"
        where_clauses.append(f"(telefone {like_op} :q OR contato_nome {like_op} :q)")
        params["q"] = f"%{q}%"
    if pode_enviar is not None:
        where_clauses.append("pode_enviar_mensagem = :pe")
        params["pe"] = pode_enviar
    if janela_aberta is not None:
        if janela_aberta:
            where_clauses.append(f"(ultima_mensagem_em IS NOT NULL AND ultima_mensagem_em >= {interval_expr})")
        else:
            where_clauses.append(f"(ultima_mensagem_em IS NULL OR ultima_mensagem_em < {interval_expr})")
    if sem_mensagem is not None:
        if sem_mensagem:
            where_clauses.append(f"""
                NOT EXISTS (
                    SELECT 1 FROM webhook_events 
                    WHERE (webhook_events.telefone = {config.leads_table}.telefone OR webhook_events.telefone = '+' || {config.leads_table}.telefone)
                    AND webhook_events.webhook_config_id = :wid 
                    AND webhook_events.dono = 'usuario'
                )
            """)
        else:
            where_clauses.append(f"""
                EXISTS (
                    SELECT 1 FROM webhook_events 
                    WHERE (webhook_events.telefone = {config.leads_table}.telefone OR webhook_events.telefone = '+' || {config.leads_table}.telefone)
                    AND webhook_events.webhook_config_id = :wid 
                    AND webhook_events.dono = 'usuario'
                )
            """)
    if date_start:
        where_clauses.append("created_at >= :ds")
        params["ds"] = date_start
    if date_end:
        where_clauses.append("created_at <= :de")
        params["de"] = date_end
        
    where_str = " AND ".join(where_clauses)
    
    total_res = await db.execute(text(f"SELECT COUNT(*) FROM {config.leads_table} WHERE {where_str}"), params)
    total = total_res.scalar()
    
    query = text(f"""
        SELECT *, 
               pode_enviar_mensagem AS pode_enviar,
               (ultima_mensagem_em IS NOT NULL AND ultima_mensagem_em >= {interval_expr}) AS janela_24h_aberta
        FROM {config.leads_table} 
        WHERE {where_str} 
        ORDER BY ultima_mensagem_em DESC NULLS LAST, updated_at DESC
        LIMIT :limit OFFSET :offset
    """)
    logger.info(f"📊 Buscando leads para webhook {webhook_id} na tabela {config.leads_table} (Page: {page}, Size: {page_size}, Search: {q})")
    res = await db.execute(query, params)
    columns = res.keys()
    leads = []
    telefones_para_buscar = set()
    
    for row in res.fetchall():
        lead_dict = dict(zip(columns, row))
        lead_dict["janela_24h_aberta"] = bool(lead_dict.get("janela_24h_aberta"))
        lead_dict["total_disparos"] = 0
        lead_dict["sem_mensagem_usuario"] = True
        
        tel = lead_dict.get("telefone")
        if tel:
            telefones_para_buscar.add(tel)
            telefones_para_buscar.add(f"+{tel}")
            if tel.startswith("+"):
                telefones_para_buscar.add(tel[1:])
                
        leads.append(lead_dict)

    if leads and telefones_para_buscar:
        tels_list = list(telefones_para_buscar)
        placeholders = ", ".join(f":t{i}" for i in range(len(tels_list)))
        events_query_str = f"""
            SELECT telefone, dono
            FROM webhook_events
            WHERE webhook_config_id = :wid 
            AND telefone IN ({placeholders})
        """
        query_params = {"wid": webhook_id}
        for i, t in enumerate(tels_list):
            query_params[f"t{i}"] = t
            
        events_res = await db.execute(text(events_query_str), query_params)
        events_rows = events_res.fetchall()
        
        disparos_por_tel = defaultdict(int)
        tem_msg_usuario_por_tel = defaultdict(bool)
        
        for e_tel, e_dono in events_rows:
            if e_tel:
                tel_key = e_tel.lstrip("+")
                disparos_por_tel[tel_key] += 1
                if e_dono == "usuario":
                    tem_msg_usuario_por_tel[tel_key] = True
                    
        for l in leads:
            tel = (l.get("telefone") or "").lstrip("+")
            l["total_disparos"] = disparos_por_tel[tel]
            l["sem_mensagem_usuario"] = not tem_msg_usuario_por_tel[tel]

    logger.info(f"✅ Encontrados {len(leads)} leads de um total de {total}.")
    return {"total": total, "leads": leads, "page": page, "page_size": page_size}
