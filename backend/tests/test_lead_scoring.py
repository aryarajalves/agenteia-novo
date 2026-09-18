import pytest
import json
import os
from unittest.mock import AsyncMock, patch, MagicMock
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from lead_scoring_service import calculate_lead_score
from models import AgentConfigModel, WebhookConfigModel

class MockChatCompletionChoice:
    def __init__(self, content):
        self.message = MagicMock()
        self.message.content = content

class MockChatCompletionResponse:
    def __init__(self, content):
        self.choices = [MockChatCompletionChoice(content)]

@pytest.mark.asyncio
async def test_calculate_lead_score_openai_integration(db_session: AsyncSession):
    # 1. Criar um agente no banco de testes
    agent = AgentConfigModel(
        name="Agente Teste Score",
        system_prompt="Você é um assistente de vendas.",
        is_active=True,
        qualification_criteria="Pontue de 0 a 13. Dê 13 para quem tem orçamento maior que 5k. Mapeie como Quente 🔥."
    )
    db_session.add(agent)
    await db_session.commit()
    await db_session.refresh(agent)

    # 2. Respostas do lead
    respostas = [
        {"question": "Qual seu orçamento?", "answer": "10000 reais"},
        {"question": "Qual seu interesse?", "answer": "Mentoria premium"}
    ]

    # Mock da chamada do AsyncOpenAI
    mock_openai_response_content = json.dumps({
        "lead_score": 13,
        "lead_classification": "Quente 🔥",
        "lead_justification": "O lead tem orçamento de 10k, superando o critério mínimo de 5k."
    })

    with patch("lead_scoring_service.AsyncOpenAI") as mock_openai_class:
        mock_client = MagicMock()
        mock_openai_class.return_value = mock_client
        mock_client.chat.completions.create = AsyncMock(
            return_value=MockChatCompletionResponse(mock_openai_response_content)
        )

        # Rodar cálculo
        result = await calculate_lead_score(db_session, agent.id, respostas)

        # Asserts
        assert result["lead_score"] == 13
        assert "Quente" in result["lead_classification"]
        assert "orçamento de 10k" in result["lead_justification"]

@pytest.mark.asyncio
async def test_calculate_lead_score_without_criteria_returns_indefinida(db_session: AsyncSession):
    # Agente sem critérios definidos
    agent = AgentConfigModel(
        name="Agente Sem Critérios",
        system_prompt="Você é um assistente.",
        is_active=True,
        qualification_criteria=None
    )
    db_session.add(agent)
    await db_session.commit()
    await db_session.refresh(agent)

    respostas = [{"question": "Qual seu email?", "answer": "teste@exemplo.com"}]
    result = await calculate_lead_score(db_session, agent.id, respostas)

    assert result["lead_score"] is None
    assert result["lead_classification"] == "Indefinida"
    assert "não definidos" in result["lead_justification"]

@pytest.mark.asyncio
async def test_list_qualified_leads_api(client: AsyncClient, db_session: AsyncSession):
    # 1. Configurar agente de teste
    agent = AgentConfigModel(
        name="Agente Vendas Teste",
        system_prompt="Olá",
        is_active=True
    )
    db_session.add(agent)
    await db_session.commit()
    await db_session.refresh(agent)

    # 2. Configurar Webhook e Tabela de leads de teste
    webhook = WebhookConfigModel(
        name="Webhook Teste Leads",
        token="teste-token-leads",
        leads_table="leads_test_scoring",
        is_active=True,
        agent_id=agent.id,
        zapvoice_url="https://chatwoot-teste.com"
    )
    db_session.add(webhook)
    await db_session.commit()
    await db_session.refresh(webhook)

    # Criar a tabela de leads de teste fisicamente
    await db_session.execute(text("""
        CREATE TABLE IF NOT EXISTS leads_test_scoring (
            id SERIAL PRIMARY KEY,
            webhook_config_id INTEGER,
            conta_id INTEGER,
            inbox_id INTEGER,
            inbox_nome VARCHAR(255),
            conversa_id INTEGER,
            contato_id INTEGER,
            telefone VARCHAR(50),
            labels TEXT,
            contato_nome VARCHAR(255),
            respostas_qualificacao TEXT,
            lead_score INTEGER,
            lead_classification VARCHAR(50),
            lead_justification TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """))
    await db_session.commit()

    # 3. Inserir leads qualificados na tabela
    respostas_json = json.dumps([
        {"question": "Qual sua profissão?", "answer": "Empresário"},
        {"question": "Orçamento?", "answer": "7000"}
    ])
    
    await db_session.execute(text("""
        INSERT INTO leads_test_scoring (
            webhook_config_id, conta_id, inbox_id, inbox_nome, conversa_id, contato_id,
            telefone, contato_nome, respostas_qualificacao, lead_score, lead_classification, lead_justification
        ) VALUES (
            :wh_id, 1, 2, 'Inbox Teste', 101, 202,
            '+5581999998888', 'Aryar Teste', :resp, 11, 'Quente 🔥', 'Lead muito engajado e com boa renda'
        )
    """), {
        "wh_id": webhook.id,
        "resp": respostas_json
    })
    await db_session.commit()

    # 4. Fazer chamada à API
    response = await client.get("/leads/qualified")
    
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    
    # Validar campos retornados e decodificação
    lead_retornado = next(l for l in data if l["contato_nome"] == "Aryar Teste")
    assert lead_retornado["lead_score"] == 11
    assert lead_retornado["lead_classification"] == "Quente 🔥"
    assert lead_retornado["respostas_decoded"][0]["answer"] == "Empresário"
    assert lead_retornado["chatwoot_conversation_url"] == "https://web.whatsapp.com/send?phone=5581999998888"

    # Cleanup tabela temporária
    await db_session.execute(text("DROP TABLE IF EXISTS leads_test_scoring"))
    await db_session.commit()

@pytest.mark.asyncio
async def test_recalculate_lead_score_api(client: AsyncClient, db_session: AsyncSession):
    # 1. Configurar agente, webhook e tabela
    agent = AgentConfigModel(
        name="Agente Teste Recalc",
        system_prompt="Olá",
        is_active=True,
        qualification_criteria="Cálculo de recalculo"
    )
    db_session.add(agent)
    await db_session.commit()
    await db_session.refresh(agent)

    webhook = WebhookConfigModel(
        name="Webhook Teste Recalc",
        token="teste-token-recalc",
        leads_table="leads_recalc_test",
        is_active=True,
        agent_id=agent.id
    )
    db_session.add(webhook)
    await db_session.commit()
    await db_session.refresh(webhook)

    await db_session.execute(text("""
        CREATE TABLE IF NOT EXISTS leads_recalc_test (
            id SERIAL PRIMARY KEY,
            webhook_config_id INTEGER,
            conta_id INTEGER,
            inbox_id INTEGER,
            inbox_nome VARCHAR(255),
            conversa_id INTEGER,
            contato_id INTEGER,
            telefone VARCHAR(50),
            labels TEXT,
            contato_nome VARCHAR(255),
            respostas_qualificacao TEXT,
            lead_score INTEGER,
            lead_classification VARCHAR(50),
            lead_justification TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """))
    await db_session.commit()

    # Inserir lead com score desatualizado
    respostas_json = json.dumps([{"question": "Quer mentoria?", "answer": "Sim"}])
    await db_session.execute(text("""
        INSERT INTO leads_recalc_test (
            id, webhook_config_id, conta_id, inbox_id, conversa_id, contato_id,
            telefone, contato_nome, respostas_qualificacao, lead_score, lead_classification, lead_justification
        ) VALUES (
            55, :wh_id, 1, 2, 101, 202,
            '+5581999998888', 'Lead Recalc', :resp, 1, 'Frio ❄️', 'Antigo'
        )
    """), {
        "wh_id": webhook.id,
        "resp": respostas_json
    })
    await db_session.commit()

    # 2. Mockar o serviço de scoring para retornar novos valores
    mock_new_score = {
        "lead_score": 12,
        "lead_classification": "Quente 🔥",
        "lead_justification": "Justificativa recalculada com sucesso"
    }

    with patch("api.routers.leads.calculate_lead_score", new_callable=AsyncMock) as mock_calculate:
        mock_calculate.return_value = mock_new_score

        # 3. Disparar API de recálculo
        response = await client.post("/leads/leads_recalc_test/55/recalculate-score")

        assert response.status_code == 200
        result = response.json()
        assert result["success"] is True
        assert result["lead_score"] == 12
        assert result["lead_classification"] == "Quente 🔥"
        
        # Validar no banco se atualizou
        db_res = await db_session.execute(text("SELECT lead_score, lead_classification, lead_justification FROM leads_recalc_test WHERE id = 55"))
        updated_row = db_res.fetchone()
        assert updated_row[0] == 12
        assert updated_row[1] == "Quente 🔥"
        assert updated_row[2] == "Justificativa recalculada com sucesso"

    # Cleanup tabela temporária
    await db_session.execute(text("DROP TABLE IF EXISTS leads_recalc_test"))
    await db_session.commit()

@pytest.mark.asyncio
async def test_delete_qualified_lead_api(client: AsyncClient, db_session: AsyncSession):
    # 1. Configurar webhook e tabela de leads
    webhook = WebhookConfigModel(
        name="Webhook Teste Delete",
        token="teste-token-delete",
        leads_table="leads_delete_test",
        is_active=True,
        zapvoice_url="https://chatwoot-teste.com"
    )
    db_session.add(webhook)
    await db_session.commit()
    await db_session.refresh(webhook)

    await db_session.execute(text("""
        CREATE TABLE IF NOT EXISTS leads_delete_test (
            id SERIAL PRIMARY KEY,
            webhook_config_id INTEGER,
            qualified_by_agent_id INTEGER,
            conta_id INTEGER,
            inbox_id INTEGER,
            inbox_nome VARCHAR(255),
            conversa_id INTEGER,
            contato_id INTEGER,
            telefone VARCHAR(50),
            labels TEXT,
            contato_nome VARCHAR(255),
            respostas_qualificacao TEXT,
            lead_score INTEGER,
            lead_classification VARCHAR(50),
            lead_justification TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """))
    await db_session.commit()

    # Inserir lead com qualificações
    await db_session.execute(text("""
        INSERT INTO leads_delete_test (
            id, webhook_config_id, qualified_by_agent_id, conta_id, inbox_id, conversa_id, contato_id,
            telefone, contato_nome, respostas_qualificacao, lead_score, lead_classification, lead_justification, labels
        ) VALUES (
            77, :wh_id, 1, 1, 2, 101, 202,
            '+5581999998888', 'Lead Delete', '{"resp": "ok"}', 10, 'Quente 🔥', 'Justificativa antiga', 'tag1,qualificado,tag2'
        )
    """), {"wh_id": webhook.id})
    await db_session.commit()

    # 2. Chamar endpoint DELETE
    response = await client.delete("/leads/leads_delete_test/77")

    assert response.status_code == 200
    res_data = response.json()
    assert res_data["success"] is True

    # 3. Validar no banco de dados se os dados de qualificação foram removidos (parcialmente) e o label foi atualizado
    db_res = await db_session.execute(text("""
        SELECT respostas_qualificacao, lead_score, lead_classification, lead_justification, qualified_by_agent_id, labels
        FROM leads_delete_test WHERE id = 77
    """))
    row = db_res.fetchone()
    assert row[0] is None
    assert row[1] is None
    assert row[2] is None
    assert row[3] is None
    assert row[4] is None
    
    # O "qualificado" deve ter sido removido, sobrando "tag1,tag2"
    labels_list = [l.strip() for l in row[5].split(",") if l.strip()]
    assert "qualificado" not in labels_list
    assert "tag1" in labels_list
    assert "tag2" in labels_list

    # Cleanup
    await db_session.execute(text("DROP TABLE IF EXISTS leads_delete_test"))
    await db_session.commit()

