"""Módulo de fachada (barrel) para atalhos de pré-roteamento (shortcuts).

Este módulo re-exporta as funcionalidades de classificação, aceites conversacionais
e correspondência de atalhos determinísticos divididas em submódulos dedicados em
backend/agent_core/logic/pre_router/shortcuts_modules/, mantendo 100% de compatibilidade
retroativa com imports existentes e suítes de testes.
"""

import logging
from .shortcuts_modules.classification import (
    _is_recurrent_thank_you_or_closing,
    _has_previous_assistant_closing,
    _count_payment_issue_occurrences,
    _is_generic_doubt_or_vague_topic,
    _is_closing_or_no_more_doubts,
    _is_explicit_farewell,
    _agent_has_active_qualification_funnel,
    _is_purchase_declaration,
    _is_disinterest_declaration,
)
from .shortcuts_modules.conversational import (
    is_user_accepting_assistant_offer,
    is_user_answering_assistant_question,
)
from .shortcuts_modules.matcher import (
    check_programmatic_shortcuts,
)

logger = logging.getLogger(__name__)

__all__ = [
    "_is_recurrent_thank_you_or_closing",
    "_has_previous_assistant_closing",
    "_count_payment_issue_occurrences",
    "_is_generic_doubt_or_vague_topic",
    "_is_closing_or_no_more_doubts",
    "_is_explicit_farewell",
    "_agent_has_active_qualification_funnel",
    "_is_purchase_declaration",
    "_is_disinterest_declaration",
    "is_user_accepting_assistant_offer",
    "is_user_answering_assistant_question",
    "check_programmatic_shortcuts",
    "logger",
]
