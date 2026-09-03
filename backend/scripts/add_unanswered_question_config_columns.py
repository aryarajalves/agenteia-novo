import os
import sys

# Adicionar pasta raiz ao sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from database.connection import engine_sync

def add_columns():
    print("🔄 Adicionando colunas de configuração de dúvidas sem resposta na tabela agent_config...")
    with engine_sync.connect() as conn:
        # 1. unanswered_handoff_limit (INTEGER DEFAULT 2)
        try:
            conn.execute(text("ALTER TABLE agent_config ADD COLUMN IF NOT EXISTS unanswered_handoff_limit INTEGER DEFAULT 2;"))
            conn.commit()
            print("✅ Coluna unanswered_handoff_limit adicionada com sucesso no PostgreSQL!")
        except Exception as e:
            try:
                conn.execute(text("ALTER TABLE agent_config ADD COLUMN unanswered_handoff_limit INTEGER DEFAULT 2;"))
                conn.commit()
                print("✅ Coluna unanswered_handoff_limit adicionada com sucesso (SQLite fallback)!")
            except Exception as e2:
                print(f"ℹ️ Coluna unanswered_handoff_limit já existe ou erro ignorado: {e2}")

        # 2. unanswered_question_prompt (TEXT)
        try:
            conn.execute(text("ALTER TABLE agent_config ADD COLUMN IF NOT EXISTS unanswered_question_prompt TEXT;"))
            conn.commit()
            print("✅ Coluna unanswered_question_prompt adicionada com sucesso no PostgreSQL!")
        except Exception as e:
            try:
                conn.execute(text("ALTER TABLE agent_config ADD COLUMN unanswered_question_prompt TEXT;"))
                conn.commit()
                print("✅ Coluna unanswered_question_prompt adicionada com sucesso (SQLite fallback)!")
            except Exception as e2:
                print(f"ℹ️ Coluna unanswered_question_prompt já existe ou erro ignorado: {e2}")

if __name__ == "__main__":
    add_columns()
