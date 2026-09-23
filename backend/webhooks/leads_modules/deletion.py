import os
import json
import logging
import asyncio
import httpx
import sys
from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from database import get_db
from models import WebhookConfigModel
from webhooks.schemas import LeadBulkDeleteRequest
from webhooks.service import delete_contact_data as default_delete_contact_data

logger = logging.getLogger(__name__)
router = APIRouter()


def _get_delete_contact_data_func():
    """Recupera dinamicamente a função de deleção de dados para garantir suporte a patches em testes."""
    wh_leads_mod = sys.modules.get("webhooks.leads")
    if wh_leads_mod and hasattr(wh_leads_mod, "delete_contact_data"):
        return getattr(wh_leads_mod, "delete_contact_data")
    return default_delete_contact_data


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

    del_func = _get_delete_contact_data_func()
    await del_func(db, webhook_id, config.leads_table, [phone])
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
        del_func = _get_delete_contact_data_func()
        await del_func(db, webhook_id, config.leads_table, phones, lead_ids=req.lead_ids)
        await db.commit()

        # Resetar etiquetas das conversas no ZapVoice para o padrão em segundo plano (ou awaited em testes)
        try:
            from zapvoice_utils import get_default_reset_labels, bulk_reset_conversation_labels
            zv_url = (getattr(config, "zapvoice_url", None) or os.getenv("ZAPVOICE_URL", "")).rstrip("/")
            zv_token = getattr(config, "zapvoice_api_token", None) or os.getenv("ZAPVOICE_API_TOKEN", "")
            default_aid = getattr(config, "zapvoice_client_id", None) or os.getenv("ZAPVOICE_CLIENT_ID", "")
            if conv_info_list and zv_url and zv_token:
                reset_labels = get_default_reset_labels(config)
                reset_coro = bulk_reset_conversation_labels(
                    zapvoice_url=zv_url,
                    default_client_id=default_aid,
                    conv_info_list=conv_info_list,
                    token=zv_token,
                    labels=reset_labels,
                    concurrency=15
                )
                if "pytest" in sys.modules or os.getenv("TESTING"):
                    await reset_coro
                else:
                    asyncio.create_task(reset_coro)
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
                del_func = _get_delete_contact_data_func()
                await del_func(db, webhook_id, config.leads_table, [phone], lead_ids=[lead_id])
                
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
        del_func = _get_delete_contact_data_func()
        await del_func(db, webhook_id, config.leads_table, phones, lead_ids=ids)
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
