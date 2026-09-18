import pytest
from unittest.mock import MagicMock, AsyncMock, patch
from webhooks.service import upsert_lead

@pytest.mark.asyncio
async def test_upsert_lead_broadcasts_websocket_new_lead():
    """Valida que o upsert_lead transmite evento lead_created no WebSocket quando insere um novo lead."""
    fake_data = {
        "telefone": "5511999990001",
        "contato_nome": "Novo Lead Teste",
        "mensagem": "Olá, quero me inscrever",
        "is_agent": False
    }

    mock_engine_conn = AsyncMock()
    mock_cursor_existing = MagicMock()
    mock_cursor_existing.fetchone.return_value = None  # Novo lead
    mock_cursor_insert = MagicMock()
    mock_cursor_insert.scalar.return_value = 999  # ID retornado pelo RETURNING id

    mock_engine_conn.execute.side_effect = [mock_cursor_existing, mock_cursor_insert]

    mock_begin_ctx = MagicMock()
    mock_begin_ctx.__aenter__ = AsyncMock(return_value=mock_engine_conn)
    mock_begin_ctx.__aexit__ = AsyncMock(return_value=None)

    mock_engine = MagicMock()
    mock_engine.begin.return_value = mock_begin_ctx

    with patch("webhooks.service.engine", mock_engine), \
         patch("core.websocket.manager.broadcast", new_callable=AsyncMock) as mock_broadcast:

        await upsert_lead("leads_teste_table", fake_data, 42)

        mock_broadcast.assert_called_once()
        broadcast_arg = mock_broadcast.call_args[0][0]
        assert broadcast_arg["type"] == "lead_created"
        assert broadcast_arg["webhook_id"] == 42
        assert broadcast_arg["action"] == "create"
        assert broadcast_arg["lead_id"] == 999
        assert broadcast_arg["telefone"] == "5511999990001"


@pytest.mark.asyncio
async def test_upsert_lead_broadcasts_websocket_update_lead():
    """Valida que o upsert_lead transmite evento lead_updated no WebSocket quando atualiza um lead existente."""
    fake_data = {
        "telefone": "5511999990002",
        "contato_nome": "Lead Existente",
        "mensagem": "Mais uma dúvida",
        "is_agent": False
    }

    mock_engine_conn = AsyncMock()
    mock_cursor_existing = MagicMock()
    mock_cursor_existing.fetchone.return_value = (555,)  # Lead existente ID 555
    mock_cursor_update = MagicMock()

    mock_engine_conn.execute.side_effect = [mock_cursor_existing, mock_cursor_update]

    mock_begin_ctx = MagicMock()
    mock_begin_ctx.__aenter__ = AsyncMock(return_value=mock_engine_conn)
    mock_begin_ctx.__aexit__ = AsyncMock(return_value=None)

    mock_engine = MagicMock()
    mock_engine.begin.return_value = mock_begin_ctx

    with patch("webhooks.service.engine", mock_engine), \
         patch("core.websocket.manager.broadcast", new_callable=AsyncMock) as mock_broadcast:

        await upsert_lead("leads_teste_table", fake_data, 42)

        mock_broadcast.assert_called_once()
        broadcast_arg = mock_broadcast.call_args[0][0]
        assert broadcast_arg["type"] == "lead_updated"
        assert broadcast_arg["webhook_id"] == 42
        assert broadcast_arg["action"] == "update"
        assert broadcast_arg["lead_id"] == 555
