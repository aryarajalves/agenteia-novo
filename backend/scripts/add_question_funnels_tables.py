import os
import sys

# Adicionar pasta raiz ao sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from database.connection import engine_sync

def migrate():
    print("🔄 Iniciando migração para Question Funnels...")
    with engine_sync.connect() as conn:
        # 1. Criar tabela question_funnels
        try:
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS question_funnels (
                    id SERIAL PRIMARY KEY,
                    agent_id INTEGER NOT NULL REFERENCES agent_config(id) ON DELETE CASCADE,
                    name VARCHAR(255) NOT NULL,
                    trigger_question TEXT NOT NULL,
                    trigger_variations JSON DEFAULT '[]',
                    similarity_threshold FLOAT DEFAULT 0.82,
                    frequency_mode VARCHAR(50) DEFAULT 'once_per_lead',
                    is_active BOOLEAN DEFAULT TRUE,
                    embedding JSON,
                    variation_embeddings JSON DEFAULT '[]',
                    steps JSON NOT NULL DEFAULT '[]',
                    total_executions INTEGER DEFAULT 0,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                );
            """))
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_question_funnels_agent_id ON question_funnels(agent_id);
            """))
            conn.commit()
            print("✅ Tabela question_funnels criada ou verificada com sucesso!")
        except Exception as e:
            print(f"⚠️ Erro ao criar question_funnels: {e}")

        # 2. Adicionar executed_question_funnels na tabela leads
        try:
            conn.execute(text("ALTER TABLE leads ADD COLUMN IF NOT EXISTS executed_question_funnels JSON DEFAULT '[]';"))
            conn.commit()
            print("✅ Coluna executed_question_funnels adicionada com sucesso em leads (PostgreSQL)!")
        except Exception as e:
            try:
                conn.execute(text("ALTER TABLE leads ADD COLUMN executed_question_funnels JSON;"))
                conn.commit()
                print("✅ Coluna executed_question_funnels adicionada com sucesso (SQLite fallback)!")
            except Exception as e2:
                print(f"ℹ️ Coluna executed_question_funnels já existe ou ignorada: {e2}")

if __name__ == "__main__":
    migrate()
