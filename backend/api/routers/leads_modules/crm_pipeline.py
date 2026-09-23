import logging
import json
import os
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from api.deps import get_db, verify_api_key
from api.routers.leads_modules.time_utils import to_brasilia_time

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/leads/crm")
async def get_crm_pipeline_leads(
    product: Optional[str] = Query(None, description="Filtro de produto/integração pelo ID do webhook ou 'all'"),
    db: AsyncSession = Depends(get_db),
    _: None = Depends(verify_api_key)
):
    """
    Retorna todos os leads consolidados e classificados nos 6 estágios do CRM Kanban:
    1. template_enviado (Disparo Inicial / Template)
    2. retentativas (Ciclo 2 e 3 sem resposta)
    3. em_atendimento (Em conversa com IA)
    4. remarketing (Remarketing D+1 / Follow-up após conversa)
    5. comprou (Comprou o Curso / Aluno)
    6. desistiu (Não Converteu / Desistiu)
    """
    logger.info(f"Carregando leads para o CRM Kanban (filtro product='{product}')...")
    try:
        # 1. Obter todos os webhooks/produtos cadastrados para a lista de filtros do CRM
        wh_all_res = await db.execute(text("SELECT id, name, leads_table FROM webhook_configs ORDER BY id ASC"))
        products_list = [{"id": "all", "name": "Todos os Produtos"}]
        tables = []
        for wh_row in wh_all_res.fetchall():
            products_list.append({
                "id": str(wh_row[0]),
                "name": wh_row[1] or f"Produto #{wh_row[0]}",
                "leads_table": wh_row[2] or "leads"
            })
            if wh_row[2]:
                tables.append(wh_row[2])

        tables_to_query = set(tables)
        tables_to_query.add("leads")

        # 2. Pré-carregar configurações de Webhook e Agentes
        wh_res = await db.execute(text("""
            SELECT id, zapvoice_url, agent_id, purchased_label, followup_cancel_label, 
                   ignore_by_label, followup_steps, abandonment_delay_value, abandonment_delay_unit 
            FROM webhook_configs
        """))
        webhook_map = {}
        for r in wh_res.fetchall():
            steps_list = []
            if r[6]:
                try:
                    steps_list = json.loads(r[6]) if isinstance(r[6], str) else r[6]
                except Exception:
                    steps_list = []

            webhook_map[r[0]] = {
                "zapvoice_url": r[1],
                "agent_id": r[2],
                "purchased_label": r[3],
                "cancel_label": r[4],
                "ignore_label": r[5],
                "followup_steps": steps_list,
                "abandonment_delay_value": r[7] if r[7] is not None else 24,
                "abandonment_delay_unit": r[8] or "hours"
            }

        agents_res = await db.execute(text("SELECT id, name FROM agent_config"))
        agent_name_map = {row[0]: row[1] for row in agents_res.fetchall()}

        # 3. Pré-carregar telefones de vendas confirmadas
        sales_res = await db.execute(text("SELECT telefone, email, valor, plataforma FROM sales"))
        sales_phones = set()
        sales_data_map = {}
        for s in sales_res.fetchall():
            tel = s[0]
            if tel:
                clean_tel = "".join(filter(str.isdigit, str(tel)))
                sales_phones.add(clean_tel)
                sales_data_map[clean_tel] = {"valor": s[2], "plataforma": s[3]}

        columns_data = {
            "template_enviado": [],
            "retentativas": [],
            "em_atendimento": [],
            "remarketing": [],
            "comprou": [],
            "desistiu": []
        }

        all_leads_list = []

        for table in tables_to_query:
            try:
                has_agent_col = True
                try:
                    async with db.begin_nested():
                        query = text(f"""
                            SELECT 
                                id, webhook_config_id, conta_id, inbox_id, inbox_nome, conversa_id, contato_id,
                                telefone, labels, contato_nome, mensagem, followup_step, respostas_qualificacao,
                                lead_score, lead_classification, lead_justification, ultima_mensagem_em,
                                ultima_resposta_agente, updated_at, created_at, qualified_by_agent_id
                            FROM {table}
                        """)
                        db_leads = await db.execute(query)
                        rows = db_leads.fetchall()
                except Exception:
                    has_agent_col = False
                    async with db.begin_nested():
                        query = text(f"""
                            SELECT 
                                id, webhook_config_id, conta_id, inbox_id, inbox_nome, conversa_id, contato_id,
                                telefone, labels, contato_nome, mensagem, followup_step, respostas_qualificacao,
                                lead_score, lead_classification, lead_justification, ultima_mensagem_em,
                                ultima_resposta_agente, updated_at, created_at
                            FROM {table}
                        """)
                        db_leads = await db.execute(query)
                        rows = db_leads.fetchall()

                for row in rows:
                    wh_id = row[1]
                    wh_info = webhook_map.get(wh_id, {})

                    # Se houver filtro de produto/integração específico, aplicar filtro
                    if product and product != "all":
                        if str(wh_id) != str(product) and table != str(product):
                            continue

                    agent_id = row[20] if has_agent_col else None
                    if not agent_id and wh_id:
                        agent_id = wh_info.get("agent_id")
                    agent_name = agent_name_map.get(agent_id, "Não Identificado")

                    telefone_str = row[7] or ""
                    clean_phone = "".join(filter(str.isdigit, str(telefone_str)))
                    chatwoot_conv_url = f"https://web.whatsapp.com/send?phone={clean_phone}" if clean_phone else None

                    labels_raw = row[8] or ""
                    labels_list = []
                    if labels_raw:
                        try:
                            labels_list = json.loads(labels_raw) if isinstance(labels_raw, str) and labels_raw.startswith("[") else [l.strip() for l in labels_raw.split(",") if l.strip()]
                        except Exception:
                            labels_list = [l.strip() for l in str(labels_raw).split(",") if l.strip()]
                    labels_lower = [str(l).lower().strip() for l in labels_list]

                    purchased_tag = (wh_info.get("purchased_label") or "aluno").lower().strip()
                    cancel_tag = (wh_info.get("cancel_label") or "cancelar_robo").lower().strip()
                    ignore_tag = (wh_info.get("ignore_label") or "humano").lower().strip()

                    followup_step = row[11] if row[11] is not None else 0
                    has_qualificacao = bool(row[12] and str(row[12]).strip())
                    has_user_msg = bool(row[10] and str(row[10]).strip())

                    # Cálculo de Inatividade e Limite de Desistência
                    abandon_val = wh_info.get("abandonment_delay_value", 24)
                    abandon_unit = wh_info.get("abandonment_delay_unit", "hours")
                    if abandon_unit == "days":
                        abandon_minutes = abandon_val * 24 * 60
                    elif abandon_unit == "minutes":
                        abandon_minutes = abandon_val
                    else:
                        abandon_minutes = abandon_val * 60

                    cfg_steps = wh_info.get("followup_steps") or []
                    total_steps = len(cfg_steps)

                    # Tempo decorrido desde a última interação
                    ref_dt = row[16] or row[18] or row[19]  # ultima_mensagem_em or updated_at or created_at
                    now_utc = datetime.utcnow()
                    if ref_dt:
                        clean_ref_dt = ref_dt.replace(tzinfo=None) if hasattr(ref_dt, 'tzinfo') and ref_dt.tzinfo else ref_dt
                        elapsed_min = (now_utc - clean_ref_dt).total_seconds() / 60.0
                    else:
                        elapsed_min = 0.0

                    has_expired_abandonment = elapsed_min >= abandon_minutes

                    # DETERMINAÇÃO DO ESTÁGIO NO CRM
                    stage = "template_enviado"
                    has_bought = (
                        clean_phone in sales_phones or
                        purchased_tag in labels_lower or
                        any(tag in labels_lower for tag in ["aluno", "comprou", "cliente_ativo", "comprador"])
                    )

                    if has_bought:
                        stage = "comprou"
                    elif cancel_tag in labels_lower or ignore_tag in labels_lower or "desistiu" in labels_lower:
                        stage = "desistiu"
                    elif has_user_msg or has_qualificacao:
                        # Lead conversou com o agente de IA
                        if followup_step >= 1:
                            if total_steps > 0 and followup_step >= total_steps and has_expired_abandonment:
                                stage = "desistiu"
                            else:
                                stage = "remarketing"
                        else:
                            if has_expired_abandonment:
                                stage = "desistiu"
                            else:
                                stage = "em_atendimento"
                    elif followup_step >= 1:
                        # Lead recebeu re-tentativas e ainda NÃO respondeu
                        if total_steps > 0 and followup_step >= total_steps and has_expired_abandonment:
                            stage = "desistiu"
                        else:
                            stage = "retentativas"
                    else:
                        stage = "template_enviado"

                    lead_obj = {
                        "id": row[0],
                        "webhook_config_id": wh_id,
                        "conta_id": row[2],
                        "inbox_id": row[3],
                        "inbox_nome": row[4],
                        "conversa_id": row[5],
                        "contato_id": row[6],
                        "telefone": row[7],
                        "labels": labels_list,
                        "contato_nome": row[9] or "Sem Nome",
                        "mensagem": row[10],
                        "followup_step": followup_step,
                        "respostas_qualificacao": row[12],
                        "lead_score": row[13],
                        "lead_classification": row[14],
                        "lead_justification": row[15],
                        "ultima_mensagem_em": to_brasilia_time(row[16]).isoformat() if row[16] else None,
                        "ultima_resposta_agente": row[17],
                        "updated_at": to_brasilia_time(row[18]).isoformat() if row[18] else None,
                        "created_at": to_brasilia_time(row[19]).isoformat() if row[19] else None,
                        "leads_table": table,
                        "qualified_by_agent_id": agent_id,
                        "agent_name": agent_name,
                        "chatwoot_conversation_url": chatwoot_conv_url,
                        "stage": stage,
                        "source": "template" if followup_step > 0 or not has_user_msg else "organico",
                        "sale_info": sales_data_map.get(clean_phone)
                    }

                    columns_data[stage].append(lead_obj)
                    all_leads_list.append(lead_obj)

            except Exception as e_table:
                logger.warning(f"Erro ao ler leads da tabela {table} para CRM: {e_table}")

        total_leads = len(all_leads_list)
        total_comprou = len(columns_data["comprou"])
        total_atendimento = len(columns_data["em_atendimento"])
        conversion_rate = round((total_comprou / total_leads * 100), 1) if total_leads > 0 else 0.0

        return {
            "products": products_list,
            "selected_product": product or "all",
            "stats": {
                "total_leads": total_leads,
                "total_comprou": total_comprou,
                "total_em_atendimento": total_atendimento,
                "total_remarketing": len(columns_data["remarketing"]),
                "conversion_rate": conversion_rate
            },
            "columns": columns_data
        }

    except Exception as e:
        logger.error(f"Erro ao buscar leads do CRM: {e}")
        raise HTTPException(status_code=500, detail=f"Erro interno ao buscar CRM: {str(e)}")


@router.put("/leads/{table_name}/{lead_id}/crm-stage")
async def update_lead_crm_stage(
    table_name: str,
    lead_id: int,
    stage_payload: dict,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(verify_api_key)
):
    """
    Atualiza o estágio do lead manualmente via arrastar no Kanban do CRM.
    """
    new_stage = stage_payload.get("stage")
    if not new_stage:
        raise HTTPException(status_code=400, detail="Estágio 'stage' é obrigatório.")

    try:
        # Obter webhook config do lead para saber etiquetas
        q = text(f"SELECT webhook_config_id, labels FROM {table_name} WHERE id = :id")
        res = await db.execute(q, {"id": lead_id})
        lead_row = res.fetchone()
        if not lead_row:
            raise HTTPException(status_code=404, detail="Lead não encontrado.")

        wh_id, labels_raw = lead_row[0], lead_row[1]
        labels_list = []
        if labels_raw:
            try:
                labels_list = json.loads(labels_raw) if isinstance(labels_raw, str) and labels_raw.startswith("[") else [l.strip() for l in labels_raw.split(",") if l.strip()]
            except Exception:
                labels_list = [l.strip() for l in str(labels_raw).split(",") if l.strip()]

        wh_info = {}
        if wh_id:
            wh_q = await db.execute(text("SELECT purchased_label, followup_cancel_label, ignore_by_label FROM webhook_configs WHERE id = :id"), {"id": wh_id})
            wh_r = wh_q.fetchone()
            if wh_r:
                wh_info = {"purchased_label": wh_r[0], "cancel_label": wh_r[1], "ignore_label": wh_r[2]}

        purchased_tag = wh_info.get("purchased_label") or "aluno"
        cancel_tag = wh_info.get("cancel_label") or "cancelar_robo"

        followup_step = 0
        if new_stage == "comprou":
            followup_step = -1
            if purchased_tag not in labels_list:
                labels_list.append(purchased_tag)
        elif new_stage == "desistiu":
            followup_step = -1
            if cancel_tag not in labels_list:
                labels_list.append(cancel_tag)
        elif new_stage == "remarketing":
            followup_step = 1
        elif new_stage == "retentativas":
            followup_step = 1
        elif new_stage == "em_atendimento":
            followup_step = 0
        elif new_stage == "template_enviado":
            followup_step = 0

        update_q = text(f"""
            UPDATE {table_name}
            SET followup_step = :followup_step,
                labels = :labels,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = :id
        """)
        await db.execute(update_q, {
            "followup_step": followup_step,
            "labels": json.dumps(labels_list, ensure_ascii=False),
            "id": lead_id
        })
        await db.commit()

        return {"success": True, "lead_id": lead_id, "new_stage": new_stage}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao mover estágio do lead {lead_id} no CRM: {e}")
        raise HTTPException(status_code=500, detail=f"Erro interno ao atualizar estágio: {str(e)}")
