import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text, delete
from typing import List, Optional

from models import AgentConfigModel, KnowledgeBaseModel, InteractionLog, SessionSummary
from api.schemas import DashboardStats, FinancialReport
from api.deps import get_db, verify_api_key

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Analytics"])

@router.get("/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats(db: AsyncSession = Depends(get_db), _: None = Depends(verify_api_key)):
    result_agents = await db.execute(select(func.count(AgentConfigModel.id)).where(AgentConfigModel.is_active == True))
    total_agents = result_agents.scalar() or 0

    result_kbs = await db.execute(select(func.count(KnowledgeBaseModel.id)))
    total_kbs = result_kbs.scalar() or 0

    result_interactions = await db.execute(select(func.count(InteractionLog.id)))
    total_interactions = result_interactions.scalar() or 0

    result_cost = await db.execute(select(func.sum(InteractionLog.cost_brl)))
    total_cost = result_cost.scalar() or 0.0

    return {
        "total_agents": total_agents,
        "total_knowledge_bases": total_kbs,
        "total_interactions": total_interactions,
        "total_cost": total_cost,
    }

@router.get("/financial/report", response_model=FinancialReport)
async def get_financial_report(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(verify_api_key)
):
    # Group by date and agent, adjusting for Brazil timezone (GMT-3)
    if db.bind and db.bind.dialect.name == "sqlite":
        date_field = func.date(InteractionLog.timestamp)
    else:
        tz_aware_timestamp = text("interaction_logs.timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo'")
        date_field = func.date(tz_aware_timestamp)
    
    query = (
        select(
            date_field.label("day"),
            InteractionLog.agent_id,
            AgentConfigModel.name.label("agent_name"),
            InteractionLog.model_used,
            func.count(InteractionLog.id).label("messages"),
            func.sum(InteractionLog.input_tokens + InteractionLog.output_tokens).label("tokens"),
            func.sum(InteractionLog.cost_brl).label("cost"),
            func.count(InteractionLog.session_id.distinct()).label("unique_sessions")
        )
        .outerjoin(AgentConfigModel, InteractionLog.agent_id == AgentConfigModel.id)
    )

    if start_date:
        query = query.where(date_field >= func.date(start_date))
    if end_date:
        query = query.where(date_field <= func.date(end_date))

    query = (
        query.group_by(date_field, InteractionLog.agent_id, AgentConfigModel.name, InteractionLog.model_used)
        .order_by(date_field.desc(), AgentConfigModel.name, InteractionLog.model_used)
    )
    
    result = await db.execute(query)
    rows = result.all()
    
    items = []
    grand_total = 0.0
    for row in rows:
        cost = float(row.cost or 0.0)
        tokens = int(row.tokens or 0)
        if cost == 0.0 and tokens == 0:
            continue
        messages = int(row.messages or 0)
        grand_total += cost

        if row.agent_name:
            display_name = f"{row.agent_name} ({('Resposta Automática (sem IA)' if row.model_used == 'shortcut-logic' else row.model_used) or 'N/A'})"
        elif row.model_used and "Simulador RAG" in row.model_used:
            display_name = row.model_used
        else:
            display_name = f"{row.agent_name or 'Uso Interno do Sistema'} ({('Resposta Automática (sem IA)' if row.model_used == 'shortcut-logic' else row.model_used) or 'N/A'})"

        items.append({
            "date": str(row.day),
            "agent_id": row.agent_id,
            "agent_name": display_name,
            "total_messages": messages,
            "total_tokens": tokens,
            "total_cost": cost,
            "avg_cost_per_message": cost / messages if messages > 0 else 0.0,
            "unique_sessions": int(row.unique_sessions or 0)
        })
    
    return {"items": items, "grand_total_cost": grand_total}
