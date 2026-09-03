import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from httpx import AsyncClient, ASGITransport
from api.main import app
from api.deps import get_db, verify_api_key


@pytest.mark.asyncio
async def test_get_crm_pipeline_endpoint():
    """Valida o endpoint GET /leads/crm que consolida os leads no Kanban."""
    async def override_get_db():
        mock_session = MagicMock()
        mock_session.execute = AsyncMock()
        mock_session.begin_nested = MagicMock()
        
        # Mocks para as queries do endpoint
        # 1. tables query
        mock_tables = MagicMock()
        mock_tables.fetchall.return_value = [("leads",)]
        
        # 2. webhooks query
        mock_wh = MagicMock()
        mock_wh.fetchall.return_value = [(1, "https://api.zapvoice.com", 1, "aluno", "cancelar_robo", "humano", "[]", 24, "hours")]
        
        # 3. agents query
        mock_agents = MagicMock()
        mock_agents.fetchall.return_value = [(1, "Agente Vendas")]
        
        # 4. sales query
        mock_sales = MagicMock()
        mock_sales.fetchall.return_value = [("5511999999999", "lead@email.com", 197.0, "Kiwify")]
        
        # 5. leads rows
        mock_leads = MagicMock()
        mock_leads.fetchall.return_value = [
            (
                1, 1, "client_1", "1", "WhatsApp", "conv_101", "ct_1",
                "5511999999999", '["aluno"]', "Maria Silva", "Olá, comprei o curso",
                -1, '[{"pergunta": "Qual seu objetivo?", "resposta": "Aprender"}]',
                95, "Quente 🔥", "Comprou o curso", None, "Bem-vinda!", None, None, 1
            ),
            (
                2, 1, "client_1", "1", "WhatsApp", "conv_102", "ct_2",
                "5511988888888", '[]', "João Santos", None,
                0, None, None, None, None, None, None, None, None, 1
            )
        ]
        
        mock_session.execute.side_effect = [
            mock_tables,
            mock_wh,
            mock_agents,
            mock_sales,
            mock_leads
        ]
        yield mock_session

    async def override_verify_api_key():
        return None

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[verify_api_key] = override_verify_api_key

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get("/leads/crm")
        assert response.status_code == 200
        data = response.json()
        assert "stats" in data
        assert "columns" in data
        assert "template_enviado" in data["columns"]
        assert "comprou" in data["columns"]
        assert data["stats"]["total_leads"] >= 2
        assert data["stats"]["total_comprou"] >= 1

    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_update_lead_crm_stage_endpoint():
    """Valida a atualização manual de estágio no CRM Kanban."""
    async def override_get_db():
        mock_session = MagicMock()
        mock_session.execute = AsyncMock()
        mock_session.commit = AsyncMock()
        
        # 1. Lead row
        mock_lead = MagicMock()
        mock_lead.fetchone.return_value = (1, '["lead_quente"]')
        
        # 2. Webhook info
        mock_wh = MagicMock()
        mock_wh.fetchone.return_value = ("aluno", "cancelar_robo", "humano")
        
        # 3. Update query
        mock_update = MagicMock()
        
        mock_session.execute.side_effect = [
            mock_lead,
            mock_wh,
            mock_update
        ]
        yield mock_session

    async def override_verify_api_key():
        return None

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[verify_api_key] = override_verify_api_key

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.put(
            "/leads/leads/1/crm-stage",
            json={"stage": "comprou"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") is True
        assert data.get("new_stage") == "comprou"

    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_delete_crm_lead_endpoint():
    """Valida a exclusão permanente de um lead do CRM e contatos capturados."""
    async def override_get_db():
        mock_session = MagicMock()
        mock_session.execute = AsyncMock()
        mock_session.commit = AsyncMock()
        
        # 1. find lead
        mock_lead = MagicMock()
        mock_lead.fetchone.return_value = (101, 1, "5511999999999")
        
        mock_session.execute.side_effect = [
            mock_lead
        ]
        yield mock_session

    async def override_verify_api_key():
        return None

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[verify_api_key] = override_verify_api_key

    with patch("webhooks.service.delete_contact_data", new_callable=AsyncMock) as mock_delete_data:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            response = await ac.delete("/leads/leads/101/full-delete")
            assert response.status_code == 200
            data = response.json()
            assert data.get("success") is True
            assert data.get("lead_id") == 101
            assert mock_delete_data.called is True

    app.dependency_overrides.clear()

