import os
import uuid
import asyncio
import logging
import math
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query, Request
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from sqlalchemy import select, update, delete, func, or_
from sqlalchemy.ext.asyncio import AsyncSession

from api.deps import get_db, verify_api_key
from models import QuestionFunnelModel, AgentConfigModel
from services.rag.providers import get_embedding
from services.semantic_cache_service import cosine_similarity, clean_user_question_intro
from s3_service import s3_service

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Question Funnels"])

def get_backend_public_base_url(request: Optional[Request] = None) -> str:
    """Retorna a URL base pública acessível pelo navegador e por webhooks externos."""
    env_public = (
        os.getenv("BACKEND_PUBLIC_URL")
        or os.getenv("CLOUDFLARE_TUNNEL_URL")
        or os.getenv("PUBLIC_URL")
        or os.getenv("BACKEND_URL")
        or os.getenv("VITE_API_URL")
    )
    if env_public and not any(h in env_public for h in ("minio:", "redis:", "db:")):
        return env_public.rstrip("/")
    if request:
        proto = request.headers.get("x-forwarded-proto", request.url.scheme)
        host = request.headers.get("x-forwarded-host") or request.headers.get("host")
        if host:
            return f"{proto}://{host}".rstrip("/")
        return str(request.base_url).rstrip("/")
    return "http://localhost:8002"

def normalize_funnel_steps_media_urls(steps: List[Dict[str, Any]], base_url: str) -> List[Dict[str, Any]]:
    """Converte hosts internos (como minio:9000) em URLs públicas de streaming da API."""
    if not steps:
        return []
    normalized = []
    for s in steps:
        st = dict(s) if isinstance(s, dict) else (s.model_dump() if hasattr(s, "model_dump") else s.dict())
        url = st.get("media_url")
        if url and isinstance(url, str):
            if "minio:9000" in url or "minio/zap-voice" in url:
                filename = url.split("?")[0].split("/")[-1]
                if filename:
                    st["media_url"] = f"{base_url}/api/question-funnels/media/{filename}"
            elif url.startswith("/"):
                st["media_url"] = f"{base_url}{url}"
        normalized.append(st)
    return normalized

# --- Schemas ---

class FunnelStepSchema(BaseModel):
    step_number: int = 1
    type: str = "text" # "audio" | "text" | "image" | "video" | "document"
    content: Optional[str] = ""
    media_url: Optional[str] = None
    media_type: Optional[str] = None
    transcription: Optional[str] = None
    delay_seconds: int = 0

class QuestionFunnelCreateSchema(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    trigger_question: str = Field(..., min_length=3)
    trigger_variations: Optional[List[str]] = []
    similarity_threshold: Optional[float] = 0.82
    frequency_mode: Optional[str] = "once_per_lead" # "once_per_lead" | "always"
    is_active: Optional[bool] = True
    steps: List[FunnelStepSchema] = []

class QuestionFunnelUpdateSchema(BaseModel):
    name: Optional[str] = None
    trigger_question: Optional[str] = None
    trigger_variations: Optional[List[str]] = None
    similarity_threshold: Optional[float] = None
    frequency_mode: Optional[str] = None
    is_active: Optional[bool] = None
    steps: Optional[List[FunnelStepSchema]] = None

class TestTriggerSchema(BaseModel):
    agent_id: int
    test_query: str

# --- Endpoints ---

@router.get("/agents/{agent_id}/question-funnels")
async def list_agent_question_funnels(
    agent_id: int,
    request: Request = None,
    page: Optional[int] = Query(None, ge=1, description="Número da página (1-indexed)"),
    page_size: int = Query(20, ge=1, le=100, description="Quantidade por página (padrão: 20)"),
    search: Optional[str] = Query(None, description="Termo para filtrar por nome ou pergunta gatilho"),
    db: AsyncSession = Depends(get_db),
    _: None = Depends(verify_api_key)
):
    """Lista os funis por dúvida do agente com suporte a paginação (20 por página) e busca otimizada."""
    base_url = get_backend_public_base_url(request)

    base_filter = [QuestionFunnelModel.agent_id == agent_id]
    if search and search.strip():
        term = f"%{search.strip()}%"
        base_filter.append(
            or_(
                QuestionFunnelModel.name.ilike(term),
                QuestionFunnelModel.trigger_question.ilike(term)
            )
        )

    # Se 'page' foi fornecido, processa com paginação server-side
    if page is not None:
        count_stmt = select(func.count(QuestionFunnelModel.id)).where(*base_filter)
        res_count = await db.execute(count_stmt)
        total_items = res_count.scalar() or 0

        active_stmt = select(func.count(QuestionFunnelModel.id)).where(
            QuestionFunnelModel.agent_id == agent_id,
            QuestionFunnelModel.is_active == True
        )
        res_active = await db.execute(active_stmt)
        active_count = res_active.scalar() or 0

        total_pages = math.ceil(total_items / page_size) if total_items > 0 else 1
        offset = (page - 1) * page_size

        stmt = (
            select(QuestionFunnelModel)
            .where(*base_filter)
            .order_by(QuestionFunnelModel.created_at.desc())
            .offset(offset)
            .limit(page_size)
        )
        res = await db.execute(stmt)
        funnels = res.scalars().all()

        items = [
            {
                "id": f.id,
                "agent_id": f.agent_id,
                "name": f.name,
                "trigger_question": f.trigger_question,
                "trigger_variations": f.trigger_variations or [],
                "similarity_threshold": f.similarity_threshold or 0.82,
                "frequency_mode": f.frequency_mode or "once_per_lead",
                "is_active": f.is_active,
                "steps": normalize_funnel_steps_media_urls(f.steps or [], base_url),
                "total_executions": f.total_executions or 0,
                "has_embedding": bool(f.embedding),
                "created_at": f.created_at.isoformat() if f.created_at else None,
                "updated_at": f.updated_at.isoformat() if f.updated_at else None
            }
            for f in funnels
        ]

        return {
            "items": items,
            "total": total_items,
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages,
            "active_count": active_count
        }

    # Se 'page' for None: manter retorno simples em lista para compatibilidade retroativa
    stmt = (
        select(QuestionFunnelModel)
        .where(*base_filter)
        .order_by(QuestionFunnelModel.created_at.desc())
    )
    res = await db.execute(stmt)
    funnels = res.scalars().all()

    return [
        {
            "id": f.id,
            "agent_id": f.agent_id,
            "name": f.name,
            "trigger_question": f.trigger_question,
            "trigger_variations": f.trigger_variations or [],
            "similarity_threshold": f.similarity_threshold or 0.82,
            "frequency_mode": f.frequency_mode or "once_per_lead",
            "is_active": f.is_active,
            "steps": normalize_funnel_steps_media_urls(f.steps or [], base_url),
            "total_executions": f.total_executions or 0,
            "has_embedding": bool(f.embedding),
            "created_at": f.created_at.isoformat() if f.created_at else None,
            "updated_at": f.updated_at.isoformat() if f.updated_at else None
        }
        for f in funnels
    ]


@router.post("/agents/{agent_id}/question-funnels")
async def create_question_funnel(
    agent_id: int,
    payload: QuestionFunnelCreateSchema,
    request: Request = None,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(verify_api_key)
):
    """Cria um novo funil por dúvida e calcula os embeddings da pergunta e das variações."""
    # Verificar existência do agente
    agent = await db.get(AgentConfigModel, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agente não encontrado.")

    clean_question = clean_user_question_intro(payload.trigger_question)
    if not clean_question:
        raise HTTPException(status_code=400, detail="A pergunta principal não pode ser vazia.")

    # 1. Calcular embedding da pergunta principal
    try:
        main_embedding, _ = await get_embedding(clean_question)
    except Exception as e:
        logger.error(f"Erro ao calcular embedding para question funnel: {e}")
        raise HTTPException(status_code=500, detail=f"Erro ao gerar embedding: {str(e)}")

    # 2. Calcular embeddings das variações
    clean_vars = [clean_user_question_intro(v) for v in (payload.trigger_variations or []) if clean_user_question_intro(v)]
    var_embeddings = []
    for v in clean_vars:
        try:
            v_emb, _ = await get_embedding(v)
            if v_emb:
                var_embeddings.append(v_emb)
        except Exception as e_v:
            logger.warning(f"Erro ao gerar embedding da variação '{v}': {e_v}")

    # 3. Formatar passos normalizando mídias
    base_url = get_backend_public_base_url(request)
    steps_data = normalize_funnel_steps_media_urls(
        [s.model_dump() if hasattr(s, "model_dump") else s.dict() for s in payload.steps],
        base_url
    )

    new_funnel = QuestionFunnelModel(
        agent_id=agent_id,
        name=payload.name.strip(),
        trigger_question=clean_question,
        trigger_variations=clean_vars,
        similarity_threshold=payload.similarity_threshold or 0.82,
        frequency_mode=payload.frequency_mode or "once_per_lead",
        is_active=payload.is_active if payload.is_active is not None else True,
        embedding=main_embedding,
        variation_embeddings=var_embeddings,
        steps=steps_data,
        total_executions=0,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc)
    )

    db.add(new_funnel)
    await db.commit()
    await db.refresh(new_funnel)

    logger.info(f"🎯 [QUESTION FUNNEL] Novo funil criado com sucesso: #{new_funnel.id} '{new_funnel.name}' (Agente {agent_id})")

    return {
        "id": new_funnel.id,
        "agent_id": new_funnel.agent_id,
        "name": new_funnel.name,
        "trigger_question": new_funnel.trigger_question,
        "trigger_variations": new_funnel.trigger_variations,
        "similarity_threshold": new_funnel.similarity_threshold,
        "frequency_mode": new_funnel.frequency_mode,
        "is_active": new_funnel.is_active,
        "steps": new_funnel.steps,
        "total_executions": new_funnel.total_executions,
        "created_at": new_funnel.created_at.isoformat() if new_funnel.created_at else None
    }


@router.get("/question-funnels/{funnel_id}")
async def get_question_funnel(
    funnel_id: int,
    request: Request = None,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(verify_api_key)
):
    """Obtém os detalhes de um funil por dúvida."""
    funnel = await db.get(QuestionFunnelModel, funnel_id)
    if not funnel:
        raise HTTPException(status_code=404, detail="Funil não encontrado.")

    base_url = get_backend_public_base_url(request)

    return {
        "id": funnel.id,
        "agent_id": funnel.agent_id,
        "name": funnel.name,
        "trigger_question": funnel.trigger_question,
        "trigger_variations": funnel.trigger_variations or [],
        "similarity_threshold": funnel.similarity_threshold or 0.82,
        "frequency_mode": funnel.frequency_mode or "once_per_lead",
        "is_active": funnel.is_active,
        "steps": normalize_funnel_steps_media_urls(funnel.steps or [], base_url),
        "total_executions": funnel.total_executions or 0,
        "created_at": funnel.created_at.isoformat() if funnel.created_at else None,
        "updated_at": funnel.updated_at.isoformat() if funnel.updated_at else None
    }


@router.put("/question-funnels/{funnel_id}")
async def update_question_funnel(
    funnel_id: int,
    payload: QuestionFunnelUpdateSchema,
    request: Request = None,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(verify_api_key)
):
    """Atualiza as configurações do funil por dúvida, recalculando embeddings se necessário."""
    funnel = await db.get(QuestionFunnelModel, funnel_id)
    if not funnel:
        raise HTTPException(status_code=404, detail="Funil não encontrado.")

    base_url = get_backend_public_base_url(request)

    if payload.name is not None:
        funnel.name = payload.name.strip()
    if payload.similarity_threshold is not None:
        funnel.similarity_threshold = payload.similarity_threshold
    if payload.frequency_mode is not None:
        funnel.frequency_mode = payload.frequency_mode
    if payload.is_active is not None:
        funnel.is_active = payload.is_active
    if payload.steps is not None:
        funnel.steps = normalize_funnel_steps_media_urls(
            [s.model_dump() if hasattr(s, "model_dump") else s.dict() for s in payload.steps],
            base_url
        )

    # Recalcular embeddings se pergunta ou variações mudaram
    recalc_main = False
    if payload.trigger_question is not None and payload.trigger_question != funnel.trigger_question:
        clean_q = clean_user_question_intro(payload.trigger_question)
        if clean_q:
            funnel.trigger_question = clean_q
            recalc_main = True

    if recalc_main or not funnel.embedding:
        try:
            m_emb, _ = await get_embedding(funnel.trigger_question)
            funnel.embedding = m_emb
        except Exception as e:
            logger.error(f"Erro ao recalcular embedding principal do funil {funnel_id}: {e}")

    if payload.trigger_variations is not None:
        clean_vars = [clean_user_question_intro(v) for v in payload.trigger_variations if clean_user_question_intro(v)]
        funnel.trigger_variations = clean_vars
        var_embeddings = []
        for v in clean_vars:
            try:
                v_emb, _ = await get_embedding(v)
                if v_emb:
                    var_embeddings.append(v_emb)
            except Exception as e_v:
                logger.warning(f"Erro ao recalcular embedding de variação '{v}': {e_v}")
        funnel.variation_embeddings = var_embeddings

    funnel.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(funnel)

    logger.info(f"🎯 [QUESTION FUNNEL] Funil #{funnel.id} atualizado com sucesso.")

    return {
        "id": funnel.id,
        "name": funnel.name,
        "trigger_question": funnel.trigger_question,
        "trigger_variations": funnel.trigger_variations,
        "similarity_threshold": funnel.similarity_threshold,
        "frequency_mode": funnel.frequency_mode,
        "is_active": funnel.is_active,
        "steps": funnel.steps,
        "total_executions": funnel.total_executions,
        "updated_at": funnel.updated_at.isoformat() if funnel.updated_at else None
    }


@router.delete("/question-funnels/{funnel_id}")
async def delete_question_funnel(
    funnel_id: int,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(verify_api_key)
):
    """Exclui um funil por dúvida."""
    funnel = await db.get(QuestionFunnelModel, funnel_id)
    if not funnel:
        raise HTTPException(status_code=404, detail="Funil não encontrado.")

    await db.delete(funnel)
    await db.commit()
    logger.info(f"🗑️ [QUESTION FUNNEL] Funil #{funnel_id} excluído com sucesso.")
    return {"message": "Funil excluído com sucesso.", "id": funnel_id}


@router.get("/question-funnels/media/{filename}")
@router.head("/question-funnels/media/{filename}")
@router.get("/api/question-funnels/media/{filename}")
@router.head("/api/question-funnels/media/{filename}")
async def get_funnel_media_file(filename: str):
    """Serve arquivo de mídia de funil com suporte a streaming e busca no S3/MinIO se necessário."""
    safe_filename = os.path.basename(filename)
    if not safe_filename or safe_filename != filename:
        raise HTTPException(status_code=400, detail="Nome de arquivo inválido.")

    local_dir = "tmp_uploads"
    os.makedirs(local_dir, exist_ok=True)
    local_path = os.path.join(local_dir, safe_filename)

    # Se não existe localmente, tentar baixar do MinIO / S3
    if not os.path.exists(local_path):
        s3_key = f"funnel-media/{safe_filename}"
        downloaded = False
        if hasattr(s3_service, "s3_client") and s3_service.s3_client:
            try:
                loop = asyncio.get_running_loop()
                await loop.run_in_executor(
                    None,
                    lambda: s3_service.s3_client.download_file(
                        s3_service.bucket_name,
                        s3_key,
                        local_path
                    )
                )
                downloaded = True
                logger.info(f"📥 Mídia baixada do S3 para cache local: {safe_filename}")
            except Exception as e:
                logger.warning(f"⚠️ Mídia {safe_filename} não encontrada no S3: {e}")

        if not downloaded and not os.path.exists(local_path):
            raise HTTPException(status_code=404, detail="Arquivo de mídia não encontrado.")

    ext = os.path.splitext(safe_filename)[1].lower()
    media_types = {
        ".ogg": "audio/ogg",
        ".mp3": "audio/mpeg",
        ".wav": "audio/wav",
        ".webm": "audio/webm",
        ".mp4": "video/mp4",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png"
    }
    media_type = media_types.get(ext, "application/octet-stream")

    return FileResponse(
        path=local_path,
        media_type=media_type,
        filename=safe_filename,
        headers={"Accept-Ranges": "bytes"}
    )


@router.post("/question-funnels/upload-media")
async def upload_funnel_media(
    request: Request,
    file: UploadFile = File(...),
    _: None = Depends(verify_api_key)
):
    """Faz upload de áudio/mídia para passos do funil, salvando localmente e no S3/MinIO."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="Arquivo sem nome.")

    ext = os.path.splitext(file.filename)[1].lower()
    if not ext:
        if file.content_type == "audio/ogg": ext = ".ogg"
        elif file.content_type == "audio/mp3": ext = ".mp3"
        elif file.content_type == "audio/wav": ext = ".wav"
        elif file.content_type == "audio/webm": ext = ".webm"
        elif file.content_type == "video/mp4": ext = ".mp4"
        elif file.content_type == "image/jpeg": ext = ".jpg"
        elif file.content_type == "image/png": ext = ".png"
        else: ext = ".mp3"

    filename = f"funnel_{uuid.uuid4()}{ext}"

    try:
        content = await file.read()
    except Exception as e:
        logger.error(f"Erro ao ler arquivo de mídia do funil: {e}")
        raise HTTPException(status_code=500, detail=f"Erro ao ler arquivo: {str(e)}")

    # 1. Salvar sempre localmente em tmp_uploads para resposta e streaming imediatos
    os.makedirs("tmp_uploads", exist_ok=True)
    local_path = os.path.join("tmp_uploads", filename)
    try:
        with open(local_path, "wb") as f:
            f.write(content)
    except Exception as e:
        logger.error(f"Erro ao salvar arquivo local de funil: {e}")
        raise HTTPException(status_code=500, detail=f"Erro ao salvar mídia: {str(e)}")

    # 2. Persistir no S3 / MinIO se configurado
    s3_configured = all([
        os.getenv("S3_ENDPOINT_URL"),
        os.getenv("S3_ACCESS_KEY"),
        os.getenv("S3_SECRET_KEY"),
        os.getenv("S3_BUCKET_NAME"),
    ])

    if s3_configured and hasattr(s3_service, "s3_client") and s3_service.s3_client:
        try:
            s3_key = f"funnel-media/{filename}"
            loop = asyncio.get_running_loop()
            await loop.run_in_executor(
                None,
                lambda: s3_service.s3_client.put_object(
                    Bucket=s3_service.bucket_name,
                    Key=s3_key,
                    Body=content,
                    ContentType=file.content_type or "audio/mpeg",
                )
            )
            logger.info(f"✅ Mídia de funil sincronizada com S3: {s3_key}")
        except Exception as e:
            logger.warning(f"⚠️ Falha no upload S3 de mídia de funil: {e}. Mantendo cópia local.")

    base_url = get_backend_public_base_url(request)
    media_url = f"{base_url}/api/question-funnels/media/{filename}"
    return {"media_url": media_url, "filename": filename, "storage": "s3_local"}


@router.post("/question-funnels/test-trigger")
async def test_funnel_trigger(
    payload: TestTriggerSchema,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(verify_api_key)
):
    """Testa uma mensagem contra os funis ativos do agente e retorna simulação de ativação."""
    clean_q = clean_user_question_intro(payload.test_query)
    if not clean_q or len(clean_q) < 2:
        return {"matched": False, "message": "Mensagem muito curta para análise."}

    stmt = select(QuestionFunnelModel).where(
        QuestionFunnelModel.agent_id == payload.agent_id,
        QuestionFunnelModel.is_active == True
    )
    res = await db.execute(stmt)
    funnels = res.scalars().all()

    if not funnels:
        return {"matched": False, "message": "Nenhum funil ativo encontrado para este agente."}

    query_emb, _ = await get_embedding(clean_q)
    if not query_emb:
        return {"matched": False, "message": "Falha ao gerar embedding para a pergunta de teste."}

    results = []
    best_match = None
    best_score = 0.0

    for f in funnels:
        score_main = cosine_similarity(query_emb, f.embedding) if f.embedding else 0.0
        score_vars = [cosine_similarity(query_emb, ve) for ve in (f.variation_embeddings or []) if ve]
        max_var = max(score_vars) if score_vars else 0.0
        funnel_score = max(score_main, max_var)

        thresh = float(f.similarity_threshold or 0.82)
        would_trigger = funnel_score >= thresh

        item_res = {
            "funnel_id": f.id,
            "name": f.name,
            "trigger_question": f.trigger_question,
            "similarity": round(funnel_score, 4),
            "similarity_pct": f"{funnel_score * 100:.1f}%",
            "threshold": thresh,
            "threshold_pct": f"{thresh * 100:.1f}%",
            "would_trigger": would_trigger
        }
        results.append(item_res)

        if would_trigger and funnel_score > best_score:
            best_score = funnel_score
            best_match = item_res

    return {
        "matched": best_match is not None,
        "best_match": best_match,
        "all_candidates": sorted(results, key=lambda x: x["similarity"], reverse=True)
    }
