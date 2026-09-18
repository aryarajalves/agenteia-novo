import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from webhook_tasks import process_webhook_automation
from webhooks.leads import delete_single_lead, delete_leads_batch
from webhooks.schemas import LeadBulkDeleteRequest
from models import WebhookEventModel, WebhookConfigModel, AgentConfigModel
from zapvoice_utils import get_default_reset_labels, reset_conversation_labels
import json
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


def test_get_default_reset_labels():
    # 1. Com delete_labels configurado
    cfg1 = MagicMock()
    cfg1.delete_labels = '["robo", "padrao"]'
    cfg1.labels_on_message = '["msg_tag"]'
    assert get_default_reset_labels(cfg1) == ["robo", "padrao"]

    # 2. Fallback para labels_on_message quando delete_labels está vazio
    cfg2 = MagicMock()
    cfg2.delete_labels = None
    cfg2.labels_on_message = '["robo", "iniciar"]'
    assert get_default_reset_labels(cfg2) == ["robo", "iniciar"]

    # 3. Nenhum configurado
    cfg3 = MagicMock()
    cfg3.delete_labels = None
    cfg3.labels_on_message = None
    assert get_default_reset_labels(cfg3) == []


@pytest.mark.asyncio
async def test_webhook_reset_labels_substitution(db_session: AsyncSession):
    # 1. Setup Mock Config
    agent = AgentConfigModel(name="Test Agent Reset", model="gpt-4o-mini", system_prompt="Test")
    db_session.add(agent)
    await db_session.commit()
    await db_session.refresh(agent)

    config = WebhookConfigModel(
        name="Test Webhook Reset",
        token="test_token_reset_103",
        agent_id=agent.id,
        zapvoice_url="https://chat.test.com",
        zapvoice_api_token="test_token_zv",
        zapvoice_client_id="11",
        delete_keywords=json.dumps(["#resetar"]),
        delete_message="Zerei a memoria do agente para esse contato.",
        delete_labels=json.dumps(["robo", "iniciar"]),
        leads_table="leads"
    )
    db_session.add(config)
    await db_session.commit()
    await db_session.refresh(config)

    event = WebhookEventModel(
        webhook_config_id=config.id,
        conta_id="11",
        conversa_id="100",
        telefone="5511999999999",
        mensagem="#resetar",
        status="received"
    )
    db_session.add(event)
    await db_session.commit()
    await db_session.refresh(event)

    # 2. Mock httpx client
    mock_client = MagicMock()
    mock_client.__enter__.return_value = mock_client
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.text = "OK"
    mock_client.post.return_value = mock_resp

    with patch("httpx.Client", return_value=mock_client), \
         patch("webhook_services._send_zapvoice_message", return_value=True), \
         patch("webhook_tasks.is_conversation_paused", return_value=False):
        
        # 3. Execute Task
        process_webhook_automation(event.id)

        # 4. Verify httpx.Client.post was called with delete_labels
        mock_client.post.assert_called()
        
        found_labels_post = False
        for call_args in mock_client.post.call_args_list:
            args = call_args.args
            kwargs = call_args.kwargs
            
            url = args[0] if len(args) > 0 else kwargs.get("url", "")
            json_payload = kwargs.get("json", {})
            
            if "conversations/100/labels" in url:
                assert json_payload == {"labels": ["robo", "iniciar"]}
                found_labels_post = True
                
        assert found_labels_post, "A requisição POST para atualizar as etiquetas com ['robo', 'iniciar'] não foi encontrada."


@pytest.mark.asyncio
async def test_delete_single_lead_resets_zapvoice_labels(db_session: AsyncSession):
    # Setup WebhookConfig
    config = WebhookConfigModel(
        name="Test Single Delete Webhook",
        token="test_single_del_tok",
        zapvoice_url="https://api.zapvoice.test",
        zapvoice_api_token="test_zv_token",
        zapvoice_client_id="22",
        delete_labels=json.dumps(["robo", "whatsapp"]),
        leads_table="leads"
    )
    db_session.add(config)
    await db_session.commit()
    await db_session.refresh(config)

    # Inserir lead de teste na tabela leads
    await db_session.execute(
        text("INSERT INTO leads (webhook_config_id, telefone, conversa_id, conta_id, labels) VALUES (:wid, :tel, :cid, :aid, :lbl)"),
        {"wid": config.id, "tel": "5511888887777", "cid": "999", "aid": "22", "lbl": '["quente", "qualificado"]'}
    )
    await db_session.commit()

    lead_res = await db_session.execute(text("SELECT id FROM leads WHERE telefone = '5511888887777'"))
    lead_id = lead_res.scalar()

    with patch("zapvoice_utils.reset_conversation_labels", new_callable=AsyncMock) as mock_reset_labels, \
         patch("webhooks.leads.delete_contact_data", new_callable=AsyncMock) as mock_del_data:
        mock_reset_labels.return_value = True

        res = await delete_single_lead(config.id, lead_id, db=db_session)
        assert res.status_code == 204

        # Valida que reset_conversation_labels foi chamado com as etiquetas padrão
        mock_reset_labels.assert_awaited_once()
        args, kwargs = mock_reset_labels.call_args
        assert "api.zapvoice.test" in args[0]
        assert str(args[1]) == "22"
        assert str(args[2]) == "999"
        assert args[3] == "test_zv_token"
        assert args[4] == ["robo", "whatsapp"]


@pytest.mark.asyncio
async def test_delete_leads_batch_resets_zapvoice_labels(db_session: AsyncSession):
    # Setup WebhookConfig
    config = WebhookConfigModel(
        name="Test Batch Delete Webhook",
        token="test_batch_del_tok",
        zapvoice_url="https://api.zapvoice.test",
        zapvoice_api_token="test_zv_token",
        zapvoice_client_id="33",
        delete_labels=json.dumps(["robo_padrao"]),
        leads_table="leads"
    )
    db_session.add(config)
    await db_session.commit()
    await db_session.refresh(config)

    # Inserir leads
    await db_session.execute(
        text("INSERT INTO leads (webhook_config_id, telefone, conversa_id, conta_id) VALUES (:wid, :tel, :cid, :aid)"),
        {"wid": config.id, "tel": "5511111111111", "cid": "1001", "aid": "33"}
    )
    await db_session.execute(
        text("INSERT INTO leads (webhook_config_id, telefone, conversa_id, conta_id) VALUES (:wid, :tel, :cid, :aid)"),
        {"wid": config.id, "tel": "5511222222222", "cid": "1002", "aid": "33"}
    )
    await db_session.commit()

    rows = (await db_session.execute(text("SELECT id FROM leads WHERE webhook_config_id = :wid"), {"wid": config.id})).scalars().all()

    with patch("zapvoice_utils.reset_conversation_labels", new_callable=AsyncMock) as mock_reset_labels, \
         patch("webhooks.leads.delete_contact_data", new_callable=AsyncMock) as mock_del_data:
        mock_reset_labels.return_value = True

        req = LeadBulkDeleteRequest(lead_ids=rows)
        res = await delete_leads_batch(config.id, req, db=db_session)
        assert res.status_code == 204

        # Valida que reset_conversation_labels foi chamado para ambas as conversas com 'robo_padrao'
        assert mock_reset_labels.await_count == 2
        called_conv_ids = [call[0][2] for call in mock_reset_labels.call_args_list]
        assert "1001" in called_conv_ids
        assert "1002" in called_conv_ids
