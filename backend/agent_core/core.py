import json
import os
import re
import httpx
import logging
from datetime import datetime, timedelta, timezone
from sqlalchemy.ext.asyncio import AsyncSession

from sqlalchemy import select
from sqlalchemy.orm import selectinload
from models import AgentConfigModel

from .clients import get_openai_client, get_anthropic_client
from .models.usage import UsageLog
from .utils import INTERNAL_CTX_KEYS, sanitize_phone_number, format_whatsapp_message
from .logic.classification import classify_message_complexity
from .logic.substitution import resolve_conditional_blocks
from .logic.history import generate_handoff_summary
from .logic.pre_router import run_pre_router_ai
from .logic.cache_handler import handle_semantic_cache_check
from .logic.question_funnel_handler import handle_question_funnel_check
from .logic.tool_preparer import prepare_agent_tools
from .security import verify_output_safety, validate_response_ai
from .memory import fetch_user_memory, update_user_memory
from .tools.handlers.chatwoot import handle_chatwoot_handoff
from .tools.handlers.internal import handle_date_calculator, handle_unanswered_question, handle_lead_qualified
from .tools.handlers.google import handle_google_calendar

logger = logging.getLogger(__name__)

def format_ai_error_message(e: Exception, provider: str = "OpenAI") -> str:
    """Transforma exceções do provedor de IA em mensagens explícitas em português."""
    err_str = str(e)
    err_lower = err_str.lower()
    
    if "insufficient_quota" in err_lower or "credit_balance_exhausted" in err_lower or "429" in err_str and "credit" in err_lower:
        return f"❌ Erro na {provider}: Saldo de créditos esgotado (insufficient_quota / credit_balance_exhausted). Adicione créditos no painel da {provider}."
    elif "rate_limit_exceeded" in err_lower or "429" in err_str:
        return f"❌ Erro na {provider}: Limite de requisições excedido (Rate Limit Exceeded / 429). Aguarde alguns instantes."
    elif "invalid_api_key" in err_lower or "incorrect api key" in err_lower or "401" in err_str:
        return f"❌ Erro na {provider}: Chave de API inválida ou não configurada (401 Unauthorized)."
    elif "model_not_found" in err_lower or "does not exist" in err_lower or "404" in err_str:
        return f"❌ Erro na {provider}: O modelo de IA solicitado não existe ou não está disponível para esta conta."
    elif "context_length_exceeded" in err_lower or "maximum context length" in err_lower:
        return f"❌ Erro na {provider}: O tamanho do contexto da conversa excedeu o limite do modelo."
    else:
        # Extrair mensagem se for dict ou string limpa
        clean_msg = err_str[:250]
        return f"❌ Erro na {provider}: {clean_msg}"


async def process_message(
    message: str, history: list, config, tools: list = None, 
    context_variables: dict = None, db: AsyncSession = None,
    performed_tool_calls: list = None, image_url: str = None,
    on_step: callable = None,
    pre_executed_tool_calls: list = None,
    pre_executed_rag_context: str = None
):
    active_role = "main"
    context_variables = context_variables or {}
    
    # Injetar variáveis temporais do dia atual e hora atual em Brasília
    from core.timezone import get_now_br
    now_br = get_now_br()
    dias_semana_portugues = ["segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado", "domingo"]
    
    if "dia_semana" not in context_variables or context_variables["dia_semana"] is None:
        context_variables["dia_semana"] = dias_semana_portugues[now_br.weekday()]
    if "data_atual" not in context_variables or context_variables["data_atual"] is None:
        context_variables["data_atual"] = now_br.strftime("%Y-%m-%d")
    if "hora_atual" not in context_variables or context_variables["hora_atual"] is None:
        context_variables["hora_atual"] = now_br.strftime("%H:%M")

    # Mesclar variáveis de contexto extraídas pela IA da memória (user_memory)
    session_id = context_variables.get("session_id")
    if db and session_id:
        try:
            from sqlalchemy import select
            from models import GlobalContextVariableModel, UserMemoryModel
            # 1. Carregar variáveis que usam extração por IA
            stmt_vars = select(GlobalContextVariableModel).where(GlobalContextVariableModel.extraction_method == "ai")
            if isinstance(db, AsyncSession):
                res_vars = await db.execute(stmt_vars)
            else:
                res_vars = db.execute(stmt_vars)
            ai_vars = res_vars.scalars().all()
            
            if ai_vars:
                ai_keys = [v.key for v in ai_vars]
                # 2. Buscar na memória se há valor salvo para essas chaves específicas do contato
                stmt_mem = select(UserMemoryModel).where(
                    UserMemoryModel.session_id == str(session_id),
                    UserMemoryModel.key.in_(ai_keys)
                )
                if isinstance(db, AsyncSession):
                    res_mem = await db.execute(stmt_mem)
                else:
                    res_mem = db.execute(stmt_mem)
                memories = res_mem.scalars().all()
                
                # Criar um dicionário das memórias existentes
                mem_dict = {m.key: m.value for m in memories}
                
                # 3. Preencher no context_variables
                for v in ai_vars:
                    # Se tiver na memória, usa o da memória
                    if v.key in mem_dict and mem_dict[v.key] is not None:
                        context_variables[v.key] = mem_dict[v.key]
                    # Caso contrário, usa o valor padrão inicial como fallback
                    elif v.key not in context_variables or context_variables[v.key] is None:
                        context_variables[v.key] = v.value
        except Exception as e_ctx:
            print(f"⚠️ Erro ao mesclar variáveis de contexto da memória: {e_ctx}")

    performed_tool_calls = performed_tool_calls if performed_tool_calls is not None else []
    
    # 0.05 FUNIL DE CONVERSÃO POR DÚVIDA (ÁUDIO HUMANIZADO + PASSOS SEQUENCIAIS)
    funnel_res, _ = await handle_question_funnel_check(
        config=config, message=message, history=history, context_variables=context_variables,
        db=db, image_url=image_url, performed_tool_calls=performed_tool_calls,
        pre_executed_tool_calls=pre_executed_tool_calls, pre_executed_rag_context=pre_executed_rag_context,
        on_step=on_step, return_diagnostics=True
    )
    if funnel_res:
        return funnel_res

    # 0.1 CACHE SEMÂNTICO DE RESPOSTAS APROVADAS (CUSTO ZERO OU PARCIAL)
    cache_result, pre_executed_rag_context, cache_diagnostics = await handle_semantic_cache_check(
        config=config,
        message=message,
        history=history,
        context_variables=context_variables,
        db=db,
        image_url=image_url,
        performed_tool_calls=performed_tool_calls,
        pre_executed_tool_calls=pre_executed_tool_calls,
        pre_executed_rag_context=pre_executed_rag_context,
        on_step=on_step,
        return_diagnostics=True
    )
    if cache_result:
        return cache_result

    pre_router_tokens = {"prompt": 0, "completion": 0, "model": None}
    pre_router_result = {}

    # 0. Pre-Router (Saudação, Triagem e Datas)
    # Se não houver histórico, ou se for uma mensagem curta, rodamos o Pre-Router
    # Exceto se for imagem, ou se as ferramentas/RAG já foram pré-executados
    if not image_url and not performed_tool_calls and not pre_executed_tool_calls and pre_executed_rag_context is None:
        try:
            # Precisamos dos agentes secundários para o roteamento (opcional no playground)
            # Por enquanto, focamos em Saudações e Datas
            pre_router_result = await run_pre_router_ai(message, history, config, context_variables=context_variables, db=db)
            
            if pre_router_result.get("eh_agradecimento_recorrente") or (pre_router_result.get("eh_agradecimento") and pre_router_result.get("resposta_direta") is None and not pre_router_result.get("perguntas_extraidas")):
                usage = pre_router_result.get("_usage", {})
                if on_step:
                    on_step("🤫 Automação Silenciada (Agradecimento Recorrente)", "2º agradecimento/encerramento consecutivo do usuário detectado. Nenhuma mensagem será enviada para evitar loop.")
                return {
                    "content": None,
                    "model": pre_router_result.get("_model_used", "pre-router"),
                    "model_role": "pre-router",
                    "usage": UsageLog(
                        mp=usage.get("prompt_tokens", 0),
                        mc=usage.get("completion_tokens", 0)
                    ),
                    "error": False,
                    "ignored_recurrent_thanks": True,
                    "semantic_cache": cache_diagnostics,
                    "debug": {"pre_router": pre_router_result, "semantic_cache": cache_diagnostics, "model_role": "pre-router"}
                }

            # Se for atalho direto ou saudação com resposta direta, encerramos aqui com a resposta configurada (exceto se on_step for fornecido para pipeline logs)
            if (pre_router_result.get("eh_saudacao") or pre_router_result.get("_model_used") == "shortcut-logic") and pre_router_result.get("resposta_direta") and not on_step:
                usage = pre_router_result.get("_usage", {})
                return {
                    "content": pre_router_result.get("resposta_direta"),
                    "model": pre_router_result.get("_model_used", "pre-router"),
                    "model_role": "pre-router",
                    "usage": UsageLog(
                        mp=usage.get("prompt_tokens", 0),
                        mc=usage.get("completion_tokens", 0)
                    ),
                    "error": False,
                    "semantic_cache": cache_diagnostics,
                    "debug": {"pre_router": pre_router_result, "semantic_cache": cache_diagnostics, "model_role": "pre-router"}
                }
            
            # Atualizar tokens gastos no roteamento
            pr_usage = pre_router_result.get("_usage", {})
            pre_router_tokens["prompt"] = pr_usage.get("prompt_tokens", 0)
            pre_router_tokens["completion"] = pr_usage.get("completion_tokens", 0)
            pre_router_tokens["model"] = pre_router_result.get("_model_used")  # Guarda modelo real do pre-router

            # Injetar data extraída no contexto
            if pre_router_result.get("data_extraida"):
                context_variables["data_extraida"] = pre_router_result["data_extraida"]
            
            # Usar a pergunta limpa/extraída para RAG/roteamento se disponível
            if pre_router_result.get("perguntas_extraidas"):
                original_msg = message
                message = pre_router_result["perguntas_extraidas"]
                
                # Se a mensagem foi alterada (Enriquecida ou Limpa pelo Pre-Router)
                if original_msg != message and on_step:
                    on_step("🧹 Melhoria de Mensagem (Pre-Router)", f"Pergunta isolada para busca pelo Pre-Router (mensagem integral preservada para o agente).\nAntes: \"{original_msg}\"\nDepois: \"{message}\"")
                
        except Exception as e_pr:
            import traceback
            print(f"❌ ERRO CRÍTICO NO PRE-ROUTER (core.py): {str(e_pr)}")
            traceback.print_exc()
            logger.error(f"Erro no Pre-Router (core): {e_pr}")

    is_partial_cache = bool((cache_diagnostics or {}).get("status") == "partial_hit")

    # 1. Cost Router
    if getattr(config, 'router_enabled', False):
        has_cache_resolved = bool(pre_executed_rag_context and "RESPOSTA OFICIAL PRÉ-APROVADA DO CACHE SEMÂNTICO" in pre_executed_rag_context and not is_partial_cache)
        
        if has_cache_resolved:
            complexity = "SIMPLE"
            active_role = "router_simple"
            config.model = getattr(config, 'router_simple_model', None) or config.model
        else:
            complexity = "COMPLEX" if image_url else await classify_message_complexity(message, config, history)
            active_role = "router_simple" if complexity == "SIMPLE" else "router_complex"
            
            # Seleção de modelo baseada no papel (Role) e complexidade
            if complexity == "SIMPLE":
                config.model = getattr(config, 'router_simple_model', None) or config.model
            else:
                # Para perguntas complexas sem cache, usamos o router_complex_model configurado
                config.model = getattr(config, 'router_complex_model', None) or config.model
            
        print(f"🚀 [ROTEAMENTO DE CUSTO] Complexidade: {complexity}. Modelo selecionado: {config.model} (Papel: {active_role})")

    executed_model = config.model
    executed_role = active_role

    # 2. Context Window - Unificada globalmente para 5 mensagens por padrão (ou o configurado globalmente)
    target_window = config.context_window or 5
    if history and len(history) > (target_window * 2):
        history = history[-(target_window * 2):]

    client = get_openai_client(config.model)
    if not client: return {"content": "Erro: API Key não configurada.", "error": True}

    # 3. System Prompt & Variable Injection
    system_prompt = config.system_prompt
    if system_prompt:
        # Remove any Markdown heading hashes (#, ##, ###, etc.) at the start of lines to avoid AI confusion
        system_prompt = re.sub(r'(?m)^[ \t]*#+[ \t]*', '', system_prompt)
    from .logic.strict_rules_prompt import get_core_system_prompt_rules, get_strict_rules_prompt
    system_prompt += get_core_system_prompt_rules()
    system_prompt = resolve_conditional_blocks(system_prompt, context_variables)
    for k, v in context_variables.items():
        system_prompt = system_prompt.replace("{" + k + "}", str(v) if v is not None else "")
    
    # Injeta a parte dinâmica do prompt (Prompt Caching garantido por vir após a parte estática inicial)
    dynamic_prompt = getattr(config, 'dynamic_prompt', '') or ''
    if dynamic_prompt:
        dynamic_prompt = resolve_conditional_blocks(dynamic_prompt, context_variables)
        for k, v in context_variables.items():
            dynamic_prompt = dynamic_prompt.replace("{" + k + "}", str(v) if v is not None else "")
        system_prompt += f"\n\n### DIRETRIZES E REGRAS DINÂMICAS DO AGENTE:\n{dynamic_prompt}"
    
    # --- INJEÇÃO DE CONTEXTO TÉCNICO PARA FERRAMENTAS ---
    if context_variables:
        tech_context = "\n\n# CONTEXTO TÉCNICO (Use para preencher parâmetros de ferramentas):\n"
        has_tech_context = False
        for key in ["account_id", "conversation_id", "contact_phone", "contact_name", "webhook_config_id"]:
            if key in context_variables and context_variables[key]:
                tech_context += f"- {key}: {context_variables[key]}\n"
                has_tech_context = True
        
    # --- REGRAS RÍGIDAS DE INTEGRIDADE (CONTRA ALUCINAÇÃO) ---
    system_prompt += get_strict_rules_prompt()

    # --- DIRETRIZ PERSONALIZADA DE RESPOSTA PARA registrar_duvida_sem_resposta ---
    custom_unanswered_prompt = getattr(config, 'unanswered_question_prompt', None)
    if custom_unanswered_prompt and str(custom_unanswered_prompt).strip():
        system_prompt += f"\n\n### 📝 DIRETRIZ PERSONALIZADA DE RESPOSTA AO REGISTRAR DÚVIDA:\nQuando você acionar a ferramenta `registrar_duvida_sem_resposta`, você DEVE OBRIGATORIAMENTE seguir esta instrução para formular sua resposta ao cliente:\n\"{str(custom_unanswered_prompt).strip()}\"\n"

    # --- INJEÇÃO DE PERGUNTAS DE QUALIFICAÇÃO DE LEAD & SONDAÇÃO ESTRATÉGICA ---
    is_already_qualified = bool(context_variables.get("lead_already_qualified"))
    has_lead_qualified = (any(getattr(t, "name", "") == "lead_qualificado" for t in tools) if tools else False) and not is_already_qualified
    from .logic.qualification_prompt import build_qualification_prompt
    qual_prompt_text = build_qualification_prompt(config, tools, context_variables, history=history)
    if qual_prompt_text:
        system_prompt += qual_prompt_text

    # --- INJEÇÃO DE DIRETRIZES DE SEGURANÇA E COMPORTAMENTO (PROATIVA) ---
    security_rules = ""
    lang_complexity = getattr(config, 'security_language_complexity', 'standard') or 'standard'
    if lang_complexity == 'simple':
        security_rules += "\n- **Estilo de Linguagem Simples (OBRIGATÓRIO):** Use respostas curtas, linguagem muito simples, clara e sem jargões técnicos ou comerciais complexos."
    elif lang_complexity == 'technical':
        security_rules += "\n- **Estilo de Linguagem Técnico (OBRIGATÓRIO):** Use respostas precisas, formais, completas e termos técnicos adequados."
    elif lang_complexity == 'standard':
        security_rules += "\n- **Estilo de Linguagem Padrão (OBRIGATÓRIO):** Escreva de forma natural, coloquial, amigável e fluida."

    forbidden_topics = getattr(config, 'security_forbidden_topics', None)
    if forbidden_topics:
        security_rules += f"\n- **TÓPICOS PROIBIDOS (NÃO FALE SOBRE ISSO):** Você está expressamente proibido de discutir, responder ou comentar sobre os seguintes temas: {forbidden_topics}. Caso o usuário pergunte algo sobre esses temas, desvie educadamente ou diga que não pode ajudar com esse assunto específico."

    competitor_blacklist = getattr(config, 'security_competitor_blacklist', None)
    if competitor_blacklist:
        security_rules += f"\n- **CONCORRENTES PROIBIDOS (BLACKLIST):** É estritamente proibido citar, comparar ou validar os seguintes concorrentes: {competitor_blacklist}. Se o usuário mencionar algum deles, ignore a menção, mude de assunto ou foque exclusivamente nos nossos diferenciais, sem pronunciar ou confirmar o nome do concorrente."

    discount_policy = getattr(config, 'security_discount_policy', None)
    if discount_policy:
        security_rules += f"\n- **POLÍTICA DE DESCONTOS (REGRAS RÍGIDAS DE PRECIFICAÇÃO):** Você deve seguir rigorosamente a seguinte regra para descontos ou condições especiais: {discount_policy}. NUNCA ofereça, confirme ou invente qualquer desconto ou condição que viole ou não esteja prevista nesta política."

    if security_rules:
        system_prompt += "\n\n### DIRETRIZES DE SEGURANÇA E ESTILO (SEGUIR À RISCA):\n" + security_rules

    messages = [{"role": "system", "content": system_prompt}]

    # 4. Memory & RAG & Dates (Simplified for brevity in core)
    session_id = context_variables.get("session_id")
    if db and session_id:
        # Obter fatos e variáveis estruturadas da memória de longo prazo
        mem = await fetch_user_memory(db, session_id)
        
        if mem:
            messages.insert(1, {"role": "system", "content": f"INFORMAÇÃO CRUCIAL:\n{mem}"})

    # (RAG Logic would go here - keeping it or moving to rag_service.py)
    # For now, let's assume RAG is handled or injected. 
    # I'll keep the RAG logic from the original file for functional parity.
    
    # --- RAG Logic ---
    rag_context = ""
    relevant_items = []
    rag_usage = None
    mini_prompt_tokens = 0
    mini_completion_tokens = 0
    main_prompt_tokens = 0
    main_completion_tokens = 0
    
    # Resolução robusta dos IDs das Bases de Conhecimento vinculadas ao Agente
    async def _resolve_agent_kb_ids(cfg, database):
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
                logger.error(f"Erro ao recuperar kb_ids do banco em core.py: {e}")
        return ids

    kb_ids = await _resolve_agent_kb_ids(config, db)

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
                on_step("📚 Consulta à Base de Conhecimento (RAG)", f"RAG pré-executado integrado ao prompt principal.")

    should_run_rag = bool(db and kb_ids and (not is_rag_bypassed) and (not pre_executed_rag_context or is_partial_cache))

    if not should_run_rag:
        if (is_rag_bypassed or not kb_ids) and not pre_executed_rag_context:
            if on_step:
                on_step("📚 Consulta à Base de Conhecimento (RAG)", "Busca pulada pelo Pre-Router ou sem bases vinculadas ao agente.")
    else:
        if db and kb_ids:
            import re as _re
            def _clean_rag_query(q: str) -> str:
                """Remove ruídos comuns das queries antes de enviar ao banco vetorial."""
                q = _re.sub(r'\.{2,}', ' ', q)
                q = _re.sub(r'\betc\.?\b', '', q, flags=_re.IGNORECASE)
                q = _re.sub(r'[,;:\s]+$', '', q.strip())
                q = _re.sub(r'\s{2,}', ' ', q)
                return q.strip()

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
            perguntas_list = [_clean_rag_query(q) for q in perguntas_list if q and q.strip()]
            if not perguntas_list:
                perguntas_list = [message]
            rag_queries = list(perguntas_list)
            rag_query_str = "\n".join(perguntas_list)
                
            all_relevant = []
            from rag_service import search_knowledge_base

            # ROTEAMENTO AGÊNTICO DE BASES (KB ROUTING)
            if getattr(config, 'rag_kb_routing_enabled', False) and len(kb_ids) > 1:
                target_var_name = getattr(config, 'rag_kb_routing_variable', None)
                # 1. Extração antecipada da variável de produto/curso se ainda não preenchida
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

                # 2. Obter metadados das bases vinculadas para seleção semântica
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
                    logger.error(f"Erro no roteamento agêntico de bases em core.py: {e_route}")

            for q_idx, query_item in enumerate(perguntas_list, 1):
                if on_step:
                    on_step("📚 Consulta à Base de Conhecimento (RAG)", f"Pergunta {q_idx}: Iniciando busca semântica para: \"{query_item}\"")
                
                rag_res = await search_knowledge_base(
                    db=db,
                    query=query_item,
                    kb_ids=kb_ids,
                    limit=getattr(config, 'rag_retrieval_count', 3),
                    similarity_threshold=getattr(config, 'rag_relevance_threshold', 0.0) or 0.0,
                    # Passa as configs do agente explicitamente — sem agent_id a função usaria os defaults (multi_query=False, etc.)
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
                            rel_score = item.get("relevance_score", 0.0)
                            pct_rel = f"{round(rel_score * 100, 1)}%" if rel_score else "N/A"
                            items_detail += f"\n--- Item {idx} (Relevância: {pct_rel}) ---\nPerg: {item['question']}\nResp: {item['answer']}\n"
                        
                        discarded_detail = ""
                        if discarded_items:
                            discarded_detail = "\n\n❌ Itens Descartados:\n" + "\n".join([f"- Perg: \"{d['question']}\"\n  Motivo: {d.get('discard_reason', 'Baixa similaridade semântica.')}" for d in discarded_items])
                        
                        on_step("📚 Consulta à Base de Conhecimento (RAG)", f"Sucesso! Encontrados {len(relevant_items)} itens para a Pergunta {q_idx}:\n{items_detail}{discarded_detail}")
                    else:
                        discarded_detail = ""
                        if discarded_items:
                            discarded_detail = "\n\n❌ Itens Descartados:\n" + "\n".join([f"- Perg: \"{d['question']}\"\n  Motivo: {d.get('discard_reason', 'Baixa similaridade semântica.')}" for d in discarded_items])
                        on_step("📚 Consulta à Base de Conhecimento (RAG)", f"Nenhum conhecimento relevante encontrado para a Pergunta {q_idx}. Módulos aplicados: {getattr(rag_usage, 'applied_modules', {}) if rag_usage else {}}{discarded_detail}")
            
            if all_relevant:
                # Deduplicar
                seen = set()
                unique_relevant = []
                for it in all_relevant:
                    if it["id"] not in seen:
                        unique_relevant.append(it)
                        seen.add(it["id"])
                
                header_title = "# INFORMAÇÕES DA BASE DE CONHECIMENTO (RAG) PARA AS DÚVIDAS RESTANTES:" if is_partial_cache else "# CONTEXTO RAG:"
                rag_block = f"\n\n{header_title}\n" + "\n".join([f"Perg: {i['question']}\nResp: {i['answer']}" for i in unique_relevant])
                rag_context = (rag_context or "") + rag_block
                messages[0]["content"] += rag_block
        else:
            if on_step:
                on_step("📚 Consulta à Base de Conhecimento (RAG)", "Busca pulada pelo Pre-Router ou sem bases vinculadas ao agente.")

    messages.extend(history)
    raw_user_input = context_variables.get("raw_user_message") or (original_msg if 'original_msg' in locals() and original_msg else message)
    user_prompt_content = str(raw_user_input).strip() if raw_user_input else message
    messages.append({"role": "user", "content": user_prompt_content})

    # 5. Preparar Ferramentas (Tools)
    openai_tools = prepare_agent_tools(
        tools=tools,
        config=config,
        context_variables=context_variables,
        pre_router_result=pre_router_result,
        is_already_qualified=is_already_qualified,
        has_lead_qualified=has_lead_qualified
    )

    # 6. Loop de Execução (Turnos de Ferramentas)
    total_usage = UsageLog(0, 0, 0, 0)
    total_usage.mini_prompt += (mini_prompt_tokens + pre_router_tokens["prompt"])
    total_usage.mini_completion += (mini_completion_tokens + pre_router_tokens["completion"])
    
    handoff_data = {"handoff": False, "destino": None, "motivo": None}
    last_response = ""
    iteration = 0
    tool_calls_log = []
    is_handoff_terminal = False
    tool_call_counts = {}
    tool_failure_counts = {}

    # Injetar chamadas de ferramentas pré-executadas de forma simulada no histórico de mensagens
    if pre_executed_tool_calls:
        simulated_calls = []
        for i, tc in enumerate(pre_executed_tool_calls):
            t_id = f"call_pre_{i}_{now_br.microsecond}"
            simulated_calls.append({
                "id": t_id,
                "type": "function",
                "function": {
                    "name": tc["name"],
                    "arguments": json.dumps(tc["args"], ensure_ascii=False)
                }
            })
        
        # Mensagem do assistente propondo as chamadas
        messages.append({
            "role": "assistant",
            "content": None,
            "tool_calls": simulated_calls
        })
        
        # Respostas das ferramentas correspondentes
        for i, tc in enumerate(pre_executed_tool_calls):
            messages.append({
                "role": "tool",
                "name": tc["name"],
                "tool_call_id": simulated_calls[i]["id"],
                "content": tc["output"]
            })
            
            tool_calls_log.append({
                "name": tc["name"],
                "args": json.dumps(tc["args"], ensure_ascii=False),
                "output": tc["output"]
            })
            
            # Tratamento de suporte humano se a ferramenta pré-executada for de transbordo
            if tc["name"] in ["transferir_atendimento", "transferir_suporte_humano"]:
                motivo = tc["args"].get("motivo", "Solicitado pelo usuário")
                handoff_data = {"handoff": True, "destino": "humano", "motivo": motivo}
                is_handoff_terminal = True
                last_response = "Entendi perfeitamente. Estou transferindo seu atendimento para nossa equipe especializada para que você receba o suporte adequado. Um momento, por favor! ✨"
                if on_step:
                    on_step("🚑 Suporte Humano solicitado (Pré-executado)", f"Motivo: {motivo}")
            elif tc["name"] == "registrar_duvida_sem_resposta":
                if "AUTOMATICAMENTE TRANSFERIDO PARA O SUPORTE HUMANO" in str(tc.get("output", "")):
                    motivo = f"Dúvida sem resposta acionada > 1 vez: {tc.get('args', {}).get('pergunta', 'Dúvida do usuário')}"
                    handoff_data = {"handoff": True, "destino": "humano", "motivo": motivo}
    
    while iteration < 5:
        if is_handoff_terminal:
            break
        iteration += 1
        try:
            # Tentar modelos (Principal -> Fallback)
            models_to_try = [config.model]
            if getattr(config, 'fallback_model', None):
                models_to_try.append(config.fallback_model)
            
            response_message = None
            last_error = None
            for m in models_to_try:
                try:
                    curr_client = get_openai_client(m)
                    if not curr_client: continue
                    
                    api_params = {
                        "model": m,
                        "messages": messages,
                        "temperature": getattr(config, 'temperature', 0.1)
                    }
                    if openai_tools:
                        api_params["tools"] = openai_tools
                        api_params["tool_choice"] = "auto"
                    
                    completion = await curr_client.chat.completions.create(**api_params)
                    response_message = completion.choices[0].message
                    executed_model = m
                    executed_role = active_role if m == config.model else "fallback"
                    
                    # Atualizar Uso
                    if completion.usage:
                        total_usage.main_prompt += completion.usage.prompt_tokens
                        total_usage.main_completion += completion.usage.completion_tokens
                        
                        # Extrai cached_tokens de forma segura
                        cached_toks = 0
                        if hasattr(completion.usage, 'prompt_tokens_details') and completion.usage.prompt_tokens_details:
                            cached_toks = getattr(completion.usage.prompt_tokens_details, 'cached_tokens', 0) or 0
                        elif hasattr(completion.usage, 'cache_read_input_tokens'):
                            cached_toks = getattr(completion.usage, 'cache_read_input_tokens', 0) or 0
                        elif hasattr(completion.usage, 'extra_fields') and 'prompt_cache_hit_tokens' in completion.usage.extra_fields:
                            cached_toks = completion.usage.extra_fields.get('prompt_cache_hit_tokens', 0) or 0
                        total_usage.cached_tokens += cached_toks
                    break
                except Exception as e:
                    last_error = e
                    logger.error(f"⚠️ Erro no modelo {m}: {str(e)}")
                    continue
            if not response_message:
                tech_error_msg = format_ai_error_message(last_error, "OpenAI") if last_error else "❌ Erro na integração de IA: Falha ao comunicar com os modelos configurados."
                user_friendly_msg = "Desculpe, estou enfrentando uma instabilidade temporária agora. Por favor, tente novamente em instantes."
                return {
                    "content": user_friendly_msg, 
                    "system_error": tech_error_msg,
                    "error": True, 
                    "usage": total_usage, 
                    "model": getattr(config, 'model', 'gpt-4o-mini')
                }

            messages.append(response_message)
            
            # Se houver tool_calls, processá-los
            t_calls = getattr(response_message, "tool_calls", None)
            if t_calls and isinstance(t_calls, list):
                for tool_call in t_calls:
                    tool_name = tool_call.function.name
                    tool_args = json.loads(tool_call.function.arguments)
                    
                    if on_step:
                        on_step(f"🛠️ Acionando ferramenta: {tool_name}", f"Argumentos: {json.dumps(tool_args, ensure_ascii=False)}")
                    
                    tool_call_counts[tool_name] = tool_call_counts.get(tool_name, 0) + 1

                    # Limitador de segurança: no máximo 2 execuções por ferramenta neste turno se houver falha
                    if tool_failure_counts.get(tool_name, 0) >= 2 or tool_call_counts[tool_name] > 2:
                        tool_result = (
                            f"AVISO DO SISTEMA: A ferramenta '{tool_name}' atingiu o limite máximo de tentativas (máximo 2 chamadas). "
                            "INSTRUÇÃO OBRIGATÓRIA PARA SUA RESPOSTA: É terminantemente proibido tentar acionar esta ferramenta novamente. "
                            "Peça desculpas ao cliente de forma simpática, informe que houve uma pequena instabilidade momentânea no sistema "
                            "e prossiga com o atendimento respondendo às dúvidas dele normalmente."
                        )
                        openai_tools = [t for t in openai_tools if t.get("function", {}).get("name") != tool_name]
                        messages.append({"tool_call_id": tool_call.id, "role": "tool", "name": tool_name, "content": tool_result})
                        tool_calls_log.append({
                            "name": tool_name,
                            "args": json.dumps(tool_args, ensure_ascii=False),
                            "output": tool_result
                        })
                        continue

                    # Caso Especial: Handoff (Compatível com ambas as versões do nome por transição)
                    if tool_name in ["transferir_atendimento", "transferir_suporte_humano"]:
                        # Se for a ferramenta automática simplificada
                        destino = tool_args.get("destino", "humano")
                        motivo = tool_args.get("motivo", "Solicitado pelo usuário")
                        
                        handoff_data = {"handoff": True, "destino": destino, "motivo": motivo}
                        summary = await generate_handoff_summary(history + [messages[-2]]) 
                        handoff_data["summary"] = summary
                        
                        # Sincroniza etiquetas no Chatwoot imediatamente
                        t_tool = next((t for t in tools if t.name == tool_name), None) if tools else None
                        handoff_result = await handle_chatwoot_handoff(db, context_variables, t_tool, True, tool_args, history, config.id)
                        
                        tool_result = handoff_result
                        messages.append({"tool_call_id": tool_call.id, "role": "tool", "name": tool_name, "content": tool_result})
                        last_response = f"Entendi perfeitamente. Estou transferindo seu atendimento para nossa equipe especializada para que você receba o suporte adequado. Um momento, por favor! ✨"
                        
                        tool_calls_log.append({
                            "name": tool_name,
                            "args": json.dumps(tool_args, ensure_ascii=False),
                            "output": tool_result
                        })
                        
                        tool_calls_log.append({
                            "name": "chatwoot:sincronizacao_etiquetas",
                            "args": json.dumps({"is_human": True}, ensure_ascii=False),
                            "output": handoff_result
                        })
                        
                        detalhes_suporte = f"Destino: {destino}. Motivo: {motivo}."
                        if handoff_result and isinstance(handoff_result, str) and "DETALHES:" in handoff_result:
                            try:
                                # Extrair a seção de detalhes
                                partes = handoff_result.split("DETALHES: ")
                                if len(partes) > 1:
                                    detalhes_etiquetas = partes[1].split(". INSTRUÇÃO")[0]
                                    if detalhes_etiquetas and "Ação padrão" not in detalhes_etiquetas:
                                        detalhes_suporte += f"\n🏷️ {detalhes_etiquetas}"
                            except Exception as e_parse:
                                print(f"Erro ao parsear detalhes do handoff: {e_parse}")

                        if on_step:
                            on_step(f"🚑 Suporte Humano solicitado", detalhes_suporte)

                        # O handoff é terminal. Definimos o resultado e paramos o loop principal.
                        is_handoff_terminal = True
                        
                        break 

                    # Execução de Webhooks/Internal Tools
                    tool_result = "Erro: Ferramenta não encontrada."
                    target_tool = next((t for t in tools if t.name == tool_name), None) if tools else None
                    
                    # --- MAPEAMENTO DE FERRAMENTAS NATIVAS ---
                    if tool_name == "internal_date_calculator":
                        tool_result = await handle_date_calculator(json.dumps(tool_args))
                    elif tool_name == "registrar_duvida_sem_resposta":
                        tool_result = await handle_unanswered_question(db, context_variables, json.dumps(tool_args), history, config.id)
                        if "AUTOMATICAMENTE TRANSFERIDO PARA O SUPORTE HUMANO" in str(tool_result):
                            handoff_data = {"handoff": True, "destino": "humano", "motivo": f"Dúvida sem resposta acionada > 1 vez: {tool_args.get('pergunta')}"}
                            # NÃO marcamos is_handoff_terminal = True para permitir que o agente continue o loop (próxima iteração)
                            # e gere a resposta personalizada com base nas instruções e no contexto RAG/Prompt.
                    elif tool_name == "google_calendar_manager":
                        tool_result = await handle_google_calendar(db, context_variables, tool_args)
                    elif tool_name == "lead_qualificado":
                        tool_result = await handle_lead_qualified(db, context_variables, json.dumps(tool_args), config.id, on_step=on_step)
                    elif tool_name == "transferir_robo":
                        tool_result = await handle_chatwoot_handoff(db, context_variables, target_tool, False, tool_args, history, config.id)
                        tool_calls_log.append({
                            "name": "chatwoot:sincronizacao_etiquetas",
                            "args": json.dumps({"is_human": False}, ensure_ascii=False),
                            "output": tool_result
                        })
                    elif target_tool:
                        # Webhooks externos
                        try:
                            async with httpx.AsyncClient(timeout=30.0) as http_client:
                                res = await http_client.post(target_tool.webhook_url, json={**tool_args, **context_variables})
                                tool_result = res.text
                        except Exception as e:
                            # MENSAGEM DE ERRO AMIGÁVEL (Solicitado pelo usuário)
                            # Retornamos uma instrução para a IA ao invés do erro técnico bruto
                            logger.error(f"Erro na execução da ferramenta {tool_name}: {str(e)}")
                            tool_result = (
                                "ERRO: A ferramenta encontrou uma instabilidade temporária. "
                                "INSTRUÇÃO PARA IA: Peça desculpas ao usuário de forma elegante, diga que houve uma instabilidade "
                                "passageira e peça para ele enviar a solicitação novamente em instantes. "
                                "NÃO EXIBA DETALHES TÉCNICOS DO ERRO."
                            )
                    
                    # Verificação de erro e controle de tentativas (máximo 2 tentativas)
                    is_tool_error = (
                        isinstance(tool_result, str) and (
                            tool_result.startswith("ERRO") 
                            or tool_result.startswith("Erro") 
                            or "instabilidade temporária" in tool_result.lower()
                            or "instabilidade momentânea" in tool_result.lower()
                        )
                    )

                    if is_tool_error:
                        tool_failure_counts[tool_name] = tool_failure_counts.get(tool_name, 0) + 1
                        if tool_failure_counts[tool_name] >= 2:
                            # 2ª falha: Bloqueia novas chamadas e instrui a IA a informar instabilidade
                            openai_tools = [t for t in openai_tools if t.get("function", {}).get("name") != tool_name]
                            tool_result += (
                                "\n\n⚠️ LIMITE DE TENTATIVAS ATINGIDO (2/2): Esta ferramenta falhou pela 2ª vez consecutiva e foi bloqueada. "
                                "NÃO tente chamá-la novamente. Peça desculpas educadamente ao cliente informando que houve uma instabilidade passageira no sistema "
                                "e continue a conversa normalmente."
                            )
                        else:
                            # 1ª falha: Permite apenas 1 retry de teste
                            tool_result += (
                                "\n\n⚠️ AVISO: Ocorreu uma instabilidade na execução. Você pode tentar chamá-la no máximo mais 1 única vez para testar. "
                                "Se falhar novamente, não tente mais e avise o cliente com simpatia sobre a instabilidade passageira."
                            )
                    else:
                        # Em caso de sucesso para lead_qualificado, desativamos para evitar chamadas duplicadas no mesmo turno
                        if tool_name == "lead_qualificado":
                            openai_tools = [t for t in openai_tools if t.get("function", {}).get("name") != "lead_qualificado"]

                    if on_step and tool_name != "lead_qualificado":
                        on_step(f"✅ Ferramenta {tool_name} finalizada", f"Retorno: {tool_result}")
                    
                    messages.append({"tool_call_id": tool_call.id, "role": "tool", "name": tool_name, "content": tool_result})
                    
                    tool_calls_log.append({
                        "name": tool_name,
                        "args": json.dumps(tool_args, ensure_ascii=False),
                        "output": tool_result
                    })
                
                # Se foi um handoff, encerramos o loop agora
                if is_handoff_terminal:
                    break
                
                # Após processar ferramentas, o loop continua para que a IA gere a resposta final baseada nos resultados
                continue
            
            # Resposta final da IA
            if response_message.content is not None:
                last_response = str(response_message.content)
            elif not last_response:
                last_response = ""
            break
            
        except Exception as e:
            print(f"❌ Erro crítico no loop do agente: {str(e)}")
            return {"content": f"Erro interno: {str(e)}", "error": True, "usage": total_usage, "model": getattr(config, 'model', 'gpt-4o-mini')}

    if has_lead_qualified:
        from agent_core.tools.handlers.internal import check_and_apply_qualification_fallback
        last_response = await check_and_apply_qualification_fallback(db, context_variables, config, history, message, tool_calls_log, last_response, on_step)

    # 7. Filtros de Saída e Auditoria
    # Garantir que last_response seja string (importante para testes com mocks)
    last_response = str(last_response) if last_response is not None else ""
    
    # Se last_response estiver vazio e houve handoff (ex: falha do modelo na 2ª iteração ou tool terminal direta), usar fallback amigável
    if not last_response.strip() and handoff_data.get("handoff"):
        last_response = "Entendi perfeitamente. Registrei sua dúvida e transferi seu atendimento para nossa equipe especializada para que você receba o suporte adequado. Um momento, por favor! ✨"

    # Remove tags residuais que a IA possa ter 'vazado' (Ex: {ferramenta}{...})
    last_response = re.sub(r'\{[a-zA-Z0-9_-]+\}\s*\{.*?\}', '', last_response).strip()
    last_response = re.sub(r'\{[a-zA-Z0-9_-]+\}', '', last_response).strip()
    final_content = verify_output_safety(last_response, config)

    # Auditoria por IA (Double-Check)
    if getattr(config, 'security_validator_ia', False):
        try:
            if on_step:
                on_step("🛡️ Iniciando Auditoria por IA", "Verificando se a resposta gerada viola as diretrizes de segurança.")
            audit = await validate_response_ai(final_content, config)
            if not audit.get("is_safe", True):
                if on_step:
                    on_step("🚨 Bloqueio por Segurança", f"Resposta bloqueada. Motivo: {audit.get('reason')}")
                final_content = "Desculpe, não posso ajudar com este tema específico. Como posso te ajudar com outro assunto?"
            else:
                if on_step:
                    on_step("🛡️ Auditoria por IA Concluída", "A resposta gerada foi considerada segura.")
        except Exception as e_audit:
            logger.error(f"Erro ao processar auditoria de IA no core: {e_audit}")

    # 7.1 Mensagem de Primeira Pergunta (Append)
    # Se for a primeira mensagem/resposta do assistente e houver uma mensagem de pergunta configurada,
    # anexamos ela ao final da resposta.
    is_first_msg = not history or len(history) == 0 or not any((h.get('role') if isinstance(h, dict) else getattr(h, 'role', '')) == 'assistant' for h in history)
    init_q_msg = getattr(config, 'initial_question_message', None)
    question_mode = getattr(config, 'question_mode', 'panel')
    is_handoff = handoff_data.get("handoff", False) if isinstance(handoff_data, dict) else False
    
    if is_first_msg and final_content and not is_handoff and question_mode in ("panel", "disabled"):
        # Se o LLM gerar uma pergunta de continuação no final da resposta, nós a removemos
        # do texto gerado para evitar duplicidade ou respeitar o modo desativado.
        pattern = r'(?:[\n\s]+)?(?:Posso|Deseja|Quer|Como posso|Você possui|Mais alguma|Se tiver|Qualquer).*?(?:dúvida|ajuda|ajudar|pergunta|esclarecer|algo mais|mais alguma).*?\?\s*$'
        match = re.search(pattern, final_content, re.IGNORECASE | re.DOTALL)
        if match:
            final_content = final_content[:match.start()].strip()
            
        if question_mode == "panel" and init_q_msg and not final_content.endswith(init_q_msg):
            final_content = f"{final_content}\n\n{init_q_msg}"

    # 7.2 Formatação inteligente para WhatsApp (Garante espaçamento duplo limpo e impede texto amontoado)
    if final_content and not is_handoff:
        final_content = format_whatsapp_message(final_content)
    
    # 8. Memória (Auto-update se configurado)
    if db and session_id and last_response:
        msg_for_memory = context_variables.get("raw_user_message") or message
        saved_facts = await update_user_memory(db, session_id, msg_for_memory, last_response, on_step=on_step)
        if saved_facts and isinstance(saved_facts, dict):
            for k_m, v_m in saved_facts.items():
                context_variables[k_m] = v_m

    c_diag = cache_diagnostics if 'cache_diagnostics' in locals() and cache_diagnostics else {}
    final_model = executed_model if 'executed_model' in locals() and executed_model else config.model
    final_role = executed_role if 'executed_role' in locals() and executed_role else active_role
    return {
        "content": final_content,
        "usage": total_usage,
        "model": final_model,
        "model_role": final_role,
        "router_model": pre_router_tokens.get("model"),  # Modelo usado no pre-router (None se foi atalho programático)
        "router_tokens": {
            "prompt": pre_router_tokens["prompt"],
            "completion": pre_router_tokens["completion"]
        },
        "handoff_data": handoff_data,
        "error": False,
        "semantic_cache": c_diag,
        "from_semantic_cache": c_diag.get("status") == "hit_direct",
        "cached_similarity": c_diag.get("similarity"),
        "cached_original_query": c_diag.get("matched_query"),
        "rag_queries": rag_queries if 'rag_queries' in locals() and rag_queries else [],
        "rag_query": rag_query_str if 'rag_query_str' in locals() and rag_query_str else (rag_queries[0] if 'rag_queries' in locals() and rag_queries else None),
        "debug": {
            "iterations": iteration,
            "rag_items": all_relevant if 'all_relevant' in locals() and all_relevant else (relevant_items if 'relevant_items' in locals() and relevant_items else []),
            "rag_queries": rag_queries if 'rag_queries' in locals() and rag_queries else [],
            "rag_query": rag_query_str if 'rag_query_str' in locals() and rag_query_str else (rag_queries[0] if 'rag_queries' in locals() and rag_queries else None),
            "resolved_prompt": messages[0]["content"], # Inclui RAG e Regras
            "tool_calls": tool_calls_log,
            "pre_router": pre_router_result if 'pre_router_result' in locals() else None,
            "context_variables": context_variables,
            "semantic_cache": c_diag,
            "cache_hit": c_diag.get("status") in ["hit_direct", "hit_qualification", "partial_hit"],
            "cached_similarity": c_diag.get("similarity"),
            "cached_original_query": c_diag.get("matched_query"),
            "matched_queries": c_diag.get("matched_queries") or ([c_diag.get("matched_query")] if c_diag.get("matched_query") else []),
            "from_semantic_cache": c_diag.get("status") == "hit_direct",
            "user_message_sent": user_prompt_content if 'user_prompt_content' in locals() else message,
            "model_role": final_role
        }
    }
