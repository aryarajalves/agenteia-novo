import logging
import asyncio
import os
import re
from datetime import timezone
from sqlalchemy import text
from models import InteractionLog, WebhookEventModel
from services.rag.providers import get_embedding
from core.timezone import get_now_utc

logger = logging.getLogger(__name__)

def cosine_similarity(v1, v2):
    if not v1 or not v2: return 0.0
    import math
    dot = sum(a*b for a, b in zip(v1, v2))
    norm_a = math.sqrt(sum(a*a for a in v1))
    norm_b = math.sqrt(sum(b*b for b in v2))
    if norm_a == 0.0 or norm_b == 0.0: return 0.0
    return dot / (norm_a * norm_b)

def simple_string_similarity(s1, s2):
    s1 = re.sub(r'\W+', '', s1).lower()
    s2 = re.sub(r'\W+', '', s2).lower()
    if not s1 or not s2: return 0.0
    if s1 == s2: return 1.0
    from collections import Counter
    c1 = Counter(s1)
    c2 = Counter(s2)
    intersection = sum((c1 & c2).values())
    union = sum((c1 | c2).values())
    return intersection / union if union > 0 else 0.0

async def verify_bot_defense(db, event, config, agent_config, session_id, message) -> bool:
    """
    Executa a verificação de proteção anti-loop e limite de mensagens (Bot Defense).
    Retorna True se a automação deve ser pausada (bloqueada), False caso contrário.
    """
    if not getattr(agent_config, 'security_bot_protection', False):
        return False

    import webhook_tasks
    
    # 1. Checagem de limite máximo de mensagens por sessão
    max_msgs = getattr(agent_config, 'security_max_messages_per_session', 20) or 20
    try:
        total_session_msgs = db.query(InteractionLog).filter(
            InteractionLog.session_id == session_id
        ).count()
        
        if total_session_msgs >= max_msgs:
            webhook_tasks._add_step(
                db, event.id, 
                "🛡️ Bot Defense: Limite Excedido", 
                f"Sessão excedeu o limite máximo de {max_msgs} mensagens na sessão. Transferindo para suporte humano."
            )
            await _trigger_handoff(db, event, config)
            return True
    except Exception as e_limit:
        logger.error(f"Erro ao verificar limite de mensagens no Bot Defense: {e_limit}")

    # 2. Checagem de loop semântico (mensagens repetitivas do usuário)
    loop_count = getattr(agent_config, 'security_loop_count', 3) or 3
    if loop_count <= 1:
        return False
        
    threshold = getattr(agent_config, 'security_semantic_threshold', 0.85) or 0.85
    
    try:
        # Obter os logs de interação anteriores da mesma sessão
        past_logs = db.query(InteractionLog).filter(
            InteractionLog.session_id == session_id
        ).order_by(InteractionLog.timestamp.desc()).limit(loop_count - 1).all()
        
        if len(past_logs) >= loop_count - 1:
            # Comparar a mensagem atual com as mensagens anteriores
            curr_emb, _ = await get_embedding(message)
            
            loop_detected = True
            for log in past_logs:
                prev_msg = log.user_message
                if not prev_msg:
                    loop_detected = False
                    break
                
                # Primeiro tentar similaridade por embedding
                prev_emb, _ = await get_embedding(prev_msg)
                sim = 0.0
                if curr_emb and prev_emb:
                    sim = cosine_similarity(curr_emb, prev_emb)
                else:
                    # Fallback para similaridade simples de string
                    sim = simple_string_similarity(message, prev_msg)
                    
                if sim < threshold:
                    loop_detected = False
                    break
            
            if loop_detected:
                webhook_tasks._add_step(
                    db, event.id, 
                    "🛡️ Bot Defense: Loop Detectado", 
                    f"Mensagem atual é semanticamente idêntica às últimas {loop_count - 1} mensagens (Limiar: {threshold}). Transferindo para suporte humano."
                )
                await _trigger_handoff(db, event, config)
                return True
    except Exception as e_loop:
        logger.error(f"Erro ao verificar loop semântico no Bot Defense: {e_loop}")
        
    return False

async def _trigger_handoff(db, event, config):
    """Auxiliar para aplicar etiquetas de handoff no ZapVoice e pausar automação."""
    import webhook_tasks
    from zapvoice_utils import sync_conversation_labels
    import json
    
    cw_url = (config.chatwoot_url or os.getenv("CHATWOOT_URL", "")).rstrip("/")
    cw_token = config.chatwoot_api_token or os.getenv("CHATWOOT_API_TOKEN", "")
    
    to_add = ["humano"]
    if config.handoff_labels_to_add:
        try:
            to_add = json.loads(config.handoff_labels_to_add)
        except Exception:
            if isinstance(config.handoff_labels_to_add, list):
                to_add = config.handoff_labels_to_add
                
    to_remove = []
    if config.handoff_labels_to_remove:
        try:
            to_remove = json.loads(config.handoff_labels_to_remove)
        except Exception:
            if isinstance(config.handoff_labels_to_remove, list):
                to_remove = config.handoff_labels_to_remove
                
    if cw_url and cw_token and event.conversa_id and event.conta_id:
        try:
            await sync_conversation_labels(
                cw_url, 
                int(event.conta_id), 
                int(event.conversa_id), 
                cw_token, 
                to_add=to_add, 
                to_remove=to_remove
            )
            webhook_tasks._add_step(db, event.id, "🏷️ Handoff Aplicado", f"Etiquetas adicionadas: {to_add}, removidas: {to_remove}")
        except Exception as e_cw:
            logger.error(f"Erro ao sincronizar etiquetas de handoff no Bot Defense: {e_cw}")
