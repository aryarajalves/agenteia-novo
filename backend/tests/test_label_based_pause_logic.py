import pytest
import json
import asyncio
from unittest.mock import AsyncMock, patch, MagicMock
from datetime import datetime, timedelta
from tasks import check_followup_due

def test_followup_respects_label_pause():
    """
    Testa se o disparador de follow-up respeita a etiqueta de pausa no Chatwoot.
    """
    mock_db = MagicMock()
    
    # 1. Mock das configs (15 colunas esperadas)
    mock_config = (
        1, "leads_test", "https://cw.test", "token", json.dumps([{"delay_minutes": 30, "type": "fixed", "fixed_message": "Followup"}]),
        "{}", 1, "humano", None, None, None, None, None, None, None
    )
    
    # Due leads: id, conta_id, conversa_id, telefone, nome, ref_time, lead_msg, agent_resp, lead_labels_raw
    mock_lead = (10, "1", "100", "5511999999999", "Cliente", datetime.utcnow() - timedelta(minutes=40), None, None, "[]")

    mock_db.execute.return_value.fetchall.side_effect = [
        [mock_config], # Configs
        [mock_lead],   # Due leads
    ]
    
    with patch("tasks.SessionLocal", return_value=mock_db), \
         patch("tasks._is_within_business_hours", return_value=True), \
         patch("tasks._generate_followup_message", return_value=("Followup", None)), \
         patch("tasks.asyncio.run") as mock_run, \
         patch("httpx.Client.post") as mock_post:
        
        mock_post.return_value = MagicMock(status_code=200)
        
        # Caso 1: Pausado
        mock_run.return_value = True # is_paused = True
        
        check_followup_due()
        
        # Se estiver pausado, não deve chamar o POST do Chatwoot para enviar mensagem
        assert mock_post.call_count == 0
        
        # Caso 2: Não pausado
        mock_run.return_value = False # is_paused = False
        
        # Reset fetchall side effect for second run
        mock_db.execute.return_value.fetchall.side_effect = [
            [mock_config],
            [mock_lead],
        ]
        
        check_followup_due()
        
        # Se não estiver pausado, deve chamar o POST
        assert mock_post.call_count == 1
