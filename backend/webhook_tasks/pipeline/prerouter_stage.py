import os
import json
import time
import logging
from sqlalchemy import select, text
from sqlalchemy.orm import selectinload
from models import AgentConfigModel

logger = logging.getLogger(__name__)


async def execute_prerouter_stage(
    db,
    async_db,
    event,
    config,
    db_agent,
    agent_config,
    secondary_agents: list,
    mensagem: str,
    history: list,
    session_id: str,
    lead_internal_id,
    event_id: int,
    is_simulated: bool,
    cache_funnel_handled: bool,
    multi_matched_items: list,
    is_multi_hit: bool
) -> tuple:
    """Executa o Pre-Router, calcula custos e trata atalhos de intenção.

    Retorna:
        (is_terminal: bool, terminal_result: dict, pre_router_result: dict, final_db_agent, final_agent_config, mensagem_processada: str)
    """
    import webhook_tasks

    # 1. Execução do Pre-Router
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
    elif cache_funnel_handled:
        pre_router_result = {
            "eh_saudacao": False,
            "eh_agradecimento": False,
            "eh_agradecimento_recorrente": False,
            "eh_mensagem_automatica": False,
            "eh_resposta_ao_agente": False,
            "precisa_esclarecimento": False,
            "eh_anuncio": False,
            "resposta_direta": None,
            "resposta_esclarecimento": None,
            "id_agente_alvo": db_agent.id,
            "perguntas_extraidas": mensagem,
            "lista_perguntas_extraidas": [it.user_query for it in multi_matched_items] if is_multi_hit and multi_matched_items else [mensagem],
            "data_extraida": None,
            "precisa_rag": False,
            "chamada_ferramenta": None,
            "mensagem_original": mensagem,
            "mensagem_melhorada": mensagem,
            "tipo_mensagem": "Dúvida Respondida pelo Cache Semântico + Funil Ativo",
            "decisao": "Resposta atendida pelo Cache Semântico. Pre-Router LLM e RAG dispensados.",
            "_model_used": "shortcut-logic",
            "_usage": {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0},
            "_debug_prompt": "Atalho do Cache Semântico: Dúvida pré-aprovada pelo Cache com Funil de Qualificação ativo. Pre-Router e RAG dispensados."
        }
        shortcut_desc = (
            f"Todas as {len(multi_matched_items)} dúvidas foram respondidas com precisão pelo Cache Semântico. A triagem do Pre-Router e a busca na Base de Conhecimento foram dispensadas (0 tokens consumidos). O Agente Principal foi acionado diretamente para integrar as respostas oficiais e avançar no Funil de Qualificação."
            if is_multi_hit and multi_matched_items
            else "Todas as dúvidas foram respondidas com precisão pelo Cache Semântico. A triagem do Pre-Router e a busca na Base de Conhecimento foram dispensadas (0 tokens consumidos). O Agente Principal foi acionado diretamente para integrar a resposta oficial e avançar no Funil de Qualificação."
        )
        webhook_tasks._add_step(
            db,
            event_id,
            "⚡ Atalho Cache Semântico (Pre-Router e RAG Dispensados)",
            shortcut_desc
        )
        db.commit()
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

    # 2. Log de Alinhamento com Base de Conhecimento
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

    # 3. Mensagem Automática
    if pre_router_result.get("eh_mensagem_automatica"):
        event.is_automatic = True
        event.status = "ignored"
        webhook_tasks._add_step(db, event_id, "🤖 Mensagem Automática do Contato", "A IA identificou esta mensagem como um envio automático/ausência comercial do contato. A automação foi encerrada e nenhuma resposta foi enviada para evitar loops.")
        db.commit()
        return True, {"ignored_automatic": True}, pre_router_result, db_agent, agent_config, mensagem

    # 4. Anúncios na 1ª mensagem
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

    # 5. Emoji Negativo
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
            return True, {
                "content": msg_transicao,
                "usage": pr_usage,
                "model": pr_model,
                "debug": {
                    "is_greeting": True,
                    "negative_emoji_second_occurrence": True
                }
            }, pre_router_result, db_agent, agent_config, mensagem
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
            return True, {
                "content": pre_router_result.get("resposta_direta"),
                "usage": pr_usage,
                "model": pr_model,
                "debug": {
                    "is_greeting": True,
                    "negative_emoji_first_occurrence": True
                }
            }, pre_router_result, db_agent, agent_config, mensagem

    # 6. Compra Informada
    if pre_router_result.get("eh_compra_informada"):
        purchased_lbl = (config.purchased_label or "aluno").strip()
        cw_url = (config.zapvoice_url or os.getenv("ZAPVOICE_URL", "")).rstrip("/")
        if cw_url and not cw_url.endswith("/api"):
            cw_url = f"{cw_url}/api"
        cw_token = config.zapvoice_api_token or os.getenv("ZAPVOICE_API_TOKEN", "")

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
            f"Lead informou que já comprou o curso/produto. Etiqueta '{purchased_lbl}' aplicada e automações de follow-up canceladas com sucesso. Encaminhando mensagem para a IA analisar e responder."
        )

    # 6.1 Desinteresse Declarado pelo Cliente
    if pre_router_result.get("eh_desinteresse"):
        if lead_internal_id and config.leads_table:
            try:
                db.execute(text(f"""
                    UPDATE {config.leads_table} 
                    SET followup_step = -1
                    WHERE id = :id
                """), {"id": lead_internal_id})
                db.commit()
            except Exception as e_dis:
                logger.error(f"Erro ao cancelar follow-up por desinteresse para lead {lead_internal_id}: {e_dis}")
                db.rollback()

        webhook_tasks._add_step(
            db, 
            event_id, 
            "🚫 Desinteresse Declarado pelo Cliente", 
            "• **Status:** O lead declarou explicitamente que não tem interesse ou não vai comprar.\n• **Ação:** Régua de follow-up cancelada imediatamente para este contato."
        )

    # 7. Agradecimento Recorrente
    if pre_router_result.get("eh_agradecimento_recorrente") or (pre_router_result.get("eh_agradecimento") and not pre_router_result.get("resposta_direta")):
        webhook_tasks._add_step(
            db,
            event_id,
            "⏭️ Agente Principal Pulado (Agradecimento)",
            "• **Status:** O Agente Principal foi PULADO.\n• **Motivo:** O Pre-Router detectou um 2º (ou subsequente) agradecimento consecutivo do usuário. A resposta foi omitida para evitar envio infinito de mensagens."
        )
        return True, {"ignored_recurrent_thanks": True, "content": None, "usage": pr_usage, "model": pr_model}, pre_router_result, db_agent, agent_config, mensagem

    # 8. Saudação Direta
    if pre_router_result.get("eh_saudacao") and pre_router_result.get("resposta_direta"):
        webhook_tasks._add_step(
            db, 
            event_id, 
            "⏭️ Agente Principal Pulado (Saudação Direta)", 
            "• **Status:** O Agente Principal foi PULADO.\n• **Motivo:** O Pre-Router / Atalho Programático gerou a resposta de saudação diretamente para garantir resposta instantânea."
        )
        return True, {"content": pre_router_result.get("resposta_direta"), "usage": pr_usage, "model": pr_model, "debug": {"is_greeting": True}}, pre_router_result, db_agent, agent_config, mensagem
    
    # 9. Pedido de Esclarecimento
    if pre_router_result.get("precisa_esclarecimento") and pre_router_result.get("resposta_esclarecimento"):
        webhook_tasks._add_step(
            db, 
            event_id, 
            "⏭️ Agente Principal Pulado (Mensagem Ambígua)", 
            "• **Status:** O Agente Principal foi PULADO.\n• **Motivo:** O Pre-Router gerou uma pergunta de esclarecimento para entender a intenção do lead antes de acionar o Agente Principal."
        )
        return True, {"content": pre_router_result.get("resposta_esclarecimento"), "usage": pr_usage, "model": pr_model, "debug": {"needs_clarification": True}}, pre_router_result, db_agent, agent_config, mensagem
        
    # 10. Roteamento de Agente Secundário
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
            webhook_tasks._add_step(db, event_id, "🔀 Roteamento Efetuado", f"Mensagem roteada do principal para o Secundário: {final_db_agent.name}")

    return False, None, pre_router_result, final_db_agent, final_agent_config, mensagem
