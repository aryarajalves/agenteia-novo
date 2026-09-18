"""
Testes unitários para o envio de mídias (áudio, voz, imagem, vídeo, documento) para o ZapVoice.
Valida o envio via endpoint dedicado: POST {url}/chat/conversations/{id}/media
"""

import pytest
from unittest.mock import patch, MagicMock
from webhook_services import _send_zapvoice_media, _send_zapvoice_message


class TestZapVoiceMediaDispatch:
    @patch("webhook_tasks._add_step")
    @patch("httpx.Client")
    def test_send_zapvoice_media_audio_success(self, mock_client_cls, mock_add_step):
        mock_client = MagicMock()
        mock_client_cls.return_value.__enter__.return_value = mock_client
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_client.post.return_value = mock_resp

        mock_db = MagicMock()
        mock_config = MagicMock()
        mock_config.zapvoice_url = "https://api.zapvoice.exemplo.com/api"
        mock_config.zapvoice_api_token = "token-teste-media"

        audio_url = "https://backendagente.aryaraj.shop/api/question-funnels/media/funnel_test.ogg"
        success = _send_zapvoice_media(
            db=mock_db,
            event_id=10,
            conversation_id="conv_500",
            client_id="11",
            media_url=audio_url,
            media_type="audio",
            config=mock_config
        )

        assert success is True
        mock_client.post.assert_called_once()
        called_args, called_kwargs = mock_client.post.call_args

        assert called_args[0] == "https://api.zapvoice.exemplo.com/api/chat/conversations/conv_500/media"
        payload = called_kwargs.get("json", {})
        assert payload["media_url"] == audio_url
        assert payload["message_type"] == "audio"
        assert "caption" not in payload

    @patch("webhook_tasks._add_step")
    @patch("httpx.Client")
    def test_send_zapvoice_media_normalizes_types(self, mock_client_cls, mock_add_step):
        mock_client = MagicMock()
        mock_client_cls.return_value.__enter__.return_value = mock_client
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_client.post.return_value = mock_resp

        mock_db = MagicMock()
        mock_config = MagicMock()
        mock_config.zapvoice_url = "https://api.zapvoice.exemplo.com"
        mock_config.zapvoice_api_token = "token-123"

        # PTT / voice -> audio
        _send_zapvoice_media(
            db=mock_db, event_id=1, conversation_id="1", client_id="1",
            media_url="https://audio.ogg", media_type="voice", config=mock_config
        )
        assert mock_client.post.call_args[1]["json"]["message_type"] == "audio"

        # image/png -> image
        _send_zapvoice_media(
            db=mock_db, event_id=2, conversation_id="1", client_id="1",
            media_url="https://img.png", media_type="image/png", config=mock_config,
            caption="Legenda da foto"
        )
        assert mock_client.post.call_args[1]["json"]["message_type"] == "image"
        assert mock_client.post.call_args[1]["json"]["caption"] == "Legenda da foto"

    @patch("os.getenv", return_value="")
    @patch("webhook_tasks._add_step")
    def test_send_zapvoice_media_missing_config(self, mock_add_step, mock_getenv):
        mock_db = MagicMock()
        mock_config = MagicMock()
        mock_config.zapvoice_url = None
        mock_config.zapvoice_api_token = None

        success = _send_zapvoice_media(
            db=mock_db, event_id=1, conversation_id="1", client_id="1",
            media_url="https://audio.ogg", media_type="audio", config=mock_config
        )
        assert success is False
        mock_add_step.assert_called_with(mock_db, 1, "❌ Erro: ZapVoice não configurado", "URL ou Token ausentes no .env/config.")


class TestZapVoiceMessageWithAttachments:
    @patch("webhook_tasks._add_step")
    @patch("httpx.Client")
    def test_pure_audio_attachment_calls_media_and_not_messages(self, mock_client_cls, mock_add_step):
        mock_client = MagicMock()
        mock_client_cls.return_value.__enter__.return_value = mock_client
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_client.post.return_value = mock_resp

        mock_db = MagicMock()
        mock_config = MagicMock()
        mock_config.zapvoice_url = "https://api.zapvoice.exemplo.com/api"
        mock_config.zapvoice_api_token = "token-xyz"

        attachments = [{
            "file_type": "audio",
            "data_url": "https://backendagente.aryaraj.shop/api/question-funnels/media/funnel_49f2adca.ogg"
        }]

        # Passo puramente de áudio (conteúdo vazio)
        success = _send_zapvoice_message(
            db=mock_db,
            event_id=581,
            conversation_id="28018",
            client_id="11",
            content="",
            config=mock_config,
            attachments=attachments
        )

        assert success is True
        # Deve ter chamado apenas 1 vez (para o endpoint /media) e NUNCA para /messages com content vazio!
        assert mock_client.post.call_count == 1
        called_url = mock_client.post.call_args[0][0]
        assert called_url == "https://api.zapvoice.exemplo.com/api/chat/conversations/28018/media"
        called_json = mock_client.post.call_args[1]["json"]
        assert called_json["media_url"] == "https://backendagente.aryaraj.shop/api/question-funnels/media/funnel_49f2adca.ogg"
        assert called_json["message_type"] == "audio"

    @patch("webhook_tasks._add_step")
    @patch("httpx.Client")
    def test_audio_attachment_with_text_calls_both_media_and_messages(self, mock_client_cls, mock_add_step):
        mock_client = MagicMock()
        mock_client_cls.return_value.__enter__.return_value = mock_client
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_client.post.return_value = mock_resp

        mock_db = MagicMock()
        mock_config = MagicMock()
        mock_config.zapvoice_url = "https://api.zapvoice.exemplo.com/api"
        mock_config.zapvoice_api_token = "token-xyz"

        attachments = [{
            "file_type": "audio",
            "data_url": "https://backendagente.aryaraj.shop/media/audio.ogg"
        }]

        success = _send_zapvoice_message(
            db=mock_db,
            event_id=582,
            conversation_id="28018",
            client_id="11",
            content="Conseguiu entender como funciona?",
            config=mock_config,
            attachments=attachments
        )

        assert success is True
        # Deve chamar 2 vezes: 1 para /media (áudio) e 1 para /messages (texto)
        assert mock_client.post.call_count == 2

        call_1_url = mock_client.post.call_args_list[0][0][0]
        assert call_1_url.endswith("/media")
        call_1_json = mock_client.post.call_args_list[0][1]["json"]
        assert call_1_json["message_type"] == "audio"

        call_2_url = mock_client.post.call_args_list[1][0][0]
        assert call_2_url.endswith("/messages")
        call_2_json = mock_client.post.call_args_list[1][1]["json"]
        assert call_2_json["content"] == "Conseguiu entender como funciona?"

    @patch("webhook_tasks._add_step")
    @patch("httpx.Client")
    def test_image_attachment_consumes_caption_without_duplicate_text(self, mock_client_cls, mock_add_step):
        mock_client = MagicMock()
        mock_client_cls.return_value.__enter__.return_value = mock_client
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_client.post.return_value = mock_resp

        mock_db = MagicMock()
        mock_config = MagicMock()
        mock_config.zapvoice_url = "https://api.zapvoice.exemplo.com/api"
        mock_config.zapvoice_api_token = "token-xyz"

        attachments = [{
            "file_type": "image",
            "data_url": "https://backendagente.aryaraj.shop/media/foto.png"
        }]

        success = _send_zapvoice_message(
            db=mock_db,
            event_id=583,
            conversation_id="28018",
            client_id="11",
            content="Veja a imagem do curso!",
            config=mock_config,
            attachments=attachments
        )

        assert success is True
        # Imagem consome o texto como caption no WhatsApp, logo NÃO deve chamar /messages separadamente
        assert mock_client.post.call_count == 1
        call_url = mock_client.post.call_args[0][0]
        assert call_url.endswith("/media")
        call_json = mock_client.post.call_args[1]["json"]
        assert call_json["caption"] == "Veja a imagem do curso!"

    @patch("webhook_tasks._add_step")
    @patch("httpx.Client")
    def test_media_failure_returns_false_and_aborts(self, mock_client_cls, mock_add_step):
        mock_client = MagicMock()
        mock_client_cls.return_value.__enter__.return_value = mock_client
        mock_resp = MagicMock()
        mock_resp.status_code = 500
        mock_resp.text = "Internal Server Error"
        mock_client.post.return_value = mock_resp

        mock_db = MagicMock()
        mock_config = MagicMock()
        mock_config.zapvoice_url = "https://api.zapvoice.exemplo.com/api"
        mock_config.zapvoice_api_token = "token-xyz"

        attachments = [{
            "file_type": "audio",
            "data_url": "https://backendagente.aryaraj.shop/media/audio.ogg"
        }]

        success = _send_zapvoice_message(
            db=mock_db,
            event_id=584,
            conversation_id="28018",
            client_id="11",
            content="",
            config=mock_config,
            attachments=attachments
        )

        assert success is False
