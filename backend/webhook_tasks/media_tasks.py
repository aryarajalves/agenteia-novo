import os
import asyncio
import logging
from celery_app import app
from database import SessionLocal
from models import WebhookEventModel, WebhookConfigModel
from agent_core.services.media_service import process_media_content
from .utils import _add_step

logger = logging.getLogger(__name__)

@app.task(name="webhook_tasks.process_media_content_task")
def process_media_content_task(webhook_config_id: int, event_id: int):
    """Processa áudio ou imagem imediatamente para extrair texto."""
    db = SessionLocal()
    try:
        event = db.query(WebhookEventModel).filter(WebhookEventModel.id == event_id).first()
        config = db.query(WebhookConfigModel).filter(WebhookConfigModel.id == webhook_config_id).first()
        if not event or not config:
            return

        msg_type = (event.message_type or "text").lower()
        if msg_type not in ["audio", "image"]:
            return

        _add_step(db, event_id, f"🔍 Processamento Imediato ({msg_type})", "Iniciando extração de conteúdo em paralelo...")
        
        openai_key = os.getenv("OPENAI_API_KEY")
        cw_token = config.zapvoice_api_token or os.getenv("ZAPVOICE_API_TOKEN", "")
        
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            media_result = loop.run_until_complete(process_media_content(
                url=event.link,
                message_type=msg_type,
                api_key=openai_key,
                chatwoot_token=cw_token
            ))
        finally:
            loop.close()

        if "error" in media_result:
            _add_step(db, event_id, "❌ Erro no processamento imediato", media_result["error"])
            return

        extracted_text = media_result.get("text", "")
        model_used = media_result.get("model") or "desconhecido"
        event.mensagem = extracted_text
        event.status = "media_ready" 
        db.commit()
        
        _add_step(
            db, 
            event_id, 
            "✅ Conteúdo Extraído", 
            f"Modelo de transcrição utilizado: {model_used}\n\nConteúdo: {extracted_text}",
            metadata={
                "full_text": extracted_text, 
                "model": model_used,
                "media_url": event.link,
                "media_type": msg_type
            }
        )
        
    except Exception as e:
        logger.error(f"Erro na task de mídia imediata: {e}")
    finally:
        db.close()
