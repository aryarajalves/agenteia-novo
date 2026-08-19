import os
import sys
from sqlalchemy import create_engine, text

# Adiciona o diretório atual ao path para importar as configurações
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import engine_sync

def migrate():
    print("🚀 Iniciando migração de banco de dados para adicionar 'followup_add_label'...")
    try:
        with engine_sync.connect() as conn:
            conn.execute(text("ALTER TABLE webhook_configs ADD COLUMN IF NOT EXISTS followup_add_label VARCHAR;"))
            conn.commit()
            print("✅ Coluna 'followup_add_label' adicionada à tabela 'webhook_configs' com sucesso!")
    except Exception as e:
        print(f"❌ Erro ao rodar migração: {e}")
        sys.exit(1)

if __name__ == "__main__":
    migrate()
