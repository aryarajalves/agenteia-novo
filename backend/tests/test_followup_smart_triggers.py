import pytest
from unittest.mock import patch, MagicMock
from tasks import _generate_followup_message

def test_generate_followup_message_cancels_if_lead_responded():
    # Simula resposta da API do Chatwoot com a última mensagem enviada pelo Usuário (message_type == 0)
    mock_payload = {
        "payload": [
            {"content": "Olá, qual o valor?", "message_type": 1, "created_at": 100},  # Agente
            {"content": "Já comprei no site, obrigado!", "message_type": 0, "created_at": 200} # Usuário/Lead
        ]
    }
    
    with patch("httpx.Client.get") as mock_get:
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = mock_payload
        mock_get.return_value = mock_response
        
        msg, usage = _generate_followup_message(
            cw_url="http://fake-chatwoot.com",
            cw_token="fake_token",
            conta_id=1,
            conversa_id=100,
            delay_minutes=30,
            nome="Carlos"
        )
        
        # Deve detectar que o lead enviou a última mensagem e retornar "LEAD_RESPONDED"
        assert msg == "LEAD_RESPONDED"
        assert usage is None

def test_generate_followup_message_generates_if_agent_was_last():
    # Simula resposta da API do Chatwoot onde o Agente mandou a última mensagem (message_type == 1)
    mock_payload = {
        "payload": [
            {"content": "Posso te ajudar com o pagamento?", "message_type": 1, "created_at": 100} # Agente
        ]
    }
    
    with patch("httpx.Client.get") as mock_get, \
         patch("anthropic.Anthropic") as mock_anthropic:
        
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = mock_payload
        mock_get.return_value = mock_response
        
        mock_ai_instance = MagicMock()
        mock_msg_res = MagicMock()
        mock_msg_res.content = [MagicMock(text="Oi Carlos! Conseguimos resolver a sua dúvida?")]
        mock_msg_res.usage = MagicMock(input_tokens=50, output_tokens=20)
        mock_ai_instance.messages.create.return_value = mock_msg_res
        mock_anthropic.return_value = mock_ai_instance
        
        msg, usage = _generate_followup_message(
            cw_url="http://fake-chatwoot.com",
            cw_token="fake_token",
            conta_id=1,
            conversa_id=100,
            delay_minutes=30,
            nome="Carlos"
        )
        
        assert msg == "Oi Carlos! Conseguimos resolver a sua dúvida?"
        assert usage.input_tokens == 50
