import os
from celery import Celery

# Configuração do Celery com Redis como Broker e Backend
redis_url = os.getenv("REDIS_URL", "redis://redis:6379/0")

app = Celery(
    "transcription_worker",
    broker=redis_url,
    backend=redis_url,
    include=["tasks", "webhook_tasks"]
)

# Configurações Adicionais
app.conf.update(
    task_track_started=True,
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='America/Sao_Paulo',
    enable_utc=True,
    worker_concurrency=1,
    beat_schedule={
        'check-window-expiry-5min': {
            'task': 'tasks.check_window_expiry',
            'schedule': 300.0,
        },
        'check-followup-due-1min': {
            'task': 'tasks.check_followup_due',
            'schedule': 60.0,
        },
        'check-backup-schedule-5min': {
            'task': 'tasks.check_backup_schedule',
            'schedule': 300.0,
        },
        'rescue-stuck-waiting-events-1min': {
            'task': 'tasks.rescue_stuck_waiting_events',
            'schedule': 60.0,
        },
        'cleanup-old-logs-daily': {
            'task': 'tasks.cleanup_old_logs',
            'schedule': 86400.0, # Executa 1 vez ao dia (a cada 24 horas)
        },
    },
)

if __name__ == "__main__":
    app.start()
