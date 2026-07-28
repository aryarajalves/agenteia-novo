import pytest
from webhooks.service import ensure_leads_table
from database.connection import engine_sync
from sqlalchemy import text
from webhooks.router import simulate_webhook_load, SimulateLoadRequest, WebhookConfigModel

@pytest.mark.asyncio
async def test_simulate_webhook_load_endpoint(db_session):
    """Valida se o endpoint de simulação de carga cria contatos fictícios em lote e retorna métricas corretas sem erros."""
    table_name = "test_leads_load_sim"
    await ensure_leads_table(table_name)

    from models import AgentConfigModel
    agent = AgentConfigModel(
        name="Agente Teste Carga",
        model="gpt-4o-mini",
        system_prompt="Você é um assistente de testes."
    )
    db_session.add(agent)
    await db_session.commit()
    await db_session.refresh(agent)

    # 1. Criar WebhookConfig fictício no banco
    config = WebhookConfigModel(
        name="Webhook Teste Carga",
        token="test_load_token_123",
        leads_table=table_name,
        is_active=True,
        agent_id=agent.id
    )
    db_session.add(config)
    await db_session.commit()
    await db_session.refresh(config)

    # 2. Disparar simulação de carga para 15 contatos
    payload = SimulateLoadRequest(
        contact_count=15,
        sample_message="Teste de estresse em escala",
        concurrency_rate=50
    )

    response = await simulate_webhook_load(config.id, payload, db_session)

    assert response["ok"] is True
    assert response["total_requested"] == 15
    assert response["contacts_processed"] == 15
    assert response["errors_count"] == 0
    assert response["throughput_per_sec"] > 0
    assert response["elapsed_ms"] >= 0

    # 3. Verificar se os 15 contatos fictícios foram inseridos na tabela de leads
    with engine_sync.connect() as conn:
        res = conn.execute(text(f"SELECT COUNT(*) FROM {table_name}")).fetchone()
        assert res[0] == 15

    # Limpeza
    with engine_sync.begin() as conn:
        conn.execute(text(f"DROP TABLE IF EXISTS {table_name}"))
