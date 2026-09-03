import os
import re
import json
import time
import logging
import asyncio
from datetime import datetime, timezone
from sqlalchemy import select, text
from sqlalchemy.orm import selectinload
from config_store import AgentConfig
from models import AgentConfigModel, WebhookEventModel
from core.timezone import get_now_utc

logger = logging.getLogger(__name__)

async def execute_agent_pipeline(
    db,
    event,
    config,
    db_agent,
    agent_config,
    history: list,
    mensagem: str,
    raw_phone: str,
    clean_phone: str,
    session_id: str,
    lead_internal_id,
    lead_created_at,
    event_id: int,
    is_simulated: bool,
    async_db
) -> dict:
    """Executa a etapa assíncrona com Pre-Router, RAG, Ferramentas e Modelo Principal."""
    import webhook_tasks

    # 1. BOT DEFENSE (ANTI-LOOP & MESSAGES LIMIT)
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

    # 2. CARREGAR AGENTES SECUNDÁRIOS
    secondary_agents = []
    if config.secondary_agent_ids:
        try:
            sec_ids = json.loads(config.secondary_agent_ids)
            if sec_ids:
                res = await async_db.execute(select(AgentConfigModel).where(AgentConfigModel.id.in_(sec_ids)))
                secondary_agents = res.scalars().all()
        except Exception as e:
            logger.error(f"Erro ao carregar agentes secundarios: {e}")

    # 2.5. CONSULTA AO CACHE SEMÂNTICO (CUSTO ZERO & RESPOSTA INSTANTÂNEA)
    cache_enabled = getattr(db_agent, 'semantic_cache_enabled', True)
    msg_clean_for_cache = re.sub(r'[^\w\s]', '', (mensagem or '').lower()).strip()
    is_pure_conversational = msg_clean_for_cache in [
        "sim", "nao", "não", "ok", "ta bom", "tá bom", "beleza", "blz", "certo",
        "perfeito", "combinado", "otimo", "ótimo", "maravilha", "nenhuma", "nenhum",
        "nada", "nada mais", "nao obrigado", "não obrigado", "nao obrigada", "não obrigada"
    ]
    if cache_enabled and not is_simulated and mensagem and len(mensagem.strip()) >= 3 and not is_pure_conversational:
        try:
            from services.semantic_cache_service import lookup_semantic_cache
            from agent_core.utils import format_whatsapp_message
            
            cache_threshold = getattr(db_agent, 'semantic_cache_threshold', 92)
            if cache_threshold > 1.0:
                cache_threshold = cache_threshold / 100.0
                
            is_followup = bool(getattr(event, 'event_type', '') == 'followup')

            active_prod = getattr(event, 'product_name', None) or None
            if not active_prod and history:
                try:
                    from models import SemanticCacheModel
                    stmt_tags = select(SemanticCacheModel.category_tag).where(
                        SemanticCacheModel.agent_id == db_agent.id,
                        SemanticCacheModel.category_tag.isnot(None)
                    ).distinct()
                    res_tags = await async_db.execute(stmt_tags)
                    known_tags = [t[0] for t in res_tags.fetchall() if t[0]]
                    if known_tags:
                        recent_msgs = history[-4:] if len(history) >= 4 else history
                        for msg_item in reversed(recent_msgs):
                            msg_text = msg_item.get("content") or "" if isinstance(msg_item, dict) else getattr(msg_item, "content", "")
                            msg_text_lower = msg_text.lower()
                            for tag in known_tags:
                                if tag.lower() in msg_text_lower:
                                    active_prod = tag
                                    break
                            if active_prod:
                                break
                except Exception:
                    pass

            cache_res = await lookup_semantic_cache(
                db=async_db,
                agent_id=db_agent.id,
                user_query=mensagem,
                client_id=getattr(db_agent, 'client_id', None),
                threshold=cache_threshold,
                is_followup=is_followup,
                return_diagnostics=True,
                active_product=active_prod
            )
            if isinstance(cache_res, (tuple, list)) and len(cache_res) >= 3:
                cached_item, sim_score, best_cand = cache_res[:3]
            elif isinstance(cache_res, (tuple, list)) and len(cache_res) == 2:
                cached_item, sim_score = cache_res[:2]
                best_cand = cached_item
            else:
                cached_item, sim_score, best_cand = None, 0.0, None

            is_multi_hit = False
            multi_matched_items = []
            partial_cache_items = []
            query_diagnostics = []

            if not cached_item:
                from services.semantic_cache_service import lookup_multi_query_semantic_cache
                mq_res = await lookup_multi_query_semantic_cache(
                    db=async_db,
                    agent_id=db_agent.id,
                    user_message=mensagem,
                    client_id=getattr(db_agent, 'client_id', None),
                    threshold=cache_threshold,
                    is_followup=is_followup,
                    return_diagnostics=True,
                    active_product=active_prod
                )
                if isinstance(mq_res, (tuple, list)) and len(mq_res) >= 5:
                    multi_items, multi_resp, multi_avg_sim, is_multi_all, query_diagnostics = mq_res[:5]
                elif isinstance(mq_res, (tuple, list)) and len(mq_res) == 4:
                    multi_items, multi_resp, multi_avg_sim, is_multi_all = mq_res[:4]
                    query_diagnostics = []
                else:
                    multi_items, multi_resp, multi_avg_sim, is_multi_all, query_diagnostics = None, None, 0.0, False, []

                if is_multi_all and multi_items and multi_resp:
                    is_multi_hit = True
                    multi_matched_items = multi_items
                    cached_item = multi_items[0]
                    sim_score = multi_avg_sim
                    resp_content_raw = multi_resp
                else:
                    if multi_items:
                        partial_cache_items = multi_items
                    if multi_avg_sim > sim_score:
                        sim_score = multi_avg_sim

                if not query_diagnostics:
                    cand_thresh = getattr(best_cand, 'similarity_threshold', None) if best_cand else cache_threshold
                    if cand_thresh is None:
                        cand_thresh = cache_threshold
                    elif cand_thresh > 1.0:
                        cand_thresh = cand_thresh / 100.0

                    query_diagnostics = [{
                        "sub_query": mensagem.strip(),
                        "matched_item_id": getattr(best_cand, 'id', None),
                        "matched_query": getattr(best_cand, 'user_query', None),
                        "similarity": round(sim_score, 4),
                        "similarity_pct": f"{sim_score * 100:.1f}%",
                        "threshold": round(cand_thresh, 4),
                        "threshold_pct": f"{cand_thresh * 100:.1f}%",
                        "approved": False
                    }]
            
            if cached_item:
                sim_pct_str = f"{sim_score * 100:.1f}%"
                
                raw_thresh = getattr(cached_item, 'similarity_threshold', None)
                if isinstance(raw_thresh, (int, float)):
                    item_thresh = float(raw_thresh)
                    if item_thresh > 1.0:
                        item_thresh = item_thresh / 100.0
                    thresh_type_str = " (Personalizado)"
                else:
                    item_thresh = cache_threshold
                    thresh_type_str = " (Padrão do Agente)"
                thresh_pct_str = f"{item_thresh * 100:.1f}%{thresh_type_str}"
                
                resp_content = resp_content_raw if is_multi_hit else cached_item.approved_response
                context_vars = {
                    "account_id": event.conta_id,
                    "conversation_id": event.conversa_id,
                    "contact_phone": event.telefone,
                    "contact_name": event.contato_nome,
                    "session_id": session_id
                }
                for k, v in context_vars.items():
                    if v is not None and "{" + k + "}" in resp_content:
                        resp_content = resp_content.replace("{" + k + "}", str(v))
                        
                resp_content = format_whatsapp_message(resp_content)
                
                # Verificar se o agente possui Funil de Qualificação ativo e o lead ainda não foi qualificado
                raw_qq = getattr(db_agent, 'qualification_questions', None)
                has_qualification_funnel = False
                if raw_qq:
                    try:
                        qq_list = json.loads(raw_qq) if isinstance(raw_qq, str) else raw_qq
                        if isinstance(qq_list, list) and len(qq_list) > 0:
                            has_qualification_funnel = True
                    except Exception:
                        pass

                is_already_qualified = False
                if has_qualification_funnel and history:
                    for h in history:
                        content_str = str(h.get("content") or "") if isinstance(h, dict) else str(getattr(h, "content", ""))
                        if "lead_qualificado" in content_str or "Lead qualificado com sucesso" in content_str:
                            is_already_qualified = True
                            break

                if has_qualification_funnel and not is_already_qualified:
                    # Não encerra o pipeline; injeta a resposta oficial do cache para a IA formular a pergunta do funil
                    partial_cache_items = [cached_item] if not is_multi_hit else multi_matched_items
                    step_title = f"⚡ Cache Semântico ({sim_pct_str}) + Funil de Qualificação Ativo"
                    step_detail = (
                        f"🎯 **Hit de Cache Semântico Integrado ao Funil de Sondagem**\n\n"
                        f"• **Pergunta Identificada:** \"{cached_item.user_query}\"\n"
                        f"• **Similaridade Vetorial:** {sim_pct_str}\n"
                        f"• **Origem:** Resposta aprovada no Cache Semântico\n\n"
                        f"💬 **Resposta Oficial do Cache Injetada:**\n{resp_content}\n\n"
                        f"🤖 A resposta oficial do cache foi injetada no contexto para que o Agente responda com precisão e formule a pergunta da próxima etapa do Funil de Qualificação."
                    )
                    webhook_tasks._add_step(
                        db,
                        event_id,
                        step_title,
                        step_detail,
                        metadata={
                            "from_semantic_cache": "funnel",
                            "cache_id": cached_item.id,
                            "similarity": round(sim_score, 4),
                            "similarity_pct": sim_pct_str,
                            "funnel_active": True
                        }
                    )
                    db.commit()
                    logger.info(f"⚡ [PIPELINE] Cache Semântico ({sim_pct_str}) integrado ao Funil de Qualificação ativo para evento {event_id}.")
                else:
                    if is_multi_hit:
                        step_title = f"⚡ Cache Semântico ({sim_pct_str} Similaridade · Múltiplas Perguntas · Custo Zero)"
                        bullets = "\n".join([f"  • \"{it.user_query}\"" for it in multi_matched_items])
                        step_detail = (
                            f"🎯 **Hit Multi-Perguntas Completo ({len(multi_matched_items)} Perguntas Atendidas · Custo Zero)**\n\n"
                            f"Todas as dúvidas enviadas na mensagem foram atendidas por respostas aprovadas no Cache Semântico:\n"
                            f"{bullets}\n\n"
                            f"• **Similaridade Média:** {sim_pct_str}\n"
                            f"• **Limiar Mínimo do Agente:** {cache_threshold * 100:.1f}%\n"
                            f"• **Economia de Recursos:** 0 Tokens de LLM consumidos (R$ 0,00)\n\n"
                            f"💬 **Resposta Combinada Entregue:**\n{resp_content}"
                        )
                    else:
                        step_title = f"⚡ Cache Semântico ({sim_pct_str} Similaridade · Custo Zero)"
                        step_detail = (
                            f"🎯 **Hit de Alta Precisão ({sim_pct_str} >= {thresh_pct_str})**\n\n"
                            f"• **Pergunta Identificada:** \"{cached_item.user_query}\"\n"
                            f"• **Similaridade Vetorial:** {sim_pct_str}\n"
                            f"• **Limiar Mínimo Exigido:** {thresh_pct_str}\n"
                            f"• **Origem:** Resposta aprovada no Cache Semântico\n"
                            f"• **Economia de Recursos:** 0 Tokens de LLM consumidos (R$ 0,00)\n\n"
                            f"💬 **Resposta Entregue pelo Cache:**\n{resp_content}"
                        )
                    
                    webhook_tasks._add_step(
                        db,
                        event_id,
                        step_title,
                        step_detail,
                        metadata={
                            "from_semantic_cache": True,
                            "cache_id": cached_item.id,
                            "similarity": round(sim_score, 4),
                            "similarity_pct": sim_pct_str,
                            "threshold": item_thresh,
                            "is_multi_query": is_multi_hit,
                            "original_query": cached_item.user_query,
                            "cost": 0.0,
                            "usage": {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0, "cached_tokens": 0}
                        }
                    )
                    webhook_tasks._add_step(
                        db,
                        event_id,
                        "⏭️ Agente Principal Pulado (Cache Semântico)",
                        "• **Status:** O Agente Principal foi PULADO.\n• **Motivo:** A dúvida foi atendida com 100% de precisão pelo Cache Semântico.\n• **Economia:** 0 tokens consumidos pelo Agente Principal (R$ 0,00)."
                    )
                    db.commit()
                    
                    logger.info(f"⚡ [PIPELINE] Cache Semântico Hit ({sim_pct_str}) para evento {event_id}. Encerrando pipeline com custo zero.")
                    
                    return {
                        "content": resp_content,
                        "model": "semantic-cache",
                        "usage": {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0},
                        "error": False,
                        "from_semantic_cache": True,
                        "cached_similarity": round(sim_score, 4),
                    "cached_similarity_pct": sim_pct_str,
                    "cached_original_query": cached_item.user_query,
                    "cached_id": cached_item.id,
                    "handoff_data": {"handoff": False, "destino": None, "motivo": None},
                    "debug": {
                        "cache_hit": True,
                        "from_semantic_cache": True,
                        "similarity": round(sim_score, 4),
                        "cached_similarity_pct": sim_pct_str,
                        "cached_original_query": cached_item.user_query,
                        "cached_id": cached_item.id,
                        "threshold": item_thresh,
                        "resolved_prompt": "Resposta entregue diretamente pelo Cache Semântico sem consumo de LLM.",
                        "rag_context": "",
                        "tool_calls": []
                    }
                }
            else:
                max_sim_pct = f"{sim_score * 100:.1f}%" if sim_score > 0 else "0.0%"
                thresh_pct = f"{cache_threshold * 100:.1f}%"
                if partial_cache_items:
                    bullets = "\n".join([f"  • \"{it.user_query}\" -> \"{it.approved_response}\"" for it in partial_cache_items])
                    webhook_tasks._add_step(
                        db,
                        event_id,
                        f"⚡ Cache Semântico Parcial ({len(partial_cache_items)} Dúvidas Pré-Resolvidas)",
                        f"Foram identificadas múltiplas perguntas na mensagem. O Cache Semântico pré-resolveu {len(partial_cache_items)} dúvida(s) com respostas oficiais aprovadas:\n\n"
                        f"{bullets}\n\n"
                        f"• **Similaridade Média:** {max_sim_pct}\n"
                        f"• **Ação:** As respostas oficiais foram injetadas no contexto da IA para responder às dúvidas restantes sem risco de alucinação e economizando tokens.",
                        metadata={
                            "from_semantic_cache": "partial",
                            "matched_count": len(partial_cache_items),
                            "max_similarity": round(sim_score, 4),
                            "similarity_pct": max_sim_pct,
                            "threshold": cache_threshold,
                            "queries_evaluated": query_diagnostics,
                            "user_query": mensagem
                        }
                    )
                else:
                    # Montar detalhe rico com cada pergunta do usuário e a respectiva similaridade encontrada
                    lines = ["Nenhuma resposta cadastrada atingiu a similaridade mínima necessária para aprovação automática.\n"]
                    
                    if query_diagnostics:
                        lines.append("📋 **Dúvidas do Usuário Analisadas:**")
                        for idx, q_diag in enumerate(query_diagnostics, start=1):
                            prefix = f"• **Pergunta {idx}:** \"{q_diag['sub_query']}\"" if len(query_diagnostics) > 1 else f"• **Pergunta do Usuário:** \"{q_diag['sub_query']}\""
                            lines.append(prefix)
                            if q_diag.get("matched_query"):
                                lines.append(f"  ↳ **Mais Próxima no Cache:** \"{q_diag['matched_query']}\"")
                            status_label = "✅ Atingiu Limiar" if q_diag["approved"] else "❌ Não Atingiu"
                            lines.append(f"  ↳ **Similaridade Encontrada:** {q_diag['similarity_pct']} (Limiar Exigido: {q_diag['threshold_pct']}) [{status_label}]")
                        lines.append("")

                    lines.append(f"• **Similaridade Máxima Encontrada:** {max_sim_pct}")
                    lines.append(f"• **Limiar Mínimo Exigido:** {thresh_pct}")
                    lines.append("• **Ação:** Encaminhando pergunta para análise do Pre-Router e IA.")
                    
                    webhook_tasks._add_step(
                        db,
                        event_id,
                        f"🔍 Verificação de Cache Semântico ({max_sim_pct} Similaridade)",
                        "\n".join(lines),
                        metadata={
                            "from_semantic_cache": False,
                            "max_similarity": round(sim_score, 4),
                            "similarity_pct": max_sim_pct,
                            "threshold": cache_threshold,
                            "queries_evaluated": query_diagnostics,
                            "user_query": mensagem
                        }
                    )
                db.commit()
        except Exception as e_cache:
            logger.warning(f"⚠️ [PIPELINE] Erro ao consultar cache semântico: {e_cache}")

    # 3. EXECUÇÃO DO PRE-ROUTER
    if is_simulated:
        webhook_tasks._add_step(db, event_id, "🧠 Analisando Intenção (Pre-Router MOCK)", "Simulando análise de intenção e roteamento sem consumo de tokens de API...")
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
        webhook_tasks._add_step(db, event_id, "🧠 Analisando Intenção (Pre-Router)", "A IA está decidindo o roteamento e entendendo o contexto da mensagem...")
        db.commit()
        
        t_start_pr = time.time()
        pre_router_result = await webhook_tasks.run_pre_router_ai(
            mensagem, 
            history, 
            db_agent, 
            secondary_agents,
            context_variables={"session_id": session_id},
            db=db
        )
        pr_elapsed_ms = int((time.time() - t_start_pr) * 1000)

    # 4. LOG DE ALINHAMENTO COM BASE DE CONHECIMENTO
    kb_info = pre_router_result.get("_kb_alignment_info")
    if kb_info:
        fase_nome = kb_info.get("fase", "Alinhamento com Base de Conhecimento")
        perguntas_ref = kb_info.get("perguntas_referencia_detalhadas") or kb_info.get("perguntas_referencia", [])
        total_count = len(kb_info.get("perguntas_referencia", perguntas_ref))
        custo_str = kb_info.get("custo", "R$ 0,00")
        detalhe_str = kb_info.get("detalhe", "")
        
        if perguntas_ref:
            formatted_items = []
            for q in perguntas_ref[:5]:
                if q.startswith('"'):
                    formatted_items.append(f"• {q}")
                else:
                    formatted_items.append(f'• "{q}"')
            ref_text = "\n".join(formatted_items)
            more_count = total_count - 5
            if more_count > 0:
                ref_text += f"\n• ... (e mais {more_count} perguntas analisadas no catálogo)"
            
            webhook_tasks._add_step(
                db, 
                event_id, 
                f"🎯 {fase_nome}", 
                f"Consultando a Base de Conhecimento para alinhar a dúvida do usuário às perguntas oficiais.\n\n**Perguntas de Referência Analisadas ({total_count} itens):**\n{ref_text}\n\n**💰 Custo / Consumo de Tokens da Pré-Busca:** {custo_str}"
            )
        elif detalhe_str:
            webhook_tasks._add_step(
                db, 
                event_id, 
                f"{fase_nome}", 
                f"{detalhe_str}\n\n**💰 Custo / Consumo:** {custo_str}"
            )
        else:
            webhook_tasks._add_step(
                db, 
                event_id, 
                f"{fase_nome}", 
                f"Nenhuma pergunta cadastrada foi encontrada nas bases de conhecimento do agente.\n\n**💰 Custo / Consumo:** {custo_str}"
            )
        db.commit()

    # 5. MENSAGEM AUTOMÁTICA
    if pre_router_result.get("eh_mensagem_automatica"):
        event.is_automatic = True
        event.status = "ignored"
        webhook_tasks._add_step(db, event_id, "🤖 Mensagem Automática do Contato", "A IA identificou esta mensagem como um envio automático/ausência comercial do contato. A automação foi encerrada e nenhuma resposta foi enviada para evitar loops.")
        db.commit()
        return {"ignored_automatic": True}

    # 6. ANÚNCIOS (APENAS 1ª MENSAGEM)
    is_first_msg = not history or len(history) == 0
    if is_first_msg:
        eh_anuncio = pre_router_result.get("eh_anuncio", False)
        detalhe = pre_router_result.get("detalhe_anuncio")
        if eh_anuncio:
            perguntas = pre_router_result.get("perguntas_extraidas")
            if not perguntas or not str(perguntas).strip():
                webhook_tasks._add_step(db, event_id, "📢 Anúncio Detectado", f"A primeira mensagem foi identificada como anúncio ({detalhe}) e não contém perguntas. Respondendo com a saudação configurada.")
                if config.leads_table and lead_internal_id:
                    try:
                        db.execute(text(f"UPDATE {config.leads_table} SET mensagem = NULL, ultima_mensagem_em = NULL WHERE id = :lid"), {"lid": lead_internal_id})
                        db.commit()
                    except Exception as e_lead_clear:
                        logger.warning(f"Erro ao limpar mensagem de anuncio da tabela de leads: {e_lead_clear}")
            else:
                webhook_tasks._add_step(db, event_id, "📢 Anúncio Detectado (Mensagem Mista)", f"Mensagem mista contendo anúncio ({detalhe}) e pergunta. O anúncio será removido e a pergunta será respondida.")
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
            webhook_tasks._add_step(db, event_id, "📢 Anúncio Não Detectado", "A primeira mensagem não corresponde a nenhum anúncio cadastrado. A pipeline prosseguirá normalmente.")
        db.commit()

    pr_model = pre_router_result.get("_model_used", db_agent.model or "gpt-4o-mini")
    pr_usage = pre_router_result.get("_usage", {})
    pr_prompt = pre_router_result.get("_debug_prompt", "Prompt indisponível")

    pr_cost = 0.0
    p_tokens = 0
    c_tokens = 0
    tot_tokens = 0
    usd_cost = 0.0
    brl_cost = 0.0

    if pr_usage:
        rates = {
            "gpt-4o-mini": {"in": 0.15 / 1_000_000, "out": 0.60 / 1_000_000},
            "gpt-4o": {"in": 5.00 / 1_000_000, "out": 15.00 / 1_000_000},
            "gpt-5-mini": {"in": 0.30 / 1_000_000, "out": 1.20 / 1_000_000}
        }
        rate = rates.get(pr_model, rates.get(db_agent.model) or rates["gpt-4o-mini"])
        p_tokens = pr_usage.get("prompt_tokens", 0)
        c_tokens = pr_usage.get("completion_tokens", 0)
        tot_tokens = pr_usage.get("total_tokens", p_tokens + c_tokens)
        usd_cost = (p_tokens * rate["in"]) + (c_tokens * rate["out"])
        brl_cost = usd_cost * 5.30
        pr_cost = brl_cost

    if pr_model == "shortcut-logic" or not pr_usage:
        metrics_block = (
            "📊 **Métricas de Consumo do Pre-Router:**\n"
            "• **Modo de Execução:** Atalho Programático (Sem Custo de IA)\n"
            "• **Tokens Consumidos:** 0 tokens\n"
            "• **Custo:** R$ 0,0000\n\n"
            "---\n\n"
        )
    else:
        metrics_block = (
            f"📊 **Métricas de Consumo do Pre-Router:**\n"
            f"• **Modelo de IA Utilizado:** `{pr_model}`\n"
            f"• **Tokens de Entrada (Prompt):** {p_tokens:,} tokens\n"
            f"• **Tokens de Saída (Decisão):** {c_tokens:,} tokens\n"
            f"• **Total de Tokens:** {tot_tokens:,} tokens\n"
            f"• **Custo Estimado:** R$ {brl_cost:.4f} ($ {usd_cost:.6f} USD)\n\n"
            f"---\n\n"
        )

    decision_copy = {k: v for k, v in pre_router_result.items() if not k.startswith("_")}
    
    webhook_tasks._add_step(
        db, 
        event_id, 
        "✅ Decisão da IA (Pre-Router)", 
        f"{metrics_block}**Decisão da IA:**\n```json\n{json.dumps(decision_copy, default=str, ensure_ascii=False, indent=2)}\n```\n\n**Prompt Completo Analisado:**\n```text\n{pr_prompt}\n```", 
        metadata={
            "model": pr_model, 
            "usage": {
                "prompt_tokens": p_tokens,
                "completion_tokens": c_tokens,
                "total_tokens": tot_tokens
            }, 
            "cost": pr_cost,
            "duration_ms": pr_elapsed_ms if 'pr_elapsed_ms' in locals() else None
        }
    )

    # 7. INTERCEPTAÇÃO DE EMOJI NEGATIVO
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
            
            success, current_labels = await webhook_tasks.sync_conversation_labels(
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
                await webhook_tasks.sync_conversation_labels(
                    zapvoice_url=cw_url,
                    client_id=acc_id,
                    conversation_id=conv_id,
                    token=cw_token,
                    to_add=[ignore_label]
                )
            
            webhook_tasks._add_step(db, event_id, "👎 Emoji Negativo (2ª ocorrência)", f"Enviando mensagem de transição e aplicando etiqueta de pausa: {ignore_label}")
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
                await webhook_tasks.sync_conversation_labels(
                    zapvoice_url=cw_url,
                    client_id=acc_id,
                    conversation_id=conv_id,
                    token=cw_token,
                    to_add=[neg_label]
                )
                
            webhook_tasks._add_step(db, event_id, "👎 Emoji Negativo (1ª ocorrência)", f"Enviando resposta empática e aplicando etiqueta de feedback negativo: {neg_label}")
            return {
                "content": pre_router_result.get("resposta_direta"),
                "usage": pr_usage,
                "model": pr_model,
                "debug": {
                    "is_greeting": True,
                    "negative_emoji_first_occurrence": True
                }
            }

    # 7b. INTERCEPTAÇÃO DE COMPRA INFORMADA PELO CLIENTE (ALUNO CONFIRMADO)
    if pre_router_result.get("eh_compra_informada"):
        purchased_lbl = (config.purchased_label or "aluno").strip()
        cw_url = (config.zapvoice_url or os.getenv("ZAPVOICE_URL", "")).rstrip("/")
        if cw_url and not cw_url.endswith("/api"):
            cw_url = f"{cw_url}/api"
        cw_token = config.zapvoice_api_token or os.getenv("ZAPVOICE_API_TOKEN", "")

        # Sincronizar etiqueta no ZapVoice
        if cw_url and cw_token and event.conversa_id and (event.inbox_id or config.zapvoice_client_id):
            acc_id = str(event.inbox_id or config.zapvoice_client_id or "1")
            conv_id = int(event.conversa_id) if str(event.conversa_id).isdigit() else 0
            if conv_id and purchased_lbl:
                try:
                    await webhook_tasks.sync_conversation_labels(
                        zapvoice_url=cw_url,
                        client_id=acc_id,
                        conversation_id=conv_id,
                        token=cw_token,
                        to_add=[purchased_lbl]
                    )
                except Exception as e_sync:
                    logger.warning(f"Erro ao sincronizar etiqueta de compra no ZapVoice: {e_sync}")

        # Cancelar follow-up no banco local e registrar etiqueta no lead
        if lead_internal_id and config.leads_table:
            try:
                row_lead = db.execute(text(f"SELECT labels FROM {config.leads_table} WHERE id = :id"), {"id": lead_internal_id}).fetchone()
                current_labels = []
                if row_lead and row_lead[0]:
                    try:
                        current_labels = json.loads(row_lead[0]) if isinstance(row_lead[0], str) else row_lead[0]
                        if not isinstance(current_labels, list): current_labels = []
                    except Exception:
                        current_labels = [l.strip() for l in str(row_lead[0]).split(",") if l.strip()]
                if purchased_lbl and purchased_lbl not in current_labels:
                    current_labels.append(purchased_lbl)

                db.execute(text(f"""
                    UPDATE {config.leads_table} 
                    SET followup_step = -1, labels = :labels
                    WHERE id = :id
                """), {"labels": json.dumps(current_labels, ensure_ascii=False), "id": lead_internal_id})
                db.commit()
            except Exception as e_up:
                logger.error(f"Erro ao atualizar lead e cancelar follow-up para lead {lead_internal_id}: {e_up}")
                db.rollback()

        webhook_tasks._add_step(
            db, 
            event_id, 
            "🎉 Compra Informada pelo Cliente", 
            f"Lead informou que já comprou o curso/produto. Etiqueta '{purchased_lbl}' aplicada e automações de follow-up canceladas com sucesso."
        )
        return {
            "content": pre_router_result.get("resposta_direta"),
            "usage": pr_usage,
            "model": pr_model,
            "debug": {
                "is_greeting": True,
                "compra_informada": True,
                "purchased_label_applied": purchased_lbl
            }
        }

    if pre_router_result.get("eh_agradecimento_recorrente") or (pre_router_result.get("eh_agradecimento") and not pre_router_result.get("resposta_direta")):
        webhook_tasks._add_step(
            db,
            event_id,
            "⏭️ Agente Principal Pulado (Agradecimento)",
            "• **Status:** O Agente Principal foi PULADO.\n• **Motivo:** O Pre-Router detectou um 2º (ou subsequente) agradecimento consecutivo do usuário. A resposta foi omitida para evitar envio infinito de mensagens."
        )
        return {"ignored_recurrent_thanks": True, "content": None, "usage": pr_usage, "model": pr_model}

    if pre_router_result.get("eh_saudacao") and pre_router_result.get("resposta_direta"):
        webhook_tasks._add_step(
            db, 
            event_id, 
            "⏭️ Agente Principal Pulado (Saudação Direta)", 
            "• **Status:** O Agente Principal foi PULADO.\n• **Motivo:** O Pre-Router / Atalho Programático gerou a resposta de saudação diretamente para garantir resposta instantânea."
        )
        return {"content": pre_router_result.get("resposta_direta"), "usage": pr_usage, "model": pr_model, "debug": {"is_greeting": True}}
    
    if pre_router_result.get("precisa_esclarecimento") and pre_router_result.get("resposta_esclarecimento"):
        webhook_tasks._add_step(
            db, 
            event_id, 
            "⏭️ Agente Principal Pulado (Mensagem Ambígua)", 
            "• **Status:** O Agente Principal foi PULADO.\n• **Motivo:** O Pre-Router gerou uma pergunta de esclarecimento para entender a intenção do lead antes de acionar o Agente Principal."
        )
        return {"content": pre_router_result.get("resposta_esclarecimento"), "usage": pr_usage, "model": pr_model, "debug": {"needs_clarification": True}}
        
    target_agent_id = pre_router_result.get("id_agente_alvo")
    final_agent_config = agent_config
    final_db_agent = db_agent
    
    if target_agent_id and target_agent_id != db_agent.id:
        target_res = await async_db.execute(
            select(AgentConfigModel)
            .options(selectinload(AgentConfigModel.knowledge_bases))
            .where(AgentConfigModel.id == target_agent_id)
        )
        target_db_agent = target_res.scalars().first()
        if target_db_agent:
            final_db_agent = target_db_agent
            final_agent_config = webhook_tasks._build_agent_config(target_db_agent)
            webhook_tasks._add_step(db, event_id, f"🔀 Roteamento Efetuado", f"Mensagem roteada do principal para o Secundário: {final_db_agent.name}")

    # 8. MODO ASSISTENTE DE PROJETO
    is_project_assistant = False
    proj_label = (config.project_assistant_label or "").strip()
    if proj_label:
        current_labels_list = []
        if event.labels:
            try:
                parsed_l = json.loads(event.labels)
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
        webhook_tasks._add_step(db, event_id, "⚙️ Modo Assistente de Projeto Ativo", "Injetando métricas reais e prompt customizado do projeto.")
        metrics = await webhook_tasks.get_project_assistant_context(async_db, config)
        final_agent_config.system_prompt = webhook_tasks.build_project_assistant_prompt(metrics)
        final_db_agent_tools = []

    extracted = pre_router_result.get("perguntas_extraidas")
    extracted_date = pre_router_result.get("data_extraida")
    
    if extracted_date:
        mensagem = f"[DATA EXTRAÍDA PELO SISTEMA: {extracted_date}]\n{extracted or mensagem}"
    elif extracted and str(extracted).strip():
        original_msg = str(mensagem)
        mensagem = str(extracted)
        if original_msg != mensagem and pre_router_result.get("precisa_rag"):
            webhook_tasks._add_step(db, event_id, "🧹 Melhoria de Mensagem Alinhada ao RAG", f"A mensagem do usuário foi alinhada com as perguntas da Base de Conhecimento.\n\n**Antes:** \"{original_msg}\"\n**Depois (Alinhado):** \"{mensagem}\"")
        elif original_msg != mensagem:
            webhook_tasks._add_step(db, event_id, "🧹 Mensagem Processada", f"Mensagem processada pelo Pre-Router: \"{mensagem[:1000]}\"")
        else:
            webhook_tasks._add_step(db, event_id, "🧹 Mensagem Limpa/Extraída", f"Mensagem mantida para consulta: \"{mensagem[:1000]}\"")

    pre_executed_tool_calls = []
    pre_executed_rag_context = None
    
    # 9. EXECUÇÃO ANTECIPADA DE RAG
    # Se todas as perguntas já foram pré-resolvidas pelo Cache Semântico, pula o RAG para economizar latência e recursos
    has_all_resolved_by_cache = bool('partial_cache_items' in locals() and partial_cache_items and len(partial_cache_items) >= len(pre_router_result.get("lista_perguntas_extraidas") or [1]))
    if pre_router_result.get("precisa_rag") and not has_all_resolved_by_cache:
        pre_executed_rag_context = await webhook_tasks.execute_pre_rag_search(
            db=db,
            async_db=async_db,
            event_id=event_id,
            final_db_agent=final_db_agent,
            pre_router_result=pre_router_result,
            mensagem=mensagem
        )

    # Se houver respostas oficiais pré-resolvidas pelo Cache Semântico Parcial, injeta no contexto para a IA
    if 'partial_cache_items' in locals() and partial_cache_items:
        cache_context_block = "\n\n# RESPOSTAS OFICIAIS PRÉ-APROVADAS DO CACHE SEMÂNTICO:\n" + "\n".join([
            f"- Dúvida: {it.user_query}\n  Resposta Oficial Aprovada: {it.approved_response}"
            for it in partial_cache_items
        ]) + "\n\nIMPORTANTE: O usuário fez múltiplas perguntas na mensagem. Utilize obrigatoriamente as Respostas Oficiais Aprovadas acima para responder aos tópicos correspondentes e responda com clareza à(s) dúvida(s) restante(s) do usuário, integrando tudo em uma única mensagem fluida e natural."
        pre_executed_rag_context = (pre_executed_rag_context or "") + cache_context_block

    # 10. EXECUÇÃO ANTECIPADA DE FERRAMENTAS
    if pre_router_result.get("chamada_ferramenta"):
        tc = pre_router_result["chamada_ferramenta"]
        tool_name = tc.get("nome")
        tool_args = tc.get("argumentos") or {}
        
        webhook_tasks._add_step(db, event_id, "🛠️ Acionando ferramenta (Pre-Router)", f"Ferramenta: {tool_name} | Argumentos: {tool_args}")
        
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
        
        if tool_name == "internal_date_calculator":
            from agent_core.tools.handlers.internal import handle_date_calculator
            tool_result = await handle_date_calculator(json.dumps(tool_args))
        elif tool_name == "registrar_duvida_sem_resposta":
            from agent_core.tools.handlers.internal import handle_unanswered_question
            tool_result = await handle_unanswered_question(async_db, context_vars, json.dumps(tool_args), history, final_db_agent.id)
        elif tool_name == "google_calendar_manager":
            from agent_core.tools.handlers.google import handle_google_calendar
            tool_result = await handle_google_calendar(async_db, context_vars, tool_args)
        elif tool_name == "lead_qualificado":
            from agent_core.tools.handlers.internal import handle_lead_qualified
            tool_result = await handle_lead_qualified(async_db, context_vars, json.dumps(tool_args), final_db_agent.id)
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
                    
        webhook_tasks._add_step(db, event_id, f"✅ Ferramenta {tool_name} finalizada (Pre-Router)", f"Retorno: {tool_result[:500]}...")
        pre_executed_tool_calls.append({
            "name": tool_name,
            "args": tool_args,
            "output": tool_result
        })

    # 11. CHAMADA AO MODELO PRINCIPAL (OU MOCK)
    image_url = event.link if event.message_type == "image" else None
    dias_desde_criacao = 0
    if lead_created_at and isinstance(lead_created_at, datetime):
        tz_aware = lead_created_at if lead_created_at.tzinfo else lead_created_at.replace(tzinfo=timezone.utc)
        dias_desde_criacao = (get_now_utc() - tz_aware).days

    if is_simulated:
        webhook_tasks._add_step(db, event_id, "🤖 Chamada ao Agente de IA (MOCK)", "Gerando resposta simulada sem consumo de tokens reais da OpenAI...")
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
        funnel_notice = "\n• **Contexto Integrado:** Resposta oficial do Cache Semântico pré-injetada + formulação da pergunta do Funil de Qualificação." if ('partial_cache_items' in locals() and partial_cache_items) else ""
        webhook_tasks._add_step(
            db,
            event_id,
            f"🤖 Agente Principal Acionado ({final_db_agent.name})",
            f"• **Status:** O Agente Principal foi ACIONADO para gerar a resposta.\n• **Agente Responsável:** {final_db_agent.name} (ID: {final_db_agent.id})\n• **Modelo Configurado:** `{final_agent_config.model}`{funnel_notice}"
        )
        result = await webhook_tasks.process_message(
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
                "dias_desde_criacao": dias_desde_criacao
            },
            db=async_db,
            image_url=image_url,
            on_step=lambda step, detail: webhook_tasks._add_step(db, event_id, step, detail),
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
