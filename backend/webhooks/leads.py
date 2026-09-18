import os
import json
import logging
import asyncio
import httpx
from typing import Optional
from collections import defaultdict
from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text, select

from database import get_db
from core.timezone import get_now_br
from models import WebhookConfigModel, GlobalContextVariableModel, UserMemoryModel
from .schemas import LeadBulkDeleteRequest
from .service import delete_contact_data

logger = logging.getLogger(__name__)
router = APIRouter()


@router.delete("/{webhook_id}/leads-by-phone/{phone}/full-purge", status_code=204)
async def full_purge_lead_by_phone(webhook_id: int, phone: str, db: AsyncSession = Depends(get_db)):
    config = await db.get(WebhookConfigModel, webhook_id)
    if not config: 
        raise HTTPException(status_code=404, detail="Webhook não encontrado")
    
    conversa_id = None
    conta_id = None
    try:
        suffix = phone[-8:] if len(phone) >= 8 else phone
        conv_q = text(f"SELECT conversa_id, conta_id FROM {config.leads_table} WHERE (telefone = :tel OR RIGHT(telefone, 8) = :suffix) AND webhook_config_id = :wid LIMIT 1")
        conv_res = await db.execute(conv_q, {"tel": phone, "suffix": suffix, "wid": webhook_id})
        c_row = conv_res.fetchone()
        if c_row:
            conversa_id = c_row[0]
            conta_id = c_row[1]
        
        if not conversa_id:
            evt_q = text("SELECT conversa_id, conta_id FROM webhook_events WHERE (telefone = :tel OR RIGHT(telefone, 8) = :suffix) AND webhook_config_id = :wid ORDER BY id DESC LIMIT 1")
            evt_res = await db.execute(evt_q, {"tel": phone, "suffix": suffix, "wid": webhook_id})
            evt_row = evt_res.fetchone()
            if evt_row:
                conversa_id = evt_row[0]
                conta_id = evt_row[1]
    except Exception as e_q:
        logger.warning(f"Aviso ao buscar conversa_id para full_purge: {e_q}")

    await delete_contact_data(db, webhook_id, config.leads_table, [phone])
    await db.commit()

    if conversa_id:
        try:
            from zapvoice_utils import get_default_reset_labels, reset_conversation_labels
            zv_url = (getattr(config, "zapvoice_url", None) or os.getenv("ZAPVOICE_URL", "")).rstrip("/")
            zv_token = getattr(config, "zapvoice_api_token", None) or os.getenv("ZAPVOICE_API_TOKEN", "")
            if zv_url and zv_token:
                eff_aid = conta_id or getattr(config, "zapvoice_client_id", None) or os.getenv("ZAPVOICE_CLIENT_ID", "")
                reset_labels = get_default_reset_labels(config)
                await reset_conversation_labels(zv_url, eff_aid, conversa_id, zv_token, reset_labels)
        except Exception as e_rst:
            logger.warning(f"Aviso ao resetar etiquetas no full_purge: {e_rst}")


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


@router.post("/{webhook_id}/leads/delete-batch", status_code=204)
async def delete_leads_batch(webhook_id: int, req: LeadBulkDeleteRequest, db: AsyncSession = Depends(get_db)):
    logger.info(f"🗑️ Deletando leads em lote para webhook {webhook_id}: {req.lead_ids}")
    config = await db.get(WebhookConfigModel, webhook_id)
    if not config: 
        raise HTTPException(status_code=404, detail="Webhook não encontrado")
    
    if not req.lead_ids:
        return

    try:
        is_sqlite = db.bind.dialect.name == "sqlite"
        phones = []
        conv_info_list = []
        try:
            async with db.begin_nested():
                if is_sqlite:
                    safe_ids_str = ",".join(str(int(i)) for i in req.lead_ids)
                    query = text(f"SELECT id, telefone, conversa_id, conta_id FROM {config.leads_table} WHERE id IN ({safe_ids_str}) AND webhook_config_id = :wid")
                    res = await db.execute(query, {"wid": webhook_id})
                else:
                    query = text(f"SELECT id, telefone, conversa_id, conta_id FROM {config.leads_table} WHERE id = ANY(:ids) AND webhook_config_id = :wid")
                    res = await db.execute(query, {"ids": req.lead_ids, "wid": webhook_id})
                rows = res.fetchall()
                phones = [r[1] for r in rows if r[1]]
                conv_info_list = [(r[2], r[3]) for r in rows if r[2]]
        except Exception:
            async with db.begin_nested():
                if is_sqlite:
                    safe_ids_str = ",".join(str(int(i)) for i in req.lead_ids)
                    query = text(f"SELECT id, telefone FROM {config.leads_table} WHERE id IN ({safe_ids_str}) AND webhook_config_id = :wid")
                    res = await db.execute(query, {"wid": webhook_id})
                else:
                    query = text(f"SELECT id, telefone FROM {config.leads_table} WHERE id = ANY(:ids) AND webhook_config_id = :wid")
                    res = await db.execute(query, {"ids": req.lead_ids, "wid": webhook_id})
                rows = res.fetchall()
                phones = [r[1] for r in rows if r[1]]
        
        logger.info(f"🗑️ Deletando em lote {len(req.lead_ids)} leads e limpando dados para {len(phones)} telefones.")
        await delete_contact_data(db, webhook_id, config.leads_table, phones, lead_ids=req.lead_ids)
        await db.commit()

        # Resetar etiquetas das conversas no ZapVoice para o padrão em segundo plano (não bloqueante)
        try:
            from zapvoice_utils import get_default_reset_labels, bulk_reset_conversation_labels
            zv_url = (getattr(config, "zapvoice_url", None) or os.getenv("ZAPVOICE_URL", "")).rstrip("/")
            zv_token = getattr(config, "zapvoice_api_token", None) or os.getenv("ZAPVOICE_API_TOKEN", "")
            default_aid = getattr(config, "zapvoice_client_id", None) or os.getenv("ZAPVOICE_CLIENT_ID", "")
            if conv_info_list and zv_url and zv_token:
                reset_labels = get_default_reset_labels(config)
                asyncio.create_task(
                    bulk_reset_conversation_labels(
                        zapvoice_url=zv_url,
                        default_client_id=default_aid,
                        conv_info_list=conv_info_list,
                        token=zv_token,
                        labels=reset_labels,
                        concurrency=15
                    )
                )
        except Exception as e_conv:
            logger.warning(f"Erro ao agendar reset de etiquetas em lote ZapVoice: {e_conv}")

        try:
            from core.websocket import manager
            await manager.broadcast({
                "type": "lead_deleted",
                "webhook_id": webhook_id,
                "lead_ids": req.lead_ids,
                "action": "delete_batch"
            })
        except Exception as ws_err:
            logger.warning(f"Erro ao transmitir broadcast WS delete_leads_batch: {ws_err}")
        return Response(status_code=204)
    except Exception as e:
        await db.rollback()
        logger.error(f"❌ Erro ao deletar leads em lote: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Erro interno ao deletar leads: {str(e)}")


@router.delete("/{webhook_id}/leads/{lead_id}", status_code=204)
async def delete_single_lead(webhook_id: int, lead_id: int, db: AsyncSession = Depends(get_db)):
    logger.info(f"🗑️ Deletando lead {lead_id} para webhook {webhook_id}")
    config = await db.get(WebhookConfigModel, webhook_id)
    if not config: 
        raise HTTPException(status_code=404, detail="Webhook não encontrado")
    
    try:
        phone = None
        conversa_id = None
        conta_id = None
        
        async with db.begin_nested():
            try:
                query = text(f"SELECT telefone, conversa_id, conta_id FROM {config.leads_table} WHERE id = :lid AND webhook_config_id = :wid")
                res = await db.execute(query, {"lid": lead_id, "wid": webhook_id})
                row = res.fetchone()
                if row:
                    phone = row[0]
                    conversa_id = row[1]
                    conta_id = row[2]
            except Exception:
                query = text(f"SELECT telefone FROM {config.leads_table} WHERE id = :lid AND webhook_config_id = :wid")
                res = await db.execute(query, {"lid": lead_id, "wid": webhook_id})
                row = res.fetchone()
                if row:
                    phone = row[0]
            
            # Se conversa_id ou conta_id não estiver no registro de leads, tentar recuperar do histórico recente
            if phone and (not conversa_id or not conta_id):
                try:
                    suffix = phone[-8:] if len(phone) >= 8 else phone
                    evt_q = text("SELECT conversa_id, conta_id FROM webhook_events WHERE (telefone = :tel OR RIGHT(telefone, 8) = :suffix) AND webhook_config_id = :wid ORDER BY id DESC LIMIT 1")
                    evt_res = await db.execute(evt_q, {"tel": phone, "suffix": suffix, "wid": webhook_id})
                    evt_row = evt_res.fetchone()
                    if evt_row:
                        conversa_id = conversa_id or evt_row[0]
                        conta_id = conta_id or evt_row[1]
                except Exception as e_evt:
                    logger.warning(f"Aviso ao buscar conversa_id de webhook_events: {e_evt}")

            await db.execute(text(f"DELETE FROM {config.leads_table} WHERE id = :lid"), {"lid": lead_id})
            
            if phone:
                await delete_contact_data(db, webhook_id, config.leads_table, [phone], lead_ids=[lead_id])
                
        await db.commit()
        
        # Resetar etiquetas no ZapVoice para o padrão e enviar despedida (se configurado)
        if conversa_id:
            try:
                from zapvoice_utils import get_default_reset_labels, reset_conversation_labels
                effective_aid = conta_id or getattr(config, "zapvoice_client_id", None) or os.getenv("ZAPVOICE_CLIENT_ID", "")
                zv_url = (getattr(config, "zapvoice_url", None) or os.getenv("ZAPVOICE_URL", "")).rstrip("/")
                zv_token = getattr(config, "zapvoice_api_token", None) or os.getenv("ZAPVOICE_API_TOKEN", "")
                
                if zv_url and zv_token:
                    reset_labels = get_default_reset_labels(config)
                    await reset_conversation_labels(zv_url, effective_aid, conversa_id, zv_token, reset_labels)
                    
                    if config.delete_message:
                        zv_api_url = zv_url if zv_url.endswith("/api") else f"{zv_url}/api"
                        headers = {
                            "Authorization": f"Bearer {zv_token}",
                            "Content-Type": "application/json"
                        }
                        if effective_aid:
                            headers["X-Client-ID"] = str(effective_aid)
                        full_url = f"{zv_api_url}/chat/conversations/{conversa_id}/messages"
                        payload = {"content": config.delete_message, "message_type": "outgoing"}
                        async with httpx.AsyncClient(timeout=10.0, verify=False) as client_http:
                            await client_http.post(full_url, json=payload, headers=headers)
            except Exception as e_zv:
                logger.error(f"Erro ao processar reset de etiquetas/despedida ZapVoice: {e_zv}")
                    
        try:
            from core.websocket import manager
            await manager.broadcast({
                "type": "lead_deleted",
                "webhook_id": webhook_id,
                "lead_id": lead_id,
                "action": "delete"
            })
        except Exception as ws_err:
            logger.warning(f"Erro ao transmitir broadcast WS delete_single_lead: {ws_err}")

        return Response(status_code=204)
    except Exception as e:
        await db.rollback()
        logger.error(f"❌ Erro ao deletar lead único: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Erro interno ao deletar lead: {str(e)}")


@router.delete("/{webhook_id}/leads/all", status_code=204)
async def delete_all_leads(webhook_id: int, db: AsyncSession = Depends(get_db)):
    config = await db.get(WebhookConfigModel, webhook_id)
    if not config: 
        raise HTTPException(status_code=404, detail="Webhook não encontrado")
    
    ids = []
    phones = []
    conv_info_list = []
    try:
        async with db.begin_nested():
            query = text(f"SELECT id, telefone, conversa_id, conta_id FROM {config.leads_table} WHERE webhook_config_id = :wid")
            res = await db.execute(query, {"wid": webhook_id})
            rows = res.fetchall()
            ids = [r[0] for r in rows]
            phones = [r[1] for r in rows if r[1]]
            conv_info_list = [(r[2], r[3]) for r in rows if r[2]]
    except Exception:
        async with db.begin_nested():
            query = text(f"SELECT id, telefone FROM {config.leads_table} WHERE webhook_config_id = :wid")
            res = await db.execute(query, {"wid": webhook_id})
            rows = res.fetchall()
            ids = [r[0] for r in rows]
            phones = [r[1] for r in rows if r[1]]
    
    if ids:
        await delete_contact_data(db, webhook_id, config.leads_table, phones, lead_ids=ids)
    await db.commit()

    # Resetar etiquetas das conversas no ZapVoice para o padrão
    try:
        from zapvoice_utils import get_default_reset_labels, reset_conversation_labels
        zv_url = (getattr(config, "zapvoice_url", None) or os.getenv("ZAPVOICE_URL", "")).rstrip("/")
        zv_token = getattr(config, "zapvoice_api_token", None) or os.getenv("ZAPVOICE_API_TOKEN", "")
        if conv_info_list and zv_url and zv_token:
            reset_labels = get_default_reset_labels(config)
            for conv_id, acc_id in conv_info_list:
                eff_aid = acc_id or getattr(config, "zapvoice_client_id", None) or os.getenv("ZAPVOICE_CLIENT_ID", "")
                try:
                    await reset_conversation_labels(zv_url, eff_aid, conv_id, zv_token, reset_labels)
                except Exception as e_lbl:
                    logger.warning(f"Aviso ao resetar etiquetas da conversa {conv_id} em delete_all: {e_lbl}")
    except Exception as e_all:
        logger.warning(f"Erro ao resetar etiquetas em delete_all ZapVoice: {e_all}")

    try:
        from core.websocket import manager
        await manager.broadcast({
            "type": "lead_deleted",
            "webhook_id": webhook_id,
            "action": "delete_all"
        })
    except Exception as ws_err:
        logger.warning(f"Erro ao transmitir broadcast WS delete_all_leads: {ws_err}")


@router.post("/{webhook_id}/leads/sync-all")
async def sync_all_leads_endpoint(webhook_id: int, db: AsyncSession = Depends(get_db)):
    config = await db.get(WebhookConfigModel, webhook_id)
    if not config: 
        raise HTTPException(status_code=404, detail="Webhook não encontrado")
        
    zv_url = (config.zapvoice_url or os.getenv("ZAPVOICE_URL", "")).rstrip("/")
    zv_token = config.zapvoice_api_token or os.getenv("ZAPVOICE_API_TOKEN", "")
    
    if not zv_url or not zv_token:
        raise HTTPException(status_code=400, detail="Configurações ou credenciais do ZapVoice não configuradas")
        
    if not config.leads_table:
        return {"ok": False, "message": "Tabela de leads não configurada para este webhook"}
        
    try:
        query = text(f"SELECT id, inbox_id, conversa_id FROM {config.leads_table} WHERE webhook_config_id = :wid")
        res = await db.execute(query, {"wid": webhook_id})
        leads = res.fetchall()
        
        from zapvoice_utils import sync_conversation_labels
        
        semaphore = asyncio.Semaphore(5)
        updated_count = 0
        
        async def sync_single_lead(lead_id, c_id, conv_id):
            nonlocal updated_count
            async with semaphore:
                try:
                    success, final_labels = await sync_conversation_labels(
                        zapvoice_url=zv_url,
                        client_id=str(c_id),
                        conversation_id=int(conv_id),
                        token=zv_token
                    )
                    if success:
                        update_q = text(f"UPDATE {config.leads_table} SET labels = :labels, updated_at = CURRENT_TIMESTAMP WHERE id = :id")
                        await db.execute(update_q, {
                            "labels": json.dumps(final_labels, ensure_ascii=False),
                            "id": lead_id
                        })
                        updated_count += 1
                except Exception as e_single:
                    logger.error(f"Erro ao sincronizar etiquetas do lead {lead_id}: {e_single}")
                    
        tasks = []
        for row in leads:
            lead_id, c_id, conv_id = row
            if c_id and conv_id:
                tasks.append(sync_single_lead(lead_id, c_id, conv_id))
                
        if tasks:
            await asyncio.gather(*tasks)
            await db.commit()
            
        try:
            from core.websocket import manager
            await manager.broadcast({
                "type": "leads_synced",
                "webhook_id": webhook_id,
                "action": "sync",
                "updated_count": updated_count
            })
        except Exception as ws_err:
            logger.warning(f"Erro ao transmitir broadcast WS sync_all_leads: {ws_err}")

        return {"ok": True, "message": f"Sincronização concluída com sucesso. {updated_count} contatos atualizados."}
    except Exception as e:
        logger.error(f"Erro na sincronização em massa: {e}")
        return {"ok": False, "message": f"Erro interno ao sincronizar: {str(e)}"}


@router.get("/{webhook_id}/leads/{lead_id}/followup-pipeline")
async def get_lead_followup_pipeline(webhook_id: int, lead_id: int, db: AsyncSession = Depends(get_db)):
    config = await db.get(WebhookConfigModel, webhook_id)
    if not config:
        raise HTTPException(status_code=404, detail="Webhook não encontrado")

    res = await db.execute(
        text(f"SELECT * FROM {config.leads_table} WHERE id = :lead_id AND webhook_config_id = :wid"),
        {"lead_id": lead_id, "wid": webhook_id}
    )
    row = res.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Lead não encontrado")

    lead_dict = dict(zip(res.keys(), row))

    # Suporte a Múltiplos Fluxos de Follow-Up por Produto
    lead_followup_funnel_id = lead_dict.get("active_followup_funnel_id")
    active_funnel_id = "followup_default"
    active_funnel_name = "Padrão / Principal"
    
    funnels = []
    if config.followup_funnels:
        try:
            funnels = json.loads(config.followup_funnels) if isinstance(config.followup_funnels, str) else config.followup_funnels
        except Exception:
            funnels = []

    steps = []
    if funnels and isinstance(funnels, list) and len(funnels) > 0:
        matched_funnel = None
        if lead_followup_funnel_id:
            matched_funnel = next((f for f in funnels if f.get("id") == lead_followup_funnel_id), None)
        if not matched_funnel:
            matched_funnel = next((f for f in funnels if f.get("is_default")), funnels[0])
            
        if matched_funnel:
            active_funnel_id = matched_funnel.get("id", "followup_default")
            active_funnel_name = matched_funnel.get("name", "Padrão / Principal")
            steps = matched_funnel.get("steps", [])
    else:
        steps_raw = config.followup_steps
        if isinstance(steps_raw, str) and steps_raw.strip():
            try:
                steps = json.loads(steps_raw)
            except Exception:
                steps = []
        elif isinstance(steps_raw, list):
            steps = steps_raw

    bh_raw = config.followup_business_hours
    business_hours = None
    if isinstance(bh_raw, str) and bh_raw.strip():
        try:
            business_hours = json.loads(bh_raw)
        except Exception:
            business_hours = None
    elif isinstance(bh_raw, dict):
        business_hours = bh_raw

    tel = lead_dict.get("telefone") or ""
    tel_clean = tel.lstrip("+")
    events_res = await db.execute(
        text("""
            SELECT id, event_type, message_type, mensagem, agent_response, status, created_at, scheduled_at, processing_steps, dono
            FROM webhook_events
            WHERE webhook_config_id = :wid 
              AND (telefone = :t1 OR telefone = :t2 OR telefone = :t3)
              AND (event_type = 'followup' OR message_type = 'followup')
            ORDER BY created_at ASC
        """),
        {"wid": webhook_id, "t1": tel, "t2": f"+{tel_clean}", "t3": tel_clean}
    )
    executed_events = []
    for ev_row in events_res.fetchall():
        ev_dict = dict(zip(events_res.keys(), ev_row))
        executed_events.append(ev_dict)

    lead_labels = []
    lead_labels_raw = lead_dict.get("labels")
    if lead_labels_raw:
        if isinstance(lead_labels_raw, list):
            lead_labels = lead_labels_raw
        elif isinstance(lead_labels_raw, str):
            try:
                parsed = json.loads(lead_labels_raw)
                if isinstance(parsed, list):
                    lead_labels = parsed
                else:
                    lead_labels = [x.strip() for x in lead_labels_raw.split(",") if x.strip()]
            except Exception:
                lead_labels = [x.strip() for x in lead_labels_raw.split(",") if x.strip()]

    lead_labels_lower = [str(lbl).lower().strip() for lbl in lead_labels]

    cancel_labels = []
    if config.ignore_by_label:
        cancel_labels.extend([l.strip() for l in config.ignore_by_label.split(",") if l.strip()])
    if config.followup_cancel_label:
        cancel_labels.extend([l.strip() for l in config.followup_cancel_label.split(",") if l.strip()])
    if not cancel_labels:
        cancel_labels = ["humano"]

    has_cancel_label = any(cl.lower().strip() in lead_labels_lower for cl in cancel_labels)

    current_step = lead_dict.get("followup_step") if lead_dict.get("followup_step") is not None else 0
    ultima_msg_em = lead_dict.get("ultima_mensagem_em")
    
    pipeline_steps = []
    for idx, step_cfg in enumerate(steps):
        delay_hours = float(step_cfg.get("delay_hours", 0))
        delay_minutes = int(step_cfg.get("delay_minutes", delay_hours * 60))
        
        step_type = step_cfg.get("type", "ai")
        prompt = step_cfg.get("custom_prompt", "")
        fixed_msg = step_cfg.get("fixed_message", "")
        media_type = step_cfg.get("media_type", "none")
        media_url = step_cfg.get("media_url", "")

        step_status = "pending"
        dispatched_event = None

        if idx < len(executed_events):
            dispatched_event = executed_events[idx]

        if current_step == -1:
            step_status = "cancelled"
        elif idx < current_step:
            step_status = "completed"
        elif idx == current_step:
            if not config.followup_enabled:
                step_status = "disabled"
            elif has_cancel_label:
                step_status = "cancelled"
            else:
                step_status = "active"
        else:
            step_status = "pending"

        pipeline_steps.append({
            "step_index": idx,
            "step_number": idx + 1,
            "delay_minutes": delay_minutes,
            "type": step_type,
            "custom_prompt": prompt,
            "fixed_message": fixed_msg,
            "media_type": media_type,
            "media_url": media_url,
            "target_audience": step_cfg.get("target_audience", "ambos"),
            "template_name": step_cfg.get("template_name", ""),
            "language": step_cfg.get("language", "pt_BR"),
            "template_variables": step_cfg.get("template_variables", {}),
            "template_header_media": step_cfg.get("template_header_media", ""),
            "status": step_status,
            "dispatched_event": dispatched_event
        })

    overall_status = "active"
    status_message = "Em andamento na régua de follow-up"

    if not config.followup_enabled:
        overall_status = "disabled"
        status_message = "Follow-up desativado nas configurações do webhook"
    elif has_cancel_label:
        overall_status = "cancelled"
        status_message = f"Cancelado devido à etiqueta de cancelamento ({', '.join(cancel_labels)})"
    elif current_step == -1:
        overall_status = "responded" if executed_events else "cancelled"
        status_message = "🎉 Concluído com Sucesso (Lead Respondeu / Conversa Ativa)" if executed_events else "Finalizado / Desativado"
    elif not steps:
        overall_status = "no_steps"
        status_message = "Nenhum passo de follow-up configurado"
    elif current_step >= len(steps):
        overall_status = "completed"
        status_message = "Todos os passos da régua foram concluídos"
    else:
        overall_status = "active"
        status_message = f"Aguardando disparo do Passo {current_step + 1}"

    return {
        "lead": {
            "id": lead_dict.get("id"),
            "contato_nome": lead_dict.get("contato_nome") or lead_dict.get("nome"),
            "telefone": lead_dict.get("telefone"),
            "followup_step": current_step,
            "active_followup_funnel_id": lead_followup_funnel_id,
            "ultima_mensagem_em": ultima_msg_em,
            "labels": lead_labels,
            "pode_enviar_mensagem": lead_dict.get("pode_enviar_mensagem", True)
        },
        "active_funnel": {
            "id": active_funnel_id,
            "name": active_funnel_name
        },
        "webhook": {
            "id": config.id,
            "name": config.name,
            "followup_enabled": config.followup_enabled,
            "cancel_labels": cancel_labels,
            "required_label": config.followup_required_label,
            "business_hours": business_hours
        },
        "overall_status": overall_status,
        "status_message": status_message,
        "steps": pipeline_steps,
        "executed_events": executed_events,
        "server_now": get_now_br()
    }


@router.get("/{webhook_id}/leads/{lead_id}/variables")
async def get_lead_variables(
    webhook_id: int,
    lead_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Retorna todas as variáveis globais do sistema e seus valores capturados/extraídos para um contato específico."""
    config = await db.get(WebhookConfigModel, webhook_id)
    if not config:
        raise HTTPException(status_code=404, detail="Webhook não encontrado")

    # Buscar dados do lead na tabela de leads
    query_lead = text(f"SELECT * FROM {config.leads_table} WHERE id = :lid AND webhook_config_id = :wid")
    res_lead = await db.execute(query_lead, {"lid": lead_id, "wid": webhook_id})
    row = res_lead.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Contato não encontrado")

    lead_dict = dict(zip(res_lead.keys(), row))
    telefone = lead_dict.get("telefone") or ""
    clean_tel = telefone.lstrip("+")

    # Coletar possíveis session_ids associados ao contato
    candidate_sids = {str(lead_id), telefone, clean_tel, f"+{clean_tel}", f"tel_{clean_tel}"}
    if lead_dict.get("conversa_id"):
        candidate_sids.add(str(lead_dict["conversa_id"]))

    # Buscar conversa_id em webhook_events caso existam
    if clean_tel:
        try:
            evt_query = text("""
                SELECT DISTINCT conversa_id 
                FROM webhook_events 
                WHERE webhook_config_id = :wid 
                AND (telefone = :t1 OR telefone = :t2)
                AND conversa_id IS NOT NULL AND conversa_id != ''
            """)
            evt_res = await db.execute(evt_query, {"wid": webhook_id, "t1": clean_tel, "t2": f"+{clean_tel}"})
            for (c_id,) in evt_res.fetchall():
                if c_id:
                    candidate_sids.add(str(c_id))
        except Exception as e_evt:
            logger.warning(f"Erro ao buscar conversa_ids de webhook_events: {e_evt}")

    all_sids = list(candidate_sids - {"", None, "None"})

    # Buscar todas as variáveis globais
    vars_stmt = select(GlobalContextVariableModel).order_by(GlobalContextVariableModel.id.asc())
    vars_res = await db.execute(vars_stmt)
    all_vars = vars_res.scalars().all()

    # Buscar memórias do usuário para os session_ids
    mem_dict = {}
    if all_sids:
        mem_stmt = (
            select(UserMemoryModel)
            .where(UserMemoryModel.session_id.in_(all_sids))
            .order_by(UserMemoryModel.updated_at.desc())
        )
        mem_res = await db.execute(mem_stmt)
        mems = mem_res.scalars().all()
        for m in mems:
            if m.key not in mem_dict:
                mem_dict[m.key] = m

    variables_data = []
    for v in all_vars:
        mem = mem_dict.get(v.key)
        val = None
        has_val = False
        origin = v.extraction_method or "integration"
        value_origin = "pending"
        is_default_value = False
        is_extracted_from_conversation = False
        matches_default = False
        updated_at = None
        source_message = None
        confidence = None

        has_default_val = v.value is not None and str(v.value).strip() != ""

        if mem and mem.value is not None and str(mem.value).strip() != "":
            val = mem.value
            has_val = True
            updated_at = mem.updated_at.isoformat() if mem.updated_at else None
            source_message = mem.source_message
            confidence = mem.confidence

            # Se possui source_message gravada da conversa, foi extraída pela IA no diálogo
            if source_message and str(source_message).strip():
                value_origin = "conversation_extracted"
                origin = "ai"
                is_extracted_from_conversation = True
                if has_default_val:
                    matches_default = str(val).strip().lower() == str(v.value).strip().lower()
            else:
                # Se não tem source_message e coincide com o valor padrão cadastrado, trata-se do valor padrão inicial
                if has_default_val and str(val).strip().lower() == str(v.value).strip().lower():
                    value_origin = "initial_default"
                    is_default_value = True
                    origin = "default"
                    matches_default = True
                else:
                    value_origin = "conversation_extracted"
                    origin = "ai" if v.extraction_method == "ai" else "memory"
                    is_extracted_from_conversation = True

        elif v.key in ["contact_name", "nome", "nome_cliente"] and (lead_dict.get("contato_nome") or "").strip():
            val = lead_dict.get("contato_nome").strip()
            has_val = True
            origin = "contact_profile"
            value_origin = "contact_profile"
        elif v.key in ["contact_phone", "telefone", "telefone_cliente"] and (telefone or "").strip():
            val = telefone.strip()
            has_val = True
            origin = "contact_profile"
            value_origin = "contact_profile"
        elif v.key in ["lead_id", "id_lead", "id_contato"]:
            val = str(lead_id)
            has_val = True
            origin = "system"
            value_origin = "system"
        elif has_default_val:
            # Não há registro no UserMemoryModel, mas a variável tem valor padrão configurado
            val = v.value
            has_val = True
            origin = "default"
            value_origin = "initial_default"
            is_default_value = True
            matches_default = True
        else:
            value_origin = "pending"
            origin = v.extraction_method or "integration"

        variables_data.append({
            "id": v.id,
            "key": v.key,
            "type": v.type or "string",
            "description": v.description or "",
            "extraction_method": v.extraction_method or "integration",
            "extraction_prompt": v.extraction_prompt or "",
            "default_value": v.value,
            "value": val,
            "has_value": has_val,
            "origin": origin,
            "value_origin": value_origin,
            "is_default_value": is_default_value,
            "is_extracted_from_conversation": is_extracted_from_conversation,
            "matches_default": matches_default,
            "updated_at": updated_at,
            "source_message": source_message,
            "confidence": confidence
        })

    total_captured = sum(1 for item in variables_data if item["has_value"])
    total_pending = sum(1 for item in variables_data if not item["has_value"])

    return {
        "lead": {
            "id": lead_dict.get("id"),
            "contato_nome": lead_dict.get("contato_nome") or lead_dict.get("nome"),
            "telefone": telefone,
            "labels": lead_dict.get("labels") or ""
        },
        "total_variables": len(variables_data),
        "total_captured": total_captured,
        "total_pending": total_pending,
        "variables": variables_data
    }

