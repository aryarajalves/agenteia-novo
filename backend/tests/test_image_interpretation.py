import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from agent_core.services.media_service import process_media_content
from agent_core.core import process_message
from config_store import AgentConfig

@pytest.mark.asyncio
async def test_process_media_content_image_structured_prompt():
    fake_image_bytes = b'fake_image_data'
    fake_vision_response = MagicMock()
    fake_choice = MagicMock()
    fake_choice.message.content = (
        '- TIPO DE IMAGEM: Anúncio/Criativo de Marketing\n'
        '- TEMA / TEXTO PRINCIPAL: O erro invisível que custa R$ 30.000 todo mês no seu WhatsApp\n'
        '- DETALHES RELEVANTES: Mockup de celular com notificação e chamada de atenção para vendas no WhatsApp\n'
        '- ORIENTAÇÃO AO AGENTE: Puxar conversa sobre o tema do anúncio de forma amigável em 1ª pessoa.'
    )
    fake_vision_response.choices = [fake_choice]
    fake_vision_response.usage = MagicMock()
    fake_vision_response.usage.to_dict.return_value = {'prompt_tokens': 100, 'completion_tokens': 50}

    with patch('httpx.AsyncClient.get', return_value=MagicMock(status_code=200, content=fake_image_bytes)),          patch('agent_core.services.media_service.AsyncOpenAI') as mock_openai_cls:
        mock_client = AsyncMock()
        mock_client.chat.completions.create.return_value = fake_vision_response
        mock_openai_cls.return_value = mock_client

        res = await process_media_content('https://example.com/img.jpg', 'image', 'fake_key')
        
        assert 'TIPO DE IMAGEM: Anúncio/Criativo' in res['text']
        assert 'R$ 30.000' in res['text']
        assert res['model'] == 'gpt-4o'
        
        call_args = mock_client.chat.completions.create.call_args[1]
        user_content = call_args['messages'][0]['content']
        assert 'Você é um especialista em análise visual para um assistente' in user_content[0]['text']
        assert 'Comprovante de Pagamento/PIX' in user_content[0]['text']

@pytest.mark.asyncio
async def test_agent_does_not_reply_in_third_person_or_copilot():
    config = AgentConfig(
        name='Atendente Virtual',
        system_prompt='Você é a atendente oficial de vendas da clínica.',
        model='gpt-4o-mini'
    )
    
    image_text = (
        '- TIPO DE IMAGEM: Anúncio/Criativo de Marketing\n'
        '- TEMA / TEXTO PRINCIPAL: O erro invisível que custa R$ 30.000 todo mês no seu WhatsApp'
    )
    
    mock_ai_resp = MagicMock()
    mock_ai_resp.choices = [MagicMock(message=MagicMock(content='Olá! Vi que você mandou o print do nosso anúncio sobre os erros no WhatsApp. Você tem interesse em saber como funciona o nosso método?', tool_calls=None))]
    mock_ai_resp.usage = MagicMock(prompt_tokens=50, completion_tokens=30, prompt_tokens_details=None, extra_fields={})
    
    with patch('agent_core.core.get_openai_client') as mock_get_client,          patch('agent_core.core.run_pre_router_ai', return_value={'eh_saudacao': False, 'eh_mensagem_automatica': False, 'eh_anuncio': False, 'precisa_rag': False, 'perguntas_extraidas': 'O cliente enviou anúncio sobre erros no WhatsApp'}):
        mock_client = AsyncMock()
        mock_client.chat.completions.create.return_value = mock_ai_resp
        mock_get_client.return_value = mock_client
        
        result = await process_message(
            message=image_text,
            history=[],
            config=config
        )
        
        assert 'Segue sugestão' not in result['content']
        assert 'para enviar à' not in result['content']
        assert 'Olá!' in result['content']

@pytest.mark.asyncio
async def test_process_media_content_pix_receipt():
    fake_image_bytes = b'fake_receipt_data'
    fake_vision_response = MagicMock()
    fake_choice = MagicMock()
    fake_choice.message.content = (
        '- TIPO DE IMAGEM: Comprovante de Pagamento/PIX\n'
        '  • VALOR: R$ 197,00\n'
        '  • FAVORECIDO / BENEFICIÁRIO: Clínica Laser Pro\n'
        '  • PAGADOR: João da Silva\n'
        '  • DATA E HORA: 26/08/2026 14:30:00\n'
        '  • AUTENTICAÇÃO / ID: E12345678901234567890\n'
        '  • STATUS VISÍVEL: Confirmado\n'
        '  • ORIENTAÇÃO AO AGENTE: Confirmar o recebimento do comprovante com o cliente e avisar que o acesso está sendo liberado.'
    )
    fake_vision_response.choices = [fake_choice]
    fake_vision_response.usage = MagicMock()
    fake_vision_response.usage.to_dict.return_value = {'prompt_tokens': 120, 'completion_tokens': 60}

    with patch('httpx.AsyncClient.get', return_value=MagicMock(status_code=200, content=fake_image_bytes)), \
         patch('agent_core.services.media_service.AsyncOpenAI') as mock_openai_cls:
        mock_client = AsyncMock()
        mock_client.chat.completions.create.return_value = fake_vision_response
        mock_openai_cls.return_value = mock_client

        res = await process_media_content('https://example.com/pix.png', 'image', 'fake_key')
        
        assert 'Comprovante de Pagamento/PIX' in res['text']
        assert 'R$ 197,00' in res['text']
        assert 'Clínica Laser Pro' in res['text']
        assert res['model'] == 'gpt-4o'
