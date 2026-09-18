from typing import Optional, Tuple, Union, Dict, Any
import json
import logging
import re
from sqlalchemy import select
from ..models.usage import UsageLog
from ..utils import format_whatsapp_message

logger = logging.getLogger(__name__)

async def handle_semantic_cache_check(
    config,
    message: str,
    history: list,
    context_variables: dict,
    db,
    image_url: Optional[str] = None,
    performed_tool_calls: list = None,
    pre_executed_tool_calls: list = None,
    pre_executed_rag_context: Optional[str] = None,
    on_step: Optional[callable] = None,
    return_diagnostics: bool = False
) -> Union[Tuple[Optional[dict], Optional[str]], Tuple[Optional[dict], Optional[str], Optional[dict]]]:
    """
    Verifica o Cache Semântico para perguntas únicas ou múltiplas.
    - Se houver match total: retorna (resultado_cache, pre_executed_rag_context, diag).
    - Se houver match parcial: injeta as respostas oficiais no pre_executed_rag_context e retorna (None, pre_executed_rag_context, diag).
    - Se houver match + funil de qualificação: injeta a resposta oficial e retorna (None, pre_executed_rag_context, diag).
    - Se não houver match: retorna (None, pre_executed_rag_context, diag).
    """
    is_cache_enabled = getattr(config, 'semantic_cache_enabled', True)
    try:
        cache_threshold = float(getattr(config, 'semantic_cache_threshold', 0.92) or 0.92)
    except (TypeError, ValueError):
        cache_threshold = 0.92

    if not is_cache_enabled:
        diag = {
            "consulted": False,
            "enabled": False,
            "status": "disabled",
            "status_label": "Desativado",
            "threshold": cache_threshold,
            "threshold_pct": f"{cache_threshold * 100:.1f}%",
            "message": "O Cache Semântico está desativado nas configurações do agente."
        }
        if return_diagnostics:
            return None, pre_executed_rag_context, diag
        return None, pre_executed_rag_context

    if image_url or performed_tool_calls or pre_executed_tool_calls or pre_executed_rag_context is not None or not db or not getattr(config, 'id', None):
        diag = {
            "consulted": False,
            "enabled": is_cache_enabled,
            "status": "skipped",
            "status_label": "Dispensado",
            "threshold": cache_threshold,
            "threshold_pct": f"{cache_threshold * 100:.1f}%",
            "message": "Consulta ao cache dispensada devido a imagem ou fluxo prévio de ferramentas."
        }
        if return_diagnostics:
            return None, pre_executed_rag_context, diag
        return None, pre_executed_rag_context

    diag = {
        "consulted": True,
        "enabled": True,
        "threshold": round(cache_threshold, 4),
        "threshold_pct": f"{cache_threshold * 100:.1f}%",
        "status": "miss",
        "status_label": "Consulta Sem Match",
        "similarity": 0.0,
        "similarity_pct": "0.0%",
        "matched_id": None,
        "matched_query": None,
        "matched_response": None,
        "closest_candidate": None,
        "closest_similarity": None,
        "closest_similarity_pct": None,
        "funnel_active": False,
        "message": ""
    }

    try:
        from services.semantic_cache_service import lookup_semantic_cache, lookup_multi_query_semantic_cache
        from models import SemanticCacheModel

        # Detectar produto em foco a partir do contexto ou das mensagens recentes no histórico
        active_prod = context_variables.get("active_product") or context_variables.get("product_name") or context_variables.get("produto")
        if not active_prod and history:
            try:
                from sqlalchemy import select
                stmt_tags = select(SemanticCacheModel.category_tag).where(
                    SemanticCacheModel.agent_id == config.id,
                    SemanticCacheModel.category_tag.isnot(None)
                ).distinct()
                import inspect
                res_tags_raw = db.execute(stmt_tags)
                res_tags = await res_tags_raw if inspect.isawaitable(res_tags_raw) else res_tags_raw
                known_tags = [t[0] for t in res_tags.fetchall() if t[0]]

                if known_tags:
                    recent_msgs = history[-4:] if len(history) >= 4 else history
                    for msg_item in reversed(recent_msgs):
                        msg_text = ""
                        if isinstance(msg_item, dict):
                            msg_text = msg_item.get("content") or ""
                        elif hasattr(msg_item, "content"):
                            msg_text = msg_item.content or ""

                        msg_text_lower = msg_text.lower()
                        for tag in known_tags:
                            if tag.lower() in msg_text_lower:
                                active_prod = tag
                                break
                        if active_prod:
                            break
            except Exception as e:
                logger.debug(f"Falha ao inferir active_prod do histórico: {e}")

        is_followup = False
        if history and len(history) > 0:
            followup_indicators = ["não entendi", "mas e ", "mas sobre", "não respondeu", "não foi isso", "falta", "queria saber mais sobre", "me explica melhor", "não ficou claro"]
            msg_lower = message.lower()
            if any(ind in msg_lower for ind in followup_indicators):
                is_followup = True

        cache_res = await lookup_semantic_cache(
            db=db,
            agent_id=config.id,
            user_query=message,
            client_id=context_variables.get("client_id"),
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

        if best_cand and not cached_item:
            diag["closest_candidate"] = best_cand.user_query
            diag["closest_similarity"] = round(sim_score, 4)
            diag["closest_similarity_pct"] = f"{sim_score * 100:.1f}%"

        is_multi_hit = False
        resp_content = None

        if not cached_item:
            mq_res = await lookup_multi_query_semantic_cache(
                db=db,
                agent_id=config.id,
                user_message=message,
                client_id=context_variables.get("client_id"),
                threshold=cache_threshold,
                is_followup=is_followup,
                return_diagnostics=True,
                active_product=active_prod
            )
            if isinstance(mq_res, (tuple, list)) and len(mq_res) == 5:
                m_items, m_resp, m_sim, is_all, m_diags = mq_res
            elif isinstance(mq_res, (tuple, list)) and len(mq_res) == 4:
                m_items, m_resp, m_sim, is_all = mq_res
                m_diags = []
            else:
                m_items, m_resp, m_sim, is_all, m_diags = None, None, 0.0, False, []

            unmatched_questions = [d.get("sub_query") for d in m_diags if not d.get("approved") and d.get("sub_query")]
            if not unmatched_questions and m_items and not is_all:
                try:
                    from services.semantic_cache_service import extract_sub_questions_ai
                    all_sub_qs = await extract_sub_questions_ai(message)
                    matched_queries = [it.user_query.lower() for it in m_items]
                    unmatched_questions = [q for q in all_sub_qs if not any(mq in q.lower() or q.lower() in mq for mq in matched_queries)]
                except Exception as e_unmatched:
                    logger.warning(f"Erro ao extrair perguntas pendentes de fallback no cache: {e_unmatched}")

            if is_all and m_items and m_resp:
                is_multi_hit = True
                cached_item = m_items[0]
                sim_score = m_sim
                resp_content = m_resp
            elif m_items:
                partial_block = "\n\n# RESPOSTAS OFICIAIS PRÉ-APROVADAS DO CACHE SEMÂNTICO:\n" + "\n".join([
                    f"- Dúvida: {it.user_query}\n  Resposta Oficial: {it.approved_response}" for it in m_items
                ]) + "\n\nIMPORTANTE: O usuário fez múltiplas perguntas. Utilize as Respostas Oficiais acima para os tópicos correspondentes e complemente respondendo com clareza à dúvida restante com base na Base de Conhecimento."
                pre_executed_rag_context = (pre_executed_rag_context or "") + partial_block
                if on_step:
                    on_step(f"⚡ Cache Semântico Parcial ({len(m_items)} Dúvidas Pré-Resolvidas)", "Respostas oficiais injetadas. Dúvidas pendentes serão buscadas no RAG.")

                diag.update({
                    "status": "partial_hit",
                    "status_label": "Hit Parcial (Multi-Perguntas)",
                    "similarity": round(m_sim, 4),
                    "similarity_pct": f"{m_sim * 100:.1f}%",
                    "matched_id": m_items[0].id,
                    "matched_query": f"{len(m_items)} perguntas respondidas via cache",
                    "matched_queries": [it.user_query for it in m_items],
                    "matched_items": [{"id": it.id, "query": it.user_query, "response": it.approved_response} for it in m_items],
                    "matched_response": partial_block,
                    "is_multi_hit": True,
                    "unmatched_questions": unmatched_questions,
                    "pending_questions": unmatched_questions,
                    "message": f"{len(m_items)} dúvidas identificadas e pré-resolvidas com respostas oficiais do cache."
                })
                if return_diagnostics:
                    return None, pre_executed_rag_context, diag
                return None, pre_executed_rag_context

        if cached_item:
            resp_content = resp_content or cached_item.approved_response
            for k, v in context_variables.items():
                if v is not None and "{" + k + "}" in resp_content:
                    resp_content = resp_content.replace("{" + k + "}", str(v))

            resp_content = format_whatsapp_message(resp_content)

            # Verificar se o agente possui Funil de Qualificação ativo e o lead ainda não foi qualificado
            from agent_core.logic.qualification_prompt import resolve_active_qualification_funnel
            active_funnel = resolve_active_qualification_funnel(config, context_variables.get("active_qualification_funnel_id"))
            raw_qq = active_funnel.get("questions")
            has_qualification_funnel = False
            if raw_qq:
                try:
                    qq_list = json.loads(raw_qq) if isinstance(raw_qq, str) else raw_qq
                    if isinstance(qq_list, list) and len(qq_list) > 0:
                        has_qualification_funnel = True
                except Exception:
                    pass

            is_already_qualified = bool(context_variables and context_variables.get("lead_already_qualified"))
            if not is_already_qualified and db and context_variables and context_variables.get("session_id"):
                sid = str(context_variables.get("session_id"))
                try:
                    import inspect
                    from sqlalchemy import select
                    from models import UserMemoryModel, InteractionLog
                    stmt_q = select(UserMemoryModel).where(
                        UserMemoryModel.session_id == sid,
                        UserMemoryModel.key == "lead_already_qualified"
                    )
                    res_raw = db.execute(stmt_q)
                    res_q = await res_raw if inspect.isawaitable(res_raw) else res_raw
                    if res_q.scalars().first():
                        is_already_qualified = True
                    else:
                        from sqlalchemy import or_
                        stmt_ilog = select(InteractionLog).where(
                            InteractionLog.session_id == sid,
                            or_(
                                InteractionLog.debug_info.like('%"name": "lead_qualificado"%'),
                                InteractionLog.debug_info.like('%"name":"lead_qualificado"%'),
                                InteractionLog.debug_info.like('%Operação \'lead_qualificado\' concluída%'),
                                InteractionLog.debug_info.like('%"lead_already_qualified": true%'),
                                InteractionLog.debug_info.like('%"lead_already_qualified":true%')
                            )
                        ).limit(1)
                        res_raw_ilog = db.execute(stmt_ilog)
                        res_ilog = await res_raw_ilog if inspect.isawaitable(res_raw_ilog) else res_raw_ilog
                        if res_ilog.scalars().first():
                            is_already_qualified = True
                except Exception as e_qcheck:
                    logger.debug(f"Aviso ao checar qualificação prévia no cache_handler: {e_qcheck}")

            if not is_already_qualified and has_qualification_funnel and history:
                for h in history:
                    content_str = str(h.get("content") or "") if isinstance(h, dict) else str(getattr(h, "content", ""))
                    tool_calls = h.get("tool_calls") if isinstance(h, dict) else getattr(h, "tool_calls", None)
                    if tool_calls and any(
                        (tc.get("name") if isinstance(tc, dict) else getattr(tc, "name", "")) == "lead_qualificado"
                        for tc in (tool_calls if isinstance(tool_calls, list) else [])
                    ):
                        is_already_qualified = True
                        break
                    if "Lead qualificado com sucesso" in content_str or "Operação 'lead_qualificado' concluída" in content_str:
                        is_already_qualified = True
                        break

            if has_qualification_funnel and not is_already_qualified:
                # Injeta a resposta aprovada do cache e permite que a IA formule a pergunta de qualificação do funil
                cache_qualification_block = (
                    f"\n\n# RESPOSTA OFICIAL PRÉ-APROVADA DO CACHE SEMÂNTICO PARA A DÚVIDA DO USUÁRIO:\n"
                    f"{resp_content}\n\n"
                    f"DIRETRIZ OBRIGATÓRIA:\n"
                    f"1. Utilize com fidelidade a resposta oficial acima para responder com exatidão à dúvida do usuário.\n"
                    f"2. Em seguida, na mesma resposta, avance para a próxima etapa pendente do Funil de Qualificação conduzindo o atendimento de forma natural e formulando a pergunta conforme o Objetivo / Prompt de Sondagem configurado no seu prompt."
                )
                pre_executed_rag_context = (pre_executed_rag_context or "") + cache_qualification_block
                if on_step:
                    on_step(
                        "⚡ Cache Semântico + Funil de Qualificação Ativo",
                        f"Hit ({sim_score*100:.1f}%). Resposta oficial do cache pré-carregada e IA acionada para engatar a próxima etapa do Funil de Sondagem."
                    )

                diag_matched_queries = [it.user_query for it in m_items] if (is_multi_hit and 'm_items' in locals() and m_items) else [cached_item.user_query]
                diag_matched_items = [{"id": it.id, "query": it.user_query, "response": it.approved_response} for it in m_items] if (is_multi_hit and 'm_items' in locals() and m_items) else [{"id": cached_item.id, "query": cached_item.user_query, "response": resp_content}]

                diag.update({
                    "status": "hit_qualification",
                    "status_label": "Hit + Funil de Qualificação Ativo",
                    "similarity": round(sim_score, 4),
                    "similarity_pct": f"{sim_score * 100:.1f}%",
                    "matched_id": cached_item.id,
                    "matched_query": cached_item.user_query,
                    "matched_queries": diag_matched_queries,
                    "matched_items": diag_matched_items,
                    "matched_response": resp_content,
                    "is_multi_hit": is_multi_hit,
                    "funnel_active": True,
                    "message": f"Hit com {sim_score*100:.1f}% de similaridade (Item #{cached_item.id}: \"{cached_item.user_query}\"). A Resposta Oficial foi injetada com fidelidade no contexto da IA para responder com precisão e avançar no Funil de Qualificação."
                })
                if return_diagnostics:
                    return None, pre_executed_rag_context, diag
                return None, pre_executed_rag_context

            if on_step:
                label = "⚡ Cache Semântico (Multi-Perguntas · Custo Zero)" if is_multi_hit else "⚡ Cache Semântico (Custo Zero)"
                on_step(label, f"Hit ({sim_score*100:.1f}%). Resposta entregue instantaneamente sem consumir tokens de LLM.")

            diag_matched_queries = [it.user_query for it in m_items] if (is_multi_hit and 'm_items' in locals() and m_items) else [cached_item.user_query]
            diag_matched_items = [{"id": it.id, "query": it.user_query, "response": it.approved_response} for it in m_items] if (is_multi_hit and 'm_items' in locals() and m_items) else [{"id": cached_item.id, "query": cached_item.user_query, "response": resp_content}]

            diag.update({
                "status": "hit_direct",
                "status_label": "Hit Direto (Custo Zero)",
                "similarity": round(sim_score, 4),
                "similarity_pct": f"{sim_score * 100:.1f}%",
                "matched_id": cached_item.id,
                "matched_query": cached_item.user_query,
                "matched_queries": diag_matched_queries,
                "matched_items": diag_matched_items,
                "matched_response": resp_content,
                "is_multi_hit": is_multi_hit,
                "funnel_active": False,
                "message": f"Hit com {sim_score*100:.1f}% de similaridade (Item #{cached_item.id}: \"{cached_item.user_query}\"). Resposta entregue instantaneamente a custo zero."
            })

            result_dict = {
                "content": resp_content,
                "model": "semantic-cache",
                "model_role": "semantic-cache",
                "usage": UsageLog(0, 0, 0, 0),
                "error": False,
                "from_semantic_cache": True,
                "cached_similarity": round(sim_score, 4),
                "cached_original_query": cached_item.user_query,
                "cached_id": cached_item.id,
                "matched_queries": diag_matched_queries,
                "semantic_cache": diag,
                "handoff_data": {"handoff": False, "destino": None, "motivo": None},
                "debug": {
                    "cache_hit": True,
                    "from_semantic_cache": True,
                    "model_role": "semantic-cache",
                    "similarity": round(sim_score, 4),
                    "cached_similarity": round(sim_score, 4),
                    "cached_similarity_pct": f"{sim_score * 100:.1f}%",
                    "cached_original_query": cached_item.user_query,
                    "matched_queries": diag_matched_queries,
                    "matched_items": diag_matched_items,
                    "cached_id": cached_item.id,
                    "threshold": cache_threshold,
                    "context_variables": context_variables,
                    "semantic_cache": diag
                }
            }
            # Se a resposta do cache contiver link/URL, atualiza e persiste a flag link_enviado
            if re.search(r'https?://[^\s]+', resp_content or ''):
                if context_variables:
                    context_variables["link_enviado"] = True
                sid = context_variables.get("session_id") if context_variables else None
                if db and sid:
                    try:
                        import inspect
                        from models import UserMemoryModel
                        stmt_l = select(UserMemoryModel).where(
                            UserMemoryModel.session_id == str(sid),
                            UserMemoryModel.key == "link_enviado"
                        )
                        res_raw = db.execute(stmt_l)
                        res_l = await res_raw if inspect.isawaitable(res_raw) else res_raw
                        mem_item = res_l.scalars().first() if hasattr(res_l, "scalars") else None
                        if mem_item:
                            mem_item.value = "True"
                        else:
                            db.add(UserMemoryModel(
                                session_id=str(sid),
                                key="link_enviado",
                                value="True",
                                source_message=message
                            ))
                        commit_raw = db.commit()
                        if inspect.isawaitable(commit_raw):
                            await commit_raw
                    except Exception as e_mem:
                        logger.warning(f"Erro ao persistir flag link_enviado no hit de cache: {e_mem}")

            if return_diagnostics:
                return result_dict, pre_executed_rag_context, diag
            return result_dict, pre_executed_rag_context

        # Caso Cache Miss
        closest_info = f" Maior similaridade: {sim_score*100:.1f}% (\"{best_cand.user_query}\")." if best_cand and sim_score > 0 else ""
        diag.update({
            "status": "miss",
            "status_label": "Consulta Sem Match",
            "similarity": round(sim_score, 4) if sim_score else 0.0,
            "similarity_pct": f"{sim_score * 100:.1f}%" if sim_score else "0.0%",
            "closest_candidate": best_cand.user_query if best_cand else None,
            "closest_similarity": round(sim_score, 4) if best_cand and sim_score else None,
            "closest_similarity_pct": f"{sim_score * 100:.1f}%" if best_cand and sim_score else None,
            "message": f"Cache consultado (limiar: {cache_threshold*100:.1f}%).{closest_info} Encaminhado para a Base de Conhecimento e modelo LLM."
        })

    except Exception as e_cache:
        logger.warning(f"⚠️ Erro ao consultar cache semântico em cache_handler.py: {e_cache}")
        diag.update({
            "status": "error",
            "status_label": "Erro na Consulta",
            "message": f"Erro durante consulta ao cache semântico: {str(e_cache)[:120]}"
        })

    if return_diagnostics:
        return None, pre_executed_rag_context, diag
    return None, pre_executed_rag_context
