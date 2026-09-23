import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text, select
from database import get_db
from models import WebhookConfigModel, GlobalContextVariableModel, UserMemoryModel

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/{webhook_id}/leads/{lead_id}/variables")
async def get_lead_variables(
    webhook_id: int,
    lead_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Retorna todas as variáveis globais do sistema e seus valores capturados/extraídos para um contato específico."""
    config = await db.get(WebhookConfigModel, webhook_id)
    if not config:
        raise HTTPException(status_code=404, detail="Webhook não encontrado")

    # Buscar dados do lead na tabela de leads
    query_lead = text(f"SELECT * FROM {config.leads_table} WHERE id = :lid AND webhook_config_id = :wid")
    res_lead = await db.execute(query_lead, {"lid": lead_id, "wid": webhook_id})
    row = res_lead.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Contato não encontrado")

    lead_dict = dict(zip(res_lead.keys(), row))
    telefone = lead_dict.get("telefone") or ""
    clean_tel = telefone.lstrip("+")

    # Coletar possíveis session_ids associados ao contato
    candidate_sids = {str(lead_id), telefone, clean_tel, f"+{clean_tel}", f"tel_{clean_tel}"}
    if lead_dict.get("conversa_id"):
        candidate_sids.add(str(lead_dict["conversa_id"]))

    # Buscar conversa_id em webhook_events caso existam
    if clean_tel:
        try:
            evt_query = text("""
                SELECT DISTINCT conversa_id 
                FROM webhook_events 
                WHERE webhook_config_id = :wid 
                AND (telefone = :t1 OR telefone = :t2)
                AND conversa_id IS NOT NULL AND conversa_id != ''
            """)
            evt_res = await db.execute(evt_query, {"wid": webhook_id, "t1": clean_tel, "t2": f"+{clean_tel}"})
            for (c_id,) in evt_res.fetchall():
                if c_id:
                    candidate_sids.add(str(c_id))
        except Exception as e_evt:
            logger.warning(f"Erro ao buscar conversa_ids de webhook_events: {e_evt}")

    all_sids = list(candidate_sids - {"", None, "None"})

    # Buscar todas as variáveis globais
    vars_stmt = select(GlobalContextVariableModel).order_by(GlobalContextVariableModel.id.asc())
    vars_res = await db.execute(vars_stmt)
    all_vars = vars_res.scalars().all()

    # Buscar memórias do usuário para os session_ids
    mem_dict = {}
    if all_sids:
        mem_stmt = (
            select(UserMemoryModel)
            .where(UserMemoryModel.session_id.in_(all_sids))
            .order_by(UserMemoryModel.updated_at.desc())
        )
        mem_res = await db.execute(mem_stmt)
        mems = mem_res.scalars().all()
        for m in mems:
            if m.key not in mem_dict:
                mem_dict[m.key] = m

    variables_data = []
    for v in all_vars:
        mem = mem_dict.get(v.key)
        val = None
        has_val = False
        origin = v.extraction_method or "integration"
        value_origin = "pending"
        is_default_value = False
        is_extracted_from_conversation = False
        matches_default = False
        updated_at = None
        source_message = None
        confidence = None

        has_default_val = v.value is not None and str(v.value).strip() != ""

        if mem and mem.value is not None and str(mem.value).strip() != "":
            val = mem.value
            has_val = True
            updated_at = mem.updated_at.isoformat() if mem.updated_at else None
            source_message = mem.source_message
            confidence = mem.confidence

            # Se possui source_message gravada da conversa, foi extraída pela IA no diálogo
            if source_message and str(source_message).strip():
                value_origin = "conversation_extracted"
                origin = "ai"
                is_extracted_from_conversation = True
                if has_default_val:
                    matches_default = str(val).strip().lower() == str(v.value).strip().lower()
            else:
                # Se não tem source_message e coincide com o valor padrão cadastrado, trata-se do valor padrão inicial
                if has_default_val and str(val).strip().lower() == str(v.value).strip().lower():
                    value_origin = "initial_default"
                    is_default_value = True
                    origin = "default"
                    matches_default = True
                else:
                    value_origin = "conversation_extracted"
                    origin = "ai" if v.extraction_method == "ai" else "memory"
                    is_extracted_from_conversation = True

        elif v.key in ["contact_name", "nome", "nome_cliente"] and (lead_dict.get("contato_nome") or "").strip():
            val = lead_dict.get("contato_nome").strip()
            has_val = True
            origin = "contact_profile"
            value_origin = "contact_profile"
        elif v.key in ["contact_phone", "telefone", "telefone_cliente"] and (telefone or "").strip():
            val = telefone.strip()
            has_val = True
            origin = "contact_profile"
            value_origin = "contact_profile"
        elif v.key in ["lead_id", "id_lead", "id_contato"]:
            val = str(lead_id)
            has_val = True
            origin = "system"
            value_origin = "system"
        elif has_default_val:
            # Não há registro no UserMemoryModel, mas a variável tem valor padrão configurado
            val = v.value
            has_val = True
            origin = "default"
            value_origin = "initial_default"
            is_default_value = True
            matches_default = True
        else:
            value_origin = "pending"
            origin = v.extraction_method or "integration"

        variables_data.append({
            "id": v.id,
            "key": v.key,
            "type": v.type or "string",
            "description": v.description or "",
            "extraction_method": v.extraction_method or "integration",
            "extraction_prompt": v.extraction_prompt or "",
            "default_value": v.value,
            "value": val,
            "has_value": has_val,
            "origin": origin,
            "value_origin": value_origin,
            "is_default_value": is_default_value,
            "is_extracted_from_conversation": is_extracted_from_conversation,
            "matches_default": matches_default,
            "updated_at": updated_at,
            "source_message": source_message,
            "confidence": confidence
        })

    total_captured = sum(1 for item in variables_data if item["has_value"])
    total_pending = sum(1 for item in variables_data if not item["has_value"])

    return {
        "lead": {
            "id": lead_dict.get("id"),
            "contato_nome": lead_dict.get("contato_nome") or lead_dict.get("nome"),
            "telefone": telefone,
            "labels": lead_dict.get("labels") or ""
        },
        "total_variables": len(variables_data),
        "total_captured": total_captured,
        "total_pending": total_pending,
        "variables": variables_data
    }
