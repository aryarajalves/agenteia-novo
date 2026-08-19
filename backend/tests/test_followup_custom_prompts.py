import pytest
from unittest.mock import patch, MagicMock
from tasks import _generate_followup_message

def test_generate_followup_message_with_custom_prompt():
    mock_payload = {
        "payload": [
            {"content": "Como posso tirar minha dúvida no checkout?", "message_type": 1, "created_at": 100}
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
        mock_msg_res.content = [MagicMock(text="Oi João! Foco total em te ajudar no checkout.")]
        mock_msg_res.usage = MagicMock(input_tokens=60, output_tokens=25)
        mock_ai_instance.messages.create.return_value = mock_msg_res
        mock_anthropic.return_value = mock_ai_instance
        
        custom_prompt = "Retome o assunto focando em tirar dúvidas sobre o checkout."
        
        msg, usage = _generate_followup_message(
            cw_url="http://fake-chatwoot.com",
            cw_token="fake_token",
            conta_id=1,
            conversa_id=100,
            delay_minutes=30,
            nome="João Silva",
            custom_prompt=custom_prompt
        )
        
        assert msg == "Oi João! Foco total em te ajudar no checkout."
        # Verifica se o prompt customizado foi enviado para a chamada do Anthropic
        call_args = mock_ai_instance.messages.create.call_args[1]
        sent_content = call_args["messages"][0]["content"]
        assert "Diretriz/Instrução específica para este disparo de follow-up" in sent_content
        assert custom_prompt in sent_content

def test_fixed_template_interpolation():
    fixed_template = "Olá {nome}! Notamos que seu telefone é {telefone}. Fala {primeiro_nome}!"
    nome = "Aryaraj Alves"
    telefone = "5511999998888"
    
    primeiro_nome = nome.strip().split()[0]
    msg = fixed_template.replace("{nome}", nome).replace("{primeiro_nome}", primeiro_nome).replace("{telefone}", telefone)
    
    assert msg == "Olá Aryaraj Alves! Notamos que seu telefone é 5511999998888. Fala Aryaraj!"
