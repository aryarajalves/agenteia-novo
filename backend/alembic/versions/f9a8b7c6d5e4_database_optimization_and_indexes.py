"""database_optimization_and_indexes

Revision ID: f9a8b7c6d5e4
Revises: f4a5b6c7d8e9
Create Date: 2026-08-20 08:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy import text

revision: str = 'f9a8b7c6d5e4'
down_revision: Union[str, Sequence[str], None] = 'a7b8c9d0e1f2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()
    is_postgres = conn.dialect.name == "postgresql"

    # 1. Garantir que a tabela 'leads' existe
    if 'leads' not in tables:
        op.create_table(
            'leads',
            sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column('webhook_config_id', sa.Integer(), sa.ForeignKey('webhook_configs.id', ondelete='SET NULL'), nullable=True),
            sa.Column('qualified_by_agent_id', sa.Integer(), sa.ForeignKey('agent_config.id', ondelete='SET NULL'), nullable=True),
            sa.Column('conta_id', sa.String(), nullable=True),
            sa.Column('inbox_id', sa.String(), nullable=True),
            sa.Column('inbox_nome', sa.String(), nullable=True),
            sa.Column('conversa_id', sa.String(), nullable=True),
            sa.Column('mensagem_id', sa.String(), nullable=True),
            sa.Column('contato_id', sa.String(), nullable=True),
            sa.Column('telefone', sa.String(), nullable=True),
            sa.Column('labels', sa.Text(), nullable=True),
            sa.Column('contato_nome', sa.String(), nullable=True),
            sa.Column('mensagem', sa.Text(), nullable=True),
            sa.Column('message_type', sa.String(50), server_default='text', nullable=True),
            sa.Column('link', sa.Text(), nullable=True),
            sa.Column('pode_enviar_mensagem', sa.Boolean(), server_default='true', nullable=True),
            sa.Column('ultima_mensagem_em', sa.DateTime(timezone=True), nullable=True),
            sa.Column('window_close_processed', sa.Boolean(), server_default='false', nullable=True),
            sa.Column('followup_step', sa.Integer(), server_default='0', nullable=True),
            sa.Column('ultima_resposta_agente', sa.Text(), nullable=True),
            sa.Column('ultima_resposta_agente_em', sa.DateTime(timezone=True), nullable=True),
            sa.Column('respostas_qualificacao', sa.Text(), nullable=True),
            sa.Column('lead_score', sa.Integer(), nullable=True),
            sa.Column('lead_classification', sa.String(50), nullable=True),
            sa.Column('lead_justification', sa.Text(), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        )

    # 2. Índices na tabela 'knowledge_items' (HNSW e GIN no PostgreSQL)
    if 'knowledge_items' in tables:
        existing_indices = [idx['name'] for idx in inspector.get_indexes('knowledge_items')]
        if is_postgres:
            # pgvector HNSW index
            if 'idx_knowledge_items_embedding_hnsw' not in existing_indices:
                try:
                    conn.execute(text(
                        "CREATE INDEX IF NOT EXISTS idx_knowledge_items_embedding_hnsw "
                        "ON knowledge_items USING hnsw (embedding vector_cosine_ops) "
                        "WITH (m = 16, ef_construction = 64)"
                    ))
                except Exception as e:
                    print(f"[ALEMBIC MIGRATION] Aviso: HNSW index não pôde ser criado: {e}")

            # GIN Full Text Search index
            if 'idx_knowledge_items_fts' not in existing_indices:
                try:
                    conn.execute(text(
                        "CREATE INDEX IF NOT EXISTS idx_knowledge_items_fts "
                        "ON knowledge_items USING gin("
                        "to_tsvector('portuguese', coalesce(question, '') || ' ' || coalesce(answer, '') || ' ' || coalesce(metadata_val, ''))"
                        ")"
                    ))
                except Exception as e:
                    print(f"[ALEMBIC MIGRATION] Aviso: GIN FTS index não pôde ser criado: {e}")

        # Índices BTree relacionais
        if 'idx_knowledge_items_kb_id' not in existing_indices:
            op.create_index('idx_knowledge_items_kb_id', 'knowledge_items', ['knowledge_base_id'])
        if 'idx_knowledge_items_parent_id' not in existing_indices:
            op.create_index('idx_knowledge_items_parent_id', 'knowledge_items', ['parent_id'])

    # 3. Índices na tabela 'interaction_logs'
    if 'interaction_logs' in tables:
        existing_indices = [idx['name'] for idx in inspector.get_indexes('interaction_logs')]
        if 'idx_interaction_logs_agent_time' not in existing_indices:
            op.create_index('idx_interaction_logs_agent_time', 'interaction_logs', ['agent_id', 'timestamp'])
        if 'idx_interaction_logs_session_time' not in existing_indices:
            op.create_index('idx_interaction_logs_session_time', 'interaction_logs', ['session_id', 'timestamp'])

    # 4. Índices e Constraint UNIQUE na tabela 'user_memory'
    if 'user_memory' in tables:
        existing_indices = [idx['name'] for idx in inspector.get_indexes('user_memory')]
        existing_uqs = [uq['name'] for uq in inspector.get_unique_constraints('user_memory')]
        
        if 'idx_user_memory_session_updated' not in existing_indices:
            op.create_index('idx_user_memory_session_updated', 'user_memory', ['session_id', 'updated_at'])
            
        if 'uq_user_memory_session_key' not in existing_uqs and is_postgres:
            try:
                op.create_unique_constraint('uq_user_memory_session_key', 'user_memory', ['session_id', 'key'])
            except Exception as e:
                print(f"[ALEMBIC MIGRATION] Aviso: Unique constraint não pôde ser criada (possíveis duplicatas legadas): {e}")

    # 5. Índices na tabela 'webhook_events'
    if 'webhook_events' in tables:
        existing_indices = [idx['name'] for idx in inspector.get_indexes('webhook_events')]
        if 'idx_webhook_events_config_created' not in existing_indices:
            op.create_index('idx_webhook_events_config_created', 'webhook_events', ['webhook_config_id', 'created_at'])
        if 'idx_webhook_events_config_phone' not in existing_indices:
            op.create_index('idx_webhook_events_config_phone', 'webhook_events', ['webhook_config_id', 'telefone'])
        if 'idx_webhook_events_config_status_event' not in existing_indices:
            op.create_index('idx_webhook_events_config_status_event', 'webhook_events', ['webhook_config_id', 'status', 'event_type'])

    # 6. Índices na tabela 'scheduled_triggers'
    if 'scheduled_triggers' in tables:
        existing_indices = [idx['name'] for idx in inspector.get_indexes('scheduled_triggers')]
        if 'idx_scheduled_triggers_status_created' not in existing_indices:
            op.create_index('idx_scheduled_triggers_status_created', 'scheduled_triggers', ['status', 'created_at'])
        if 'idx_scheduled_triggers_phone' not in existing_indices:
            op.create_index('idx_scheduled_triggers_phone', 'scheduled_triggers', ['contact_phone'])

    # 7. Índices na tabela 'leads'
    if 'leads' in tables or 'leads' in inspector.get_table_names():
        existing_indices = [idx['name'] for idx in inspector.get_indexes('leads')]
        if 'idx_leads_webhook_config_id' not in existing_indices:
            op.create_index('idx_leads_webhook_config_id', 'leads', ['webhook_config_id'])
        if 'idx_leads_telefone' not in existing_indices:
            op.create_index('idx_leads_telefone', 'leads', ['telefone'])
        if 'idx_leads_ultima_msg' not in existing_indices:
            op.create_index('idx_leads_ultima_msg', 'leads', ['ultima_mensagem_em'])
        if 'idx_leads_score' not in existing_indices:
            op.create_index('idx_leads_score', 'leads', ['lead_score'])


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()

    # Drop indexes if exist
    for table_name, idx_name in [
        ('knowledge_items', 'idx_knowledge_items_embedding_hnsw'),
        ('knowledge_items', 'idx_knowledge_items_fts'),
        ('knowledge_items', 'idx_knowledge_items_kb_id'),
        ('knowledge_items', 'idx_knowledge_items_parent_id'),
        ('interaction_logs', 'idx_interaction_logs_agent_time'),
        ('interaction_logs', 'idx_interaction_logs_session_time'),
        ('user_memory', 'idx_user_memory_session_updated'),
        ('webhook_events', 'idx_webhook_events_config_created'),
        ('webhook_events', 'idx_webhook_events_config_phone'),
        ('webhook_events', 'idx_webhook_events_config_status_event'),
        ('scheduled_triggers', 'idx_scheduled_triggers_status_created'),
        ('scheduled_triggers', 'idx_scheduled_triggers_phone'),
        ('leads', 'idx_leads_webhook_config_id'),
        ('leads', 'idx_leads_telefone'),
        ('leads', 'idx_leads_ultima_msg'),
        ('leads', 'idx_leads_score'),
    ]:
        if table_name in tables:
            existing_indices = [idx['name'] for idx in inspector.get_indexes(table_name)]
            if idx_name in existing_indices:
                try:
                    op.drop_index(idx_name, table_name=table_name)
                except Exception:
                    pass
