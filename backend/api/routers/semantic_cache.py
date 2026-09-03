from typing import List, Optional
from datetime import datetime, timezone
import json
import logging
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, desc, or_, func, not_

from models import SemanticCacheModel, AgentConfigModel, WebhookEventModel, WebhookConfigModel
from api.deps import get_db, verify_api_key
from services.semantic_cache_service import save_semantic_cache, update_semantic_cache, list_semantic_caches

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/semantic-cache", tags=["Semantic Cache"])


class SaveCacheRequest(BaseModel):
    agent_id: int
    user_query: str
    approved_response: str
    alternate_queries: Optional[List[str]] = []
    client_id: Optional[int] = None
    similarity_threshold: Optional[float] = None
    category_tag: Optional[str] = None


class UpdateCacheRequest(BaseModel):
    user_query: Optional[str] = None
    approved_response: Optional[str] = None
    alternate_queries: Optional[List[str]] = None
    is_active: Optional[bool] = None
    similarity_threshold: Optional[float] = None
    clear_similarity_threshold: Optional[bool] = False
    category_tag: Optional[str] = None
    clear_category_tag: Optional[bool] = False


class CacheResponse(BaseModel):
    id: int
    agent_id: int
    user_query: str
    approved_response: str
    alternate_queries: Optional[List[str]] = []
    usage_count: int
    similarity_threshold: Optional[float] = None
    category_tag: Optional[str] = None
    is_active: bool
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class PaginatedCacheResponse(BaseModel):
    items: List[CacheResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class LeadQuestionItem(BaseModel):
    event_id: int
    user_query: str
    original_message: Optional[str] = None
    sub_index: Optional[int] = 0
    extracted_queries: Optional[List[str]] = []
    agent_response: Optional[str] = None
    from_cache: bool = False
    max_similarity: Optional[float] = None
    similarity_pct: Optional[str] = None
    cost: Optional[float] = None
    contact_name: Optional[str] = None
    contact_phone: Optional[str] = None
    created_at: Optional[str] = None


class PaginatedLeadQuestionsResponse(BaseModel):
    items: List[LeadQuestionItem]
    total: int
    no_cache_count: int
    has_cache_count: int
    page: int
    page_size: int
    total_pages: int


@router.post("", response_model=CacheResponse)
async def create_or_update_cache(
    request: SaveCacheRequest,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(verify_api_key)
):
    """Salva ou atualiza uma resposta aprovada no Cache Semântico com vetor de embedding, variações de pergunta e tag de produto."""
    try:
        cache_item = await save_semantic_cache(
            db=db,
            agent_id=request.agent_id,
            user_query=request.user_query,
            approved_response=request.approved_response,
            alternate_queries=request.alternate_queries,
            client_id=request.client_id,
            similarity_threshold=request.similarity_threshold,
            category_tag=request.category_tag
        )
        return CacheResponse(
            id=cache_item.id,
            agent_id=cache_item.agent_id,
            user_query=cache_item.user_query,
            approved_response=cache_item.approved_response,
            alternate_queries=cache_item.alternate_queries or [],
            usage_count=cache_item.usage_count or 0,
            similarity_threshold=cache_item.similarity_threshold,
            category_tag=cache_item.category_tag,
            is_active=cache_item.is_active,
            created_at=cache_item.created_at.isoformat() if cache_item.created_at else None,
            updated_at=cache_item.updated_at.isoformat() if cache_item.updated_at else None
        )
    except Exception as e:
        logger.error(f"Erro ao salvar cache semântico: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/tags", response_model=List[str])
async def get_agent_cache_tags(
    agent_id: int = Query(..., description="ID do agente"),
    db: AsyncSession = Depends(get_db),
    _: None = Depends(verify_api_key)
):
    """Retorna a lista de todas as tags/produtos distintos cadastrados no cache semântico do agente."""
    try:
        stmt = (
            select(SemanticCacheModel.category_tag)
            .where(
                SemanticCacheModel.agent_id == agent_id,
                SemanticCacheModel.category_tag.isnot(None),
                func.length(func.trim(SemanticCacheModel.category_tag)) > 0
            )
            .distinct()
        )
        res = await db.execute(stmt)
        tags = [r[0] for r in res.fetchall() if r[0]]
        return sorted(tags)
    except Exception as e:
        logger.error(f"Erro ao buscar tags do cache semântico: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("", response_model=PaginatedCacheResponse)
async def list_agent_cache(
    agent_id: int = Query(..., description="ID do agente"),
    search: Optional[str] = Query(None, description="Termo para filtrar"),
    category_tag: Optional[str] = Query(None, description="Filtrar por tag/produto específico"),
    page: int = Query(1, ge=1, description="Número da página"),
    page_size: int = Query(20, ge=1, le=100, description="Itens por página"),
    db: AsyncSession = Depends(get_db),
    _: None = Depends(verify_api_key)
):
    """Lista todas as respostas salvas no cache semântico com paginação, busca e filtro por produto/categoria."""
    try:
        items, total, total_pages = await list_semantic_caches(
            db=db,
            agent_id=agent_id,
            search=search,
            page=page,
            page_size=page_size,
            category_tag=category_tag
        )

        return PaginatedCacheResponse(
            items=[
                CacheResponse(
                    id=item.id,
                    agent_id=item.agent_id,
                    user_query=item.user_query,
                    approved_response=item.approved_response,
                    alternate_queries=item.alternate_queries or [],
                    usage_count=item.usage_count or 0,
                    similarity_threshold=item.similarity_threshold,
                    category_tag=item.category_tag,
                    is_active=item.is_active,
                    created_at=item.created_at.isoformat() if item.created_at else None,
                    updated_at=item.updated_at.isoformat() if item.updated_at else None
                )
                for item in items
            ],
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages
        )
    except Exception as e:
        logger.error(f"Erro ao listar cache semântico: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{cache_id}", response_model=CacheResponse)
async def edit_cache_item(
    cache_id: int,
    request: UpdateCacheRequest,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(verify_api_key)
):
    """Edita a pergunta, resposta, variações, limiar ou tag de um item do cache semântico e recalcula embeddings."""
    try:
        item = await update_semantic_cache(
            db=db,
            cache_id=cache_id,
            user_query=request.user_query,
            approved_response=request.approved_response,
            alternate_queries=request.alternate_queries,
            is_active=request.is_active,
            similarity_threshold=request.similarity_threshold,
            clear_similarity_threshold=request.clear_similarity_threshold or False,
            category_tag=request.category_tag,
            clear_category_tag=request.clear_category_tag or False
        )
        if not item:
            raise HTTPException(status_code=404, detail="Item de cache não encontrado.")

        return CacheResponse(
            id=item.id,
            agent_id=item.agent_id,
            user_query=item.user_query,
            approved_response=item.approved_response,
            alternate_queries=item.alternate_queries or [],
            usage_count=item.usage_count or 0,
            similarity_threshold=item.similarity_threshold,
            category_tag=item.category_tag,
            is_active=item.is_active,
            created_at=item.created_at.isoformat() if item.created_at else None,
            updated_at=item.updated_at.isoformat() if item.updated_at else None
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao editar item de cache semântico {cache_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao editar cache semântico: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/{cache_id}/toggle", response_model=CacheResponse)
async def toggle_cache_item(
    cache_id: int,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(verify_api_key)
):
    """Ativa ou desativa um item do cache semântico."""
    stmt = select(SemanticCacheModel).where(SemanticCacheModel.id == cache_id)
    res = await db.execute(stmt)
    item = res.scalars().first()
    if not item:
        raise HTTPException(status_code=404, detail="Item de cache não encontrado.")

    item.is_active = not item.is_active
    await db.commit()
    await db.refresh(item)

    return CacheResponse(
        id=item.id,
        agent_id=item.agent_id,
        user_query=item.user_query,
        approved_response=item.approved_response,
        alternate_queries=item.alternate_queries or [],
        usage_count=item.usage_count or 0,
        similarity_threshold=item.similarity_threshold,
        is_active=item.is_active,
        created_at=item.created_at.isoformat() if item.created_at else None,
        updated_at=item.updated_at.isoformat() if item.updated_at else None
    )


@router.delete("/{cache_id}")
async def delete_cache_item(
    cache_id: int,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(verify_api_key)
):
    """Exclui uma entrada do cache semântico."""
    stmt = select(SemanticCacheModel).where(SemanticCacheModel.id == cache_id)
    res = await db.execute(stmt)
    item = res.scalars().first()
    if not item:
        raise HTTPException(status_code=404, detail="Item de cache não encontrado.")

    await db.delete(item)
    await db.commit()
    return {"success": True, "message": "Item excluído do cache com sucesso."}


def _clean_query_text(text: Optional[str]) -> str:
    if not text:
        return ""
    import re
    t = text.lower().strip()
    t = re.sub(r'^[^\w\d]+|[^\w\d]+$', '', t)
    t = re.sub(r'\s+', ' ', t)
    return t.strip()


@router.get("/lead-questions", response_model=PaginatedLeadQuestionsResponse)
async def get_lead_questions_for_cache(
    agent_id: int = Query(..., description="ID do Agente"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    filter_status: str = Query("all", description="all | no_cache | has_cache"),
    db: AsyncSession = Depends(get_db),
    _: None = Depends(verify_api_key)
):
    """
    Retorna as perguntas reais enviadas por leads nos webhooks associados ao agente,
    permitindo identificar dúvidas recorrentes e adicioná-las diretamente ao Cache Semântico.
    """
    try:
        # 1. Encontrar os webhooks vinculados ao agente
        stmt_configs = select(WebhookConfigModel.id).where(WebhookConfigModel.agent_id == agent_id)
        res_configs = await db.execute(stmt_configs)
        config_ids = [r[0] for r in res_configs.fetchall()]

        # 1.1 Obter todas as perguntas e variações cadastradas ativas no Cache Semântico deste agente para sincronia em tempo real
        cached_stmt = select(SemanticCacheModel.user_query, SemanticCacheModel.alternate_queries).where(
            SemanticCacheModel.agent_id == agent_id,
            SemanticCacheModel.is_active.is_(True)
        )
        cached_res = await db.execute(cached_stmt)
        cached_rows = cached_res.all()

        existing_cached_queries = set()
        for uq, alts in cached_rows:
            if uq:
                q_clean = _clean_query_text(uq)
                if q_clean:
                    existing_cached_queries.add(q_clean)
                existing_cached_queries.add(uq.strip().lower())
            if alts and isinstance(alts, list):
                for alt in alts:
                    if isinstance(alt, str):
                        q_clean = _clean_query_text(alt)
                        if q_clean:
                            existing_cached_queries.add(q_clean)
                        existing_cached_queries.add(alt.strip().lower())

        # 2. Cláusula base para mensagens enviadas por leads (excluindo transcrições automáticas de imagem, áudio, stickers e follow-ups)
        base_conditions = [
            or_(WebhookEventModel.dono == "usuario", WebhookEventModel.dono.is_(None)),
            WebhookEventModel.event_type == "message",
            WebhookEventModel.mensagem.isnot(None),
            func.length(func.trim(WebhookEventModel.mensagem)) > 1,
            not_(WebhookEventModel.mensagem.ilike("A imagem mostra%")),
            not_(WebhookEventModel.mensagem.ilike("[Imagem%")),
            not_(WebhookEventModel.mensagem.ilike("[Foto%")),
            not_(WebhookEventModel.mensagem.ilike("[Áudio%")),
            not_(WebhookEventModel.mensagem.ilike("[Audio%")),
            not_(WebhookEventModel.mensagem.ilike("%Sticker%")),
            not_(WebhookEventModel.mensagem.ilike("🔄 [Follow-Up%")),
            not_(WebhookEventModel.processing_steps.ilike('%"ignored_for_cache": true%')),
            not_(WebhookEventModel.processing_steps.ilike('%"ignored_for_cache":true%')),
            or_(
                WebhookEventModel.message_type.is_(None),
                not_(WebhookEventModel.message_type.in_(["image", "audio", "video", "document"]))
            )
        ]
        if config_ids:
            base_conditions.append(WebhookEventModel.webhook_config_id.in_(config_ids))

        # Cláusula de detecção de cache hit na coluna processing_steps ou se já existe no banco de cache
        cache_hit_steps_clause = or_(
            WebhookEventModel.processing_steps.ilike('%"from_semantic_cache": true%'),
            WebhookEventModel.processing_steps.ilike('%"from_semantic_cache":true%'),
            WebhookEventModel.processing_steps.ilike('%"from_semantic_cache": "true"%'),
            WebhookEventModel.processing_steps.ilike('%"from_semantic_cache":"true"%'),
            WebhookEventModel.processing_steps.ilike('%"from_semantic_cache": "partial"%'),
            WebhookEventModel.processing_steps.ilike('%"from_semantic_cache":"partial"%'),
            WebhookEventModel.processing_steps.ilike('%"from_semantic_cache": "funnel"%'),
            WebhookEventModel.processing_steps.ilike('%"from_semantic_cache":"funnel"%')
        )

        clean_col = func.rtrim(func.lower(func.trim(WebhookEventModel.mensagem)), '?!., ')
        raw_lower_col = func.lower(func.trim(WebhookEventModel.mensagem))
        if existing_cached_queries:
            query_list = list(existing_cached_queries)
            cache_hit_clause = or_(
                cache_hit_steps_clause,
                clean_col.in_(query_list),
                raw_lower_col.in_(query_list)
            )
        else:
            cache_hit_clause = cache_hit_steps_clause

        # 3. Contadores globais por status (no_cache vs has_cache)
        count_base = select(
            func.count().label("total"),
            func.count().filter(cache_hit_clause).label("has_cache"),
            func.count().filter(or_(WebhookEventModel.processing_steps.is_(None), not_(cache_hit_clause))).label("no_cache")
        ).where(*base_conditions)
        
        counts_res = await db.execute(count_base)
        counts_row = counts_res.first()
        has_cache_count = counts_row.has_cache if counts_row else 0
        no_cache_count = counts_row.no_cache if counts_row else 0

        # 4. Construir query filtrada para paginação
        filtered_conditions = list(base_conditions)
        if filter_status == "has_cache":
            filtered_conditions.append(cache_hit_clause)
        elif filter_status == "no_cache":
            filtered_conditions.append(or_(WebhookEventModel.processing_steps.is_(None), not_(cache_hit_clause)))

        if search and search.strip():
            s_clean = f"%{search.strip()}%"
            filtered_conditions.append(
                or_(
                    WebhookEventModel.mensagem.ilike(s_clean),
                    WebhookEventModel.contato_nome.ilike(s_clean),
                    WebhookEventModel.telefone.ilike(s_clean)
                )
            )

        # Total filtrado
        filtered_total_stmt = select(func.count()).where(*filtered_conditions)
        filtered_total_res = await db.execute(filtered_total_stmt)
        filtered_total = filtered_total_res.scalar() or 0

        total_pages = max(1, (filtered_total + page_size - 1) // page_size)
        offset = (page - 1) * page_size

        # Buscar itens paginados
        query_items = (
            select(WebhookEventModel)
            .where(*filtered_conditions)
            .order_by(desc(WebhookEventModel.created_at), desc(WebhookEventModel.id))
            .offset(offset)
            .limit(page_size)
        )
        res_items = await db.execute(query_items)
        events = res_items.scalars().all()

        items: List[LeadQuestionItem] = []
        for ev in events:
            from_cache = False
            max_sim = None
            ev_cost = None
            extracted_qs = []
            diag_map = {}

            if ev.processing_steps:
                try:
                    steps_data = json.loads(ev.processing_steps) if isinstance(ev.processing_steps, str) else ev.processing_steps
                    if isinstance(steps_data, list):
                        for st in steps_data:
                            meta = st.get("metadata") or {}
                            if meta.get("from_semantic_cache") in (True, "true", "partial", "funnel"):
                                from_cache = True
                            if "max_similarity" in meta and meta["max_similarity"] is not None:
                                max_sim = float(meta["max_similarity"])
                            elif "similarity" in meta and meta["similarity"] is not None:
                                max_sim = float(meta["similarity"])

                            if "cost" in meta and meta["cost"] is not None:
                                try:
                                    ev_cost = float(meta["cost"])
                                except (ValueError, TypeError):
                                    pass

                            if meta.get("queries_evaluated"):
                                for q_item in meta["queries_evaluated"]:
                                    if isinstance(q_item, dict) and q_item.get("sub_query"):
                                        extracted_qs.append(q_item["sub_query"])
                                        if q_item.get("similarity"):
                                            diag_map[q_item["sub_query"].strip().lower()] = q_item
                except Exception:
                    pass

            if not extracted_qs and ev.mensagem:
                from services.semantic_cache_service import split_multi_questions
                try:
                    extracted_qs = split_multi_questions(ev.mensagem)
                except Exception:
                    extracted_qs = [ev.mensagem or ""]

            if not extracted_qs:
                extracted_qs = [ev.mensagem or ""]

            is_multi = len(extracted_qs) > 1

            for sub_idx, sub_q in enumerate(extracted_qs):
                clean_sub = _clean_query_text(sub_q)
                raw_clean_sub = sub_q.strip().lower() if sub_q else ""
                is_sub_cached = (clean_sub in existing_cached_queries or raw_clean_sub in existing_cached_queries) if (clean_sub or raw_clean_sub) else False
                
                sub_sim = max_sim
                sub_sim_pct = None
                sub_approved = False
                
                sub_key = sub_q.strip().lower()
                clean_key = _clean_query_text(sub_q)
                d = diag_map.get(sub_key) or diag_map.get(clean_key)
                if not d:
                    for k, v in diag_map.items():
                        if _clean_query_text(k) == clean_key or k in sub_key or sub_key in k:
                            d = v
                            break

                if d:
                    if d.get("similarity"):
                        sub_sim = float(d["similarity"])
                    if d.get("similarity_pct"):
                        sub_sim_pct = d["similarity_pct"]
                    if d.get("approved"):
                        sub_approved = True

                # Se a similaridade alcançou o limiar de aprovação (>= 85.0%), foi respondida por cache
                if sub_sim is not None and sub_sim >= 0.85:
                    sub_approved = True

                if is_sub_cached or sub_approved or (from_cache and not is_multi):
                    sub_from_cache = True
                    if is_sub_cached:
                        sub_sim = 1.0
                        sub_sim_pct = "100.0% · Já no Cache"
                    elif not sub_sim_pct:
                        sub_sim_pct = f"{sub_sim * 100:.1f}% · Respondida por Cache" if sub_sim is not None else "100.0% · Respondida por Cache"
                else:
                    sub_from_cache = False
                    if not sub_sim_pct:
                        sub_sim_pct = f"{sub_sim * 100:.1f}%" if sub_sim is not None else None

                # Filtrar conforme o filtro selecionado
                if filter_status == "no_cache" and sub_from_cache:
                    continue
                if filter_status == "has_cache" and not sub_from_cache:
                    continue

                items.append(LeadQuestionItem(
                    event_id=ev.id,
                    user_query=sub_q,
                    original_message=ev.mensagem if is_multi else None,
                    sub_index=sub_idx,
                    extracted_queries=extracted_qs,
                    agent_response=ev.agent_response,
                    from_cache=sub_from_cache,
                    max_similarity=round(sub_sim, 4) if sub_sim is not None else None,
                    similarity_pct=sub_sim_pct,
                    cost=ev_cost if sub_idx == 0 else 0.0,
                    contact_name=ev.contato_nome,
                    contact_phone=ev.telefone,
                    created_at=ev.created_at.isoformat() if ev.created_at else None
                ))

        return PaginatedLeadQuestionsResponse(
            items=items,
            total=filtered_total,
            no_cache_count=no_cache_count,
            has_cache_count=has_cache_count,
            page=page,
            page_size=page_size,
            total_pages=total_pages
        )
    except Exception as e:
        logger.error(f"Erro ao buscar dúvidas dos leads para cache: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/lead-questions/{event_id}/ignore")
async def ignore_lead_question(
    event_id: int,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(verify_api_key)
):
    """Marca uma dúvida de lead específica como ignorada/descartada para o Cache Semântico."""
    try:
        stmt = select(WebhookEventModel).where(WebhookEventModel.id == event_id)
        res = await db.execute(stmt)
        event = res.scalars().first()
        if not event:
            raise HTTPException(status_code=404, detail="Evento de webhook não encontrado.")
        
        # Atualiza a auditoria no processing_steps
        steps_data = []
        if event.processing_steps:
            try:
                parsed = json.loads(event.processing_steps) if isinstance(event.processing_steps, str) else event.processing_steps
                steps_data = parsed if isinstance(parsed, list) else [parsed]
            except Exception:
                steps_data = []
        
        # Adiciona step de ignore
        steps_data.append({
            "step": "semantic_cache_ignore",
            "metadata": {
                "ignored_for_cache": True,
                "ignored_at": datetime.now(timezone.utc).isoformat()
            }
        })
        event.processing_steps = json.dumps(steps_data)
        await db.commit()
        return {
            "success": True,
            "event_id": event_id,
            "message": "Pergunta ignorada para o cache semântico com sucesso."
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao ignorar dúvida do lead: {e}")
        raise HTTPException(status_code=500, detail=str(e))


