import re
import uuid
import json
import logging
import os
import time
import asyncio
import httpx
import tempfile
import redis as redis_lib
from fastapi import APIRouter, Depends, HTTPException, Request, Query, Response, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text, or_, and_, func
from pydantic import BaseModel, field_validator
from typing import Optional, List, Any, Union
from datetime import datetime, timedelta, timezone
from core.timezone import get_now_br, get_now_utc

from database import get_db, engine
from api.deps import verify_api_key
from core.websocket import manager
from models import (
    WebhookConfigModel, WebhookEventModel, InteractionLog, 
    SessionSummary, KnowledgeItemModel, UserMemoryModel
)
from transcription_service import transcribe_video
from vision_service import analyze_image
from webhook_tasks import process_webhook_automation, sync_memory_to_vector, process_media_content_task

from .utils import (
    get_value_by_path, flatten_dict, sanitize_table_name, 
    normalize_phone, get_phone_suffix
)
from .service import ensure_leads_table, upsert_lead, delete_contact_data, handle_keyword_handoffs

_redis = redis_lib.from_url(os.getenv("REDIS_URL", "redis://redis:6379/0"), decode_responses=True)

CHATWOOT_URL_DEFAULT = (os.getenv("CHATWOOT_URL") or "").rstrip("/")
CHATWOOT_TOKEN_DEFAULT = os.getenv("CHATWOOT_API_TOKEN") or ""

def _pending_key(webhook_config_id: int, conversa_id: str) -> str:
    return f"webhook:pending:{webhook_config_id}:{conversa_id}"

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/webhooks", tags=["webhooks"])


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


# --- Schemas ---

class WebhookConfigCreate(BaseModel):
    name: str
    leads_table: str = "leads"
    description: Optional[str] = None
    disable_ai_responses: bool = False
    delay_seconds: int = 30
    agent_id: Optional[int] = None
    blocked_messages: List[str] = []
    allowed_contacts: List[str] = []
    zapvoice_url: Optional[str] = None
    zapvoice_api_token: Optional[str] = None
    zapvoice_client_id: Optional[str] = None
    labels_on_message: List[str] = []
    delete_keywords: List[str] = []
    delete_message: Optional[str] = None
    delete_labels: List[str] = []
    response_delay_seconds: int = 0
    split_response_enabled: bool = True
    window_close_label: List[str] = []
    followup_enabled: bool = False
    followup_steps: List[dict] = []
    followup_business_hours: Optional[dict] = None
    followup_cancel_label: Optional[str] = None
    followup_required_label: Optional[str] = None
    followup_add_label: Optional[str] = None
    followup_on_reply: Optional[str] = "stop"
    memory_sync_enabled: bool = False
    memory_phone_path: str = "phone"
    memory_name_path: Optional[str] = None
    memory_mappings: List[dict] = []
    ignore_by_label: Optional[str] = None
    negative_feedback_label: Optional[str] = None
    handoff_labels_to_add: List[str] = []
    handoff_labels_to_remove: List[str] = []
    handoff_keyword: Optional[str] = None
    handoff_message: Optional[str] = None
    ai_handoff_labels_to_add: List[str] = []
    ai_handoff_labels_to_remove: List[str] = []
    ai_handoff_keyword: Optional[str] = None
    ai_handoff_message: Optional[str] = None
    token: Optional[str] = None
    memory_token: Optional[str] = None
    secondary_agent_ids: List[int] = []
    project_assistant_label: Optional[str] = None
    project_assistant_keyword: Optional[str] = None
    project_assistant_deactivate_keyword: Optional[str] = None
    project_assistant_entry_message: Optional[str] = None
    project_assistant_exit_message: Optional[str] = None

class SimulateLoadRequest(BaseModel):
    contact_count: int = 10
    sample_message: str = "Olá, gostaria de testar o suporte e a automação do sistema."
    concurrency_rate: int = 20
    respect_delay: bool = False

class WebhookConfigResponse(BaseModel):
    id: int
    name: str
    token: str
    memory_token: Optional[str]
    leads_table: str
    description: Optional[str]
    is_active: Optional[bool] = True
    disable_ai_responses: Optional[bool] = False
    delay_seconds: Optional[int] = 30
    agent_id: Optional[int] = None
    blocked_messages: Union[List[str], Any, None] = []
    allowed_contacts: Union[List[str], Any, None] = []
    zapvoice_url: Optional[str] = None
    zapvoice_api_token: Optional[str] = None
    zapvoice_client_id: Optional[str] = None
    labels_on_message: Union[List[str], Any, None] = []
    delete_keywords: Union[List[str], Any, None] = []
    delete_message: Optional[str] = None
    delete_labels: Union[List[str], Any, None] = []
    response_delay_seconds: Optional[int] = None
    split_response_enabled: Optional[bool] = True
    window_close_label: Union[List[str], Any, None] = []
    followup_enabled: Optional[bool] = None
    followup_steps: Union[List[dict], Any, None] = []
    followup_business_hours: Union[dict, Any, None] = None
    followup_cancel_label: Optional[str] = None
    followup_required_label: Optional[str] = None
    followup_add_label: Optional[str] = None
    followup_on_reply: Optional[str] = "stop"
    memory_sync_enabled: Optional[bool] = False
    memory_phone_path: Optional[str] = "phone"
    memory_mappings: Union[List[dict], Any, None] = []
    ignore_by_label: Optional[str] = None
    negative_feedback_label: Optional[str] = None
    handoff_labels_to_add: Union[List[str], Any, None] = []
    handoff_labels_to_remove: Union[List[str], Any, None] = []
    handoff_keyword: Optional[str] = None
    handoff_message: Optional[str] = None
    ai_handoff_labels_to_add: Union[List[str], Any, None] = []
    ai_handoff_labels_to_remove: Union[List[str], Any, None] = []
    ai_handoff_keyword: Optional[str] = None
    ai_handoff_message: Optional[str] = None
    secondary_agent_ids: Union[List[int], Any, None] = []
    project_assistant_label: Optional[str] = None
    project_assistant_keyword: Optional[str] = None
    project_assistant_deactivate_keyword: Optional[str] = None
    project_assistant_entry_message: Optional[str] = None
    project_assistant_exit_message: Optional[str] = None
    created_at: Optional[datetime] = None

    @field_validator(
        "blocked_messages", "allowed_contacts", "labels_on_message", 
        "delete_keywords", "delete_labels", "window_close_label", "followup_steps", 
        "followup_business_hours", "memory_mappings", "handoff_labels_to_add", 
        "handoff_labels_to_remove", "ai_handoff_labels_to_add", 
        "ai_handoff_labels_to_remove", "secondary_agent_ids",
        mode="before"
    )
    @classmethod
    def parse_json_fields(cls, v):
        if isinstance(v, str):
            try:
                return json.loads(v)
            except:
                return v
        return v

    class Config:
        from_attributes = True

class WebhookConfigUpdate(BaseModel):
    name: Optional[str] = None
    leads_table: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None
    disable_ai_responses: Optional[bool] = None
    delay_seconds: Optional[int] = None
    agent_id: Optional[int] = None
    blocked_messages: Optional[List[str]] = None
    allowed_contacts: Optional[List[str]] = None
    zapvoice_url: Optional[str] = None
    zapvoice_api_token: Optional[str] = None
    zapvoice_client_id: Optional[str] = None
    labels_on_message: Optional[List[str]] = None
    delete_keywords: Optional[List[str]] = None
    delete_message: Optional[str] = None
    delete_labels: Optional[List[str]] = None
    response_delay_seconds: Optional[int] = None
    split_response_enabled: Optional[bool] = None
    window_close_label: Optional[List[str]] = None
    followup_enabled: Optional[bool] = None
    followup_steps: Optional[List[dict]] = None
    followup_business_hours: Optional[dict] = None
    followup_cancel_label: Optional[str] = None
    followup_required_label: Optional[str] = None
    followup_add_label: Optional[str] = None
    followup_on_reply: Optional[str] = None
    memory_sync_enabled: Optional[bool] = None
    memory_phone_path: Optional[str] = None
    memory_name_path: Optional[str] = None
    memory_mappings: Optional[List[dict]] = None
    ignore_by_label: Optional[str] = None
    negative_feedback_label: Optional[str] = None
    handoff_labels_to_add: Optional[List[str]] = None
    handoff_labels_to_remove: Optional[List[str]] = None
    handoff_keyword: Optional[str] = None
    handoff_message: Optional[str] = None
    ai_handoff_labels_to_add: Optional[List[str]] = None
    ai_handoff_labels_to_remove: Optional[List[str]] = None
    ai_handoff_keyword: Optional[str] = None
    ai_handoff_message: Optional[str] = None
    token: Optional[str] = None
    memory_token: Optional[str] = None
    secondary_agent_ids: Optional[List[int]] = None
    project_assistant_label: Optional[str] = None
    project_assistant_keyword: Optional[str] = None
    project_assistant_deactivate_keyword: Optional[str] = None
    project_assistant_entry_message: Optional[str] = None
    project_assistant_exit_message: Optional[str] = None

class LeadHistoryItem(BaseModel):
    id: int
    contato_id: Optional[str]
    telefone: Optional[str]
    conteudo: str
    dono: str 
    timestamp: datetime
    index: int 

class LeadHistoryResponse(BaseModel):
    total: int
    page: int
    page_size: int
    items: List[LeadHistoryItem]

class BulkDeleteRequest(BaseModel):
    event_ids: List[int]

class LeadBulkDeleteRequest(BaseModel):
    lead_ids: List[int]

class WebhookEventsPaginatedResponse(BaseModel):
    total: int
    items: List[dict]

class WebhookEventResponse(BaseModel):
    id: int
    webhook_config_id: Optional[int]
    event_type: Optional[str]
    conta_id: Optional[str]
    inbox_id: Optional[str]
    inbox_nome: Optional[str]
    conversa_id: Optional[str]
    mensagem_id: Optional[str]
    contato_id: Optional[str]
    telefone: Optional[str]
    labels: Optional[str]
    contato_nome: Optional[str]
    mensagem: Optional[str]
    link: Optional[str]
    status: Optional[str]
    legenda: Optional[str]
    processing_steps: Optional[str]
    scheduled_at: Optional[datetime]
    created_at: datetime


# --- Routes ---

@router.get("", response_model=List[WebhookConfigResponse])
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

@router.post("", response_model=WebhookConfigResponse, status_code=201)
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
        if dup.scalar_one_or_none(): raise HTTPException(status_code=400, detail="Token em uso")

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
    if not config: raise HTTPException(status_code=404, detail="Webhook não encontrado")
    await db.delete(config)
    await db.commit()

@router.get("/receive/{token}", status_code=200)
async def check_webhook_active(token: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(WebhookConfigModel).where(WebhookConfigModel.token == token, WebhookConfigModel.is_active == True))
    config = result.scalar_one_or_none()
    if not config:
        raise HTTPException(status_code=404, detail="Webhook inativo ou token inválido")
    
    return {
        "status": "online",
        "webhook_name": config.name,
        "message": f"O webhook '{config.name}' está ativo e pronto para receber requisições POST!"
    }

@router.post("/receive/{token}", status_code=200)
async def receive_webhook(token: str, request: Request, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(WebhookConfigModel).where(WebhookConfigModel.token == token, WebhookConfigModel.is_active == True))
    config = result.scalar_one_or_none()
    if not config: raise HTTPException(status_code=404, detail="Webhook inativo")

    try: body = await request.json()
    except: raise HTTPException(status_code=400, detail="JSON inválido")

    # Extração Básica e Completa
    is_zapvoice = "event" in body and "message" in body and "contact" in body
    if is_zapvoice:
        zap_msg = body.get("message", {}) or {}
        zap_contact = body.get("contact", {}) or {}
        sender_type = zap_msg.get("sender_type", "contact")
        
        is_out = sender_type in ("user", "system")
        phone = normalize_phone(str(zap_contact.get("phone") or ""))
        msg_id = str(zap_msg.get("id") or "")
        
        labels_raw = zap_contact.get("labels", [])
        if not labels_raw:
            labels_raw = body.get("labels", [])
        labels_str = json.dumps(labels_raw) if isinstance(labels_raw, list) else str(labels_raw or "[]")
        
        content_type = zap_msg.get("message_type", "text")
        
        media_url_raw = str(zap_msg.get("media_url") or "")
        if media_url_raw.startswith("media_id:"):
            media_id = media_url_raw.split("media_id:")[1]
            zv_url = (config.zapvoice_url or os.getenv("ZAPVOICE_URL", "")).rstrip("/")
            if zv_url and not zv_url.endswith("/api"):
                zv_url = f"{zv_url}/api"
            zv_token = config.zapvoice_api_token or os.getenv("ZAPVOICE_API_TOKEN", "")
            client_id = str(body.get("client_id") or "")
            media_url_raw = f"{zv_url}/chat/media/{media_id}?client_id={client_id}&token={zv_token}"
        
        zv_name = (
            zap_contact.get("name") or 
            zap_contact.get("pushname") or 
            zap_contact.get("push_name") or 
            body.get("contact_name") or 
            body.get("name")
        )
        contato_nome_val = str(zv_name).strip() if zv_name and str(zv_name).strip() and str(zv_name).strip().lower() not in ("none", "null", "contato desconhecido") else None

        extracted = {
            "conta_id": str(body.get("client_id") or ""),
            "inbox_id": str(body.get("client_id") or ""),
            "inbox_nome": "ZapVoice Canal",
            "conversa_id": str(zap_msg.get("conversation_id") or ""),
            "mensagem_id": msg_id,
            "contato_id": str(zap_contact.get("phone") or ""),
            "telefone": phone,
            "contato_nome": contato_nome_val,
            "mensagem": str(zap_msg.get("template_content") or zap_msg.get("content") or ""),
            "labels": labels_str,
            "link": media_url_raw,
            "dono": "agente" if is_out else "usuario",
            "message_type": content_type
        }
    else:
        conv = body.get("conversation", {}) or {}
        sender = body.get("sender", {}) or {}
        inbox = body.get("inbox", {}) or {}
        account = body.get("account", {}) or {}
        is_out = str(body.get("message_type")) in ("1", "outgoing")
        if is_out and "meta" in conv: sender = conv["meta"].get("sender", sender)

        phone = normalize_phone(str(sender.get("phone_number") or ""))
        msg_id = str(body.get("id") or "")
        
        # Extrair etiquetas se disponíveis
        labels_raw = body.get("labels", [])
        if not labels_raw and conv:
            labels_raw = conv.get("labels", [])
        labels_str = json.dumps(labels_raw) if isinstance(labels_raw, list) else str(labels_raw or "[]")

        # Detecção refinada do tipo de conteúdo (Chatwoot)
        attachments = body.get("attachments", [])
        content_type = "text"
        if attachments and len(attachments) > 0:
            file_type = attachments[0].get("file_type", "")
            if "image" in file_type: content_type = "image"
            elif "audio" in file_type: content_type = "audio"
            elif "video" in file_type: content_type = "video"
            elif "file" in file_type or "application" in file_type: content_type = "document"
            else: content_type = file_type or "file"

        meta_sender = (conv.get("meta", {}) or {}).get("sender", {}) or {}
        cw_name = (
            sender.get("name") or 
            sender.get("push_name") or 
            sender.get("pushname") or 
            meta_sender.get("name") or 
            meta_sender.get("push_name") or 
            (body.get("contact", {}) or {}).get("name") or 
            body.get("contact_name") or 
            body.get("name")
        )
        contato_nome_val = str(cw_name).strip() if cw_name and str(cw_name).strip() and str(cw_name).strip().lower() not in ("none", "null", "contato desconhecido") else None

        extracted = {
            "conta_id": str(body.get("account_id") or account.get("id") or conv.get("account_id") or ""),
            "inbox_id": str(inbox.get("id") or body.get("inbox_id") or conv.get("inbox_id") or ""),
            "inbox_nome": str(inbox.get("name") or ""),
            "conversa_id": str(conv.get("id") or body.get("conversation_id") or ""),
            "mensagem_id": msg_id,
            "contato_id": str(sender.get("id") or body.get("contact_id") or ""),
            "telefone": phone,
            "contato_nome": contato_nome_val,
            "mensagem": str(body.get("template_content") or body.get("content") or (body.get("message", {}) or {}).get("content") or ""),
            "labels": labels_str,
            "link": str(attachments[0].get("data_url") if attachments else ""),
            "dono": "agente" if is_out else "usuario",
            "message_type": content_type
        }
    
    logger.info(f"📩 Webhook: {config.name} | De: {phone} | Msg: {extracted['mensagem'][:30]}... | Account: {extracted['conta_id']} | Inbox: {extracted['inbox_id']} | Conv: {extracted['conversa_id']} | Contact: {extracted['contato_id']}")

    # Filtro por ID do Cliente do ZapVoice (ou ID do Inbox do Chatwoot legado)
    target_client_id = config.zapvoice_client_id or getattr(config, 'chatwoot_inbox_id', None)
    if target_client_id and str(extracted.get("inbox_id") or "").strip() != str(target_client_id).strip():
        logger.info(f"⏭️ Webhook ignorado: inbox_id '{extracted.get('inbox_id')}' não corresponde ao configurado '{target_client_id}'")
        return {"ok": True, "status": "ignored_inbox"}

    # --- FILTRO DE MENSAGENS DE SAÍDA (ECHO) ---
    # Se a mensagem for de saída (enviada pelo bot ou pelo agente), não criamos um evento de automação.
    # Mas ainda registramos na tabela de leads para manter o histórico se for um agente humano.
    if is_out:
        # Checar se este telefone acabou de passar por um reset para não reinserir o lead
        resetting_key = f"webhook:resetting:{config.id}:{phone}"
        if _redis.get(resetting_key):
            logger.info(f"⏭️ Mensagem de saída de eco pós-reset ignorada para evitar recriação do lead {phone}")
            return {"ok": True, "status": "outgoing_ignored"}

        try:
            await ensure_leads_table(config.leads_table)
            await upsert_lead(config.leads_table, {**extracted, "dono": "agente"}, config.id)
        except Exception as e:
            logger.error(f"Erro ao inserir lead de saída: {e}")
        return {"ok": True, "status": "outgoing_ignored"}

    # --- FILTRO DE CONTATOS PERMITIDOS E BLOQUEADOS ---
    blocked_list = []
    if config.blocked_messages:
        try:
            blocked_list = json.loads(config.blocked_messages)
        except Exception:
            blocked_list = []

    allowed_list = []
    if config.allowed_contacts:
        try:
            allowed_list = json.loads(config.allowed_contacts)
        except Exception:
            allowed_list = []

    # Função helper para checar correspondência por telefone (últimos 8 dígitos) ou por nome (case-insensitive)
    def match_contact(item_to_match: str, phone_num: str, name_str: str) -> bool:
        item_str = str(item_to_match).strip().lower()
        if not item_str:
            return False
            
        # Se o item a comparar for numérico/telefone, comparamos os últimos dígitos
        clean_item = "".join(c for c in item_str if c.isdigit())
        if clean_item:
            clean_phone = "".join(c for c in phone_num if c.isdigit())
            # Match se os últimos 8 dígitos (ou tamanho mínimo disponível) coincidirem
            match_len = min(8, len(clean_item), len(clean_phone))
            if match_len >= 6:  # Evita match em strings muito curtas
                return clean_phone[-match_len:] == clean_item[-match_len:]
                
        # Match por nome (case-insensitive)
        if name_str and item_str in name_str.lower():
            return True
            
        return False

    # 1. Validar se o contato está na lista de bloqueados
    for blocked_item in blocked_list:
        if match_contact(blocked_item, phone, extracted.get("contato_nome", "")):
            logger.info(f"🚫 Webhook bloqueado: Contato {phone} / {extracted.get('contato_nome')} está na lista de bloqueados.")
            return {"ok": True, "status": "blocked", "reason": "contact is blocked"}

    # 2. Validar se o contato está na lista de permitidos (caso a lista não esteja vazia)
    if allowed_list:
        is_allowed = False
        for allowed_item in allowed_list:
            if match_contact(allowed_item, phone, extracted.get("contato_nome", "")):
                is_allowed = True
                break
        
        if not is_allowed:
            logger.info(f"🚫 Webhook bloqueado: Contato {phone} / {extracted.get('contato_nome')} não está na lista de permitidos.")
            return {"ok": True, "status": "blocked", "reason": "contact not in allowed list"}

    # 1. Verificar se é uma palavra-chave de deleção (resetar) antes de checar a tag de ignorar
    is_delete_keyword = False
    msg_limpa = extracted["mensagem"].lower().strip()
    if msg_limpa and config.delete_keywords:
        try:
            keywords = []
            if config.delete_keywords.strip().startswith("["):
                keywords = json.loads(config.delete_keywords)
            else:
                keywords = [k.strip() for k in config.delete_keywords.split(",") if k.strip()]
            
            keywords_lower = [str(k).lower().strip() for k in keywords]
            if msg_limpa in keywords_lower:
                is_delete_keyword = True
                logger.info(f"🗑️ Mensagem coincide com palavra-chave de deleção: '{msg_limpa}'")
        except Exception as e:
            logger.error(f"Erro ao parsear delete_keywords: {e}")

    # 2. Filtro por etiqueta (Ignore by Label) - ignorado se for palavra-chave de deleção
    if config.ignore_by_label and not is_delete_keyword:
        labels_list = labels_raw if isinstance(labels_raw, list) else []
        if config.ignore_by_label in labels_list:
            logger.info(f"🚫 Contato possui etiqueta de bloqueio/ignorar: '{config.ignore_by_label}'. Gravando mensagem e log de pausado.")
            now_br = get_now_br()
            
            steps = [{
                "step": "🚫 Automação Pausada",
                "detail": f"A automação para este contato está pausada porque ele possui a etiqueta '{config.ignore_by_label}', que indica suporte humano ativo ou pausa manual da IA.",
                "timestamp": now_br.isoformat()
            }]
            
            event = WebhookEventModel(
                webhook_config_id=config.id,
                event_type="message",
                status="ignored",
                message_type=content_type,
                conta_id=extracted.get("conta_id"),
                inbox_id=extracted.get("inbox_id"),
                inbox_nome=extracted.get("inbox_nome"),
                conversa_id=extracted.get("conversa_id"),
                mensagem_id=extracted.get("mensagem_id"),
                contato_id=extracted.get("contato_id"),
                telefone=phone,
                labels=extracted.get("labels"),
                contato_nome=extracted.get("contato_nome"),
                mensagem=extracted.get("mensagem"),
                link=extracted.get("link"),
                raw_payload=json.dumps(body, ensure_ascii=False),
                dono="usuario",
                agent_response=f"Automação pausada: Contato possui a etiqueta '{config.ignore_by_label}'",
                processing_steps=json.dumps(steps, ensure_ascii=False)
            )
            db.add(event)
            await db.commit()
            await db.refresh(event)

            await manager.broadcast({
                "type": "new_event",
                "webhook_id": config.id,
                "event": {
                    "id": event.id,
                    "event_type": event.event_type,
                    "status": event.status,
                    "telefone": event.telefone,
                    "contato_nome": event.contato_nome,
                    "mensagem": event.mensagem,
                    "agent_response": event.agent_response,
                    "created_at": event.created_at.isoformat() if event.created_at else None
                }
            })

            try:
                await ensure_leads_table(config.leads_table)
                await upsert_lead(config.leads_table, extracted, config.id)
            except Exception as e:
                logger.error(f"Erro ao atualizar lead ignorado: {e}")

            return {"ok": True, "status": "ignored", "reason": f"contact has block label: {config.ignore_by_label}"}

    # --- LÓGICA DE AGRUPAMENTO (DEBOUNCE) ---
    now_br = get_now_br()
    redis_id_key = f"webhook:debounce:id:{config.id}:{phone}"
    redis_text_key = f"webhook:debounce:text:{config.id}:{phone}"
    
    last_event_id = _redis.get(redis_id_key)
    accumulated_text = _redis.get(redis_text_key) or ""
    
    if last_event_id:
        try:
            # Buscar o evento anterior para atualizar status e steps do pipeline
            old_event_res = await db.execute(select(WebhookEventModel).where(WebhookEventModel.id == int(last_event_id)))
            old_event = old_event_res.scalar_one_or_none()
            
            if old_event and old_event.status == "waiting":
                old_event.status = "grouped"
                
                # Adicionar passo informativo no pipeline do evento absorvido
                steps = json.loads(old_event.processing_steps or "[]")
                steps.append({
                    "step": "📦 Mensagem Absorvida",
                    "detail": "Uma nova mensagem chegou antes do processamento desta. Esta mensagem foi agrupada à próxima para manter o contexto e evitar respostas fragmentadas.",
                    "timestamp": now_br.isoformat()
                })
                old_event.processing_steps = json.dumps(steps, ensure_ascii=False)
                
                # Notificar via WebSocket que o evento anterior foi agrupado
                await manager.broadcast({
                    "type": "status_update",
                    "webhook_id": config.id,
                    "event_id": int(last_event_id),
                    "status": "grouped",
                    "steps": steps
                })
                
                # Adicionar espaçamento duplo para clareza visual e separação de contexto
                if accumulated_text:
                    accumulated_text += "\n\n"
            else:
                # Se o evento anterior não estava mais esperando (já foi processado, concluído ou deu erro),
                # nós NÃO o agrupamos. Iniciamos um novo acumulado.
                accumulated_text = ""
        except Exception as e:
            logger.error(f"Erro ao agrupar evento anterior {last_event_id}: {e}")

    # Definir o conteúdo deste "pedaço" da mensagem
    current_content = extracted.get("mensagem") or ""
    if content_type in ["audio", "image"]:
        current_content = f"[{content_type.upper()} PENDENTE]"
    
    accumulated_text += current_content
    
    event = WebhookEventModel(
        webhook_config_id=config.id, 
        event_type="message", 
        status="waiting" if config.delay_seconds > 0 else "processing", 
        raw_payload=json.dumps(body), 
        scheduled_at=now_br + timedelta(seconds=config.delay_seconds) if config.delay_seconds > 0 else None,
        created_at=now_br,
        **{**extracted, "mensagem": accumulated_text} # Salva o texto acumulado no banco
    )
    
    if config.delay_seconds > 0:
        event.processing_steps = json.dumps([{
            "step": "⏱️ Agrupamento Ativo",
            "detail": f"Aguardando {config.delay_seconds}s para ver se o usuário envia mais mensagens.",
            "timestamp": now_br.isoformat()
        }], ensure_ascii=False)
    
    db.add(event)
    await db.commit()
    await db.refresh(event)

    # Atualizar o Redis com o novo "mestre"
    _redis.setex(redis_id_key, config.delay_seconds + 60, str(event.id))
    _redis.setex(redis_text_key, config.delay_seconds + 60, accumulated_text)

    # --- PROCESSAMENTO IMEDIATO DE MÍDIA ---
    if content_type in ["audio", "image"]:
        process_a = config.process_audio if config.process_audio is not None else True
        process_i = config.process_image if config.process_image is not None else True
        
        is_enabled = (content_type == "audio" and process_a) or (content_type == "image" and process_i)
        if is_enabled:
            logger.info(f"🎙️ Disparando processamento imediato de {content_type} para evento {event.id}")
            process_media_content_task.delay(config.id, event.id)

    # Broadcast via WebSocket para atualização em tempo real
    try:
        await manager.broadcast({
            "type": "new_event",
            "webhook_id": config.id,
            "event": {
                "id": event.id,
                "telefone": event.telefone,
                "mensagem": event.mensagem,
                "agent_response": event.agent_response,
                "dono": event.dono,
                "message_type": event.message_type,
                "status": event.status,
                "scheduled_at": event.scheduled_at.isoformat() if event.scheduled_at else None,
                "created_at": event.created_at.isoformat() if event.created_at else None
            }
        })
    except Exception as ws_err:
        logger.error(f"Erro ao transmitir via WebSocket: {ws_err}")

    try:
        await ensure_leads_table(config.leads_table)
        await upsert_lead(config.leads_table, {**extracted, "dono": "cliente"}, config.id)
    except Exception as e:
        logger.error(f"Erro ao inserir lead na tabela {config.leads_table}: {e}")

    if await handle_keyword_handoffs(db, config, event, extracted, CHATWOOT_URL_DEFAULT, CHATWOOT_TOKEN_DEFAULT):
        event.status = "completed"; await db.commit(); return {"ok": True, "status": "handoff"}

    if config.delay_seconds > 0:
        logger.info(f"⏳ Agrupando automação para {event.telefone} em {config.delay_seconds}s (ID: {event.id})")
        process_webhook_automation.apply_async(args=[event.id], countdown=config.delay_seconds)
    else:
        process_webhook_automation.apply_async(args=[event.id])
    
    return {"ok": True, "event_id": event.id}

@router.get("/memory/{token}", status_code=200)
async def check_memory_webhook(token: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(WebhookConfigModel).where(WebhookConfigModel.memory_token == token, WebhookConfigModel.is_active == True))
    config = result.scalar_one_or_none()
    if not config or not config.memory_sync_enabled:
        raise HTTPException(status_code=404, detail="Memória desativada ou token inválido")
    
    return {
        "status": "online",
        "message": "O endpoint de memória está ativo e aguardando requisições POST!"
    }

@router.post("/memory/{token}", status_code=200)
async def receive_memory_webhook(token: str, request: Request, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(WebhookConfigModel).where(WebhookConfigModel.memory_token == token, WebhookConfigModel.is_active == True))
    config = result.scalar_one_or_none()
    if not config or not config.memory_sync_enabled: raise HTTPException(status_code=404, detail="Memória desativada")

    try: body = await request.json()
    except: raise HTTPException(status_code=400, detail="JSON inválido")

    phone_raw = get_value_by_path(body, config.memory_phone_path)
    if not phone_raw:
        # Fallback para Configuração Zero
        phone_raw = get_value_by_path(body, "telefone") or get_value_by_path(body, "phone") or get_value_by_path(body, "sender.phone")
        
    phone = normalize_phone(str(phone_raw or ""))
    if not phone: raise HTTPException(status_code=400, detail="Telefone não encontrado. O JSON deve conter 'phone', 'telefone' ou 'sender.phone'")

    mensagem_text = get_value_by_path(body, "template_content") or get_value_by_path(body, "content") or ""
    dono_raw = (
        get_value_by_path(body, "Dono") or 
        get_value_by_path(body, "dono") or 
        get_value_by_path(body, "sender_type") or 
        get_value_by_path(body, "sender.type")
    )
    if not dono_raw:
        direction = get_value_by_path(body, "direction") or get_value_by_path(body, "type") or ""
        from_me = get_value_by_path(body, "from_me") or get_value_by_path(body, "fromMe")
        if str(direction).lower() in ("outgoing", "outbound", "sent") or from_me is True or str(from_me).lower() == "true":
            dono = "agente"
        else:
            dono = "cliente"
    else:
        dono = str(dono_raw).lower()

    if dono not in ("agente", "bot"):
        from models import WebhookEventModel
        recent_agent_evt = await db.execute(
            select(WebhookEventModel).where(
                WebhookEventModel.webhook_config_id == config.id,
                WebhookEventModel.telefone == phone,
                WebhookEventModel.agent_response.isnot(None),
                WebhookEventModel.agent_response != ""
            ).order_by(WebhookEventModel.created_at.desc()).limit(5)
        )
        recent_evts = recent_agent_evt.scalars().all()
        for revt in recent_evts:
            if revt.agent_response and mensagem_text and (mensagem_text.strip() in revt.agent_response or revt.agent_response.strip() in mensagem_text):
                dono = "agente"
                break

    name_raw = None
    if getattr(config, 'memory_name_path', None):
        name_raw = get_value_by_path(body, config.memory_name_path)
    if not name_raw:
        name_raw = (
            get_value_by_path(body, "name") or 
            get_value_by_path(body, "nome") or 
            get_value_by_path(body, "contato_nome") or 
            get_value_by_path(body, "sender.name") or 
            get_value_by_path(body, "contact.name") or 
            get_value_by_path(body, "pushname")
        )

    memory_contato_nome = str(name_raw).strip() if name_raw and str(name_raw).strip() and str(name_raw).strip().lower() not in ("none", "null", "contato desconhecido") and not str(name_raw).strip().startswith("Lead_") else None

    await ensure_leads_table(config.leads_table)
    await upsert_lead(config.leads_table, {
        "telefone": phone, 
        "contato_nome": memory_contato_nome, 
        "dono": dono,
        "mensagem": mensagem_text,
        "is_memory": True,
        "event_type": "memory"
    }, config.id)
    
    # Se a mensagem de memória for de saída do agente/bot (ou eco de resposta gerada pela IA),
    # não criamos um WebhookEventModel duplicado no banco para não poluir o histórico com linhas 'solitárias' de agente.
    if dono in ("agente", "bot"):
        logger.info(f"⏭️ Webhook de memória ignorado para criação de evento de agente ({phone}): '{mensagem_text[:30]}...'")
        return {"ok": True, "phone": phone, "status": "agent_memory_echo_ignored"}

    # Criar o registro de evento para sincronização de memória
    from models import WebhookEventModel
    
    now_br = get_now_br()
    event = WebhookEventModel(
        webhook_config_id=config.id,
        event_type="memory",
        status="waiting",
        raw_payload=json.dumps(body, ensure_ascii=False),
        telefone=phone,
        contato_nome=memory_contato_nome or ("Lead_" + phone[-4:]),
        dono=dono,
        mensagem=mensagem_text,
        created_at=now_br,
        processing_steps=json.dumps([{
            "step": "📥 Recebido Webhook de Memória",
            "detail": "Os dados foram recebidos e estão aguardando o processamento da fila de vetorização.",
            "timestamp": now_br.isoformat()
        }], ensure_ascii=False)
    )
    db.add(event)
    await db.commit()
    await db.refresh(event)

    sync_memory_to_vector.delay(event.id)
    return {"ok": True, "phone": phone}

@router.delete("/{webhook_id}/leads-by-phone/{phone}/full-purge", status_code=204)
async def full_purge_lead_by_phone(webhook_id: int, phone: str, db: AsyncSession = Depends(get_db)):
    config = await db.get(WebhookConfigModel, webhook_id)
    if not config: raise HTTPException(status_code=404, detail="Webhook não encontrado")
    await delete_contact_data(db, webhook_id, config.leads_table, [phone])
    await db.commit()

@router.post("/{webhook_id}/simulate-load", status_code=200)
async def simulate_webhook_load(
    webhook_id: int, 
    payload: SimulateLoadRequest, 
    db: AsyncSession = Depends(get_db)
):
    config = await db.get(WebhookConfigModel, webhook_id)
    if not config:
        raise HTTPException(status_code=404, detail="Integração de Webhook não encontrada")

    await ensure_leads_table(config.leads_table)

    start_time = time.time()
    contacts_processed = 0
    errors_count = 0
    now_br = get_now_br()

    base_phone_num = 558599000000
    msg_text = payload.sample_message or "Olá, gostaria de testar o suporte e a automação do sistema."
    
    delay_sec = config.delay_seconds if (config.delay_seconds is not None) else 30
    events_to_process = []

    for i in range(1, payload.contact_count + 1):
        fake_phone = str(base_phone_num + i)
        fake_name = f"Contato Simulado {i}"
        
        try:
            await upsert_lead(config.leads_table, {
                "telefone": fake_phone,
                "contato_nome": fake_name,
                "mensagem": msg_text,
                "dono": "cliente"
            }, config.id)

            initial_steps = []
            if delay_sec > 0:
                initial_steps.append({
                    "step": "⏱️ Agrupamento Ativo (Debounce)",
                    "detail": f"Aguardando {delay_sec}s para ver se o usuário envia mais mensagens.",
                    "timestamp": now_br.isoformat()
                })

            is_waiting = payload.respect_delay and (delay_sec > 0)

            event = WebhookEventModel(
                webhook_config_id=config.id,
                event_type="message",
                message_type="text",
                status="waiting" if is_waiting else "received",
                raw_payload=json.dumps({"simulated": True, "phone": fake_phone, "message": msg_text}, ensure_ascii=False),
                telefone=fake_phone,
                contato_nome=fake_name,
                mensagem=msg_text,
                conversa_id=str(900000 + i),
                conta_id="1",
                dono="usuario",
                created_at=now_br,
                scheduled_at=now_br + timedelta(seconds=delay_sec) if is_waiting else None,
                processing_steps=json.dumps(initial_steps, ensure_ascii=False) if initial_steps else None
            )
            db.add(event)
            await db.flush()

            if is_waiting:
                process_webhook_automation.apply_async(args=[event.id], countdown=delay_sec)
                contacts_processed += 1
            else:
                events_to_process.append(event.id)
        except Exception as e:
            logger.error(f"Erro ao criar evento simulado para contato {i}: {e}")
            errors_count += 1

    await db.commit()

    # Executar a pipeline de automação para cada evento se modo instantâneo
    if not payload.respect_delay:
        for eid in events_to_process:
            try:
                process_webhook_automation(eid)
                contacts_processed += 1
            except Exception as e:
                logger.error(f"Erro ao executar pipeline para evento {eid}: {e}")
                errors_count += 1

    elapsed_sec = max(0.001, time.time() - start_time)
    elapsed_ms = round(elapsed_sec * 1000, 2)
    throughput = round(contacts_processed / elapsed_sec, 1)
    avg_latency_ms = round(elapsed_ms / max(1, contacts_processed), 2)

    return {
        "ok": True,
        "total_requested": payload.contact_count,
        "contacts_processed": contacts_processed,
        "errors_count": errors_count,
        "elapsed_ms": elapsed_ms,
        "throughput_per_sec": throughput,
        "avg_latency_ms": avg_latency_ms,
        "message": f"Simulação de carga concluída: {contacts_processed} contatos processados por TODA A PIPELINE a {throughput} req/s."
    }

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
    
    # Total
    total_res = await db.execute(text(f"SELECT COUNT(*) FROM webhook_events WHERE {where_str}"), params)
    total = total_res.scalar() or 0

    # Fallback: Se for busca por telefone específico e retornar 0 sob a wid atual, tenta buscar sem restringir por wid
    if total == 0 and search and len(re.sub(r"\D", "", search)) >= 7:
        fallback_clauses = [c for c in where_clauses if not c.startswith("webhook_config_id")]
        fallback_where_str = " AND ".join(fallback_clauses)
        fb_total_res = await db.execute(text(f"SELECT COUNT(*) FROM webhook_events WHERE {fallback_where_str}"), params)
        fb_total = fb_total_res.scalar() or 0
        if fb_total > 0:
            where_str = fallback_where_str
            total = fb_total

    # Itens - seleciona apenas colunas necessárias (evita carregar raw_payload e processing_steps que são pesados)
    query = text(f"""
        SELECT id, webhook_config_id, event_type, message_type, conta_id, inbox_id, inbox_nome,
               conversa_id, mensagem_id, contato_id, telefone, labels, contato_nome, mensagem,
               link, status, task_id, agent_response, legenda, dono, scheduled_at, created_at,
               updated_at, is_automatic
        FROM webhook_events WHERE {where_str} ORDER BY created_at DESC LIMIT :limit OFFSET :offset
    """)
    res = await db.execute(query, params)
    columns = res.keys()
    items = [dict(zip(columns, row)) for row in res.fetchall()]

    # Inferência inteligente e filtragem de echos de agente em eventos de memória
    agent_responses_in_batch = {item['agent_response'].strip() for item in items if item.get('agent_response')}
    filtered_items = []
    for item in items:
        msg = (item.get('mensagem') or '').strip()
        if item.get('event_type') == 'memory' and item.get('dono') not in ('agente', 'bot'):
            if msg and any(msg in resp or resp in msg for resp in agent_responses_in_batch if resp):
                item['dono'] = 'agente'
        
        # Filtra eventos de memória/saída de agente que são apenas echos de respostas da IA já presentes no batch
        is_agent_item = item.get('dono') in ('agente', 'bot') or item.get('event_type') == 'memory'
        if is_agent_item and not item.get('agent_response') and msg:
            if any(msg in resp or resp in msg for resp in agent_responses_in_batch if resp):
                continue
        filtered_items.append(item)

    items = filtered_items
    return {"total": total, "items": items}

@router.get("/{webhook_id}/leads-by-phone/{phone}/history", response_model=LeadHistoryResponse)
async def get_lead_history(webhook_id: int, phone: str, page: int = 1, page_size: int = 50, db: AsyncSession = Depends(get_db)):
    config = await db.get(WebhookConfigModel, webhook_id)
    if not config: raise HTTPException(status_code=404, detail="Webhook não encontrado")
    
    offset = (page - 1) * page_size
    
    # Contar o total de mensagens individuais (mensagem + agent_response) para paginação correta no frontend/testes
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
    
    # Processar as mensagens individuais (mensagem e agent_response se existirem)
    items = []
    for r in rows:
        evt_id, contato_id, telefone, mensagem, dono, created_at, agent_response = r
        # Mensagem do usuário
        if mensagem:
            items.append(LeadHistoryItem(
                id=evt_id,
                contato_id=contato_id,
                telefone=telefone,
                conteudo=mensagem,
                dono="Humano" if (dono and dono.lower() in ["cliente", "usuario"]) or not dono else "Agente",
                timestamp=created_at,
                index=0  # Será indexado depois
            ))
        # Resposta do bot/agente
        if agent_response:
            items.append(LeadHistoryItem(
                id=evt_id,
                contato_id=contato_id,
                telefone=telefone,
                conteudo=agent_response,
                dono="Agente",
                timestamp=created_at,
                index=0  # Será indexado depois
            ))
            
    # Inverter para ordem cronológica inversa (mais novos no topo, indexados crescentemente do início)
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
        
        # Adicionar passo de cancelamento no pipeline
        steps = json.loads(event.processing_steps or "[]")
        steps.append({
            "step": "🚫 Automação Cancelada",
            "detail": "A automação para esta mensagem foi cancelada manualmente pelo usuário ou pelo sistema.",
            "timestamp": get_now_br().isoformat()
        })
        event.processing_steps = json.dumps(steps, ensure_ascii=False)
        
        await db.commit()
        
        # Notificar via WebSocket
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
        # Se estiver em processamento por mais de 2 minutos, permitimos reprocessar (timeout de segurança)
        from datetime import timezone
        last_update = event.updated_at or event.created_at
        if last_update.tzinfo is None:
            last_update = last_update.replace(tzinfo=timezone.utc)
        
        time_elapsed = get_now_utc() - last_update
        if time_elapsed.total_seconds() < 120:
            raise HTTPException(status_code=400, detail="Este evento já está sendo processado no momento.")
        
    # Importar Celery task de forma lazy para evitar imports circulares
    from webhook_tasks import process_webhook_automation
    
    # Resetar o status do evento no banco de dados
    event.status = "processing"
    event.agent_response = None
    if event.legenda and event.legenda.startswith("❌ Erro técnico:"):
        event.legenda = None
    
    # Registrar passo inicial de retentativa
    now_br = get_now_br()
    steps = [{
        "step": "🔄 Reiniciando Pipeline",
        "detail": "A retentativa da automação foi iniciada manualmente pelo usuário. Reprocessando mensagem original...",
        "timestamp": now_br.isoformat()
    }]
    event.processing_steps = json.dumps(steps, ensure_ascii=False)
    event.updated_at = now_br
    
    # Salvar alterações
    await db.commit()
    
    # Broadcast status_update via WebSocket para atualizar a UI em tempo real
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
        
    # Disparar task do Celery
    process_webhook_automation.delay(event_id)
    
    logger.info(f"🔄 Retentativa manual de automação iniciada para o evento {event_id} (Webhook Config ID: {webhook_id})")
    
    return {"ok": True, "status": "processing"}


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
    if not config: raise HTTPException(status_code=404, detail="Webhook não encontrado")
    
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
    if not config: raise HTTPException(status_code=404, detail="Webhook não encontrado")
    
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
    
    # Total
    total_res = await db.execute(text(f"SELECT COUNT(*) FROM {config.leads_table} WHERE {where_str}"), params)
    total = total_res.scalar()
    
    # Leads (Query simplificada e veloz sem subqueries aninhadas)
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
        # Fallbacks padrão que serão calculados a seguir
        lead_dict["total_disparos"] = 0
        lead_dict["sem_mensagem_usuario"] = True
        
        tel = lead_dict.get("telefone")
        if tel:
            telefones_para_buscar.add(tel)
            telefones_para_buscar.add(f"+{tel}")
            if tel.startswith("+"):
                telefones_para_buscar.add(tel[1:])
                
        leads.append(lead_dict)

    # Buscar informações de disparos e mensagens do usuário em lote na memória (Performance Premium)
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
        
        from collections import defaultdict
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
    
    # Sincronizar etiquetas de forma transparente em background (se houver credenciais e leads)
    zv_url = (config.zapvoice_url or os.getenv("ZAPVOICE_URL", "")).rstrip("/")
    if zv_url and not zv_url.endswith("/api"):
        zv_url = f"{zv_url}/api"
    zv_token = config.zapvoice_api_token or os.getenv("ZAPVOICE_API_TOKEN", "")
    
    if zv_url and zv_token and leads:
        try:
            from zapvoice_utils import sync_conversation_labels
            from database.connection import async_session
            sem = asyncio.Semaphore(3)
            
            async def sync_lead_labels_bg(lead_id, c_id, conv_id):
                async with sem:
                    try:
                        success, final_labels = await sync_conversation_labels(
                            zapvoice_url=zv_url,
                            client_id=str(c_id),
                            conversation_id=int(conv_id),
                            token=zv_token
                        )
                        if success:
                            async with async_session() as db_session:
                                update_q = text(f"UPDATE {config.leads_table} SET labels = :labels, updated_at = CURRENT_TIMESTAMP WHERE id = :id")
                                await db_session.execute(update_q, {
                                    "labels": json.dumps(final_labels, ensure_ascii=False),
                                    "id": lead_id
                                })
                                await db_session.commit()
                    except Exception as e_sync:
                        logger.error(f"Erro em background ao sincronizar etiquetas do lead {lead_id}: {e_sync}")
            
            # Dispara as sincronizações em background sem bloquear o retorno HTTP
            for l in leads:
                c_id = l.get("conta_id") or l.get("inbox_id")
                conv_id = l.get("conversa_id")
                if c_id and conv_id and str(c_id) != "None" and str(conv_id) != "None":
                    asyncio.create_task(sync_lead_labels_bg(l["id"], c_id, conv_id))
        except Exception as e_bg:
            logger.warning(f"Aviso na sincronização em background: {e_bg}")
    
    logger.info(f"✅ Encontrados {len(leads)} leads de um total de {total}.")
    return {"total": total, "leads": leads, "page": page, "page_size": page_size}


@router.post("/{webhook_id}/leads/delete-batch", status_code=204)
async def delete_leads_batch(webhook_id: int, req: LeadBulkDeleteRequest, db: AsyncSession = Depends(get_db)):
    logger.info(f"🗑️ Deletando leads em lote para webhook {webhook_id}: {req.lead_ids}")
    config = await db.get(WebhookConfigModel, webhook_id)
    if not config: raise HTTPException(status_code=404, detail="Webhook não encontrado")
    
    if not req.lead_ids:
        return

    try:
        is_sqlite = db.bind.dialect.name == "sqlite"
        # Busca telefones antes de deletar (para limpar logs/gatilhos)
        if is_sqlite:
            safe_ids_str = ",".join(str(int(i)) for i in req.lead_ids)
            query = text(f"SELECT telefone FROM {config.leads_table} WHERE id IN ({safe_ids_str}) AND webhook_config_id = :wid")
            res = await db.execute(query, {"wid": webhook_id})
        else:
            query = text(f"SELECT telefone FROM {config.leads_table} WHERE id = ANY(:ids) AND webhook_config_id = :wid")
            res = await db.execute(query, {"ids": req.lead_ids, "wid": webhook_id})
        phones = [r[0] for r in res.fetchall() if r[0]]
        
        logger.info(f"🗑️ Deletando em lote {len(req.lead_ids)} leads e limpando dados para {len(phones)} telefones.")

        # Remove dados vinculados
        await delete_contact_data(db, webhook_id, config.leads_table, phones, lead_ids=req.lead_ids)
        
        await db.commit()
        return Response(status_code=204)
    except Exception as e:
        await db.rollback()
        logger.error(f"❌ Erro ao deletar leads em lote: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Erro interno ao deletar leads: {str(e)}")

@router.delete("/{webhook_id}/leads/{lead_id}", status_code=204)
async def delete_single_lead(webhook_id: int, lead_id: int, db: AsyncSession = Depends(get_db)):
    logger.info(f"🗑️ Deletando lead {lead_id} para webhook {webhook_id}")
    config = await db.get(WebhookConfigModel, webhook_id)
    if not config: raise HTTPException(status_code=404, detail="Webhook não encontrado")
    
    try:
        phone = None
        conversa_id = None
        conta_id = None
        
        async with db.begin_nested():
            # Buscar telefone, conversa_id e conta_id do lead para limpar dados associados e mandar despedida
            query = text(f"SELECT telefone, conversa_id, conta_id FROM {config.leads_table} WHERE id = :lid AND webhook_config_id = :wid")
            res = await db.execute(query, {"lid": lead_id, "wid": webhook_id})
            row = res.fetchone()
            if row:
                phone = row[0]
                conversa_id = row[1]
                conta_id = row[2]
            
            # Deletar da tabela de leads
            await db.execute(text(f"DELETE FROM {config.leads_table} WHERE id = :lid"), {"lid": lead_id})
            
            if phone:
                # Remove dados vinculados
                await delete_contact_data(db, webhook_id, config.leads_table, [phone], lead_ids=[lead_id])
                
        await db.commit()
        
        # Enviar mensagem de despedida Chatwoot (se configurada) fora da transação
        if conversa_id and conta_id and config.delete_message:
            url = (config.chatwoot_url or os.getenv("CHATWOOT_URL", "")).rstrip("/")
            token = config.chatwoot_api_token or os.getenv("CHATWOOT_API_TOKEN", "")
            if url and token:
                headers = {"api_access_token": token, "Content-Type": "application/json"}
                full_url = f"{url}/api/v1/accounts/{conta_id}/conversations/{conversa_id}/messages"
                payload = {"content": config.delete_message, "message_type": "outgoing"}
                try:
                    async with httpx.AsyncClient(timeout=10.0) as client_http:
                        await client_http.post(full_url, json=payload, headers=headers)
                except Exception as e:
                    logger.error(f"Erro ao enviar mensagem de despedida Chatwoot: {e}")
                    
        return Response(status_code=204)
    except Exception as e:
        await db.rollback()
        logger.error(f"❌ Erro ao deletar lead único: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Erro interno ao deletar lead: {str(e)}")

@router.delete("/{webhook_id}/leads/all", status_code=204)
async def delete_all_leads(webhook_id: int, db: AsyncSession = Depends(get_db)):
    config = await db.get(WebhookConfigModel, webhook_id)
    if not config: raise HTTPException(status_code=404, detail="Webhook não encontrado")
    
    # Buscar todos os IDs e telefones para limpeza total
    query = text(f"SELECT id, telefone FROM {config.leads_table} WHERE webhook_config_id = :wid")
    res = await db.execute(query, {"wid": webhook_id})
    rows = res.fetchall()
    ids = [r[0] for r in rows]
    phones = [r[1] for r in rows]
    
    if ids:
        await delete_contact_data(db, webhook_id, config.leads_table, phones, lead_ids=ids)
    await db.commit()

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
        # Buscar todos os leads vinculados ao webhook
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
            
        return {"ok": True, "message": f"Sincronização concluída com sucesso. {updated_count} contatos atualizados."}
    except Exception as e:
        logger.error(f"Erro na sincronização em massa: {e}")
        return {"ok": False, "message": f"Erro interno ao sincronizar: {str(e)}"}
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


@router.get("/{webhook_id}/leads/{lead_id}/followup-pipeline")
async def get_lead_followup_pipeline(webhook_id: int, lead_id: int, db: AsyncSession = Depends(get_db)):
    config = await db.get(WebhookConfigModel, webhook_id)
    if not config:
        raise HTTPException(status_code=404, detail="Webhook não encontrado")

    # Buscar dados do Lead
    res = await db.execute(
        text(f"SELECT * FROM {config.leads_table} WHERE id = :lead_id AND webhook_config_id = :wid"),
        {"lead_id": lead_id, "wid": webhook_id}
    )
    row = res.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Lead não encontrado")

    lead_dict = dict(zip(res.keys(), row))

    # Parse de passos de follow-up
    steps_raw = config.followup_steps
    steps = []
    if isinstance(steps_raw, str) and steps_raw.strip():
        try:
            steps = json.loads(steps_raw)
        except Exception:
            steps = []
    elif isinstance(steps_raw, list):
        steps = steps_raw

    # Parse de Horário Comercial
    bh_raw = config.followup_business_hours
    business_hours = None
    if isinstance(bh_raw, str) and bh_raw.strip():
        try:
            business_hours = json.loads(bh_raw)
        except Exception:
            business_hours = None
    elif isinstance(bh_raw, dict):
        business_hours = bh_raw

    # Buscar histórico de disparos de follow-up
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

    # Analisar etiquetas do Lead
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

    # Etiquetas de cancelamento
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
    
    # Calcular status de cada etapa
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
            "status": step_status,
            "dispatched_event": dispatched_event
        })

    # Calcular estado geral do lead no funil
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
            "ultima_mensagem_em": ultima_msg_em,
            "labels": lead_labels,
            "pode_enviar_mensagem": lead_dict.get("pode_enviar_mensagem", True)
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


@router.get("/{webhook_id}/whatsapp-templates")
async def get_webhook_whatsapp_templates(
    webhook_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Busca a lista de templates oficiais do WhatsApp configurados no ZapVoice para este webhook."""
    query = select(WebhookConfigModel).where(WebhookConfigModel.id == webhook_id)
    res = await db.execute(query)
    config = res.scalar_one_or_none()
    if not config:
        raise HTTPException(status_code=404, detail="Webhook não encontrado")

    from zapvoice_utils import get_zapvoice_whatsapp_templates
    zv_url = config.zapvoice_url or os.getenv("ZAPVOICE_URL", "http://zapvoice_app:8000")
    zv_token = config.zapvoice_api_token or os.getenv("ZAPVOICE_API_TOKEN", "")
    client_id = config.zapvoice_client_id

    templates = await get_zapvoice_whatsapp_templates(
        zapvoice_url=zv_url,
        token=zv_token,
        client_id=client_id
    )
    return templates


@router.get("/zapvoice/templates")
async def get_zapvoice_templates_custom(
    zapvoice_url: Optional[str] = None,
    zapvoice_api_token: Optional[str] = None,
    zapvoice_client_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """Busca templates do WhatsApp via parâmetros diretos de conexão ZapVoice."""
    from zapvoice_utils import get_zapvoice_whatsapp_templates
    zv_url = zapvoice_url or os.getenv("ZAPVOICE_URL", "http://zapvoice_app:8000")
    zv_token = zapvoice_api_token or os.getenv("ZAPVOICE_API_TOKEN", "")
    client_id = zapvoice_client_id

    if not zv_token:
        q = select(WebhookConfigModel).where(WebhookConfigModel.zapvoice_api_token.isnot(None)).limit(1)
        r = await db.execute(q)
        first_cfg = r.scalar_one_or_none()
        if first_cfg:
            zv_url = zv_url or first_cfg.zapvoice_url
            zv_token = first_cfg.zapvoice_api_token
            client_id = client_id or first_cfg.zapvoice_client_id

    templates = await get_zapvoice_whatsapp_templates(
        zapvoice_url=zv_url,
        token=zv_token,
        client_id=client_id
    )
    return templates



