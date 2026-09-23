import pytest
from unittest.mock import MagicMock, AsyncMock
from agent_core.logic.pre_router.shortcuts_modules.classification import (
    _is_disinterest_declaration,
    _is_purchase_declaration
)

def test_is_disinterest_declaration_detection():
    # Casos explícitos de desinteresse que DEVEM cancelar o follow-up
    assert _is_disinterest_declaration("Não tenho interesse") is True
    assert _is_disinterest_declaration("Nao tenho interesse") is True
    assert _is_disinterest_declaration("Sem interesse nenhum, obrigado") is True
    assert _is_disinterest_declaration("Não quero comprar o curso") is True
    assert _is_disinterest_declaration("Não vou comprar nada") is True
    assert _is_disinterest_declaration("Pode cancelar") is True
    assert _is_disinterest_declaration("Desisti de comprar") is True
    assert _is_disinterest_declaration("Por favor pare de me mandar mensagem") is True
    assert _is_disinterest_declaration("Não quero mais receber mensagens") is True
    assert _is_disinterest_declaration("Tira meu número por favor") is True

    # Casos de interesse ou dúvidas normais que NÃO DEVEM cancelar o follow-up
    assert _is_disinterest_declaration("Tenho interesse sim!") is False
    assert _is_disinterest_declaration("Gostaria de saber o valor") is False
    assert _is_disinterest_declaration("Oi, tudo bem?") is False
    assert _is_disinterest_declaration("Não tenho dúvidas, muito obrigado") is False
    assert _is_disinterest_declaration("Como funciona a forma de pagamento?") is False


def test_is_purchase_declaration_detection():
    # Casos que declaram compra
    assert _is_purchase_declaration("Já comprei o curso ontem no cartão") is True
    assert _is_purchase_declaration("Fiz o pagamento agora pelo pix") is True
    assert _is_purchase_declaration("Já sou aluna da turma passada") is True

    # Casos que NÃO declaram compra
    assert _is_purchase_declaration("Não comprei ainda, vou ver") is False
    assert _is_purchase_declaration("Como compro o curso?") is False


@pytest.mark.asyncio
async def test_pipeline_info_keeps_active_on_user_message_and_resets():
    from webhooks.leads_modules.pipeline_info import get_lead_followup_pipeline
    
    mock_config = MagicMock()
    mock_config.id = 1
    mock_config.name = "Teste"
    mock_config.leads_table = "leads"
    mock_config.followup_enabled = True
    mock_config.followup_steps = '[{"type": "ai", "delay_minutes": 60}, {"type": "whatsapp_template", "delay_minutes": 1440, "template_name": "promo"}]'
    mock_config.followup_funnels = None
    mock_config.followup_business_hours = None
    mock_config.ignore_by_label = "humano"
    mock_config.followup_cancel_label = "compra-aprovada"
    mock_config.purchased_label = "aluno"
    mock_config.followup_on_reply = "stop"

    lead_row = (100, "Lead Teste", "5511999999999", 1, "2026-09-23T10:30:00", "2026-09-23T10:31:00", "2026-09-22T08:00:00", '["robo", "whatsapp"]', True)
    lead_keys = ["id", "contato_nome", "telefone", "followup_step", "ultima_mensagem_em", "ultima_resposta_agente_em", "created_at", "labels", "pode_enviar_mensagem"]

    mock_lead_res = MagicMock()
    mock_lead_res.fetchone.return_value = lead_row
    mock_lead_res.keys.return_value = lead_keys

    # Mock do retorno dos eventos
    mock_events_res = MagicMock()
    mock_events_res.fetchall.return_value = [
        (1, "followup", "text", "msg", "resp", "processed", "2026-09-22T09:00:00+00:00", None, "[]", "Agente")
    ]
    mock_events_res.keys.return_value = [
        "id", "event_type", "message_type", "mensagem", "agent_response", "status", "created_at", "scheduled_at", "processing_steps", "dono"
    ]
    
    # Mock para checagem de desinteresse
    mock_dis_res = MagicMock()
    mock_dis_res.fetchone.return_value = None

    mock_db = AsyncMock()
    mock_db.get.return_value = mock_config
    mock_db.execute.side_effect = [mock_lead_res, mock_events_res, mock_dis_res]

    res = await get_lead_followup_pipeline(1, 100, mock_db)

    # Follow-up NÃO deve estar cancelado, deve estar active
    assert res["overall_status"] == "active"
    assert res["steps"][1]["status"] == "active"
    assert res["steps"][1]["reset_by_lead_message"] is True
    assert res["cancellation_reason"] is None

