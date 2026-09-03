import sys
import os
import logging

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.append("/app")
from sqlalchemy import text
from database.connection import engine_sync

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def migrate():
    # 1. Adicionar colunas na tabela agent_config
    migrations = [
        ("agent_config", "semantic_cache_enabled", "BOOLEAN DEFAULT TRUE"),
        ("agent_config", "semantic_cache_threshold", "FLOAT DEFAULT 0.92"),
    ]

    with engine_sync.connect() as conn:
        for table, column, col_type in migrations:
            logger.info(f"Verificando coluna {column} na tabela {table}...")
            try:
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {col_type}"))
                conn.commit()
                logger.info(f"✅ Coluna {column} adicionada à tabela {table}.")
            except Exception as e:
                conn.rollback()
                if "already exists" in str(e).lower() or "duplicate column" in str(e).lower():
                    logger.info(f"✨ Coluna {column} já existe na tabela {table}.")
                else:
                    logger.error(f"❌ Erro ao adicionar coluna {column}: {e}")

        # 2. Criar a tabela semantic_caches se não existir
        logger.info("Verificando criação da tabela semantic_caches...")
        try:
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS semantic_caches (
                    id SERIAL PRIMARY KEY,
                    client_id INTEGER,
                    agent_id INTEGER NOT NULL REFERENCES agent_config(id) ON DELETE CASCADE,
                    user_query TEXT NOT NULL,
                    approved_response TEXT NOT NULL,
                    embedding JSON,
                    usage_count INTEGER DEFAULT 0,
                    is_active BOOLEAN DEFAULT TRUE,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );
                CREATE INDEX IF NOT EXISTS idx_semantic_cache_agent_id ON semantic_caches(agent_id);
                CREATE INDEX IF NOT EXISTS idx_semantic_cache_client_id ON semantic_caches(client_id);
            """))
            conn.commit()
            logger.info("✅ Tabela semantic_caches e índices criados com sucesso.")
        except Exception as e:
            conn.rollback()
            logger.error(f"❌ Erro ao criar tabela semantic_caches: {e}")

if __name__ == "__main__":
    migrate()
