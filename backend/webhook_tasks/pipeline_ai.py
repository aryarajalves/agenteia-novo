import json
import logging
from datetime import datetime, timezone
from sqlalchemy import select
from models import AgentConfigModel
from core.timezone import get_now_utc

from .utils import (
    build_project_assistant_prompt,
    execute_pre_rag_search,
    is_user_answering_assistant_question
)
from .pipeline.cache_stage import check_semantic_cache_stage
from .pipeline.prerouter_stage import execute_prerouter_stage
from .pipeline.pre_execution_stage import prepare_and_pre_execute_stage

logger = logging.getLogger(__name__)

__all__ = [
    "execute_agent_pipeline",
    "build_project_assistant_prompt",
    "execute_pre_rag_search",
    "is_user_answering_assistant_question"
]


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

    # 3. CONSULTA AO CACHE SEMÂNTICO
    is_cache_terminal, cache_terminal_result, partial_cache_items, cache_funnel_handled = await check_semantic_cache_stage(
        db=db,
        async_db=async_db,
        event=event,
        db_agent=db_agent,
        mensagem=mensagem,
        history=history,
        session_id=session_id,
        event_id=event_id,
        is_simulated=is_simulated
    )
    if is_cache_terminal:
        return cache_terminal_result

    # 4. EXECUÇÃO DO PRE-ROUTER & ATALHOS
    is_multi_hit = len(partial_cache_items) > 1 if partial_cache_items else False
    is_pr_terminal, pr_terminal_result, pre_router_result, final_db_agent, final_agent_config, mensagem = await execute_prerouter_stage(
        db=db,
        async_db=async_db,
        event=event,
        config=config,
        db_agent=db_agent,
        agent_config=agent_config,
        secondary_agents=secondary_agents,
        mensagem=mensagem,
        history=history,
        session_id=session_id,
        lead_internal_id=lead_internal_id,
        event_id=event_id,
        is_simulated=is_simulated,
        cache_funnel_handled=cache_funnel_handled,
        multi_matched_items=partial_cache_items,
        is_multi_hit=is_multi_hit
    )
    if is_pr_terminal:
        return pr_terminal_result

    # 5. PREPARAÇÃO, RAG ANTECIPADO E EXECUÇÃO DE FERRAMENTAS
    (
        final_db_agent_tools,
        pre_executed_tool_calls,
        pre_executed_rag_context,
        mensagem,
        raw_user_message,
        is_lead_already_qualified,
        active_funnel_id
    ) = await prepare_and_pre_execute_stage(
        db=db,
        async_db=async_db,
        event=event,
        config=config,
        final_db_agent=final_db_agent,
        final_agent_config=final_agent_config,
        pre_router_result=pre_router_result,
        mensagem=mensagem,
        history=history,
        session_id=session_id,
        event_id=event_id,
        partial_cache_items=partial_cache_items,
        cache_funnel_handled=cache_funnel_handled
    )

    # 6. CHAMADA AO MODELO PRINCIPAL (OU MOCK)
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
        funnel_notice = "\n• **Contexto Integrado:** Resposta oficial do Cache Semântico pré-injetada + formulação da pergunta do Funil de Qualificação." if partial_cache_items else ""
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
                "dias_desde_criacao": dias_desde_criacao,
                "lead_already_qualified": is_lead_already_qualified,
                "active_qualification_funnel_id": active_funnel_id,
                "raw_user_message": raw_user_message
            },
            db=async_db,
            image_url=image_url,
            on_step=lambda step, detail, metadata=None: webhook_tasks._add_step(db, event_id, step, detail, metadata=metadata),
            pre_executed_tool_calls=pre_executed_tool_calls,
            pre_executed_rag_context=pre_executed_rag_context
        )
    
    # 7. AGREGAÇÃO DE TOKENS E CONSUMO
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
