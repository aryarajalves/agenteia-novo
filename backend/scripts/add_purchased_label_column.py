import os
import sys
from sqlalchemy import text

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from database import SessionLocal, engine_sync

def add_purchased_label_column():
    print("🚀 Iniciando migração para adicionar 'purchased_label' na tabela 'webhook_configs'...")
    with engine_sync.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE webhook_configs ADD COLUMN IF NOT EXISTS purchased_label VARCHAR;"))
            conn.commit()
            print("✅ Coluna 'purchased_label' adicionada com sucesso na tabela 'webhook_configs'!")
        except Exception as e:
            print(f"⚠️ Erro ao adicionar coluna 'purchased_label': {e}")

if __name__ == "__main__":
    add_purchased_label_column()
