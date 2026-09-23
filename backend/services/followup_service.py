import os
import json
import logging
import asyncio
from datetime import datetime, timedelta, timezone
from sqlalchemy import text as _text

from database import SessionLocal
from zapvoice_utils import is_conversation_paused

from .followup_modules import (
    is_within_business_hours,
    calculate_elapsed_business_minutes,
    check_lead_score_filter,
    resolve_ab_variation,
    calculate_followup_metrics,
    dispatch_single_lead_followup,
    _format_delay_text,
    _generate_followup_message,
    save_followup_event
)

logger = logging.getLogger(__name__)

# Limite máximo de concorrência simultânea para disparos de follow-up
MAX_CONCURRENT_FOLLOWUPS = 10

async def _process_due_leads_concurrently(session_factory, leads_to_dispatch: list, max_concurrent: int = MAX_CONCURRENT_FOLLOWUPS):
    """
    Processa uma lista de disparos devidos com limite de concorrência (ex: até 10 simultâneos)
    utilizando um asyncio.Semaphore.
    """
    semaphore = asyncio.Semaphore(max_concurrent)

    async def _worker(item):
        async with semaphore:
            try:
                await dispatch_single_lead_followup(
                    session_factory=session_factory,
                    config_id=item["config_id"],
                    leads_table=item["leads_table"],
                    cw_url=item["cw_url"],
                    cw_token=item["cw_token"],
                    agent_id=item["agent_id"],
                    zv_client_cfg=item["zv_client_cfg"],
                    followup_add_label=item["followup_add_label"],
                    step_raw=item["step_raw"],
                    step_index=item["step_index"],
                    delay_minutes=item["delay_minutes"],
                    elapsed_minutes=item["elapsed_minutes"],
                    lead_info=item["lead_info"],
                    apply_jitter=item.get("apply_jitter", True)
                )
            except Exception as e:
                logger.error(f"[FollowUp Worker] Erro ao processar lead {item['lead_info'].get('telefone')}: {e}")

    tasks = [_worker(item) for item in leads_to_dispatch]
    if tasks:
        await asyncio.gather(*tasks, return_exceptions=True)


def execute_check_followup_due(apply_jitter: bool = True, max_concurrent: int = MAX_CONCURRENT_FOLLOWUPS):
    """
    Envia follow-ups automáticos com mensagem gerada por IA / Template para contatos que não responderam.
    Executa verificação em lote com concorrência paralela de até 10 contatos e Jitter Anti-Ban de 3 a 8s.
    """
    import sys
    tasks_mod = sys.modules.get("tasks")
    session_factory = getattr(tasks_mod, "SessionLocal", SessionLocal) if tasks_mod else SessionLocal

    cw_url_global = (os.getenv("CHATWOOT_URL") or "").rstrip("/")
    cw_token_global = os.getenv("CHATWOOT_API_TOKEN") or ""

    db = session_factory()
    leads_to_dispatch = []

    try:
        configs = db.execute(_text(
            "SELECT id, leads_table, chatwoot_url, chatwoot_api_token, followup_steps, followup_business_hours, agent_id, ignore_by_label, followup_cancel_label, followup_required_label, zapvoice_url, zapvoice_api_token, zapvoice_client_id, followup_add_label, purchased_label, followup_funnels "
            "FROM webhook_configs "
            "WHERE followup_enabled = TRUE AND ((followup_steps IS NOT NULL AND followup_steps != '' AND followup_steps != '[]') OR (followup_funnels IS NOT NULL AND followup_funnels != '' AND followup_funnels != '[]'))"
        )).fetchall()

        for config_id, leads_table, cw_url_cfg, cw_token_cfg, followup_steps_raw, followup_bh_raw, agent_id, ignore_by_label, followup_cancel_label, followup_required_label, zv_url_cfg, zv_token_cfg, zv_client_cfg, followup_add_label, purchased_label, followup_funnels_raw in configs:
            cw_url = (cw_url_cfg or zv_url_cfg or cw_url_global or os.getenv("ZAPVOICE_URL") or "").rstrip("/")
            cw_token = cw_token_cfg or zv_token_cfg or cw_token_global or os.getenv("ZAPVOICE_API_TOKEN") or ""

            funnels_to_run = []
            if followup_funnels_raw:
                try:
                    loaded_f = json.loads(followup_funnels_raw)
                    if isinstance(loaded_f, list) and len(loaded_f) > 0:
                        funnels_to_run = loaded_f
                except Exception:
                    pass
            if not funnels_to_run and followup_steps_raw:
                try:
                    s_list = json.loads(followup_steps_raw)
                    if isinstance(s_list, list) and len(s_list) > 0:
                        funnels_to_run = [{"id": "followup_default", "name": "Padrão / Principal", "is_default": True, "steps": s_list}]
                except Exception:
                    pass

            try:
                business_hours = json.loads(followup_bh_raw) if followup_bh_raw else None
            except Exception:
                business_hours = None

            if not funnels_to_run or not cw_url or not cw_token or not leads_table:
                continue

            if not is_within_business_hours(business_hours):
                logger.info(f"[FollowUp] Config {config_id} fora do horário comercial, pulando.")
                continue

            cancel_labels_list = []
            if ignore_by_label:
                cancel_labels_list.extend([l.strip() for l in ignore_by_label.split(",") if l.strip()])
            if followup_cancel_label:
                cancel_labels_list.extend([l.strip() for l in followup_cancel_label.split(",") if l.strip()])
            if purchased_label:
                cancel_labels_list.extend([l.strip() for l in purchased_label.split(",") if l.strip()])
            if not cancel_labels_list:
                cancel_labels_list = ["humano"]

            for funnel in funnels_to_run:
                f_id = funnel.get("id", "followup_default")
                is_def = funnel.get("is_default", False) or f_id == "followup_default"
                steps = funnel.get("steps", [])
                if not steps:
                    continue

                for step_index, step in enumerate(steps):
                    delay_hours = float(step.get("delay_hours", 0))
                    delay_minutes = int(step.get("delay_minutes", delay_hours * 60))
                    if delay_minutes <= 0:
                        continue

                    try:
                        cutoff_30d = datetime.utcnow() - timedelta(days=30)
                        funnel_filter = "(active_followup_funnel_id = :f_id OR active_followup_funnel_id IS NULL OR active_followup_funnel_id = '')" if is_def else "active_followup_funnel_id = :f_id"
                        
                        # Busca colunas incluindo lead_score e lead_classification para o filtro por temperatura
                        due = db.execute(_text(f"""
                            SELECT id, conta_id, conversa_id, telefone, contato_nome, 
                                   COALESCE(ultima_mensagem_em, ultima_resposta_agente_em, created_at) AS ref_time, 
                                   mensagem, ultima_resposta_agente, labels,
                                   lead_score, lead_classification
                            FROM {leads_table}
                            WHERE followup_step = :step_index
                              AND {funnel_filter}
                              AND COALESCE(ultima_mensagem_em, ultima_resposta_agente_em, created_at) >= :cutoff_30d
                        """), {"step_index": step_index, "f_id": f_id, "cutoff_30d": cutoff_30d}).fetchall()
                    except Exception as e:
                        # Fallback seguro caso as colunas lead_score/lead_classification não existam nessa tabela
                        try:
                            due = db.execute(_text(f"""
                                SELECT id, conta_id, conversa_id, telefone, contato_nome, 
                                       COALESCE(ultima_mensagem_em, ultima_resposta_agente_em, created_at) AS ref_time, 
                                       mensagem, ultima_resposta_agente, labels,
                                       NULL as lead_score, NULL as lead_classification
                                FROM {leads_table}
                                WHERE followup_step = :step_index
                                  AND {funnel_filter}
                                  AND COALESCE(ultima_mensagem_em, ultima_resposta_agente_em, created_at) >= :cutoff_30d
                            """), {"step_index": step_index, "f_id": f_id, "cutoff_30d": cutoff_30d}).fetchall()
                        except Exception as e_fb:
                            logger.error(f"[FollowUp] Erro ao buscar leads devidos para o passo {step_index}: {e_fb}")
                            continue

                    if not due:
                        continue

                    now_utc = datetime.utcnow()
                    target_audience = step.get("target_audience")
                    lead_score_trigger = step.get("lead_score_trigger", "all")

                    for row in due:
                        lead_id, conta_id, conversa_id, telefone, nome, ref_time, lead_msg, agent_resp, lead_labels_raw, l_score, l_class = row
                        if not ref_time:
                            continue

                        # 1. Filtro de Público-Alvo: Re-tentativas vs Remarketing
                        has_interacted = bool(lead_msg and str(lead_msg).strip())
                        if target_audience == "retentativas" and has_interacted:
                            continue
                        if target_audience == "remarketing" and not has_interacted:
                            continue

                        # 2. Filtro por Lead Score / Temperatura (🔥 Quente, ⚡ Morno, ❄️ Frio)
                        if not check_lead_score_filter(l_score, l_class, lead_score_trigger):
                            continue

                        # 3. Cálculo de Inatividade e Proteção de Horário Comercial
                        ref_dt = ref_time.replace(tzinfo=timezone.utc) if getattr(ref_time, "tzinfo", None) is None else ref_time
                        now_dt = now_utc.replace(tzinfo=timezone.utc) if getattr(now_utc, "tzinfo", None) is None else now_utc
                        elapsed_minutes = (now_dt - ref_dt).total_seconds() / 60.0
                        if elapsed_minutes < delay_minutes:
                            continue

                        eff_conta_id = str(conta_id or zv_client_cfg or "1")
                        eff_conversa_id = str(conversa_id or "1")

                        # 4. Checagem de Etiquetas de Cancelamento / Exclusão
                        try:
                            local_labels = []
                            if lead_labels_raw:
                                try:
                                    local_labels = json.loads(lead_labels_raw) if isinstance(lead_labels_raw, str) else lead_labels_raw
                                    if not isinstance(local_labels, list): local_labels = []
                                except Exception:
                                    local_labels = [x.strip() for x in str(lead_labels_raw).split(",") if x.strip()]
                            local_labels_lower = [str(x).lower().strip() for x in local_labels]

                            is_cancelled = False
                            for cancel_lbl in cancel_labels_list:
                                c_lbl_lower = cancel_lbl.lower().strip()
                                if c_lbl_lower in local_labels_lower:
                                    is_cancelled = True
                                    break

                            if is_cancelled:
                                logger.info(f"[FollowUp] Desativando follow-up de {telefone} por etiqueta '{cancel_lbl}'.")
                                db.execute(_text(f"UPDATE {leads_table} SET followup_step = -1 WHERE id = :id"), {"id": lead_id})
                                db.commit()
                                continue

                            if followup_required_label and followup_required_label.strip():
                                req_lbl = followup_required_label.strip().lower()
                                if req_lbl not in local_labels_lower:
                                    continue
                        except Exception as e_lbl:
                            logger.warning(f"[FollowUp] Erro ao validar etiquetas para {telefone}: {e_lbl}")

                        # Lead qualificado para envio: adiciona à lista de processamento
                        leads_to_dispatch.append({
                            "config_id": config_id,
                            "leads_table": leads_table,
                            "cw_url": cw_url,
                            "cw_token": cw_token,
                            "agent_id": agent_id,
                            "zv_client_cfg": zv_client_cfg,
                            "followup_add_label": followup_add_label,
                            "step_raw": step,
                            "step_index": step_index,
                            "delay_minutes": delay_minutes,
                            "elapsed_minutes": elapsed_minutes,
                            "lead_info": {
                                "id": lead_id,
                                "conta_id": conta_id,
                                "conversa_id": conversa_id,
                                "telefone": telefone,
                                "contato_nome": nome,
                                "mensagem": lead_msg,
                                "ultima_resposta_agente": agent_resp,
                                "lead_score": l_score,
                                "lead_classification": l_class
                            },
                            "apply_jitter": apply_jitter
                        })
    finally:
        db.close()

    # Executa o disparo concorrente (em paralelo de até 10 contatos simultâneos)
    if leads_to_dispatch:
        logger.info(f"[FollowUp] Iniciando disparo concorrente para {len(leads_to_dispatch)} lead(s) devidos (Concorrência máxima: {max_concurrent}).")
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                # Caso já esteja dentro de um loop de eventos assíncrono
                asyncio.create_task(_process_due_leads_concurrently(session_factory, leads_to_dispatch, max_concurrent))
            else:
                loop.run_until_complete(_process_due_leads_concurrently(session_factory, leads_to_dispatch, max_concurrent))
        except RuntimeError:
            new_loop = asyncio.new_event_loop()
            asyncio.set_event_loop(new_loop)
            new_loop.run_until_complete(_process_due_leads_concurrently(session_factory, leads_to_dispatch, max_concurrent))
            new_loop.close()


# Aliases para compatibilidade total com os testes e módulos existentes
format_delay_text = _format_delay_text
generate_followup_message = _generate_followup_message
_is_within_business_hours = is_within_business_hours
_save_followup_event = save_followup_event
get_followup_metrics = calculate_followup_metrics
