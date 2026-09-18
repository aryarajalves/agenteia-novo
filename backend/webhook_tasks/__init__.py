import os
import json
import logging
import asyncio
import httpx
import time
import re
from datetime import datetime, timezone, timedelta
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

from .utils import (
    broadcast_status,
    _add_step,
    _toggle_typing_indicator,
    _typing_indicator_supported,
    _send_chatwoot_message,
    execute_pre_rag_search,
    build_project_assistant_prompt
)
from .media_tasks import process_media_content_task
from .vector_sync import sync_memory_to_vector
from .automation import process_webhook_automation

from webhook_services import (
    execute_keyword_deletion_trap,
    check_automation_trap,
    retrieve_context_history,
    _get_cost,
    _build_agent_config,
    _send_zapvoice_message,
    _send_zapvoice_media,
    auto_migrate_webhook_columns,
    resolve_grouped_media,
    proactive_update_lead_table,
    save_interaction_log,
    get_project_assistant_context
)

__all__ = [
    "broadcast_status",
    "_add_step",
    "_toggle_typing_indicator",
    "_typing_indicator_supported",
    "process_media_content_task",
    "sync_memory_to_vector",
    "process_webhook_automation",
    "execute_keyword_deletion_trap",
    "check_automation_trap",
    "retrieve_context_history",
    "_get_cost",
    "_build_agent_config",
    "_send_zapvoice_message",
    "_send_zapvoice_media",
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
