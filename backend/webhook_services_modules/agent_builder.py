import json
import logging
import time
from datetime import timedelta
from sqlalchemy import text
from config_store import AgentConfig
from models import WebhookEventModel

logger = logging.getLogger(__name__)


def _build_agent_config(db_agent):
    """Build AgentConfig pydantic object from DB model."""
    return AgentConfig(
        id=db_agent.id,
        name=db_agent.name,
        description=db_agent.description,
        model=db_agent.model,
        fallback_model=db_agent.fallback_model,
        temperature=db_agent.temperature,
        top_p=db_agent.top_p,
        date_awareness=db_agent.date_awareness,
        system_prompt=db_agent.system_prompt,
        context_window=db_agent.context_window,
        knowledge_base=json.loads(db_agent.knowledge_base) if db_agent.knowledge_base else [],
        knowledge_base_id=None,
        knowledge_base_ids=[],
        rag_retrieval_count=db_agent.rag_retrieval_count,
        rag_translation_enabled=db_agent.rag_translation_enabled,
        rag_multi_query_enabled=db_agent.rag_multi_query_enabled,
        rag_rerank_enabled=db_agent.rag_rerank_enabled,
        rag_agentic_eval_enabled=db_agent.rag_agentic_eval_enabled,
        rag_parent_expansion_enabled=db_agent.rag_parent_expansion_enabled,
        tool_ids=[],
        is_active=db_agent.is_active,
        simulated_time=db_agent.simulated_time,
        security_competitor_blacklist=db_agent.security_competitor_blacklist,
        security_forbidden_topics=db_agent.security_forbidden_topics,
        security_discount_policy=db_agent.security_discount_policy,
        security_language_complexity=db_agent.security_language_complexity or "standard",
        security_pii_filter=db_agent.security_pii_filter,
        security_bot_protection=db_agent.security_bot_protection,
        security_max_messages_per_session=db_agent.security_max_messages_per_session,
        security_semantic_threshold=db_agent.security_semantic_threshold,
        security_loop_count=db_agent.security_loop_count,
        security_validator_ia=db_agent.security_validator_ia,
        inbox_capture_enabled=db_agent.inbox_capture_enabled,
        ui_primary_color=db_agent.ui_primary_color,
        ui_header_color=db_agent.ui_header_color,
        ui_chat_title=db_agent.ui_chat_title,
        ui_welcome_message=db_agent.ui_welcome_message,
        router_enabled=db_agent.router_enabled,
        router_simple_model=db_agent.router_simple_model or "gpt-4o-mini",
        router_simple_fallback_model=db_agent.router_simple_fallback_model,
        router_complex_model=db_agent.router_complex_model or "gpt-4o",
        handoff_enabled=db_agent.handoff_enabled,
        response_translation_enabled=db_agent.response_translation_enabled,
        response_translation_fallback_lang=db_agent.response_translation_fallback_lang or "portuguese",
        top_k=db_agent.top_k,
        presence_penalty=db_agent.presence_penalty,
        frequency_penalty=db_agent.frequency_penalty,
        safety_settings=db_agent.safety_settings,
        model_settings=json.loads(db_agent.model_settings) if db_agent.model_settings else {},
        qualification_questions=db_agent.qualification_questions,
        qualification_labels=db_agent.qualification_labels,
        qualification_criteria=db_agent.qualification_criteria,
        qualification_final_action=db_agent.qualification_final_action,
        qualification_final_action_trigger=getattr(db_agent, 'qualification_final_action_trigger', 'all') or 'all',
        qualification_funnels=getattr(db_agent, 'qualification_funnels', None),
        initial_question_message=db_agent.initial_question_message,
    )


def auto_migrate_webhook_columns(db):
    """Garante a auto-migração de colunas necessárias em webhook_configs."""
    try:
        db.execute(text("ALTER TABLE webhook_configs ADD COLUMN IF NOT EXISTS zapvoice_url TEXT"))
        db.execute(text("ALTER TABLE webhook_configs ADD COLUMN IF NOT EXISTS zapvoice_api_token TEXT"))
        db.execute(text("ALTER TABLE webhook_configs ADD COLUMN IF NOT EXISTS zapvoice_client_id TEXT"))
        db.execute(text("ALTER TABLE webhook_configs ADD COLUMN IF NOT EXISTS response_delay_seconds INTEGER DEFAULT 0"))
        db.execute(text("ALTER TABLE webhook_configs ADD COLUMN IF NOT EXISTS split_response_enabled BOOLEAN DEFAULT TRUE"))
        db.execute(text("ALTER TABLE webhook_configs ADD COLUMN IF NOT EXISTS process_audio BOOLEAN DEFAULT TRUE"))
        db.execute(text("ALTER TABLE webhook_configs ADD COLUMN IF NOT EXISTS process_image BOOLEAN DEFAULT TRUE"))
        db.execute(text("ALTER TABLE webhook_configs ADD COLUMN IF NOT EXISTS delete_labels TEXT"))
        db.execute(text("ALTER TABLE webhook_configs ADD COLUMN IF NOT EXISTS negative_feedback_label TEXT"))
        db.execute(text("ALTER TABLE webhook_configs ADD COLUMN IF NOT EXISTS project_assistant_label VARCHAR"))
        db.execute(text("ALTER TABLE webhook_configs ADD COLUMN IF NOT EXISTS project_assistant_keyword VARCHAR"))
        db.execute(text("ALTER TABLE webhook_configs ADD COLUMN IF NOT EXISTS project_assistant_deactivate_keyword VARCHAR"))
        db.execute(text("ALTER TABLE webhook_configs ADD COLUMN IF NOT EXISTS project_assistant_entry_message TEXT"))
        db.execute(text("ALTER TABLE webhook_configs ADD COLUMN IF NOT EXISTS project_assistant_exit_message TEXT"))
        db.commit()
    except Exception as e:
        db.rollback()
        logger.warning(f"Erro na auto-migração de colunas: {e}")


def resolve_grouped_media(db, event, config, event_id):
    """Aguardar a conclusão de mídias pendentes agrupadas e integrá-las."""
    import webhook_tasks
    webhook_tasks._add_step(db, event_id, "⏳ Aguardando mídias", "Algumas mídias deste grupo ainda estão sendo processadas. Aguardando conclusão...")
    
    for attempt in range(12): 
        media_events = db.query(WebhookEventModel).filter(
            WebhookEventModel.webhook_config_id == config.id,
            WebhookEventModel.telefone == event.telefone,
            WebhookEventModel.message_type.in_(["audio", "image"]),
            WebhookEventModel.status.in_(["media_ready", "grouped", "completed"]),
            WebhookEventModel.created_at >= event.created_at - timedelta(minutes=5)
        ).all()
        
        changed = False
        current_msg = event.mensagem
        for me in media_events:
            placeholder = f"[{me.message_type.upper()} PENDENTE]"
            
            if placeholder in current_msg and me.mensagem and placeholder not in me.mensagem:
                content = me.mensagem
                if me.message_type == "image":
                    content = f"[IMAGEM: {me.mensagem}]"
                
                idx = current_msg.find(placeholder)
                after_placeholder = current_msg[idx + len(placeholder):]
                if after_placeholder and not after_placeholder.startswith((" ", "\n", "?", "!", ".", ",")):
                    content += " "
                    
                current_msg = current_msg.replace(placeholder, content, 1)
                changed = True
        
        if changed:
            event.mensagem = current_msg
            db.commit()
        
        if "[AUDIO PENDENTE]" not in event.mensagem and "[IMAGE PENDENTE]" not in event.mensagem:
            webhook_tasks._add_step(db, event_id, "✅ Mídias Resolvidas", "Todas as transcrições/análises foram integradas com sucesso.")
            break
        
        if attempt < 11:
            time.sleep(5)
        else:
            webhook_tasks._add_step(db, event_id, "⚠️ Timeout de Mídia", "Algumas mídias não terminaram a tempo. Processando com o que temos.")
