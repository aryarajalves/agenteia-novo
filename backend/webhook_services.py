import os
import json
import logging
import asyncio
import httpx
import time
import re
from datetime import datetime, timezone
from models import WebhookEventModel, WebhookConfigModel, AgentConfigModel, KnowledgeItemModel, KnowledgeBaseModel, InteractionLog
from config_store import AgentConfig
from core.timezone import get_now_br, get_now_utc

logger = logging.getLogger(__name__)

def execute_keyword_deletion_trap(db, event, config, target_tel, target_cid, target_aid):
    """Encapsula todo o fluxo síncrono cross-platform de auto-deleção e limpeza."""
    import webhook_tasks
    webhook_tasks._add_step(db, event.id, "🗑️ Auto-Deleção Detectada", f"Palavra-chave encontrada no reset")
    
    # 1. Enviar mensagem de despedida PRIMEIRO
    farewell_msg = config.delete_message or "Seus dados foram removidos do nosso sistema. Até logo!"
    if target_cid and target_aid:
        _send_zapvoice_message(db, event.id, target_cid, target_aid, farewell_msg, config)
        webhook_tasks._add_step(db, event.id, "📤 Mensagem de despedida enviada ao ZapVoice", "Fluxo finalizado via palavra-chave.")
        
        # --- SUBSTITUIÇÃO DE ETIQUETAS NO ZAPVOICE NO RESET ---
        try:
            zv_url = (config.zapvoice_url or os.getenv("ZAPVOICE_URL", "")).rstrip("/")
            if zv_url and not zv_url.endswith("/api"):
                zv_url = f"{zv_url}/api"
            zv_token = config.zapvoice_api_token or os.getenv("ZAPVOICE_API_TOKEN", "")
            if zv_url and zv_token:
                labels_api_url = f"{zv_url}/chat/conversations/{target_cid}/labels"
                headers = {
                    "Authorization": f"Bearer {zv_token}",
                    "X-Client-ID": str(target_aid),
                    "Content-Type": "application/json"
                }
                
                # Carregar etiquetas configuradas para substituição no reset
                reset_labels = []
                if config.delete_labels:
                    try:
                        reset_labels = json.loads(config.delete_labels)
                    except Exception:
                        if isinstance(config.delete_labels, list):
                            reset_labels = config.delete_labels
                
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

        # F. Memórias, sumários e logs de interação (usando telefones, telefones com prefixo 'tel_' e IDs coletados)
        try:
            tels_with_prefix_tel = [f"tel_{target_tel}", f"tel_{suffix_8}"]
            all_keys = [target_tel, suffix_8] + tels_with_prefix_tel + all_lead_ids
            all_keys = list(dict.fromkeys([k for k in all_keys if k])) # remover duplicados e nulos
            
            if all_keys:
                db.execute(text("DELETE FROM user_memory WHERE session_id = ANY(:keys)"), {"keys": all_keys})
                db.execute(text("DELETE FROM session_summaries WHERE session_id = ANY(:keys)"), {"keys": all_keys})
                db.execute(text("DELETE FROM interaction_logs WHERE session_id = ANY(:keys)"), {"keys": all_keys})
                db.commit()
        except Exception as e_mem:
            db.rollback()
            logger.warning(f"Erro ao limpar memórias, sumários e logs: {e_mem}")

        logger.info(f"🗑️ Deleção cross-platform inteligente síncrona concluída para {target_tel}")
    
    # 3. Limpar cache de debounce no Redis (IMPORTANTE: evita que a próxima mensagem agrupe com esta)
    try:
        import redis as redis_lib
        _redis_local = redis_lib.from_url(os.getenv("REDIS_URL", "redis://redis:6379/0"), decode_responses=True)
        _redis_local.delete(f"webhook:debounce:id:{config.id}:{target_tel}")
        _redis_local.delete(f"webhook:debounce:text:{config.id}:{target_tel}")
        # Setar lock temporário de 10 segundos para evitar recriação de lead por webhook de eco (is_out)
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
                            
                            # Mesclar as etiquetas do ZapVoice com as locais (por garantia)
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
        # Garantir que ambos sejam aware (UTC) para comparação segura
        msg_dt = last_msg
        if msg_dt.tzinfo is None:
            msg_dt = msg_dt.replace(tzinfo=timezone.utc)
        
        now = get_now_utc()
        diff_seconds = (now - msg_dt).total_seconds()
        if diff_seconds > 86400: # 24 horas
            webhook_tasks._add_step(db, event.id, "🔒 Janela Fechada", f"A janela de 24h expirou. Resposta cancelada por segurança.")
            return True

    return False


def retrieve_context_history(db, event, db_agent, raw_phone, clean_phone, event_id):
    """Recupera o resumo das mensagens anteriores para injeção de contexto formatado como mensagens da sessão."""
    import webhook_tasks
    history = []
    if db_agent.context_window > 0:
        try:
            # 1. Tentar buscar o resumo da sessão
            # Como a chave session_id costuma ser o ID local do lead (lead_internal_id) ou o prefixo do telefone,
            # vamos buscar de forma resiliente por telefone ou chaves de sessão compatíveis.
            from sqlalchemy import select, text
            from models import SessionSummary, WebhookEventModel
            
            # Precisamos resolver a session_id de forma idêntica a webhook_tasks.py
            # Em webhook_tasks.py, a session_id é definida como lead_internal_id se existir, caso contrário f"tel_{clean_phone}"
            lead_internal_id = None
            if isinstance(event.webhook_config, dict) and 'leads_table' in event.webhook_config:
                leads_table = event.webhook_config['leads_table']
            else:
                # buscar dinamicamente
                from models import WebhookConfigModel
                config = db.query(WebhookConfigModel).filter(WebhookConfigModel.id == event.webhook_config_id).first()
                leads_table = config.leads_table if config else None

            if leads_table:
                try:
                    query = text(f"SELECT id FROM {leads_table} WHERE telefone = :tel LIMIT 1")
                    res = db.execute(query, {"tel": event.telefone}).fetchone()
                    if res:
                        lead_internal_id = res[0]
                except Exception:
                    pass

            # Forçamos a busca do histórico real, respeitando o limite da janela de contexto
            pass
        except Exception as e_sum:
            logger.error(f"Erro ao ignorar resumo da sessão: {e_sum}")
        
        try:
            # Fallback para o histórico de mensagens caso não haja resumo gerado ainda
                # Normalização robusta
                search_phones = [raw_phone, clean_phone, f"+{clean_phone}"]
                search_phones = list(dict.fromkeys([p for p in search_phones if p]))
                tel_suffix = clean_phone[-8:] if len(clean_phone) >= 8 else clean_phone

                from sqlalchemy import or_
                past_events = db.query(WebhookEventModel).filter(
                    WebhookEventModel.webhook_config_id == event.webhook_config_id,
                    or_(
                        WebhookEventModel.telefone.in_(search_phones),
                        WebhookEventModel.telefone.like(f"%{tel_suffix}")
                    ),
                    WebhookEventModel.id != event_id,
                    WebhookEventModel.status.in_(["completed", "processed", "delivered", "success"]),
                    or_(
                        WebhookEventModel.is_automatic.is_(None),
                        WebhookEventModel.is_automatic == False
                    )
                ).order_by(WebhookEventModel.created_at.desc()).limit(100).all()

                past_events.reverse()
                seen_msgs = set()
                for pe in past_events:
                    is_agent_event = (pe.dono and pe.dono.lower() in ['agente', 'bot']) or (pe.event_type == 'followup')
                    
                    if is_agent_event:
                        # Para eventos do agente/follow-up, a mensagem dita pelo robô é o agent_response
                        agent_text = (pe.agent_response or "").strip()
                        if not agent_text and pe.mensagem:
                            raw_msg = pe.mensagem.strip()
                            # Ignorar marcadores técnicos de sistema
                            if not (raw_msg.startswith("🔄") or raw_msg.startswith("[Follow-Up") or raw_msg.startswith("[Disparo")):
                                agent_text = raw_msg
                        
                        if agent_text and agent_text not in seen_msgs:
                            history.append({"role": "assistant", "content": agent_text})
                            seen_msgs.add(agent_text)
                    else:
                        # Eventos originados pelo usuário/cliente
                        if pe.mensagem:
                            user_msg = pe.mensagem.strip()
                            if user_msg and not (user_msg.startswith("🔄 [Follow-Up") or user_msg.startswith("[Follow-Up")) and user_msg not in seen_msgs:
                                history.append({"role": "user", "content": user_msg})
                                seen_msgs.add(user_msg)
                        if pe.agent_response:
                            resp_clean = pe.agent_response.strip()
                            if resp_clean and resp_clean not in seen_msgs:
                                history.append({"role": "assistant", "content": resp_clean})
                                seen_msgs.add(resp_clean)

                deduped_history = []
                for msg in history:
                    if not deduped_history:
                        deduped_history.append(msg)
                    else:
                        last_msg = deduped_history[-1]
                        if msg.get("role") == last_msg.get("role") and msg.get("content", "").strip() == last_msg.get("content", "").strip():
                            continue
                        deduped_history.append(msg)
                history = deduped_history

                if len(history) > (db_agent.context_window * 2):
                    history = history[-(db_agent.context_window * 2):]

                if history:
                    num_pairs = len(past_events)
                    webhook_tasks._add_step(db, event_id, "🧠 Memória de Contexto", f"Injetadas {num_pairs} interações brutas ({len(history)} mensagens) como contexto.")
        except Exception as e:
            logger.error(f"Erro ao recuperar histórico para contexto: {e}")
            webhook_tasks._add_step(db, event_id, "⚠️ Erro na Memória", "Não foi possível carregar o histórico ou resumo anterior.")
            
    return history



def _get_cost(model, usage):
    if not usage: return 0
    if not model or not isinstance(model, str):
        model = "gpt-4o-mini"

    p_tokens = usage.get("prompt_tokens", 0) or (usage.get("mini_prompt", 0) + usage.get("main_prompt", 0))
    c_tokens = usage.get("completion_tokens", 0) or (usage.get("mini_completion", 0) + usage.get("main_completion", 0))
    cached_tokens = usage.get("cached_tokens", 0) or 0
    
    from api.services.cost_service import calculate_ai_cost
    _, cost_brl = calculate_ai_cost(model, p_tokens, c_tokens, cached_tokens)
    return cost_brl


def _build_agent_config(db_agent):
    """Build AgentConfig pydantic object from DB model."""
    import json as _json
    return AgentConfig(
        id=db_agent.id,
        name=db_agent.name,
        description=db_agent.description,
        model=db_agent.model,
        fallback_model=db_agent.fallback_model,
        temperature=db_agent.temperature,
        top_p=db_agent.top_p,
        date_awareness=db_agent.date_awareness,
        system_prompt=db_agent.system_prompt,
        context_window=db_agent.context_window,
        knowledge_base=_json.loads(db_agent.knowledge_base) if db_agent.knowledge_base else [],
        knowledge_base_id=None,
        knowledge_base_ids=[],
        rag_retrieval_count=db_agent.rag_retrieval_count,
        rag_translation_enabled=db_agent.rag_translation_enabled,
        rag_multi_query_enabled=db_agent.rag_multi_query_enabled,
        rag_rerank_enabled=db_agent.rag_rerank_enabled,
        rag_agentic_eval_enabled=db_agent.rag_agentic_eval_enabled,
        rag_parent_expansion_enabled=db_agent.rag_parent_expansion_enabled,
        tool_ids=[],
        is_active=db_agent.is_active,
        simulated_time=db_agent.simulated_time,
        security_competitor_blacklist=db_agent.security_competitor_blacklist,
        security_forbidden_topics=db_agent.security_forbidden_topics,
        security_discount_policy=db_agent.security_discount_policy,
        security_language_complexity=db_agent.security_language_complexity,
        security_pii_filter=db_agent.security_pii_filter,
        security_bot_protection=db_agent.security_bot_protection,
        security_max_messages_per_session=db_agent.security_max_messages_per_session,
        security_semantic_threshold=db_agent.security_semantic_threshold,
        security_loop_count=db_agent.security_loop_count,
        security_validator_ia=db_agent.security_validator_ia,
        inbox_capture_enabled=db_agent.inbox_capture_enabled,
        ui_primary_color=db_agent.ui_primary_color,
        ui_header_color=db_agent.ui_header_color,
        ui_chat_title=db_agent.ui_chat_title,
        ui_welcome_message=db_agent.ui_welcome_message,
        router_enabled=db_agent.router_enabled,
        router_simple_model=db_agent.router_simple_model,
        router_simple_fallback_model=db_agent.router_simple_fallback_model,
        router_complex_model=db_agent.router_complex_model,
        handoff_enabled=db_agent.handoff_enabled,
        response_translation_enabled=db_agent.response_translation_enabled,
        response_translation_fallback_lang=db_agent.response_translation_fallback_lang or "portuguese",
        top_k=db_agent.top_k,
        presence_penalty=db_agent.presence_penalty,
        frequency_penalty=db_agent.frequency_penalty,
        safety_settings=db_agent.safety_settings,
        model_settings=_json.loads(db_agent.model_settings) if db_agent.model_settings else {},
        qualification_questions=db_agent.qualification_questions,
        qualification_labels=db_agent.qualification_labels,
        initial_question_message=db_agent.initial_question_message,
    )


def _send_zapvoice_message(db, event_id, conversation_id, client_id, content, config, split_paragraphs=False, delay=0, meta_data=None, total_cost=None):
    """
    Envia a resposta do agente para o ZapVoice. Mapeado de webhook_tasks para respeitar limite de clean code.
    Nas partes intermediárias envia apenas o content. Na última parte envia content + total_cost / meta_data.
    """
    import webhook_tasks
    try:
        url = (config.zapvoice_url or os.getenv("ZAPVOICE_URL", "")).rstrip("/")
        if url and not url.endswith("/api"):
            url = f"{url}/api"
        token = config.zapvoice_api_token or os.getenv("ZAPVOICE_API_TOKEN", "")
        
        if not url or not token:
            webhook_tasks._add_step(db, event_id, "❌ Erro: ZapVoice não configurado", "URL ou Token ausentes no .env/config.")
            return False

        if not conversation_id or not client_id:
            webhook_tasks._add_step(db, event_id, "❌ Erro: Dados faltantes", f"conversa_id={conversation_id}, client_id={client_id}")
            return False

        from agent_core.utils import format_whatsapp_message
        formatted_content = format_whatsapp_message(content)

        import re
        if split_paragraphs:
            parts = [p.strip() for p in re.split(r'\n\n+', formatted_content) if p.strip()]
            if not parts: parts = [formatted_content]
        else:
            parts = [formatted_content]

        total_parts = len(parts)
        if total_parts > 1:
            webhook_tasks._add_step(db, event_id, "✂️ Resposta Fragmentada", f"A mensagem será enviada em {total_parts} partes com delay de {delay}s entre elas.")

        headers = {
            "Authorization": f"Bearer {token}",
            "X-Client-ID": str(client_id),
            "Content-Type": "application/json"
        }
        full_url = f"{url}/chat/conversations/{conversation_id}/messages"

        import httpx
        import time
        success = True
        for i, part in enumerate(parts):
            time.sleep(1)
            is_last_part = (i == total_parts - 1)
            
            payload = {"content": part, "is_private": False}
            # Apenas na última parte enviamos o custo total / meta_data
            if is_last_part:
                if total_cost is not None:
                    payload["total_cost"] = total_cost
                if meta_data is not None:
                    payload["meta_data"] = meta_data
            
            part_success = False
            last_err_msg = ""
            for attempt in range(1, 4):
                try:
                    with httpx.Client(timeout=60.0) as client:
                        resp = client.post(full_url, json=payload, headers=headers)
                        if resp.status_code in (200, 201):
                            part_success = True
                            break
                        else:
                            last_err_msg = f"Status {resp.status_code}: {resp.text[:200]}"
                except Exception as http_err:
                    last_err_msg = str(http_err)
                
                # Se falhou e ainda restam tentativas, aguarda um tempo progressivo (2s, 4s) antes de tentar novamente
                if not part_success and attempt < 3:
                    time.sleep(2 * attempt)
            
            if not part_success:
                webhook_tasks._add_step(db, event_id, f"❌ Falha de Conexão (Parte {i+1})", f"Tentativas esgotadas (60s timeout). Último erro: {last_err_msg}")
                success = False
                break

            if i < total_parts - 1 and delay > 0:
                time.sleep(delay)

        if success:
            if total_parts > 1:
                webhook_tasks._add_step(db, event_id, "📤 Partes entregues", f"Todas as {total_parts} partes foram enviadas com sucesso ao ZapVoice.")
            else:
                webhook_tasks._add_step(db, event_id, "📤 Resposta enviada ao ZapVoice", f"Mensagem única entregue com sucesso.")
        
        return success
    except Exception as e:
        webhook_tasks._add_step(db, event_id, "❌ Erro crítico no envio", str(e))
        return False


def auto_migrate_webhook_columns(db):
    """Garante a auto-migração de colunas necessárias em webhook_configs."""
    from sqlalchemy import text
    try:
        db.execute(text("ALTER TABLE webhook_configs ADD COLUMN IF NOT EXISTS zapvoice_url TEXT"))
        db.execute(text("ALTER TABLE webhook_configs ADD COLUMN IF NOT EXISTS zapvoice_api_token TEXT"))
        db.execute(text("ALTER TABLE webhook_configs ADD COLUMN IF NOT EXISTS zapvoice_client_id TEXT"))
        db.execute(text("ALTER TABLE webhook_configs ADD COLUMN IF NOT EXISTS response_delay_seconds INTEGER DEFAULT 0"))
        db.execute(text("ALTER TABLE webhook_configs ADD COLUMN IF NOT EXISTS split_response_enabled BOOLEAN DEFAULT TRUE"))
        db.execute(text("ALTER TABLE webhook_configs ADD COLUMN IF NOT EXISTS process_audio BOOLEAN DEFAULT TRUE"))
        db.execute(text("ALTER TABLE webhook_configs ADD COLUMN IF NOT EXISTS process_image BOOLEAN DEFAULT TRUE"))
        db.execute(text("ALTER TABLE webhook_configs ADD COLUMN IF NOT EXISTS delete_labels TEXT"))
        db.execute(text("ALTER TABLE webhook_configs ADD COLUMN IF NOT EXISTS negative_feedback_label TEXT"))
        db.execute(text("ALTER TABLE webhook_configs ADD COLUMN IF NOT EXISTS project_assistant_label VARCHAR"))
        db.execute(text("ALTER TABLE webhook_configs ADD COLUMN IF NOT EXISTS project_assistant_keyword VARCHAR"))
        db.execute(text("ALTER TABLE webhook_configs ADD COLUMN IF NOT EXISTS project_assistant_deactivate_keyword VARCHAR"))
        db.execute(text("ALTER TABLE webhook_configs ADD COLUMN IF NOT EXISTS project_assistant_entry_message TEXT"))
        db.execute(text("ALTER TABLE webhook_configs ADD COLUMN IF NOT EXISTS project_assistant_exit_message TEXT"))
        db.commit()
    except Exception as e:
        db.rollback()
        logger.warning(f"Erro na auto-migração de colunas: {e}")


def resolve_grouped_media(db, event, config, event_id):
    """Aguardar a conclusão de mídias pendentes agrupadas e integrá-las."""
    import webhook_tasks
    import time
    from datetime import timedelta
    webhook_tasks._add_step(db, event_id, "⏳ Aguardando mídias", "Algumas mídias deste grupo ainda estão sendo processadas. Aguardando conclusão...")
    
    for attempt in range(12): 
        media_events = db.query(WebhookEventModel).filter(
            WebhookEventModel.webhook_config_id == config.id,
            WebhookEventModel.telefone == event.telefone,
            WebhookEventModel.message_type.in_(["audio", "image"]),
            WebhookEventModel.status.in_(["media_ready", "grouped", "completed"]),
            WebhookEventModel.created_at >= event.created_at - timedelta(minutes=5)
        ).all()
        
        changed = False
        current_msg = event.mensagem
        for me in media_events:
            placeholder = f"[{me.message_type.upper()} PENDENTE]"
            
            if placeholder in current_msg and me.mensagem and placeholder not in me.mensagem:
                content = me.mensagem
                if me.message_type == "image":
                    content = f"[IMAGEM: {me.mensagem}]"
                
                idx = current_msg.find(placeholder)
                after_placeholder = current_msg[idx + len(placeholder):]
                if after_placeholder and not after_placeholder.startswith((" ", "\n", "?", "!", ".", ",")):
                    content += " "
                    
                current_msg = current_msg.replace(placeholder, content, 1)
                changed = True
        
        if changed:
            event.mensagem = current_msg
            db.commit()
        
        if "[AUDIO PENDENTE]" not in event.mensagem and "[IMAGE PENDENTE]" not in event.mensagem:
            webhook_tasks._add_step(db, event_id, "✅ Mídias Resolvidas", "Todas as transcrições/análises foram integradas com sucesso.")
            break
        
        if attempt < 11:
            time.sleep(5)
        else:
            webhook_tasks._add_step(db, event_id, "⚠️ Timeout de Mídia", "Algumas mídias não terminaram a tempo. Processando com o que temos.")


def proactive_update_lead_table(db, event, config, response_text, lead_internal_id, cw_labels):
    """Atualiza proativamente a tabela local de leads/contatos."""
    import webhook_tasks
    from sqlalchemy import text
    try:
        table = config.leads_table
        
        update_fields = [
            "contato_nome = :nome",
            "telefone = :tel",
            "conversa_id = :cid",
            "conta_id = :conta_id",
            "inbox_id = :inbox_id",
            "inbox_nome = :inbox_nome",
            "ultima_resposta_agente = :resp",
            "ultima_resposta_agente_em = :now",
            "updated_at = :now"
        ]
        
        params = {
            "nome": event.contato_nome,
            "resp": response_text,
            "tel": event.telefone,
            "wid": config.id,
            "cid": event.conversa_id,
            "conta_id": event.conta_id,
            "inbox_id": event.inbox_id,
            "inbox_nome": event.inbox_nome,
            "now": get_now_utc()
        }

        if event.created_at:
            update_fields.append("ultima_mensagem_em = :last_msg_at")
            params["last_msg_at"] = event.created_at
        
        if event.message_type and event.message_type != 'text':
            update_fields.append("message_type = :mtype")
            params["mtype"] = event.message_type

        if event.link and str(event.link).strip() and str(event.link).strip() != "None":
            update_fields.append("link = :link")
            params["link"] = event.link
        
        if cw_labels is not None:
            update_fields.append("labels = :labels")
            params["labels"] = json.dumps(cw_labels, ensure_ascii=False)
        
        from webhooks.utils import normalize_phone, get_phone_suffix
        phone_clean = normalize_phone(event.telefone)
        tel_suffix = get_phone_suffix(phone_clean)
        params["tel_suffix"] = tel_suffix

        if lead_internal_id:
            params["lid"] = lead_internal_id
            where_clause = "id = :lid"
        else:
            where_clause = "webhook_config_id = :wid AND (telefone = :tel OR telefone LIKE '%' || :tel_suffix || '%')"

        db.execute(text(f"""
            UPDATE {table} SET
                {", ".join(update_fields)}
            WHERE {where_clause}
        """), params)
        db.commit()
        
        labels_log = f"labels ({json.dumps(cw_labels, ensure_ascii=False)})" if cw_labels is not None else "labels preservadas"
        webhook_tasks._add_step(db, event.id, "💾 Tabela de Leads Atualizada", f"Nome, telefone, {labels_log} e resposta do agente salvos de forma proativa.")
    except Exception as le:
        logger.error(f"Erro ao atualizar leads table proativamente: {le}")
        webhook_tasks._add_step(db, event.id, "⚠️ Aviso: Falha ao salvar no Contato", str(le))


def save_interaction_log(db, event, config, response_text, ai_metadata, session_id, db_agent):
    """Registra a interação financeira no banco de dados."""
    import webhook_tasks
    try:
        ai_usage = ai_metadata.get("usage")
        p_tokens = 0
        c_tokens = 0
        cached_toks = 0
        if ai_usage:
            if isinstance(ai_usage, dict):
                p_tokens = ai_usage.get("prompt_tokens", 0) or (ai_usage.get("main_prompt", 0) + ai_usage.get("mini_prompt", 0))
                c_tokens = ai_usage.get("completion_tokens", 0) or (ai_usage.get("main_completion", 0) + ai_usage.get("mini_completion", 0))
                cached_toks = ai_usage.get("cached_tokens", 0) or 0
            else:
                p_tokens = getattr(ai_usage, "prompt_tokens", 0)
                c_tokens = getattr(ai_usage, "completion_tokens", 0)
                cached_toks = getattr(ai_usage, "cached_tokens", 0) or 0

        new_log = InteractionLog(
            agent_id=config.agent_id,
            session_id=session_id,
            user_message=event.mensagem,
            agent_response=response_text,
            model_used=ai_metadata.get("model", db_agent.model),
            input_tokens=p_tokens,
            output_tokens=c_tokens,
            cached_tokens=cached_toks,
            cost_usd=ai_metadata.get("cost_usd", (ai_metadata.get("cost", 0) / 6.0)),
            cost_brl=ai_metadata.get("cost", 0),
            timestamp=get_now_utc()
        )
        db.add(new_log)
        db.commit()
        webhook_tasks._add_step(db, event.id, "💰 Registro Financeiro", f"Custo registrado: R$ {new_log.cost_brl:.4f} ({p_tokens + c_tokens} tokens, {cached_toks} cache)")
    except Exception as log_err:
        logger.error(f"Erro ao salvar InteractionLog no Webhook: {log_err}")
        webhook_tasks._add_step(db, event.id, "⚠️ Erro no Financeiro", "Não foi possível registrar o custo desta interação.")


async def get_project_assistant_context(db, config):
    """
    Consolida as métricas do projeto para o Assistente de Projeto.
    Retorna leads no mês, vendas no mês e suportes acionados na semana.
    """
    from datetime import datetime, timezone, timedelta
    from sqlalchemy import text
    
    now = datetime.now(timezone.utc)
    start_of_month = datetime(now.year, now.month, 1, tzinfo=timezone.utc)
    start_of_week = now - timedelta(days=7)
    
    # 1. Leads no mês
    leads_count = 0
    if config.leads_table:
        try:
            leads_res = await db.execute(
                text(f"SELECT COUNT(*) FROM {config.leads_table} WHERE created_at >= :start_of_month"),
                {"start_of_month": start_of_month}
            )
            leads_count = leads_res.scalar() or 0
        except Exception as e:
            logger.warning(f"Erro ao contar leads no mês: {e}")
            
    # 2. Vendas no mês
    sales_count = 0
    sales_total = 0.0
    try:
        sales_res = await db.execute(
            text("SELECT COUNT(*), SUM(valor) FROM sales WHERE created_at >= :start_of_month"),
            {"start_of_month": start_of_month}
        )
        row = sales_res.fetchone()
        if row:
            sales_count = row[0] or 0
            sales_total = float(row[1] or 0.0)
    except Exception as e:
        logger.warning(f"Erro ao contar vendas no mês: {e}")
        
    # 3. Suportes na semana
    support_requests_list = []
    try:
        support_res = await db.execute(
            text("SELECT user_name, contact_phone, user_email, status, created_at FROM support_requests WHERE created_at >= :start_of_week"),
            {"start_of_week": start_of_week}
        )
        for r in support_res.fetchall():
            support_requests_list.append({
                "nome": r[0] or "Sem nome",
                "telefone": r[1] or "Sem telefone",
                "email": r[2] or "Sem email",
                "status": r[3] or "Aberto",
                "data": r[4].strftime("%d/%m/%Y %H:%M") if r[4] else "Desconhecida"
            })
    except Exception as e:
        logger.warning(f"Erro ao buscar suportes na semana: {e}")
        
    # 4. Leads frios/mornos para análise de conversão
    leads_for_conversion = []
    if config.leads_table:
        try:
            conversion_res = await db.execute(text(f"""
                SELECT contato_nome, telefone, lead_classification, lead_justification 
                FROM {config.leads_table} 
                WHERE lead_classification IS NOT NULL AND lead_classification != ''
                ORDER BY created_at DESC LIMIT 10
            """))
            for r in conversion_res.fetchall():
                leads_for_conversion.append({
                    "nome": r[0] or "Sem nome",
                    "telefone": r[1] or "Sem telefone",
                    "classificacao": r[2] or "Desconhecida",
                    "justificativa": r[3] or "Sem justificativa"
                })
        except Exception as e:
            logger.warning(f"Erro ao buscar leads para análise de conversão: {e}")
            
    return {
        "leads_count": leads_count,
        "sales_count": sales_count,
        "sales_total": sales_total,
        "support_requests": support_requests_list,
        "leads_for_conversion": leads_for_conversion
    }


