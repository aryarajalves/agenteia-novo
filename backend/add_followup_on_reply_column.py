import asyncio
import sys
import os
from sqlalchemy import text
from database import engine

async def migrate():
    print("🚀 Iniciando migração para adicionar 'followup_on_reply' na tabela 'webhook_configs'...")
    async with engine.begin() as conn:
        try:
            await conn.execute(text("ALTER TABLE webhook_configs ADD COLUMN IF NOT EXISTS followup_on_reply VARCHAR DEFAULT 'stop';"))
            print("✅ Coluna 'followup_on_reply' adicionada à tabela 'webhook_configs' com sucesso!")
        except Exception as e:
            print(f"⚠️ Erro durante a migração: {e}")
            sys.exit(1)

if __name__ == "__main__":
    asyncio.run(migrate())

