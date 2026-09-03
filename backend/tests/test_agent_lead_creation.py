import pytest
import os
import json
from datetime import datetime
from sqlalchemy import text
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from webhooks.service import ensure_leads_table, upsert_lead
from models import WebhookConfigModel

@pytest.fixture
async def admin_headers(client: AsyncClient):
    """Obtém os headers de autenticação do admin."""
    admin_email = os.getenv("ADMIN_EMAIL", "aryarajmarketing@gmail.com")
    admin_password = os.getenv("ADMIN_PASSWORD", "123456")
    login_res = await client.post("/login", json={"email": admin_email, "password": admin_password})
    token = login_res.json()["token"]
    return {"Authorization": f"Bearer {token}"}

@pytest.mark.asyncio
async def test_agent_lead_creation_and_listing(client: AsyncClient, admin_headers, db_session: AsyncSession):
    """
    Testa se um lead inexistente é criado automaticamente quando uma mensagem do agente 
    é gravada (disparo ativo/template), e se a listagem lida com a data nula de forma íntegra.
    """
    
    # 1. Garantir tabela de leads e criar webhook de teste
    await ensure_leads_table("leads")
    
    token = "test_agent_creation_token"
    leads_table = "leads"
    
    config = WebhookConfigModel(
        name="Webhook Teste Criacao Agente",
        token=token,
        zapvoice_url="https://chat.test-creation.com",
        zapvoice_api_token="test_api_token_cw",
        leads_table=leads_table
    )
    db_session.add(config)
    await db_session.commit()
    await db_session.refresh(config)

    # Telefone de teste único
    tel_teste = "5548998096228"

    # Limpar qualquer lead antigo
    await db_session.execute(text(f"DELETE FROM {leads_table} WHERE telefone = :tel"), {"tel": tel_teste})
    await db_session.commit()

    # 2. Simular disparo ativo do Agente (dono='agente') para lead INEXISTENTE
    data_disparo = {
        "conta_id": "1",
        "inbox_id": "10",
        "inbox_nome": "WhatsApp Criacao",
        "conversa_id": "1346",
        "mensagem_id": "msg_999",
        "contato_id": "888",
        "telefone": tel_teste,
        "labels": json.dumps(["24-horas", "carrinho-abandonado"]),
        "contato_nome": "Ana Julia Vieira",
        "mensagem": "Oieee Ana Julia Vieira, tudo bem? Você tem alguma dúvida?",
        "message_type": "text",
        "dono": "agente"
    }

    # Chamar o upsert_lead. Como ele não existe e dono='agente', ele deve ser criado!
    await upsert_lead(leads_table, data_disparo, config.id)
    
    # 3. Validar se o lead foi de fato criado no banco
    res_lead = await db_session.execute(text(f"SELECT * FROM {leads_table} WHERE telefone = :tel"), {"tel": tel_teste})
    lead_row = res_lead.fetchone()
    
    assert lead_row is not None, "O lead deveria ter sido criado mesmo a primeira mensagem sendo do agente"
    
    # Mapear colunas para validação de forma robusta via SQLAlchemy mapping
    lead_dict = dict(lead_row._mapping)
    
    assert lead_dict["contato_nome"] == "Ana Julia Vieira"
    assert lead_dict["ultima_resposta_agente"] == "Oieee Ana Julia Vieira, tudo bem? Você tem alguma dúvida?"
    assert lead_dict["ultima_resposta_agente_em"] is not None
    assert lead_dict["mensagem"] is None or lead_dict["mensagem"] == ""  # Nunca enviou mensagem
    assert lead_dict["ultima_mensagem_em"] is None, "ultima_mensagem_em deve ser nula pois o cliente não respondeu"

    # 4. Validar se o endpoint do backend lista o lead corretamente com a data nula e calcula janela_24h_aberta=False
    # Rota: /webhooks/{webhook_id}/leads
    response = await client.get(f"/webhooks/{config.id}/leads", headers=admin_headers)
    assert response.status_code == 200
    
    list_data = response.json()
    assert "items" in list_data or "leads" in list_data
    items = list_data.get("items") or list_data.get("leads", [])
    
    # Achar o lead da Ana Júlia
    ana_lead = next((l for l in items if l["telefone"] == tel_teste), None)
    assert ana_lead is not None, "O lead criado pelo disparo ativo do agente deveria constar na listagem"
    
    assert ana_lead["janela_24h_aberta"] is False, "Como ultima_mensagem_em é NULL, a janela 24h deve constar como fechada (False)"

    # 5. Validar os filtros de janela_aberta (True vs False) na API
    # Filtro: janela_aberta=true
    resp_aberta = await client.get(f"/webhooks/{config.id}/leads?janela_aberta=true", headers=admin_headers)
    assert resp_aberta.status_code == 200
    items_aberta = resp_aberta.json().get("items") or resp_aberta.json().get("leads", [])
    ana_aberta = next((l for l in items_aberta if l["telefone"] == tel_teste), None)
    assert ana_aberta is None, "O lead com janela fechada não deveria aparecer no filtro de janela aberta"

    # Filtro: janela_aberta=false
    resp_fechada = await client.get(f"/webhooks/{config.id}/leads?janela_aberta=false", headers=admin_headers)
    assert resp_fechada.status_code == 200
    items_fechada = resp_fechada.json().get("items") or resp_fechada.json().get("leads", [])
    ana_fechada = next((l for l in items_fechada if l["telefone"] == tel_teste), None)
    assert ana_fechada is not None, "O lead com janela fechada (NULL) deve aparecer no filtro de janela fechada"

    # 6. Limpeza pós-teste
    await db_session.execute(text(f"DELETE FROM {leads_table} WHERE telefone = :tel"), {"tel": tel_teste})
    await db_session.execute(text("DELETE FROM webhook_configs WHERE id = :id"), {"id": config.id})
    await db_session.commit()
