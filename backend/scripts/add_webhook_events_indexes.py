"""
Script de migração: Adiciona índices compostos na tabela webhook_events
para otimizar queries de histórico de disparos por telefone + webhook.

Problema resolvido: A query GET /webhooks/{id}/events filtrava por
(webhook_config_id, telefone, status, event_type) usando apenas índices
individuais, causando slow scans em tabelas grandes.

Execute: python backend/scripts/add_webhook_events_indexes.py
"""
import os
import sys
import asyncio
import logging

# Adiciona o diretório raiz ao path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


async def run_migration():
    database_url = os.getenv("DATABASE_URL", "")
    if not database_url:
        logger.error("Variável DATABASE_URL não definida.")
        sys.exit(1)

    # SQLAlchemy async precisa de driver async
    if database_url.startswith("postgresql://"):
        database_url = database_url.replace("postgresql://", "postgresql+asyncpg://", 1)

    engine = create_async_engine(database_url, echo=False)

    indexes = [
        # Índice composto principal: cobre a query de histórico por telefone de um lead
        (
            "idx_webhook_events_wid_telefone",
            "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_webhook_events_wid_telefone "
            "ON webhook_events (webhook_config_id, telefone)"
        ),
        # Índice composto para filtros de status + type (usados na listagem geral)
        (
            "idx_webhook_events_wid_status_type",
            "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_webhook_events_wid_status_type "
            "ON webhook_events (webhook_config_id, status, event_type)"
        ),
        # Índice de ordenação: created_at DESC é usado em todos os SELECTs
        (
            "idx_webhook_events_wid_created_at",
            "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_webhook_events_wid_created_at "
            "ON webhook_events (webhook_config_id, created_at DESC)"
        ),
    ]

    async with engine.begin() as conn:
        for idx_name, ddl in indexes:
            try:
                logger.info(f"Criando índice: {idx_name}...")
                # CONCURRENTLY não pode rodar dentro de um bloco de transação no PostgreSQL
                # Usamos AUTOCOMMIT para isso
                await conn.execute(text("COMMIT"))
                await conn.execute(text(ddl))
                logger.info(f"✅ Índice '{idx_name}' criado com sucesso.")
            except Exception as e:
                if "already exists" in str(e).lower():
                    logger.info(f"ℹ️  Índice '{idx_name}' já existe, pulando.")
                else:
                    logger.error(f"❌ Erro ao criar índice '{idx_name}': {e}")

    await engine.dispose()
    logger.info("🎉 Migração de índices concluída!")


if __name__ == "__main__":
    asyncio.run(run_migration())
