import os
import json
import logging
import asyncio
import httpx
from datetime import datetime, timezone
from core.timezone import get_now_utc
from webhook_services_modules.messaging import _get_send_message_func

logger = logging.getLogger(__name__)


def execute_keyword_deletion_trap(db, event, config, target_tel, target_cid, target_aid):
    """Encapsula todo o fluxo síncrono cross-platform de auto-deleção e limpeza."""
    import webhook_tasks
    webhook_tasks._add_step(db, event.id, "🗑️ Auto-Deleção Detectada", "Palavra-chave encontrada no reset")
    
    # 1. Enviar mensagem de despedida PRIMEIRO
    farewell_msg = config.delete_message or "Seus dados foram removidos do nosso sistema. Até logo!"
    if target_cid and target_aid:
        send_msg_func = _get_send_message_func()
        send_msg_func(db, event.id, target_cid, target_aid, farewell_msg, config)
        webhook_tasks._add_step(db, event.id, "📤 Mensagem de despedida enviada ao ZapVoice", "Fluxo finalizado via palavra-chave.")
        
        # --- SUBSTITUIÇÃO DE ETIQUETAS NO ZAPVOICE NO RESET ---
        try:
            from zapvoice_utils import get_default_reset_labels
            effective_aid = target_aid or getattr(config, "zapvoice_client_id", None) or os.getenv("ZAPVOICE_CLIENT_ID", "")
            zv_url = (config.zapvoice_url or os.getenv("ZAPVOICE_URL", "")).rstrip("/")
            if zv_url and not zv_url.endswith("/api"):
                zv_url = f"{zv_url}/api"
            zv_token = config.zapvoice_api_token or os.getenv("ZAPVOICE_API_TOKEN", "")
            if zv_url and zv_token:
                labels_api_url = f"{zv_url}/chat/conversations/{target_cid}/labels"
                headers = {
                    "Authorization": f"Bearer {zv_token}",
                    "Content-Type": "application/json"
                }
                if effective_aid:
                    headers["X-Client-ID"] = str(effective_aid)
                
                # Carregar etiquetas padrão configuradas para reset/deleção (ou etiquetas padrão de mensagem)
                reset_labels = get_default_reset_labels(config)
                
                with httpx.Client(timeout=10.0) as client:
                    resp = client.post(labels_api_url, json={"labels": reset_labels}, headers=headers)
                    if resp.status_code in (200, 201):
                        webhook_tasks._add_step(db, event.id, "🏷️ Etiquetas Substituídas no Reset (ZapVoice)", f"Etiquetas da conversa substituídas por: {reset_labels}")
                    else:
                        logger.warning(f"Erro ao substituir etiquetas no reset do ZapVoice: {resp.status_code} - {resp.text}")
        except Exception as e_lbl:
            logger.warning(f"Erro no processamento de substituição de etiquetas do ZapVoice: {e_lbl}")

    # 2. Deletar tudo do banco de dados (Cascata inteligente síncrona cross-platform)
    if config.leads_table:
        from sqlalchemy import text
        # A. Coletar IDs de leads e telefones de todas as tabelas cadastradas no sistema usando sufixo de 8 dígitos
        suffix_8 = target_tel[-8:] if len(target_tel) >= 8 else "---"
        
        all_lead_ids = []
        all_tables = [config.leads_table]
        try:
            res_tables = db.execute(text("SELECT DISTINCT leads_table FROM webhook_configs WHERE leads_table IS NOT NULL AND leads_table != ''"))
            all_tables = list(set([r[0] for r in res_tables.fetchall() if r[0]] + [config.leads_table]))
        except Exception as e_tables:
            logger.warning(f"Erro ao obter leads_tables: {e_tables}")

        # B. Deletar leads de todas as tabelas e coletar seus IDs
        for t in all_tables:
            try:
                res_ids = db.execute(
                    text(f"SELECT id FROM {t} WHERE telefone = :tel OR RIGHT(telefone, 8) = :suffix"),
                    {"tel": target_tel, "suffix": suffix_8}
                )
                found_ids = [str(r[0]) for r in res_ids.fetchall() if r[0]]
                all_lead_ids.extend(found_ids)
                
                db.execute(
                    text(f"DELETE FROM {t} WHERE telefone = :tel OR RIGHT(telefone, 8) = :suffix"),
                    {"tel": target_tel, "suffix": suffix_8}
                )
                db.commit()
            except Exception as e_del_tbl:
                db.rollback()
                logger.warning(f"Erro ao processar limpeza da tabela {t}: {e_del_tbl}")

        # C. Histórico de eventos (webhook_events) - Remoção cross-platform com sufixo de 8 dígitos
        try:
            db.execute(
                text("DELETE FROM webhook_events WHERE telefone = :tel OR RIGHT(telefone, 8) = :suffix"),
                {"tel": target_tel, "suffix": suffix_8}
            )
            db.commit()
        except Exception as e_evt:
            db.rollback()
            logger.warning(f"Erro ao deletar eventos: {e_evt}")

        # D. Limpar memórias vetoriais (knowledge_items)
        try:
            db.execute(
                text("DELETE FROM knowledge_items WHERE metadata_val = :tel OR metadata_val = :tel_pref OR metadata_val = :tel_suff OR metadata_val = :tel_pref_suff"),
                {
                    "tel": target_tel,
                    "tel_pref": f"phone:{target_tel}",
                    "tel_suff": suffix_8,
                    "tel_pref_suff": f"phone:{suffix_8}"
                }
            )
            db.commit()
        except Exception as e_ki:
            db.rollback()
            logger.warning(f"Erro ao deletar knowledge_items: {e_ki}")

        # E. Triggers agendados e status de mensagens
        try:
            trig_res = db.execute(
                text("SELECT id FROM scheduled_triggers WHERE contact_phone = :tel OR RIGHT(contact_phone, 8) = :suffix"),
                {"tel": target_tel, "suffix": suffix_8}
            )
            trig_ids = [r[0] for r in trig_res.fetchall()]
            
            if trig_ids:
                db.execute(text("DELETE FROM message_status WHERE trigger_id = ANY(:ids)"), {"ids": trig_ids})
                db.execute(text("DELETE FROM scheduled_triggers WHERE id = ANY(:ids)"), {"ids": trig_ids})
            else:
                db.execute(
                    text("DELETE FROM scheduled_triggers WHERE contact_phone = :tel OR RIGHT(contact_phone, 8) = :suffix"),
                    {"tel": target_tel, "suffix": suffix_8}
                )
            db.commit()
        except Exception as e_trig:
            db.rollback()
            logger.warning(f"Erro ao limpar triggers no reset: {e_trig}")

        # F. Memórias, sumários e logs de interação (usando telefones, prefixos 'tel_' e IDs)
        try:
            tels_with_prefix_tel = [f"tel_{target_tel}", f"tel_{suffix_8}"]
            all_keys = [target_tel, suffix_8] + tels_with_prefix_tel + all_lead_ids
            all_keys = list(dict.fromkeys([k for k in all_keys if k]))  # remover duplicados e nulos
            
            if all_keys:
                db.execute(text("DELETE FROM user_memory WHERE session_id = ANY(:keys)"), {"keys": all_keys})
                db.execute(text("DELETE FROM session_summaries WHERE session_id = ANY(:keys)"), {"keys": all_keys})
                db.commit()
        except Exception as e_mem:
            db.rollback()
            logger.warning(f"Erro ao limpar memórias, sumários e logs: {e_mem}")

        logger.info(f"🗑️ Deleção cross-platform inteligente síncrona concluída para {target_tel}")
    
    # 3. Limpar cache de debounce no Redis
    try:
        import redis as redis_lib
        _redis_local = redis_lib.from_url(os.getenv("REDIS_URL", "redis://redis:6379/0"), decode_responses=True)
        _redis_local.delete(f"webhook:debounce:id:{config.id}:{target_tel}")
        _redis_local.delete(f"webhook:debounce:text:{config.id}:{target_tel}")
        _redis_local.setex(f"webhook:resetting:{config.id}:{target_tel}", 10, "1")
    except Exception as redis_err:
        logger.error(f"Erro ao limpar redis no reset: {redis_err}")


def check_automation_trap(db, event, config, lead_internal_id, last_msg, lead_created_at):
    """Encapsula a checagem de pausa, etiquetas dinâmicas e janela de 24h."""
    import webhook_tasks
    is_paused = False
    ignore_label = (config.ignore_by_label or "humano").strip().lower()
    
    try:
        zv_url = (config.zapvoice_url or "").rstrip("/")
        zv_token = config.zapvoice_api_token
        if zv_url and zv_token and event.conversa_id and event.conta_id:
            is_paused = asyncio.run(webhook_tasks.is_conversation_paused(
                zv_url, 
                str(event.conta_id), 
                int(event.conversa_id), 
                zv_token, 
                ignore_label
            ))
            
            if is_paused:
                webhook_tasks._add_step(db, event.id, "🚑 Automação Pausada", f"A etiqueta '{ignore_label}' foi detectada no ZapVoice. Interrompendo processamento.")
            else:
                webhook_tasks._add_step(db, event.id, "✅ Contato autorizado", f"Etiqueta '{ignore_label}' não encontrada ou inativa no ZapVoice. Seguindo com a automação.")
    except Exception as e_sync:
        logger.error(f"Erro na sincronização de status do ZapVoice: {e_sync}")
        webhook_tasks._add_step(db, event.id, "⚠️ Erro Técnico", f"Falha ao validar etiquetas no ZapVoice: {str(e_sync)}")

    # --- ADIÇÃO DE ETIQUETAS AUTOMÁTICAS (EM CADA MENSAGEM) ---
    if config.labels_on_message:
        try:
            labels_to_add = []
            if isinstance(config.labels_on_message, list):
                labels_to_add = config.labels_on_message
            elif isinstance(config.labels_on_message, str) and config.labels_on_message.strip():
                labels_to_add = json.loads(config.labels_on_message)
            
            if labels_to_add and isinstance(labels_to_add, list):
                zv_url = (config.zapvoice_url or os.getenv("ZAPVOICE_URL", "")).rstrip("/")
                zv_token = config.zapvoice_api_token or os.getenv("ZAPVOICE_API_TOKEN", "")
                if zv_url and zv_token and event.conversa_id and event.conta_id:
                    webhook_tasks._add_step(db, event.id, "🏷️ Adicionando etiquetas automáticas", f"Etiquetas: {', '.join(labels_to_add)}")
                    success, final_labels = asyncio.run(webhook_tasks.sync_conversation_labels(
                        zv_url, 
                        str(event.conta_id), 
                        int(event.conversa_id), 
                        zv_token, 
                        to_add=labels_to_add
                    ))
                    if success and config.leads_table and event.telefone:
                        from sqlalchemy import text
                        try:
                            # Tentar obter etiquetas atuais locais para mesclagem limpa
                            lead_query = f"SELECT labels FROM {config.leads_table} WHERE telefone = :tel"
                            lead_res = db.execute(text(lead_query), {"tel": event.telefone})
                            lead_row = lead_res.fetchone()
                            existing_labels = []
                            if lead_row and lead_row[0]:
                                try:
                                    parsed = json.loads(lead_row[0])
                                    if isinstance(parsed, list):
                                        existing_labels = [str(x) for x in parsed]
                                    else:
                                        existing_labels = [str(lead_row[0])]
                                except Exception:
                                    existing_labels = [x.strip() for x in lead_row[0].split(",") if x.strip()]
                            
                            final_merged = list(final_labels)
                            for item in existing_labels:
                                if item not in final_merged:
                                    final_merged.append(item)
                                    
                            db.execute(text(f"UPDATE {config.leads_table} SET labels = :labels, updated_at = :now WHERE telefone = :tel"), {
                                "labels": json.dumps(final_merged, ensure_ascii=False),
                                "tel": event.telefone,
                                "now": datetime.utcnow()
                            })
                            db.commit()
                            logger.info(f"Etiquetas locais atualizadas via webhook: {final_merged}")
                        except Exception as e_db_update:
                            logger.error(f"Erro ao atualizar etiquetas locais via webhook: {e_db_update}")
        except Exception as e_labels:
            logger.error(f"Erro ao adicionar etiquetas automáticas: {e_labels}")
            webhook_tasks._add_step(db, event.id, "⚠️ Aviso: Etiquetas não adicionadas", f"Falha ao sincronizar etiquetas: {str(e_labels)}")

    if is_paused:
        return True

    # --- Verificação da Janela de 24h ---
    if last_msg:
        msg_dt = last_msg
        if msg_dt.tzinfo is None:
            msg_dt = msg_dt.replace(tzinfo=timezone.utc)
        
        now = get_now_utc()
        diff_seconds = (now - msg_dt).total_seconds()
        if diff_seconds > 86400:  # 24 horas
            webhook_tasks._add_step(db, event.id, "🔒 Janela Fechada", "A janela de 24h expirou. Resposta cancelada por segurança.")
            return True

    return False
