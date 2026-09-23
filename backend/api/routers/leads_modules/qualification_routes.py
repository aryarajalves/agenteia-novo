import logging
import json
import os
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text, select
from models import WebhookConfigModel
import sys
from api.deps import get_db, verify_api_key
from lead_scoring_service import calculate_lead_score as default_calculate_lead_score
from api.routers.leads_modules.time_utils import to_brasilia_time

logger = logging.getLogger(__name__)
router = APIRouter()


def _get_calculate_lead_score_func():
    leads_mod = sys.modules.get("api.routers.leads")
    if leads_mod and hasattr(leads_mod, "calculate_lead_score"):
        return getattr(leads_mod, "calculate_lead_score")
    return default_calculate_lead_score



@router.get("/leads/qualified")
async def list_qualified_leads(db: AsyncSession = Depends(get_db), _: None = Depends(verify_api_key)):
    """
    Consolida e lista todos os leads qualificados (que responderam a todas as perguntas)
    de todas as tabelas de leads cadastradas nas configurações do sistema.
    """
    logger.info("Listando leads qualificados consolidados...")
    
    try:
        # 1. Obter todas as tabelas de leads ativas
        res = await db.execute(text("SELECT DISTINCT leads_table FROM webhook_configs"))
        tables = [r[0] for r in res.fetchall() if r[0]]
        
        tables_to_query = set(tables)
        tables_to_query.add("leads")

        # Pré-carregar Webhooks e Agentes em memória para evitar N+1 queries
        webhook_configs_res = await db.execute(text("SELECT id, zapvoice_url, agent_id FROM webhook_configs"))
        webhook_map = {row[0]: {"zapvoice_url": row[1], "agent_id": row[2]} for row in webhook_configs_res.fetchall()}

        agents_res = await db.execute(text("SELECT id, name FROM agent_config"))
        agent_name_map = {row[0]: row[1] for row in agents_res.fetchall()}
        
        all_leads = []
        
        # 2. Consultar cada tabela
        for table in tables_to_query:
            try:
                has_agent_col = True
                try:
                    async with db.begin_nested():
                        query = text(f"""
                            SELECT 
                                id, webhook_config_id, conta_id, inbox_id, inbox_nome, conversa_id, contato_id,
                                telefone, labels, contato_nome, respostas_qualificacao, lead_score,
                                lead_classification, lead_justification, updated_at, created_at, qualified_by_agent_id
                            FROM {table}
                            WHERE respostas_qualificacao IS NOT NULL AND respostas_qualificacao != ''
                        """)
                        db_leads = await db.execute(query)
                        rows = db_leads.fetchall()
                except Exception:
                    has_agent_col = False
                    async with db.begin_nested():
                        query = text(f"""
                            SELECT 
                                id, webhook_config_id, conta_id, inbox_id, inbox_nome, conversa_id, contato_id,
                                telefone, labels, contato_nome, respostas_qualificacao, lead_score,
                                lead_classification, lead_justification, updated_at, created_at
                            FROM {table}
                            WHERE respostas_qualificacao IS NOT NULL AND respostas_qualificacao != ''
                        """)
                        db_leads = await db.execute(query)
                        rows = db_leads.fetchall()
                
                for row in rows:
                    wh_id = row[1]
                    wh_info = webhook_map.get(wh_id, {})
                    
                    # Nome do agente qualificador (via coluna ou via webhook)
                    agent_id = row[16] if has_agent_col else None
                    if not agent_id and wh_id:
                        agent_id = wh_info.get("agent_id")
                    agent_name = agent_name_map.get(agent_id, "Agente Não Identificado")
                    telefone_clean = "".join(filter(str.isdigit, str(row[7] or "")))
                    chatwoot_conv_url = f"https://web.whatsapp.com/send?phone={telefone_clean}" if telefone_clean else None

                    # Respostas decodificadas
                    raw_respostas = row[10]
                    respostas_decoded = []
                    if raw_respostas:
                        try:
                            respostas_decoded = json.loads(raw_respostas)
                        except Exception:
                            respostas_decoded = raw_respostas

                    lead_dict = {
                        "id": row[0],
                        "webhook_config_id": wh_id,
                        "conta_id": row[2],
                        "inbox_id": row[3],
                        "inbox_nome": row[4],
                        "conversa_id": row[5],
                        "contato_id": row[6],
                        "telefone": row[7],
                        "labels": row[8],
                        "contato_nome": row[9] or "Sem Nome",
                        "respostas_qualificacao": raw_respostas,
                        "respostas_decoded": respostas_decoded,
                        "lead_score": row[11] if row[12] is not None else None,
                        "lead_classification": row[12],
                        "lead_justification": row[13],
                        "updated_at": to_brasilia_time(row[14]).isoformat() if row[14] else None,
                        "created_at": to_brasilia_time(row[15]).isoformat() if row[15] else None,
                        "leads_table": table,
                        "qualified_by_agent_id": agent_id,
                        "agent_name": agent_name,
                        "chatwoot_conversation_url": chatwoot_conv_url
                    }
                    all_leads.append(lead_dict)
            except Exception as e:
                logger.warning(f"Erro ao ler leads da tabela {table}: {e}")
                
        # 4. Ordenar todos os leads por updated_at descendente
        all_leads.sort(key=lambda x: x.get("updated_at") or "", reverse=True)
        return all_leads
        
    except Exception as e:
        logger.error(f"Erro ao listar leads qualificados consolidados: {e}")
        raise HTTPException(status_code=500, detail=f"Erro interno ao listar leads qualificados: {str(e)}")


@router.post("/leads/{table_name}/{lead_id}/recalculate-score")
async def recalculate_lead_score_api(
    table_name: str, 
    lead_id: int, 
    db: AsyncSession = Depends(get_db), 
    _: None = Depends(verify_api_key)
):
    """
    Recalcula manualmente o lead score de um contato com base nas respostas salvas no banco
    e nos critérios atuais de qualificação configurados no agente.
    """
    logger.info(f"Recalculando score do lead {lead_id} na tabela {table_name}...")
    
    # 1. Buscar o lead correspondente
    try:
        query = text(f"""
            SELECT webhook_config_id, respostas_qualificacao, telefone, contato_nome
            FROM {table_name}
            WHERE id = :lead_id
        """)
        res = await db.execute(query, {"lead_id": lead_id})
        lead_row = res.fetchone()
        
        if not lead_row:
            raise HTTPException(status_code=404, detail="Lead não encontrado na tabela informada.")
            
        webhook_config_id = lead_row[0]
        respostas_str = lead_row[1]
        
        if not respostas_str:
            raise HTTPException(status_code=400, detail="Este lead não possui respostas qualificatórias salvas.")
            
        # 2. Encontrar o agente vinculado a esse webhook_config_id
        agent_id = None
        if webhook_config_id:
            wh_res = await db.execute(
                select(WebhookConfigModel.agent_id)
                .where(WebhookConfigModel.id == webhook_config_id)
            )
            agent_id = wh_res.scalar()
            
        if not agent_id:
            # Fallback buscando se for agente secundário
            if webhook_config_id:
                wh_sec_res = await db.execute(
                    select(WebhookConfigModel.agent_id, WebhookConfigModel.secondary_agent_ids)
                    .where(WebhookConfigModel.id == webhook_config_id)
                )
                wh_sec = wh_sec_res.fetchone()
                if wh_sec:
                    agent_id = wh_sec[0]
        
        if not agent_id:
            first_agent_res = await db.execute(text("SELECT id FROM agent_config WHERE is_active = TRUE LIMIT 1"))
            first_agent = first_agent_res.fetchone()
            if first_agent:
                agent_id = first_agent[0]
                
        if not agent_id:
            raise HTTPException(status_code=400, detail="Não foi possível identificar o Agente correspondente a este lead.")
            
        # 3. Chamar a IA para recalcular o score
        calc_func = _get_calculate_lead_score_func()
        score_data = await calc_func(db, agent_id, respostas_str)
        lead_score = score_data.get("lead_score", 0)
        lead_classification = score_data.get("lead_classification", "Frio ❄️")
        lead_justification = score_data.get("lead_justification", "")
        
        # 4. Salvar os novos dados no banco
        update_query = text(f"""
            UPDATE {table_name} SET
                lead_score = :lead_score,
                lead_classification = :lead_classification,
                lead_justification = :lead_justification,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = :lead_id
        """)
        await db.execute(update_query, {
            "lead_score": lead_score,
            "lead_classification": lead_classification,
            "lead_justification": lead_justification,
            "lead_id": lead_id
        })
        await db.commit()
        
        return {
            "success": True,
            "lead_score": lead_score,
            "lead_classification": lead_classification,
            "lead_justification": lead_justification
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao recalcular score do lead {lead_id} na API: {e}")
        raise HTTPException(status_code=500, detail=f"Erro interno ao recalcular score: {str(e)}")


@router.delete("/leads/{table_name}/{lead_id}")
async def delete_qualified_lead(
    table_name: str,
    lead_id: int,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(verify_api_key)
):
    """
    Remove a qualificação de um lead (desqualificação parcial).
    Zera as respostas, score, classificação, justificativa e agente qualificador no banco de dados,
    e remove a etiqueta "qualificado" das labels.
    """
    logger.info(f"Removendo qualificação do lead {lead_id} na tabela {table_name}...")
    try:
        # 1. Verificar se a tabela é válida para evitar injeção de SQL básico
        res_tables = await db.execute(text("SELECT DISTINCT leads_table FROM webhook_configs"))
        valid_tables = [r[0] for r in res_tables.fetchall() if r[0]]
        valid_tables.append("leads")
        
        if table_name not in valid_tables:
            raise HTTPException(status_code=400, detail="Tabela de leads inválida.")

        # 2. Buscar o lead correspondente
        query = text(f"SELECT labels FROM {table_name} WHERE id = :lead_id")
        res = await db.execute(query, {"lead_id": lead_id})
        lead_row = res.fetchone()
        
        if not lead_row:
            raise HTTPException(status_code=404, detail="Lead não encontrado.")
            
        labels_str = lead_row[0] or ""
        
        # 3. Remover a etiqueta "qualificado"
        labels_list = [l.strip() for l in labels_str.split(",") if l.strip()]
        if "qualificado" in labels_list:
            labels_list.remove("qualificado")
        new_labels_str = ",".join(labels_list)
        
        # 4. Atualizar o banco de dados limpando a qualificação
        update_query = text(f"""
            UPDATE {table_name} SET
                respostas_qualificacao = NULL,
                lead_score = NULL,
                lead_classification = NULL,
                lead_justification = NULL,
                qualified_by_agent_id = NULL,
                labels = :labels,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = :lead_id
        """)
        await db.execute(update_query, {
            "labels": new_labels_str,
            "lead_id": lead_id
        })
        await db.commit()
        
        return {"success": True, "message": "Qualificação de lead removida com sucesso."}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao remover qualificação do lead {lead_id} na API: {e}")
        raise HTTPException(status_code=500, detail=f"Erro interno ao remover qualificação: {str(e)}")


@router.delete("/leads/{table_name}/{lead_id}/full-delete")
async def delete_crm_lead(
    table_name: str,
    lead_id: int,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(verify_api_key)
):
    """
    Exclui permanentemente um lead da tabela de leads, do CRM e de contatos capturados (limpeza cross-platform).
    """
    logger.info(f"Excluindo lead {lead_id} permanentemente da tabela {table_name} e de todas as plataformas...")
    try:
        # 1. Obter dados do lead (telefone, webhook_config_id, conversa_id, conta_id) antes de deletar
        lead_row = None
        conversa_id = None
        conta_id = None
        try:
            query = text(f"SELECT id, webhook_config_id, telefone, conversa_id, conta_id FROM {table_name} WHERE id = :id")
            res_lead = await db.execute(query, {"id": lead_id})
            lead_row = res_lead.fetchone()
            if lead_row:
                conversa_id = lead_row[3]
                conta_id = lead_row[4]
        except Exception as e_find:
            logger.warning(f"Erro ao buscar lead {lead_id} na tabela {table_name}: {e_find}")

        phone = lead_row[2] if lead_row and lead_row[2] else None
        webhook_id = lead_row[1] if lead_row and lead_row[1] else 1

        # 2. Executar deleção unificada e completa (Limpa CRM, Contatos Capturados, Eventos, Memória e Triggers)
        from webhooks.service import delete_contact_data
        phones_to_delete = [phone] if phone else []
        await delete_contact_data(db, webhook_id, table_name, phones_to_delete, [lead_id])
        await db.commit()

        # Resetar etiquetas no ZapVoice se houver conversa_id
        if conversa_id:
            try:
                config = await db.get(WebhookConfigModel, webhook_id)
                if config:
                    from zapvoice_utils import get_default_reset_labels, reset_conversation_labels
                    zv_url = (getattr(config, "zapvoice_url", None) or os.getenv("ZAPVOICE_URL", "")).rstrip("/")
                    zv_token = getattr(config, "zapvoice_api_token", None) or os.getenv("ZAPVOICE_API_TOKEN", "")
                    if zv_url and zv_token:
                        eff_aid = conta_id or getattr(config, "zapvoice_client_id", None) or os.getenv("ZAPVOICE_CLIENT_ID", "")
                        reset_labels = get_default_reset_labels(config)
                        await reset_conversation_labels(zv_url, eff_aid, conversa_id, zv_token, reset_labels)
            except Exception as e_crm_lbl:
                logger.warning(f"Aviso ao resetar etiquetas no ZapVoice em delete_crm_lead: {e_crm_lbl}")

        # 3. Notificar clientes via WebSocket sobre a exclusão
        try:
            from core.websocket import manager
            await manager.broadcast({
                "type": "lead_update",
                "event": "crm_update",
                "action": "delete",
                "lead_id": lead_id,
                "table_name": table_name,
                "phone": phone
            })
        except Exception as e_ws:
            logger.warning(f"Erro ao enviar broadcast WS de exclusão: {e_ws}")

        return {"success": True, "lead_id": lead_id, "message": "Contato excluído com sucesso de todas as plataformas e do CRM."}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao excluir lead {lead_id} da tabela {table_name}: {e}")
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Erro interno ao excluir lead: {str(e)}")
