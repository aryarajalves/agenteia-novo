import pytest
import asyncio
from datetime import datetime, timedelta
from sqlalchemy import text
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from services.followup_modules.evaluator import check_lead_score_filter, resolve_ab_variation
from services.followup_modules.metrics import calculate_followup_metrics
from services.followup_service import execute_check_followup_due, _process_due_leads_concurrently
from models import WebhookConfigModel, WebhookEventModel
import uuid

def test_check_lead_score_filter():
    """Valida que o filtro por lead score e temperatura funciona para todos os cenários."""
    # Cenário 'all' / padrão
    assert check_lead_score_filter(lead_score=10, lead_classification="Frio", trigger="all") is True
    assert check_lead_score_filter(lead_score=90, lead_classification="Quente", trigger="") is True

    # Cenário 'hot' (Apenas Quentes)
    assert check_lead_score_filter(lead_score=80, lead_classification="Quente", trigger="hot") is True
    assert check_lead_score_filter(lead_score=75, lead_classification=None, trigger="hot") is True
    assert check_lead_score_filter(lead_score=30, lead_classification="Frio", trigger="hot") is False

    # Cenário 'warm' (Apenas Mornos)
    assert check_lead_score_filter(lead_score=50, lead_classification="Morno", trigger="warm") is True
    assert check_lead_score_filter(lead_score=85, lead_classification="Quente", trigger="warm") is False
    assert check_lead_score_filter(lead_score=20, lead_classification="Frio", trigger="warm") is False

    # Cenário 'cold' (Apenas Frios)
    assert check_lead_score_filter(lead_score=20, lead_classification="Frio", trigger="cold") is True
    assert check_lead_score_filter(lead_score=85, lead_classification="Quente", trigger="cold") is False

    # Cenário 'hot_warm' (Quentes ou Mornos)
    assert check_lead_score_filter(lead_score=50, lead_classification="Morno", trigger="hot_warm") is True
    assert check_lead_score_filter(lead_score=90, lead_classification="Quente", trigger="hot_warm") is True
    assert check_lead_score_filter(lead_score=15, lead_classification="Frio", trigger="hot_warm") is False


def test_resolve_ab_variation():
    """Valida o split determinístico 50/50 do Teste A/B por telefone."""
    step = {
        "ab_test_enabled": True,
        "custom_prompt": "Prompt A",
        "variation_b_prompt": "Prompt B",
        "fixed_message": "Mensagem A",
        "variation_b_message": "Mensagem B"
    }

    # Telefone terminando em dígito par -> Variação A
    step_a, var_a = resolve_ab_variation(step, "5511999998888")
    assert var_a == "A"
    assert step_a["custom_prompt"] == "Prompt A"
    assert step_a["fixed_message"] == "Mensagem A"

    # Telefone terminando em dígito ímpar -> Variação B
    step_b, var_b = resolve_ab_variation(step, "5511999998887")
    assert var_b == "B"
    assert step_b["custom_prompt"] == "Prompt B"
    assert step_b["fixed_message"] == "Mensagem B"

    # Quando A/B desativado, retorna o próprio step sem variação
    step_disabled = {"ab_test_enabled": False, "custom_prompt": "Normal"}
    res_step, var_none = resolve_ab_variation(step_disabled, "5511999998887")
    assert var_none is None
    assert res_step["custom_prompt"] == "Normal"


@pytest.mark.asyncio
async def test_followup_metrics_endpoint(client: AsyncClient, db_session: AsyncSession):
    """Valida o endpoint GET /webhooks/{webhook_id}/followup-metrics e agregação de dados."""
    token = f"met-token-{uuid.uuid4().hex[:8]}"
    webhook = WebhookConfigModel(
        name="Webhook Teste Métricas",
        token=token,
        memory_token=f"mem-{token}",
        leads_table="leads_test_metrics"
    )
    db_session.add(webhook)
    await db_session.commit()
    await db_session.refresh(webhook)

    # Cria eventos simulados de follow-up
    phone_1 = "5511911112222"
    phone_2 = "5511933334444"

    ev1 = WebhookEventModel(
        webhook_config_id=webhook.id,
        conta_id="1",
        conversa_id="101",
        telefone=phone_1,
        contato_nome="Lead 1",
        mensagem="🔄 [Follow-Up Passo #1]",
        agent_response="Oi Lead 1, tudo bem?",
        dono="Agente",
        status="processed",
        event_type="followup",
        message_type="text",
        processing_steps='[{"step": "Mensagem gerada", "metadata": {"ab_variation": "A"}}]',
        created_at=datetime.utcnow() - timedelta(minutes=10)
    )
    ev2 = WebhookEventModel(
        webhook_config_id=webhook.id,
        conta_id="1",
        conversa_id="102",
        telefone=phone_2,
        contato_nome="Lead 2",
        mensagem="🔄 [Follow-Up Passo #1]",
        agent_response="Oi Lead 2, tudo bem?",
        dono="Agente",
        status="processed",
        event_type="followup",
        message_type="text",
        processing_steps='[{"step": "Mensagem gerada", "metadata": {"ab_variation": "B"}}]',
        created_at=datetime.utcnow() - timedelta(minutes=10)
    )
    # Resposta do Lead 1 minutos depois
    ev_reply = WebhookEventModel(
        webhook_config_id=webhook.id,
        conta_id="1",
        conversa_id="101",
        telefone=phone_1,
        contato_nome="Lead 1",
        mensagem="Oi! Quero saber mais sim!",
        agent_response="",
        dono="usuario",
        status="processed",
        event_type="message",
        message_type="text",
        created_at=datetime.utcnow() - timedelta(minutes=5)
    )

    db_session.add_all([ev1, ev2, ev_reply])
    await db_session.commit()

    res = await client.get(f"/webhooks/{webhook.id}/followup-metrics")
    assert res.status_code == 200
    data = res.json()
    assert data["webhook_id"] == webhook.id
    assert data["total_dispatches"] == 2
    assert data["total_responses"] == 1
    assert data["overall_conversion_rate"] == 50.0

    # Valida comparativo A/B
    assert data["ab_testing"]["A"]["dispatches"] == 1
    assert data["ab_testing"]["A"]["responses"] == 1
    assert data["ab_testing"]["A"]["conversion_rate"] == 100.0

    assert data["ab_testing"]["B"]["dispatches"] == 1
    assert data["ab_testing"]["B"]["responses"] == 0
    assert data["ab_testing"]["B"]["conversion_rate"] == 0.0


@pytest.mark.asyncio
async def test_concurrent_followup_processing():
    """Valida que o pool assíncrono com semáforo de até 10 contatos executa sem travar."""
    called_leads = []

    async def mock_dispatcher(**kwargs):
        called_leads.append(kwargs["lead_info"]["telefone"])
        await asyncio.sleep(0.01)
        return True

    from unittest.mock import patch
    with patch("services.followup_service.dispatch_single_lead_followup", side_effect=mock_dispatcher):
        leads_mock = [
            {
                "config_id": 1,
                "leads_table": "test",
                "cw_url": "http://mock",
                "cw_token": "token",
                "agent_id": 1,
                "zv_client_cfg": None,
                "followup_add_label": None,
                "step_raw": {},
                "step_index": 0,
                "delay_minutes": 10,
                "elapsed_minutes": 15,
                "lead_info": {"id": i, "telefone": f"551199999000{i}"},
                "apply_jitter": False
            }
            for i in range(12)
        ]

        await _process_due_leads_concurrently(lambda: None, leads_mock, max_concurrent=10)
        assert len(called_leads) == 12
