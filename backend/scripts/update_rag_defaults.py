import sys
sys.path.insert(0, '.')
import logging
from sqlalchemy import text
from database.connection import engine_sync

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def migrate():
    with engine_sync.connect() as conn:
        logger.info("Atualizando defaults de rag_multi_query_enabled e rag_parent_expansion_enabled...")
        try:
            conn.execute(text("ALTER TABLE agent_config ALTER COLUMN rag_multi_query_enabled SET DEFAULT TRUE;"))
            conn.execute(text("ALTER TABLE agent_config ALTER COLUMN rag_parent_expansion_enabled SET DEFAULT FALSE;"))
            conn.commit()
            logger.info("✅ Defaults atualizados com sucesso em agent_config.")
        except Exception as e:
            logger.error(f"❌ Erro ao atualizar defaults no banco: {e}")

if __name__ == "__main__":
    migrate()
