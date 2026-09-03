from typing import Optional, Tuple
import json
import logging
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
    on_step: Optional[callable] = None
) -> Tuple[Optional[dict], Optional[str]]:
    """
    Verifica o Cache Semântico para perguntas únicas ou múltiplas.
    - Se houver match total: retorna (resultado_cache, pre_executed_rag_context).
    - Se houver match parcial: injeta as respostas oficiais no pre_executed_rag_context e retorna (None, pre_executed_rag_context).
    - Se não houver match: retorna (None, pre_executed_rag_context).
    """
    is_cache_enabled = getattr(config, 'semantic_cache_enabled', True)
    cache_threshold = getattr(config, 'semantic_cache_threshold', 0.92) or 0.92

    if not (is_cache_enabled and not image_url and not performed_tool_calls and not pre_executed_tool_calls and pre_executed_rag_context is None and db and getattr(config, 'id', None)):
        return None, pre_executed_rag_context

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
                res_tags = await db.execute(stmt_tags)
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

        cached_item, sim_score = await lookup_semantic_cache(
            db=db,
            agent_id=config.id,
            user_query=message,
            client_id=context_variables.get("client_id"),
            threshold=cache_threshold,
            is_followup=is_followup,
            active_product=active_prod
        )

        is_multi_hit = False
        resp_content = None

        if not cached_item:
            m_items, m_resp, m_sim, is_all = await lookup_multi_query_semantic_cache(
                db=db,
                agent_id=config.id,
                user_message=message,
                client_id=context_variables.get("client_id"),
                threshold=cache_threshold,
                is_followup=is_followup,
                active_product=active_prod
            )
            if is_all and m_items and m_resp:
                is_multi_hit = True
                cached_item = m_items[0]
                sim_score = m_sim
                resp_content = m_resp
            elif m_items:
                partial_block = "\n\n# RESPOSTAS OFICIAIS PRÉ-APROVADAS DO CACHE SEMÂNTICO:\n" + "\n".join([
                    f"- Dúvida: {it.user_query}\n  Resposta Oficial: {it.approved_response}" for it in m_items
                ]) + "\n\nIMPORTANTE: O usuário fez múltiplas perguntas. Utilize as Respostas Oficiais acima para os tópicos correspondentes e complemente respondendo com clareza à dúvida restante."
                pre_executed_rag_context = (pre_executed_rag_context or "") + partial_block
                if on_step:
                    on_step(f"⚡ Cache Semântico Parcial ({len(m_items)} Dúvidas Pré-Resolvidas)", "Respostas oficiais injetadas no contexto da IA.")

        if cached_item:
            resp_content = resp_content or cached_item.approved_response
            for k, v in context_variables.items():
                if v is not None and "{" + k + "}" in resp_content:
                    resp_content = resp_content.replace("{" + k + "}", str(v))

            resp_content = format_whatsapp_message(resp_content)

            # Verificar se o agente possui Funil de Qualificação ativo e o lead ainda não foi qualificado
            raw_qq = getattr(config, 'qualification_questions', None)
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
                return None, pre_executed_rag_context

            if on_step:
                label = "⚡ Cache Semântico (Multi-Perguntas · Custo Zero)" if is_multi_hit else "⚡ Cache Semântico (Custo Zero)"
                on_step(label, f"Hit ({sim_score*100:.1f}%). Resposta entregue instantaneamente sem consumir tokens de LLM.")

            return {
                "content": resp_content,
                "model": "semantic-cache",
                "usage": UsageLog(0, 0, 0, 0),
                "error": False,
                "from_semantic_cache": True,
                "cached_similarity": round(sim_score, 4),
                "cached_original_query": cached_item.user_query,
                "cached_id": cached_item.id,
                "handoff_data": {"handoff": False, "destino": None, "motivo": None},
                "debug": {
                    "cache_hit": True,
                    "from_semantic_cache": True,
                    "similarity": round(sim_score, 4),
                    "cached_similarity": round(sim_score, 4),
                    "cached_similarity_pct": f"{sim_score * 100:.1f}%",
                    "cached_original_query": cached_item.user_query,
                    "cached_id": cached_item.id,
                    "threshold": cache_threshold,
                    "context_variables": context_variables
                }
            }, pre_executed_rag_context

    except Exception as e_cache:
        logger.warning(f"⚠️ Erro ao consultar cache semântico em cache_handler.py: {e_cache}")

    return None, pre_executed_rag_context
