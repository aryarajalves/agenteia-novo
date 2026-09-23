import os
import sys
import json
import logging
from sqlalchemy import text
from ..utils import build_project_assistant_prompt, execute_pre_rag_search

logger = logging.getLogger(__name__)


def _get_pipeline_attr(attr_name: str, default_val):
    """Obtém atributo de webhook_tasks.pipeline_ai se disponível para respeitar patches de testes."""
    pipe_mod = sys.modules.get("webhook_tasks.pipeline_ai")
    if pipe_mod and hasattr(pipe_mod, attr_name):
        return getattr(pipe_mod, attr_name)
    return default_val


async def prepare_and_pre_execute_stage(
    db,
    async_db,
    event,
    config,
    final_db_agent,
    final_agent_config,
    pre_router_result: dict,
    mensagem: str,
    history: list,
    session_id: str,
    event_id: int,
    partial_cache_items: list,
    cache_funnel_handled: bool
) -> tuple:
    """Configura ferramentas, assistente de projeto e executa RAG e ferramentas antecipadas."""
    import webhook_tasks

    fn_pre_rag = _get_pipeline_attr("execute_pre_rag_search", execute_pre_rag_search)
    fn_proj_prompt = _get_pipeline_attr("build_project_assistant_prompt", build_project_assistant_prompt)

    # 1. Modo Assistente de Projeto
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

    final_db_agent_tools = list(final_db_agent.tools) if final_db_agent.tools else []
    is_lead_already_qualified = False
    active_funnel_id = None
    if config and config.leads_table and event.telefone:
        try:
            check_q = await async_db.execute(
                text(f"SELECT respostas_qualificacao, active_qualification_funnel_id FROM {config.leads_table} WHERE telefone = :phone LIMIT 1"),
                {"phone": event.telefone}
            )
            q_row = check_q.fetchone()
            if q_row:
                if q_row[0] and str(q_row[0]).strip():
                    is_lead_already_qualified = True
                    logger.info(f"Lead {event.telefone} já qualificado anteriormente. Suprimindo ferramenta lead_qualificado.")
                if len(q_row) > 1 and q_row[1]:
                    active_funnel_id = str(q_row[1]).strip()
        except Exception as e_qual_check:
            logger.debug(f"Aviso ao checar qualificação prévia do lead: {e_qual_check}")

    if is_lead_already_qualified:
        final_db_agent_tools = [t for t in final_db_agent_tools if getattr(t, 'name', '') != 'lead_qualificado']

    if is_project_assistant:
        webhook_tasks._add_step(db, event_id, "⚙️ Modo Assistente de Projeto Ativo", "Injetando métricas reais e prompt customizado do projeto.")
        metrics = await webhook_tasks.get_project_assistant_context(async_db, config)
        final_agent_config.system_prompt = fn_proj_prompt(metrics)
        final_db_agent_tools = []

    raw_user_message = str(mensagem)
    extracted = pre_router_result.get("perguntas_extraidas")
    extracted_date = pre_router_result.get("data_extraida")
    
    rag_query = str(extracted) if extracted and str(extracted).strip() else raw_user_message

    if extracted_date:
        mensagem = f"[DATA EXTRAÍDA PELO SISTEMA: {extracted_date}]\n{raw_user_message}"
    else:
        mensagem = raw_user_message
        
    if extracted and str(extracted).strip() and str(extracted).strip() != raw_user_message:
        if pre_router_result.get("precisa_rag"):
            webhook_tasks._add_step(db, event_id, "🧹 Consulta RAG Alinhada", f"A pergunta para busca na Base de Conhecimento foi alinhada:\n\n**Mensagem Original:** \"{raw_user_message[:1000]}\"\n**Consulta para Busca:** \"{rag_query[:1000]}\"")
        else:
            webhook_tasks._add_step(db, event_id, "🧹 Mensagem Processada", f"Mensagem processada pelo Pre-Router: \"{rag_query[:1000]}\"")
    else:
        webhook_tasks._add_step(db, event_id, "🧹 Mensagem Mantida", f"Mensagem mantida para consulta: \"{mensagem[:1000]}\"")

    pre_executed_tool_calls = []
    pre_executed_rag_context = None
    
    # 2. Execução Antecipada de RAG
    has_all_resolved = bool(cache_funnel_handled or (partial_cache_items and len(partial_cache_items) >= len(pre_router_result.get("lista_perguntas_extraidas") or [1])))
    if pre_router_result.get("precisa_rag") and not has_all_resolved:
        pre_executed_rag_context = await fn_pre_rag(
            db=db, async_db=async_db, event_id=event_id,
            final_db_agent=final_db_agent, pre_router_result=pre_router_result, mensagem=rag_query
        )

    # Injeta respostas oficiais do Cache Semântico no contexto da IA
    if partial_cache_items:
        items_text = "\n".join([f"- Dúvida: {it.user_query}\n  Resposta Oficial Aprovada: {it.approved_response}" for it in partial_cache_items])
        inst = "Utilize com fidelidade a resposta oficial acima e formule a pergunta do Funil de Qualificação." if cache_funnel_handled else "Utilize as Respostas Oficiais acima para responder aos tópicos e complemente a dúvida restante."
        cache_context_block = f"\n\n# RESPOSTAS OFICIAIS PRÉ-APROVADAS DO CACHE SEMÂNTICO:\n{items_text}\n\nDIRETRIZ OBRIGATÓRIA:\n{inst}"
        pre_executed_rag_context = (pre_executed_rag_context or "") + cache_context_block

    # 3. Execução Antecipada de Ferramentas
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
            "active_qualification_funnel_id": active_funnel_id,
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

    return (
        final_db_agent_tools,
        pre_executed_tool_calls,
        pre_executed_rag_context,
        mensagem,
        raw_user_message,
        is_lead_already_qualified,
        active_funnel_id
    )
