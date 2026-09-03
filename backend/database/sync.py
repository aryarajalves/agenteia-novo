import logging
from sqlalchemy import text, inspect
from database.connection import engine, engine_sync, Base
import models

logger = logging.getLogger(__name__)

async def create_database_if_not_exists(url: str):
    """Cria o banco de dados caso ele não exista."""
    try:
        from sqlalchemy.ext.asyncio import create_async_engine
        prefix, db_name = url.rsplit("/", 1)
        target_db_name = db_name
        
        for maintenance_db in ["postgres", "template1"]:
            try:
                default_db_url = f"{prefix}/{maintenance_db}"
                sys_engine = create_async_engine(default_db_url, isolation_level="AUTOCOMMIT")
                async with sys_engine.connect() as conn:
                    result = await conn.execute(text(f"SELECT 1 FROM pg_database WHERE datname = '{target_db_name}'"))
                    exists = result.scalar()
                    
                    if not exists:
                        logger.info(f"🛠️ Banco de dados '{target_db_name}' não encontrado. Criando...")
                        await conn.execute(text(f"CREATE DATABASE {target_db_name}"))
                        logger.info(f"✅ Banco de dados '{target_db_name}' criado!")
                    else:
                        logger.info(f"✨ Banco de dados '{target_db_name}' já existe.")
                await sys_engine.dispose()
                return 
            except Exception:
                continue
    except Exception as e:
        logger.error(f"❌ Erro ao verificar/criar banco: {e}")

async def sync_database_schema():
    """
    Sincroniza automaticamente o schema do banco com o models.py.
    Detecta colunas faltantes e as cria dinamicamente.
    """
    logger.info("🔍 Iniciando auto-sincronização de schema...")
    
    # 1. Habilitar a extensão pgvector em uma transação independente e comitada
    if "postgresql" in str(engine.url):
        try:
            async with engine.begin() as conn:
                await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        except Exception as e:
            logger.error(
                f"❌ FALHA CRÍTICA: Não foi possível criar a extensão 'vector' no PostgreSQL. "
                f"Verifique se o usuário tem permissão e se a imagem possui pgvector. Erro: {e}"
            )
            raise

    # 2. Garantir que as tabelas básicas existam (agora o banco já reconhece a extensão)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # 2. Inspecionar colunas reais vs modelos
    def sync_columns(connection):
        inspector = inspect(connection)
        
        # Iterar sobre todas as tabelas definidas no Base.metadata
        for table_name, table in Base.metadata.tables.items():
            logger.info(f"Checking table: {table_name}")
            # Pegar colunas que existem no banco real
            try:
                existing_columns = [c["name"] for c in inspector.get_columns(table_name)]
            except Exception as e:
                logger.error(f"❌ Erro ao inspecionar colunas de {table_name}: {e}")
                connection.execute(text("ROLLBACK")) # Tenta limpar o estado
                continue
            
            # Comparar com o que está no código (SQLAlchemy model)
            for column in table.columns:
                if column.name not in existing_columns:
                    logger.info(f"🆕 Coluna detectada: {table_name}.{column.name}")
                    
                    # Gerar o tipo SQL correto
                    col_type = column.type.compile(dialect=connection.dialect)
                    nullable = "NULL" if column.nullable else "NOT NULL"
                    default = ""
                    if column.default is not None and hasattr(column.default, "arg"):
                        # Simplificação para defaults comuns
                        if not callable(column.default.arg):
                            default = f" DEFAULT {repr(column.default.arg)}"

                    # Executar ALTER TABLE
                    # Para PostgreSQL, usamos IF NOT EXISTS para evitar erros de duplicidade
                    if "postgresql" in str(connection.engine.url):
                        sql = f"ALTER TABLE {table_name} ADD COLUMN IF NOT EXISTS {column.name} {col_type} {nullable}{default}"
                    else:
                        sql = f"ALTER TABLE {table_name} ADD COLUMN {column.name} {col_type} {nullable}{default}"

                    try:
                        # Usar um nested transaction (SAVEPOINT) se possível, ou apenas capturar o erro
                        # No SQLAlchemy run_sync, estamos em uma conexão. Se falhar, a transação da conexão é abortada no Postgres.
                        connection.execute(text(sql))
                        logger.info(f"✅ Coluna {column.name} adicionada com sucesso em {table_name}.")
                    except Exception as e:
                        if "already exists" in str(e).lower():
                            logger.info(f"ℹ️ Coluna {column.name} já existe em {table_name} (ignorado).")
                        else:
                            logger.error(f"❌ Falha ao adicionar coluna {column.name} em {table_name}: {e}")
                        
                        # IMPORTANTE: No PostgreSQL, se um comando falha, a transação é abortada.
                        # Precisamos emitir um ROLLBACK para poder continuar se estivermos em modo autocommit
                        # ou usar um SAVEPOINT. Como run_sync geralmente é gerido por um context manager externo,
                        # o ideal é que a lógica de detecção inicial (existing_columns) seja perfeita.


    # Rodar a inspeção (precisa ser em modo síncrono via run_sync)
    async with engine.begin() as conn:
        await conn.run_sync(sync_columns)

    logger.info("✅ Sincronização de schema concluída.")
