import json
import logging
import os
from core.timezone import get_now_br
from models import WebhookEventModel

logger = logging.getLogger(__name__)

def broadcast_status(webhook_id, event_id, status, steps=None):
    """Envia atualização de status e passos via WebSocket de forma segura para workers."""
    try:
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
        r.publish("websocket_broadcast", json.dumps(payload, default=str))
        r.close()
    except Exception as ws_err:
        logger.error(f"Erro ao disparar broadcast no worker: {ws_err}")


def _add_step(db, event_id: int, step: str, detail: str = "", metadata: dict = None):
    """Registra uma etapa de processamento no histórico do evento e emite broadcast."""
    event = db.query(WebhookEventModel).filter(WebhookEventModel.id == event_id).first()
    if not event:
        return
    steps = json.loads(event.processing_steps or "[]")
    step_entry = {
        "step": step,
        "detail": str(detail) if detail is not None else "",
        "timestamp": get_now_br().isoformat(),
    }
    if metadata:
        step_entry["metadata"] = metadata
        
    steps.append(step_entry)
    event.processing_steps = json.dumps(steps, default=str, ensure_ascii=False)
    db.commit()
    
    logger.info(f"📍 [Pipeline Event {event_id}] {step}: {str(detail)[:100]}...")
    broadcast_status(event.webhook_config_id, event.id, event.status, steps)


_typing_indicator_supported = True

def _toggle_typing_indicator(config, account_id, conversation_id, command="on"):
    """Envia o sinal de typing indicator (digitando) quando suportado."""
    import webhook_tasks
    global _typing_indicator_supported
    if not getattr(webhook_tasks, "_typing_indicator_supported", True):
        return
    try:
        import httpx
        url = getattr(config, "chatwoot_url", "") or getattr(config, "zapvoice_url", "")
        token = getattr(config, "chatwoot_api_token", "") or getattr(config, "zapvoice_api_token", "")
        if not url:
            return
        headers = {"api_access_token": token}
        endpoint = f"{str(url).rstrip('/')}/api/v1/accounts/{account_id}/conversations/{conversation_id}/toggle_typing_status"
        with httpx.Client(timeout=5.0) as client:
            resp = client.post(endpoint, json={"typing_status": command}, headers=headers)
            if resp.status_code == 404:
                webhook_tasks._typing_indicator_supported = False
                _typing_indicator_supported = False
    except Exception:
        pass


def _send_chatwoot_message(db, event_id, conversation_id=None, account_id=None, content="", config=None, split_paragraphs=False, delay=0, meta_data=None, total_cost=None, **kwargs):
    """Wrapper de compatibilidade para envio de mensagens com nomes de argumentos legados."""
    from webhook_services import _send_zapvoice_message
    cid = conversation_id if conversation_id is not None else kwargs.get("conversa_id")
    aid = account_id if account_id is not None else kwargs.get("conta_id")
    m_data = meta_data if meta_data is not None else kwargs.get("meta_data")
    t_cost = total_cost if total_cost is not None else kwargs.get("total_cost")
    return _send_zapvoice_message(db, event_id, cid, aid, content, config, split_paragraphs=split_paragraphs, delay=delay, meta_data=m_data, total_cost=t_cost)


def build_project_assistant_prompt(metrics: dict) -> str:
    """Monta o system prompt enriquecido para o modo Assistente de Projeto."""
    support_str = ""
    if metrics.get("support_requests"):
        for s in metrics["support_requests"]:
            support_str += f"- {s['nome']} ({s['telefone']} / {s['email']}) - Status: {s['status']} em {s['data']}\n"
    else:
        support_str = "Nenhum contato acionou o suporte humano esta semana.\n"
        
    leads_conversion_str = ""
    if metrics.get("leads_for_conversion"):
        for l in metrics["leads_for_conversion"]:
            leads_conversion_str += f"- Lead: {l['nome']} ({l['telefone']}) | Classificação: {l['classificacao']} | Justificativa: {l['justificativa']}\n"
    else:
        leads_conversion_str = "Sem leads recentes qualificados no banco para analisar.\n"

    return f"""Você é o Assistente de Projeto inteligente. Sua função é responder ao administrador/gestor sobre dados reais e métricas do projeto.

Suas capacidades e como você pode ajudar:
- Informar sobre leads gerados no mês.
- Informar sobre vendas registradas no mês e faturamento.
- Listar contatos que acionaram o suporte humano ao longo da semana.
- Propor melhorias na conversão com base nos leads qualificados recentes e suas justificativas/objeções.

Sempre que o usuário perguntar o que você pode fazer, como você pode ajudar, quem é você, ou termos similares, explique claramente essas quatro capacidades de forma amigável e profissional.

Dados Reais do Projeto (Métricas Atuais):
- Leads Gerados no Mês Atual: {metrics.get('leads_count', 0)} leads
- Vendas no Mês Atual: {metrics.get('sales_count', 0)} vendas (Total Faturado: R$ {metrics.get('sales_total', 0.0):.2f})
- Chamados de Suporte Humano na Semana (Últimos 7 dias):
{support_str}
Leads Qualificados Recentes para Análise de Conversão:
{leads_conversion_str}
Use essas informações para responder com precisão e clareza. Caso o usuário peça sugestões de melhoria de conversão, analise as justificativas e classificações dos leads fornecidos acima para propor melhorias acionáveis (ex: melhorar scripts, ajustar qualificação, focar em dores específicas dos leads frios/mornos). Responda sempre em Português do Brasil de forma executiva e direta.
"""


async def execute_pre_rag_search(db, async_db, event_id: int, final_db_agent, pre_router_result: dict, mensagem: str) -> str:
    """Executa a busca antecipada no RAG com sanitização e separação de múltiplas perguntas."""
    import re
    from rag_service import search_knowledge_base
    import webhook_tasks

    kb_ids = [kb.id for kb in getattr(final_db_agent, 'knowledge_bases', [])] or ([final_db_agent.knowledge_base_id] if getattr(final_db_agent, 'knowledge_base_id', None) else [])
    if not kb_ids:
        webhook_tasks._add_step(db, event_id, "⚠️ RAG Ignorado (Pre-Router)", f"A IA sinalizou que precisa de RAG, mas não há nenhuma base de conhecimento vinculada a este agente (ID: {final_db_agent.id}).")
        return None

    def _clean_rag_query(q: str) -> str:
        q = re.sub(r'\.{2,}', ' ', q)
        q = re.sub(r'\betc\.?\b', '', q, flags=re.IGNORECASE)
        q = re.sub(r'[,;:\s]+$', '', q.strip())
        q = re.sub(r'\s{2,}', ' ', q)
        return q.strip()

    perguntas_list = pre_router_result.get("lista_perguntas_extraidas")
    if not perguntas_list or not isinstance(perguntas_list, list) or not any(p.strip() for p in perguntas_list):
        pergunta_limpa = pre_router_result.get("perguntas_extraidas") or pre_router_result.get("mensagem_melhorada")
        if pergunta_limpa and str(pergunta_limpa).strip():
            perguntas_list = [str(pergunta_limpa).strip()]
        else:
            perguntas_list = [mensagem]

    perguntas_list = [_clean_rag_query(q) for q in perguntas_list if q and q.strip()]
    if not perguntas_list:
        perguntas_list = [mensagem]
        
    all_relevant_items = []
    for q_idx, query_item in enumerate(perguntas_list, 1):
        webhook_tasks._add_step(db, event_id, f"🔍 RAG - Pergunta {q_idx}", f"Consultando bases semânticas para a pergunta {q_idx}: \"{query_item}\"")
        
        rag_res = await search_knowledge_base(
            db=async_db,
            query=query_item,
            kb_ids=kb_ids,
            limit=getattr(final_db_agent, 'rag_retrieval_count', 3),
            similarity_threshold=getattr(final_db_agent, 'rag_relevance_threshold', 0.0) or 0.0,
            force_translation=getattr(final_db_agent, 'rag_translation_enabled', False),
            force_multi_query=getattr(final_db_agent, 'rag_multi_query_enabled', False),
            force_rerank=getattr(final_db_agent, 'rag_rerank_enabled', True),
            force_agentic_eval=getattr(final_db_agent, 'rag_agentic_eval_enabled', True),
            force_parent_expansion=getattr(final_db_agent, 'rag_parent_expansion_enabled', True),
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
            
        all_relevant_items.extend(relevant_items)
        
        _modules_block = ""
        if rag_usage and hasattr(rag_usage, 'applied_modules') and rag_usage.applied_modules:
            _modules_block = f"\n\n===MODULES_JSON===\n{json.dumps(rag_usage.applied_modules, ensure_ascii=False)}\n===END_MODULES==="

        if relevant_items:
            items_detail = ""
            for idx, item in enumerate(relevant_items, 1):
                rel_score = item.get("relevance_score", 0.0)
                pct_rel = f"{round(rel_score * 100, 1)}%" if rel_score else "N/A"
                items_detail += f"\n--- Item {idx} (Relevância: {pct_rel}) ---\nPerg: {item['question']}\nResp: {item['answer']}\n"
            
            discarded_detail = ""
            if discarded_items:
                discarded_detail = "\n\n❌ **Itens Descartados:**\n" + "\n".join([f"- **Perg:** \"{d['question']}\"\n  **Motivo:** {d.get('discard_reason', 'Relevância insuficiente.')}" for d in discarded_items])
                
            webhook_tasks._add_step(db, event_id, f"✅ RAG Resultados - Pergunta {q_idx}", f"Pergunta consultada: \"{query_item}\"\nRetornados {len(relevant_items)} itens relevantes:\n{items_detail}{discarded_detail}{_modules_block}")
        else:
            discarded_detail = ""
            if discarded_items:
                discarded_detail = "\n\n❌ **Itens Descartados:**\n" + "\n".join([f"- **Perg:** \"{d['question']}\"\n  **Motivo:** {d.get('discard_reason', 'Relevância insuficiente.')}" for d in discarded_items])
            webhook_tasks._add_step(db, event_id, f"ℹ️ RAG Sem Resultados - Pergunta {q_idx}", f"A busca para a pergunta \"{query_item}\" retornou 0 itens relevantes.{discarded_detail}{_modules_block}")
            
    if all_relevant_items:
        seen_ids = set()
        unique_relevant = []
        for item in all_relevant_items:
            if item["id"] not in seen_ids:
                unique_relevant.append(item)
                seen_ids.add(item["id"])
                
        return "\n\n# CONTEXTO RAG:\n" + "\n".join([f"Perg: {i['question']}\nResp: {i['answer']}" for i in unique_relevant])
    return None

