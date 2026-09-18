from typing import List, Optional, Dict, Any
import json
import logging
import os
import io
import uuid
import shutil
import time
import asyncio
import boto3
import pandas as pd
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query, BackgroundTasks, Response, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, func
from sqlalchemy.orm import selectinload
from sqlalchemy.orm.attributes import flag_modified

from models import KnowledgeBaseModel, KnowledgeItemModel, TranscriptionTaskModel, TranscriptionFolder
from database import async_session
from api.schemas import (
    KnowledgeBase, KnowledgeItem, KnowledgeItemDetail, BatchDeleteRequest,
    BatchUpdateRequest, BulkSummarizeRequest, MergeItemsRequest, 
    RAGSimulationRequest, CoverageCheckRequest, TranscriptionProcessRequest,
    BulkDeleteTranscriptionRequest, TranscriptionRenameRequest, 
    TranscriptionFolderRequest, TranscriptionMoveRequest, 
    ManualTranscriptionRequest, TranscriptionContentUpdateRequest,
    GenerateUploadUrlRequest, ConfirmUploadRequest,
    GenerateQAFromTranscriptionRequest, GenerateChunksFromTranscriptionRequest, AddBatchKnowledgeItemsRequest,
    AddVariationRequest
)
from api.deps import get_db, verify_api_key
from rag_service import (
    get_embedding, get_batch_embeddings, calculate_coverage,
    call_rag_llm, search_knowledge_base, EmbeddingGenerationError
)
from smart_importer import chunk_text, generate_global_qa
from s3_service import s3_service
from agent import get_openai_client

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Knowledge Base"])

# --- HELPERS PARA EXTRAÇÃO ---
async def extract_text_from_pdf(content: bytes):
    import pdfplumber
    text = ""
    with pdfplumber.open(io.BytesIO(content)) as pdf:
        for page in pdf.pages:
            text += page.extract_text() or ""
    return text

async def extract_text_from_docx(content: bytes):
    from docx import Document
    doc = Document(io.BytesIO(content))
    return "\n".join([p.text for p in doc.paragraphs])

async def background_s3_upload(local_path: str, s3_key: str, task_id: int, config_dict: dict):
    try:
        from tasks import process_transcription_task
        logger.info(f"BACKGROUND: Iniciando upload para S3 de {local_path} -> {s3_key}")
        
        loop = asyncio.get_running_loop()
        def do_upload():
            s3_client = boto3.client(
                's3',
                endpoint_url=s3_service.endpoint_url,
                aws_access_key_id=s3_service.access_key,
                aws_secret_access_key=s3_service.secret_key,
                region_name=s3_service.region
            )
            s3_client.upload_file(local_path, s3_service.bucket_name, s3_key)
            
        await loop.run_in_executor(None, do_upload)
        logger.info(f"BACKGROUND: Upload S3 concluído. Disparando Celery para task_id={task_id}")
        process_transcription_task.delay(task_id, s3_key, config_dict)
        
    except Exception as e:
        logger.error(f"Erro no background S3 upload: {e}", exc_info=True)
        async with async_session() as db:
            task = await db.get(TranscriptionTaskModel, task_id)
            if task:
                task.status = "FAILURE"
                task.error_message = f"Falha no upload para storage: {str(e)}"
                await db.commit()
    finally:
        if os.path.exists(local_path):
            try:
                os.remove(local_path)
            except Exception as rme:
                logger.error(f"Não conseguiu excluir temp local {local_path}: {rme}")

# --- KNOWLEDGE BASE ENDPOINTS ---

@router.get("/knowledge-bases", response_model=List[KnowledgeBase])
async def list_knowledge_bases(db: AsyncSession = Depends(get_db), _: None = Depends(verify_api_key)):
    result = await db.execute(select(KnowledgeBaseModel).options(selectinload(KnowledgeBaseModel.items)))
    return result.scalars().all()

@router.post("/knowledge-bases", response_model=KnowledgeBase)
async def create_knowledge_base(kb: KnowledgeBase, db: AsyncSession = Depends(get_db), _: None = Depends(verify_api_key)):
    result = await db.execute(select(KnowledgeBaseModel).where(KnowledgeBaseModel.name == kb.name))
    if result.scalars().first():
        raise HTTPException(status_code=400, detail="Já existe uma base de conhecimento com este nome.")

    db_kb = KnowledgeBaseModel(name=kb.name, description=kb.description, kb_type=kb.kb_type)
    db.add(db_kb)
    await db.commit()
    
    # Recarrega usando selectinload para evitar erro de lazy loading na serialização
    result = await db.execute(
        select(KnowledgeBaseModel)
        .where(KnowledgeBaseModel.id == db_kb.id)
        .options(selectinload(KnowledgeBaseModel.items))
    )
    return result.scalars().one()

@router.get("/knowledge-bases/{kb_id}", response_model=KnowledgeBase)
async def get_knowledge_base(kb_id: int, db: AsyncSession = Depends(get_db), _: None = Depends(verify_api_key)):
    result = await db.execute(
        select(KnowledgeBaseModel)
        .where(KnowledgeBaseModel.id == kb_id)
        .options(selectinload(KnowledgeBaseModel.items))
    )
    kb = result.scalars().first()
    if not kb:
        raise HTTPException(status_code=404, detail="Knowledge Base not found")
    return kb

@router.put("/knowledge-bases/{kb_id}", response_model=KnowledgeBase)
async def update_knowledge_base(kb_id: int, kb: KnowledgeBase, db: AsyncSession = Depends(get_db), _: None = Depends(verify_api_key)):
    result = await db.execute(select(KnowledgeBaseModel).where(KnowledgeBaseModel.id == kb_id))
    db_kb = result.scalars().first()
    if not db_kb:
        raise HTTPException(status_code=404, detail="Knowledge Base not found")
    
    if db_kb.name != kb.name:
        res_name = await db.execute(select(KnowledgeBaseModel).where(KnowledgeBaseModel.name == kb.name))
        if res_name.scalars().first():
            raise HTTPException(status_code=400, detail="Já existe uma base de conhecimento com este nome.")

    db_kb.name = kb.name
    db_kb.description = kb.description
    db_kb.kb_type = kb.kb_type
    db_kb.question_label = kb.question_label
    db_kb.answer_label = kb.answer_label
    db_kb.metadata_label = kb.metadata_label
    await db.commit()
    
    # Recarrega com items para evitar erro de lazy loading
    result = await db.execute(
        select(KnowledgeBaseModel)
        .where(KnowledgeBaseModel.id == kb_id)
        .options(selectinload(KnowledgeBaseModel.items))
    )
    return result.scalars().first()

@router.delete("/knowledge-bases/{kb_id}")
async def delete_knowledge_base(kb_id: int, db: AsyncSession = Depends(get_db), _: None = Depends(verify_api_key)):
    result = await db.execute(select(KnowledgeBaseModel).where(KnowledgeBaseModel.id == kb_id))
    kb = result.scalars().first()
    if not kb:
        raise HTTPException(status_code=404, detail="Knowledge Base not found")
    await db.delete(kb)
    await db.commit()
    return {"message": "Knowledge Base deleted"}

@router.post("/knowledge-bases/batch-delete")
async def batch_delete_knowledge_bases(request: BatchDeleteRequest, db: AsyncSession = Depends(get_db), _: None = Depends(verify_api_key)):
    if not request.item_ids:
        return {"message": "No bases to delete"}
    await db.execute(delete(KnowledgeBaseModel).where(KnowledgeBaseModel.id.in_(request.item_ids)))
    await db.commit()
    return {"message": f"Deleted {len(request.item_ids)} knowledge bases"}

@router.post("/knowledge-bases/{kb_id}/propose-merge")
async def propose_kb_merge(kb_id: int, request: MergeItemsRequest, db: AsyncSession = Depends(get_db), _: None = Depends(verify_api_key)):
    if len(request.item_ids) < 2:
        raise HTTPException(status_code=400, detail="Selecione ao menos 2 itens para mesclar.")
    try:
        res = await db.execute(select(KnowledgeItemModel).where(KnowledgeItemModel.id.in_(request.item_ids)))
        items = res.scalars().all()
        if not items: raise HTTPException(status_code=404, detail="Itens não encontrados.")
        
        context = "".join([f"VARIANTE {idx+1}:\nPergunta: {i.question}\nResposta: {i.answer}\n\n" for idx, i in enumerate(items)])
        prompt = f"Sintetize estas VARIANTES em 1 Pergunta e 1 Resposta JSON:\n{context}"
        
        response = await call_rag_llm(messages=[{"role": "user", "content": prompt}], response_format={"type": "json_object"})
        return {"proposed": json.loads(response.choices[0].message.content), "original_ids": request.item_ids}
    except Exception as e:
        logger.error(f"Erro ao propor mesclagem: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/knowledge-bases/{kb_id}/simulate-rag")
async def simulate_rag(kb_id: int, request: RAGSimulationRequest, db: AsyncSession = Depends(get_db), _: None = Depends(verify_api_key)):
    try:
        result = await search_knowledge_base(
            db=db, query=request.query, kb_id=kb_id, limit=request.limit,
            model="gpt-4o-mini", fallback_model="gpt-4o-mini",
            force_translation=request.translation_enabled,
            force_multi_query=request.multi_query_enabled,
            force_rerank=request.rerank_enabled,
            force_agentic_eval=request.agentic_eval_enabled,
            force_parent_expansion=request.parent_expansion_enabled,
            similarity_threshold=request.relevance_threshold or 0.0
        )
        # search_knowledge_base pode retornar (items, usage) nos early-returns (ex: sem
        # itens/base inválida) ou (items, discarded_items, usage) no caminho normal com
        # resultado. Desempacotar de forma defensiva evita o ValueError ("too many values
        # to unpack") que fazia o simulador quebrar silenciosamente sempre que a busca
        # de fato encontrava itens candidatos (justamente o caso que deveria funcionar).
        discarded_items = []
        if isinstance(result, tuple) and len(result) == 3:
            items, discarded_items, usage = result
        elif isinstance(result, tuple) and len(result) == 2:
            items, usage = result
        else:
            items, usage = result or [], None

        p_tok = getattr(usage, "prompt_tokens", 0) if usage else 0
        c_tok = getattr(usage, "completion_tokens", 0) if usage else 0
        total_tokens = p_tok + c_tok
        cost_usd = 0.0
        cost_brl = 0.0

        # Registra o consumo de tokens na tabela InteractionLog para contabilizar no Painel Financeiro
        if total_tokens > 0:
            try:
                from api.services.cost_service import calculate_ai_cost
                from models import InteractionLog, KnowledgeBaseModel
                from datetime import datetime, timezone
                from config_store import USD_TO_BRL

                kb_res = await db.execute(select(KnowledgeBaseModel).where(KnowledgeBaseModel.id == kb_id))
                kb = kb_res.scalars().first()
                kb_name = kb.name if kb else f"Base #{kb_id}"

                # Modelo usado para cálculo de custo (gpt-4o-mini se usou filtros de IA com completion, ou embedding)
                model_used_name = "gpt-4o-mini" if c_tok > 0 else "text-embedding-3-small"
                cost_usd, cost_brl = calculate_ai_cost(model_used_name, p_tok, c_tok)
                if cost_usd == 0.0:
                    cost_usd = total_tokens * 0.00000002
                    cost_brl = cost_usd * USD_TO_BRL

                sim_log = InteractionLog(
                    agent_id=None,
                    session_id=f"SYS_RAG_SIMULATOR_KB_{kb_id}",
                    user_message=f"Simulador RAG ({kb_name}): {request.query[:120]}",
                    agent_response=f"Retornou {len(items or [])} itens ({len(discarded_items or [])} descartados).",
                    model_used=f"Simulador RAG ({model_used_name})",
                    input_tokens=p_tok,
                    output_tokens=c_tok,
                    cost_usd=cost_usd,
                    cost_brl=cost_brl,
                    timestamp=datetime.now(timezone.utc)
                )
                db.add(sim_log)
                await db.commit()
                logger.info(f"🪙 Simulador RAG registrado no financeiro: {total_tokens} tokens (R$ {cost_brl:.6f})")
            except Exception as e_log:
                logger.warning(f"Não foi possível gravar log financeiro do simulador: {e_log}")

        sub_queries = getattr(usage, "sub_queries", [request.query]) if usage else [request.query]
        grouped_results = getattr(usage, "grouped_results", []) if usage else []
        if not grouped_results:
            grouped_results = [{
                "sub_query": request.query,
                "items": items or [],
                "discarded_items": discarded_items or []
            }]

        return {
            "items": items or [],
            "discarded_items": discarded_items or [],
            "sub_queries": sub_queries,
            "grouped_results": grouped_results,
            "usage": {
                "prompt_tokens": p_tok,
                "completion_tokens": c_tok,
                "total_tokens": total_tokens,
                "cost_usd": cost_usd,
                "cost_brl": cost_brl
            }
        }
    except Exception as e:
        logger.error(f"Erro no simulador de RAG (kb_id={kb_id}, query='{request.query}'): {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Erro ao simular a busca RAG: {str(e)}")

@router.post("/knowledge-bases/{kb_id}/coverage")
async def check_coverage(kb_id: int, payload: CoverageCheckRequest, db: AsyncSession = Depends(get_db), _: None = Depends(verify_api_key)):
    results = await calculate_coverage(db, payload.questions, kb_id)
    return {"results": results}

@router.post("/knowledge-bases/{kb_id}/upload")
async def upload_kb_file(kb_id: int, file: UploadFile = File(...), db: AsyncSession = Depends(get_db), _: None = Depends(verify_api_key)):
    content = await file.read()
    filename = file.filename.lower()
    text = ""
    if filename.endswith(".pdf"): text = await extract_text_from_pdf(content)
    elif filename.endswith(".docx"): text = await extract_text_from_docx(content)
    else: text = content.decode("utf-8", errors="ignore")

    lines = [l.strip() for l in text.split("\n") if len(l.strip()) > 20]
    for line in lines:
        db.add(KnowledgeItemModel(knowledge_base_id=kb_id, question=f"Informação de {file.filename}", answer=line, category="Upload"))
    await db.commit()
    return {"message": f"Extraído {len(lines)} itens do arquivo {file.filename}"}

@router.get("/knowledge-bases/{kb_id}/export")
async def export_knowledge_base(kb_id: int, db: AsyncSession = Depends(get_db), _: None = Depends(verify_api_key)):
    result = await db.execute(
        select(KnowledgeBaseModel)
        .where(KnowledgeBaseModel.id == kb_id)
        .options(selectinload(KnowledgeBaseModel.items))
    )
    kb = result.scalars().first()
    if not kb:
        raise HTTPException(status_code=404, detail="Base de conhecimento não encontrada")
    
    export_data = {
        "name": kb.name,
        "description": kb.description,
        "kb_type": kb.kb_type,
        "question_label": kb.question_label,
        "answer_label": kb.answer_label,
        "metadata_label": kb.metadata_label,
        "version": "1.0",
        "exported_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "items": [
            {
                "question": item.question,
                "answer": item.answer,
                "category": item.category,
                "metadata_val": item.metadata_val,
                "question_variations": item.question_variations or []
            }
            for item in (kb.items or [])
        ]
    }
    
    filename = f"base_conhecimento_{kb_id}.json"
    headers = {"Content-Disposition": f'attachment; filename="{filename}"'}
    return Response(content=json.dumps(export_data, ensure_ascii=False, indent=2), media_type="application/json", headers=headers)

def get_item_embedding_text(question: str, variations: Optional[List[str]] = None) -> str:
    """Combina pergunta e suas variações para gerar vetor semântico composto."""
    clean_q = (question or "").strip()
    if variations and isinstance(variations, list):
        clean_vars = [v.strip() for v in variations if isinstance(v, str) and v.strip()]
        if clean_vars:
            return f"{clean_q}\n" + "\n".join(clean_vars)
    return clean_q

@router.post("/knowledge-bases/{kb_id}/import")
async def import_knowledge_base_items(
    kb_id: int, 
    request: Request,
    file: Optional[UploadFile] = File(None),
    db: AsyncSession = Depends(get_db), 
    _: None = Depends(verify_api_key)
):
    result = await db.execute(select(KnowledgeBaseModel).where(KnowledgeBaseModel.id == kb_id))
    kb = result.scalars().first()
    if not kb:
        raise HTTPException(status_code=404, detail="Base de conhecimento não encontrada")
    
    raw_data = None
    if file:
        content = await file.read()
        try:
            raw_data = json.loads(content.decode("utf-8"))
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Arquivo JSON inválido: {str(e)}")
    else:
        try:
            body = await request.body()
            if body:
                raw_data = json.loads(body.decode("utf-8"))
        except Exception:
            pass
            
    if not raw_data:
        raise HTTPException(status_code=400, detail="Nenhum arquivo ou JSON fornecido.")
        
    items_data = raw_data.get("items") if isinstance(raw_data, dict) and "items" in raw_data else (raw_data if isinstance(raw_data, list) else [])
    if not items_data or not isinstance(items_data, list):
        raise HTTPException(status_code=400, detail="Formato inválido. O JSON deve conter um array 'items' ou uma lista de itens.")
    
    valid_items = []
    for item in items_data:
        if not isinstance(item, dict):
            continue
        q = item.get("question") or item.get("pergunta") or item.get("title") or ""
        a = item.get("answer") or item.get("resposta") or item.get("content") or ""
        cat = item.get("category") or item.get("categoria") or "Geral"
        meta = item.get("metadata_val") or item.get("metadata") or ""
        vars_list = item.get("question_variations") or item.get("variacoes") or []
        if isinstance(vars_list, str):
            try:
                vars_list = json.loads(vars_list)
            except Exception:
                vars_list = []
        if not isinstance(vars_list, list):
            vars_list = []
        clean_vars = [str(v).strip() for v in vars_list if str(v).strip()]
        if q and a:
            valid_items.append({
                "question": q, 
                "answer": a, 
                "category": cat, 
                "metadata_val": meta,
                "question_variations": clean_vars
            })
            
    if not valid_items:
        raise HTTPException(status_code=400, detail="Nenhum item válido com 'pergunta' e 'resposta' encontrado no arquivo.")
        
    texts_to_embed = [get_item_embedding_text(i["question"], i["question_variations"]) for i in valid_items]
    try:
        embeddings, _ = await get_batch_embeddings(texts_to_embed)
    except Exception as e:
        logger.warning(f"Falha ao gerar batch embeddings no import: {e}. Usando fallback item a item.")
        embeddings = []
        for t in texts_to_embed:
            try:
                emb, _ = await get_embedding(t)
                embeddings.append(emb)
            except Exception:
                embeddings.append(None)
                
    imported_count = 0
    for idx, item in enumerate(valid_items):
        emb = embeddings[idx] if idx < len(embeddings) else None
        db_item = KnowledgeItemModel(
            knowledge_base_id=kb_id,
            question=item["question"],
            answer=item["answer"],
            category=item["category"],
            metadata_val=item["metadata_val"],
            question_variations=item["question_variations"],
            embedding=emb
        )
        db.add(db_item)
        imported_count += 1
        
    await db.commit()
    return {"message": f"Importação concluída! {imported_count} itens adicionados.", "imported_count": imported_count}

@router.post("/knowledge-bases/import-new", response_model=KnowledgeBase)
async def import_new_knowledge_base(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    _: None = Depends(verify_api_key)
):
    content = await file.read()
    try:
        raw_data = json.loads(content.decode("utf-8"))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Arquivo JSON inválido: {str(e)}")
        
    if not isinstance(raw_data, dict):
        raise HTTPException(status_code=400, detail="O JSON de importação de nova base deve conter um objeto com os dados da base.")
        
    base_name = raw_data.get("name") or f"Base Importada {time.strftime('%d/%m/%Y %H:%M')}"
    res = await db.execute(select(KnowledgeBaseModel).where(KnowledgeBaseModel.name == base_name))
    if res.scalars().first():
        base_name = f"{base_name} ({time.strftime('%H%M%S')})"
        
    db_kb = KnowledgeBaseModel(
        name=base_name,
        description=raw_data.get("description") or "Base criada via importação completa de JSON.",
        kb_type=raw_data.get("kb_type") or "qa",
        question_label=raw_data.get("question_label") or "Pergunta",
        answer_label=raw_data.get("answer_label") or "Resposta",
        metadata_label=raw_data.get("metadata_label") or "Metadado"
    )
    db.add(db_kb)
    await db.commit()
    await db.refresh(db_kb)
    
    items_data = raw_data.get("items", [])
    valid_items = []
    for item in items_data:
        if isinstance(item, dict):
            q = item.get("question") or item.get("pergunta") or ""
            a = item.get("answer") or item.get("resposta") or ""
            cat = item.get("category") or item.get("categoria") or "Geral"
            meta = item.get("metadata_val") or item.get("metadata") or ""
            if q and a:
                valid_items.append({"question": q, "answer": a, "category": cat, "metadata_val": meta})
                
    if valid_items:
        questions = [i["question"] for i in valid_items]
        try:
            embeddings, _ = await get_batch_embeddings(questions)
        except Exception as e:
            logger.warning(f"Batch embedding fallback no import-new: {e}")
            embeddings = [None] * len(questions)
            
        for idx, item in enumerate(valid_items):
            emb = embeddings[idx] if idx < len(embeddings) else None
            db.add(KnowledgeItemModel(
                knowledge_base_id=db_kb.id,
                question=item["question"],
                answer=item["answer"],
                category=item["category"],
                metadata_val=item["metadata_val"],
                embedding=emb
            ))
        await db.commit()
        
    result = await db.execute(
        select(KnowledgeBaseModel)
        .where(KnowledgeBaseModel.id == db_kb.id)
        .options(selectinload(KnowledgeBaseModel.items))
    )
    return result.scalars().one()

# --- KNOWLEDGE ITEM ENDPOINTS ---

MAX_QUESTION_VARIATIONS = 8

@router.post("/knowledge-bases/{kb_id}/items", response_model=KnowledgeItem)
async def add_knowledge_item(kb_id: int, item: KnowledgeItem, db: AsyncSession = Depends(get_db), _: None = Depends(verify_api_key)):
    clean_vars = [v.strip() for v in (item.question_variations or []) if isinstance(v, str) and v.strip()]
    if len(clean_vars) > MAX_QUESTION_VARIATIONS:
        raise HTTPException(
            status_code=400, 
            detail=f"O item pode ter no máximo {MAX_QUESTION_VARIATIONS} variações de perguntas para manter a alta precisão semântica (evitar diluição do vetor)."
        )
    text_to_embed = get_item_embedding_text(item.question, clean_vars)
    try:
        emb, _ = await get_embedding(text_to_embed)
    except EmbeddingGenerationError as e:
        logger.error(f"Falha ao gerar embedding ao criar item na base {kb_id}: {e}")
        raise HTTPException(status_code=502, detail=f"Não foi possível gerar o vetor (embedding) do item: {e}")

    db_item = KnowledgeItemModel(
        knowledge_base_id=kb_id, 
        question=item.question, 
        answer=item.answer, 
        metadata_val=item.metadata_val, 
        category=item.category, 
        question_variations=clean_vars,
        embedding=emb
    )
    db.add(db_item)
    await db.commit()
    await db.refresh(db_item)
    return db_item

@router.get("/knowledge-items/{item_id}", response_model=KnowledgeItemDetail)
async def get_knowledge_item(item_id: int, db: AsyncSession = Depends(get_db), _: None = Depends(verify_api_key)):
    result = await db.execute(select(KnowledgeItemModel).where(KnowledgeItemModel.id == item_id))
    item = result.scalars().first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item

@router.delete("/knowledge-items/{item_id}")
async def delete_knowledge_item(item_id: int, db: AsyncSession = Depends(get_db), _: None = Depends(verify_api_key)):
    result = await db.execute(select(KnowledgeItemModel).where(KnowledgeItemModel.id == item_id))
    item = result.scalars().first()
    if item:
        await db.delete(item)
        await db.commit()
    return {"message": "Item deleted"}

@router.put("/knowledge-items/{item_id}", response_model=KnowledgeItemDetail)
async def update_knowledge_item(item_id: int, item: KnowledgeItem, db: AsyncSession = Depends(get_db), _: None = Depends(verify_api_key)):
    result = await db.execute(select(KnowledgeItemModel).where(KnowledgeItemModel.id == item_id))
    db_item = result.scalars().first()
    if not db_item: raise HTTPException(status_code=404, detail="Item not found")

    clean_vars = [v.strip() for v in (item.question_variations or []) if isinstance(v, str) and v.strip()]
    if len(clean_vars) > MAX_QUESTION_VARIATIONS:
        raise HTTPException(
            status_code=400,
            detail=f"O item pode ter no máximo {MAX_QUESTION_VARIATIONS} variações de perguntas para manter a alta precisão semântica (evitar diluição do vetor)."
        )
    text_to_embed = get_item_embedding_text(item.question, clean_vars)

    # Recalcula o vetor (embedding) sempre que a edição é salva, independente de qual
    # campo mudou — pedido explícito do usuário. O vetor é gerado a partir da
    # Pergunta combinada com suas Variações.
    try:
        emb, _ = await get_embedding(text_to_embed)
        db_item.embedding = emb
    except EmbeddingGenerationError as e:
        logger.error(f"Falha ao recalcular embedding do item {item_id}: {e}")
        raise HTTPException(status_code=502, detail=f"Não foi possível recalcular o vetor (embedding) do item: {e}")

    db_item.question = item.question
    db_item.answer = item.answer
    db_item.metadata_val = item.metadata_val
    db_item.category = item.category
    db_item.question_variations = clean_vars
    await db.commit()
    await db.refresh(db_item)
    return db_item

@router.post("/knowledge-items/{item_id}/variations")
async def add_knowledge_item_variation(
    item_id: int, 
    request: AddVariationRequest, 
    db: AsyncSession = Depends(get_db), 
    _: None = Depends(verify_api_key)
):
    result = await db.execute(select(KnowledgeItemModel).where(KnowledgeItemModel.id == item_id))
    db_item = result.scalars().first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Item não encontrado")

    current_vars = list(db_item.question_variations or []) if isinstance(db_item.question_variations, list) else []
    if isinstance(db_item.question_variations, str):
        try:
            parsed = json.loads(db_item.question_variations)
            if isinstance(parsed, list):
                current_vars = parsed
        except Exception:
            current_vars = []

    if len(current_vars) >= MAX_QUESTION_VARIATIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Limite máximo de {MAX_QUESTION_VARIATIONS} variações atingido para manter a alta precisão semântica (evitar diluição do vetor). Exclua ou edite uma variação existente antes de adicionar uma nova."
        )

    incoming = []
    if request.variation and request.variation.strip():
        incoming.append(request.variation.strip())
    if request.variations:
        for v in request.variations:
            if isinstance(v, str) and v.strip():
                incoming.append(v.strip())

    if not incoming:
        raise HTTPException(status_code=400, detail="Nenhuma variação fornecida.")

    existing_lower = {v.lower().strip() for v in current_vars if isinstance(v, str)}
    added = []
    for v in incoming:
        if v.lower() not in existing_lower:
            existing_lower.add(v.lower())
            added.append(v)

    if not added:
        return {
            "message": "A variação já existia para este item.",
            "item_id": db_item.id,
            "question_variations": current_vars,
            "added": []
        }

    if len(current_vars) + len(added) > MAX_QUESTION_VARIATIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Adicionar {len(added)} nova(s) variação(ões) excederia o limite máximo de {MAX_QUESTION_VARIATIONS}. Atualmente o item já possui {len(current_vars)} variações. Exclua ou edite variações existentes antes de adicionar novas."
        )

    current_vars.extend(added)

    # Recalcula o vetor semântico composto (pergunta + variações)
    text_to_embed = get_item_embedding_text(db_item.question, current_vars)
    try:
        emb, _ = await get_embedding(text_to_embed)
        db_item.embedding = emb
    except EmbeddingGenerationError as e:
        logger.error(f"Falha ao recalcular embedding para item {item_id}: {e}")
        raise HTTPException(status_code=502, detail=f"Não foi possível recalcular o vetor (embedding): {e}")

    db_item.question_variations = list(current_vars)
    flag_modified(db_item, "question_variations")
    await db.commit()
    await db.refresh(db_item)

    return {
        "message": "Variação adicionada com sucesso.",
        "item_id": db_item.id,
        "question_variations": db_item.question_variations,
        "added": added
    }

@router.delete("/knowledge-items/{item_id}/variations")
async def delete_knowledge_item_variation(
    item_id: int,
    variation: str = Query(..., description="Variação a remover"),
    db: AsyncSession = Depends(get_db),
    _: None = Depends(verify_api_key)
):
    result = await db.execute(select(KnowledgeItemModel).where(KnowledgeItemModel.id == item_id))
    db_item = result.scalars().first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Item não encontrado")

    current_vars = list(db_item.question_variations or []) if isinstance(db_item.question_variations, list) else []
    if isinstance(db_item.question_variations, str):
        try:
            parsed = json.loads(db_item.question_variations)
            if isinstance(parsed, list):
                current_vars = parsed
        except Exception:
            current_vars = []

    var_to_remove = variation.strip().lower()
    updated_vars = [v for v in current_vars if v.strip().lower() != var_to_remove]

    if len(updated_vars) == len(current_vars):
        raise HTTPException(status_code=404, detail="Variação não encontrada no item")

    text_to_embed = get_item_embedding_text(db_item.question, updated_vars)
    try:
        emb, _ = await get_embedding(text_to_embed)
        db_item.embedding = emb
    except EmbeddingGenerationError as e:
        logger.error(f"Falha ao recalcular embedding para item {item_id}: {e}")
        raise HTTPException(status_code=502, detail=f"Não foi possível recalcular o vetor (embedding): {e}")

    db_item.question_variations = list(updated_vars)
    flag_modified(db_item, "question_variations")
    await db.commit()
    await db.refresh(db_item)

    return {
        "message": "Variação removida com sucesso.",
        "item_id": db_item.id,
        "question_variations": db_item.question_variations
    }

@router.post("/knowledge-bases/{kb_id}/items/bulk")
async def bulk_knowledge_items(kb_id: int, items: List[KnowledgeItem], db: AsyncSession = Depends(get_db), _: None = Depends(verify_api_key)):
    result = await db.execute(select(KnowledgeItemModel).where(KnowledgeItemModel.id.in_([i.id for i in items if i.id])))
    existing_items = {i.id: i for i in result.scalars().all()}
    for item in items:
        clean_vars = [v.strip() for v in (item.question_variations or []) if isinstance(v, str) and v.strip()]
        if item.id in existing_items:
            db_item = existing_items[item.id]
            db_item.question = item.question; db_item.answer = item.answer
            db_item.metadata_val = item.metadata_val; db_item.category = item.category
            db_item.question_variations = clean_vars
        else:
            text_to_embed = get_item_embedding_text(item.question, clean_vars)
            emb, _ = await get_embedding(text_to_embed)
            db.add(KnowledgeItemModel(
                knowledge_base_id=kb_id, 
                question=item.question, 
                answer=item.answer, 
                metadata_val=item.metadata_val, 
                category=item.category, 
                question_variations=clean_vars,
                embedding=emb
            ))
            
    res_all = await db.execute(select(KnowledgeItemModel.id).where(KnowledgeItemModel.knowledge_base_id == kb_id))
    all_db_ids = set(res_all.scalars().all())
    ids_to_delete = all_db_ids - {i.id for i in items if i.id}
    if ids_to_delete:
        await db.execute(delete(KnowledgeItemModel).where(KnowledgeItemModel.id.in_(list(ids_to_delete))))
    await db.commit()
    return {"message": "Bulk sync completed"}

# --- TRANSCRIPTION ENDPOINTS ---

@router.post("/knowledge-bases/generate-upload-url")
async def generate_upload_url(request: GenerateUploadUrlRequest, db: AsyncSession = Depends(get_db), _: None = Depends(verify_api_key)):
    try:
        s3_key = f"transcriptions/{int(time.time())}_{request.filename}"
        put_url = s3_service.generate_presigned_put_url(s3_key, content_type=request.content_type, expiration=3600)
        if not put_url: raise HTTPException(status_code=500, detail="Erro ao gerar URL S3.")
        new_task = TranscriptionTaskModel(knowledge_base_id=request.kb_id, filename=request.filename, s3_key=s3_key, status="PENDING")
        db.add(new_task); await db.commit(); await db.refresh(new_task)
        return {"url": put_url, "s3_key": s3_key, "task_id": new_task.id}
    except Exception as e:
        logger.error(f"Erro generate_upload_url: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/knowledge-bases/confirm-upload")
async def confirm_upload_endpoint(request: ConfirmUploadRequest, db: AsyncSession = Depends(get_db), _: None = Depends(verify_api_key)):
    from tasks import process_transcription_task
    task = await db.get(TranscriptionTaskModel, request.task_id)
    if not task: raise HTTPException(status_code=404, detail="Task não encontrada")
    process_transcription_task.delay(request.task_id, task.s3_key, request.config)
    return {"message": "Processamento iniciado.", "status": "PENDING"}

@router.post("/knowledge-bases/transcribe")
async def transcribe_video_endpoint(request: Request, background_tasks: BackgroundTasks, file: UploadFile = File(...), config: str = Form("{}"), kb_id: Optional[int] = Form(None), _: None = Depends(verify_api_key)):
    config_dict = json.loads(config)
    s3_key = f"transcriptions/{int(time.time())}_{file.filename}"
    temp_dir = os.path.join(os.getcwd(), "tmp_uploads"); os.makedirs(temp_dir, exist_ok=True)
    local_path = os.path.join(temp_dir, f"{uuid.uuid4()}{os.path.splitext(file.filename)[1]}")
    with open(local_path, "wb") as buffer: shutil.copyfileobj(file.file, buffer)
    async with async_session() as db:
        new_task = TranscriptionTaskModel(knowledge_base_id=kb_id, filename=file.filename, s3_key=s3_key, status="PENDING")
        db.add(new_task); await db.commit(); await db.refresh(new_task)
        task_id = new_task.id
    background_tasks.add_task(background_s3_upload, local_path, s3_key, task_id, config_dict)
    return {"message": "Transcrição iniciada.", "task_id": task_id, "status": "PENDING"}

@router.get("/transcription-tasks")
async def list_transcription_tasks(response: Response, db: AsyncSession = Depends(get_db), page: int = Query(1, ge=1), limit: int = Query(20, ge=1), folder_id: Optional[int] = Query(None), _: None = Depends(verify_api_key)):
    offset = (page - 1) * limit
    stmt = select(TranscriptionTaskModel).where(TranscriptionTaskModel.status != "PENDING")
    if folder_id: stmt = stmt.where(TranscriptionTaskModel.folder_id == folder_id)
    total_res = await db.execute(select(func.count()).select_from(stmt.subquery()))
    total_count = total_res.scalar()
    result = await db.execute(stmt.order_by(TranscriptionTaskModel.created_at.desc()).offset(offset).limit(limit))
    return {"tasks": result.scalars().all(), "total": total_count, "page": page, "limit": limit}

@router.get("/transcription-folders")
async def list_transcription_folders(db: AsyncSession = Depends(get_db), _: None = Depends(verify_api_key)):
    result = await db.execute(select(TranscriptionFolder).order_by(TranscriptionFolder.name))
    return result.scalars().all()

@router.post("/transcription-folders")
async def create_transcription_folder(request: TranscriptionFolderRequest, db: AsyncSession = Depends(get_db), _: None = Depends(verify_api_key)):
    new_folder = TranscriptionFolder(name=request.name)
    db.add(new_folder); await db.commit(); await db.refresh(new_folder)
    return new_folder

@router.delete("/transcription-folders/{folder_id}")
async def delete_transcription_folder(folder_id: int, db: AsyncSession = Depends(get_db), _: None = Depends(verify_api_key)):
    folder = await db.get(TranscriptionFolder, folder_id)
    if not folder: raise HTTPException(status_code=404, detail="Pasta não encontrada")
    await db.delete(folder); await db.commit()
    return {"message": "Pasta removida."}

@router.post("/transcription-tasks/bulk-delete")
async def bulk_delete_transcription_tasks(request: BulkDeleteTranscriptionRequest, db: AsyncSession = Depends(get_db), _: None = Depends(verify_api_key)):
    res = await db.execute(select(TranscriptionTaskModel).where(TranscriptionTaskModel.id.in_(request.task_ids)))
    tasks = res.scalars().all()
    for task in tasks:
        if task.s3_key: s3_service.delete_file(task.s3_key)
        await db.delete(task)
    await db.commit()
    return {"message": f"{len(tasks)} registros removidos."}

@router.put("/transcription-tasks/{task_id}/rename")
async def rename_transcription_task(task_id: int, request: TranscriptionRenameRequest, db: AsyncSession = Depends(get_db), _: None = Depends(verify_api_key)):
    task = await db.get(TranscriptionTaskModel, task_id)
    if not task: raise HTTPException(status_code=404, detail="Tarefa não encontrada")
    task.filename = request.filename
    await db.commit()
    return {"message": "Tarefa renomeada com sucesso"}

@router.post("/transcription-tasks/{task_id}/retry")
async def retry_transcription_task(task_id: int, db: AsyncSession = Depends(get_db), _: None = Depends(verify_api_key)):
    from tasks import process_transcription_task
    task = await db.get(TranscriptionTaskModel, task_id)
    if not task: raise HTTPException(status_code=404, detail="Tarefa não encontrada")
    
    task.status = "PENDING"
    task.error_message = None
    await db.commit()
    
    # Dispara novamente o Celery
    process_transcription_task.delay(task.id, task.s3_key, {})
    return {"message": "Processamento reiniciado."}

# --- OUTROS ENDPOINTS KB ---

@router.post("/knowledge-bases/analyze-file")
async def analyze_kb_file(file: UploadFile = File(...), _: None = Depends(verify_api_key)):
    content = await file.read(); filename = file.filename.lower()
    try:
        if filename.endswith(".csv"): df = pd.read_csv(io.BytesIO(content))
        elif filename.endswith((".xls", ".xlsx")): df = pd.read_excel(io.BytesIO(content))
        elif filename.endswith(".pdf"): return {"page_count": 0, "is_pdf": True, "is_image": False} # Simplified
        elif filename.endswith((".png", ".jpg", ".jpeg", ".webp")): return {"page_count": 1, "is_pdf": False, "is_image": True}
        else: return {"error": "Formato não suportado"}
        return {"columns": df.columns.tolist(), "preview": df.head(5).to_dict(orient="records"), "total_rows": len(df)}
    except Exception as e: return {"error": str(e)}

@router.post("/knowledge-bases/analyze-text")
async def analyze_kb_text(text: str = Form(...), _: None = Depends(verify_api_key)):
    try:
        # Simplified detection logic
        df = pd.read_csv(io.StringIO(text), sep=',', nrows=5)
        return {"columns": df.columns.tolist(), "preview": df.head(5).to_dict(orient="records"), "total_rows": 5}
    except: return {"error": "Falha ao analisar texto"}

@router.post("/knowledge-bases/{kb_id}/import-mapped")
async def import_mapped_file(kb_id: int, question_col: str = Form(...), answer_col: str = Form(...), category_col: str = Form(None), fixed_category: str = Form(None), metadata_col: str = Form(None), fixed_metadata: str = Form(None), file: UploadFile = File(...), db: AsyncSession = Depends(get_db), _: None = Depends(verify_api_key)):
    content = await file.read(); filename = file.filename.lower()
    df = pd.read_csv(io.BytesIO(content)) if filename.endswith(".csv") else pd.read_excel(io.BytesIO(content))
    for _, row in df.iterrows():
        q = str(row[question_col]); a = str(row[answer_col])
        cat = str(row[category_col]) if category_col and category_col in row else fixed_category
        meta = str(row[metadata_col]) if metadata_col and metadata_col in row else fixed_metadata
        emb, _ = await get_embedding(q)
        db.add(KnowledgeItemModel(knowledge_base_id=kb_id, question=q, answer=a, category=cat, metadata_val=meta, embedding=emb))
    await db.commit()
    return {"message": "Importação concluída"}

@router.post("/knowledge-bases/{kb_id}/process-transcription")
async def process_transcription_endpoint(kb_id: int, request: TranscriptionProcessRequest, db: AsyncSession = Depends(get_db), _: None = Depends(verify_api_key)):
    from rag_service import get_batch_embeddings
    from smart_importer import chunk_text
    chunks = chunk_text(request.text, chunk_size=1200, overlap=150)
    for c in chunks:
        db.add(KnowledgeItemModel(knowledge_base_id=kb_id, question="Trecho", answer=c["text"], category="Transcrição"))
    await db.commit()
    return {"message": "Processado"}

@router.post("/knowledge-bases/generate-qa-from-transcription")
async def generate_qa_from_transcription(
    request: GenerateQAFromTranscriptionRequest,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(verify_api_key)
):
    try:
        from smart_importer import generate_global_qa
        from api.services.cost_service import calculate_ai_cost
        from models import TranscriptionTaskModel, InteractionLog
        from datetime import datetime, timezone
        from sqlalchemy import select
        from config_store import USD_TO_BRL

        qa_list, usage = await generate_global_qa(
            request.text, 
            total_questions=request.total_questions,
            model=request.model or "gpt-4o-mini"
        )
        
        model_used = usage.get("model", request.model or "gpt-4o-mini") if usage else (request.model or "gpt-4o-mini")
        cost_usd = 0.0

        if usage:
            input_tk = usage.get("input_tokens", 0)
            output_tk = usage.get("output_tokens", 0)
            cost_usd, cost_brl = calculate_ai_cost(model_used, input_tk, output_tk)

            # 1. Se task_id for fornecido, atualiza a tarefa de transcrição
            task_filename = "N/A"
            if request.task_id:
                task_res = await db.execute(
                    select(TranscriptionTaskModel).where(TranscriptionTaskModel.id == request.task_id)
                )
                task = task_res.scalar_one_or_none()
                if task:
                    task.cost_usd = (task.cost_usd or 0.0) + cost_usd
                    task_filename = task.filename or "N/A"
                    logger.info(f"💰 Custo de extração de P&R de ${cost_usd:.6f} adicionado à tarefa {task.id}")

            # 2. Registra o custo na tabela InteractionLog para contabilizar no financeiro
            new_log = InteractionLog(
                agent_id=None,  # NULL para marcar como "Sistema / IA Interna"
                session_id=f"SYS_EXTRACTION_KB_{request.task_id or 'unknown'}",
                user_message=f"Extração P&R (IA) - Arquivo: {task_filename}" if request.task_id else "Extração P&R (IA)",
                agent_response=f"Geração de {len(qa_list)} perguntas e respostas concluída via {model_used}.",
                model_used=model_used,
                input_tokens=input_tk,
                output_tokens=output_tk,
                cost_usd=cost_usd,
                cost_brl=cost_usd * USD_TO_BRL,
                timestamp=datetime.now(timezone.utc)
            )
            db.add(new_log)
            await db.commit()
            logger.info(f"📊 Extração registrada no financeiro: R$ {new_log.cost_brl:.4f} ({new_log.model_used})")

        return {
            "items": qa_list, 
            "model": model_used,
            "cost_usd": cost_usd,
            "cost_brl": cost_usd * USD_TO_BRL
        }
    except Exception as e:
        logger.error(f"Erro em generate_qa_from_transcription: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/knowledge-bases/{kb_id}/items/add-batch")
async def add_batch_knowledge_items(
    kb_id: int,
    request: AddBatchKnowledgeItemsRequest,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(verify_api_key)
):
    try:
        from rag_service import get_embedding
        added_count = 0
        for item in request.items:
            # Gerar embedding para a pergunta
            emb = None
            try:
                emb, _ = await get_embedding(item.question)
            except Exception as emb_err:
                logger.error(f"Erro ao gerar embedding para item: {emb_err}")
            
            db_item = KnowledgeItemModel(
                knowledge_base_id=kb_id,
                question=item.question,
                answer=item.answer,
                metadata_val=item.metadata_val,
                category=item.category or "Treinamento",
                embedding=emb
            )
            db.add(db_item)
            added_count += 1
            
        await db.commit()
        return {"message": f"Sucesso! {added_count} novos itens adicionados com sucesso."}
    except Exception as e:
        logger.error(f"Erro em add_batch_knowledge_items: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/knowledge-bases/generate-chunks-from-transcription")
async def generate_chunks_from_transcription(
    request: GenerateChunksFromTranscriptionRequest,
    _: None = Depends(verify_api_key)
):
    try:
        from smart_importer import chunk_text
        chunks = chunk_text(request.text, chunk_size=request.chunk_size or 1200, overlap=request.overlap or 150)
        
        # Formatar a resposta no formato que a interface espera para os cards
        formatted_chunks = []
        for i, c in enumerate(chunks):
            formatted_chunks.append({
                "question": f"Trecho da Aula #{i + 1}",
                "answer": c["text"],
                "category": "Transcrição"
            })
        return formatted_chunks
    except Exception as e:
        logger.error(f"Erro em generate_chunks_from_transcription: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
