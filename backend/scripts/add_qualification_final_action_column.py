import os
import sys

# Adicionar pasta raiz ao sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from database.connection import engine_sync

def add_column():
    print("🔄 Adicionando coluna qualification_final_action na tabela agent_config...")
    with engine_sync.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE agent_config ADD COLUMN IF NOT EXISTS qualification_final_action TEXT;"))
            conn.commit()
            print("✅ Coluna qualification_final_action adicionada com sucesso no PostgreSQL!")
        except Exception as e:
            try:
                conn.execute(text("ALTER TABLE agent_config ADD COLUMN qualification_final_action TEXT;"))
                conn.commit()
                print("✅ Coluna qualification_final_action adicionada com sucesso (SQLite fallback)!")
            except Exception as e2:
                print(f"ℹ️ Coluna qualification_final_action já existe ou erro ignorado: {e2}")

if __name__ == "__main__":
    add_column()
