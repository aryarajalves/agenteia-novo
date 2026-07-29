import json
import logging
from datetime import datetime
from ...clients import get_openai_client

logger = logging.getLogger(__name__)

async def handle_date_calculator(func_args_str):
    try:
        func_args = json.loads(func_args_str)
        desc = func_args.get("date_description")
        mini_client = get_openai_client()
        now_str = datetime.now().strftime("%Y-%m-%d (%A)")
        mini_response = await mini_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": f"Calcule a data exata. Hoje é {now_str}. Retorne: 'YYYY-MM-DD (Dia da Semana)'."},
                {"role": "user", "content": f"Qual a data de: {desc}?"}
            ],
            temperature=0.0
        )
        return mini_response.choices[0].message.content
    except Exception as e: return f"Erro ao calcular data: {str(e)}"

async def handle_unanswered_question(db, context_variables, func_args_str, history, agent_id):
    try:
        from models import UnansweredQuestionModel
        func_args = json.loads(func_args_str)
        question = func_args.get("pergunta")
        
        # ID original da sessão (do playground/chat) — antes de sobrescrever com o telefone
        original_session_id = context_variables.get("session_id") or ""
        
        # Prioriza o telefone real do contato se estiver disponível nas variáveis de contexto
        session_id = context_variables.get("contact_phone") or original_session_id or "Desconhecida"
        
        # Identificar a origem (se tem webhook_config_id, account_id ou conversation_id, veio do chatwoot/integração)
        is_chatwoot = any(k in context_variables for k in ["webhook_config_id", "account_id", "conversation_id"])
        source_val = "chatwoot" if is_chatwoot else "chat"
        
        # Preservar o session_id original no contexto para rastreabilidade
        meta_line = f"SESSION_ID_ORIGINAL: {original_session_id}\n" if original_session_id and original_session_id != session_id else ""
        context_text = f"Sessão: {session_id}\n{meta_line}Histórico:\n" + "\n".join([f"{m.get('role')}: {m.get('content')}" for m in history[-5:]])
        
        new_q = UnansweredQuestionModel(
            agent_id=agent_id, 
            session_id=session_id, 
            question=question, 
            context=context_text, 
            status="PENDENTE",
            source=source_val
        )
        if db:
            db.add(new_q)
            await db.commit()

            # Verificar se é a 2ª vez (ou mais) que esta ferramenta é acionada nesta mesma sessão/telefone
            from sqlalchemy import select, func
            count_stmt = select(func.count()).select_from(UnansweredQuestionModel).where(
                UnansweredQuestionModel.agent_id == agent_id,
                UnansweredQuestionModel.session_id == session_id
            )
            count_res = await db.execute(count_stmt)
            total_unanswered = count_res.scalar() or 0

            if total_unanswered > 1:
                from agent_core.tools.handlers.chatwoot import handle_chatwoot_handoff
                handoff_args = {"motivo": f"Dúvida sem resposta registrada {total_unanswered} vezes na mesma conversa: {question}"}
                await handle_chatwoot_handoff(db, context_variables, None, True, handoff_args, history, agent_id)
                return (
                    "ATENÇÃO: Esta é a segunda dúvida sem resposta registrada nesta conversa. "
                    "O atendimento foi AUTOMATICAMENTE TRANSFERIDO PARA O SUPORTE HUMANO. "
                    "Informe ao usuário de forma educada que o atendimento foi direcionado para um especialista humano que irá ajudá-lo."
                )

            return "Dúvida registrada para nossa equipe."
        return "Erro: Sem conexão com banco."
    except Exception as e: return f"Erro ao registrar dúvida: {str(e)}"

async def handle_lead_qualified(db, context_variables, func_args_str, agent_id):
    try:
        from models import AgentConfigModel, WebhookConfigModel
        from chatwoot_utils import sync_conversation_labels
        from sqlalchemy import select
        
        func_args = json.loads(func_args_str)
        respostas = func_args.get("respostas", {})
        
        # 1. Print destacado no console do backend
        print("\n" + "="*80)
        print("🎯 LEAD QUALIFICADO IDENTIFICADO!")
        print(f"Agente ID: {agent_id}")
        print(f"Contato: {context_variables.get('contact_name')} ({context_variables.get('contact_phone')})")
        print("Respostas Coletadas:")
        print(json.dumps(respostas, ensure_ascii=False, indent=2))
        print("="*80 + "\n", flush=True)
        
        logger.info(f"Lead qualificado identificado para agente {agent_id}. Respostas: {json.dumps(respostas, ensure_ascii=False)}")
        
        leads_table = context_variables.get("leads_table")
        phone = context_variables.get("contact_phone")
        
        agent = None
        wh = None
        to_add = []
        
        if db:
            # Buscar o agente para obter as etiquetas configuradas
            agent_res = await db.execute(select(AgentConfigModel).where(AgentConfigModel.id == agent_id))
            agent = agent_res.scalars().first()
            
            if agent and agent.qualification_labels:
                try:
                    to_add = json.loads(agent.qualification_labels)
                except Exception:
                    pass
            
            if isinstance(to_add, list):
                to_add = [str(x) for x in to_add]
            else:
                to_add = []
                
            if "qualificado" not in to_add:
                to_add.append("qualificado")
                
            # Buscar webhook para credenciais e ID da config
            wh_res = await db.execute(
                select(WebhookConfigModel)
                .where(WebhookConfigModel.agent_id == agent_id)
                .limit(1)
            )
            wh = wh_res.scalars().first()
            if not wh:
                wh_sec_res = await db.execute(
                    select(WebhookConfigModel)
                    .where(WebhookConfigModel.secondary_agent_ids.like(f"%{agent_id}%"))
                    .limit(1)
                )
                wh = wh_sec_res.scalars().first()
        
        # 2. Salvar no banco de dados na coluna respostas_qualificacao do lead correspondente
        if db and leads_table and phone:
            from sqlalchemy import text
            from lead_scoring_service import calculate_lead_score
            
            # Calcular o score e a classificação usando a IA
            score_data = await calculate_lead_score(db, agent_id, respostas)
            lead_score = score_data.get("lead_score", 0)
            lead_classification = score_data.get("lead_classification", "Frio ❄️")
            lead_justification = score_data.get("lead_justification", "")
            
            respostas_str = json.dumps(respostas, ensure_ascii=False)
            
            # Buscar lead existente para ler etiquetas atuais e evitar sobrescrever labels já aplicadas
            existing_labels = []
            try:
                lead_query = f"SELECT labels FROM {leads_table} WHERE telefone = :phone"
                lead_res = await db.execute(text(lead_query), {"phone": phone})
                lead_row = lead_res.fetchone()
                if lead_row and lead_row[0]:
                    raw_labels = lead_row[0]
                    try:
                        parsed = json.loads(raw_labels)
                        if isinstance(parsed, list):
                            existing_labels = [str(x) for x in parsed]
                        else:
                            existing_labels = [str(raw_labels)]
                    except Exception:
                        existing_labels = [x.strip() for x in raw_labels.split(",") if x.strip()]
            except Exception as e_read_labels:
                logger.error(f"Erro ao ler etiquetas existentes do lead: {e_read_labels}")
            
            # Unir novas etiquetas do agente com as existentes
            final_labels = list(existing_labels)
            for item in to_add:
                if item not in final_labels:
                    final_labels.append(item)
            
            final_labels_json = json.dumps(final_labels, ensure_ascii=False)
            
            # Tentar fazer o UPDATE primeiro
            update_query = f"""
                UPDATE {leads_table} SET 
                    respostas_qualificacao = :respostas,
                    lead_score = :lead_score,
                    lead_classification = :lead_classification,
                    lead_justification = :lead_justification,
                    qualified_by_agent_id = :qualified_by_agent_id,
                    labels = :labels,
                    updated_at = CURRENT_TIMESTAMP
                WHERE telefone = :phone
            """
            result = await db.execute(text(update_query), {
                "respostas": respostas_str,
                "phone": phone,
                "labels": final_labels_json,
                "lead_score": lead_score,
                "lead_classification": lead_classification,
                "lead_justification": lead_justification,
                "qualified_by_agent_id": agent_id
            })
            
            # Se nenhuma linha foi atualizada (rowcount é 0 ou None), criamos o lead
            if result is None or getattr(result, "rowcount", 0) == 0:
                logger.info(f"Lead com telefone {phone} não encontrado na tabela {leads_table}. Criando novo lead...")
                
                # Campos extras
                conta_id = context_variables.get("account_id") or context_variables.get("conta_id")
                inbox_id = context_variables.get("inbox_id")
                inbox_nome = context_variables.get("inbox_nome")
                conversa_id = context_variables.get("conversation_id") or context_variables.get("conversa_id")
                mensagem_id = context_variables.get("mensagem_id")
                contato_id = context_variables.get("contact_id") or context_variables.get("contato_id")
                contato_nome = context_variables.get("contact_name") or context_variables.get("contato_nome")
                
                insert_query = f"""
                    INSERT INTO {leads_table} (
                        webhook_config_id, qualified_by_agent_id, conta_id, inbox_id, inbox_nome, conversa_id,
                        mensagem_id, contato_id, telefone, labels, contato_nome,
                        respostas_qualificacao, lead_score, lead_classification, lead_justification,
                        pode_enviar_mensagem, updated_at, created_at
                    ) VALUES (
                        :webhook_config_id, :qualified_by_agent_id, :conta_id, :inbox_id, :inbox_nome, :conversa_id,
                        :mensagem_id, :contato_id, :telefone, :labels, :contato_nome,
                        :respostas, :lead_score, :lead_classification, :lead_justification,
                        TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                    )
                """
                await db.execute(text(insert_query), {
                    "webhook_config_id": wh.id if wh else None,
                    "qualified_by_agent_id": agent_id,
                    "conta_id": str(conta_id) if conta_id is not None else None,
                    "inbox_id": str(inbox_id) if inbox_id is not None else None,
                    "inbox_nome": str(inbox_nome) if inbox_nome is not None else None,
                    "conversa_id": str(conversa_id) if conversa_id is not None else None,
                    "mensagem_id": str(mensagem_id) if mensagem_id is not None else None,
                    "contato_id": str(contato_id) if contato_id is not None else None,
                    "telefone": phone,
                    "labels": final_labels_json,
                    "contato_nome": contato_nome,
                    "respostas": respostas_str,
                    "lead_score": lead_score,
                    "lead_classification": lead_classification,
                    "lead_justification": lead_justification
                })
                
            await db.commit()
            logger.info(f"Respostas de qualificação e Lead Score processados com sucesso na tabela {leads_table} para o telefone {phone}")
            
        # 3. Adicionar as etiquetas do Chatwoot
        if db:
            account_id = context_variables.get("account_id")
            conversation_id = context_variables.get("conversation_id")
            
            # --- FALLBACK DE CREDENCIAIS DO CHATWOOT ---
            import os
            cw_url = None
            api_token = None
            
            if wh and wh.chatwoot_url and wh.chatwoot_api_token:
                cw_url = wh.chatwoot_url.rstrip("/")
                api_token = wh.chatwoot_api_token
            else:
                cw_url = os.getenv("CHATWOOT_URL")
                api_token = os.getenv("CHATWOOT_API_TOKEN")
                if cw_url:
                    cw_url = cw_url.rstrip("/")
                if not account_id:
                    account_id = os.getenv("CHATWOOT_ACCOUNT_ID")
            
            # Tentar recuperar account_id no banco com o último evento se ainda for nulo
            if not account_id and wh:
                from models import WebhookEventModel
                evt_result = await db.execute(
                    select(WebhookEventModel.conta_id)
                    .where(WebhookEventModel.webhook_config_id == wh.id)
                    .where(WebhookEventModel.conta_id.isnot(None))
                    .order_by(WebhookEventModel.created_at.desc())
                    .limit(1)
                )
                db_account_id = evt_result.scalar()
                if db_account_id:
                    account_id = db_account_id
            
            if cw_url and api_token and account_id and conversation_id:
                await sync_conversation_labels(
                    cw_url=cw_url,
                    account_id=int(account_id),
                    conversation_id=int(conversation_id),
                    token=api_token,
                    to_add=to_add
                )
                logger.info(f"Etiquetas de qualificação sincronizadas no Chatwoot para conversa {conversation_id}: {to_add}")
                return f"Lead qualificado com sucesso. Etiquetas sincronizadas na conversa: {', '.join(to_add)}"
            
            if to_add:
                return f"Lead qualificado com sucesso (salvo localmente). Etiquetas configuradas: {', '.join(to_add)}"
                
        return "Lead qualificado com sucesso."
    except Exception as e:
        logger.error(f"Erro ao processar lead qualificado: {e}")
        return f"Erro ao qualificar lead: {str(e)}"

