"""Submódulos de atalhos e roteamento determinístico para o pré-roteador de IA."""

from .classification import (
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
from .conversational import (
    is_user_accepting_assistant_offer,
    is_user_answering_assistant_question,
)
from .matcher import (
    check_programmatic_shortcuts,
)

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
]
