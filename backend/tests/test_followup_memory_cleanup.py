import pytest
from unittest.mock import patch, MagicMock
from models import WebhookEventModel, WebhookConfigModel, AgentConfigModel
from webhook_services import retrieve_context_history

@patch("webhook_tasks._add_step")
def test_followup_events_do_not_inject_technical_markers_in_memory(mock_add_step):
    db_mock = MagicMock()

    # Evento 1: Mensagem inicial do usuário
    ev1 = MagicMock(spec=WebhookEventModel)
    ev1.id = 1
    ev1.mensagem = "oie"
    ev1.agent_response = "Olá! Como posso ajudar?"
    ev1.dono = "usuario"
    ev1.event_type = "message"
    ev1.is_automatic = False

    # Evento 2: Disparo de Follow-up (marcador técnico na mensagem e texto real no agent_response)
    ev2 = MagicMock(spec=WebhookEventModel)
    ev2.id = 2
    ev2.mensagem = "🔄 [Follow-Up Passo #1]"
    ev2.agent_response = "Oi! Passando rapidinho pra te perguntar se ficou alguma dúvida?"
    ev2.dono = "Agente"
    ev2.event_type = "followup"
    ev2.is_automatic = False

    # Configurar mock de query do SQLAlchemy
    query_mock = MagicMock()
    db_mock.query.return_value = query_mock
    filter_mock = MagicMock()
    query_mock.filter.return_value = filter_mock
    order_mock = MagicMock()
    filter_mock.order_by.return_value = order_mock
    limit_mock = MagicMock()
    order_mock.limit.return_value = limit_mock
    limit_mock.all.return_value = [ev1, ev2]

    current_event = MagicMock(spec=WebhookEventModel)
    current_event.webhook_config_id = 1
    current_event.id = 3

    db_agent = MagicMock(spec=AgentConfigModel)
    db_agent.context_window = 10

    history = retrieve_context_history(
        db=db_mock,
        event=current_event,
        db_agent=db_agent,
        raw_phone="5585999999999",
        clean_phone="5585999999999",
        event_id=3
    )

    # Validar que a tag técnica [Mensagem Ativa de Campanha] ou 🔄 [Follow-Up não entrou no histórico
    for msg in history:
        assert "[Mensagem Ativa de Campanha]" not in msg["content"]
        assert "🔄 [Follow-Up Passo #1]" not in msg["content"]
        assert "🔄" not in msg["content"]

    # Validar que o texto REAL do follow-up foi inserido com role "assistant"
    assistant_msgs = [m["content"] for m in history if m["role"] == "assistant"]
    assert any("Passando rapidinho pra te perguntar" in text for text in assistant_msgs)

