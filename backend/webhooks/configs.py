import os
import uuid
import json
import logging
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_

from database import get_db
from models import WebhookConfigModel
from core.timezone import get_now_utc
from .utils import sanitize_table_name
from .service import ensure_leads_table
from .schemas import (
    WebhookConfigCreate,
    WebhookConfigUpdate,
    WebhookConfigResponse
)

logger = logging.getLogger(__name__)
router = APIRouter()

CHATWOOT_URL_DEFAULT = (os.getenv("CHATWOOT_URL") or "").rstrip("/")
CHATWOOT_TOKEN_DEFAULT = os.getenv("CHATWOOT_API_TOKEN") or ""


@router.post("/upload-media")
async def upload_followup_media(request: Request, file: UploadFile = File(...)):
    """Recebe um arquivo de mídia (áudio, imagem, PDF) para o follow-up e salva em /uploads."""
    try:
        temp_dir = os.path.join(os.getcwd(), "tmp_uploads")
        os.makedirs(temp_dir, exist_ok=True)
        ext = os.path.splitext(file.filename)[1] or ".bin"
        unique_name = f"media_followup_{uuid.uuid4().hex[:10]}{ext}"
        file_path = os.path.join(temp_dir, unique_name)
        
        contents = await file.read()
        with open(file_path, "wb") as f:
            f.write(contents)
            
        env_public = os.getenv("BACKEND_PUBLIC_URL") or os.getenv("PUBLIC_URL")
        if env_public:
            base_url = env_public.rstrip("/")
        else:
            forwarded_proto = request.headers.get("x-forwarded-proto", request.url.scheme)
            forwarded_host = request.headers.get("x-forwarded-host") or request.headers.get("host")
            if forwarded_host:
                base_url = f"{forwarded_proto}://{forwarded_host}".rstrip("/")
            else:
                base_url = str(request.base_url).rstrip("/")
                
        public_url = f"{base_url}/uploads/{unique_name}"
        logger.info(f"[UploadMedia] Arquivo salvo em {file_path} -> URL: {public_url}")
        return {"url": public_url, "filename": file.filename}
    except Exception as e:
        logger.error(f"[UploadMedia] Erro ao salvar upload de mídia: {e}")
        raise HTTPException(status_code=500, detail="Erro ao realizar upload do arquivo")


@router.get("/", response_model=List[WebhookConfigResponse])
@router.get("", response_model=List[WebhookConfigResponse], include_in_schema=False)
async def list_webhooks(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(WebhookConfigModel).order_by(WebhookConfigModel.created_at.desc()))
    return result.scalars().all()


@router.get("/chatwoot-config")
async def get_chatwoot_global_config():
    return {"configured": bool(CHATWOOT_URL_DEFAULT and CHATWOOT_TOKEN_DEFAULT), "url": CHATWOOT_URL_DEFAULT}


@router.get("/{webhook_id}", response_model=WebhookConfigResponse)
async def get_webhook(webhook_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(WebhookConfigModel).where(WebhookConfigModel.id == webhook_id))
    config = result.scalar_one_or_none()
    if not config:
        raise HTTPException(status_code=404, detail="Webhook não encontrado")
    return config


@router.post("/", response_model=WebhookConfigResponse, status_code=201)
@router.post("", response_model=WebhookConfigResponse, status_code=201, include_in_schema=False)
async def create_webhook(payload: WebhookConfigCreate, db: AsyncSession = Depends(get_db)):
    table_name = sanitize_table_name(payload.leads_table)
    token = payload.token or uuid.uuid4().hex[:8]
    memory_token = payload.memory_token or uuid.uuid4().hex[:8]
    
    existing = await db.execute(select(WebhookConfigModel).where(
        or_(WebhookConfigModel.token == token, WebhookConfigModel.memory_token == memory_token)
    ))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Token já em uso")

    await ensure_leads_table(table_name)
    data = payload.model_dump()
    for k, v in data.items():
        if isinstance(v, (list, dict)) and v is not None:
            data[k] = json.dumps(v, ensure_ascii=False)

    config = WebhookConfigModel(**data)
    config.token, config.memory_token, config.leads_table = token, memory_token, table_name
    
    # Garantir que agent_id 0 seja tratado como nulo para evitar erro de FK
    if config.agent_id == 0:
        config.agent_id = None
        
    db.add(config)
    await db.commit()
    await db.refresh(config)
    logger.info(f"✨ Webhook '{config.name}' criado com sucesso (ID: {config.id}, Agent: {config.agent_id})")
    return config


@router.put("/{webhook_id}", response_model=WebhookConfigResponse)
async def update_webhook(webhook_id: int, payload: WebhookConfigUpdate, db: AsyncSession = Depends(get_db)):
    config = await db.get(WebhookConfigModel, webhook_id)
    if not config:
        raise HTTPException(status_code=404, detail="Webhook não encontrado")

    update_data = payload.model_dump(exclude_unset=True)
    if "leads_table" in update_data:
        update_data["leads_table"] = sanitize_table_name(update_data["leads_table"])
        await ensure_leads_table(update_data["leads_table"])
    
    if "token" in update_data and update_data["token"] != config.token:
        dup = await db.execute(select(WebhookConfigModel).where(WebhookConfigModel.token == update_data["token"]))
        if dup.scalar_one_or_none(): 
            raise HTTPException(status_code=400, detail="Token em uso")

    # Sincroniza o funil padrão em followup_funnels com followup_steps
    if "followup_steps" in update_data:
        steps_val = update_data["followup_steps"]
        funnels_val = update_data.get("followup_funnels")
        if funnels_val is None and config.followup_funnels:
            try:
                funnels_val = json.loads(config.followup_funnels) if isinstance(config.followup_funnels, str) else config.followup_funnels
            except Exception:
                funnels_val = []

        if isinstance(funnels_val, list) and funnels_val:
            has_default = False
            for f in funnels_val:
                if f.get("id") == "followup_default" or f.get("is_default"):
                    f["steps"] = steps_val
                    has_default = True
                    break
            if not has_default:
                funnels_val.append({"id": "followup_default", "name": "Padrão / Principal", "is_default": True, "steps": steps_val})
            update_data["followup_funnels"] = funnels_val
        elif isinstance(steps_val, list) and steps_val:
            update_data["followup_funnels"] = [{"id": "followup_default", "name": "Padrão / Principal", "is_default": True, "steps": steps_val}]

    for key, value in update_data.items():
        if isinstance(value, (list, dict)):
            value = json.dumps(value, ensure_ascii=False)
        
        # Garantir que agent_id 0 seja tratado como nulo
        if key == "agent_id" and value == 0:
            value = None
            
        setattr(config, key, value)

    config.updated_at = get_now_utc()
    await db.commit()
    await db.refresh(config)
    logger.info(f"💾 Webhook '{config.name}' atualizado (ID: {config.id}, Agent: {config.agent_id})")
    return config


@router.patch("/{webhook_id}/toggle-active")
async def toggle_webhook_active(webhook_id: int, db: AsyncSession = Depends(get_db)):
    config = await db.get(WebhookConfigModel, webhook_id)
    if not config:
        raise HTTPException(status_code=404, detail="Webhook não encontrado")
    
    config.is_active = not config.is_active
    config.updated_at = get_now_utc()
    await db.commit()
    await db.refresh(config)
    
    status = "ATIVADO" if config.is_active else "DESATIVADO"
    logger.info(f"🔌 Webhook '{config.name}' {status} (ID: {config.id})")
    return {"ok": True, "is_active": config.is_active}


@router.delete("/{webhook_id}", status_code=204)
async def delete_webhook(webhook_id: int, db: AsyncSession = Depends(get_db)):
    config = await db.get(WebhookConfigModel, webhook_id)
    if not config: 
        raise HTTPException(status_code=404, detail="Webhook não encontrado")
    await db.delete(config)
    await db.commit()
