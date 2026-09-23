"""Gerenciamento de estado e progresso em memória da importação de conversas."""

# Rastreamento em memória da importação ativa e status atual por webhook_id
_ACTIVE_IMPORTS = set()
_CANCEL_REQUESTS = set()
_RUNNING_TASKS = {}
_IMPORT_STATUS = {}


def _update_status(webhook_id: int, **kwargs):
    """Atualiza o dicionário de status da importação para o webhook informado."""
    prev = _IMPORT_STATUS.get(webhook_id, {
        "active": True,
        "current": 0,
        "total": 0,
        "percentage": 0,
        "status": "",
        "created_leads": 0,
        "imported_messages": 0,
        "current_contact": "",
        "done": False,
        "cancelled": False,
        "error": None,
        "started_at": None,
        "elapsed_seconds": 0
    })
    prev.update(kwargs)
    _IMPORT_STATUS[webhook_id] = prev
    return prev
