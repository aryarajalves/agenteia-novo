import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from webhooks.service import upsert_lead

@pytest.mark.asyncio
async def test_followup_on_reply_logic():
    mock_result = MagicMock()
    mock_result.fetchone.return_value = (10, "5585996123586", "[]", "Aryaraj")

    mock_conn = AsyncMock()
    mock_conn.execute.return_value = mock_result
    
    mock_engine = MagicMock()
    mock_engine.begin.return_value.__aenter__.return_value = mock_conn

    with patch("webhooks.service.engine", mock_engine):
        await upsert_lead(
            table_name="leads",
            data={
                "telefone": "5585996123586",
                "contato_nome": "Aryaraj",
                "mensagem": "Oi, tenho uma dúvida",
                "is_agent": False,
                "is_memory": False
            },
            webhook_config_id=1
        )
    
    # Verificar se a query UPDATE continha a lógica de followup_on_reply
    called_sql = str(mock_conn.execute.call_args[0][0])
    assert "followup_on_reply" in called_sql
    assert "followup_step = CASE" in called_sql

