import pytest
import os
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime, timezone, timedelta
from sqlalchemy import Index, UniqueConstraint
from database import Base, engine
from database.connection import run_pool_janitor
import models


def test_models_metadata_has_all_tables():
    """Valida que todos os modelos principais estão registrados no Base.metadata."""
    table_names = Base.metadata.tables.keys()
    
    expected_tables = [
        "interaction_logs",
        "session_summaries",
        "knowledge_bases",
        "knowledge_items",
        "agent_config",
        "tools",
        "prompt_drafts",
        "user_memory",
        "feedback_logs",
        "google_tokens",
        "global_context_variables",
        "users",
        "user_invites",
        "unanswered_questions",
        "support_requests",
        "webhook_configs",
        "webhook_events",
        "transcription_folders",
        "transcription_tasks",
        "scheduled_triggers",
        "message_status",
        "user_question_embeddings",
        "objection_clusters",
        "objection_cluster_messages",
        "backup_configs",
        "backup_history",
        "sales",
        "calendar_events",
        "testimonial_categories",
        "testimonials",
        "sent_testimonials",
        "leads",
    ]
    
    for table in expected_tables:
        assert table in table_names, f"Tabela '{table}' não encontrada no Base.metadata"


def test_models_table_args_and_indexes():
    """Valida a presença de índices compostos e constraints nos modelos ORM."""
    # InteractionLog
    il_indexes = [arg.name for arg in getattr(models.InteractionLog, "__table_args__", []) if isinstance(arg, Index)]
    assert "idx_interaction_logs_agent_time" in il_indexes
    assert "idx_interaction_logs_session_time" in il_indexes

    # KnowledgeItemModel
    ki_indexes = [arg.name for arg in getattr(models.KnowledgeItemModel, "__table_args__", []) if isinstance(arg, Index)]
    assert "idx_knowledge_items_kb_id" in ki_indexes
    assert "idx_knowledge_items_parent_id" in ki_indexes

    # UserMemoryModel
    um_args = getattr(models.UserMemoryModel, "__table_args__", [])
    um_indexes = [arg.name for arg in um_args if isinstance(arg, Index)]
    um_uqs = [arg.name for arg in um_args if isinstance(arg, UniqueConstraint)]
    assert "idx_user_memory_session_updated" in um_indexes
    assert "uq_user_memory_session_key" in um_uqs

    # WebhookEventModel
    we_indexes = [arg.name for arg in getattr(models.WebhookEventModel, "__table_args__", []) if isinstance(arg, Index)]
    assert "idx_webhook_events_config_created" in we_indexes
    assert "idx_webhook_events_config_phone" in we_indexes
    assert "idx_webhook_events_config_status_event" in we_indexes

    # ScheduledTrigger
    st_indexes = [arg.name for arg in getattr(models.ScheduledTrigger, "__table_args__", []) if isinstance(arg, Index)]
    assert "idx_scheduled_triggers_status_created" in st_indexes
    assert "idx_scheduled_triggers_phone" in st_indexes

    # LeadModel
    lm_indexes = [arg.name for arg in getattr(models.LeadModel, "__table_args__", []) if isinstance(arg, Index)]
    assert "idx_leads_webhook_config_id" in lm_indexes
    assert "idx_leads_telefone" in lm_indexes
    assert "idx_leads_ultima_msg" in lm_indexes
    assert "idx_leads_score" in lm_indexes


@pytest.mark.asyncio
async def test_run_pool_janitor_safe_under_load():
    """Valida que o run_pool_janitor NÃO executa engine.dispose() quando há conexões em uso (checkedout > 0)."""
    mock_pool = MagicMock()
    mock_pool.size.return_value = 25
    mock_pool.checkedout.return_value = 20  # 80% de ocupação
    mock_pool.overflow.return_value = 5

    mock_engine = MagicMock()
    mock_engine.pool = mock_pool
    mock_engine.dispose = AsyncMock()

    with patch("database.connection.engine", mock_engine):
        await run_pool_janitor()
        # Não deve chamar dispose() mesmo sob carga alta
        mock_engine.dispose.assert_not_called()


@pytest.mark.asyncio
async def test_run_pool_janitor_recycles_when_idle_with_overflow():
    """Valida que o run_pool_janitor recicla com segurança apenas se o pool estiver ocioso (checkedout == 0) e com overflow."""
    mock_pool = MagicMock()
    mock_pool.size.return_value = 25
    mock_pool.checkedout.return_value = 0
    mock_pool.overflow.return_value = 5

    mock_engine = MagicMock()
    mock_engine.pool = mock_pool
    mock_engine.dispose = AsyncMock()

    with patch("database.connection.engine", mock_engine):
        await run_pool_janitor()
        mock_engine.dispose.assert_called_once()


def test_cleanup_old_logs_task():
    """Valida que a tarefa cleanup_old_logs executa queries de deleção com filtro de data correto."""
    from tasks import cleanup_old_logs
    
    mock_db = MagicMock()
    mock_query = MagicMock()
    mock_filter = MagicMock()
    mock_filter.delete.return_value = 10
    mock_query.filter.return_value = mock_filter
    mock_db.query.return_value = mock_query

    with patch("tasks.SessionLocal", return_value=mock_db), patch.dict(os.environ, {"LOG_RETENTION_DAYS": "30"}):
        cleanup_old_logs()
        
        assert mock_db.query.call_count == 2
        assert mock_db.commit.call_count == 1
        mock_db.close.assert_called_once()
