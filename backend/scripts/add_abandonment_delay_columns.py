import os
import sys
from sqlalchemy import text

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from database import engine_sync

def add_abandonment_delay_columns():
    print("🚀 Iniciando migração para adicionar 'abandonment_delay_value' e 'abandonment_delay_unit' na tabela 'webhook_configs'...")
    with engine_sync.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE webhook_configs ADD COLUMN IF NOT EXISTS abandonment_delay_value INTEGER DEFAULT 24;"))
            conn.execute(text("ALTER TABLE webhook_configs ADD COLUMN IF NOT EXISTS abandonment_delay_unit VARCHAR(20) DEFAULT 'hours';"))
            conn.commit()
            print("✅ Colunas 'abandonment_delay_value' e 'abandonment_delay_unit' adicionadas com sucesso na tabela 'webhook_configs'!")
        except Exception as e:
            print(f"⚠️ Erro ao adicionar colunas de tempo de desistência: {e}")

if __name__ == "__main__":
    add_abandonment_delay_columns()
