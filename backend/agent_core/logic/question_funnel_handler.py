import os
import logging
import math
from typing import Optional, Tuple, Dict, Any, List
from datetime import datetime, timezone
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
import inspect

from models import QuestionFunnelModel, LeadModel
from agent_core.models.usage import UsageLog
from services.rag.providers import get_embedding
from services.semantic_cache_service import cosine_similarity, clean_user_question_intro

logger = logging.getLogger(__name__)

async def handle_question_funnel_check(
    config,
    message: str,
    history: list,
    context_variables: dict,
    db,
    image_url: Optional[str] = None,
    performed_tool_calls: list = None,
    pre_executed_tool_calls: list = None,
    pre_executed_rag_context: Optional[str] = None,
    on_step: Optional[callable] = None,
    return_diagnostics: bool = False
) -> Tuple[Optional[dict], Optional[dict]]:
    """
    Verifica se a mensagem do lead ativa um Funil de Conversão por Dúvida (Áudio Humanizado + Mensagens Sequenciais).
    Prioriza o funil com maior similaridade semântica que ultrapasse o threshold configurado.
    Respeita a regra de frequência (once_per_lead vs always).
    Retorna (result_dict, diag) caso ativado, ou (None, diag) caso contrário.
    """
    diag = {
        "consulted": False,
        "status": "skipped",
        "status_label": "Dispensado",
        "matched_funnel_id": None,
        "matched_funnel_name": None,
        "similarity": 0.0,
        "similarity_pct": "0.0%",
        "threshold": 0.82,
        "frequency_mode": "once_per_lead",
        "steps_count": 0,
        "message": ""
    }

    if image_url or performed_tool_calls or pre_executed_tool_calls or not db or not getattr(config, 'id', None):
        if return_diagnostics:
            return None, diag
        return None, None

    clean_query = clean_user_question_intro(message)
    if not clean_query or len(clean_query) < 3:
        diag["message"] = "Mensagem muito curta para análise semântica de funil."
        if return_diagnostics:
            return None, diag
        return None, None

    diag["consulted"] = True

    try:
        # 1. Carregar funis ativos para este agente
        stmt = select(QuestionFunnelModel).where(
            QuestionFunnelModel.agent_id == config.id,
            QuestionFunnelModel.is_active == True
        )
        if isinstance(db, AsyncSession):
            res = await db.execute(stmt)
        else:
            raw = db.execute(stmt)
            res = await raw if inspect.isawaitable(raw) else raw
        active_funnels = res.scalars().all()

        if not active_funnels:
            diag["status"] = "no_funnels"
            diag["status_label"] = "Nenhum Funil Ativo"
            diag["message"] = "Nenhum funil por dúvida cadastrado para este agente."
            if return_diagnostics:
                return None, diag
            return None, None

        # 2. Obter lista de funis já executados para o lead
        executed_ids = set()
        # Do context_variables
        ctx_executed = context_variables.get("executed_question_funnels") or []
        if isinstance(ctx_executed, list):
            for fid in ctx_executed:
                try: executed_ids.add(int(fid))
                except: pass

        # Do banco de leads se houver identificador
        lead_id = context_variables.get("lead_id")
        telefone = context_variables.get("telefone")
        conversa_id = context_variables.get("conversa_id")
        lead_obj = None

        if (lead_id or telefone or conversa_id) and db:
            try:
                stmt_lead = None
                if lead_id:
                    stmt_lead = select(LeadModel).where(LeadModel.id == int(lead_id))
                elif telefone:
                    stmt_lead = select(LeadModel).where(LeadModel.telefone == str(telefone))
                elif conversa_id:
                    stmt_lead = select(LeadModel).where(LeadModel.conversa_id == str(conversa_id))

                if stmt_lead is not None:
                    if isinstance(db, AsyncSession):
                        res_lead = await db.execute(stmt_lead)
                    else:
                        raw_l = db.execute(stmt_lead)
                        res_lead = await raw_l if inspect.isawaitable(raw_l) else raw_l
                    lead_obj = res_lead.scalars().first()
                    if lead_obj and lead_obj.executed_question_funnels:
                        db_executed = lead_obj.executed_question_funnels
                        if isinstance(db_executed, list):
                            for fid in db_executed:
                                try: executed_ids.add(int(fid))
                                except: pass
            except Exception as e_lead:
                logger.debug(f"Não foi possível carregar executed_question_funnels do lead: {e_lead}")

        # 3. Gerar embedding da mensagem do lead
        try:
            query_embedding, _ = await get_embedding(clean_query)
        except Exception as e_emb:
            logger.warning(f"⚠️ [QUESTION FUNNEL] Falha ao gerar embedding para '{clean_query}': {e_emb}")
            diag["status"] = "embedding_error"
            diag["message"] = f"Erro na geração de embedding: {e_emb}"
            if return_diagnostics:
                return None, diag
            return None, None

        if not query_embedding:
            if return_diagnostics:
                return None, diag
            return None, None

        best_funnel = None
        best_similarity = 0.0
        best_matched_query = ""

        # 4. Avaliar similaridade com cada funil ativo
        for funnel in active_funnels:
            # Se for once_per_lead e já foi executado para este lead, pula
            if getattr(funnel, "frequency_mode", "once_per_lead") == "once_per_lead" and funnel.id in executed_ids:
                logger.debug(f"🎯 [QUESTION FUNNEL] Funil #{funnel.id} ('{funnel.name}') já disparado anteriormente para este lead. Pulando.")
                continue

            threshold = float(getattr(funnel, "similarity_threshold", 0.82) or 0.82)
            
            # Similaridade com a pergunta principal
            sim_main = 0.0
            if funnel.embedding:
                sim_main = cosine_similarity(query_embedding, funnel.embedding)

            # Similaridade com as variações cadastradas
            max_sim_var = 0.0
            var_query_matched = ""
            if funnel.variation_embeddings and isinstance(funnel.variation_embeddings, list):
                variations = funnel.trigger_variations or []
                for idx_v, var_emb in enumerate(funnel.variation_embeddings):
                    if var_emb:
                        s_v = cosine_similarity(query_embedding, var_emb)
                        if s_v > max_sim_var:
                            max_sim_var = s_v
                            var_query_matched = variations[idx_v] if idx_v < len(variations) else ""

            # Maior similaridade obtida neste funil
            if max_sim_var > sim_main:
                funnel_sim = max_sim_var
                matched_q = var_query_matched or funnel.trigger_question
            else:
                funnel_sim = sim_main
                matched_q = funnel.trigger_question

            logger.info(f"🎯 [QUESTION FUNNEL] Testando Funil #{funnel.id} ('{funnel.name}'): Similaridade={funnel_sim*100:.1f}% (Threshold={threshold*100:.1f}%)")

            if funnel_sim >= threshold and funnel_sim > best_similarity:
                best_similarity = funnel_sim
                best_funnel = funnel
                best_matched_query = matched_q

        # Se nenhum funil atingiu o limiar
        if not best_funnel:
            diag["status"] = "miss"
            diag["status_label"] = "Sem Match de Funil"
            diag["message"] = "Nenhum funil por dúvida atingiu a similaridade necessária."
            if return_diagnostics:
                return None, diag
            return None, None

        # 5. MATCH CONFIRMADO!
        threshold_used = float(getattr(best_funnel, "similarity_threshold", 0.82) or 0.82)
        logger.info(f"🚀 [QUESTION FUNNEL] Hit com {best_similarity*100:.1f}% no Funil #{best_funnel.id} ('{best_funnel.name}')! Disparando etapas pré-configuradas.")

        if on_step:
            on_step("🎯 Funil por Dúvida (Áudio & Sequência)", f"Hit de alta conversão ({best_similarity*100:.1f}%): '{best_funnel.name}'.")

        # Atualizar contadores e marcar execução para o lead
        try:
            executed_ids.add(best_funnel.id)
            context_variables["executed_question_funnels"] = list(executed_ids)
            
            # Incrementar total_executions no funil
            stmt_up_funnel = (
                update(QuestionFunnelModel)
                .where(QuestionFunnelModel.id == best_funnel.id)
                .values(total_executions=QuestionFunnelModel.total_executions + 1, updated_at=datetime.now(timezone.utc))
            )
            if isinstance(db, AsyncSession):
                await db.execute(stmt_up_funnel)
                if lead_obj:
                    stmt_up_lead = (
                        update(LeadModel)
                        .where(LeadModel.id == lead_obj.id)
                        .values(executed_question_funnels=list(executed_ids))
                    )
                    await db.execute(stmt_up_lead)
                await db.commit()
            else:
                db.execute(stmt_up_funnel)
                if lead_obj:
                    stmt_up_lead = (
                        update(LeadModel)
                        .where(LeadModel.id == lead_obj.id)
                        .values(executed_question_funnels=list(executed_ids))
                    )
                    db.execute(stmt_up_lead)
                db.commit()
        except Exception as e_up:
            logger.warning(f"⚠️ Erro ao persistir execução do funil no banco: {e_up}")

        base_public_url = (os.getenv("BACKEND_PUBLIC_URL") or os.getenv("CLOUDFLARE_TUNNEL_URL") or os.getenv("PUBLIC_URL") or os.getenv("BACKEND_URL", "http://localhost:8002")).rstrip("/")
        steps = []
        for s in (best_funnel.steps or []):
            st_dict = dict(s) if isinstance(s, dict) else s
            url = st_dict.get("media_url")
            if url and isinstance(url, str):
                if "minio:9000" in url or "minio/zap-voice" in url:
                    fname = url.split("?")[0].split("/")[-1]
                    if fname:
                        st_dict["media_url"] = f"{base_public_url}/api/question-funnels/media/{fname}"
                elif url.startswith("/"):
                    st_dict["media_url"] = f"{base_public_url}{url}"
            steps.append(st_dict)

        # Construir representação textual consolidada para a memória conversacional do assistente
        history_parts = []
        for st in steps:
            st_type = st.get("type", "text")
            if st_type == "audio":
                trans = st.get("transcription") or st.get("content") or "Áudio explicativo"
                history_parts.append(f"🎙️ [Áudio Humanizado Enviado: \"{trans}\"]")
            elif st_type in ("video", "image", "document"):
                cap = st.get("content") or st.get("caption") or ""
                history_parts.append(f"📁 [{st_type.upper()} Enviado: \"{cap}\"]")
            else:
                txt = st.get("content") or ""
                if txt.strip():
                    history_parts.append(txt.strip())

        consolidated_content = "\n\n".join(history_parts) if history_parts else f"🎯 [Funil '{best_funnel.name}' enviado com sucesso]"

        diag.update({
            "status": "hit",
            "status_label": "🎯 Funil Ativado (Custo Zero)",
            "matched_funnel_id": best_funnel.id,
            "matched_funnel_name": best_funnel.name,
            "matched_query": best_matched_query,
            "similarity": round(best_similarity, 4),
            "similarity_pct": f"{best_similarity * 100:.1f}%",
            "threshold": threshold_used,
            "frequency_mode": getattr(best_funnel, "frequency_mode", "once_per_lead"),
            "steps_count": len(steps),
            "message": f"Funil '{best_funnel.name}' ativado com {best_similarity*100:.1f}% de similaridade. Sequência de {len(steps)} passos disparada com sucesso."
        })

        result_dict = {
            "content": consolidated_content,
            "model": "question-funnel",
            "model_role": "question-funnel",
            "usage": UsageLog(0, 0, 0, 0),
            "error": False,
            "from_question_funnel": True,
            "funnel_id": best_funnel.id,
            "funnel_name": best_funnel.name,
            "funnel_similarity": round(best_similarity, 4),
            "funnel_steps": steps,
            "steps": steps,
            "question_funnel": diag,
            "handoff_data": {"handoff": False, "destino": None, "motivo": None},
            "debug": {
                "funnel_hit": True,
                "from_question_funnel": True,
                "funnel_id": best_funnel.id,
                "funnel_name": best_funnel.name,
                "similarity": round(best_similarity, 4),
                "similarity_pct": f"{best_similarity * 100:.1f}%",
                "threshold": threshold_used,
                "frequency_mode": getattr(best_funnel, "frequency_mode", "once_per_lead"),
                "steps_count": len(steps),
                "model_role": "question-funnel",
                "model": "question-funnel"
            }
        }

        return result_dict, diag

    except Exception as e:
        logger.error(f"❌ Erro crítico no processamento de Question Funnel: {e}", exc_info=True)
        diag["status"] = "error"
        diag["message"] = f"Erro: {e}"
        if return_diagnostics:
            return None, diag
        return None, None
