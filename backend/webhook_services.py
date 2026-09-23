"""Módulo de fachada (barrel) para webhook_services.

Este módulo re-exporta as funcionalidades de serviços de webhooks divididas
em submódulos dedicados em backend/webhook_services_modules/, mantendo total compatibilidade
retroativa com imports existentes e patches de testes.
"""

import logging
from webhook_services_modules.agent_builder import (
    auto_migrate_webhook_columns,
    resolve_grouped_media,
    _build_agent_config,
)
from webhook_services_modules.context import (
    retrieve_context_history,
    get_project_assistant_context,
)
from webhook_services_modules.messaging import (
    _send_zapvoice_message,
    _send_zapvoice_media,
)
from webhook_services_modules.metrics import (
    _get_cost,
    proactive_update_lead_table,
    save_interaction_log,
)
from webhook_services_modules.traps import (
    execute_keyword_deletion_trap,
    check_automation_trap,
)

logger = logging.getLogger(__name__)

__all__ = [
    "auto_migrate_webhook_columns",
    "resolve_grouped_media",
    "_build_agent_config",
    "retrieve_context_history",
    "get_project_assistant_context",
    "_send_zapvoice_message",
    "_send_zapvoice_media",
    "_get_cost",
    "proactive_update_lead_table",
    "save_interaction_log",
    "execute_keyword_deletion_trap",
    "check_automation_trap",
    "logger",
]
