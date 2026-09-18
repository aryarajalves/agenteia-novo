import logging
import json
import os
import httpx
from datetime import datetime, timezone
from typing import List, Optional, Any, Dict
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, func

from models import ToolModel, WebhookConfigModel, WebhookEventModel
from api.schemas import ToolCreate, ToolResponse
from api.deps import get_db, verify_api_key

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Tools"])

@router.get("/tools", response_model=List[ToolResponse])
async def list_tools(db: AsyncSession = Depends(get_db), _: None = Depends(verify_api_key)):
    """Lista todas as ferramentas cadastradas no banco."""
    result = await db.execute(select(ToolModel).order_by(ToolModel.id))
    return result.scalars().all()

@router.post("/tools", response_model=ToolResponse)
async def create_tool(tool: ToolCreate, db: AsyncSession = Depends(get_db), _: None = Depends(verify_api_key)):
    """Cria uma nova ferramenta de automação."""
    db_tool = ToolModel(
        name=tool.name,
        description=tool.description,
        parameters_schema=tool.parameters_schema,
        webhook_url=tool.webhook_url,
        labels_to_add=tool.labels_to_add,
        labels_to_remove=tool.labels_to_remove,
        confirmation_message=tool.confirmation_message
    )
    db.add(db_tool)
    await db.commit()
    await db.refresh(db_tool)
    return db_tool

@router.put("/tools/{tool_id}", response_model=ToolResponse)
async def update_tool(
    tool_id: int, 
    tool: ToolCreate, 
    db: AsyncSession = Depends(get_db), 
    _: None = Depends(verify_api_key)
):
    """Atualiza os detalhes de uma ferramenta existente."""
    result = await db.execute(select(ToolModel).where(ToolModel.id == tool_id))
    db_tool = result.scalars().first()
    
    if not db_tool:
        raise HTTPException(status_code=404, detail="Ferramenta não encontrada")
    
    db_tool.name = tool.name
    db_tool.description = tool.description
    db_tool.parameters_schema = tool.parameters_schema
    db_tool.webhook_url = tool.webhook_url
    db_tool.labels_to_add = tool.labels_to_add
    db_tool.labels_to_remove = tool.labels_to_remove
    db_tool.confirmation_message = tool.confirmation_message
    
    try:
        await db.commit()
        await db.refresh(db_tool)
        return db_tool
    except Exception as e:
        await db.rollback()
        logger.error(f"Erro ao atualizar ferramenta: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/tools/{tool_id}")
async def delete_tool(tool_id: int, db: AsyncSession = Depends(get_db), _: None = Depends(verify_api_key)):
    """Remove uma ferramenta do sistema."""
    result = await db.execute(select(ToolModel).where(ToolModel.id == tool_id))
    tool = result.scalars().first()
    if not tool:
        raise HTTPException(status_code=404, detail="Ferramenta não encontrada")
        
    await db.delete(tool)
    await db.commit()
    return {"status": "deleted", "id": tool_id}

@router.get("/chatwoot/labels")
async def get_chatwoot_labels(
    zapvoice_url: Optional[str] = None,
    zapvoice_api_token: Optional[str] = None,
    zapvoice_client_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """Busca as etiquetas disponíveis no ZapVoice via API."""
    url = (zapvoice_url or "").rstrip("/")
    token = zapvoice_api_token or ""
    client_id_header = zapvoice_client_id

    # Se não foram passados parâmetros ou se url aponta para localhost dentro do container, busca do WebhookConfig
    if not url or "localhost" in url or not token or not client_id_header:
        result = await db.execute(
            select(WebhookConfigModel).where(
                WebhookConfigModel.zapvoice_url.isnot(None),
                WebhookConfigModel.zapvoice_api_token.isnot(None),
                WebhookConfigModel.zapvoice_url.notlike("%localhost%")
            ).order_by(WebhookConfigModel.id.desc()).limit(1)
        )
        config = result.scalars().first()
        if config:
            if not url or "localhost" in url:
                url = (config.zapvoice_url or "").rstrip("/")
            if not token:
                token = config.zapvoice_api_token or ""
            if not client_id_header and config.zapvoice_client_id:
                client_id_header = str(config.zapvoice_client_id)
            logger.info(f"[LABELS] Config ZapVoice recuperada via fallback do WebhookConfig: url={url}, client_id={client_id_header}")
        elif not client_id_header:
            result_cid = await db.execute(
                select(WebhookConfigModel).where(WebhookConfigModel.zapvoice_client_id.isnot(None)).limit(1)
            )
            config_cid = result_cid.scalars().first()
            if config_cid and config_cid.zapvoice_client_id:
                client_id_header = str(config_cid.zapvoice_client_id)

    # Fallback para variáveis de ambiente caso ainda não tenha sido definido
    if not url:
        url = os.getenv("ZAPVOICE_URL", "").rstrip("/")
    if not token:
        token = os.getenv("ZAPVOICE_API_TOKEN", "")

    if not url or not token:
        logger.warning("ZAPVOICE_URL ou ZAPVOICE_API_TOKEN não configurados. Retornando lista vazia.")
        return []

    try:
        headers = {
            "Authorization": f"Bearer {token}",
        }
        if client_id_header:
            headers["X-Client-ID"] = client_id_header

        zap_api_url = url
        if not zap_api_url.endswith("/api"):
            zap_api_url = f"{zap_api_url}/api"
            
        logger.info(f"[LABELS] Chamando ZapVoice: {zap_api_url}/chat/labels com client_id={client_id_header}")
        async with httpx.AsyncClient(verify=False) as client:
            resp = await client.get(
                f"{zap_api_url}/chat/labels",
                headers=headers,
                timeout=10.0
            )
            logger.info(f"[LABELS] ZapVoice respondeu {resp.status_code}: {resp.text[:200]}")
            if resp.status_code == 200:
                data = resp.json()
                # O ZapVoice retorna lista de strings (etiquetas ordenadas)
                if isinstance(data, list):
                    labels = []
                    for item in data:
                        if isinstance(item, dict):
                            title = item.get("title") or item.get("name") or item.get("label")
                            if title:
                                labels.append(title)
                        elif isinstance(item, str):
                            labels.append(item)
                    return labels
            logger.warning(f"ZapVoice retornou status {resp.status_code} ao buscar etiquetas.")
            return []
    except Exception as e:
        logger.error(f"Erro ao buscar etiquetas do ZapVoice: {e}")
        return []

@router.post("/provision-tools")
async def provision_native_tools(_: None = Depends(verify_api_key)):
    """Sincroniza as ferramentas nativas do sistema (Google Calendar, etc) no banco."""
    from database import seed_native_tools
    try:
        await seed_native_tools()
        return {"message": "Ferramentas nativas sincronizadas com sucesso."}
    except Exception as e:
        logger.error(f"Erro ao provisionar ferramentas: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/tools/{tool_id}/logs")
async def get_tool_logs(
    tool_id: int, 
    page: int = 1, 
    page_size: int = 20, 
    db: AsyncSession = Depends(get_db), 
    _: None = Depends(verify_api_key)
):
    """Retorna o histórico de execução de uma ferramenta baseada em eventos de webhook."""
    result = await db.execute(select(ToolModel).where(ToolModel.id == tool_id))
    tool = result.scalars().first()
    if not tool:
        raise HTTPException(status_code=404, detail="Ferramenta não encontrada")

    offset = (page - 1) * page_size
    stmt = (
        select(WebhookEventModel)
        .where(WebhookEventModel.processing_steps.contains(tool.name))
        .order_by(WebhookEventModel.created_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    events = (await db.execute(stmt)).scalars().all()

    logs = []
    for ev in events:
        matched_steps = []
        try:
            raw_steps = json.loads(ev.processing_steps or "[]")
            for s in raw_steps:
                # Se o nome da ferramenta está no passo, ou é um ícone de ferramenta nativa
                if tool.name in s.get("step", "") or tool.name in s.get("detail", ""):
                    matched_steps.append(s)
                elif s.get("step", "").startswith("🛠️"):
                    matched_steps.append(s)
        except Exception:
            pass
            
        logs.append({
            "event_id": ev.id,
            "timestamp": ev.created_at.replace(tzinfo=timezone.utc) if ev.created_at else None,
            "steps": matched_steps,
            "status": ev.status
        })
    return logs
