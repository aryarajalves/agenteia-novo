import json
import logging
import asyncio
import time
from celery_app import app
from database import SessionLocal
from models import WebhookEventModel, WebhookConfigModel, AgentConfigModel, KnowledgeItemModel, KnowledgeBaseModel
from rag_service import get_embedding
from .utils import _add_step

logger = logging.getLogger(__name__)

@app.task(bind=True, name="webhook_tasks.sync_memory_to_vector", max_retries=0)
def sync_memory_to_vector(self, event_id: int):
    """Sincroniza fatos/dados de memória recebidos via webhook diretamente para a base vetorial."""
    db = SessionLocal()
    try:
        event = db.query(WebhookEventModel).filter(WebhookEventModel.id == event_id).first()
        if not event:
            return

        _add_step(db, event_id, "🔍 Entrada no Pipeline", f"Tarefa iniciada para o evento {event_id}. Status atual no DB: {event.status}")

        if event.status in ["success", "completed", "error"]:
            _add_step(db, event_id, "🚫 Sincronização Ignorada", f"O evento já está finalizado como '{event.status}'. Abortando execução para evitar loop.")
            logger.info(f"Task cancelada: Evento {event_id} já está em estado final '{event.status}'.")
            return
            
        if event.status == "processing":
            _add_step(db, event_id, "⚠️ Pipeline em andamento", "Já existe um worker processando este evento. Abortando colisão.")
            logger.info(f"Task cancelada: Evento {event_id} já está sendo processado.")
            return

        event.processing_steps = "[]"
        event.status = "processing"
        db.commit()

        _add_step(db, event_id, "⏳ Iniciando delay estratégico (5s)", "Aguardando estabilização dos dados conforme solicitado pelo usuário...")
        time.sleep(5)

        _add_step(db, event_id, "🔍 Iniciando sincronização vetorial", "Analisando dados recebidos via webhook para persistência em memória.")

        raw = {}
        try:
            raw = json.loads(event.raw_payload or "{}")
        except:
            _add_step(db, event_id, "❌ Erro: Payload inválido", "Não foi possível decodificar o JSON do evento.")
            event.status = "error"
            db.commit()
            return

        phone = raw.get("phone") or event.telefone
        name = raw.get("name") or event.contato_nome
        facts = raw.get("facts", {})

        if not facts:
            _add_step(db, event_id, "⚠️ Nenhum fato encontrado", "O payload não contém campos de 'facts' para sincronizar.")
            event.status = "completed"
            db.commit()
            return

        _add_step(db, event_id, f"✅ Contato: {name} ({phone})", f"Processando {len(facts)} fatos extraídos.")
        
        vars_str = ", ".join([f"{k}" for k in facts.keys()])
        _add_step(db, event_id, "🛠️ Variáveis identificadas", f"Campos: {vars_str}", metadata={"facts": facts})

        config = db.query(WebhookConfigModel).filter(WebhookConfigModel.id == event.webhook_config_id).first()
        if not config or not config.agent_id:
            _add_step(db, event_id, "❌ Erro: Agente não configurado", "O webhook não possui um agente vinculado para salvar a memória.")
            event.status = "error"
            db.commit()
            return

        agent = db.query(AgentConfigModel).filter(AgentConfigModel.id == config.agent_id).first()
        kb_id = agent.knowledge_base_id if agent else None
        
        if not kb_id:
            kb = db.query(KnowledgeBaseModel).first()
            if kb: kb_id = kb.id

        if not kb_id:
            _add_step(db, event_id, "❌ Erro: Base de Conhecimento inexistente", "Não foi encontrada uma base de conhecimento para este agente.")
            event.status = "error"
            db.commit()
            return

        _add_step(db, event_id, "💾 Gerando Embeddings de Memória", f"Iniciando conversão de {len(facts)} fatos em vetores pesquisáveis...")
        
        success_count = 0
        for key, value in facts.items():
            content = f"Informação de {name} ({phone}): {key} é {value}"
            _add_step(db, event_id, f"🔄 Processando campo: {key}", "Solicitando embedding à OpenAI...")
            
            try:
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                emb, usage = loop.run_until_complete(get_embedding(content))
                loop.close()
                
                if emb:
                    new_item = KnowledgeItemModel(
                        knowledge_base_id=kb_id,
                        question=f"{key} de {name}",
                        answer=str(value),
                        metadata_val=f"phone:{phone}",
                        embedding=emb,
                        category="memory_sync"
                    )
                    db.add(new_item)
                    db.commit()
                    success_count += 1
                    
                    usage_stats = {}
                    if usage:
                        if hasattr(usage, 'model_dump'): usage_stats = usage.model_dump()
                        elif hasattr(usage, 'dict'): usage_stats = usage.dict()
                        else: usage_stats = str(usage)

                    _add_step(db, event_id, f"✅ Salvo: {key}", f"Campo '{key}' persistido na memória vetorial.", metadata={"usage": usage_stats})
                else:
                    _add_step(db, event_id, f"🛑 Parada por Falha: {key}", "O serviço de embedding não retornou dados. Parando conforme regra anti-erro.")
                    event.status = "error"
                    db.commit()
                    return
            except Exception as loop_e:
                logger.error(f"Erro ao processar fato {key}: {loop_e}")
                _add_step(db, event_id, f"🛑 Parada por Erro: {key}", f"Erro: {str(loop_e)}. Pipeline interrompido para evitar inconsistência.")
                event.status = "error"
                db.commit()
                return

        _add_step(db, event_id, "✅ Sincronização finalizada", f"Pipeline concluído. {success_count} campos integrados à memória.")
        event.status = "completed"
        db.commit()

    except Exception as e:
        logger.error(f"Erro no sync_memory_to_vector: {e}")
        _add_step(db, event_id, "❌ Erro crítico no pipeline", str(e))
        if event:
            event.status = "error"
            db.commit()
    finally:
        db.close()
