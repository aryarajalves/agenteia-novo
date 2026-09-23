import re
import json
import logging
from sqlalchemy import select
from models import SemanticCacheModel
from ..utils import is_user_answering_assistant_question

logger = logging.getLogger(__name__)


async def check_semantic_cache_stage(
    db,
    async_db,
    event,
    db_agent,
    mensagem: str,
    history: list,
    session_id: str,
    event_id: int,
    is_simulated: bool
) -> tuple:
    """Verifica e resolve o cache semântico antes da triagem do Pre-Router.
    
    Retorna:
        (is_terminal: bool, terminal_result: dict, partial_cache_items: list, cache_funnel_handled: bool)
    """
    import webhook_tasks

    partial_cache_items = []
    cache_enabled = getattr(db_agent, 'semantic_cache_enabled', True)
    msg_clean_for_cache = re.sub(r'[^\w\s]', '', (mensagem or '').lower()).strip()
    is_pure_conversational = msg_clean_for_cache in [
        "sim", "nao", "não", "ok", "ta bom", "tá bom", "beleza", "blz", "certo",
        "perfeito", "combinado", "otimo", "ótimo", "maravilha", "nenhuma", "nenhum",
        "nada", "nada mais", "nao obrigado", "não obrigado", "nao obrigada", "não obrigada"
    ]
    is_answering_question = is_user_answering_assistant_question(mensagem, history)
    if is_answering_question:
        logger.info(f"⏭️ [CACHE SEMÂNTICO PULA] Mensagem é resposta conversacional/qualificação para o assistente: '{mensagem[:40]}...'. Pulando consulta ao cache.")

    if not (cache_enabled and not is_simulated and mensagem and len(mensagem.strip()) >= 3 and not is_pure_conversational and not is_answering_question):
        return False, None, [], False

    try:
        from services.semantic_cache_service import lookup_semantic_cache, lookup_multi_query_semantic_cache
        from agent_core.utils import format_whatsapp_message
        
        raw_ct = getattr(db_agent, 'semantic_cache_threshold', 92)
        if isinstance(raw_ct, (int, float)):
            cache_threshold = float(raw_ct)
            if cache_threshold > 1.0:
                cache_threshold = cache_threshold / 100.0
        else:
            cache_threshold = 0.92
            
        is_followup = bool(getattr(event, 'event_type', '') == 'followup')

        active_prod = getattr(event, 'product_name', None) or None
        if not active_prod and history:
            try:
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
        query_diagnostics = []

        if not cached_item:
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
                if cand_thresh is None or not isinstance(cand_thresh, (int, float)):
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
                partial_cache_items = [cached_item] if not is_multi_hit else multi_matched_items
                if is_multi_hit and multi_matched_items:
                    step_title = f"⚡ Cache Semântico ({sim_pct_str} · {len(multi_matched_items)} Perguntas) + Funil de Qualificação Ativo"
                    bullets = "\n".join([f"  • \"{it.user_query}\" (ID {it.id})" for it in multi_matched_items])
                    p_label = f"• **Perguntas Identificadas e Respondidas ({len(multi_matched_items)}):**\n{bullets}\n• **Similaridade Média:** {sim_pct_str}"
                    cache_meta = {"from_semantic_cache": "funnel", "cache_ids": [it.id for it in multi_matched_items], "matched_queries": [it.user_query for it in multi_matched_items], "total_questions": len(multi_matched_items), "similarity": round(sim_score, 4), "similarity_pct": sim_pct_str, "funnel_active": True}
                else:
                    step_title = f"⚡ Cache Semântico ({sim_pct_str}) + Funil de Qualificação Ativo"
                    p_label = f"• **Pergunta Identificada:** \"{cached_item.user_query}\"\n• **Similaridade Vetorial:** {sim_pct_str}"
                    cache_meta = {"from_semantic_cache": "funnel", "cache_id": cached_item.id, "similarity": round(sim_score, 4), "similarity_pct": sim_pct_str, "funnel_active": True}
                step_detail = (
                    f"🎯 **Hit de Cache Semântico Integrado ao Funil de Sondagem**\n\n"
                    f"{p_label}\n"
                    f"• **Origem:** Resposta aprovada no Cache Semântico\n\n"
                    f"💬 **Resposta Oficial do Cache Injetada:**\n{resp_content}\n\n"
                    f"🤖 A resposta oficial do cache foi injetada no contexto para que o Agente responda com precisão e formule a pergunta da próxima etapa do Funil de Qualificação."
                )
                webhook_tasks._add_step(db, event_id, step_title, step_detail, metadata=cache_meta)
                db.commit()
                logger.info(f"⚡ [PIPELINE] Cache Semântico ({sim_pct_str}) integrado ao Funil de Qualificação ativo para evento {event_id}.")
                return False, None, partial_cache_items, True
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
                
                cache_step_meta = {
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
                webhook_tasks._add_step(
                    db,
                    event_id,
                    "⏭️ Agente Principal Pulado (Cache Semântico)",
                    "• **Status:** O Agente Principal foi PULADO.\n• **Motivo:** A dúvida foi atendida com 100% de precisão pelo Cache Semântico.\n• **Economia:** 0 tokens consumidos pelo Agente Principal (R$ 0,00).",
                    metadata=cache_step_meta
                )
                webhook_tasks._add_step(db, event_id, step_title, step_detail, metadata=cache_step_meta)
                db.commit()
                
                logger.info(f"⚡ [PIPELINE] Cache Semântico Hit ({sim_pct_str}) para evento {event_id}. Encerrando pipeline com custo zero.")
                
                terminal_result = {
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
                return True, terminal_result, [], False
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

    return False, None, partial_cache_items, False
