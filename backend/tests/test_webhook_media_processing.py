import pytest
import json
import asyncio
from unittest.mock import patch, MagicMock, AsyncMock
from httpx import AsyncClient
from main import app
from database import get_db
from sqlalchemy.ext.asyncio import AsyncSession
from models import WebhookConfigModel, WebhookEventModel
from sqlalchemy import select

import random
import string

def random_token(prefix):
    return f"{prefix}_{''.join(random.choices(string.ascii_lowercase + string.digits, k=8))}"

@pytest.mark.asyncio
async def test_receive_webhook_text_message(client: AsyncClient, db_session: AsyncSession, monkeypatch):
    monkeypatch.setattr("webhooks.receiver.process_webhook_automation.apply_async", MagicMock())
    # Setup: Create a config
    token = random_token("text")
    config = WebhookConfigModel(
        name="Test Config",
        token=token,
        is_active=True,
        agent_id=None,
        leads_table="leads_test"
    )
    db_session.add(config)
    await db_session.commit()

    payload = {
        "event": "message_created",
        "content": "Olá mundo!",
        "message_type": "incoming",
        "sender": {"id": 1, "name": "User", "phone_number": "+5511999999999"},
        "inbox": {"id": 1, "name": "WhatsApp", "channel_type": "Channel::Whatsapp"},
        "conversation": {"id": 1}
    }

    response = await client.post(f"/webhooks/receive/{token}", json=payload)

    assert response.status_code == 200
    
    # Verify event type
    result = await db_session.execute(select(WebhookEventModel).where(WebhookEventModel.webhook_config_id == config.id))
    event = result.scalar_one()
    assert event.message_type == "text"
    assert event.mensagem == "Olá mundo!"

@pytest.mark.asyncio
async def test_receive_webhook_audio_transcription(client: AsyncClient, db_session: AsyncSession, monkeypatch):
    mock_media_task = MagicMock()
    monkeypatch.setattr("webhooks.receiver.process_media_content_task.delay", mock_media_task)
    monkeypatch.setattr("webhooks.receiver.process_webhook_automation.apply_async", MagicMock())
    
    # Setup
    token = random_token("audio")
    config = WebhookConfigModel(
        name="Test Config Audio",
        token=token,
        is_active=True,
        leads_table="leads_test"
    )
    db_session.add(config)
    await db_session.commit()

    payload = {
        "event": "message_created",
        "message_type": "incoming",
        "attachments": [
            {
                "file_type": "audio",
                "data_url": "https://example.com/audio.ogg"
            }
        ],
        "sender": {"id": 2, "name": "Audio User", "phone_number": "+5511888888888"},
        "inbox": {"id": 1, "name": "WhatsApp", "channel_type": "Channel::Whatsapp"},
        "conversation": {"id": 2}
    }

    response = await client.post(f"/webhooks/receive/{token}", json=payload)

    assert response.status_code == 200
    
    # Verify event and task dispatch
    result = await db_session.execute(select(WebhookEventModel).where(WebhookEventModel.webhook_config_id == config.id))
    event = result.scalar_one()
    assert event.message_type == "audio"
    assert mock_media_task.called
