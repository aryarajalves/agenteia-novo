import os
import sys
from sqlalchemy import create_engine, text

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from database import DATABASE_URL

def migrate():
    print(f"🔄 Conectando ao banco de dados...")
    sync_db_url = DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")
    engine = create_engine(sync_db_url)
    with engine.connect() as conn:
        with conn.begin():
            print("🛠️ Adicionando colunas followup_cancel_label e followup_required_label na tabela webhook_configs...")
            conn.execute(text("ALTER TABLE webhook_configs ADD COLUMN IF NOT EXISTS followup_cancel_label VARCHAR;"))
            conn.execute(text("ALTER TABLE webhook_configs ADD COLUMN IF NOT EXISTS followup_required_label VARCHAR;"))
            print("✅ Migration concluída com sucesso!")

if __name__ == "__main__":
    migrate()
