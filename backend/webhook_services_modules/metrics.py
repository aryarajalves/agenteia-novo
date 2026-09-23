import json
import logging
from core.timezone import get_now_utc
from models import InteractionLog

logger = logging.getLogger(__name__)


def _get_cost(model, usage):
    """Calcula o custo estimado dos tokens em reais (BRL)."""
    if not usage:
        return 0
    if not model or not isinstance(model, str):
        model = "gpt-4o-mini"

    p_tokens = usage.get("prompt_tokens", 0) or (usage.get("mini_prompt", 0) + usage.get("main_prompt", 0))
    c_tokens = usage.get("completion_tokens", 0) or (usage.get("mini_completion", 0) + usage.get("main_completion", 0))
    cached_tokens = usage.get("cached_tokens", 0) or 0
    
    from api.services.cost_service import calculate_ai_cost
    _, cost_brl = calculate_ai_cost(model, p_tokens, c_tokens, cached_tokens)
    return cost_brl


def save_interaction_log(db, event, config, response_text, ai_metadata, session_id, db_agent):
    """Registra a interação financeira no banco de dados."""
    import webhook_tasks
    try:
        ai_usage = ai_metadata.get("usage")
        p_tokens = 0
        c_tokens = 0
        cached_toks = 0
        if ai_usage:
            if isinstance(ai_usage, dict):
                p_tokens = ai_usage.get("prompt_tokens", 0) or (ai_usage.get("main_prompt", 0) + ai_usage.get("mini_prompt", 0))
                c_tokens = ai_usage.get("completion_tokens", 0) or (ai_usage.get("main_completion", 0) + ai_usage.get("mini_completion", 0))
                cached_toks = ai_usage.get("cached_tokens", 0) or 0
            else:
                p_tokens = getattr(ai_usage, "prompt_tokens", 0)
                c_tokens = getattr(ai_usage, "completion_tokens", 0)
                cached_toks = getattr(ai_usage, "cached_tokens", 0) or 0

        new_log = InteractionLog(
            agent_id=config.agent_id,
            session_id=session_id,
            user_message=event.mensagem,
            agent_response=response_text,
            model_used=ai_metadata.get("model", db_agent.model),
            input_tokens=p_tokens,
            output_tokens=c_tokens,
            cached_tokens=cached_toks,
            cost_usd=ai_metadata.get("cost_usd", (ai_metadata.get("cost", 0) / 6.0)),
            cost_brl=ai_metadata.get("cost", 0),
            timestamp=get_now_utc()
        )
        db.add(new_log)
        db.commit()
        webhook_tasks._add_step(db, event.id, "💰 Registro Financeiro", f"Custo registrado: R$ {new_log.cost_brl:.4f} ({p_tokens + c_tokens} tokens, {cached_toks} cache)")
    except Exception as log_err:
        logger.error(f"Erro ao salvar InteractionLog no Webhook: {log_err}")
        webhook_tasks._add_step(db, event.id, "⚠️ Erro no Financeiro", "Não foi possível registrar o custo desta interação.")


def proactive_update_lead_table(db, event, config, response_text, lead_internal_id, cw_labels):
    """Atualiza proativamente a tabela local de leads/contatos."""
    import webhook_tasks
    from sqlalchemy import text
    try:
        table = config.leads_table
        
        update_fields = [
            "contato_nome = :nome",
            "telefone = :tel",
            "conversa_id = :cid",
            "conta_id = :conta_id",
            "inbox_id = :inbox_id",
            "inbox_nome = :inbox_nome",
            "ultima_resposta_agente = :resp",
            "ultima_resposta_agente_em = :now",
            "updated_at = :now"
        ]
        
        params = {
            "nome": event.contato_nome,
            "resp": response_text,
            "tel": event.telefone,
            "wid": config.id,
            "cid": event.conversa_id,
            "conta_id": event.conta_id,
            "inbox_id": event.inbox_id,
            "inbox_nome": event.inbox_nome,
            "now": get_now_utc()
        }

        if event.created_at:
            update_fields.append("ultima_mensagem_em = :last_msg_at")
            params["last_msg_at"] = event.created_at
        
        if event.message_type and event.message_type != 'text':
            update_fields.append("message_type = :mtype")
            params["mtype"] = event.message_type

        if event.link and str(event.link).strip() and str(event.link).strip() != "None":
            update_fields.append("link = :link")
            params["link"] = event.link
        
        if cw_labels is not None:
            update_fields.append("labels = :labels")
            params["labels"] = json.dumps(cw_labels, ensure_ascii=False)
        
        from webhooks.utils import normalize_phone, get_phone_suffix
        phone_clean = normalize_phone(event.telefone)
        tel_suffix = get_phone_suffix(phone_clean)
        params["tel_suffix"] = tel_suffix

        if lead_internal_id:
            params["lid"] = lead_internal_id
            where_clause = "id = :lid"
        else:
            where_clause = "webhook_config_id = :wid AND (telefone = :tel OR telefone LIKE '%' || :tel_suffix || '%')"

        db.execute(text(f"""
            UPDATE {table} SET
                {", ".join(update_fields)}
            WHERE {where_clause}
        """), params)
        db.commit()
        
        labels_log = f"labels ({json.dumps(cw_labels, ensure_ascii=False)})" if cw_labels is not None else "labels preservadas"
        webhook_tasks._add_step(db, event.id, "💾 Tabela de Leads Atualizada", f"Nome, telefone, {labels_log} e resposta do agente salvos de forma proativa.")
    except Exception as le:
        logger.error(f"Erro ao atualizar leads table proativamente: {le}")
        webhook_tasks._add_step(db, event.id, "⚠️ Aviso: Falha ao salvar no Contato", str(le))
