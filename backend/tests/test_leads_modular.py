import pytest
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi.testclient import TestClient

from api.routers.leads import (
    router as leads_router,
    to_brasilia_time,
    assign_qualification_funnel,
    assign_followup_funnel,
    execute_crm_mass_dispatch,
    CRMMassDispatchPayload,
    MassDispatchLeadItem,
)
from api.schemas import AssignFunnelRequest, AssignFollowupRequest


def test_to_brasilia_time():
    """Testa o utilitário de conversão de fuso horário para Brasília (UTC-3)."""
    assert to_brasilia_time(None) is None

    # UTC 12:00 -> Brasília 09:00
    utc_dt = datetime(2026, 9, 18, 12, 0, 0, tzinfo=timezone.utc)
    br_dt = to_brasilia_time(utc_dt)
    assert br_dt.hour == 9
    assert br_dt.utcoffset().total_seconds() == -3 * 3600

    # Naive datetime tratado como UTC
    naive_dt = datetime(2026, 9, 18, 15, 30, 0)
    br_dt2 = to_brasilia_time(naive_dt)
    assert br_dt2.hour == 12
    assert br_dt2.minute == 30


def test_leads_router_contains_all_routes():
    """Valida se todas as rotas esperadas estão registradas no leads_router modular."""
    def _extract_paths(r):
        paths = set()
        for item in r.routes:
            if hasattr(item, "path"):
                paths.add(item.path)
            elif hasattr(item, "original_router") and hasattr(item.original_router, "routes"):
                for sub in item.original_router.routes:
                    if hasattr(sub, "path"):
                        paths.add(sub.path)
        return paths

    routes = _extract_paths(leads_router)
    assert "/leads/qualified" in routes
    assert "/leads/{table_name}/{lead_id}/recalculate-score" in routes
    assert "/leads/{table_name}/{lead_id}" in routes
    assert "/leads/{table_name}/{lead_id}/full-delete" in routes
    assert "/leads/crm" in routes
    assert "/leads/crm/mass-dispatch" in routes
    assert "/leads/{table_name}/{lead_id}/crm-stage" in routes
    assert "/leads/assign-funnel" in routes
    assert "/leads/assign-followup" in routes


@pytest.mark.asyncio
async def test_assign_qualification_funnel_validation():
    """Testa a validação de dados em assign_qualification_funnel."""
    mock_db = AsyncMock()

    # Vazio deve levantar HTTPException 400
    with pytest.raises(Exception) as exc_info:
        await assign_qualification_funnel(
            data=AssignFunnelRequest(phones=[], funnel_id=None, followup_id=None),
            db=mock_db
        )
    assert "400" in str(exc_info.value)


@pytest.mark.asyncio
async def test_assign_qualification_funnel_success():
    """Testa atribuição com sucesso de funil de qualificação."""
    mock_db = AsyncMock()
    mock_db.execute = AsyncMock()
    
    # Mock para update
    update_res = MagicMock()
    update_res.rowcount = 1

    # Mock para busca de telefones existentes
    existing_res = MagicMock()
    existing_res.fetchall.return_value = [("5585999999999",)]

    mock_db.execute.side_effect = [update_res, existing_res]

    req = AssignFunnelRequest(
        phones=["+55 85 99999-9999"],
        funnel_id="10"
    )
    result = await assign_qualification_funnel(data=req, db=mock_db)

    assert result["success"] is True
    assert result["funnel_id"] == "10"
    assert result["updated_contacts"] == 1
    assert result["phones_received"] == 1
    assert mock_db.commit.called


@pytest.mark.asyncio
async def test_assign_followup_funnel_success():
    """Testa atribuição com sucesso de fluxo de follow-up."""
    mock_db = AsyncMock()
    mock_db.execute = AsyncMock()

    update_res = MagicMock()
    update_res.rowcount = 1

    existing_res = MagicMock()
    existing_res.fetchall.return_value = [("5585888888888",)]

    mock_db.execute.side_effect = [update_res, existing_res]

    req = AssignFollowupRequest(
        phones=["5585888888888"],
        followup_id="fluxo_mentoria"
    )
    result = await assign_followup_funnel(data=req, db=mock_db)

    assert result["success"] is True
    assert result["followup_id"] == "fluxo_mentoria"
    assert result["updated_contacts"] == 1
    assert mock_db.commit.called


@pytest.mark.asyncio
async def test_execute_crm_mass_dispatch_missing_credentials():
    """Testa disparo em massa quando faltam credenciais do ZapVoice."""
    mock_db = AsyncMock()
    mock_db_res = MagicMock()
    # Sem webhooks configurados
    mock_db_res.fetchall.return_value = []
    mock_db.execute.return_value = mock_db_res

    payload = CRMMassDispatchPayload(
        leads=[MassDispatchLeadItem(telefone="5585777777777", contato_nome="Lead Sem ZapVoice")],
        template_name="template_teste"
    )

    with patch.dict("os.environ", {"ZAPVOICE_URL": "", "ZAPVOICE_API_TOKEN": ""}):
        result = await execute_crm_mass_dispatch(payload=payload, db=mock_db)
        assert result["success"] is True
        assert result["sent_count"] == 0
        assert result["failed_count"] == 1
        assert "Credenciais do ZapVoice ausentes" in result["results"][0]["error"]
