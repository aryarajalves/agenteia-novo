import logging
import os
from typing import List, Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from api.deps import get_db, verify_api_key
import sys
from zapvoice_utils import send_zapvoice_whatsapp_template as default_send_template

logger = logging.getLogger(__name__)
router = APIRouter()


def _get_send_template_func():
    leads_mod = sys.modules.get("api.routers.leads")
    if leads_mod and hasattr(leads_mod, "send_zapvoice_whatsapp_template"):
        return getattr(leads_mod, "send_zapvoice_whatsapp_template")
    return default_send_template




class MassDispatchLeadItem(BaseModel):
    id: Optional[int] = None
    leads_table: Optional[str] = "leads"
    telefone: str
    conversa_id: Optional[str] = None
    conta_id: Optional[str] = None
    webhook_config_id: Optional[int] = None
    contato_nome: Optional[str] = None


class CRMMassDispatchPayload(BaseModel):
    leads: List[MassDispatchLeadItem]
    template_name: str
    template_language: Optional[str] = "pt_BR"
    product_name: Optional[str] = None
    webhook_config_id: Optional[int] = None


@router.post("/leads/crm/mass-dispatch")
async def execute_crm_mass_dispatch(
    payload: CRMMassDispatchPayload,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(verify_api_key)
):
    """
    Dispara um Template Oficial do WhatsApp (ZapVoice/Meta) em massa para os contatos selecionados no CRM
    (ex: Alunos/Compradores que estão iniciando a esteira do próximo produto / Mentoria).
    """
    logger.info(f"🚀 Iniciando disparo em massa do template '{payload.template_name}' para {len(payload.leads)} contatos.")
    
    if not payload.leads:
        raise HTTPException(status_code=400, detail="Nenhum contato selecionado para o disparo em massa.")
        
    if not payload.template_name:
        raise HTTPException(status_code=400, detail="Nome do template oficial é obrigatório.")

    # Obter configurações de webhook para credenciais do ZapVoice
    wh_res = await db.execute(text("SELECT id, zapvoice_url, zapvoice_api_token, zapvoice_client_id FROM webhook_configs"))
    wh_map = {r[0]: {"url": r[1], "token": r[2], "client_id": r[3]} for r in wh_res.fetchall()}

    fallback_wh = next(iter(wh_map.values())) if wh_map else {
        "url": os.getenv("ZAPVOICE_URL", ""),
        "token": os.getenv("ZAPVOICE_API_TOKEN", ""),
        "client_id": os.getenv("ZAPVOICE_CLIENT_ID", "")
    }

    sent_count = 0
    failed_count = 0
    results = []

    for item in payload.leads:
        wh_cfg = wh_map.get(item.webhook_config_id or payload.webhook_config_id, fallback_wh)
        zv_url = wh_cfg.get("url") or os.getenv("ZAPVOICE_URL", "")
        zv_token = wh_cfg.get("token") or os.getenv("ZAPVOICE_API_TOKEN", "")
        zv_client_id = wh_cfg.get("client_id") or item.conta_id or ""

        if not zv_url or not zv_token:
            failed_count += 1
            results.append({"telefone": item.telefone, "success": False, "error": "Credenciais do ZapVoice ausentes"})
            continue

        try:
            send_func = _get_send_template_func()
            success, res_data = await send_func(
                zapvoice_url=zv_url,
                token=zv_token,
                client_id=str(zv_client_id),
                phone=item.telefone,
                template_name=payload.template_name,
                language=payload.template_language or "pt_BR"
            )

            if success:
                sent_count += 1
                results.append({"telefone": item.telefone, "success": True})
            else:
                failed_count += 1
                results.append({"telefone": item.telefone, "success": False, "error": str(res_data)})
        except Exception as e_send:
            failed_count += 1
            results.append({"telefone": item.telefone, "success": False, "error": str(e_send)})

    return {
        "success": True,
        "template_name": payload.template_name,
        "total_requested": len(payload.leads),
        "sent_count": sent_count,
        "failed_count": failed_count,
        "results": results
    }
