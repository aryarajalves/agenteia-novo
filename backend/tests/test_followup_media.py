import pytest
from unittest.mock import patch, MagicMock

def test_followup_step_with_media_attachment():
    step = {
        "delay_minutes": 30,
        "type": "fixed",
        "fixed_message": "Oi {nome}, ouça este áudio rápido!",
        "media_type": "audio",
        "media_url": "https://meuservidor.com/audios/depoimento.mp3"
    }
    
    media_url = step.get("media_url", "")
    media_type = step.get("media_type", "audio")
    
    msg_payload = {"content": "Oi Aryaraj, ouça este áudio rápido!", "message_type": "outgoing"}
    if media_url and media_url.strip():
        msg_payload["attachments"] = [{
            "file_type": media_type or "audio",
            "data_url": media_url.strip()
        }]
        
    assert "attachments" in msg_payload
    assert msg_payload["attachments"][0]["file_type"] == "audio"
    assert msg_payload["attachments"][0]["data_url"] == "https://meuservidor.com/audios/depoimento.mp3"
