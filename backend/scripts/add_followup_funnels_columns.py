import os
import sys

# Adicionar pasta raiz ao sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from database.connection import engine_sync

def add_columns():
    print("🔄 Adicionando coluna followup_funnels na tabela webhook_configs e active_followup_funnel_id na tabela leads...")
    with engine_sync.connect() as conn:
        # 1. webhook_configs.followup_funnels
        try:
            conn.execute(text("ALTER TABLE webhook_configs ADD COLUMN IF NOT EXISTS followup_funnels TEXT;"))
            conn.commit()
            print("✅ Coluna followup_funnels adicionada com sucesso em webhook_configs (PostgreSQL)!")
        except Exception as e:
            try:
                conn.execute(text("ALTER TABLE webhook_configs ADD COLUMN followup_funnels TEXT;"))
                conn.commit()
                print("✅ Coluna followup_funnels adicionada com sucesso em webhook_configs (SQLite fallback)!")
            except Exception as e2:
                print(f"ℹ️ Coluna followup_funnels já existe ou erro ignorado: {e2}")

        # 2. leads.active_followup_funnel_id
        try:
            conn.execute(text("ALTER TABLE leads ADD COLUMN IF NOT EXISTS active_followup_funnel_id VARCHAR(100) DEFAULT NULL;"))
            conn.commit()
            print("✅ Coluna active_followup_funnel_id adicionada com sucesso em leads (PostgreSQL)!")
        except Exception as e:
            try:
                conn.execute(text("ALTER TABLE leads ADD COLUMN active_followup_funnel_id VARCHAR(100) DEFAULT NULL;"))
                conn.commit()
                print("✅ Coluna active_followup_funnel_id adicionada com sucesso em leads (SQLite fallback)!")
            except Exception as e2:
                print(f"ℹ️ Coluna active_followup_funnel_id já existe ou erro ignorado: {e2}")

if __name__ == "__main__":
    add_columns()
