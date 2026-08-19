from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from sqlalchemy import create_engine
from sqlalchemy.pool import NullPool
import os
import logging
from dotenv import load_dotenv

# Logger configuration
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

connect_args = {}
if DATABASE_URL and "postgresql" in DATABASE_URL:
    connect_args["prepared_statement_cache_size"] = 0

# Engine Assíncrono (FastAPI)
engine_kwargs = {
    "echo": False,
    "pool_pre_ping": True,
    "connect_args": connect_args,
}
if DATABASE_URL and "postgresql" in DATABASE_URL:
    engine_kwargs.update({
        "pool_size": 25,
        "max_overflow": 15,
        "pool_timeout": 30,
        "pool_recycle": 180,
    })

engine = create_async_engine(
    DATABASE_URL, 
    **engine_kwargs
)

async_session = async_sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)

# Engine Síncrono (Celery / Scripts)
SYNC_DATABASE_URL = DATABASE_URL.replace("+asyncpg", "").replace("+aiosqlite", "")
sync_engine_kwargs = {"pool_pre_ping": True}
if SYNC_DATABASE_URL and "postgresql" in SYNC_DATABASE_URL:
    sync_engine_kwargs.update({
        "pool_size": 15,
        "max_overflow": 10,
        "pool_timeout": 30,
        "pool_recycle": 180,
    })
engine_sync = create_engine(SYNC_DATABASE_URL, **sync_engine_kwargs)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine_sync)

# Engine Async para Workers (Celery)
engine_worker = create_async_engine(DATABASE_URL, poolclass=NullPool, connect_args=connect_args)
async_session_worker = async_sessionmaker(engine_worker, class_=AsyncSession, expire_on_commit=False)

class Base(DeclarativeBase):
    pass

async def get_db():
    async with async_session() as session:
        yield session

async def run_pool_janitor():
    """Worker background que checa a saúde das conexões do banco e recicla conexões inativas."""
    try:
        if hasattr(engine, 'pool'):
            pool = engine.pool
            size = pool.size()
            checkedout = pool.checkedout()
            overflow = pool.overflow()
            logger.info(f"🔍 [JANITOR DB] Pool Status -> Size: {size}, CheckedOut: {checkedout}, Overflow: {overflow}")

            # Acionar reciclagem em 65% de uso OU se houver overflow ativo (conexões além do pool base)
            pressao_alta = checkedout >= (size * 0.65)
            overflow_ativo = overflow > 0
            if pressao_alta or overflow_ativo:
                logger.warning(f"⚠️ [JANITOR DB] Alta pressão no pool ({checkedout}/{size}, overflow={overflow}). Forçando reciclagem de conexões inativas...")
                await engine.dispose()
                logger.info("🧹 [JANITOR DB] Reciclagem executada com sucesso. Pool liberado!")
    except Exception as e:
        logger.error(f"❌ [JANITOR DB] Erro no zelador do pool de conexões: {e}")
