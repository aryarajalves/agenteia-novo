import pytest
from unittest.mock import patch, MagicMock
from datetime import datetime, timedelta
from tasks import rescue_stuck_waiting_events

def test_rescue_stuck_waiting_events_execution():
    """Valida se a tarefa rescue_stuck_waiting_events localiza eventos expirados e os re-agenda via Mock."""
    
    with patch("tasks.SessionLocal") as mock_session_local, \
         patch("webhook_tasks.process_webhook_automation.delay") as mock_delay:
         
        mock_db = MagicMock()
        mock_session_local.return_value = mock_db
        
        # 1. Configurar eventos simulados do banco
        event_expired = MagicMock()
        event_expired.id = 123
        event_expired.status = "waiting"
        event_expired.telefone = "5511999999999"
        
        # O método .all() da query deve retornar apenas o evento expirado
        mock_db.query.return_value.filter.return_value.all.return_value = [event_expired]
        
        # Executar a task de resgate
        rescue_stuck_waiting_events()
        
        # Garante que process_webhook_automation.delay foi chamado com o ID do evento expirado (123)
        mock_delay.assert_called_once_with(123)
        
        # Garante que a sessão foi fechada no final
        mock_db.close.assert_called_once()
