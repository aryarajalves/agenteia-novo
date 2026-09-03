import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from fastapi.testclient import TestClient
from api.main import app

client = TestClient(app)

def test_mass_dispatch_validation_empty_leads():
    """Valida que o endpoint de disparo em massa rejeita requisições sem contatos."""
    response = client.post("/leads/crm/mass-dispatch", json={
        "leads": [],
        "template_name": "convite_mentoria"
    }, headers={"X-API-Key": "test"})

    assert response.status_code in (400, 401, 403, 422)


def test_mass_dispatch_validation_missing_template():
    """Valida que o endpoint de disparo em massa exige o template_name."""
    response = client.post("/leads/crm/mass-dispatch", json={
        "leads": [{"telefone": "5585996123586", "contato_nome": "Lead Teste"}],
        "template_name": ""
    }, headers={"X-API-Key": "test"})

    assert response.status_code in (400, 401, 403, 422)


@pytest.mark.asyncio
async def test_execute_crm_mass_dispatch_logic():
    """Testa a lógica da função execute_crm_mass_dispatch diretamente."""
    from api.routers.leads import execute_crm_mass_dispatch, CRMMassDispatchPayload, MassDispatchLeadItem

    mock_db = AsyncMock()
    mock_db_res = MagicMock()
    mock_db_res.fetchall.return_value = [
        (1, "http://zapvoice.local", "token123", "client_456")
    ]
    mock_db.execute.return_value = mock_db_res

    payload = CRMMassDispatchPayload(
        leads=[
            MassDispatchLeadItem(
                id=1,
                leads_table="leads",
                telefone="5585996123586",
                contato_nome="Aluno Teste",
                webhook_config_id=1
            )
        ],
        template_name="mentoria_upsell_vip",
        template_language="pt_BR"
    )

    with patch("api.routers.leads.send_zapvoice_whatsapp_template", new=AsyncMock(return_value=(True, {"status": "sent"}))) as mock_send:
        result = await execute_crm_mass_dispatch(payload, db=mock_db, _=None)
        
        assert result["success"] is True
        assert result["template_name"] == "mentoria_upsell_vip"
        assert result["total_requested"] == 1
        assert result["sent_count"] == 1
        assert result["failed_count"] == 0
        mock_send.assert_called_once()
