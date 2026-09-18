import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from api.main import app
from database import get_db
from models import WebhookConfigModel, GlobalContextVariableModel, UserMemoryModel


@pytest.mark.asyncio
async def test_get_lead_variables_endpoint(db_session: AsyncSession):
    # 1. Criar WebhookConfig
    wh = WebhookConfigModel(
        name="Webhook Teste Variáveis",
        token="webhook-vars-teste",
        leads_table="leads_test_vars",
        zapvoice_url="https://api.zapvoice.com",
        zapvoice_api_token="test_token"
    )
    db_session.add(wh)
    await db_session.commit()
    await db_session.refresh(wh)

    # 2. Criar a tabela de leads temporária
    await db_session.execute(text(f"""
        CREATE TABLE IF NOT EXISTS {wh.leads_table} (
            id SERIAL PRIMARY KEY,
            webhook_config_id INTEGER,
            telefone VARCHAR(50),
            contato_nome VARCHAR(255),
            labels VARCHAR(255),
            conversa_id VARCHAR(50),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """))

    # Inserir um lead
    await db_session.execute(text(f"""
        INSERT INTO {wh.leads_table} (webhook_config_id, telefone, contato_nome, labels, conversa_id)
        VALUES (:wid, :tel, :nome, :labels, :cid)
    """), {
        "wid": wh.id,
        "tel": "5585998259497",
        "nome": "Aryaraj Fernandes",
        "labels": "lead-qualificado",
        "cid": "conv_123"
    })
    await db_session.commit()

    # Obter o id do lead inserido
    res_lid = await db_session.execute(text(f"SELECT id FROM {wh.leads_table} WHERE telefone = '5585998259497'"))
    lead_id = res_lid.scalar()

    # 3. Criar variáveis globais
    var1 = GlobalContextVariableModel(
        key="nicho_mercado",
        type="string",
        description="Nicho de atuação do cliente",
        extraction_method="ai",
        extraction_prompt="Extraia o nicho de mercado"
    )
    var2 = GlobalContextVariableModel(
        key="faturamento_mensal",
        type="number",
        description="Faturamento mensal declarado",
        extraction_method="ai",
        extraction_prompt="Extraia o faturamento"
    )
    var3 = GlobalContextVariableModel(
        key="contact_name",
        type="string",
        description="Nome do contato",
        extraction_method="integration"
    )
    var4 = GlobalContextVariableModel(
        key="link_enviado",
        type="boolean",
        value="false",
        description="Indica se link foi enviado",
        extraction_method="ai"
    )
    db_session.add_all([var1, var2, var3, var4])
    await db_session.commit()

    # 4. Criar uma memória para var1 (nicho_mercado) associada ao telefone do lead
    mem = UserMemoryModel(
        session_id="5585998259497",
        key="nicho_mercado",
        value="Estética e Beleza",
        source_message="Eu trabalho com clínica de estética e remoção de tatuagem",
        confidence=0.98
    )
    db_session.add(mem)
    await db_session.commit()

    # 5. Chamar a rota GET /webhooks/{webhook_id}/leads/{lead_id}/variables
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get(f"/webhooks/{wh.id}/leads/{lead_id}/variables")

    app.dependency_overrides.clear()

    assert response.status_code == 200
    data = response.json()

    assert data["lead"]["id"] == lead_id
    assert data["lead"]["contato_nome"] == "Aryaraj Fernandes"
    assert data["lead"]["telefone"] == "5585998259497"

    assert data["total_variables"] >= 4
    assert data["total_captured"] >= 3  # nicho_mercado + contact_name + link_enviado
    assert data["total_pending"] >= 1   # faturamento_mensal

    # Verificar variáveis individuais
    var_map = {v["key"]: v for v in data["variables"]}
    
    # nicho_mercado deve estar capturado da conversa
    assert var_map["nicho_mercado"]["has_value"] is True
    assert var_map["nicho_mercado"]["value"] == "Estética e Beleza"
    assert var_map["nicho_mercado"]["value_origin"] == "conversation_extracted"
    assert var_map["nicho_mercado"]["is_extracted_from_conversation"] is True
    assert var_map["nicho_mercado"]["is_default_value"] is False
    assert "clínica de estética" in (var_map["nicho_mercado"]["source_message"] or "")

    # contact_name deve vir do perfil
    assert var_map["contact_name"]["has_value"] is True
    assert var_map["contact_name"]["value"] == "Aryaraj Fernandes"
    assert var_map["contact_name"]["value_origin"] == "contact_profile"

    # link_enviado deve vir como valor padrão inicial
    assert var_map["link_enviado"]["has_value"] is True
    assert var_map["link_enviado"]["value"] == "false"
    assert var_map["link_enviado"]["value_origin"] == "initial_default"
    assert var_map["link_enviado"]["is_default_value"] is True
    assert var_map["link_enviado"]["is_extracted_from_conversation"] is False

    # faturamento_mensal deve estar pendente
    assert var_map["faturamento_mensal"]["has_value"] is False
    assert var_map["faturamento_mensal"]["value"] is None
    assert var_map["faturamento_mensal"]["value_origin"] == "pending"
