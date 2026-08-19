import pytest
from unittest.mock import MagicMock, patch, AsyncMock
import httpx
import json
from datetime import datetime, timezone

from zapvoice_utils import get_conversation_labels_sync
from webhook_tasks import process_webhook_automation

def test_get_conversation_labels_sync_success():
    """Valida retorno correto ao obter etiquetas do ZapVoice com sucesso."""
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = [{"id": 123, "labels": ["lead-quente", "conversao"]}]
    
    with patch("httpx.Client.get") as mock_get:
        mock_get.return_value = mock_response
        
        labels = get_conversation_labels_sync(
            zapvoice_url="http://zapvoice-teste.com",
            client_id="1",
            conversation_id=123,
            token="test-token"
        )
        
        assert labels == ["lead-quente", "conversao"]

def test_get_conversation_labels_sync_empty():
    """Valida retorno de lista vazia se a conversa não tiver etiquetas."""
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = []
    
    with patch("httpx.Client.get") as mock_get:
        mock_get.return_value = mock_response
        
        labels = get_conversation_labels_sync(
            zapvoice_url="http://zapvoice-teste.com",
            client_id="1",
            conversation_id=123,
            token="test-token"
        )
        
        assert labels == []

def test_get_conversation_labels_sync_http_error():
    """Valida que retorna None se a API retornar erro HTTP (ex: 404, 500)."""
    mock_response = MagicMock()
    mock_response.status_code = 500
    mock_response.text = "Internal Server Error"
    
    with patch("httpx.Client.get") as mock_get:
        mock_get.return_value = mock_response
        
        labels = get_conversation_labels_sync(
            zapvoice_url="http://zapvoice-teste.com",
            client_id="1",
            conversation_id=123,
            token="test-token"
        )
        
        assert labels is None

def test_get_conversation_labels_sync_exception():
    """Valida que retorna None em caso de exceção de rede."""
    with patch("httpx.Client.get") as mock_get:
        mock_get.side_effect = httpx.RequestError("Erro de Conexão")
        
        labels = get_conversation_labels_sync(
            zapvoice_url="http://zapvoice-teste.com",
            client_id="1",
            conversation_id=123,
            token="test-token"
        )
        
        assert labels is None

def test_get_conversation_labels_sync_invalid_params():
    """Valida que retorna None se os parâmetros forem vazios/inválidos."""
    labels = get_conversation_labels_sync("", "0", 0, "")
    assert labels is None
