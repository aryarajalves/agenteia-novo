"""Módulo de fachada (barrel) para importação de conversas do ZapVoice/ZapJords.

Este módulo re-exporta todas as funcionalidades modulares divididas em
backend/webhooks/import_chat_modules/, mantendo 100% de compatibilidade retroativa
com imports de rotas e patches de testes existentes.
"""

import logging
import httpx
from database import async_session
from core.websocket import manager
from .service import ensure_leads_table

from .import_chat_modules.state import (
    _ACTIVE_IMPORTS,
    _CANCEL_REQUESTS,
    _RUNNING_TASKS,
    _IMPORT_STATUS,
    _update_status,
)
from .import_chat_modules.helpers import (
    resolve_fast_zapvoice_url,
    to_naive_datetime,
    to_aware_utc,
    is_system_or_badge_message,
)
from .import_chat_modules.processor import (
    process_single_conversation,
)
from .import_chat_modules.importer import (
    run_chat_import_task,
)
from .import_chat_modules.routes import (
    router,
    import_chat_from_zapjords,
    get_chat_import_status,
    cancel_chat_import,
)

logger = logging.getLogger(__name__)

__all__ = [
    "router",
    "_ACTIVE_IMPORTS",
    "_CANCEL_REQUESTS",
    "_RUNNING_TASKS",
    "_IMPORT_STATUS",
    "_update_status",
    "resolve_fast_zapvoice_url",
    "to_naive_datetime",
    "to_aware_utc",
    "is_system_or_badge_message",
    "process_single_conversation",
    "run_chat_import_task",
    "import_chat_from_zapjords",
    "get_chat_import_status",
    "cancel_chat_import",
    "logger",
    "async_session",
    "manager",
    "ensure_leads_table",
    "httpx",
]
