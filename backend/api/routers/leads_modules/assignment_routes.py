import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from api.deps import get_db, verify_api_key
from api.schemas import AssignFunnelRequest, AssignFollowupRequest

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/leads/assign-funnel")
async def assign_qualification_funnel(
    data: AssignFunnelRequest,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(verify_api_key)
):
    """
    Atribui um funil de qualificação específico e/ou fluxo de follow-up para uma lista de telefones de contatos (usado em disparos).
    """
    if not data.phones or (not data.funnel_id and not data.followup_id):
        raise HTTPException(status_code=400, detail="Telefones e ao menos funnel_id ou followup_id são obrigatórios.")

    clean_phones = [p.strip().replace("+", "").replace("-", "").replace(" ", "") for p in data.phones if p and p.strip()]
    if not clean_phones:
        return {"success": True, "funnel_id": data.funnel_id, "followup_id": data.followup_id, "updated_contacts": 0, "phones_received": 0}

    updated_count = 0
    try:
        # 1. Atualizar contatos existentes
        set_clauses = ["updated_at = CURRENT_TIMESTAMP"]
        params = {"phones": clean_phones}
        
        if data.funnel_id:
            set_clauses.append("active_qualification_funnel_id = :funnel_id")
            params["funnel_id"] = data.funnel_id
            
        if data.followup_id:
            set_clauses.append("active_followup_funnel_id = :followup_id")
            set_clauses.append("followup_step = 0")
            set_clauses.append("ultima_resposta_agente_em = CURRENT_TIMESTAMP")
            params["followup_id"] = data.followup_id

        query = text(f"""
            UPDATE leads
            SET {", ".join(set_clauses)}
            WHERE telefone = ANY(:phones)
        """)
        res = await db.execute(query, params)
        updated_count = res.rowcount

        # 2. Para telefones que ainda não existirem, criar registros prévios
        existing_res = await db.execute(text("SELECT telefone FROM leads WHERE telefone = ANY(:phones)"), {"phones": clean_phones})
        existing_phones = set(r[0] for r in existing_res.fetchall())
        missing_phones = [p for p in clean_phones if p not in existing_phones]

        for phone in missing_phones:
            await db.execute(text("""
                INSERT INTO leads (telefone, contato_nome, active_qualification_funnel_id, active_followup_funnel_id, followup_step, ultima_resposta_agente_em, created_at, updated_at)
                VALUES (:phone, :name, :funnel_id, :followup_id, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            """), {
                "phone": phone,
                "name": phone,
                "funnel_id": data.funnel_id,
                "followup_id": data.followup_id
            })
            updated_count += 1

        await db.commit()
    except Exception as e:
        logger.error(f"Erro ao atribuir funil/follow-up aos leads: {e}")
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Erro interno ao atribuir funil: {str(e)}")

    return {
        "success": True,
        "funnel_id": data.funnel_id,
        "followup_id": data.followup_id,
        "updated_contacts": updated_count,
        "phones_received": len(clean_phones)
    }


@router.post("/leads/assign-followup")
async def assign_followup_funnel(
    data: AssignFollowupRequest,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(verify_api_key)
):
    """
    Atribui um fluxo de follow-up específico para uma lista de telefones de contatos (usado em disparos em massa por produto).
    Reinicia automaticamente o lead para o Passo #1 (followup_step = 0).
    """
    if not data.phones or not data.followup_id:
        raise HTTPException(status_code=400, detail="Telefones e followup_id são obrigatórios.")

    clean_phones = [p.strip().replace("+", "").replace("-", "").replace(" ", "") for p in data.phones if p and p.strip()]
    if not clean_phones:
        return {"success": True, "followup_id": data.followup_id, "updated_contacts": 0, "phones_received": 0}

    updated_count = 0
    try:
        # 1. Atualizar contatos existentes na tabela principal de leads
        query = text("""
            UPDATE leads
            SET active_followup_funnel_id = :followup_id,
                followup_step = 0,
                ultima_resposta_agente_em = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE telefone = ANY(:phones)
        """)
        res = await db.execute(query, {
            "followup_id": data.followup_id,
            "phones": clean_phones
        })
        updated_count = res.rowcount

        # 2. Para contatos novos que ainda não existem no banco
        existing_res = await db.execute(text("SELECT telefone FROM leads WHERE telefone = ANY(:phones)"), {"phones": clean_phones})
        existing_phones = set(r[0] for r in existing_res.fetchall())
        missing_phones = [p for p in clean_phones if p not in existing_phones]

        for phone in missing_phones:
            await db.execute(text("""
                INSERT INTO leads (telefone, contato_nome, active_followup_funnel_id, followup_step, ultima_resposta_agente_em, created_at, updated_at)
                VALUES (:phone, :name, :followup_id, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            """), {
                "phone": phone,
                "name": phone,
                "followup_id": data.followup_id
            })
            updated_count += 1

        await db.commit()
        logger.info(f"🔁 Fluxo de follow-up '{data.followup_id}' atribuído com sucesso a {updated_count} contatos.")
    except Exception as e:
        logger.error(f"Erro ao atribuir fluxo de follow-up aos leads: {e}")
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Erro interno ao atribuir follow-up: {str(e)}")

    return {
        "success": True,
        "followup_id": data.followup_id,
        "updated_contacts": updated_count,
        "phones_received": len(clean_phones)
    }
