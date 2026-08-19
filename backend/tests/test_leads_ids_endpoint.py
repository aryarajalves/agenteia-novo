import pytest
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from models import WebhookConfigModel

@pytest.mark.asyncio
async def test_get_webhook_lead_ids_endpoint(client, db_session: AsyncSession):
    # 1. Setup: Criar um webhook e leads de teste
    config = WebhookConfigModel(id=991, name="Test Webhook IDs", token="tk_ids_test", leads_table="webhook_leads_991")
    db_session.add(config)
    await db_session.commit()
    webhook_id = config.id
    
    table_name = "webhook_leads_991"
    is_sqlite = db_session.bind.dialect.name == "sqlite"
    id_col = "id INTEGER PRIMARY KEY AUTOINCREMENT" if is_sqlite else "id SERIAL PRIMARY KEY"
    
    bool_default = "1" if is_sqlite else "TRUE"
    await db_session.execute(text(f"""
        CREATE TABLE IF NOT EXISTS {table_name} (
            {id_col},
            webhook_config_id INTEGER,
            telefone VARCHAR,
            contato_nome VARCHAR,
            pode_enviar_mensagem BOOLEAN DEFAULT {bool_default},
            ultima_mensagem_em TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """))
    await db_session.commit()

    # Inserir leads de teste
    val_true = 1 if is_sqlite else True
    val_false = 0 if is_sqlite else False
    await db_session.execute(text(f"""
        INSERT INTO {table_name} (webhook_config_id, telefone, contato_nome, pode_enviar_mensagem) 
        VALUES (991, '5511999990001', 'Ana Silva', :v1)
    """), {"v1": val_true})
    await db_session.execute(text(f"""
        INSERT INTO {table_name} (webhook_config_id, telefone, contato_nome, pode_enviar_mensagem) 
        VALUES (991, '5511999990002', 'Bruno Souza', :v2)
    """), {"v2": val_true})
    await db_session.execute(text(f"""
        INSERT INTO {table_name} (webhook_config_id, telefone, contato_nome, pode_enviar_mensagem) 
        VALUES (991, '5511999990003', 'Carlos Lima', :v3)
    """), {"v3": val_false})
    await db_session.commit()

    # 2. Testar buscar todos os IDs sem filtro
    response = await client.get(f"/webhooks/{webhook_id}/leads/ids")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 3
    assert len(data["ids"]) == 3

    # 3. Testar com filtro de busca (q)
    response_q = await client.get(f"/webhooks/{webhook_id}/leads/ids?q=Bruno")
    assert response_q.status_code == 200
    data_q = response_q.json()
    assert data_q["total"] == 1
    
    # 4. Testar com filtro pode_enviar=false
    response_pe = await client.get(f"/webhooks/{webhook_id}/leads/ids?pode_enviar=false")
    assert response_pe.status_code == 200
    data_pe = response_pe.json()
    assert data_pe["total"] == 1
