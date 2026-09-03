"""
Módulo de compatibilidade e re-exportação para o pipeline de tarefas de webhook.
"""
import os
import json
import logging
import asyncio
import httpx
import time
import re
from datetime import datetime, timezone, timedelta
from sqlalchemy import text
from celery_app import app
from database import SessionLocal, async_session_worker
from models import WebhookEventModel, WebhookConfigModel, AgentConfigModel, KnowledgeItemModel, KnowledgeBaseModel, InteractionLog
from config_store import AgentConfig
from agent import process_message
from agent_core.logic.pre_router import run_pre_router_ai
from rag_service import get_embedding
from zapvoice_utils import is_conversation_paused, sync_conversation_labels
from core.timezone import get_now_br, get_now_utc
from core.websocket import manager
from agent_core.services.media_service import process_media_content
from celery import shared_task

# Import utilities and tasks from webhook_tasks package
from webhook_tasks.utils import broadcast_status, _add_step, _toggle_typing_indicator
from webhook_tasks.media_tasks import process_media_content_task
from webhook_tasks.vector_sync import sync_memory_to_vector
from webhook_tasks.automation import process_webhook_automation

# Import logic from webhook_services
from webhook_services import (
    execute_keyword_deletion_trap,
    check_automation_trap,
    retrieve_context_history,
    _get_cost,
    _build_agent_config,
    _send_zapvoice_message,
    auto_migrate_webhook_columns,
    resolve_grouped_media,
    proactive_update_lead_table,
    save_interaction_log,
    get_project_assistant_context
)

# Alias for backward compatibility with legacy tests
_send_chatwoot_message = _send_zapvoice_message

logger = logging.getLogger(__name__)

__all__ = [
    "broadcast_status",
    "_add_step",
    "_toggle_typing_indicator",
    "process_media_content_task",
    "sync_memory_to_vector",
    "process_webhook_automation",
    "execute_keyword_deletion_trap",
    "check_automation_trap",
    "retrieve_context_history",
    "_get_cost",
    "_build_agent_config",
    "_send_zapvoice_message",
    "_send_chatwoot_message",
    "auto_migrate_webhook_columns",
    "resolve_grouped_media",
    "proactive_update_lead_table",
    "save_interaction_log",
    "get_project_assistant_context",
    "SessionLocal",
    "async_session_worker",
    "process_message",
    "run_pre_router_ai",
    "is_conversation_paused",
    "sync_conversation_labels",
    "os",
    "json",
    "asyncio",
    "httpx",
    "time",
    "re",
    "datetime",
    "timezone",
    "timedelta"
]
