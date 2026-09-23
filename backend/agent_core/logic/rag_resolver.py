import re
import logging
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from models import AgentConfigModel

logger = logging.getLogger(__name__)


async def resolve_agent_kb_ids(cfg, database) -> list:
    """Resolve os IDs das Bases de Conhecimento vinculadas ao Agente, com fallback no banco."""
    raw_kbs = getattr(cfg, 'knowledge_bases', []) or []
    ids = []
    for kb in raw_kbs:
        if hasattr(kb, 'id') and kb.id:
            ids.append(kb.id)
        elif isinstance(kb, dict) and kb.get('id'):
            ids.append(kb['id'])
        elif isinstance(kb, int):
            ids.append(kb)
    if not ids and getattr(cfg, 'knowledge_base_ids', None):
        ids = [k for k in cfg.knowledge_base_ids if k]
    if not ids and getattr(cfg, 'knowledge_base_id', None):
        ids = [cfg.knowledge_base_id]
        
    # Fallback de integridade: consultar banco de dados caso config não traga os IDs na memória
    if not ids and database and getattr(cfg, 'id', None):
        try:
            stmt = select(AgentConfigModel).where(AgentConfigModel.id == cfg.id).options(selectinload(AgentConfigModel.knowledge_bases))
            res = await database.execute(stmt)
            db_ag = res.scalars().first()
            if db_ag:
                ids = [k.id for k in db_ag.knowledge_bases] or ([db_ag.knowledge_base_id] if db_ag.knowledge_base_id else [])
        except Exception as e:
            logger.error(f"Erro ao recuperar kb_ids do banco em rag_resolver.py: {e}")
    return ids


def clean_rag_query(q: str) -> str:
    """Remove ruídos comuns das queries antes de enviar ao banco vetorial."""
    q = re.sub(r'\.{2,}', ' ', q)
    q = re.sub(r'\betc\.?\b', '', q, flags=re.IGNORECASE)
    q = re.sub(r'[,;:\s]+$', '', q.strip())
    q = re.sub(r'\s{2,}', ' ', q)
    return q.strip()


async def resolve_rag_context(
    config,
    db,
    message: str,
    history: list,
    context_variables: dict,
    messages: list,
    pre_router_result: dict = None,
    pre_executed_rag_context: str = None,
    is_partial_cache: bool = False,
    cache_diagnostics: dict = None,
    on_step: callable = None
) -> dict:
    """Executa a busca agêntica no RAG ou integra contexto pré-executado/cache semântico."""
    rag_context = ""
    relevant_items = []
    mini_prompt_tokens = 0
    mini_completion_tokens = 0
    all_relevant = []
    
    kb_ids = await resolve_agent_kb_ids(config, db)

    # Identificar perguntas extraídas / enviadas para o RAG
    rag_queries = []
    rag_query_str = None
    if pre_router_result and pre_router_result.get("lista_perguntas_extraidas"):
        rag_queries = [p for p in pre_router_result.get("lista_perguntas_extraidas") if p and str(p).strip()]
    if not rag_queries and pre_router_result and (pre_router_result.get("perguntas_extraidas") or pre_router_result.get("mensagem_melhorada")):
        clean_q = pre_router_result.get("perguntas_extraidas") or pre_router_result.get("mensagem_melhorada")
        if clean_q and str(clean_q).strip():
            rag_queries = [str(clean_q).strip()]

    # Decisão do Pre-Router sobre RAG (se pre-router rodou, respeitamos sua decisão)
    is_rag_bypassed = False
    if is_partial_cache:
        is_rag_bypassed = False
    elif pre_router_result and "precisa_rag" in pre_router_result:
        is_rag_bypassed = not pre_router_result.get("precisa_rag")
    elif not pre_executed_rag_context and not kb_ids:
        is_rag_bypassed = True
    
    if pre_executed_rag_context:
        rag_context = pre_executed_rag_context
        messages[0]["content"] += rag_context
        if on_step:
            if is_partial_cache:
                on_step("⚡ Resposta Oficial do Cache Semântico (Parcial)", "Respostas oficiais de parte das dúvidas integradas ao prompt. Executando busca RAG para as dúvidas pendentes...")
            elif "RESPOSTA OFICIAL PRÉ-APROVADA DO CACHE SEMÂNTICO" in str(pre_executed_rag_context):
                on_step("⚡ Resposta Oficial do Cache Semântico", "Resposta oficial do Cache Semântico integrada ao prompt principal (Busca RAG dispensada).")
            else:
                on_step("📚 Consulta à Base de Conhecimento (RAG)", "RAG pré-executado integrado ao prompt principal.")

    should_run_rag = bool(db and kb_ids and (not is_rag_bypassed) and (not pre_executed_rag_context or is_partial_cache))

    if not should_run_rag:
        if (is_rag_bypassed or not kb_ids) and not pre_executed_rag_context:
            if on_step:
                on_step("📚 Consulta à Base de Conhecimento (RAG)", "Busca pulada pelo Pre-Router ou sem bases vinculadas ao agente.")
    else:
        if db and kb_ids:
            session_id = context_variables.get("session_id")
            if is_partial_cache:
                pending_qs = (cache_diagnostics or {}).get("pending_questions") or (cache_diagnostics or {}).get("unmatched_questions")
                if not pending_qs:
                    try:
                        from services.semantic_cache_service import extract_sub_questions_ai
                        all_sub = await extract_sub_questions_ai(message)
                        cached_q = str((cache_diagnostics or {}).get("matched_query") or "").lower()
                        pending_qs = [q for q in all_sub if q.lower() not in cached_q]
                    except Exception as e_pending:
                        logger.warning(f"Aviso ao extrair perguntas pendentes de fallback no RAG: {e_pending}")
                        pending_qs = []
                perguntas_list = [p for p in pending_qs if p and str(p).strip()] if pending_qs else [message]
            else:
                perguntas_list = pre_router_result.get("lista_perguntas_extraidas") if pre_router_result else None
                if not perguntas_list or not isinstance(perguntas_list, list) or not any(p.strip() for p in perguntas_list):
                    pergunta_limpa = (pre_router_result or {}).get("perguntas_extraidas") or (pre_router_result or {}).get("mensagem_melhorada")
                    if pergunta_limpa and str(pergunta_limpa).strip():
                        perguntas_list = [str(pergunta_limpa).strip()]
                    else:
                        perguntas_list = [message]
            
            # Limpar ruídos de cada query antes de enviar ao RAG
            perguntas_list = [clean_rag_query(q) for q in perguntas_list if q and q.strip()]
            if not perguntas_list:
                perguntas_list = [message]
            rag_queries = list(perguntas_list)
            rag_query_str = "\n".join(perguntas_list)
                
            from rag_service import search_knowledge_base

            # ROTEAMENTO AGÊNTICO DE BASES (KB ROUTING)
            if getattr(config, 'rag_kb_routing_enabled', False) and len(kb_ids) > 1:
                target_var_name = getattr(config, 'rag_kb_routing_variable', None)
                if db and session_id:
                    try:
                        from agent_core.memory import extract_target_variable_early
                        var_key, var_val = await extract_target_variable_early(
                            db=db, session_id=session_id, message=message, history=history,
                            target_key=target_var_name, on_step=on_step
                        )
                        if var_key and var_val:
                            context_variables[var_key] = var_val
                    except Exception as e_ext:
                        logger.warning(f"Aviso ao extrair variável antecipada no RAG: {e_ext}")

                try:
                    from models import KnowledgeBaseModel
                    stmt_kbs = select(KnowledgeBaseModel.id, KnowledgeBaseModel.name, KnowledgeBaseModel.description).where(KnowledgeBaseModel.id.in_(kb_ids))
                    res_kbs = await db.execute(stmt_kbs)
                    kbs_meta = [{"id": r[0], "name": r[1], "description": r[2]} for r in res_kbs.all()]

                    if kbs_meta:
                        from rag_service import route_knowledge_bases
                        routing_info = await route_knowledge_bases(
                            query=message,
                            available_kbs=kbs_meta,
                            context_variables=context_variables,
                            routing_var_name=target_var_name
                        )
                        if routing_info.get("selected_kb_ids"):
                            kb_ids = routing_info["selected_kb_ids"]
                            if on_step:
                                prod_str = routing_info.get("extracted_product") or "Geral"
                                base_str = routing_info.get("matched_kb_name") or f"Base ID {kb_ids}"
                                on_step("🎯 Roteamento Agêntico de Bases", f"Produto/Curso: '{prod_str}' ➔ Base direcionada: '{base_str}'. Motivo: {routing_info.get('reason')}")

                            if routing_info.get("is_ambiguous"):
                                messages[0]["content"] += "\n\n[DIRETRIZ DE AMBIGUIDADE]: O usuário fez uma pergunta genérica aplicável a mais de um curso/produto da empresa e não especificou a qual se refere. Responda de forma receptiva e pergunte educadamente sobre qual produto/curso ele gostaria de saber mais antes de detalhar um curso específico."
                except Exception as e_route:
                    logger.error(f"Erro no roteamento agêntico de bases em rag_resolver.py: {e_route}")

            for q_idx, query_item in enumerate(perguntas_list, 1):
                if on_step:
                    on_step("📚 Consulta à Base de Conhecimento (RAG)", f"Pergunta {q_idx}: Iniciando busca semântica para: \"{query_item}\"")
                
                rag_res = await search_knowledge_base(
                    db=db,
                    query=query_item,
                    kb_ids=kb_ids,
                    limit=getattr(config, 'rag_retrieval_count', 3),
                    similarity_threshold=getattr(config, 'rag_relevance_threshold', 0.0) or 0.0,
                    force_translation=getattr(config, 'rag_translation_enabled', False),
                    force_multi_query=getattr(config, 'rag_multi_query_enabled', True),
                    force_rerank=getattr(config, 'rag_rerank_enabled', True),
                    force_agentic_eval=getattr(config, 'rag_agentic_eval_enabled', True),
                    force_parent_expansion=getattr(config, 'rag_parent_expansion_enabled', False),
                )
                
                relevant_items = []
                discarded_items = []
                rag_usage = None
                if isinstance(rag_res, tuple) and len(rag_res) == 3:
                    relevant_items, discarded_items, rag_usage = rag_res
                elif isinstance(rag_res, tuple) and len(rag_res) == 2:
                    relevant_items, rag_usage = rag_res
                else:
                    relevant_items = rag_res or []
                    
                if rag_usage:
                    mini_prompt_tokens += getattr(rag_usage, 'prompt_tokens', 0)
                    mini_completion_tokens += getattr(rag_usage, 'completion_tokens', 0)
                    
                all_relevant.extend(relevant_items)
                
                if on_step:
                    if relevant_items:
                        items_detail = ""
                        for idx, item in enumerate(relevant_items, 1):
                            if isinstance(item, dict):
                                rel_score = item.get("relevance_score", 0.0)
                                pct_rel = f"{round(rel_score * 100, 1)}%" if rel_score else "N/A"
                                items_detail += f"\n--- Item {idx} (Relevância: {pct_rel}) ---\nPerg: {item.get('question', '')}\nResp: {item.get('answer', '')}\n"
                            else:
                                items_detail += f"\n--- Item {idx} ---\n{str(item)}\n"
                        
                        discarded_detail = ""
                        if discarded_items:
                            discarded_detail = "\n\n❌ Itens Descartados:\n" + "\n".join([f"- Perg: \"{d.get('question', '') if isinstance(d, dict) else str(d)}\"\n  Motivo: {d.get('discard_reason', 'Baixa similaridade semântica.') if isinstance(d, dict) else 'Descartado'}" for d in discarded_items])
                        
                        on_step("📚 Consulta à Base de Conhecimento (RAG)", f"Sucesso! Encontrados {len(relevant_items)} itens para a Pergunta {q_idx}:\n{items_detail}{discarded_detail}")
                    else:
                        discarded_detail = ""
                        if discarded_items:
                            discarded_detail = "\n\n❌ Itens Descartados:\n" + "\n".join([f"- Perg: \"{d.get('question', '') if isinstance(d, dict) else str(d)}\"\n  Motivo: {d.get('discard_reason', 'Baixa similaridade semântica.') if isinstance(d, dict) else 'Descartado'}" for d in discarded_items])
                        on_step("📚 Consulta à Base de Conhecimento (RAG)", f"Nenhum conhecimento relevante encontrado para a Pergunta {q_idx}. Módulos aplicados: {getattr(rag_usage, 'applied_modules', {}) if rag_usage else {}}{discarded_detail}")
            
            if all_relevant:
                seen = set()
                unique_relevant = []
                for it in all_relevant:
                    it_id = it.get("id") if isinstance(it, dict) and "id" in it else id(it)
                    if it_id not in seen:
                        unique_relevant.append(it)
                        seen.add(it_id)
                
                header_title = "# INFORMAÇÕES DA BASE DE CONHECIMENTO (RAG) PARA AS DÚVIDAS RESTANTES:" if is_partial_cache else "# CONTEXTO RAG:"
                formatted_lines = []
                for i in unique_relevant:
                    if isinstance(i, dict):
                        formatted_lines.append(f"Perg: {i.get('question', '')}\nResp: {i.get('answer', '')}")
                    else:
                        formatted_lines.append(str(i))
                rag_block = f"\n\n{header_title}\n" + "\n".join(formatted_lines)
                rag_context = (rag_context or "") + rag_block
                messages[0]["content"] += rag_block

    return {
        "rag_context": rag_context,
        "rag_queries": rag_queries,
        "rag_query_str": rag_query_str,
        "all_relevant": all_relevant,
        "mini_prompt_tokens": mini_prompt_tokens,
        "mini_completion_tokens": mini_completion_tokens
    }
