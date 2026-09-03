"""
Testes unitários para o envio de meta_data com processing_steps e custos ao ZapVoice.
Valida o formato do JSON enviado:
{
  "content": "...",
  "meta_data": {
    "processing_steps": [
      { "step": "Pré-Router (Classificação)", "cost": 0.0004 },
      { "step": "Agente Principal (GPT-4o)", "cost": 0.0021 }
    ]
  }
}
"""

import pytest
from unittest.mock import patch, MagicMock
import httpx

from webhook_services import _send_zapvoice_message, _get_cost
from webhook_tasks.utils import _send_chatwoot_message


class TestZapVoiceMetadataPayload:
    @patch("webhook_tasks._add_step")
    @patch("httpx.Client")
    def test_send_zapvoice_message_with_metadata(self, mock_client_cls, mock_add_step):
        mock_client = MagicMock()
        mock_client_cls.return_value.__enter__.return_value = mock_client
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_client.post.return_value = mock_resp

        mock_db = MagicMock()
        mock_config = MagicMock()
        mock_config.zapvoice_url = "https://zapvoice.exemplo.com/api"
        mock_config.zapvoice_api_token = "token-teste-123"

        meta_data = {
            "processing_steps": [
                {"step": "Pré-Router (Classificação)", "cost": 0.0004},
                {"step": "Agente Principal (GPT-4o)", "cost": 0.0021}
            ]
        }

        success = _send_zapvoice_message(
            db=mock_db,
            event_id=1,
            conversation_id="conv_100",
            client_id="client_200",
            content="O investimento no Método Laser Day é de R$297.",
            config=mock_config,
            split_paragraphs=False,
            delay=0,
            meta_data=meta_data
        )

        assert success is True
        mock_client.post.assert_called_once()
        called_args, called_kwargs = mock_client.post.call_args
        
        url = called_args[0]
        assert url == "https://zapvoice.exemplo.com/api/chat/conversations/conv_100/messages"
        
        sent_json = called_kwargs.get("json", {})
        assert sent_json["content"] == "O investimento no Método Laser Day é de R$297."
        assert sent_json["is_private"] is False
        assert "meta_data" in sent_json
        assert sent_json["meta_data"] == meta_data
        assert len(sent_json["meta_data"]["processing_steps"]) == 2
        assert sent_json["meta_data"]["processing_steps"][0]["step"] == "Pré-Router (Classificação)"
        assert sent_json["meta_data"]["processing_steps"][0]["cost"] == 0.0004
        assert sent_json["meta_data"]["processing_steps"][1]["step"] == "Agente Principal (GPT-4o)"
        assert sent_json["meta_data"]["processing_steps"][1]["cost"] == 0.0021

    @patch("webhook_tasks._add_step")
    @patch("httpx.Client")
    def test_send_zapvoice_message_without_metadata_omits_field(self, mock_client_cls, mock_add_step):
        mock_client = MagicMock()
        mock_client_cls.return_value.__enter__.return_value = mock_client
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_client.post.return_value = mock_resp

        mock_db = MagicMock()
        mock_config = MagicMock()
        mock_config.zapvoice_url = "https://zapvoice.exemplo.com/api"
        mock_config.zapvoice_api_token = "token-teste-123"

        success = _send_zapvoice_message(
            db=mock_db,
            event_id=2,
            conversation_id="conv_101",
            client_id="client_200",
            content="Mensagem simples",
            config=mock_config,
            split_paragraphs=False,
            delay=0,
            meta_data=None
        )

        assert success is True
        sent_json = mock_client.post.call_args[1].get("json", {})
        assert sent_json["content"] == "Mensagem simples"
        assert "meta_data" not in sent_json

    @patch("webhook_services._send_zapvoice_message")
    def test_send_chatwoot_wrapper_forwards_metadata(self, mock_send):
        mock_db = MagicMock()
        mock_config = MagicMock()
        meta = {"processing_steps": [{"step": "Teste", "cost": 0.001}]}

        _send_chatwoot_message(
            db=mock_db,
            event_id=3,
            conversation_id="conv_102",
            account_id="client_200",
            content="Texto",
            config=mock_config,
            meta_data=meta,
            total_cost=0.001
        )

        mock_send.assert_called_once_with(
            mock_db, 3, "conv_102", "client_200", "Texto", mock_config,
            split_paragraphs=False, delay=0, meta_data=meta, total_cost=0.001
        )

    @patch("webhook_tasks._add_step")
    @patch("httpx.Client")
    def test_send_zapvoice_message_with_pipeline_steps(self, mock_client_cls, mock_add_step):
        mock_client = MagicMock()
        mock_client_cls.return_value.__enter__.return_value = mock_client
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_client.post.return_value = mock_resp

        mock_db = MagicMock()
        mock_config = MagicMock()
        mock_config.zapvoice_url = "https://zapvoice.exemplo.com/api"
        mock_config.zapvoice_api_token = "token-teste-123"

        meta_data = {
            "processing_steps": [
                {"step": "Pré-Router (Classificação)", "cost": 0.0004},
                {"step": "Agente Principal (GPT-4o)", "cost": 0.0021}
            ],
            "pipeline": [
                {"step": "📥 Webhook Recebido", "detail": "Mensagem agrupada", "timestamp": "2026-08-20T08:00:00"},
                {"step": "🧭 Pre-Router AI", "detail": "Intenção: Dúvida sobre Pagamento", "timestamp": "2026-08-20T08:00:01"},
                {"step": "🔍 Busca RAG", "detail": "1 item encontrado com relevância 0.92", "timestamp": "2026-08-20T08:00:02"},
                {"step": "✅ Resposta gerada pelo agente", "detail": "O investimento no Método Laser Day...", "timestamp": "2026-08-20T08:00:05"}
            ]
        }

        success = _send_zapvoice_message(
            db=mock_db,
            event_id=4,
            conversation_id="conv_104",
            client_id="client_200",
            content="Resposta final.",
            config=mock_config,
            split_paragraphs=False,
            delay=0,
            meta_data=meta_data
        )

        assert success is True
        sent_json = mock_client.post.call_args[1].get("json", {})
        assert "pipeline" in sent_json["meta_data"]
        assert len(sent_json["meta_data"]["pipeline"]) == 4
        assert sent_json["meta_data"]["pipeline"][0]["step"] == "📥 Webhook Recebido"
        assert sent_json["meta_data"]["pipeline"][1]["step"] == "🧭 Pre-Router AI"
        assert sent_json["meta_data"]["pipeline"][2]["step"] == "🔍 Busca RAG"

    @patch("webhook_tasks._add_step")
    @patch("httpx.Client")
    def test_send_zapvoice_message_split_paragraphs_cost_only_on_last_part(self, mock_client_cls, mock_add_step):
        mock_client = MagicMock()
        mock_client_cls.return_value.__enter__.return_value = mock_client
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_client.post.return_value = mock_resp

        mock_db = MagicMock()
        mock_config = MagicMock()
        mock_config.zapvoice_url = "https://zapvoice.exemplo.com/api"
        mock_config.zapvoice_api_token = "token-teste-123"

        multi_part_content = "Primeiro parágrafo de introdução.\n\nSegundo parágrafo explicativo.\n\nÚltimo parágrafo de fechamento."

        success = _send_zapvoice_message(
            db=mock_db,
            event_id=5,
            conversation_id="conv_105",
            client_id="client_200",
            content=multi_part_content,
            config=mock_config,
            split_paragraphs=True,
            delay=0,
            meta_data={"processing_steps": [{"step": "Teste", "cost": 0.0025}]},
            total_cost=0.0025
        )

        assert success is True
        assert mock_client.post.call_count == 3

        call_1_json = mock_client.post.call_args_list[0][1]["json"]
        call_2_json = mock_client.post.call_args_list[1][1]["json"]
        call_3_json = mock_client.post.call_args_list[2][1]["json"]

        # Parte 1 (intermediária): SOMENTE content
        assert call_1_json == {"content": "Primeiro parágrafo de introdução.", "is_private": False}
        assert "total_cost" not in call_1_json
        assert "meta_data" not in call_1_json

        # Parte 2 (intermediária): SOMENTE content
        assert call_2_json == {"content": "Segundo parágrafo explicativo.", "is_private": False}
        assert "total_cost" not in call_2_json
        assert "meta_data" not in call_2_json

        # Parte 3 (última): content + total_cost + meta_data
        assert call_3_json["content"] == "Último parágrafo de fechamento."
        assert call_3_json["is_private"] is False
        assert call_3_json["total_cost"] == 0.0025
        assert "meta_data" in call_3_json

    def test_get_cost_calculates_in_brl(self):
        from config_store import USD_TO_BRL
        # 1.000 tokens de prompt e 200 de completion no gpt-4o-mini
        # Preço gpt-4o-mini: input = 0.00000015 USD, output = 0.0000006 USD
        # USD = (1000 * 0.00000015) + (200 * 0.0000006) = 0.00015 + 0.00012 = 0.00027 USD
        # BRL = 0.00027 * USD_TO_BRL
        usage = {"prompt_tokens": 1000, "completion_tokens": 200}
        cost_brl = _get_cost("gpt-4o-mini", usage)
        expected_brl = 0.00027 * USD_TO_BRL
        assert abs(cost_brl - expected_brl) < 1e-9
        # Garante que o valor retornado é em BRL (maior que em USD)
        assert cost_brl > 0.00027


