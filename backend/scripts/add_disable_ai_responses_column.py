import os
import sys
from sqlalchemy import text, create_engine

# Adicionar a pasta raiz ao sys.path para importar models/database
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database.connection import engine_sync

def run_migration():
    print("🚀 Iniciando migração: adicionando coluna 'disable_ai_responses' na tabela 'webhook_configs'...")
    with engine_sync.begin() as conn:
        dialect = engine_sync.dialect.name
        if dialect == "postgresql":
            sql = text("ALTER TABLE webhook_configs ADD COLUMN IF NOT EXISTS disable_ai_responses BOOLEAN DEFAULT FALSE;")
        else:
            sql = text("ALTER TABLE webhook_configs ADD COLUMN disable_ai_responses BOOLEAN DEFAULT FALSE;")
            
        try:
            conn.execute(sql)
            print("✅ Coluna 'disable_ai_responses' adicionada com sucesso!")
        except Exception as e:
            if "already exists" in str(e).lower() or "duplicate column" in str(e).lower():
                print("✨ Coluna 'disable_ai_responses' já existe.")
            else:
                print(f"❌ Erro ao adicionar coluna: {e}")
                raise

if __name__ == "__main__":
    run_migration()
