"""Rotas da API FastAPI para inicialização, acompanhamento e cancelamento da importação."""

import os
import sys
import time
import asyncio
import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from database import get_db
from core.websocket import manager
from models import WebhookConfigModel
from .state import (
    _ACTIVE_IMPORTS,
    _CANCEL_REQUESTS,
    _RUNNING_TASKS,
    _IMPORT_STATUS,
    _update_status,
)
from .importer import run_chat_import_task

logger = logging.getLogger(__name__)
router = APIRouter()


def _get_run_task():
    """Recupera run_chat_import_task dinamicamente para suportar mocks em testes."""
    mod = sys.modules.get("webhooks.import_chat") or sys.modules.get("backend.webhooks.import_chat")
    if mod and hasattr(mod, "run_chat_import_task"):
        return mod.run_chat_import_task
    return run_chat_import_task


def _get_manager():
    """Recupera manager do websocket dinamicamente para suportar mocks em testes."""
    mod = sys.modules.get("webhooks.import_chat") or sys.modules.get("backend.webhooks.import_chat")
    if mod and hasattr(mod, "manager"):
        return mod.manager
    return manager


@router.post("/{webhook_id}/leads/import-zapjords")
async def import_chat_from_zapjords(webhook_id: int, db: AsyncSession = Depends(get_db)):
    """Inicia a importação em segundo plano de todas as conversas e mensagens do ZapJords."""
    config = await db.get(WebhookConfigModel, webhook_id)
    if not config:
        raise HTTPException(status_code=404, detail="Webhook não encontrado")

    zv_url = (getattr(config, "zapvoice_url", None) or os.getenv("ZAPVOICE_URL", "")).rstrip("/")
    zv_token = getattr(config, "zapvoice_api_token", None) or os.getenv("ZAPVOICE_API_TOKEN", "")

    if not zv_url or not zv_token:
        raise HTTPException(
            status_code=400,
            detail="Configurações do ZapVoice/ZapJords (URL ou Token) não configuradas nesta integração."
        )

    if webhook_id in _ACTIVE_IMPORTS:
        return {
            "ok": True,
            "message": "A importação já está em andamento. Acompanhe pelo painel.",
            "active": True
        }

    task_fn = _get_run_task()
    asyncio.create_task(task_fn(webhook_id))

    return {
        "ok": True,
        "message": "Importação de conversas e histórico iniciada com sucesso.",
        "active": True
    }


@router.get("/{webhook_id}/leads/import-status")
async def get_chat_import_status(webhook_id: int, db: AsyncSession = Depends(get_db)):
    """Retorna o status atual da importação de conversas do ZapJords para o webhook."""
    status = _IMPORT_STATUS.get(webhook_id)
    if status:
        if status.get("total", 0) > 0 and status.get("current", 0) >= status.get("total", 0):
            status["done"] = True
            status["percentage"] = 100
            status["active"] = False
            status["error"] = None
        return status

    config = await db.get(WebhookConfigModel, webhook_id)
    table_name = getattr(config, "leads_table", "leads") or "leads"
    total_leads = 0
    try:
        res = await db.execute(text(f"SELECT count(*) FROM {table_name} WHERE webhook_config_id = :wid"), {"wid": webhook_id})
        total_leads = res.scalar() or 0
    except Exception:
        total_leads = 0

    is_act = webhook_id in _ACTIVE_IMPORTS
    return {
        "active": is_act,
        "current": total_leads,
        "total": total_leads,
        "percentage": 100 if (not is_act and total_leads > 0) else 0,
        "status": f"Importação concluída. {total_leads} contatos sincronizados." if (not is_act and total_leads > 0) else "Nenhuma importação ativa",
        "created_leads": total_leads,
        "imported_messages": 0,
        "current_contact": "",
        "done": not is_act,
        "error": None,
        "started_at": None,
        "elapsed_seconds": 0
    }


@router.post("/{webhook_id}/leads/cancel-import")
async def cancel_chat_import(webhook_id: int):
    """Cancela uma importação de conversas do ZapJords em andamento."""
    if webhook_id not in _ACTIVE_IMPORTS:
        return {
            "ok": False,
            "message": "Nenhuma importação ativa para este webhook.",
            "active": False
        }

    _CANCEL_REQUESTS.add(webhook_id)
    logger.info(f"[ImportChat] Cancelamento solicitado para webhook_id={webhook_id}")

    cur_status = _IMPORT_STATUS.get(webhook_id, {})
    started_at = cur_status.get("started_at")
    elapsed = int(time.time() - started_at) if started_at else cur_status.get("elapsed_seconds", 0)

    st_cancel = _update_status(
        webhook_id,
        active=False,
        status="Importação cancelada pelo usuário.",
        done=True,
        cancelled=True,
        elapsed_seconds=elapsed
    )

    task = _RUNNING_TASKS.get(webhook_id)
    if task and not task.done():
        task.cancel()

    ws_manager = _get_manager()
    try:
        await ws_manager.broadcast({
            "type": "chat_import_cancelled",
            "webhook_id": webhook_id,
            **st_cancel
        })
        await ws_manager.broadcast({
            "type": "leads_synced",
            "webhook_id": webhook_id,
            "action": "import_chat_cancelled"
        })
    except Exception:
        pass

    return {
        "ok": True,
        "message": "Importação cancelada com sucesso.",
        "active": False
    }
