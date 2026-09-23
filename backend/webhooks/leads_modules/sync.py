import os
import json
import logging
import asyncio
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from database import get_db
from models import WebhookConfigModel

logger = logging.getLogger(__name__)
router = APIRouter()


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
