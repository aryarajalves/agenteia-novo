import os
import json
import logging
import httpx
import asyncio
import anthropic
from datetime import datetime, timedelta, timezone
import zoneinfo
from celery_app import app
from s3_service import s3_service
from transcription_service import transcribe_video
from database import SessionLocal
from models import TranscriptionTaskModel, WebhookEventModel, InteractionLog
from sqlalchemy import text as _text
import tiktoken
from zapvoice_utils import is_conversation_paused
from config_store import USD_TO_BRL, MODEL_INFO

logger = logging.getLogger(__name__)

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
        # 0. Marcar como PROCESSANDO
        task = db.query(TranscriptionTaskModel).filter(TranscriptionTaskModel.id == task_record_id).first()
        if not task:
            logger.error(f"TASK: Registro {task_record_id} não encontrado no banco.")
            return

        task.status = "PROCESSING"
        task.task_id = self.request.id
        db.commit()

        # 1. Obter URL do S3 para o AssemblyAI (válido por 24h)
        audio_url = s3_service.generate_presigned_url(s3_key, expiration=86400)
        
        if not audio_url:
            raise Exception("Falha ao gerar URL do S3.")

        # 2. Chamar Transcrição (AssemblyAI aceita URL direta)
        # Nota: O transcribe_video no service precisa suportar URL ou arquivo.
        # Vamos passar a URL como se fosse o path.
        logger.info(f"TASK: Iniciando transcrição de {s3_key}")
        result = asyncio.run(transcribe_video(audio_url, config_dict))
        
        text = result.get("text") or ""
        duration = result.get("duration", 0)

        # 3. Cálculo de Tokens
        try:
            encoding = tiktoken.get_encoding("cl100k_base")
            tokens = len(encoding.encode(text))
        except:
            tokens = len(text.split()) * 1.3
            
        # Custo: ~$0.37/hora -> $0.0001027/segundo
        cost_usd = duration * 0.0001027

        # 4. Sucesso! Salvar resultados
        task.result_text = text
        task.duration = duration
        task.tokens = int(tokens)
        task.cost_usd = cost_usd
        task.status = "SUCCESS"
        db.commit()
        logger.info(f"TASK: Transcrição de {s3_key} concluída com sucesso.")

    except Exception as e:
        logger.error(f"TASK: Erro no processamento de {s3_key}: {str(e)}")
        # Tentar novamente se for erro de rede/IA
        task = db.query(TranscriptionTaskModel).filter(TranscriptionTaskModel.id == task_record_id).first()
        if task:
            task.status = "FAILURE"
            task.error_message = str(e)
            db.commit()
    
    finally:
        # 5. Limpeza: Remover arquivo do S3 independente do sucesso
        # S3 custa dinheiro, economize!
        s3_service.delete_file(s3_key)
        db.close()


@app.task(name="tasks.check_window_expiry")
def check_window_expiry():
    """Verifica janelas 24h expiradas e remove a etiqueta configurada do Chatwoot."""
    cw_url_global = (os.getenv("CHATWOOT_URL") or "").rstrip("/")
    cw_token_global = os.getenv("CHATWOOT_API_TOKEN") or ""

    db = SessionLocal()
    try:
        configs = db.execute(
            _text("SELECT id, leads_table, chatwoot_url, chatwoot_api_token, window_close_label FROM webhook_configs WHERE window_close_label IS NOT NULL AND window_close_label != '' AND window_close_label != '[]'")
        ).fetchall()

        for row in configs:
            config_id, leads_table, cw_url_cfg, cw_token_cfg, window_close_label_raw = row
            cw_url = (cw_url_cfg or cw_url_global or "").rstrip("/")
            cw_token = cw_token_cfg or cw_token_global

            try:
                labels_to_remove = json.loads(window_close_label_raw) if window_close_label_raw else []
            except Exception:
                labels_to_remove = [window_close_label_raw] if window_close_label_raw else []

            if not cw_url or not cw_token or not labels_to_remove or not leads_table:
                continue

            try:
                # Compara usando a data atual UTC para evitar problemas de fuso horário.
                # timezone('utc', now()) funciona no Postgres.
                # Em SQLite (usado em testes locais ou memória em alguns casos), timezone() não existe,
                # então usamos um fallback seguro (detectando o dialeto ou usando datetime.utcnow() no Python)
                is_sqlite = db.bind.dialect.name == "sqlite"
                if is_sqlite:
                    cutoff = datetime.utcnow() - timedelta(hours=24)
                    query = f"""
                        SELECT id, conta_id, conversa_id, telefone
                        FROM {leads_table}
                        WHERE ultima_mensagem_em < :cutoff
                          AND (window_close_processed IS NULL OR window_close_processed = FALSE)
                          AND conversa_id IS NOT NULL
                          AND conta_id IS NOT NULL
                    """
                    params = {"cutoff": cutoff}
                else:
                    query = f"""
                        SELECT id, conta_id, conversa_id, telefone
                        FROM {leads_table}
                        WHERE ultima_mensagem_em < (timezone('utc', now()) - INTERVAL '24 hours')
                          AND (window_close_processed IS NULL OR window_close_processed = FALSE)
                          AND conversa_id IS NOT NULL
                          AND conta_id IS NOT NULL
                    """
                    params = {}

                expired = db.execute(_text(query), params).fetchall()

                if not expired:
                    continue

                processed_ids = []
                for lead_id, conta_id, conversa_id, telefone in expired:
                    success = False
                    updated_labels = None
                    try:
                        labels_url = f"{cw_url}/api/v1/accounts/{conta_id}/conversations/{conversa_id}/labels"
                        headers = {"api_access_token": cw_token}
                        with httpx.Client(timeout=8) as client:
                            cur = client.get(labels_url, headers=headers)
                            
                            if cur.status_code == 404:
                                logger.info(f"[WindowExpiry] Conversa {conversa_id} não encontrada (404) para lead {lead_id}, marcando como processado.")
                                success = True
                            elif cur.status_code == 200:
                                current_labels = cur.json().get("payload", [])
                                updated = [l for l in current_labels if l not in labels_to_remove]
                                
                                if len(updated) < len(current_labels):
                                    post_resp = client.post(labels_url, json={"labels": updated}, headers=headers)
                                    if post_resp.status_code in (200, 201):
                                        logger.info(f"[WindowExpiry] Removidas etiquetas {labels_to_remove} de {telefone} (conversa {conversa_id})")
                                        success = True
                                        updated_labels = updated
                                    else:
                                        logger.warning(f"[WindowExpiry] Erro ao remover etiquetas no Chatwoot (POST retornou {post_resp.status_code}) para lead {lead_id}")
                                else:
                                    logger.info(f"[WindowExpiry] Conversa {conversa_id} do lead {lead_id} já não possui etiquetas {labels_to_remove}")
                                    success = True
                                    updated_labels = current_labels
                            else:
                                logger.warning(f"[WindowExpiry] Erro ao buscar etiquetas no Chatwoot (GET retornou {cur.status_code}) para lead {lead_id}")
                    except Exception as e:
                        logger.warning(f"[WindowExpiry] Exceção de rede/API no lead {lead_id}: {e}")
                    
                    if success:
                        processed_ids.append(lead_id)
                        try:
                            # Sincroniza a remoção da etiqueta localmente no banco para que o dashboard mostre as etiquetas corretas
                            if updated_labels is None:
                                row_labels = db.execute(_text(f"SELECT labels FROM {leads_table} WHERE id = :id"), {"id": lead_id}).fetchone()
                                current_lbls = []
                                if row_labels and row_labels[0]:
                                    try:
                                        current_lbls = json.loads(row_labels[0])
                                    except Exception:
                                        current_lbls = []
                                updated_labels = [l for l in current_lbls if l not in labels_to_remove]

                            db.execute(
                                _text(f"UPDATE {leads_table} SET window_close_processed = TRUE, labels = :labels WHERE id = :id"),
                                {"labels": json.dumps(updated_labels, ensure_ascii=False), "id": lead_id}
                            )
                            db.commit()
                        except Exception as db_err:
                            logger.warning(f"[WindowExpiry] Erro ao atualizar labels do lead {lead_id} no banco local: {db_err}")
                            db.rollback()

            except Exception as e:
                logger.error(f"[WindowExpiry] Erro na config {config_id}: {e}")
                db.rollback()
    finally:
        db.close()


def _is_within_business_hours(bh: dict | str | None) -> bool:
    """Returns True if current time is within configured business hours (or if no restriction set)."""
    if not bh:
        return True
    if isinstance(bh, str):
        try:
            bh = json.loads(bh)
        except Exception:
            return True
    if not isinstance(bh, dict) or not bh.get("enabled"):
        return True

    now = datetime.now(zoneinfo.ZoneInfo("America/Sao_Paulo"))
    weekday = now.weekday()  # 0=Mon … 6=Sun
    allowed_day = (
        (weekday < 5 and bh.get("weekdays", True)) or
        (weekday == 5 and bh.get("saturday", False)) or
        (weekday == 6 and bh.get("sunday", False))
    )
    if not allowed_day:
        return False
    current = now.strftime("%H:%M")
    start = bh.get("start", "08:00")
    end = bh.get("end", "20:00")
    return start <= current <= end

def calculate_elapsed_business_minutes(start_time: datetime, end_time: datetime, bh: dict | str | None) -> float:
    """
    Calculates the exact number of minutes elapsed between start_time and end_time,
    counting ONLY the minutes that fall within the configured business hours.
    start_time and end_time MUST be naive UTC datetimes from the DB (representing UTC).
    """
    if not bh:
        diff = end_time - start_time
        return diff.total_seconds() / 60.0

    if isinstance(bh, str):
        try:
            bh = json.loads(bh)
        except Exception:
            bh = None

    if not isinstance(bh, dict) or not bh.get("enabled"):
        diff = end_time - start_time
        return diff.total_seconds() / 60.0

    # Ensure we use America/Sao_Paulo for business logic
    sp_tz = zoneinfo.ZoneInfo("America/Sao_Paulo")
    
    # DB datetimes are UTC naive. Make them aware, then convert to SP time.
    start_dt = start_time.replace(tzinfo=zoneinfo.ZoneInfo("UTC")).astimezone(sp_tz)
    end_dt = end_time.replace(tzinfo=zoneinfo.ZoneInfo("UTC")).astimezone(sp_tz)

    if start_dt >= end_dt:
        return 0.0

    total_minutes = 0.0
    
    # Parse BH start and end
    bh_start_str = bh.get("start", "08:00")
    bh_end_str = bh.get("end", "20:00")
    
    try:
        h_start, m_start = map(int, bh_start_str.split(":"))
        h_end, m_end = map(int, bh_end_str.split(":"))
    except Exception:
        h_start, m_start = 8, 0
        h_end, m_end = 20, 0

    current = start_dt

    while current < end_dt:
        weekday = current.weekday()
        allowed_day = (
            (weekday < 5 and bh.get("weekdays", True)) or
            (weekday == 5 and bh.get("saturday", False)) or
            (weekday == 6 and bh.get("sunday", False))
        )
        
        # Calculate boundaries for the current day
        day_start = current.replace(hour=h_start, minute=m_start, second=0, microsecond=0)
        day_end = current.replace(hour=h_end, minute=m_end, second=0, microsecond=0)
        
        # End of the current day calculation segment
        next_day = (current + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
        segment_end = min(end_dt, next_day)

        if allowed_day:
            overlap_start = max(current, day_start)
            overlap_end = min(segment_end, day_end)
            
            if overlap_start < overlap_end:
                diff = overlap_end - overlap_start
                total_minutes += diff.total_seconds() / 60.0
                
        current = segment_end

    return total_minutes


def _format_delay_text(delay_minutes: float) -> str:
    mins = int(delay_minutes)
    if mins < 60:
        return f"{mins} minutos"
    elif mins >= 1440 and mins % 1440 == 0:
        d = mins // 1440
        return f"{d} dia" if d == 1 else f"{d} dias"
    else:
        h = round(delay_minutes / 60.0, 1)
        if h == int(h):
            h = int(h)
        return f"{h} hora" if h == 1 else f"{h} horas"


def _generate_followup_message(cw_url: str, cw_token: str, conta_id: str, conversa_id: str, delay_minutes: float, nome: str, custom_prompt: str | None = None, lead_msg: str | None = None, agent_resp: str | None = None) -> tuple[str | None, any]:
    """Busca as últimas 5 mensagens do Chatwoot/ZapVoice ou usa fallback do banco de dados para gerar follow-up contextual."""
    history = ""
    try:
        if cw_url and cw_token and conta_id and conversa_id and str(conversa_id).strip() != "None":
            with httpx.Client(timeout=10) as client:
                resp = client.get(
                    f"{cw_url}/api/v1/accounts/{conta_id}/conversations/{conversa_id}/messages",
                    headers={"api_access_token": cw_token}
                )
            if resp.status_code == 200:
                all_msgs = resp.json().get("payload", {})
                if isinstance(all_msgs, dict):
                    all_msgs = all_msgs.get("messages", [])

                text_msgs = [m for m in all_msgs if m.get("content") and m.get("message_type") in (0, 1)]
                text_msgs.sort(key=lambda m: m.get("created_at", 0))
                last_5 = text_msgs[-5:]

                if last_5 and last_5[-1].get("message_type") == 0:
                    logger.info(f"[FollowUp] Lead enviou a última mensagem na conversa {conversa_id}. Cancelando envio do follow-up.")
                    return "LEAD_RESPONDED", None

                if last_5:
                    history_lines = []
                    for m in last_5:
                        role = "Usuário" if m.get("message_type") == 0 else "Agente"
                        history_lines.append(f"{role}: {m['content'].strip()}")
                    history = "\n".join(history_lines)
    except Exception as e:
        logger.warning(f"[FollowUp] Aviso/Erro ao buscar histórico da API: {e}")

    if not history:
        h_parts = []
        if lead_msg and str(lead_msg).strip():
            h_parts.append(f"Usuário: {str(lead_msg).strip()}")
        if agent_resp and str(agent_resp).strip():
            h_parts.append(f"Agente: {str(agent_resp).strip()}")
        history = "\n".join(h_parts) if h_parts else "Agente: Olá! Como posso te ajudar?"

    delay_str = _format_delay_text(delay_minutes)

    if custom_prompt and custom_prompt.strip():
        instruction_text = (
            f"Diretriz/Instrução específica para este disparo de follow-up: {custom_prompt.strip()}\n\n"
            "Crie uma mensagem de follow-up curta, natural e amigável seguindo a instrução específica acima. "
            "Não mencione o tempo decorrido. Responda APENAS com a mensagem, sem explicações."
        )
    else:
        instruction_text = (
            "Crie uma mensagem de follow-up curta, natural e amigável que retome o assunto da última pergunta "
            "feita pelo Agente. Não mencione o tempo decorrido. Responda APENAS com a mensagem, sem explicações."
        )

    ai_client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
    result = ai_client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=300,
        messages=[{
            "role": "user",
            "content": (
                f"Você é um assistente de atendimento. O contato '{nome}' não respondeu há {delay_str}.\n\n"
                f"Histórico recente da conversa:\n{history}\n\n"
                f"{instruction_text}"
            )
        }]
    )
    return result.content[0].text.strip(), result.usage


def _save_followup_event(db, config_id, conta_id, conversa_id, telefone, nome, message, steps, status, step_index: int = 0):
    """Registra evento de log em webhook_events para que apareça no histórico do lead no frontend e conste como memória."""
    try:
        if status == "processed" and message:
            db.execute(_text("""
                INSERT INTO webhook_events (
                    webhook_config_id, conta_id, conversa_id, telefone, contato_nome,
                    mensagem, agent_response, dono, status, event_type, message_type,
                    processing_steps, created_at
                ) VALUES (
                    :wid, :conta, :conv, :tel, :nome,
                    :msg, :resp, 'Agente', 'processed', 'followup', 'text',
                    :steps, :created_at
                )
            """), {
                "wid": config_id,
                "conta": str(conta_id),
                "conv": str(conversa_id),
                "tel": telefone,
                "nome": nome or telefone,
                "msg": f"🔄 [Follow-Up Passo #{step_index + 1}]",
                "resp": message,
                "steps": json.dumps(steps, ensure_ascii=False),
                "created_at": datetime.utcnow()
            })
            db.commit()
    except Exception as e:
        logger.error(f"[FollowUp] Erro ao salvar evento no webhook_events: {e}")


@app.task(name="tasks.check_followup_due")
def check_followup_due():
    """Envia follow-ups automáticos com mensagem gerada por IA para contatos que não responderam."""
    cw_url_global = (os.getenv("CHATWOOT_URL") or "").rstrip("/")
    cw_token_global = os.getenv("CHATWOOT_API_TOKEN") or ""

    db = SessionLocal()
    try:
        configs = db.execute(_text(
            "SELECT id, leads_table, chatwoot_url, chatwoot_api_token, followup_steps, followup_business_hours, agent_id, ignore_by_label, followup_cancel_label, followup_required_label, zapvoice_url, zapvoice_api_token, zapvoice_client_id, followup_add_label "
            "FROM webhook_configs "
            "WHERE followup_enabled = TRUE AND followup_steps IS NOT NULL AND followup_steps != '' AND followup_steps != '[]'"
        )).fetchall()

        for config_id, leads_table, cw_url_cfg, cw_token_cfg, followup_steps_raw, followup_bh_raw, agent_id, ignore_by_label, followup_cancel_label, followup_required_label, zv_url_cfg, zv_token_cfg, zv_client_cfg, followup_add_label in configs:
            cw_url = (cw_url_cfg or zv_url_cfg or cw_url_global or os.getenv("ZAPVOICE_URL") or "").rstrip("/")
            cw_token = cw_token_cfg or zv_token_cfg or cw_token_global or os.getenv("ZAPVOICE_API_TOKEN") or ""

            try:
                steps = json.loads(followup_steps_raw)
            except Exception:
                continue

            try:
                business_hours = json.loads(followup_bh_raw) if followup_bh_raw else None
            except Exception:
                business_hours = None

            if not steps or not cw_url or not cw_token or not leads_table:
                continue

            if not _is_within_business_hours(business_hours):
                logger.info(f"[FollowUp] Config {config_id} fora do horário comercial, pulando.")
                continue

            # Montar lista de etiquetas de cancelamento 100%
            cancel_labels_list = []
            if ignore_by_label:
                cancel_labels_list.extend([l.strip() for l in ignore_by_label.split(",") if l.strip()])
            if followup_cancel_label:
                cancel_labels_list.extend([l.strip() for l in followup_cancel_label.split(",") if l.strip()])
            if not cancel_labels_list:
                cancel_labels_list = ["humano"]

            for step_index, step in enumerate(steps):
                delay_hours = float(step.get("delay_hours", 0))
                # Suporta novo formato (minutos) ou fallback pro legado
                delay_minutes = int(step.get("delay_minutes", delay_hours * 60))
                if delay_minutes <= 0:
                    continue

                try:
                    # Busca leads no step_index inativos há até 30 dias (suporta passos de minutos, horas ou dias)
                    cutoff_30d = datetime.utcnow() - timedelta(days=30)
                    due = db.execute(_text(f"""
                        SELECT id, conta_id, conversa_id, telefone, contato_nome, ultima_mensagem_em, mensagem, ultima_resposta_agente, labels
                        FROM {leads_table}
                        WHERE followup_step = :step_index
                          AND ultima_mensagem_em >= :cutoff_30d
                    """), {"step_index": step_index, "cutoff_30d": cutoff_30d}).fetchall()

                    if not due:
                        continue

                    # Tempo atual (UTC naive, vindo do datetime.utcnow equivalente no PostgreSQL)
                    now_utc = datetime.utcnow()

                    for lead_id, conta_id, conversa_id, telefone, nome, ultima_msg_em, lead_msg, agent_resp, lead_labels_raw in due:
                        if not ultima_msg_em:
                            continue

                        # Calcula o tempo passado considerando o horário comercial
                        elapsed_minutes = calculate_elapsed_business_minutes(ultima_msg_em, now_utc, business_hours)
                        
                        if elapsed_minutes >= delay_minutes:
                            eff_conta_id = str(conta_id or zv_client_cfg or "1")
                            eff_conversa_id = str(conversa_id or "1")

                            # --- VALIDAÇÃO DE SEGURANÇA POR ETIQUETA (Smart Triggers) ---
                            try:
                                # Parse etiquetas locais do banco de dados
                                local_labels = []
                                if lead_labels_raw:
                                    try:
                                        local_labels = json.loads(lead_labels_raw) if isinstance(lead_labels_raw, str) else lead_labels_raw
                                        if not isinstance(local_labels, list): local_labels = []
                                    except Exception:
                                        local_labels = [x.strip() for x in str(lead_labels_raw).split(",") if x.strip()]
                                local_labels_lower = [str(x).lower().strip() for x in local_labels]

                                # 1. Checar etiquetas de cancelamento 100%
                                is_cancelled = False
                                for cancel_lbl in cancel_labels_list:
                                    c_lbl_lower = cancel_lbl.lower().strip()
                                    if c_lbl_lower in local_labels_lower:
                                        is_cancelled = True
                                    elif cw_url and cw_token and conta_id and conversa_id and str(conversa_id).strip() != "None":
                                        if asyncio.run(is_conversation_paused(cw_url, str(conta_id), str(conversa_id), cw_token, cancel_lbl)):
                                            is_cancelled = True

                                    if is_cancelled:
                                        logger.info(f"[FollowUp] Pulando e desativando 100% {telefone} devido à etiqueta '{cancel_lbl}'.")
                                        db.execute(_text(f"UPDATE {leads_table} SET followup_step = -1 WHERE id = :id"), {"id": lead_id})
                                        db.commit()
                                        break
                                
                                if is_cancelled:
                                    continue

                                # 2. Checar etiqueta obrigatória se configurada
                                if followup_required_label and followup_required_label.strip():
                                    req_lbl = followup_required_label.strip().lower()
                                    has_req = req_lbl in local_labels_lower
                                    if not has_req and cw_url and cw_token and conta_id and conversa_id and str(conversa_id).strip() != "None":
                                        has_req = asyncio.run(is_conversation_paused(cw_url, str(conta_id), str(conversa_id), cw_token, followup_required_label.strip()))
                                    if not has_req:
                                        logger.info(f"[FollowUp] Pulando {telefone}: não possui a etiqueta obrigatória '{followup_required_label.strip()}'.")
                                        continue

                            except Exception as e_lbl:
                                logger.warning(f"[FollowUp] Erro ao validar etiquetas para {telefone}: {e_lbl}")

                            pipeline_steps = [
                                {
                                    "step": f"Avaliando Disparo: Follow-Up {step_index+1}", 
                                    "detail": f"Tempo de espera estipulado ({delay_minutes}min) foi alcançado ou excedido. Tempo de inatividade decorrido: {int(elapsed_minutes)} minutos úteis.", 
                                    "timestamp": datetime.utcnow().isoformat()
                                }
                            ]
                            try:
                                step_type = step.get("type", "ai")
                                custom_prompt = step.get("custom_prompt", "")
                                fixed_message = step.get("fixed_message", "")

                                if step_type == "fixed" and fixed_message and fixed_message.strip():
                                    primeiro_nome = (nome or "").strip().split()[0] if nome else "Cliente"
                                    message = fixed_message.replace("{nome}", nome or "Cliente") \
                                                           .replace("{primeiro_nome}", primeiro_nome) \
                                                           .replace("{telefone}", telefone or "")
                                    ai_usage = None
                                    pipeline_steps.append({
                                        "step": "Usando Template de Mensagem Fixa", 
                                        "detail": f"Mensagem de template personalizada formatada para {nome or telefone}.", 
                                        "timestamp": datetime.utcnow().isoformat()
                                    })
                                elif step_type == "whatsapp_template":
                                    template_name = step.get("template_name") or ""
                                    template_language = step.get("language", "pt_BR")
                                    template_variables = step.get("template_variables") or {}
                                    template_header_media = step.get("template_header_media") or ""
                                    template_header_type = step.get("template_header_type") or "IMAGE"
                                    
                                    primeiro_nome = (nome or "").strip().split()[0] if nome else "Cliente"
                                    
                                    def resolve_val(raw_v):
                                        if not raw_v: return ""
                                        return str(raw_v).replace("{nome}", nome or "Cliente") \
                                                         .replace("{primeiro_nome}", primeiro_nome) \
                                                         .replace("{telefone}", telefone or "")
                                    
                                    components_payload = []
                                    
                                    # 1. Header Media (IMAGE, VIDEO, DOCUMENT)
                                    if template_header_media and template_header_media.strip():
                                        media_link = resolve_val(template_header_media.strip())
                                        media_type_key = template_header_type.lower()
                                        components_payload.append({
                                            "type": "header",
                                            "parameters": [
                                                {
                                                    "type": media_type_key,
                                                    media_type_key: {
                                                        "link": media_link
                                                    }
                                                }
                                            ]
                                        })
                                    
                                    # 2. Header Text Variables
                                    header_var_keys = sorted([k for k in template_variables.keys() if k.startswith("header_")])
                                    if header_var_keys:
                                        header_params = []
                                        for hk in header_var_keys:
                                            val = resolve_val(template_variables.get(hk, ""))
                                            header_params.append({"type": "text", "text": val})
                                        components_payload.append({
                                            "type": "header",
                                            "parameters": header_params
                                        })
                                        
                                    # 3. Body Text Variables
                                    body_var_keys = sorted([k for k in template_variables.keys() if k.startswith("body_")], key=lambda x: int(x.split("_")[1]) if x.split("_")[1].isdigit() else 0)
                                    if body_var_keys:
                                        body_params = []
                                        for bk in body_var_keys:
                                            val = resolve_val(template_variables.get(bk, ""))
                                            body_params.append({"type": "text", "text": val})
                                        components_payload.append({
                                            "type": "body",
                                            "parameters": body_params
                                        })

                                    processed_components = components_payload if components_payload else (step.get("template_components") or [])

                                    message = f"[Template Oficial]: {template_name}"
                                    ai_usage = None
                                    pipeline_steps.append({
                                        "step": "📱 Disparando Template WhatsApp Oficial", 
                                        "detail": f"Template: '{template_name}' ({template_language}) com {len(processed_components)} componente(s) dinâmicos via API Oficial ZapVoice.", 
                                        "timestamp": datetime.utcnow().isoformat()
                                    })
                                else:
                                    pipeline_steps.append({
                                        "step": "Gerando mensagem do Agente com IA", 
                                        "detail": f"Consultando histórico recente. Diretriz do Passo: '{custom_prompt or 'Padrão'}'", 
                                        "timestamp": datetime.utcnow().isoformat()
                                    })
                                    message, ai_usage = _generate_followup_message(cw_url, cw_token, eff_conta_id, eff_conversa_id, delay_minutes, nome or telefone, custom_prompt=custom_prompt, lead_msg=lead_msg, agent_resp=agent_resp)
                                
                                if message == "LEAD_RESPONDED":
                                    logger.info(f"[FollowUp] Lead {telefone} respondeu a conversa recentemente. Interrompendo disparo.")
                                    pipeline_steps.append({"step": "Interrompido", "detail": "O cliente enviou uma mensagem na conversa. Ciclo de follow-up interrompido automaticamente.", "timestamp": datetime.utcnow().isoformat()})
                                    _save_followup_event(db, config_id, eff_conta_id, eff_conversa_id, telefone, nome, None, pipeline_steps, "lead_responded")
                                    continue

                                if not message:
                                    logger.warning(f"[FollowUp] Não foi possível gerar mensagem para lead {lead_id}, pulando.")
                                    pipeline_steps.append({"step": "Erro", "detail": "Não foi possível gerar a mensagem de follow-up com a IA.", "timestamp": datetime.utcnow().isoformat()})
                                    _save_followup_event(db, config_id, eff_conta_id, eff_conversa_id, telefone, nome, None, pipeline_steps, "error")
                                    continue
                                
                                usage_meta = {}
                                if ai_usage:
                                    usage_meta = {
                                        "model": "claude-haiku-4-5-20251001",
                                        "usage": {
                                            "input_tokens": getattr(ai_usage, 'input_tokens', 0),
                                            "output_tokens": getattr(ai_usage, 'output_tokens', 0)
                                        }
                                    }
                                pipeline_steps.append({
                                    "step": "Mensagem gerada e encaminhada", 
                                    "detail": "Resposta final estruturada com inteligência artificial para o cliente.", 
                                    "timestamp": datetime.utcnow().isoformat(),
                                    "metadata": usage_meta if usage_meta else None
                                })

                                media_url = step.get("media_url", "")
                                media_type = step.get("media_type", "audio")

                                msg_payload = {"content": message or "", "message_type": "outgoing"}
                                if media_url and media_url.strip():
                                    msg_payload["attachments"] = [{
                                        "file_type": media_type or "audio",
                                        "data_url": media_url.strip()
                                    }]
                                    pipeline_steps.append({
                                        "step": "🎙️ Anexando Mídia / Áudio Humanizado", 
                                        "detail": f"Tipo: {(media_type or 'audio').upper()} | URL: {media_url.strip()}", 
                                        "timestamp": datetime.utcnow().isoformat()
                                    })

                                sent_ok = False
                                status_code_res = 500

                                # Caso seja Template Oficial do WhatsApp
                                if step_type == "whatsapp_template":
                                    zv_url = cw_url or "http://zapvoice_app:8000"
                                    zv_token = cw_token
                                    zv_client_id = eff_conta_id
                                    
                                    from zapvoice_utils import send_zapvoice_whatsapp_template
                                    import asyncio
                                    try:
                                        loop = asyncio.new_event_loop()
                                        asyncio.set_event_loop(loop)
                                        sent_ok, zv_res = loop.run_until_complete(
                                            send_zapvoice_whatsapp_template(
                                                zapvoice_url=zv_url,
                                                token=zv_token,
                                                client_id=zv_client_id,
                                                phone=telefone,
                                                template_name=template_name,
                                                language=template_language,
                                                components=processed_components
                                            )
                                        )
                                        loop.close()
                                        status_code_res = 200 if sent_ok else 500
                                    except Exception as e_send_tpl:
                                        logger.error(f"[FollowUp] Erro ao disparar template ZapVoice para {telefone}: {e_send_tpl}")
                                        sent_ok = False
                                        status_code_res = 500
                                else:
                                    # 1. Tentativa via Chatwoot / ZapVoice padrão
                                    try:
                                        msg_url = f"{cw_url}/api/v1/accounts/{eff_conta_id}/conversations/{eff_conversa_id}/messages"
                                        headers = {"api_access_token": cw_token, "Content-Type": "application/json"}
                                        with httpx.Client(timeout=10) as client:
                                            resp = client.post(msg_url, json=msg_payload, headers=headers)
                                            status_code_res = resp.status_code
                                            if resp.status_code in (200, 201):
                                                sent_ok = True
                                    except Exception as e_post1:
                                        logger.warning(f"[FollowUp] Tentativa 1 de envio para {telefone} falhou: {e_post1}")

                                    # 2. Tentativa via Rota alternativa do ZapVoice
                                    if not sent_ok and cw_url:
                                        try:
                                            zv_base = cw_url.rstrip("/")
                                            if not zv_base.endswith("/api"): zv_base = f"{zv_base}/api"
                                            zv_msg_url = f"{zv_base}/chat/conversations/{eff_conversa_id}/messages"
                                            zv_headers = {
                                                "Authorization": f"Bearer {cw_token}",
                                                "X-Client-ID": str(eff_conta_id),
                                                "Content-Type": "application/json"
                                            }
                                            with httpx.Client(timeout=10) as client:
                                                resp_zv = client.post(zv_msg_url, json={"content": message, "is_private": False}, headers=zv_headers)
                                                status_code_res = resp_zv.status_code
                                                if resp_zv.status_code in (200, 201):
                                                    sent_ok = True
                                        except Exception as e_post2:
                                            logger.warning(f"[FollowUp] Tentativa 2 ZapVoice para {telefone} falhou: {e_post2}")

                                if sent_ok:
                                    db.execute(_text(f"UPDATE {leads_table} SET followup_step = :next_step WHERE id = :id"),
                                               {"next_step": step_index + 1, "id": lead_id})
                                    pipeline_steps.append({"step": "📩 Mensagem Entregue", "detail": f"Status de envio: {status_code_res}. Passo de follow-up marcado como concluído.", "timestamp": datetime.utcnow().isoformat()})
                                    
                                    # --- Sincronização de Etiqueta de Follow-Up no ZapVoice ---
                                    if followup_add_label and followup_add_label.strip() and eff_conversa_id:
                                        try:
                                            lbl_to_add = followup_add_label.strip()
                                            zv_client = zv_client_cfg or str(eff_conta_id or "1")
                                            asyncio.run(sync_conversation_labels(
                                                cw_url,
                                                str(zv_client),
                                                int(eff_conversa_id),
                                                cw_token,
                                                to_add=[lbl_to_add]
                                            ))
                                            pipeline_steps.append({"step": "🏷️ Etiqueta de Follow-Up Aplicada", "detail": f"Etiqueta '{lbl_to_add}' adicionada à conversa {eff_conversa_id} no ZapVoice.", "timestamp": datetime.utcnow().isoformat()})
                                            logger.info(f"[FollowUp] Etiqueta '{lbl_to_add}' aplicada no ZapVoice para conversa {eff_conversa_id}.")
                                        except Exception as e_add_lbl:
                                            logger.warning(f"[FollowUp] Falha ao aplicar etiqueta '{followup_add_label}' no ZapVoice: {e_add_lbl}")

                                    _save_followup_event(db, config_id, eff_conta_id, eff_conversa_id, telefone, nome, message, pipeline_steps, "processed", step_index=step_index)
                                    
                                    # --- Registro Financeiro do Follow-Up ---
                                    try:
                                        input_tk = getattr(ai_usage, 'input_tokens', 0) if ai_usage else 0
                                        output_tk = getattr(ai_usage, 'output_tokens', 0) if ai_usage else 0
                                        
                                        haiku_info = MODEL_INFO.get("claude-4.5-haiku", {"input": 0.000001, "output": 0.000005})
                                        cost_usd = (input_tk * haiku_info["input"]) + (output_tk * haiku_info["output"])
                                        cost_brl = cost_usd * USD_TO_BRL
                                        
                                        log = InteractionLog(
                                            agent_id=agent_id,
                                            session_id=telefone,
                                            user_message="[FOLLOW-UP AUTOMÁTICO]",
                                            agent_response=message,
                                            model_used="Claude Haiku (Follow-up)",
                                            input_tokens=input_tk,
                                            output_tokens=output_tk,
                                            cost_usd=cost_usd,
                                            cost_brl=cost_brl,
                                            timestamp=datetime.utcnow()
                                        )
                                        db.add(log)
                                    except Exception as log_err:
                                        logger.warning(f"[FollowUp] Erro ao registrar custo financeiro: {log_err}")

                                    db.commit()
                                    logger.info(f"[FollowUp] Step {step_index+1} enviado para {telefone}")
                                else:
                                    logger.warning(f"[FollowUp] Falha ao enviar para {telefone}: {status_code_res}")
                                    pipeline_steps.append({"step": "Erro de Envio no Servidor", "detail": f"A API retornou o código HTTP {status_code_res} na tentativa de disparar a mensagem.", "timestamp": datetime.utcnow().isoformat()})
                                    _save_followup_event(db, config_id, eff_conta_id, eff_conversa_id, telefone, nome, message, pipeline_steps, "error")
                            except Exception as e:
                                logger.warning(f"[FollowUp] Erro no lead {lead_id}: {e}")
                                pipeline_steps.append({"step": "Erro", "detail": f"Exceção interna: {str(e)}", "timestamp": datetime.utcnow().isoformat()})
                                _save_followup_event(db, config_id, conta_id, conversa_id, telefone, nome, None, pipeline_steps, "error")

                except Exception as e:
                    logger.error(f"[FollowUp] Erro no step {step_index} config {config_id}: {e}")
                    db.rollback()
    finally:
        db.close()


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

        # Próxima execução no fuso horário UTC (garante comparabilidade direta)
        next_run_aware = config.next_run
        if next_run_aware.tzinfo is None:
            next_run_aware = next_run_aware.replace(tzinfo=timezone.utc)

        if now >= next_run_aware:
            logger.info("⏰ Horário do backup agendado atingido. Disparando backup...")
            # Atualiza next_run antes de rodar para evitar loops em caso de travamento
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


@app.task(name="tasks.rescue_stuck_waiting_events")
def rescue_stuck_waiting_events():
    """Busca eventos em status 'waiting' cujo scheduled_at já passou e re-agenda o processamento."""
    db = SessionLocal()
    try:
        from core.timezone import get_now_br
        from webhook_tasks import process_webhook_automation
        
        now = get_now_br()
        # Buscar eventos com status waiting que deveriam ter rodado
        events = db.query(WebhookEventModel).filter(
            WebhookEventModel.status == "waiting",
            WebhookEventModel.scheduled_at <= now
        ).all()
        
        if not events:
            return
            
        logger.info(f"📍 [Rescue System] Encontrados {len(events)} eventos pendentes/travados para resgate.")
        
        for event in events:
            logger.info(f"📍 [Rescue System] Resgatando evento {event.id} para telefone {event.telefone}")
            # Despachar a execução da automação via Celery imediatamente
            process_webhook_automation.delay(event.id)
            
    except Exception as e:
        logger.error(f"Erro na execução da tarefa de resgate periódico: {e}")
    finally:
        db.close()

