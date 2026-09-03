import logging
import json
from datetime import datetime, timezone
from typing import List, Optional, Any, Dict
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, func

from models import InteractionLog, SessionSummary, AgentConfigModel
from api.schemas import SessionPreview, SessionMessage, DeleteSessionsRequest
from api.deps import get_db, verify_api_key
from api.services.cost_service import calculate_ai_cost
from agent import summarize_history, extract_questions_from_history

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Sessions"])

@router.get("/sessions", response_model=List[SessionPreview])
async def list_sessions(
    agent_id: Optional[int] = None, 
    db: AsyncSession = Depends(get_db), 
    _: None = Depends(verify_api_key)
):
    """Lista todas as sessões de chat, com resumo e custo total."""
    # Subquery para estatísticas por sessão
    query = (
        select(
            InteractionLog.session_id,
            InteractionLog.agent_id,
            func.min(InteractionLog.timestamp).label("start_time"),
            func.max(InteractionLog.timestamp).label("last_interaction"),
            func.count(InteractionLog.id).label("message_count"),
            func.sum(InteractionLog.cost_brl).label("total_cost")
        )
        .group_by(InteractionLog.session_id, InteractionLog.agent_id)
        .order_by(func.max(InteractionLog.timestamp).desc())
    )
    
    if agent_id:
        query = query.where(InteractionLog.agent_id == agent_id)
        
    result = await db.execute(query)
    rows = result.all()
    
    session_ids = [row.session_id for row in rows]
    
    summaries = {}
    if session_ids:
        sum_result = await db.execute(select(SessionSummary).where(SessionSummary.session_id.in_(session_ids)))
        for s in sum_result.scalars().all():
            summaries[s.session_id] = {
                "text": s.summary_text,
                "is_tester": s.is_test_session
            }
            
    # Obter nomes dos agentes
    agent_ids = list(set([row.agent_id for row in rows if row.agent_id]))
    agent_names = {}
    if agent_ids:
        ag_result = await db.execute(select(AgentConfigModel.id, AgentConfigModel.name).where(AgentConfigModel.id.in_(agent_ids)))
        for a_id, a_name in ag_result.all():
            agent_names[a_id] = a_name

    sessions = []
    for row in rows:
        summary_data = summaries.get(row.session_id, {})
        sessions.append(SessionPreview(
            session_id=row.session_id,
            agent_id=row.agent_id,
            agent_name=agent_names.get(row.agent_id, "Desconhecido"),
            start_time=row.start_time.replace(tzinfo=timezone.utc) if row.start_time else None,
            last_interaction=row.last_interaction.replace(tzinfo=timezone.utc) if row.last_interaction else None,
            message_count=row.message_count,
            summary=summary_data.get("text", "Sem resumo disponível"),
            total_cost=row.total_cost or 0.0,
            is_test_session=summary_data.get("is_tester", False)
        ))
        
    return sessions

@router.get("/sessions/{session_id}/messages", response_model=List[SessionMessage])
async def get_session_messages(
    session_id: str, 
    db: AsyncSession = Depends(get_db), 
    _: None = Depends(verify_api_key)
):
    """Retorna todas as mensagens de uma sessão específica."""
    result = await db.execute(
        select(InteractionLog)
        .where(InteractionLog.session_id == session_id)
        .order_by(InteractionLog.timestamp.asc())
    )
    logs = result.scalars().all()
    
    messages = []
    for log in logs:
        # Mensagem do usuário
        messages.append(SessionMessage(
            role="user",
            content=log.user_message,
            timestamp=log.timestamp.replace(tzinfo=timezone.utc) if log.timestamp else datetime.now(timezone.utc),
            cost=0,
            tokens=log.input_tokens,
            input_tokens=log.input_tokens,
            output_tokens=0,
            model=None
        ))
        # Resposta do agente
        debug_obj = json.loads(log.debug_info) if log.debug_info else None
        is_cache = (log.model_used == "semantic-cache") or (bool(debug_obj.get("from_semantic_cache")) if debug_obj else False)

        messages.append(SessionMessage(
            role="assistant",
            content=log.agent_response,
            timestamp=log.timestamp.replace(tzinfo=timezone.utc) if log.timestamp else datetime.now(timezone.utc),
            cost=log.cost_brl or 0.0,
            tokens=(log.input_tokens or 0) + (log.output_tokens or 0),
            input_tokens=log.input_tokens or 0,
            cached_tokens=log.cached_tokens or 0,
            output_tokens=log.output_tokens or 0,
            model=log.model_used,
            debug=debug_obj,
            from_semantic_cache=is_cache,
            cached_similarity=debug_obj.get("cached_similarity") if debug_obj else None,
            cached_original_query=debug_obj.get("cached_original_query") if debug_obj else None
        ))
        
    return messages

@router.delete("/sessions")
async def delete_sessions(
    request: DeleteSessionsRequest, 
    db: AsyncSession = Depends(get_db), 
    _: None = Depends(verify_api_key)
):
    """Deleta múltiplas sessões e seus logs/resumos."""
    if not request.session_ids:
        return {"message": "Nenhum ID de sessão fornecido"}
        
    # Deletar logs e resumos
    await db.execute(delete(InteractionLog).where(InteractionLog.session_id.in_(request.session_ids)))
    await db.execute(delete(SessionSummary).where(SessionSummary.session_id.in_(request.session_ids)))
    await db.commit()
    return {"message": f"{len(request.session_ids)} sessões deletadas com sucesso."}

@router.get("/sessions/{session_id}/summarize")
async def summarize_session(
    session_id: str, 
    db: AsyncSession = Depends(get_db), 
    _: None = Depends(verify_api_key)
):
    """Gera ou recupera o resumo de uma sessão via IA."""
    # 1. Verificar cache no banco
    existing_result = await db.execute(select(SessionSummary).where(SessionSummary.session_id == session_id))
    existing_summary = existing_result.scalars().first()
    
    if existing_summary:
        return {
            "summary": existing_summary.summary_text,
            "is_cached": True,
            "cost_brl": existing_summary.cost_brl or 0.0
        }

    # 2. Buscar logs para gerar novo resumo
    result = await db.execute(
        select(InteractionLog)
        .where(InteractionLog.session_id == session_id)
        .order_by(InteractionLog.timestamp.asc())
    )
    logs = result.scalars().all()
    
    if not logs:
        raise HTTPException(status_code=404, detail="Sessão não encontrada")
    
    history = []
    for log in logs:
        history.append({"role": "user", "content": log.user_message})
        history.append({"role": "assistant", "content": log.agent_response})
    
    result_data = await summarize_history(history)
    summary_text = result_data["text"]
    usage = result_data.get("usage")
    
    cost_usd, cost_brl = 0.0, 0.0
    if usage:
        cost_usd, cost_brl = calculate_ai_cost("gpt-4o-mini", usage.prompt_tokens, usage.completion_tokens)

    # 3. Salvar no banco
    if "Falha" not in summary_text and "Erro" not in summary_text:
        new_summary = SessionSummary(
            session_id=session_id,
            agent_id=logs[0].agent_id,
            summary_text=summary_text,
            input_tokens=usage.prompt_tokens if usage else 0,
            output_tokens=usage.completion_tokens if usage else 0,
            cost_usd=cost_usd,
            cost_brl=cost_brl
        )
        db.add(new_summary)
        await db.commit()

    return {
        "summary": summary_text,
        "is_cached": False,
        "cost_brl": cost_brl
    }

@router.get("/sessions/{session_id}/questions")
async def extract_session_questions(
    session_id: str, 
    db: AsyncSession = Depends(get_db), 
    _: None = Depends(verify_api_key)
):
    """Extrai perguntas chave feitas pelo usuário durante a sessão."""
    result = await db.execute(
        select(InteractionLog)
        .where(InteractionLog.session_id == session_id)
        .order_by(InteractionLog.timestamp.asc())
    )
    logs = result.scalars().all()
    
    if not logs:
        raise HTTPException(status_code=404, detail="Sessão não encontrada")
    
    history = [{"role": "user", "content": log.user_message} for log in logs if log.user_message]
    return await extract_questions_from_history(history)

@router.get("/shared/session/{session_id}")
async def get_shared_session(session_id: str, db: AsyncSession = Depends(get_db)):
    """Rota pública para visualizar uma sessão compartilhada."""
    result_logs = await db.execute(
        select(InteractionLog)
        .where(InteractionLog.session_id == session_id)
        .order_by(InteractionLog.timestamp.asc())
    )
    logs = result_logs.scalars().all()

    if not logs:
        raise HTTPException(status_code=404, detail="Sessão não encontrada")

    agent_id = logs[0].agent_id
    result_agent = await db.execute(select(AgentConfigModel.name).where(AgentConfigModel.id == agent_id))
    agent_name = result_agent.scalar() or "Agente"

    messages = []
    for log in logs:
        messages.append({
            "role": "user",
            "content": log.user_message,
            "timestamp": log.timestamp.isoformat() if log.timestamp else None
        })
        messages.append({
            "role": "assistant",
            "content": log.agent_response,
            "timestamp": log.timestamp.isoformat() if log.timestamp else None,
            "model": log.model_used
        })
        
    return {
        "agent_name": agent_name,
        "messages": messages
    }

@router.get("/sessions/{session_id}/export-training")
async def export_session_for_training(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(verify_api_key)
):
    """Exporta uma sessão completa formatada para dataset de treinamento de IA."""
    result = await db.execute(
        select(InteractionLog)
        .where(InteractionLog.session_id == session_id)
        .order_by(InteractionLog.timestamp.asc())
    )
    logs = result.scalars().all()

    if not logs:
        raise HTTPException(status_code=404, detail="Sessão não encontrada ou sem mensagens registradas.")

    agent_id = logs[0].agent_id
    agent = None
    if agent_id:
        agent_res = await db.execute(select(AgentConfigModel).where(AgentConfigModel.id == agent_id))
        agent = agent_res.scalars().first()

    agent_name = agent.name if agent else "Agente Inteligente"
    system_prompt = (agent.system_prompt if agent else "") or "Você é um assistente virtual prestativo e humanizado."

    openai_messages = [{"role": "system", "content": system_prompt}]
    alpaca_pairs = []
    raw_turns = []
    turn_idx = 1

    for log in logs:
        if log.user_message:
            openai_messages.append({"role": "user", "content": log.user_message})
        if log.agent_response:
            openai_messages.append({"role": "assistant", "content": log.agent_response})

        if log.user_message and log.agent_response:
            alpaca_pairs.append({
                "instruction": log.user_message,
                "input": "",
                "output": log.agent_response,
                "turn": turn_idx,
                "timestamp": log.timestamp.isoformat() if log.timestamp else None
            })
            turn_idx += 1

        raw_turns.append({
            "id": log.id,
            "user_message": log.user_message,
            "agent_response": log.agent_response,
            "timestamp": log.timestamp.isoformat() if log.timestamp else None,
            "model_used": log.model_used,
            "cost_brl": log.cost_brl,
            "input_tokens": log.input_tokens,
            "output_tokens": log.output_tokens
        })

    return {
        "export_info": {
            "type": "agent_training_dataset",
            "version": "1.0",
            "exported_at": datetime.now(timezone.utc).isoformat(),
            "agent_id": agent_id,
            "agent_name": agent_name,
            "session_id": session_id,
            "total_messages": len(openai_messages) - 1,
            "total_pairs": len(alpaca_pairs)
        },
        "system_prompt": system_prompt,
        "openai_fine_tuning": {
            "messages": openai_messages
        },
        "alpaca_instruction_dataset": alpaca_pairs,
        "raw_conversation": raw_turns
    }

