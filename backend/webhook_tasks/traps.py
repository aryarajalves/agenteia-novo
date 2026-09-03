import json
import logging
import os
import asyncio
from sqlalchemy import text
from core.timezone import get_now_utc
from models import WebhookEventModel

logger = logging.getLogger(__name__)

def handle_traps_and_validations(db, event, config, event_id: int):
    """
    Executa todas as verificações prévias de segurança e traps de automação.
    Retorna: (should_stop: bool, lead_internal_id, last_msg, lead_created_at)
    """
    import webhook_tasks

    # 1. TRAP DE AUTO-DELEÇÃO POR PALAVRA-CHAVE (PRIORIDADE MÁXIMA)
    mensagem = event.mensagem or ""
    msg_limpa = mensagem.strip().lower()
    if msg_limpa and config.delete_keywords:
        try:
            keywords = json.loads(config.delete_keywords)
            keyword_match = None
            for kw in keywords:
                if kw.strip().lower() in msg_limpa:
                    keyword_match = kw.strip()
                    break
            
            if keyword_match:
                target_tel = str(event.telefone or "")
                target_cid = str(event.conversa_id or "")
                target_aid = str(event.conta_id or "")
                
                webhook_tasks.execute_keyword_deletion_trap(db, event, config, target_tel, target_cid, target_aid)
                return True, None, None, None
        except Exception as e:
            logger.error(f"Erro no processamento de auto-deleção: {e}")
            webhook_tasks._add_step(db, event_id, "⚠️ Erro na Auto-Deleção", str(e))

    # 2. TRAP DE ASSISTENTE DE PROJETO POR PALAVRA-CHAVE
    msg_limpa_raw = (event.mensagem or "").strip().lower()
    proj_kw = (config.project_assistant_keyword or "").strip().lower()
    proj_exit_kw = (config.project_assistant_deactivate_keyword or "").strip().lower()
    proj_label = (config.project_assistant_label or "").strip()

    if proj_label and event.conversa_id and event.conta_id:
        zv_url = (config.zapvoice_url or os.getenv("ZAPVOICE_URL", "")).rstrip("/")
        zv_token = config.zapvoice_api_token or os.getenv("ZAPVOICE_API_TOKEN", "")
        acc_id = str(event.conta_id)
        conv_id = int(event.conversa_id) if str(event.conversa_id).isdigit() else 0

        # Ativação
        if proj_kw and msg_limpa_raw == proj_kw:
            webhook_tasks._add_step(db, event_id, "⚙️ Ativando Assistente de Projeto", f"Palavra-chave '{config.project_assistant_keyword}' detectada.")
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                loop.run_until_complete(webhook_tasks.sync_conversation_labels(zv_url, acc_id, conv_id, zv_token, to_add=[proj_label]))
            finally:
                loop.close()
            
            entry_msg = config.project_assistant_entry_message or "Assistente de Projeto ativado. Como posso te ajudar com as métricas do projeto?"
            webhook_tasks._send_zapvoice_message(db, event_id, event.conversa_id, event.conta_id, entry_msg, config)
            
            event = db.query(WebhookEventModel).filter(WebhookEventModel.id == event_id).first()
            event.status = "completed"
            db.commit()
            return True, None, None, None

        # Desativação
        elif proj_exit_kw and msg_limpa_raw == proj_exit_kw:
            webhook_tasks._add_step(db, event_id, "⚙️ Desativando Assistente de Projeto", f"Palavra-chave '{config.project_assistant_deactivate_keyword}' detectada.")
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                loop.run_until_complete(webhook_tasks.sync_conversation_labels(zv_url, acc_id, conv_id, zv_token, to_remove=[proj_label]))
            finally:
                loop.close()
            
            exit_msg = config.project_assistant_exit_message or "Assistente de Projeto desativado. Retornando ao atendimento padrão do robô."
            webhook_tasks._send_zapvoice_message(db, event_id, event.conversa_id, event.conta_id, exit_msg, config)
            
            event = db.query(WebhookEventModel).filter(WebhookEventModel.id == event_id).first()
            event.status = "completed"
            db.commit()
            return True, None, None, None

    # 3. TRAP DE AUTOMAÇÃO E SEGURANÇA (LEADS TABLE)
    lead_internal_id = None
    last_msg = None
    lead_created_at = None
    if config.leads_table:
        try:
            webhook_tasks._add_step(db, event_id, "🔍 Verificando status do contato", "Validando etiquetas do ZapVoice e janela de 24h...")
            
            query = text(f"SELECT id, ultima_mensagem_em, created_at FROM {config.leads_table} WHERE telefone = :tel LIMIT 1")
            res = db.execute(query, {"tel": event.telefone}).fetchone()
            
            if res:
                lead_internal_id, last_msg, lead_created_at = res
                try:
                    db.execute(text(f"""
                        UPDATE {config.leads_table} SET
                            mensagem = :msg,
                            message_type = :mtype,
                            link = :link,
                            ultima_mensagem_em = :now,
                            updated_at = :now,
                            conversa_id = :cid
                        WHERE id = :lid
                    """), {"msg": event.mensagem or "", "mtype": event.message_type or "text", "link": event.link, "now": get_now_utc(), "cid": event.conversa_id, "lid": lead_internal_id})
                    db.commit()
                    webhook_tasks._add_step(db, event_id, "💾 Lead Atualizado", "Mensagem do usuário persistida com sucesso.")
                except Exception as e_upd:
                    logger.warning(f"Erro ao atualizar mensagem do usuário no lead: {e_upd}")
                
            is_paused = webhook_tasks.check_automation_trap(db, event, config, lead_internal_id, last_msg, lead_created_at)
            if is_paused:
                event = db.query(WebhookEventModel).filter(WebhookEventModel.id == event_id).first()
                event.status = "ignored"
                db.commit()
                return True, lead_internal_id, last_msg, lead_created_at

        except Exception as e:
            logger.error(f"Erro ao verificar trap de automação: {e}")
            webhook_tasks._add_step(db, event_id, "🔍 Aviso: Trap Ignorado", f"Erro ao verificar lead: {str(e)}")

    # 4. MODO SILENCIOSO (DESATIVAR RESPOSTAS DA IA)
    if getattr(config, "disable_ai_responses", False) is True:
        webhook_tasks._add_step(db, event_id, "🤐 Modo Silencioso Ativo", "Mensagem e dados persistidos com sucesso na memória. Resposta automática de IA pausada por opção da integração.")
        event = db.query(WebhookEventModel).filter(WebhookEventModel.id == event_id).first()
        event.status = "ignored_silent"
        db.commit()
        return True, lead_internal_id, last_msg, lead_created_at

    return False, lead_internal_id, last_msg, lead_created_at
