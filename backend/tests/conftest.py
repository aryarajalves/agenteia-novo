import pytest
import asyncio
from typing import AsyncGenerator
from httpx import AsyncClient, ASGITransport
import os
import sys
import logging
from dotenv import load_dotenv

logger = logging.getLogger(__name__)
# Carrega as variáveis do .env
load_dotenv(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '.env')))
load_dotenv(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '.env')))

os.environ["TESTING"] = "true"

# Adiciona o diretório backend ao path para conseguir importar os módulos
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Capturar e interceptar a DATABASE_URL para isolamento de testes
db_url = os.getenv("DATABASE_URL")
if not db_url or "banco-agente" in db_url or ":5432" in db_url:
    db_url = "postgresql+asyncpg://postgres:postgres@localhost:5433/ai_agent_db"

# Redireciona de forma limpa para test_ai_agent_db para proteger o banco de desenvolvimento
if "/ai_agent_db" in db_url:
    db_url = db_url.replace("/ai_agent_db", "/test_ai_agent_db")

os.environ["DATABASE_URL"] = db_url
DATABASE_URL = db_url

from main import app
from database import get_db, Base
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import text

@pytest.fixture(scope="session")
def event_loop():
    """Cria um loop de eventos de sessão único para evitar erros de loop fechado."""
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    yield loop
    # Não fechamos agressivamente para evitar warning se o loop ainda for referenciado internamente no teardown da sessão

@pytest.fixture
async def db_engine():
    # Cria o banco de dados test_ai_agent_db dinamicamente conectando no banco padrão 'postgres'
    if "postgresql" in DATABASE_URL:
        admin_url = DATABASE_URL.rsplit('/', 1)[0] + '/postgres'
        admin_engine = create_async_engine(admin_url, isolation_level="AUTOCOMMIT")
        async with admin_engine.connect() as conn:
            try:
                result = await conn.execute(text("SELECT 1 FROM pg_database WHERE datname='test_ai_agent_db'"))
                if not result.scalar():
                    await conn.execute(text("CREATE DATABASE test_ai_agent_db"))
                    logger.info("✨ Banco de dados de testes 'test_ai_agent_db' criado com sucesso.")
            except Exception as e:
                logger.warning(f"Erro ao criar banco de testes 'test_ai_agent_db': {e}")
        await admin_engine.dispose()

    from database import init_db
    await init_db()
    
    test_engine = create_async_engine(DATABASE_URL)
    async with test_engine.begin() as conn:
        # Ativar a extensão pgvector antes de tentar criar as tabelas
        if "postgresql" in DATABASE_URL:
            await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield test_engine
    await test_engine.dispose()

@pytest.fixture
async def db_session(db_engine) -> AsyncGenerator:
    test_session_maker = async_sessionmaker(
        db_engine, class_=AsyncSession, expire_on_commit=False
    )
    async with test_session_maker() as session:
        # Limpar todos os registros de todas as tabelas públicas na base de testes isolada
        try:
            res = await session.execute(text("SELECT tablename FROM pg_tables WHERE schemaname = 'public'"))
            tables = [row[0] for row in res.fetchall() if row[0] != "spatial_ref_sys"]
            if tables:
                await session.execute(text(f"TRUNCATE TABLE {', '.join(tables)} CASCADE"))
                await session.commit()
        except Exception as e:
            logger.warning(f"Erro ao truncar tabelas públicas: {e}")
            await session.rollback()
        
        yield session
        
        # Limpeza agressiva pós-teste na base isolada
        await session.rollback()
        try:
            res = await session.execute(text("SELECT tablename FROM pg_tables WHERE schemaname = 'public'"))
            tables = [row[0] for row in res.fetchall() if row[0] != "spatial_ref_sys"]
            if tables:
                await session.execute(text(f"TRUNCATE TABLE {', '.join(tables)} CASCADE"))
                await session.commit()
        except Exception as e:
            logger.warning(f"Erro ao truncar tabelas pós-teste: {e}")
            await session.rollback()

@pytest.fixture
async def client(db_session) -> AsyncGenerator:
    # Sobrescreve a dependência get_db do FastAPI
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    
    # Adicionar API Key mockada se necessário para os testes
    headers = {"X-API-Key": os.getenv("AGENT_API_KEY", "test-api-key")}
    
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test", headers=headers) as ac:
        yield ac
    
    app.dependency_overrides.clear()
