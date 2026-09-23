import os
import json
import logging
import httpx
from datetime import datetime, timedelta
from sqlalchemy import text as _text

logger = logging.getLogger(__name__)


def execute_check_window_expiry(db):
    """Verifica janelas 24h expiradas e remove a etiqueta configurada do Chatwoot."""
    cw_url_global = (os.getenv("CHATWOOT_URL") or "").rstrip("/")
    cw_token_global = os.getenv("CHATWOOT_API_TOKEN") or ""

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
                        try:
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
    except Exception as e:
        logger.error(f"[WindowExpiry] Erro geral na execução: {e}")
        db.rollback()
