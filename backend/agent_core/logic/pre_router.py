"""
Módulo de compatibilidade e re-exportação para o pacote pre_router modularizado.
"""
from agent_core.logic.pre_router import (
    run_pre_router_ai,
    get_date_context,
    DEFAULT_PRE_ROUTER_PROMPT_TEMPLATE,
    PRE_ROUTER_JSON_FOOTER,
    _build_pre_router_system_prompt,
    _has_previous_assistant_closing,
    _count_payment_issue_occurrences,
    _is_generic_doubt_or_vague_topic,
    check_programmatic_shortcuts,
    enrich_user_message,
    _get_kb_reference_context,
    sanitize_and_split_questions,
    format_debug_and_memory
)

__all__ = [
    "run_pre_router_ai",
    "get_date_context",
    "DEFAULT_PRE_ROUTER_PROMPT_TEMPLATE",
    "PRE_ROUTER_JSON_FOOTER",
    "_build_pre_router_system_prompt",
    "_has_previous_assistant_closing",
    "_count_payment_issue_occurrences",
    "_is_generic_doubt_or_vague_topic",
    "check_programmatic_shortcuts",
    "enrich_user_message",
    "_get_kb_reference_context",
    "sanitize_and_split_questions",
    "format_debug_and_memory",
]
