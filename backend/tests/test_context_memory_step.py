import pytest
from unittest.mock import MagicMock, patch
from webhook_services import retrieve_context_history
from agent_core.logic.pre_router.shortcuts import _is_closing_or_no_more_doubts, check_programmatic_shortcuts

def test_retrieve_context_history_records_messages_metadata():
    """Valida se retrieve_context_history adiciona a etapa com metadata contendo o array de mensagens."""
    mock_db = MagicMock()
    
    # Evento atual
    mock_event = MagicMock()
    mock_event.id = 999
    mock_event.webhook_config_id = 1
    mock_event.webhook_config = {"leads_table": "leads"}
    mock_event.telefone = "5511999999999"
    
    # Agente com janela de contexto 3 (máx 6 mensagens)
    mock_agent = MagicMock()
    mock_agent.context_window = 3
    
    # Eventos passados simulados
    pe1 = MagicMock()
    pe1.id = 101
    pe1.dono = "user"
    pe1.event_type = "message"
    pe1.mensagem = "Qual o valor do curso?"
    pe1.agent_response = "O curso custa R$ 497 à vista."
    
    pe2 = MagicMock()
    pe2.id = 102
    pe2.dono = "user"
    pe2.event_type = "message"
    pe2.mensagem = "Tem certificado?"
    pe2.agent_response = "Sim, tem certificado oficial de conclusão."

    mock_query = MagicMock()
    mock_query.filter.return_value.order_by.return_value.limit.return_value.all.return_value = [pe2, pe1]
    mock_db.query.return_value = mock_query

    with patch("webhook_tasks._add_step") as mock_add_step:
        history = retrieve_context_history(
            db=mock_db,
            event=mock_event,
            db_agent=mock_agent,
            raw_phone="5511999999999",
            clean_phone="5511999999999",
            event_id=999
        )
        
        # Deve ter retornado as mensagens
        assert len(history) == 4
        assert history[0]["role"] == "user"
        assert history[0]["content"] == "Qual o valor do curso?"
        assert history[1]["role"] == "assistant"
        assert history[1]["content"] == "O curso custa R$ 497 à vista."
        assert history[2]["role"] == "user"
        assert history[2]["content"] == "Tem certificado?"
        assert history[3]["role"] == "assistant"
        assert history[3]["content"] == "Sim, tem certificado oficial de conclusão."
        
        # Deve ter chamado _add_step com metadata
        mock_add_step.assert_called_once()
        call_args = mock_add_step.call_args
        assert call_args[0][2] == "🧠 Memória de Contexto"
        assert "metadata" in call_args[1]
        metadata = call_args[1]["metadata"]
        assert "messages" in metadata
        assert len(metadata["messages"]) == 4
        assert metadata["total_messages"] == 4
        assert metadata["context_window"] == 3


def test_no_more_doubts_recognition():
    """Valida se 'Não possuo mais dúvidas' e variações são reconhecidas como encerramento/declaração."""
    assert _is_closing_or_no_more_doubts("Não possuo mais dúvidas") is True
    assert _is_closing_or_no_more_doubts("não possuo mais duvidas") is True
    assert _is_closing_or_no_more_doubts("Sem dúvidas por aqui") is True
    assert _is_closing_or_no_more_doubts("sem duvidas") is True
    assert _is_closing_or_no_more_doubts("Era só isso mesmo") is True
    assert _is_closing_or_no_more_doubts("Não preciso de mais nada") is True

    # Mensagens com dúvidas reais NÃO devem ser tratadas como encerramento
    assert _is_closing_or_no_more_doubts("Ainda tenho dúvidas sobre o curso") is False
    assert _is_closing_or_no_more_doubts("Qual o valor?") is False
