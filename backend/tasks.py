import os
import logging
import asyncio
from datetime import datetime, timedelta, timezone
from celery_app import app
from s3_service import s3_service
from transcription_service import transcribe_video
from database import SessionLocal
from models import TranscriptionTaskModel, WebhookEventModel, InteractionLog
import tiktoken

from services.window_expiry_service import execute_check_window_expiry
from services.followup_service import (
    is_within_business_hours,
    calculate_elapsed_business_minutes,
    format_delay_text,
    generate_followup_message,
    save_followup_event,
    execute_check_followup_due,
    _is_within_business_hours,
    _format_delay_text,
    _generate_followup_message,
    _save_followup_event
)
from zapvoice_utils import is_conversation_paused

logger = logging.getLogger(__name__)


# --- TAREFAS DE TRANSCRIÇÃO ---

@app.task(bind=True, max_retries=3)
def process_transcription_task(self, task_record_id: int, s3_key: str, config_dict: dict):
    """
    Processo completo de transcrição:
    1. Gera URL assinada do S3.
    2. Envia para AssemblyAI.
    3. Atualiza o banco de dados.
    4. Limpa o arquivo do S3.
    """
    logger.info(f"WORKER: Recebida tarefa de transcrição para o ID {task_record_id} (key: {s3_key})")
    db = SessionLocal()
    try:
        task = db.query(TranscriptionTaskModel).filter(TranscriptionTaskModel.id == task_record_id).first()
        if not task:
            logger.error(f"TASK: Registro {task_record_id} não encontrado no banco.")
            return

        task.status = "PROCESSING"
        task.task_id = self.request.id
        db.commit()

        audio_url = s3_service.generate_presigned_url(s3_key, expiration=86400)
        if not audio_url:
            raise Exception("Falha ao gerar URL do S3.")

        logger.info(f"TASK: Iniciando transcrição de {s3_key}")
        result = asyncio.run(transcribe_video(audio_url, config_dict))
        
        text = result.get("text") or ""
        duration = result.get("duration", 0)

        try:
            encoding = tiktoken.get_encoding("cl100k_base")
            tokens = len(encoding.encode(text))
        except Exception:
            tokens = len(text.split()) * 1.3
            
        cost_usd = duration * 0.0001027

        task.result_text = text
        task.duration = duration
        task.tokens = int(tokens)
        task.cost_usd = cost_usd
        task.status = "SUCCESS"
        db.commit()
        logger.info(f"TASK: Transcrição de {s3_key} concluída com sucesso.")

    except Exception as e:
        logger.error(f"TASK: Erro no processamento de {s3_key}: {str(e)}")
        task = db.query(TranscriptionTaskModel).filter(TranscriptionTaskModel.id == task_record_id).first()
        if task:
            task.status = "FAILURE"
            task.error_message = str(e)
            db.commit()
    
    finally:
        s3_service.delete_file(s3_key)
        db.close()


# --- TAREFA DE EXPIRAÇÃO DE JANELA (CHATWOOT) ---

@app.task(name="tasks.check_window_expiry")
def check_window_expiry():
    """Verifica janelas 24h expiradas e remove a etiqueta configurada do Chatwoot."""
    db = SessionLocal()
    try:
        execute_check_window_expiry(db)
    finally:
        db.close()


# --- TAREFA DE FOLLOW-UP AUTOMÁTICO ---

@app.task(name="tasks.check_followup_due")
def check_followup_due():
    """Envia follow-ups automáticos com mensagem gerada por IA para contatos que não responderam."""
    execute_check_followup_due()


# --- TAREFAS DE BACKUP ---

@app.task(name="tasks.check_backup_schedule")
def check_backup_schedule():
    """Verifica se há backup agendado devido e executa se necessário."""
    db = SessionLocal()
    try:
        from services.backup_service import BackupService
        config = BackupService.get_config(db)
        if not config.enabled:
            return

        now = datetime.now(timezone.utc)
        if not config.next_run:
            config.next_run = BackupService.calculate_next_run(config.frequency_type, config.interval_value)
            db.commit()
            return

        next_run_aware = config.next_run
        if next_run_aware.tzinfo is None:
            next_run_aware = next_run_aware.replace(tzinfo=timezone.utc)

        if now >= next_run_aware:
            logger.info("⏰ Horário do backup agendado atingido. Disparando backup...")
            config.next_run = BackupService.calculate_next_run(config.frequency_type, config.interval_value)
            db.commit()
            BackupService.run_backup(db, is_automatic=True)
    except Exception as e:
        logger.error(f"[BackupSchedule] Erro ao verificar cronograma de backup: {e}")
    finally:
        db.close()


@app.task(name="tasks.trigger_manual_backup")
def trigger_manual_backup():
    """Executa um backup manual em background."""
    db = SessionLocal()
    try:
        from services.backup_service import BackupService
        BackupService.run_backup(db, is_automatic=False)
    except Exception as e:
        logger.error(f"[ManualBackup] Erro ao disparar backup manual: {e}")
    finally:
        db.close()


# --- TAREFAS DE RESGATE E RETENÇÃO DE LOGS ---

@app.task(name="tasks.rescue_stuck_waiting_events")
def rescue_stuck_waiting_events():
    """Busca eventos em status 'waiting' cujo scheduled_at já passou e re-agenda o processamento."""
    db = SessionLocal()
    try:
        from core.timezone import get_now_br
        from webhook_tasks import process_webhook_automation
        
        now = get_now_br()
        events = db.query(WebhookEventModel).filter(
            WebhookEventModel.status == "waiting",
            WebhookEventModel.scheduled_at <= now
        ).all()
        
        if not events:
            return
            
        logger.info(f"📍 [Rescue System] Encontrados {len(events)} eventos pendentes/travados para resgate.")
        for event in events:
            logger.info(f"📍 [Rescue System] Resgatando evento {event.id} para telefone {event.telefone}")
            process_webhook_automation.delay(event.id)
            
    except Exception as e:
        logger.error(f"Erro na execução da tarefa de resgate periódico: {e}")
    finally:
        db.close()


@app.task(name="tasks.cleanup_old_logs")
def cleanup_old_logs():
    """Expurga eventos de webhook e logs de interação mais antigos que LOG_RETENTION_DAYS (default: 60 dias)."""
    db = SessionLocal()
    try:
        retention_days = int(os.getenv("LOG_RETENTION_DAYS", "60"))
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=retention_days)
        logger.info(f"🧹 [LOG CLEANUP] Iniciando expurgo de logs anteriores a {cutoff_date.isoformat()} ({retention_days} dias)...")

        deleted_webhooks = db.query(WebhookEventModel).filter(
            WebhookEventModel.created_at < cutoff_date
        ).delete(synchronize_session=False)

        deleted_interactions = db.query(InteractionLog).filter(
            InteractionLog.timestamp < cutoff_date
        ).delete(synchronize_session=False)

        db.commit()
        logger.info(
            f"✅ [LOG CLEANUP] Concluído: {deleted_webhooks} eventos de webhook e "
            f"{deleted_interactions} logs de interação expurgados com sucesso."
        )
    except Exception as e:
        db.rollback()
        logger.error(f"❌ [LOG CLEANUP] Erro durante o expurgo periódico de logs: {e}")
    finally:
        db.close()
