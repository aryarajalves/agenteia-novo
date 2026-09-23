import json
import logging
from typing import Dict, Any
from sqlalchemy import text as _text
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

def calculate_followup_metrics(db: Session, webhook_id: int) -> Dict[str, Any]:
    """
    Agrega as métricas de conversão e eficácia do Follow-Up Automático para um Webhook específico.
    Calcula: total disparado, taxa de resposta por passo, comparativo de Teste A/B e custos.
    """
    try:
        # 1. Total de eventos de follow-up registrados
        rows = db.execute(_text("""
            SELECT id, mensagem, agent_response, status, processing_steps, created_at, telefone
            FROM webhook_events
            WHERE webhook_config_id = :wid AND event_type = 'followup'
            ORDER BY created_at ASC
        """), {"wid": webhook_id}).fetchall()

        total_dispatches = 0
        total_responses = 0
        step_stats = {}
        ab_stats = {
            "A": {"dispatches": 0, "responses": 0, "conversion_rate": 0.0},
            "B": {"dispatches": 0, "responses": 0, "conversion_rate": 0.0}
        }

        # Conjunto de telefones que receberam follow-up e a data do último envio
        lead_dispatches = {}

        for row in rows:
            event_id, msg, resp, status, steps_raw, created_at, telefone = row
            
            # Extrai índice do passo da mensagem (ex: "🔄 [Follow-Up Passo #1]")
            step_num = 1
            if msg and "Passo #" in msg:
                try:
                    step_num = int(msg.split("Passo #")[1].split("]")[0])
                except Exception:
                    step_num = 1

            if step_num not in step_stats:
                step_stats[step_num] = {
                    "step_number": step_num,
                    "dispatches": 0,
                    "responses": 0,
                    "conversion_rate": 0.0,
                    "ab_variation_a": {"dispatches": 0, "responses": 0},
                    "ab_variation_b": {"dispatches": 0, "responses": 0}
                }

            # Identifica Variação A/B se houver no processing_steps
            variation = None
            if steps_raw:
                try:
                    steps = json.loads(steps_raw) if isinstance(steps_raw, str) else steps_raw
                    for s in steps:
                        meta = s.get("metadata") or {}
                        if "ab_variation" in meta:
                            variation = meta["ab_variation"]
                            break
                except Exception:
                    pass

            if status == "processed":
                total_dispatches += 1
                step_stats[step_num]["dispatches"] += 1
                if variation in ("A", "B"):
                    ab_stats[variation]["dispatches"] += 1
                    if variation == "A":
                        step_stats[step_num]["ab_variation_a"]["dispatches"] += 1
                    else:
                        step_stats[step_num]["ab_variation_b"]["dispatches"] += 1

                lead_dispatches[telefone] = {
                    "step_num": step_num,
                    "dispatched_at": created_at,
                    "variation": variation
                }

        # 2. Verifica quantos leads responderam após o disparo de follow-up
        if lead_dispatches:
            user_replies = db.execute(_text("""
                SELECT telefone, created_at
                FROM webhook_events
                WHERE webhook_config_id = :wid 
                  AND dono IN ('usuario', 'lead', 'client')
                  AND created_at >= (SELECT MIN(created_at) FROM webhook_events WHERE webhook_config_id = :wid AND event_type = 'followup')
                ORDER BY created_at ASC
            """), {"wid": webhook_id}).fetchall()

            counted_replies = set()
            for r_tel, r_time in user_replies:
                if r_tel in lead_dispatches and r_tel not in counted_replies:
                    info = lead_dispatches[r_tel]
                    if r_time > info["dispatched_at"]:
                        total_responses += 1
                        step_num = info["step_num"]
                        if step_num in step_stats:
                            step_stats[step_num]["responses"] += 1
                            var = info["variation"]
                            if var == "A":
                                step_stats[step_num]["ab_variation_a"]["responses"] += 1
                                ab_stats["A"]["responses"] += 1
                            elif var == "B":
                                step_stats[step_num]["ab_variation_b"]["responses"] += 1
                                ab_stats["B"]["responses"] += 1

                        counted_replies.add(r_tel)

        # 3. Calcula taxas percentuais
        overall_rate = round((total_responses / total_dispatches * 100), 1) if total_dispatches > 0 else 0.0

        formatted_steps = []
        for s_idx in sorted(step_stats.keys()):
            item = step_stats[s_idx]
            disp = item["dispatches"]
            resp = item["responses"]
            item["conversion_rate"] = round((resp / disp * 100), 1) if disp > 0 else 0.0
            formatted_steps.append(item)

        for k in ("A", "B"):
            d = ab_stats[k]["dispatches"]
            r = ab_stats[k]["responses"]
            ab_stats[k]["conversion_rate"] = round((r / d * 100), 1) if d > 0 else 0.0

        return {
            "webhook_id": webhook_id,
            "total_dispatches": total_dispatches,
            "total_responses": total_responses,
            "overall_conversion_rate": overall_rate,
            "steps": formatted_steps,
            "ab_testing": ab_stats
        }
    except Exception as e:
        logger.error(f"[FollowUpMetrics] Erro ao calcular métricas para webhook {webhook_id}: {e}")
        return {
            "webhook_id": webhook_id,
            "total_dispatches": 0,
            "total_responses": 0,
            "overall_conversion_rate": 0.0,
            "steps": [],
            "ab_testing": {"A": {"dispatches": 0, "responses": 0, "conversion_rate": 0.0}, "B": {"dispatches": 0, "responses": 0, "conversion_rate": 0.0}},
            "error": str(e)
        }
