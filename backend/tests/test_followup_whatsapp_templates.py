import pytest
from unittest.mock import patch, MagicMock
from zapvoice_utils import get_zapvoice_whatsapp_templates, send_zapvoice_whatsapp_template

@pytest.mark.asyncio
async def test_get_zapvoice_whatsapp_templates():
    mock_templates = [
        {"id": 1, "name": "lembrete_carrinho", "language": "pt_BR", "status": "APPROVED"},
        {"id": 2, "name": "oferta_especial", "language": "pt_BR", "status": "APPROVED"}
    ]
    
    with patch("httpx.AsyncClient.get") as mock_get:
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {"templates": mock_templates}
        mock_get.return_value = mock_resp

        templates = await get_zapvoice_whatsapp_templates(
            zapvoice_url="http://localhost:8000",
            token="fake_token",
            client_id="123"
        )
        assert len(templates) == 2
        assert templates[0]["name"] == "lembrete_carrinho"

@pytest.mark.asyncio
async def test_send_zapvoice_whatsapp_template():
    with patch("httpx.AsyncClient.post") as mock_post:
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.text = '{"message_id": "wamid.123"}'
        mock_resp.json.return_value = {"message_id": "wamid.123"}
        mock_post.return_value = mock_resp

        success, res = await send_zapvoice_whatsapp_template(
            zapvoice_url="http://localhost:8000",
            token="fake_token",
            client_id="123",
            phone="5585999999999",
            template_name="lembrete_carrinho",
            language="pt_BR",
            components=[]
        )
        assert success is True
        assert res.get("message_id") == "wamid.123"

@pytest.mark.asyncio
async def test_send_zapvoice_whatsapp_template_with_components():
    with patch("httpx.AsyncClient.post") as mock_post:
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.text = '{"message_id": "wamid.456"}'
        mock_resp.json.return_value = {"message_id": "wamid.456"}
        mock_post.return_value = mock_resp

        components = [
            {
                "type": "header",
                "parameters": [{"type": "image", "image": {"link": "https://meusite.com/banner.png"}}]
            },
            {
                "type": "body",
                "parameters": [{"type": "text", "text": "Carlos"}, {"type": "text", "text": "Plano VIP"}]
            }
        ]

        success, res = await send_zapvoice_whatsapp_template(
            zapvoice_url="http://localhost:8000",
            token="fake_token",
            client_id="123",
            phone="5585999999999",
            template_name="combo_produto_oficial",
            language="pt_BR",
            components=components
        )
        assert success is True
        assert res.get("message_id") == "wamid.456"
        
        # Validar payload enviado
        called_json = mock_post.call_args[1]["json"]
        assert called_json["template_name"] == "combo_produto_oficial"
        assert len(called_json["components"]) == 2
        assert called_json["components"][0]["type"] == "header"
        assert called_json["components"][1]["parameters"][0]["text"] == "Carlos"
