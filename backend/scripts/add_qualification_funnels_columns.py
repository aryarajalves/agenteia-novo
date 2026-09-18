import os
import sys

# Adicionar pasta raiz ao sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from database.connection import engine_sync

def add_columns():
    print("🔄 Adicionando coluna qualification_funnels na tabela agent_config e active_qualification_funnel_id na tabela leads...")
    with engine_sync.connect() as conn:
        # 1. agent_config.qualification_funnels
        try:
            conn.execute(text("ALTER TABLE agent_config ADD COLUMN IF NOT EXISTS qualification_funnels JSON;"))
            conn.commit()
            print("✅ Coluna qualification_funnels adicionada com sucesso em agent_config (PostgreSQL)!")
        except Exception as e:
            try:
                conn.execute(text("ALTER TABLE agent_config ADD COLUMN qualification_funnels JSON;"))
                conn.commit()
                print("✅ Coluna qualification_funnels adicionada com sucesso (SQLite fallback)!")
            except Exception as e2:
                print(f"ℹ️ Coluna qualification_funnels já existe ou erro ignorado: {e2}")

        # 2. leads.active_qualification_funnel_id
        try:
            conn.execute(text("ALTER TABLE leads ADD COLUMN IF NOT EXISTS active_qualification_funnel_id VARCHAR(100) DEFAULT NULL;"))
            conn.commit()
            print("✅ Coluna active_qualification_funnel_id adicionada com sucesso em leads (PostgreSQL)!")
        except Exception as e:
            try:
                conn.execute(text("ALTER TABLE leads ADD COLUMN active_qualification_funnel_id VARCHAR(100) DEFAULT NULL;"))
                conn.commit()
                print("✅ Coluna active_qualification_funnel_id adicionada com sucesso (SQLite fallback)!")
            except Exception as e2:
                print(f"ℹ️ Coluna active_qualification_funnel_id já existe ou erro ignorado: {e2}")

if __name__ == "__main__":
    add_columns()
