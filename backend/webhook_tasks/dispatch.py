import os
import json
import logging
from sqlalchemy import select
from models import WebhookEventModel, GlobalContextVariableModel, UserMemoryModel

logger = logging.getLogger(__name__)

def handle_post_execution_and_dispatch(
    db,
    event,
    config,
    db_agent,
    result,
    history: list,
    session_id: str,
    lead_internal_id,
    event_id: int,
    is_simulated: bool
):
    """Processa o resultado da IA, formata Raio-X, grava logs, dispara mensagem e limpa debounce."""
    import webhook_tasks

    # 1. TRATAMENTO DE STATUS DE ENCERRAMENTO PRECOCE
    if isinstance(result, dict) and result.get("ignored_by_defense"):
        event.status = "ignored"
        db.commit()
        webhook_tasks._add_step(db, event_id, "🛡️ Pipeline Ignorado pelo Bot Defense", "Processamento interrompido devido a proteção anti-loop/limite de mensagens.")
        _clean_debounce(config.id, event.telefone)
        return

    if isinstance(result, dict) and result.get("ignored_automatic"):
        event.status = "ignored"
        db.commit()
        _clean_debounce(config.id, event.telefone)
        return

    if isinstance(result, dict) and result.get("ignored_recurrent_thanks"):
        event.status = "ignored_recurrent_thanks"
        db.commit()
        webhook_tasks._add_step(db, event_id, "🤫 Automação Silenciada (Agradecimento Recorrente)", "2º agradecimento/encerramento consecutivo detectado. Nenhuma mensagem foi enviada para evitar loop.")
        _clean_debounce(config.id, event.telefone)
        return

    if isinstance(result, dict) and result.get("ignored_by_ad"):
        event.status = "ignored"
        db.commit()
        webhook_tasks._add_step(db, event_id, "📢 Pipeline Ignorado - Mensagem de Anúncio", "Processamento interrompido porque a mensagem é um anúncio e foi ignorada.")
        _clean_debounce(config.id, event.telefone)
        return

    # 2. FORMATAR RAIO-X / DEBUG
    actual_debug = result.get("debug", {}) if isinstance(result, dict) else {}
    resolved_prompt = actual_debug.get("resolved_prompt") or db_agent.system_prompt
    rag_context = actual_debug.get("rag_context", "")

    user_msg_sent = actual_debug.get("user_message_sent") or event.mensagem
    display_history = history.copy() if history else []
    if user_msg_sent:
        display_history.append({"role": "user", "content": user_msg_sent})
    elif event.mensagem:
        display_history.append({"role": "user", "content": event.mensagem})

    is_bypassed = False
    if isinstance(result, dict) and result.get("debug"):
        is_bypassed = result.get("debug").get("is_greeting") or result.get("debug").get("needs_clarification")

    debug_payload = {
        "modelo": str(result.get("model")) if isinstance(result, dict) else str(getattr(db_agent, 'model', 'gpt-4o-mini')),
        "mensagem_original": event.mensagem,
        "mensagem_enviada_ao_agente": user_msg_sent,
        "prompt_sistema": str(resolved_prompt) if resolved_prompt else "",
        "prompt_pre_router": str(result.get("_debug_prompt")) if isinstance(result, dict) and result.get("_debug_prompt") else None,
        "contexto_rag": str(rag_context) if rag_context else "",
        "memoria_contexto": display_history,
        "limite_janela": getattr(db_agent, 'context_window', 5) if isinstance(getattr(db_agent, 'context_window', 5), int) else 5,
        "metadados": {
            "session_id": str(session_id) if session_id else "",
            "user_name": str(event.contato_nome) if event.contato_nome else None,
            "phone": str(event.telefone) if event.telefone else None,
        },
        "ferramentas_habilitadas": [getattr(t, 'name', str(t)) for t in db_agent.tools] if hasattr(db_agent, 'tools') and isinstance(db_agent.tools, list) else []
    }
    
    if isinstance(result, dict) and result.get("from_semantic_cache"):
        debug_payload["cache_semantico"] = {
            "usou_cache": True,
            "similaridade": result.get("cached_similarity"),
            "similaridade_pct": result.get("cached_similarity_pct"),
            "pergunta_original_cache": result.get("cached_original_query"),
            "cache_id": result.get("cached_id"),
            "custo": "R$ 0,00",
            "tokens": 0
        }
    
    step_title = "🔍 Raio-X: Contexto Enviado"
    if isinstance(result, dict) and result.get("from_semantic_cache"):
        step_title += " (Cache Semântico)"
    elif is_bypassed:
        step_title += " (Ignorado)"
        
    webhook_tasks._add_step(db, event_id, step_title, json.dumps(debug_payload, default=str, ensure_ascii=False, indent=2))
    
    response_text = result.get("content", "") if isinstance(result, dict) else str(result)
    ai_usage = result.get("usage") if isinstance(result, dict) else None
    
    if hasattr(ai_usage, "to_dict"):
        ai_usage = ai_usage.to_dict()

    ai_metadata = {
        "model": result.get("model") if isinstance(result, dict) else db_agent.model,
        "usage": ai_usage,
    }
    if ai_metadata["usage"]:
        ai_metadata["cost"] = webhook_tasks._get_cost(ai_metadata["model"], ai_metadata["usage"])
    ai_metadata["event_id"] = event_id

    tool_calls = result.get("debug", {}).get("tool_calls", []) if isinstance(result, dict) else []
    if tool_calls:
        tools_summary = []
        for tc in tool_calls:
            t_name = tc.get("name", "Desconhecida")
            t_args = tc.get("args", "{}")
            t_out = tc.get("output", "Sem retorno")
            tools_summary.append(f"🛠️ **{t_name}**\n📥 Input: `{t_args}`\n📤 Output: {t_out}")
        
        webhook_tasks._add_step(db, event_id, "🛠️ Ferramentas acionadas", "\n\n".join(tools_summary))

    is_error = isinstance(result, dict) and result.get("error", False)
    is_cache = isinstance(result, dict) and result.get("from_semantic_cache", False)
    
    resp_title = "✅ Resposta gerada pelo agente"
    if is_error:
        resp_title = "❌ Erro na integração da IA"
    elif is_cache:
        sim_pct = result.get("cached_similarity_pct") or f"{round((result.get('cached_similarity') or 1.0) * 100, 1)}%"
        resp_title = f"⚡ Resposta do Cache Semântico ({sim_pct} Similaridade · Custo Zero)"
        ai_metadata["from_semantic_cache"] = True
        ai_metadata["cached_similarity_pct"] = sim_pct
        ai_metadata["cached_original_query"] = result.get("cached_original_query")
        ai_metadata["cost"] = 0.0
        ai_metadata["usage"] = {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0, "cached_tokens": 0}
    elif is_bypassed:
        resp_title = "⚡ Resposta direta do Pre-Router"
        
    webhook_tasks._add_step(db, event_id, resp_title, 
              (response_text or "")[:1000] + ("..." if len(response_text or "") > 1000 else ""),
              metadata=ai_metadata)

    event.agent_response = response_text
    db.commit()

    webhook_tasks.save_interaction_log(db, event, config, response_text, ai_metadata, session_id, db_agent)

    if response_text and config.leads_table and event.telefone:
        zv_url = (config.zapvoice_url or os.getenv("ZAPVOICE_URL", "")).rstrip("/")
        zv_token = config.zapvoice_api_token or os.getenv("ZAPVOICE_API_TOKEN", "")
        zv_labels = None
        if zv_url and zv_token and event.conversa_id and event.conta_id:
            from zapvoice_utils import get_conversation_labels_sync
            zv_labels = get_conversation_labels_sync(
                zv_url,
                str(event.conta_id),
                int(event.conversa_id) if str(event.conversa_id).isdigit() else 0,
                zv_token
            )
        webhook_tasks.proactive_update_lead_table(db, event, config, response_text, lead_internal_id, zv_labels)
    
    response_delay = getattr(config, 'response_delay_seconds', 0) or 0
    
    # Construção de processing_steps e custos detalhados para envio ao ZapVoice
    processing_steps_list = []
    router_tokens = result.get("router_tokens", {}) if isinstance(result, dict) else {}
    router_model = result.get("router_model") or "gpt-4o-mini"
    pr_prompt_tokens = router_tokens.get("prompt", 0) or 0
    pr_comp_tokens = router_tokens.get("completion", 0) or 0
    
    if pr_prompt_tokens > 0 or pr_comp_tokens > 0 or is_bypassed:
        pr_cost = webhook_tasks._get_cost(router_model, {
            "prompt_tokens": pr_prompt_tokens,
            "completion_tokens": pr_comp_tokens
        })
        processing_steps_list.append({
            "step": "Pré-Router (Classificação)",
            "cost": round(pr_cost, 6)
        })

    if not is_bypassed and not is_error:
        main_model = result.get("model") if isinstance(result, dict) else getattr(db_agent, 'model', 'gpt-4o')
        main_prompt = (ai_usage.get("main_prompt", 0) if ai_usage else 0) or max(0, (ai_usage.get("prompt_tokens", 0) if ai_usage else 0) - pr_prompt_tokens)
        main_comp = (ai_usage.get("main_completion", 0) if ai_usage else 0) or max(0, (ai_usage.get("completion_tokens", 0) if ai_usage else 0) - pr_comp_tokens)
        main_cached = ai_usage.get("cached_tokens", 0) if ai_usage else 0
        
        main_cost = webhook_tasks._get_cost(main_model, {
            "prompt_tokens": main_prompt,
            "completion_tokens": main_comp,
            "cached_tokens": main_cached
        })
        
        model_str = str(main_model)
        if "gpt-4o-mini" in model_str.lower():
            model_name_display = "GPT-4o-mini"
        elif "gpt-4o" in model_str.lower():
            model_name_display = "GPT-4o"
        elif "claude-3-5" in model_str.lower():
            model_name_display = "Claude 3.5 Sonnet"
        else:
            model_name_display = model_str
            
        processing_steps_list.append({
            "step": f"Agente Principal ({model_name_display})",
            "cost": round(main_cost, 6)
        })

    # Carrega o pipeline completo de raciocínio, ferramentas e contexto executados pelo agente
    current_pipeline = []
    try:
        if event.processing_steps:
            current_pipeline = json.loads(event.processing_steps)
    except Exception:
        current_pipeline = []

    zapvoice_metadata = {
        "processing_steps": processing_steps_list,
        "pipeline": current_pipeline
    }

    total_execution_cost = round(sum(step.get("cost", 0) for step in processing_steps_list), 6) if processing_steps_list else None

    send_success = True
    is_question_funnel = bool(result.get("from_question_funnel")) if isinstance(result, dict) else False
    funnel_steps = result.get("funnel_steps", []) if isinstance(result, dict) else []

    if is_simulated:
        webhook_tasks._add_step(db, event_id, "📤 Resposta Final Enviada (MOCK)", f"Mensagem simulada enviada com sucesso no ambiente MOCK:\n\n{response_text}")
        send_success = True
    elif is_error:
        webhook_tasks._add_step(db, event_id, "🛑 Disparo Cancelado devido a Erro de IA", f"O envio de mensagem via ZapVoice/WhatsApp foi cancelado para não enviar erro técnico ao cliente final.\n\nDetalhes do erro: {response_text}")
        send_success = False
    elif is_question_funnel and funnel_steps and event.conversa_id and event.conta_id:
        webhook_tasks._add_step(db, event_id, "🎯 Disparando Funil por Dúvida", f"Iniciando envio sequencial de {len(funnel_steps)} passos pré-configurados.")
        import time
        send_success = True
        for idx_st, st in enumerate(funnel_steps):
            st_type = st.get("type", "text")
            st_delay = int(st.get("delay_seconds", 0) or 0)
            if idx_st == 0 and st_delay == 0 and response_delay > 0:
                time.sleep(response_delay)
            elif st_delay > 0:
                time.sleep(st_delay)
            st_attachments = None
            st_content = st.get("content") or ""
            if st_type in ("audio", "video", "image", "document") and st.get("media_url"):
                media_url_clean = str(st.get("media_url")).strip()
                if "minio:9000" in media_url_clean or "minio/zap-voice" in media_url_clean:
                    fname = media_url_clean.split("?")[0].split("/")[-1]
                    public_base = (os.getenv("BACKEND_PUBLIC_URL") or os.getenv("CLOUDFLARE_TUNNEL_URL") or os.getenv("PUBLIC_URL") or os.getenv("BACKEND_URL", "http://localhost:8002")).rstrip("/")
                    media_url_clean = f"{public_base}/api/question-funnels/media/{fname}"
                elif media_url_clean.startswith("/"):
                    public_base = (os.getenv("BACKEND_PUBLIC_URL") or os.getenv("CLOUDFLARE_TUNNEL_URL") or os.getenv("PUBLIC_URL") or os.getenv("BACKEND_URL", "http://localhost:8002")).rstrip("/")
                    media_url_clean = f"{public_base}{media_url_clean}"

                st_attachments = [{
                    "file_type": st.get("media_type") or st_type,
                    "data_url": media_url_clean
                }]
                webhook_tasks._add_step(db, event_id, f"🎙️ Enviando {st_type.upper()} do Funil", f"Passo #{idx_st+1}: {media_url_clean}")
            is_last = (idx_st == len(funnel_steps) - 1)
            step_meta = zapvoice_metadata if is_last else None
            step_cost = total_execution_cost if is_last else None
            step_ok = webhook_tasks._send_zapvoice_message(
                db, event_id, event.conversa_id, event.conta_id, st_content, config,
                split_paragraphs=False, delay=0, meta_data=step_meta, total_cost=step_cost,
                attachments=st_attachments
            )
            if not step_ok:
                send_success = False
    elif response_text and event.conversa_id and event.conta_id:
        split_enabled = getattr(config, 'split_response_enabled', True)
        if split_enabled is None:
            split_enabled = True
        send_success = webhook_tasks._send_zapvoice_message(
            db, event_id, event.conversa_id, event.conta_id, response_text, config,
            split_paragraphs=split_enabled, delay=response_delay,
            meta_data=zapvoice_metadata, total_cost=total_execution_cost
        )
    elif event.conversa_id and event.conta_id:
        fallback_msg = getattr(config, 'fallback_empty_response', None)
        if not fallback_msg:
            fallback_msg = (
                "Olá! Recebi sua mensagem e estou verificando as informações para te responder com precisão. "
                "Aguarde um momento, por favor. 😊"
            )
        webhook_tasks._add_step(db, event_id, "⚠️ Resposta Vazia - Enviando Fallback",
                  f"O agente não gerou conteúdo. Mensagem padrão enviada ao cliente: {fallback_msg[:100]}")
        send_success = webhook_tasks._send_zapvoice_message(
            db, event_id, event.conversa_id, event.conta_id, fallback_msg, config,
            meta_data=zapvoice_metadata, total_cost=total_execution_cost
        )
    else:
        webhook_tasks._add_step(db, event_id, "⚠️ Resposta Vazia", "O agente gerou uma resposta vazia e não há dados de conversa válidos.")
        send_success = False

    # 3. REGISTRAR ETAPA DE VARIÁVEIS EXTRAÍDAS
    try:
        all_vars_stmt = select(GlobalContextVariableModel)
        all_vars_res = db.execute(all_vars_stmt)
        all_vars = all_vars_res.scalars().all()
        
        if all_vars:
            all_sids = list({str(session_id), str(lead_internal_id), str(event.conversa_id)} - {"None", "", None})
            mem_stmt = select(UserMemoryModel).where(UserMemoryModel.session_id.in_(all_sids))
            mem_res = db.execute(mem_stmt)
            mems = mem_res.scalars().all()
            mem_dict = {m.key: m.value for m in mems if m.value is not None and str(m.value).strip() != ""}
            
            saved_vars = {}
            pending_vars = []
            for v in all_vars:
                if v.key in mem_dict:
                    saved_vars[v.key] = mem_dict[v.key]
                elif v.key in ["contact_name", "nome", "nome_cliente"] and (event.contato_nome or "").strip():
                    saved_vars[v.key] = event.contato_nome.strip()
                elif v.key in ["contact_phone", "telefone", "telefone_cliente"] and (event.telefone or "").strip():
                    saved_vars[v.key] = event.telefone.strip()
                elif v.extraction_method == "ai":
                    pending_vars.append(v.key)
            
            detail_text = ""
            if saved_vars:
                detail_text += "✅ **Variáveis Extraídas e Salvas:**\n"
                for k, val in saved_vars.items():
                    detail_text += f"- **`{k}`**: {val}\n"
            else:
                detail_text += "ℹ️ Nenhuma variável de IA foi extraída nesta sessão até o momento.\n"
            
            if pending_vars:
                if saved_vars: detail_text += "\n"
                detail_text += "⏳ **Variáveis Pendentes de Extração:**\n"
                for k in pending_vars:
                    detail_text += f"- `{k}` (Aguardando menção no diálogo)\n"
            
            webhook_tasks._add_step(
                db, event_id, "📊 Variáveis Extraídas", 
                detail_text, 
                metadata={"saved": saved_vars, "pending": pending_vars}
            )
    except Exception as e_log_vars:
        logger.error(f"Erro ao adicionar etapa de variáveis extraídas no pipeline: {e_log_vars}")

    if is_error:
        event.status = "error_ai"
        db.commit()
        webhook_tasks._add_step(db, event_id, "🛑 Pipeline Interrompido (Erro de IA)", "O envio via WhatsApp foi evitado devido a falha no provedor de IA. O rastro do erro está registrado no Raio-X.")
    else:
        event.status = "completed" if send_success else "error"
        db.commit()
        if send_success:
            webhook_tasks._add_step(db, event_id, "🏁 Pipeline Finalizado", "Processamento concluído com sucesso.")
        else:
            webhook_tasks._add_step(db, event_id, "❌ Pipeline Finalizado com Falha no Envio", "O processamento foi concluído, mas o envio da mensagem falhou.")

    _clean_debounce(config.id, event.telefone)


def _clean_debounce(config_id, phone):
    """Limpa chaves de debounce no Redis."""
    try:
        import redis as redis_lib
        _redis_local = redis_lib.from_url(os.getenv("REDIS_URL", "redis://redis:6379/0"), decode_responses=True)
        _redis_local.delete(f"webhook:debounce:id:{config_id}:{phone}")
        _redis_local.delete(f"webhook:debounce:text:{config_id}:{phone}")
        logger.info(f"🧹 Limpeza de debounce concluída para {phone}")
    except Exception as redis_err:
        logger.error(f"Erro ao limpar redis: {redis_err}")
