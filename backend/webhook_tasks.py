import os
import json
import logging
import asyncio
import httpx
import time
import re
from datetime import datetime, timezone, timedelta
from sqlalchemy import text
from celery_app import app
from database import SessionLocal, async_session_worker
from models import WebhookEventModel, WebhookConfigModel, AgentConfigModel, KnowledgeItemModel, KnowledgeBaseModel, InteractionLog
from config_store import AgentConfig
from agent import process_message
from agent_core.logic.pre_router import run_pre_router_ai
from rag_service import get_embedding
from zapvoice_utils import is_conversation_paused, sync_conversation_labels
from core.timezone import get_now_br, get_now_utc
from core.websocket import manager
from agent_core.services.media_service import process_media_content
from celery import shared_task

# Import logic from webhook_services
from webhook_services import (
    execute_keyword_deletion_trap,
    check_automation_trap,
    retrieve_context_history,
    _get_cost,
    _build_agent_config,
    _send_zapvoice_message,
    auto_migrate_webhook_columns,
    resolve_grouped_media,
    proactive_update_lead_table,
    save_interaction_log,
    get_project_assistant_context
)

logger = logging.getLogger(__name__)

# --- LOCAL UTILITIES & HELPERS FOR TEST BACKWARD-COMPATIBILITY ---

def broadcast_status(webhook_id, event_id, status, steps=None):
    """Envia atualização de status e passos via WebSocket de forma segura para workers."""
    try:
        import os
        import redis
        
        payload = {
            "type": "status_update",
            "webhook_id": webhook_id,
            "event_id": event_id,
            "status": status,
            "steps": steps
        }
        
        redis_url = os.getenv("REDIS_URL", "redis://redis:6379/0")
        r = redis.Redis.from_url(redis_url, decode_responses=True)
        r.publish("websocket_broadcast", json.dumps(payload))
        r.close()
    except Exception as ws_err:
        logger.error(f"Erro ao disparar broadcast no worker: {ws_err}")

def _add_step(db, event_id: int, step: str, detail: str = "", metadata: dict = None):
    event = db.query(WebhookEventModel).filter(WebhookEventModel.id == event_id).first()
    if not event:
        return
    steps = json.loads(event.processing_steps or "[]")
    step_entry = {
        "step": step,
        "detail": detail,
        "timestamp": get_now_br().isoformat(),
    }
    if metadata:
        step_entry["metadata"] = metadata
        
    steps.append(step_entry)
    event.processing_steps = json.dumps(steps, ensure_ascii=False)
    db.commit()
    
    logger.info(f"📍 [Pipeline Event {event_id}] {step}: {detail[:100]}...")
    
    broadcast_status(event.webhook_config_id, event.id, event.status, steps)


_typing_indicator_supported = True

def _toggle_typing_indicator(config, account_id, conversation_id, command="on"):
    """ZapVoice não suporta typing indicator nativo via API REST por padrão."""
    pass


# A função _send_chatwoot_message foi movida para webhook_services.py
# para manter este arquivo abaixo do limite maximo de 1000 linhas (Clean Code).


# As funcoes _get_cost e _build_agent_config foram movidas para webhook_services.py
# para manter este arquivo abaixo do limite maximo de 1000 linhas (Clean Code).

# --- CELERY TASKS ---

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
            f"Modelo de transcrição utilizado: {model_used}\n\nConteúdo: {extracted_text[:200]}..."
        )
        
    except Exception as e:
        logger.error(f"Erro na task de mídia imediata: {e}")
    finally:
        db.close()

@app.task(bind=True, name="webhook_tasks.process_webhook_automation")
def process_webhook_automation(self, event_id: int):
    db = SessionLocal()
    try:
        # --- AUTO-MIGRAÇÃO: garante colunas necessárias ---
        auto_migrate_webhook_columns(db)

        event = db.query(WebhookEventModel).filter(WebhookEventModel.id == event_id).first()
        if not event:
            return

        if event.status in ("cancelled", "grouped"):
            logger.info(f"⏭️ Ignorando evento {event_id} (Status: {event.status})")
            return

        event.status = "processing"
        db.commit()

        is_simulated = False
        if event.raw_payload:
            try:
                import json as _json
                p_data = _json.loads(event.raw_payload)
                if isinstance(p_data, dict) and p_data.get("simulated"):
                    is_simulated = True
            except Exception:
                pass
        
        _add_step(db, event_id, "🚀 Iniciando Pipeline", "A tarefa de automação foi iniciada pelo worker." + (" (Modo Simulação MOCK)" if is_simulated else ""))

        config = db.query(WebhookConfigModel).filter(WebhookConfigModel.id == event.webhook_config_id).first()
        if not config:
            return

        if not config.agent_id:
            _add_step(db, event_id, "⚠️ Sem agente configurado", "Configure um agente nas configurações do webhook para continuar.")
            event = db.query(WebhookEventModel).filter(WebhookEventModel.id == event_id).first()
            event.status = "completed"
            db.commit()
            return

        # --- RESOLUÇÃO DE MÍDIAS AGRUPADAS ---
        if "[AUDIO PENDENTE]" in (event.mensagem or "") or "[IMAGE PENDENTE]" in (event.mensagem or ""):
            resolve_grouped_media(db, event, config, event_id)

        msg_type = (event.message_type or "text").lower()
        if msg_type in ["video", "document"]:
            _add_step(db, event_id, f"🚫 Mídia não suportada ({msg_type})", "Não foi possível enviar pro agente já que é um tipo mídia que não aceita.")
            event.status = "completed"
            db.commit()
            return

        if msg_type == "text":
            _add_step(db, event_id, "📝 Mensagem de texto", "Tipo de mensagem identificado como texto. Continuando pipeline...")

        from sqlalchemy.orm import joinedload
        db_agent = db.query(AgentConfigModel).options(
            joinedload(AgentConfigModel.knowledge_bases)
        ).filter(AgentConfigModel.id == config.agent_id).first()
        if not db_agent:
            _add_step(db, event_id, "❌ Agente não encontrado", f"ID: {config.agent_id}")
            event = db.query(WebhookEventModel).filter(WebhookEventModel.id == event_id).first()
            event.status = "error"
            db.commit()
            return

        # --- TRAP DE AUTO-DELEÇÃO POR PALAVRA-CHAVE (PRIORIDADE MÁXIMA) ---
        mensagem = event.mensagem or ""
        msg_limpa = mensagem.strip().lower()
        if msg_limpa and config.delete_keywords:
            try:
                keywords = json.loads(config.delete_keywords)
                keyword_match = None
                for kw in keywords:
                    if kw.strip().lower() in msg_limpa:
                        keyword_match = kw.strip()
                        break
                
                if keyword_match:
                    target_tel = str(event.telefone or "")
                    target_cid = str(event.conversa_id or "")
                    target_aid = str(event.conta_id or "")
                    
                    execute_keyword_deletion_trap(db, event, config, target_tel, target_cid, target_aid)
                    return
            except Exception as e:
                logger.error(f"Erro no processamento de auto-deleção: {e}")
                _add_step(db, event_id, "⚠️ Erro na Auto-Deleção", str(e))

        # --- TRAP DE ASSISTENTE DE PROJETO POR PALAVRA-CHAVE ---
        msg_limpa_raw = (event.mensagem or "").strip().lower()
        proj_kw = (config.project_assistant_keyword or "").strip().lower()
        proj_exit_kw = (config.project_assistant_deactivate_keyword or "").strip().lower()
        proj_label = (config.project_assistant_label or "").strip()

        if proj_label and event.conversa_id and event.conta_id:
            zv_url = (config.zapvoice_url or os.getenv("ZAPVOICE_URL", "")).rstrip("/")
            zv_token = config.zapvoice_api_token or os.getenv("ZAPVOICE_API_TOKEN", "")
            acc_id = str(event.conta_id)
            conv_id = int(event.conversa_id) if str(event.conversa_id).isdigit() else 0

            # Ativação
            if proj_kw and msg_limpa_raw == proj_kw:
                _add_step(db, event_id, "⚙️ Ativando Assistente de Projeto", f"Palavra-chave '{config.project_assistant_keyword}' detectada.")
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                try:
                    loop.run_until_complete(sync_conversation_labels(zv_url, acc_id, conv_id, zv_token, to_add=[proj_label]))
                finally:
                    loop.close()
                
                entry_msg = config.project_assistant_entry_message or "Assistente de Projeto ativado. Como posso te ajudar com as métricas do projeto?"
                _send_zapvoice_message(db, event_id, event.conversa_id, event.conta_id, entry_msg, config)
                
                event = db.query(WebhookEventModel).filter(WebhookEventModel.id == event_id).first()
                event.status = "completed"
                db.commit()
                return

            # Desativação
            elif proj_exit_kw and msg_limpa_raw == proj_exit_kw:
                _add_step(db, event_id, "⚙️ Desativando Assistente de Projeto", f"Palavra-chave '{config.project_assistant_deactivate_keyword}' detectada.")
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                try:
                    loop.run_until_complete(sync_conversation_labels(zv_url, acc_id, conv_id, zv_token, to_remove=[proj_label]))
                finally:
                    loop.close()
                
                exit_msg = config.project_assistant_exit_message or "Assistente de Projeto desativado. Retornando ao atendimento padrão do robô."
                _send_zapvoice_message(db, event_id, event.conversa_id, event.conta_id, exit_msg, config)
                
                event = db.query(WebhookEventModel).filter(WebhookEventModel.id == event_id).first()
                event.status = "completed"
                db.commit()
                return

        # --- TRAP DE AUTOMAÇÃO E SEGURANÇA ---
        lead_internal_id = None
        last_msg = None
        lead_created_at = None
        if config.leads_table:
            try:
                _add_step(db, event_id, "🔍 Verificando status do contato", "Validando etiquetas do ZapVoice e janela de 24h...")
                
                query = text(f"SELECT id, ultima_mensagem_em, created_at FROM {config.leads_table} WHERE telefone = :tel LIMIT 1")
                res = db.execute(query, {"tel": event.telefone}).fetchone()
                
                if res:
                    lead_internal_id, last_msg, lead_created_at = res
                    try:
                        db.execute(text(f"""
                            UPDATE {config.leads_table} SET
                                mensagem = :msg,
                                message_type = :mtype,
                                link = :link,
                                ultima_mensagem_em = :now,
                                updated_at = :now,
                                conversa_id = :cid
                            WHERE id = :lid
                        """), {"msg": event.mensagem or "", "mtype": event.message_type or "text", "link": event.link, "now": get_now_utc(), "cid": event.conversa_id, "lid": lead_internal_id})
                        db.commit()
                        _add_step(db, event_id, "💾 Lead Atualizado", "Mensagem do usuário persistida com sucesso.")
                    except Exception as e_upd:
                        logger.warning(f"Erro ao atualizar mensagem do usuário no lead: {e_upd}")
                    
                is_paused = check_automation_trap(db, event, config, lead_internal_id, last_msg, lead_created_at)
                if is_paused:
                    event = db.query(WebhookEventModel).filter(WebhookEventModel.id == event_id).first()
                    event.status = "ignored"
                    db.commit()
                    return

            except Exception as e:
                logger.error(f"Erro ao verificar trap de automação: {e}")
                _add_step(db, event_id, "🔍 Aviso: Trap Ignorado", f"Erro ao verificar lead: {str(e)}")

        # --- MODO SILENCIOSO (DESATIVAR RESPOSTAS DA IA) ---
        if getattr(config, "disable_ai_responses", False) is True:
            _add_step(db, event_id, "🤐 Modo Silencioso Ativo", "Mensagem e dados persistidos com sucesso na memória. Resposta automática de IA pausada por opção da integração.")
            event = db.query(WebhookEventModel).filter(WebhookEventModel.id == event_id).first()
            event.status = "ignored_silent"
            db.commit()
            return

        agent_config = _build_agent_config(db_agent)
        _add_step(db, event_id, "🤖 Conectando ao agente", f"Agente: {db_agent.name}")

        mensagem = event.mensagem or ""
        if event.legenda and not event.legenda.startswith("❌ Erro técnico:"):
            mensagem = f"[Legenda do Usuário]: {event.legenda}\n\n[Análise/Resumo da Mídia]: {mensagem}"

        raw_phone = event.telefone or ""
        clean_phone = re.sub(r"\D", "", raw_phone)
        session_id = str(lead_internal_id) if lead_internal_id else f"tel_{clean_phone}"

        _add_step(db, event_id, "📨 Mensagem enviada ao agente", mensagem[:500] + ("..." if len(mensagem) > 500 else ""))

        # --- RECUPERAÇÃO DE HISTÓRICO (MEMÓRIA DE CONTEXTO) ---
        history = retrieve_context_history(db, event, db_agent, raw_phone, clean_phone, event_id)

        # --- EXECUÇÃO DO AGENTE ---
        async def _run():
            nonlocal mensagem
            image_url = event.link if event.message_type == "image" else None
            async with async_session_worker() as async_db:
                # --- BOT DEFENSE (ANTI-LOOP & MESSAGES LIMIT) ---
                if getattr(db_agent, 'security_bot_protection', False):
                    from agent_core.bot_defense import verify_bot_defense
                    bot_defense_paused = await verify_bot_defense(
                        db=db,
                        event=event,
                        config=config,
                        agent_config=db_agent,
                        session_id=session_id,
                        message=mensagem
                    )
                    if bot_defense_paused:
                        return {"ignored_by_defense": True}

                secondary_agents = []
                if config.secondary_agent_ids:
                    try:
                        import json as _json
                        sec_ids = _json.loads(config.secondary_agent_ids)
                        if sec_ids:
                            from sqlalchemy import select
                            from models import AgentConfigModel
                            res = await async_db.execute(select(AgentConfigModel).where(AgentConfigModel.id.in_(sec_ids)))
                            secondary_agents = res.scalars().all()
                    except Exception as e:
                        logger.error(f"Erro ao carregar agentes secundarios: {e}")
                
                if is_simulated:
                    _add_step(db, event_id, "🧠 Analisando Intenção (Pre-Router MOCK)", "Simulando análise de intenção e roteamento sem consumo de tokens de API...")
                    pre_router_result = {
                        "eh_saudacao": False,
                        "eh_mensagem_automatica": False,
                        "eh_anuncio": False,
                        "precisa_rag": False,
                        "decisao": "Encaminhar para o agente de IA principal (Simulação MOCK)",
                        "_model_used": "gpt-4o-mini (MOCK)",
                        "_usage": {"prompt_tokens": 85, "completion_tokens": 30, "total_tokens": 115},
                        "_debug_prompt": "[MOCK PRE-ROUTER PROMPT] Análise de intenção simulada para teste de carga."
                    }
                else:
                    _add_step(db, event_id, "🧠 Analisando Intenção (Pre-Router)", "A IA está decidindo o roteamento e entendendo o contexto da mensagem...")
                    db.commit()
                    
                    pre_router_result = await run_pre_router_ai(
                        mensagem, 
                        history, 
                        db_agent, 
                        secondary_agents,
                        context_variables={"session_id": session_id},
                        db=db
                    )
                
                # Se for mensagem automática, salva o estado no banco de dados do evento e ignora
                if pre_router_result.get("eh_mensagem_automatica"):
                    event.is_automatic = True
                    event.status = "ignored"
                    _add_step(db, event_id, "🤖 Mensagem Automática do Contato", "A IA identificou esta mensagem como um envio automático/ausência comercial do contato. A automação foi encerrada e nenhuma resposta foi enviada para evitar loops.")
                    db.commit()
                    return {"ignored_automatic": True}
                
                # Log visual de anúncio na pipeline (apenas se for a primeira mensagem)
                is_first_msg = not history or len(history) == 0
                if is_first_msg:
                    eh_anuncio = pre_router_result.get("eh_anuncio", False)
                    detalhe = pre_router_result.get("detalhe_anuncio")
                    if eh_anuncio:
                        perguntas = pre_router_result.get("perguntas_extraidas")
                        if not perguntas or not str(perguntas).strip():
                            # É APENAS ANÚNCIO (ou anúncio + saudação)
                            # Permite o envio da mensagem de saudação e adiciona step explicativo
                            _add_step(db, event_id, "📢 Anúncio Detectado", f"A primeira mensagem foi identificada como anúncio ({detalhe}) e não contém perguntas. Respondendo com a saudação configurada.")
                            if config.leads_table and lead_internal_id:
                                try:
                                    db.execute(text(f"UPDATE {config.leads_table} SET mensagem = NULL, ultima_mensagem_em = NULL WHERE id = :lid"), {"lid": lead_internal_id})
                                    db.commit()
                                except Exception as e_lead_clear:
                                    logger.warning(f"Erro ao limpar mensagem de anuncio da tabela de leads: {e_lead_clear}")
                        else:
                            # Mensagem mista: anúncio + pergunta.
                            # Prossegue, mas limpa o anúncio do evento atual
                            _add_step(db, event_id, "📢 Anúncio Detectado (Mensagem Mista)", f"Mensagem mista contendo anúncio ({detalhe}) e pergunta. O anúncio será removido e a pergunta será respondida.")
                            event.mensagem = perguntas
                            mensagem = perguntas
                            db.commit()
                            if config.leads_table and lead_internal_id:
                                try:
                                    db.execute(text(f"UPDATE {config.leads_table} SET mensagem = :msg WHERE id = :lid"), {"msg": perguntas, "lid": lead_internal_id})
                                    db.commit()
                                except Exception as e_lead_update:
                                    logger.warning(f"Erro ao atualizar mensagem limpa na tabela de leads: {e_lead_update}")
                    else:
                        _add_step(db, event_id, "📢 Anúncio Não Detectado", "A primeira mensagem não corresponde a nenhum anúncio cadastrado. A pipeline prosseguirá normalmente.")
                    db.commit()
                
                pr_model = pre_router_result.get("_model_used", db_agent.model or "gpt-4o-mini")
                pr_usage = pre_router_result.get("_usage", {})
                pr_prompt = pre_router_result.get("_debug_prompt", "Prompt indisponível")
                
                pr_cost = 0.0
                if pr_usage:
                    rates = {
                        "gpt-4o-mini": {"in": 0.15 / 1_000_000, "out": 0.60 / 1_000_000},
                        "gpt-4o": {"in": 5.00 / 1_000_000, "out": 15.00 / 1_000_000},
                        "gpt-5-mini": {"in": 0.30 / 1_000_000, "out": 1.20 / 1_000_000}
                    }
                    rate = rates.get(pr_model, rates.get(db_agent.model) or rates["gpt-4o-mini"])
                    p_tokens = pr_usage.get("prompt_tokens", 0)
                    c_tokens = pr_usage.get("completion_tokens", 0)
                    usd_cost = (p_tokens * rate["in"]) + (c_tokens * rate["out"])
                    # Converter para Reais (USD_TO_BRL = 5.30) e aplicar o piso de R$ 0.01 se houver consumo
                    brl_cost = usd_cost * 5.30
                    if brl_cost > 0:
                        pr_cost = max(0.01, brl_cost)

                import json as _json
                decision_copy = {k: v for k, v in pre_router_result.items() if not k.startswith("_")}
                
                _add_step(
                    db, 
                    event_id, 
                    "✅ Decisão da IA (Pre-Router)", 
                    f"**Decisão da IA:**\n```json\n{_json.dumps(decision_copy, ensure_ascii=False, indent=2)}\n```\n\n**Prompt Completo Analisado:**\n```text\n{pr_prompt}\n```", 
                    metadata={
                        "model": pr_model, 
                        "usage": {
                            "prompt_tokens": pr_usage.get("prompt_tokens", 0),
                            "completion_tokens": pr_usage.get("completion_tokens", 0),
                            "total_tokens": pr_usage.get("total_tokens", 0)
                        }, 
                        "cost": pr_cost
                    }
                )
                
                # --- INTERCEPTAÇÃO DE EMOJI NEGATIVO ---
                if pre_router_result.get("eh_emoji_negativo"):
                    neg_label = (config.negative_feedback_label or "feedback_negativo").strip()
                    ignore_label = (config.ignore_by_label or "humano").strip()
                    
                    cw_url = (config.zapvoice_url or os.getenv("ZAPVOICE_URL", "")).rstrip("/")
                    if cw_url and not cw_url.endswith("/api"):
                        cw_url = f"{cw_url}/api"
                    cw_token = config.zapvoice_api_token or os.getenv("ZAPVOICE_API_TOKEN", "")
                    
                    has_neg_label = False
                    if cw_url and cw_token and event.conversa_id and event.inbox_id:
                        acc_id = str(event.inbox_id)
                        conv_id = int(event.conversa_id) if str(event.conversa_id).isdigit() else 0
                        
                        success, current_labels = await sync_conversation_labels(
                            zapvoice_url=cw_url,
                            client_id=acc_id,
                            conversation_id=conv_id,
                            token=cw_token
                        )
                        if success:
                            has_neg_label = any(l.lower() == neg_label.lower() for l in current_labels if isinstance(l, str))
                            
                    if has_neg_label:
                        msg_transicao = "Lamento muito pelo ocorrido. Vou transferir seu atendimento para nossa equipe de suporte agora."
                        if cw_url and cw_token and event.conversa_id and event.inbox_id:
                            acc_id = str(event.inbox_id)
                            conv_id = int(event.conversa_id) if str(event.conversa_id).isdigit() else 0
                            await sync_conversation_labels(
                                zapvoice_url=cw_url,
                                client_id=acc_id,
                                conversation_id=conv_id,
                                token=cw_token,
                                to_add=[ignore_label]
                            )
                        
                        _add_step(db, event_id, "👎 Emoji Negativo (2ª ocorrência)", f"Enviando mensagem de transição e aplicando etiqueta de pausa: {ignore_label}")
                        return {
                            "content": msg_transicao,
                            "usage": pr_usage,
                            "model": pr_model,
                            "debug": {
                                "is_greeting": True,
                                "negative_emoji_second_occurrence": True
                            }
                        }
                    else:
                        if cw_url and cw_token and event.conversa_id and event.inbox_id:
                            acc_id = str(event.inbox_id)
                            conv_id = int(event.conversa_id) if str(event.conversa_id).isdigit() else 0
                            await sync_conversation_labels(
                                zapvoice_url=cw_url,
                                client_id=acc_id,
                                conversation_id=conv_id,
                                token=cw_token,
                                to_add=[neg_label]
                            )
                            
                        _add_step(db, event_id, "👎 Emoji Negativo (1ª ocorrência)", f"Enviando resposta empática e aplicando etiqueta de feedback negativo: {neg_label}")
                        return {
                            "content": pre_router_result.get("resposta_direta"),
                            "usage": pr_usage,
                            "model": pr_model,
                            "debug": {
                                "is_greeting": True,
                                "negative_emoji_first_occurrence": True
                            }
                        }

                if pre_router_result.get("eh_saudacao") and pre_router_result.get("resposta_direta"):
                    _add_step(db, event_id, "👋 Saudação Detectada", "O Pre-Router gerou uma resposta direta, ignorando o agente principal.")
                    return {"content": pre_router_result.get("resposta_direta"), "usage": pr_usage, "model": pr_model, "debug": {"is_greeting": True}}
                
                if pre_router_result.get("precisa_esclarecimento") and pre_router_result.get("resposta_esclarecimento"):
                    _add_step(db, event_id, "❓ Mensagem Ambígua", "O Pre-Router gerou uma pergunta de esclarecimento.")
                    return {"content": pre_router_result.get("resposta_esclarecimento"), "usage": pr_usage, "model": pr_model, "debug": {"needs_clarification": True}}
                    
                target_agent_id = pre_router_result.get("id_agente_alvo")
                final_agent_config = agent_config
                final_db_agent = db_agent
                
                if target_agent_id and target_agent_id != db_agent.id:
                    from sqlalchemy.orm import selectinload
                    target_res = await async_db.execute(
                        select(AgentConfigModel)
                        .options(selectinload(AgentConfigModel.knowledge_bases))
                        .where(AgentConfigModel.id == target_agent_id)
                    )
                    target_db_agent = target_res.scalars().first()
                    if target_db_agent:
                        final_db_agent = target_db_agent
                        final_agent_config = _build_agent_config(target_db_agent)
                        _add_step(db, event_id, f"🔀 Roteamento Efetuado", f"Mensagem roteada do principal para o Secundário: {final_db_agent.name}")
                
                # --- CHECK MODO ASSISTENTE DE PROJETO ---
                is_project_assistant = False
                proj_label = (config.project_assistant_label or "").strip()
                if proj_label:
                    current_labels_list = []
                    if event.labels:
                        try:
                            import json as _json
                            parsed_l = _json.loads(event.labels)
                            if isinstance(parsed_l, list):
                                current_labels_list = [str(x).lower().strip() for x in parsed_l]
                        except Exception:
                            current_labels_list = [x.strip().lower() for x in event.labels.split(",") if x.strip()]
                    
                    if proj_label.lower().strip() not in current_labels_list and event.conversa_id and event.conta_id:
                        zv_url = (config.zapvoice_url or os.getenv("ZAPVOICE_URL", "")).rstrip("/")
                        zv_token = config.zapvoice_api_token or os.getenv("ZAPVOICE_API_TOKEN", "")
                        acc_id = str(event.conta_id)
                        conv_id = int(event.conversa_id) if str(event.conversa_id).isdigit() else 0
                        from zapvoice_utils import get_conversation_labels_sync
                        zv_labels = get_conversation_labels_sync(zv_url, acc_id, conv_id, zv_token)
                        if zv_labels:
                            current_labels_list = [str(x).lower().strip() for x in zv_labels]
                    
                    if proj_label.lower().strip() in current_labels_list:
                        is_project_assistant = True

                final_db_agent_tools = final_db_agent.tools
                if is_project_assistant:
                    _add_step(db, event_id, "⚙️ Modo Assistente de Projeto Ativo", "Injetando métricas reais e prompt customizado do projeto.")
                    
                    metrics = await get_project_assistant_context(async_db, config)
                    
                    support_str = ""
                    if metrics["support_requests"]:
                        for s in metrics["support_requests"]:
                            support_str += f"- {s['nome']} ({s['telefone']} / {s['email']}) - Status: {s['status']} em {s['data']}\n"
                    else:
                        support_str = "Nenhum contato acionou o suporte humano esta semana.\n"
                        
                    leads_conversion_str = ""
                    if metrics["leads_for_conversion"]:
                        for l in metrics["leads_for_conversion"]:
                            leads_conversion_str += f"- Lead: {l['nome']} ({l['telefone']}) | Classificação: {l['classificacao']} | Justificativa: {l['justificativa']}\n"
                    else:
                        leads_conversion_str = "Sem leads recentes qualificados no banco para analisar.\n"

                    system_prompt = f"""Você é o Assistente de Projeto inteligente. Sua função é responder ao administrador/gestor sobre dados reais e métricas do projeto.

Suas capacidades e como você pode ajudar:
- Informar sobre leads gerados no mês.
- Informar sobre vendas registradas no mês e faturamento.
- Listar contatos que acionaram o suporte humano ao longo da semana.
- Propor melhorias na conversão com base nos leads qualificados recentes e suas justificativas/objeções.

Sempre que o usuário perguntar o que você pode fazer, como você pode ajudar, quem é você, ou termos similares, explique claramente essas quatro capacidades de forma amigável e profissional.

Dados Reais do Projeto (Métricas Atuais):
- Leads Gerados no Mês Atual: {metrics['leads_count']} leads
- Vendas no Mês Atual: {metrics['sales_count']} vendas (Total Faturado: R$ {metrics['sales_total']:.2f})
- Chamados de Suporte Humano na Semana (Últimos 7 dias):
{support_str}

Leads Qualificados Recentes para Análise de Conversão:
{leads_conversion_str}

Use essas informações para responder com precisão e clareza. Caso o usuário peça sugestões de melhoria de conversão, analise as justificativas e classificações dos leads fornecidos acima para propor melhorias acionáveis (ex: melhorar scripts, ajustar qualificação, focar em dores específicas dos leads frios/mornos). Responda sempre em Português do Brasil de forma executiva e direta.
"""
                    final_agent_config.system_prompt = system_prompt
                    final_db_agent_tools = []

                extracted = pre_router_result.get("perguntas_extraidas")
                extracted_date = pre_router_result.get("data_extraida")
                
                if extracted_date:
                    mensagem = f"[DATA EXTRAÍDA PELO SISTEMA: {extracted_date}]\n{extracted or mensagem}"
                elif extracted and str(extracted).strip():
                    original_msg = str(mensagem)
                    mensagem = str(extracted)
                    if original_msg != mensagem:
                        _add_step(db, event_id, "🧹 Melhoria de Mensagem (Pre-Router)", f"A mensagem do usuário foi melhorada pelo Pre-Router com base no histórico.\nAntes: \"{original_msg}\"\nDepois: \"{mensagem}\"")
                    else:
                        _add_step(db, event_id, "🧹 Mensagem Limpa/Extraída", mensagem[:1000])

                pre_executed_tool_calls = []
                pre_executed_rag_context = None
                
                # Executar RAG antecipado se solicitado pelo Pre-Router
                if pre_router_result.get("precisa_rag"):
                    kb_ids = [kb.id for kb in getattr(final_db_agent, 'knowledge_bases', [])] or ([final_db_agent.knowledge_base_id] if getattr(final_db_agent, 'knowledge_base_id', None) else [])
                    if not kb_ids:
                        _add_step(db, event_id, "⚠️ RAG Ignorado (Pre-Router)", "A IA sinalizou que precisa de RAG, mas não há nenhuma base de conhecimento vinculada a este agente (ID: {}).".format(final_db_agent.id))
                    else:
                        from rag_service import search_knowledge_base
                        
                        # Identificar se há múltiplas perguntas individuais
                        perguntas_list = pre_router_result.get("lista_perguntas_extraidas")
                        if not perguntas_list or not isinstance(perguntas_list, list):
                            perguntas_list = [mensagem]
                            
                        all_relevant_items = []
                        
                        # Loop de busca individual para cada pergunta
                        for q_idx, query_item in enumerate(perguntas_list, 1):
                            _add_step(db, event_id, f"🔍 RAG - Pergunta {q_idx}", f"Consultando bases semânticas para a pergunta {q_idx}: \"{query_item}\"")
                            
                            rag_res = await search_knowledge_base(db=async_db, query=query_item, kb_ids=kb_ids, limit=getattr(final_db_agent, 'rag_retrieval_count', 3), similarity_threshold=getattr(final_db_agent, 'rag_relevance_threshold', 0.0) or 0.0)
                            
                            relevant_items = []
                            discarded_items = []
                            rag_usage = None
                            if isinstance(rag_res, tuple) and len(rag_res) == 3:
                                relevant_items, discarded_items, rag_usage = rag_res
                            elif isinstance(rag_res, tuple) and len(rag_res) == 2:
                                relevant_items, rag_usage = rag_res
                            else:
                                relevant_items = rag_res or []
                                
                            all_relevant_items.extend(relevant_items)
                            
                            # Log individual da pergunta
                            # Serializa applied_modules se disponível (para exibir no RagViewerModal)
                            _modules_block = ""
                            if rag_usage and hasattr(rag_usage, 'applied_modules') and rag_usage.applied_modules:
                                import json as _json_mod
                                _modules_block = f"\n\n===MODULES_JSON===\n{_json_mod.dumps(rag_usage.applied_modules, ensure_ascii=False)}\n===END_MODULES==="

                            if relevant_items:
                                items_detail = ""
                                for idx, item in enumerate(relevant_items, 1):
                                    rel_score = item.get("relevance_score", 0.0)
                                    pct_rel = f"{round(rel_score * 100, 1)}%" if rel_score else "N/A"
                                    items_detail += f"\n--- Item {idx} (Relevância: {pct_rel}) ---\nPerg: {item['question']}\nResp: {item['answer']}\n"
                                
                                discarded_detail = ""
                                if discarded_items:
                                    discarded_detail = "\n\n❌ **Itens Descartados:**\n" + "\n".join([f"- **Perg:** \"{d['question']}\"\n  **Motivo:** {d.get('discard_reason', 'Relevância insuficiente.')}" for d in discarded_items])
                                    
                                _add_step(db, event_id, f"✅ RAG Resultados - Pergunta {q_idx}", f"Pergunta consultada: \"{query_item}\"\nRetornados {len(relevant_items)} itens relevantes:\n{items_detail}{discarded_detail}{_modules_block}")
                            else:
                                discarded_detail = ""
                                if discarded_items:
                                    discarded_detail = "\n\n❌ **Itens Descartados:**\n" + "\n".join([f"- **Perg:** \"{d['question']}\"\n  **Motivo:** {d.get('discard_reason', 'Relevância insuficiente.')}" for d in discarded_items])
                                _add_step(db, event_id, f"ℹ️ RAG Sem Resultados - Pergunta {q_idx}", f"A busca para a pergunta \"{query_item}\" retornou 0 itens relevantes.{discarded_detail}{_modules_block}")
                                
                        if all_relevant_items:
                            # Remover duplicados da lista unificada
                            seen_ids = set()
                            unique_relevant = []
                            for item in all_relevant_items:
                                if item["id"] not in seen_ids:
                                    unique_relevant.append(item)
                                    seen_ids.add(item["id"])
                                    
                            pre_executed_rag_context = "\n\n# CONTEXTO RAG:\n" + "\n".join([f"Perg: {i['question']}\nResp: {i['answer']}" for i in unique_relevant])
                
                # Executar ferramenta antecipada se solicitada pelo Pre-Router
                if pre_router_result.get("chamada_ferramenta"):
                    tc = pre_router_result["chamada_ferramenta"]
                    tool_name = tc.get("nome")
                    tool_args = tc.get("argumentos") or {}
                    
                    _add_step(db, event_id, "🛠️ Acionando ferramenta (Pre-Router)", f"Ferramenta: {tool_name} | Argumentos: {tool_args}")
                    
                    tool_result = "Erro: Ferramenta não encontrada."
                    context_vars = {
                        "account_id": int(event.conta_id) if event.conta_id and str(event.conta_id).isdigit() else 0,
                        "conversation_id": int(event.conversa_id) if event.conversa_id and str(event.conversa_id).isdigit() else 0,
                        "webhook_config_id": event.webhook_config_id,
                        "contact_phone": event.telefone,
                        "contact_name": event.contato_nome,
                        "thread_id": event.conversa_id,
                        "session_id": session_id,
                        "leads_table": config.leads_table if config else None,
                        "agent_id": final_db_agent.id
                    }
                    
                    # Roteamento de Handlers de Ferramentas locais
                    if tool_name == "internal_date_calculator":
                        from agent_core.tools.handlers.internal import handle_date_calculator
                        import json as _json
                        tool_result = await handle_date_calculator(_json.dumps(tool_args))
                    elif tool_name == "registrar_duvida_sem_resposta":
                        from agent_core.tools.handlers.internal import handle_unanswered_question
                        import json as _json
                        tool_result = await handle_unanswered_question(async_db, context_vars, _json.dumps(tool_args), history, final_db_agent.id)
                    elif tool_name == "google_calendar_manager":
                        from agent_core.tools.handlers.google import handle_google_calendar
                        tool_result = await handle_google_calendar(async_db, context_vars, tool_args)
                    elif tool_name == "lead_qualificado":
                        from agent_core.tools.handlers.internal import handle_lead_qualified
                        import json as _json
                        tool_result = await handle_lead_qualified(async_db, context_vars, _json.dumps(tool_args), final_db_agent.id)
                    elif tool_name in ["transferir_atendimento", "transferir_suporte_humano"]:
                        from agent_core.tools.handlers.chatwoot import handle_chatwoot_handoff
                        t_tool = next((t for t in final_db_agent_tools if t.name == tool_name), None)
                        tool_result = await handle_chatwoot_handoff(async_db, context_vars, t_tool, True, tool_args, history, final_db_agent.id)
                    else:
                        target_tool = next((t for t in final_db_agent_tools if t.name == tool_name), None)
                        if target_tool:
                            try:
                                import httpx
                                async with httpx.AsyncClient(timeout=30.0) as http_client:
                                    res = await http_client.post(target_tool.webhook_url, json={**tool_args, **context_vars})
                                    tool_result = res.text
                            except Exception as e:
                                logger.error(f"Erro na execução da ferramenta externa {tool_name} no pre-router: {str(e)}")
                                tool_result = "ERRO: A ferramenta encontrou uma instabilidade temporária."
                                
                    _add_step(db, event_id, f"✅ Ferramenta {tool_name} finalizada (Pre-Router)", f"Retorno: {tool_result[:500]}...")
                    pre_executed_tool_calls.append({
                        "name": tool_name,
                        "args": tool_args,
                        "output": tool_result
                    })
                    
                if is_simulated:
                    _add_step(db, event_id, "🤖 Chamada ao Agente de IA (MOCK)", "Gerando resposta simulada sem consumo de tokens reais da OpenAI...")
                    mock_resp_text = f"[MOCK IA] Olá {event.contato_nome or 'Cliente'}! Recebi sua mensagem: '{mensagem}'. Resposta simulada para teste de carga em escala."
                    result = {
                        "content": mock_resp_text,
                        "model": "gpt-4o-mini (MOCK)",
                        "usage": {"prompt_tokens": 120, "completion_tokens": 45, "total_tokens": 165},
                        "debug": {
                            "resolved_prompt": getattr(final_agent_config, 'system_prompt', ''),
                            "rag_context": pre_executed_rag_context or "",
                            "tool_calls": []
                        }
                    }
                else:
                    result = await process_message(
                        message=mensagem,
                        history=history,
                        config=final_agent_config,
                        tools=final_db_agent_tools,
                        context_variables={
                            "account_id": int(event.conta_id) if event.conta_id and str(event.conta_id).isdigit() else 0,
                            "conversation_id": int(event.conversa_id) if event.conversa_id and str(event.conversa_id).isdigit() else 0,
                            "webhook_config_id": event.webhook_config_id,
                            "contact_phone": event.telefone,
                            "contact_name": event.contato_nome,
                            "thread_id": event.conversa_id,
                            "session_id": session_id,
                            "leads_table": config.leads_table if config else None,
                            "dias_desde_criacao": (get_now_utc() - (lead_created_at if lead_created_at.tzinfo else lead_created_at.replace(tzinfo=timezone.utc))).days if 'lead_created_at' in locals() and lead_created_at else 0
                        },

                        db=async_db,
                        image_url=image_url,
                        on_step=lambda step, detail: _add_step(db, event_id, step, detail),
                        pre_executed_tool_calls=pre_executed_tool_calls,
                        pre_executed_rag_context=pre_executed_rag_context
                    )
                
                if isinstance(result, dict) and "usage" in result and pre_router_result and "_usage" in pre_router_result:
                    pr_u = pre_router_result["_usage"]
                    m_u = result["usage"]
                    
                    if hasattr(m_u, "mini_prompt"):
                        m_u.mini_prompt += pr_u.get("prompt_tokens", 0)
                        m_u.mini_completion += pr_u.get("completion_tokens", 0)
                    elif isinstance(m_u, dict):
                        m_u["prompt_tokens"] = m_u.get("prompt_tokens", 0) + pr_u.get("prompt_tokens", 0)
                        m_u["completion_tokens"] = m_u.get("completion_tokens", 0) + pr_u.get("completion_tokens", 0)
                        m_u["total_tokens"] = m_u.get("total_tokens", 0) + pr_u.get("total_tokens", 0)
                
                return result

        ai_metadata = {}

        try:
            try:
                loop = asyncio.get_running_loop()
            except RuntimeError:
                loop = None

            if loop and loop.is_running():
                import concurrent.futures
                with concurrent.futures.ThreadPoolExecutor() as executor:
                    result = executor.submit(lambda: asyncio.run(_run())).result()
            else:
                result = asyncio.run(_run())
        except Exception as ai_err:
            logger.error(f"❌ Erro crítico na execução da IA: {ai_err}")
            _add_step(db, event_id, "❌ Falha na IA", f"Ocorreu um erro ao processar a mensagem com o agente: {str(ai_err)}")
            raise ai_err

        # Se foi ignorado pelo Bot Defense, encerramos a pipeline aqui
        if isinstance(result, dict) and result.get("ignored_by_defense"):
            event.status = "ignored"
            db.commit()
            _add_step(db, event_id, "🛡️ Pipeline Ignorado pelo Bot Defense", "Processamento interrompido devido a proteção anti-loop/limite de mensagens.")
            
            # Limpar debounce no redis
            try:
                import redis as redis_lib
                _redis_local = redis_lib.from_url(os.getenv("REDIS_URL", "redis://redis:6379/0"), decode_responses=True)
                phone = event.telefone
                wid = config.id
                _redis_local.delete(f"webhook:debounce:id:{wid}:{phone}")
                _redis_local.delete(f"webhook:debounce:text:{wid}:{phone}")
                logger.info(f"🧹 Limpeza de debounce concluída após Bot Defense para {phone}")
            except Exception as redis_err:
                logger.error(f"Erro ao limpar redis no Bot Defense: {redis_err}")
            return

        # Se foi ignorado por ser mensagem automática, encerramos a pipeline aqui
        if isinstance(result, dict) and result.get("ignored_automatic"):
            event.status = "ignored"
            db.commit()
            
            # Limpar debounce no redis
            try:
                import redis as redis_lib
                _redis_local = redis_lib.from_url(os.getenv("REDIS_URL", "redis://redis:6379/0"), decode_responses=True)
                phone = event.telefone
                wid = config.id
                _redis_local.delete(f"webhook:debounce:id:{wid}:{phone}")
                _redis_local.delete(f"webhook:debounce:text:{wid}:{phone}")
                logger.info(f"🧹 Limpeza de debounce concluída após Mensagem Automática para {phone}")
            except Exception as redis_err:
                logger.error(f"Erro ao limpar redis no Mensagem Automática: {redis_err}")
            return

        # Se foi ignorado por ser Mensagem de Anúncio, encerramos a pipeline aqui
        if isinstance(result, dict) and result.get("ignored_by_ad"):
            event.status = "ignored"
            db.commit()
            _add_step(db, event_id, "📢 Pipeline Ignorado - Mensagem de Anúncio", "Processamento interrompido porque a mensagem é um anúncio e foi ignorada.")
            
            # Limpar debounce no redis
            try:
                import redis as redis_lib
                _redis_local = redis_lib.from_url(os.getenv("REDIS_URL", "redis://redis:6379/0"), decode_responses=True)
                phone = event.telefone
                wid = config.id
                _redis_local.delete(f"webhook:debounce:id:{wid}:{phone}")
                _redis_local.delete(f"webhook:debounce:text:{wid}:{phone}")
                logger.info(f"🧹 Limpeza de debounce concluída após Anúncio Ignorado para {phone}")
            except Exception as redis_err:
                logger.error(f"Erro ao limpar redis no Anúncio Ignorado: {redis_err}")
            return

        actual_debug = result.get("debug", {}) if isinstance(result, dict) else {}
        resolved_prompt = actual_debug.get("resolved_prompt") or db_agent.system_prompt
        rag_context = actual_debug.get("rag_context", "")

        display_history = history.copy() if history else []
        if event.mensagem:
            display_history.append({"role": "user", "content": event.mensagem})

        is_bypassed = False
        if isinstance(result, dict) and result.get("debug"):
            is_bypassed = result.get("debug").get("is_greeting") or result.get("debug").get("needs_clarification")

        debug_payload = {
            "modelo": result.get("model") if isinstance(result, dict) else db_agent.model,
            "prompt_sistema": resolved_prompt,
            "prompt_pre_router": pre_router_result.get("_debug_prompt") if 'pre_router_result' in locals() and pre_router_result else None,
            "contexto_rag": rag_context,
            "memoria_contexto": display_history,
            "limite_janela": db_agent.context_window,
            "metadados": {
                "session_id": session_id,
                "user_name": event.contato_nome,
                "phone": event.telefone,
            },
            "ferramentas_habilitadas": [t.name for t in db_agent.tools] if hasattr(db_agent, 'tools') else []
        }
        
        step_title = "🔍 Raio-X: Contexto Enviado"
        if is_bypassed:
            step_title += " (Ignorado)"
            
        _add_step(db, event_id, step_title, json.dumps(debug_payload, ensure_ascii=False, indent=2))
        
        response_text = result.get("content", "") if isinstance(result, dict) else str(result)
        ai_usage = result.get("usage") if isinstance(result, dict) else None
        
        if hasattr(ai_usage, "to_dict"):
            ai_usage = ai_usage.to_dict()

        ai_metadata = {
            "model": result.get("model") if isinstance(result, dict) else db_agent.model,
            "usage": ai_usage,
        }
        if ai_metadata["usage"]:
            ai_metadata["cost"] = _get_cost(ai_metadata["model"], ai_metadata["usage"])

        tool_calls = result.get("debug", {}).get("tool_calls", []) if isinstance(result, dict) else []
        if tool_calls:
            tools_summary = []
            for tc in tool_calls:
                t_name = tc.get("name", "Desconhecida")
                t_args = tc.get("args", "{}")
                t_out = tc.get("output", "Sem retorno")
                tools_summary.append(f"🛠️ **{t_name}**\n📥 Input: `{t_args}`\n📤 Output: {t_out}")
            
            _add_step(db, event_id, "🛠️ Ferramentas acionadas", "\n\n".join(tools_summary))

        resp_title = "✅ Resposta gerada pelo agente"
        if is_bypassed:
            resp_title = "⚡ Resposta direta do Pre-Router"
            
        _add_step(db, event_id, resp_title, 
                  response_text[:1000] + ("..." if len(response_text) > 1000 else ""),
                  metadata=ai_metadata)

        event.agent_response = response_text
        db.commit()

        save_interaction_log(db, event, config, response_text, ai_metadata, session_id, db_agent)

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
            proactive_update_lead_table(db, event, config, response_text, lead_internal_id, zv_labels)
        
        response_delay = getattr(config, 'response_delay_seconds', 0) or 0
        
        send_success = True
        if is_simulated:
            _add_step(db, event_id, "📤 Resposta Final Enviada (MOCK)", f"Mensagem simulada enviada com sucesso no ambiente MOCK:\n\n{response_text}")
            send_success = True
        elif response_text and event.conversa_id and event.conta_id:
            split_enabled = getattr(config, 'split_response_enabled', True)
            if split_enabled is None:
                split_enabled = True
            send_success = _send_zapvoice_message(
                db, event_id, event.conversa_id, event.conta_id, response_text, config,
                split_paragraphs=split_enabled, delay=response_delay
            )
        elif event.conversa_id and event.conta_id:
            fallback_msg = getattr(config, 'fallback_empty_response', None)
            if not fallback_msg:
                fallback_msg = (
                    "Olá! Recebi sua mensagem e estou verificando as informações para te responder com precisão. "
                    "Aguarde um momento, por favor. 😊"
                )
            _add_step(db, event_id, "⚠️ Resposta Vazia - Enviando Fallback",
                      f"O agente não gerou conteúdo. Mensagem padrão enviada ao cliente: {fallback_msg[:100]}")
            send_success = _send_zapvoice_message(db, event_id, event.conversa_id, event.conta_id, fallback_msg, config)
        else:
            _add_step(db, event_id, "⚠️ Resposta Vazia", "O agente gerou uma resposta vazia e não há dados de conversa válidos.")
            send_success = False

        # Registrar etapa de variáveis extraídas no pipeline
        try:
            from sqlalchemy import select
            from models import GlobalContextVariableModel, UserMemoryModel
            # Buscar variáveis configuradas para extração por IA
            ai_vars_stmt = select(GlobalContextVariableModel).where(GlobalContextVariableModel.extraction_method == "ai")
            ai_vars_res = db.execute(ai_vars_stmt)
            ai_vars = ai_vars_res.scalars().all()
            
            if ai_vars:
                # Buscar valores salvos na memória do usuário para essa conversa
                mem_stmt = select(UserMemoryModel).where(
                    UserMemoryModel.session_id == str(event.conversa_id)
                )
                mem_res = db.execute(mem_stmt)
                mems = mem_res.scalars().all()
                mem_dict = {m.key: m.value for m in mems}
                
                saved_vars = {}
                pending_vars = []
                for v in ai_vars:
                    if v.key in mem_dict and mem_dict[v.key] is not None and str(mem_dict[v.key]).strip() != "":
                        saved_vars[v.key] = mem_dict[v.key]
                    else:
                        pending_vars.append(v.key)
                
                # Montar o detalhe textual legível por humanos
                detail_text = ""
                if saved_vars:
                    detail_text += "✅ **Variáveis Extraídas e Salvas:**\n"
                    for k, val in saved_vars.items():
                        detail_text += f"- {k}: {val}\n"
                else:
                    detail_text += "ℹ️ Nenhuma variável de IA foi extraída nesta sessão até o momento.\n"
                
                if pending_vars:
                    if saved_vars: detail_text += "\n"
                    detail_text += "⏳ **Variáveis Pendentes de Extração:**\n"
                    for k in pending_vars:
                        detail_text += f"- {k} (Aguardando menção no diálogo)\n"
                
                _add_step(
                    db, event_id, "📊 Variáveis Extraídas", 
                    detail_text, 
                    metadata={"saved": saved_vars, "pending": pending_vars}
                )
        except Exception as e_log_vars:
            logger.error(f"Erro ao adicionar etapa de variáveis extraídas no pipeline: {e_log_vars}")

        event.status = "completed" if send_success else "error"
        db.commit()
        if send_success:
            _add_step(db, event_id, "🏁 Pipeline Finalizado", "Processamento concluído com sucesso.")
        else:
            _add_step(db, event_id, "❌ Pipeline Finalizado com Falha no Envio", "O processamento foi concluído, mas o envio da mensagem falhou.")


        try:
            import redis as redis_lib
            _redis_local = redis_lib.from_url(os.getenv("REDIS_URL", "redis://redis:6379/0"), decode_responses=True)
            phone = event.telefone
            wid = config.id
            _redis_local.delete(f"webhook:debounce:id:{wid}:{phone}")
            _redis_local.delete(f"webhook:debounce:text:{wid}:{phone}")
            logger.info(f"🧹 Limpeza de debounce concluída para {phone}")
        except Exception as redis_err:
            logger.error(f"Erro ao limpar redis: {redis_err}")

    except Exception as e:
        logger.error(f"Erro ao processar webhook event {event_id}: {e}")
        try:
            _add_step(db, event_id, "❌ Erro no processamento", str(e)[:300])
            ev = db.query(WebhookEventModel).filter(WebhookEventModel.id == event_id).first()
            if ev:
                ev.status = "error"
                ev.legenda = f"❌ Erro técnico: {str(e)[:200]}"
                db.commit()
        except Exception:
            pass
    finally:
        db.close()

@app.task(bind=True, name="webhook_tasks.sync_memory_to_vector", max_retries=0)
def sync_memory_to_vector(self, event_id: int):
    db = SessionLocal()
    try:
        event = db.query(WebhookEventModel).filter(WebhookEventModel.id == event_id).first()
        if not event:
            return

        _add_step(db, event_id, "🔍 Entrada no Pipeline", f"Tarefa iniciada para o evento {event_id}. Status atual no DB: {event.status}")

        if event.status in ["success", "completed", "error"]:
            _add_step(db, event_id, "🚫 Sincronização Ignorada", f"O evento já está finalizado como '{event.status}'. Abortando execução para evitar loop.")
            logger.info(f"Task cancelada: Evento {event_id} já está em estado final '{event.status}'.")
            return
            
        if event.status == "processing":
             _add_step(db, event_id, "⚠️ Pipeline em andamento", "Já existe um worker processando este evento. Abortando colisão.")
             logger.info(f"Task cancelada: Evento {event_id} já está sendo processado.")
             return

        event.processing_steps = "[]"
        event.status = "processing"
        db.commit()

        _add_step(db, event_id, "⏳ Iniciando delay estratégico (5s)", "Aguardando estabilização dos dados conforme solicitado pelo usuário...")
        time.sleep(5)

        _add_step(db, event_id, "🔍 Iniciando sincronização vetorial", "Analisando dados recebidos via webhook para persistência em memória.")

        raw = {}
        try:
            raw = json.loads(event.raw_payload or "{}")
        except:
            _add_step(db, event_id, "❌ Erro: Payload inválido", "Não foi possível decodificar o JSON do evento.")
            event.status = "error"
            db.commit()
            return

        phone = raw.get("phone") or event.telefone
        name = raw.get("name") or event.contato_nome
        facts = raw.get("facts", {})

        if not facts:
            _add_step(db, event_id, "⚠️ Nenhum fato encontrado", "O payload não contém campos de 'facts' para sincronizar.")
            event.status = "completed"
            db.commit()
            return

        _add_step(db, event_id, f"✅ Contato: {name} ({phone})", f"Processando {len(facts)} fatos extraídos.")
        
        vars_str = ", ".join([f"{k}" for k in facts.keys()])
        _add_step(db, event_id, "🛠️ Variáveis identificadas", f"Campos: {vars_str}", metadata={"facts": facts})

        config = db.query(WebhookConfigModel).filter(WebhookConfigModel.id == event.webhook_config_id).first()
        if not config or not config.agent_id:
            _add_step(db, event_id, "❌ Erro: Agente não configurado", "O webhook não possui um agente vinculado para salvar a memória.")
            event.status = "error"
            db.commit()
            return

        agent = db.query(AgentConfigModel).filter(AgentConfigModel.id == config.agent_id).first()
        kb_id = agent.knowledge_base_id if agent else None
        
        if not kb_id:
            kb = db.query(KnowledgeBaseModel).first()
            if kb: kb_id = kb.id

        if not kb_id:
            _add_step(db, event_id, "❌ Erro: Base de Conhecimento inexistente", "Não foi encontrada uma base de conhecimento para este agente.")
            event.status = "error"
            db.commit()
            return

        _add_step(db, event_id, "💾 Gerando Embeddings de Memória", f"Iniciando conversão de {len(facts)} fatos em vetores pesquisáveis...")
        
        success_count = 0
        for key, value in facts.items():
            content = f"Informação de {name} ({phone}): {key} é {value}"
            _add_step(db, event_id, f"🔄 Processando campo: {key}", "Solicitando embedding à OpenAI...")
            
            try:
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                emb, usage = loop.run_until_complete(get_embedding(content))
                loop.close()
                
                if emb:
                    new_item = KnowledgeItemModel(
                        knowledge_base_id=kb_id,
                        question=f"{key} de {name}",
                        answer=str(value),
                        metadata_val=f"phone:{phone}",
                        embedding=emb,
                        category="memory_sync"
                    )
                    db.add(new_item)
                    db.commit()
                    success_count += 1
                    
                    usage_stats = {}
                    if usage:
                        if hasattr(usage, 'model_dump'): usage_stats = usage.model_dump()
                        elif hasattr(usage, 'dict'): usage_stats = usage.dict()
                        else: usage_stats = str(usage)

                    _add_step(db, event_id, f"✅ Salvo: {key}", f"Campo '{key}' persistido na memória vetorial.", metadata={"usage": usage_stats})
                else:
                    _add_step(db, event_id, f"🛑 Parada por Falha: {key}", "O serviço de embedding não retornou dados. Parando conforme regra anti-erro.")
                    event.status = "error"
                    db.commit()
                    return
            except Exception as loop_e:
                logger.error(f"Erro ao processar fato {key}: {loop_e}")
                _add_step(db, event_id, f"🛑 Parada por Erro: {key}", f"Erro: {str(loop_e)}. Pipeline interrompido para evitar inconsistência.")
                event.status = "error"
                db.commit()
                return

        _add_step(db, event_id, "✅ Sincronização finalizada", f"Pipeline concluído. {success_count} campos integrados à memória.")
        event.status = "completed"
        db.commit()

    except Exception as e:
        logger.error(f"Erro no sync_memory_to_vector: {e}")
        _add_step(db, event_id, "❌ Erro crítico no pipeline", str(e))
        if event:
            event.status = "error"
            db.commit()
    finally:
        db.close()
