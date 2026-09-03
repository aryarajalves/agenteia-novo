import logging
import json
import time
import os
from datetime import datetime, timezone
from typing import List, Optional, Any, Dict
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from models import AgentConfigModel, InteractionLog, GlobalContextVariableModel
from api.schemas import (
    MessageRequest, MessageResponse, AgentConfig,
    ExplainRequest, ExplainResponse, ExplainFactor,
    ExplainDebateRequest, ExplainDebateResponse, ChatMessage,
    SourceAttributionRequest, SourceAttributionResponse, SourceSegment, SourceLink
)
from api.deps import get_db, verify_api_key
from api.services.cost_service import calculate_ai_cost
from api.services.agent_service import db_to_pydantic_agent
from config_store import MODEL_INFO, USD_TO_BRL
from agent import process_message

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Chat"])

async def get_chat_history(db: AsyncSession, limit: int, session_id: str | None = None):
    """Recupera o histórico recente de uma sessão para contexto da IA."""
    if limit <= 0:
        return []
    
    query = select(InteractionLog)
    if session_id:
        query = query.where(InteractionLog.session_id == session_id)
    
    stmt = query.order_by(InteractionLog.timestamp.desc()).limit(limit)
    result = await db.execute(stmt)
    rows = result.scalars().all()
    
    history = []
    # Inverte para ordem cronológica (Antigo -> Novo)
    for row in reversed(rows):
        history.append({"role": "user", "content": row.user_message})
        history.append({"role": "assistant", "content": row.agent_response})

    # Injetar contexto de Handoff se necessário
    if rows and rows[0].handoff_to:
        summary = "Não disponível"
        try:
            debug = json.loads(rows[0].debug_info) if rows[0].debug_info else {}
            summary = debug.get("summary", "Não disponível")
        except: pass
        
        history.append({
            "role": "system",
            "content": (
                f"### RESUMO DO ATENDIMENTO ANTERIOR:\n{summary}\n\n"
                f"Instrução: Retome o atendimento de forma fluida."
            )
        })
        
    return history

@router.post("/execute", response_model=MessageResponse)
async def execute_agent(
    request: MessageRequest,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(verify_api_key)
):
    """
    Endpoint principal para interação com os agentes.
    Processa a mensagem, recupera contexto, executa RAG/Tools e salva logs.
    """
    # 1. Carregar configuração do agente
    result = await db.execute(
        select(AgentConfigModel)
        .where(AgentConfigModel.id == request.agent_id)
        .options(
            selectinload(AgentConfigModel.tools),
            selectinload(AgentConfigModel.knowledge_bases)
        )
    )
    db_config = result.scalars().first()
    if not db_config:
        raise HTTPException(status_code=404, detail="Agente não encontrado")

    # 2. Converter para schema Pydantic
    agent_config = db_to_pydantic_agent(db_config)
    # Nota: O mapeamento completo é longo, vou simplificar usando os campos essenciais 
    # ou reusando a lógica de conversão se disponível em algum serviço.
    # Por enquanto, vou garantir que o básico funcione.
    
    # Overrides da Arena
    if request.model_override:
        agent_config.model = request.model_override
        agent_config.router_enabled = False 
    if request.system_prompt_override:
        agent_config.system_prompt = request.system_prompt_override

    # 3. Preparar histórico e contexto
    session_id = request.session_id
    history = await get_chat_history(db, agent_config.context_window, session_id) if session_id else []
    
    ctx = {}
    result_global = await db.execute(select(GlobalContextVariableModel))
    for gv in result_global.scalars().all():
        if gv.value is not None:
            ctx[gv.key] = gv.value # Simplificado: tratamento de tipos pode ser adicionado depois
            
    if request.context_variables:
        ctx.update(request.context_variables)
    if session_id: ctx["session_id"] = session_id

    # 4. Processar mensagem
    start_perf = time.perf_counter()
    result = await process_message(
        request.message, 
        history, 
        agent_config, 
        db_config.tools, 
        ctx, 
        db=db,
        image_url=request.image_url
    )
    response_time_ms = int((time.perf_counter() - start_perf) * 1000)

    # 5. Cálculo de Custos
    usage = result.get("usage")
    model_used = result.get("model", agent_config.model)
    cost_usd, cost_brl = 0.0, 0.0
    
    if usage:
        # Extrair tokens totais para o custo
        p_tokens = getattr(usage, 'main_prompt', 0) + getattr(usage, 'mini_prompt', 0)
        c_tokens = getattr(usage, 'main_completion', 0) + getattr(usage, 'mini_completion', 0)
        cached_tokens = getattr(usage, 'cached_tokens', 0)
        cost_usd, cost_brl = calculate_ai_cost(model_used, p_tokens, c_tokens, cached_tokens)

    response_text = result["content"]
    handoff_data = result.get("handoff_data", {})
    is_handoff = handoff_data.get("handoff", False) or "{suporte_humano}" in response_text
    
    # 6. Salvar Log de Interação
    try:
        new_log = InteractionLog(
            agent_id=request.agent_id,
            session_id=session_id,
            user_message=request.message,
            agent_response=response_text,
            model_used=model_used,
            input_tokens=usage.prompt_tokens if usage else 0,
            output_tokens=usage.completion_tokens if usage else 0,
            cached_tokens=getattr(usage, 'cached_tokens', 0) if usage else 0,
            cost_usd=cost_usd,
            cost_brl=cost_brl,
            handoff_to="suporte" if is_handoff else None,
            debug_info=json.dumps(result.get("debug") or {}),
            timestamp=datetime.now(timezone.utc)
        )
        db.add(new_log)
        await db.commit()
    except Exception as log_err:
        logger.error(f"Erro ao salvar log de interação: {log_err}")

    # 7. Criar Solicitação de Suporte se for Handoff
    if is_handoff:
        try:
            from models import SupportRequestModel
            # Se não houver sumário pronto, gera um simples
            summary = handoff_data.get("summary") or "Solicitação via Playground/Chat"
            reason = handoff_data.get("motivo") or "O usuário solicitou suporte humano ou a IA identificou a necessidade."
            
            new_support = SupportRequestModel(
                agent_id=request.agent_id,
                session_id=session_id or f"playground_{int(time.time())}",
                user_name=ctx.get("user_name") or "Usuário Playground",
                user_email=ctx.get("user_email"),
                contact_phone=ctx.get("contact_phone") or ctx.get("phone"),
                status="OPEN",
                summary=summary,
                reason=reason,
                created_at=datetime.now(timezone.utc)
            )
            db.add(new_support)
            await db.commit()
            logger.info(f"🆘 Solicitação de suporte criada para sessão {session_id}")
        except Exception as sup_err:
            logger.error(f"Erro ao criar solicitação de suporte: {sup_err}")

    return MessageResponse(
        response=response_text,
        cost_usd=cost_usd,
        cost_brl=cost_brl,
        input_tokens=usage.prompt_tokens if usage else 0,
        output_tokens=usage.completion_tokens if usage else 0,
        cached_tokens=getattr(usage, 'cached_tokens', 0) if usage else 0,
        model_used=model_used,
        response_time_ms=response_time_ms,
        from_semantic_cache=result.get("from_semantic_cache", False),
        cached_similarity=result.get("cached_similarity"),
        cached_original_query=result.get("cached_original_query"),
        error=result.get("error", False),
        system_error=result.get("system_error"),
        debug=result.get("debug"),
        tool_calls=result.get("tool_calls")
    )

@router.get("/models")
async def list_available_models(_: None = Depends(verify_api_key)):
    """Lista todos os modelos e famílias disponíveis no sistema."""
    from config_store import discover_models
    return discover_models()


@router.post("/explain-response", response_model=ExplainResponse)
async def explain_ai_response(
    request: ExplainRequest,
    _: None = Depends(verify_api_key)
):
    """
    Meta-analisa por que a IA gerou uma resposta específica.
    Usa o LLM para identificar quais partes do prompt influenciaram a resposta.
    """
    from agent_core.clients import get_openai_client
    import json

    # Truncar o prompt para não ultrapassar o limite de contexto (~8000 chars ~ 2000 tokens)
    MAX_PROMPT_CHARS = 8000
    resolved_prompt = request.resolved_prompt or "(Prompt não disponível)"
    if len(resolved_prompt) > MAX_PROMPT_CHARS:
        resolved_prompt = resolved_prompt[:MAX_PROMPT_CHARS] + "\n\n[... prompt truncado para análise ...]"

    # Resumo do pre_router se existir
    pre_router_summary = ""
    if request.pre_router:
        pr = request.pre_router
        pre_router_summary = f"""
### Classificação do Pre-Router:
- É saudação: {pr.get('eh_saudacao', False)}
- É agradecimento: {pr.get('eh_agradecimento', False)}
- Perguntas extraídas: {pr.get('perguntas_extraidas', 'N/A')}
- Resumo de memória: {pr.get('resumo_memorias', 'N/A')}
"""

    meta_prompt = f"""Você é um especialista em análise de sistemas de IA conversacional.

Analise o seguinte contexto e explique em linguagem simples e direta por que a IA gerou aquela resposta específica para o usuário.

### Prompt do Sistema (instrução dada à IA):
{resolved_prompt}
{pre_router_summary}
### Mensagem do Usuário:
{request.user_message}

### Resposta Gerada pela IA:
{request.agent_response}

Retorne um objeto JSON com a seguinte estrutura EXATA (sem texto adicional, apenas o JSON):
{{
  "factors": [
    {{
      "title": "Nome claro e curto do fator (ex: Identidade/Persona, Conhecimento de Produto, Tom e Estilo, Restrições, Contexto RAG, Memória do Usuário)",
      "explanation": "Explicação em 1-3 frases de como essa parte do prompt influenciou a resposta. Seja específico e cite o impacto real.",
      "section": "static",
      "relevance": "high"
    }}
  ],
  "summary": "Resumo em 1-2 frases do raciocínio central da IA para esta resposta específica."
}}

Regras para os campos:
- "section": use "static" (instruções fixas da persona/identidade), "dynamic" (blocos condicionais/variáveis), "injected" (contexto injetado pelo código, como data/hora/sessão), "rag" (base de conhecimento recuperada), "general" (raciocínio geral da IA)
- "relevance": use "high" (fator determinante para a resposta), "medium" (influenciou parcialmente), "low" (influência mínima)
- Identifique no máximo 5 fatores, priorizando os mais determinantes para ESTA resposta específica
- Seja específico: cite exemplos concretos do prompt quando possível
- Use linguagem clara em português do Brasil"""

    try:
        client = get_openai_client()
        completion = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "user", "content": meta_prompt}
            ],
            temperature=0.2,
            response_format={"type": "json_object"}
        )

        raw_text = completion.choices[0].message.content
        data = json.loads(raw_text)

        factors = [
            ExplainFactor(
                title=f.get("title", "Fator"),
                explanation=f.get("explanation", ""),
                section=f.get("section", "general"),
                relevance=f.get("relevance", "medium")
            )
            for f in data.get("factors", [])
        ]

        # Calcular custo
        usage = completion.usage
        cost_usd, cost_brl = 0.0, 0.0
        if usage:
            cost_usd, cost_brl = calculate_ai_cost(
                "gpt-4o-mini",
                usage.prompt_tokens,
                usage.completion_tokens,
                getattr(usage, 'cached_tokens', 0)
            )

        return ExplainResponse(
            factors=factors,
            summary=data.get("summary", "Análise não disponível."),
            cost_usd=cost_usd,
            cost_brl=cost_brl
        )

    except Exception as e:
        logger.error(f"Erro ao explicar resposta da IA: {e}")
        raise HTTPException(status_code=500, detail=f"Erro ao gerar explicação: {str(e)}")


@router.post("/explain-debate", response_model=ExplainDebateResponse)
async def explain_debate_response(
    request: ExplainDebateRequest,
    _: None = Depends(verify_api_key)
):
    """
    Inicia ou continua um debate (chat) focado na análise de uma resposta específica do agente.
    Permite ao desenvolvedor questionar a decisão ou comportamento do agente.
    """
    from agent_core.clients import get_openai_client
    
    # 1. Truncar resolved_prompt para contexto
    MAX_PROMPT_CHARS = 8000
    resolved_prompt = request.resolved_prompt or "(Prompt não disponível)"
    if len(resolved_prompt) > MAX_PROMPT_CHARS:
        resolved_prompt = resolved_prompt[:MAX_PROMPT_CHARS] + "\n\n[... prompt truncado ...]"

    # Resumo do pre_router se existir
    pre_router_summary = ""
    if request.pre_router:
        pr = request.pre_router
        pre_router_summary = f"""
### Classificação do Pre-Router:
- É saudação: {pr.get('eh_saudacao', False)}
- É agradecimento: {pr.get('eh_agradecimento', False)}
- Perguntas extraídas: {pr.get('perguntas_extraidas', 'N/A')}
- Resumo de memória: {pr.get('resumo_memorias', 'N/A')}
"""

    system_instruction = f"""Você é um auditor e especialista analítico em sistemas de IA.
O desenvolvedor do sistema quer debater sobre a resposta que o Agente de IA (bot) enviou a um usuário final.

### INSTRUÇÕES DO AGENTE (System Prompt do Bot):
{resolved_prompt}
{pre_router_summary}

### HISTÓRICO DA CONVERSA AVALIADA:
- Pergunta do Usuário Final: "{request.user_message}"
- Resposta Gerada pelo Bot: "{request.agent_response}"

Responda às dúvidas do desenvolvedor de forma extremamente precisa, objetiva, técnica e honesta, explicando os motivos do prompt, RAG, pre-router ou lógica do bot que levaram a essa resposta em detrimento de outras alternativas.
Você deve falar diretamente com o desenvolvedor em português do Brasil."""

    messages = [{"role": "system", "content": system_instruction}]
    
    # Adicionar o histórico do debate
    for msg in request.debate_history:
        messages.append({"role": msg.role, "content": msg.content})
        
    # Adicionar a nova pergunta
    messages.append({"role": "user", "content": request.question})

    try:
        client = get_openai_client()
        completion = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            temperature=0.3
        )

        response_text = completion.choices[0].message.content
        
        # Calcular custo do debate
        usage = completion.usage
        cost_usd, cost_brl = 0.0, 0.0
        if usage:
            cost_usd, cost_brl = calculate_ai_cost(
                "gpt-4o-mini",
                usage.prompt_tokens,
                usage.completion_tokens,
                getattr(usage, 'cached_tokens', 0)
            )

        new_history = list(request.debate_history)
        new_history.append(ChatMessage(role="user", content=request.question))
        new_history.append(ChatMessage(role="assistant", content=response_text))

        return ExplainDebateResponse(
            response=response_text,
            cost_usd=cost_usd,
            cost_brl=cost_brl,
            debate_history=new_history
        )
    except Exception as e:
        logger.error(f"Erro no debate explicativo da resposta da IA: {e}")
        raise HTTPException(status_code=500, detail=f"Erro ao processar debate: {str(e)}")


@router.post("/attribute-sources", response_model=SourceAttributionResponse)
async def attribute_response_sources(
    request: SourceAttributionRequest,
    _: None = Depends(verify_api_key)
):
    """
    Decompõe a resposta da IA em partes/parágrafos e mapeia a origem
    exata de cada trecho (Base de Conhecimento RAG, Prompt do Sistema,
    Diretrizes Dinâmicas, Variáveis ou Raciocínio Geral) com links de validação.
    """
    from agent_core.clients import get_openai_client
    import json
    import re

    raw_response = (request.agent_response or "").strip()
    if not raw_response:
        return SourceAttributionResponse(
            segments=[],
            summary="Nenhuma resposta para analisar.",
            cost_usd=0.0,
            cost_brl=0.0
        )

    # 1. Separar a resposta em parágrafos não vazios
    paragraphs = [p.strip() for p in raw_response.split("\n\n") if p.strip()]
    if not paragraphs:
        paragraphs = [p.strip() for p in raw_response.split("\n") if p.strip()]
    if not paragraphs:
        paragraphs = [raw_response]

    # 2. Formatar os itens do RAG com identificadores claros
    rag_items = request.rag_items or []
    rag_text_list = []
    for idx, item in enumerate(rag_items, 1):
        kb_id = item.get("knowledge_base_id") or item.get("kb_id")
        item_id = item.get("id") or item.get("item_id")
        q = item.get("question", "")
        a = item.get("answer", "")
        cat = item.get("category", "")
        rag_text_list.append(
            f"[RAG_ITEM_{idx}] (KB_ID: {kb_id}, ITEM_ID: {item_id}, Categoria: {cat})\n"
            f"Pergunta: {q}\n"
            f"Resposta: {a}"
        )
    rag_formatted = "\n\n".join(rag_text_list) if rag_text_list else "Nenhum item RAG recuperado."

    # 3. Truncar o prompt do sistema para economia de tokens se for muito grande
    MAX_PROMPT_CHARS = 7000
    prompt_text = request.resolved_prompt or ""
    if len(prompt_text) > MAX_PROMPT_CHARS:
        prompt_text = prompt_text[:MAX_PROMPT_CHARS] + "\n\n[... prompt resumido para análise ...]"

    # 4. Construir prompt para LLM realizar a atribuição precisa
    paragraphs_json = json.dumps([{"index": i + 1, "text": p} for i, p in enumerate(paragraphs)], ensure_ascii=False)

    meta_prompt = f"""Você é um auditor especialista em rastreabilidade de dados e RAG (Retrieval-Augmented Generation).
Sua tarefa é analisar cada parte da resposta do assistente de IA e determinar com máxima precisão qual fonte de informação deu origem àquele trecho.

### Mensagem do Usuário:
{request.user_message}

### Partes da Resposta do Assistente (numeradas):
{paragraphs_json}

### Fontes Disponíveis:

1. ITENS RECUPERADOS DA BASE DE CONHECIMENTO (RAG):
{rag_formatted}

2. PROMPT DE SISTEMA / DIRETRIZES DO AGENTE:
{prompt_text}

3. VARIÁVEIS DE CONTEXTO:
{json.dumps(request.context_variables or {}, ensure_ascii=False)}

---
Retorne um objeto JSON estrito com a seguinte estrutura:
{{
  "segments": [
    {{
      "segment_index": 1,
      "source_type": "knowledge_base" | "system_prompt" | "dynamic_prompt" | "context_variable" | "general_reasoning",
      "source_title": "Título conciso da fonte (ex: 'Base de Conhecimento: Sobre a Professora', 'Prompt: Política de Descontos', 'Prompt: Identidade')",
      "source_snippet": "Trecho exato da fonte (a pergunta/resposta do RAG ou trecho do prompt) que comprova essa informação.",
      "kb_id": 1, // Número inteiro do KB_ID se veio do RAG, caso contrário null
      "kb_item_id": 42, // Número inteiro do ITEM_ID se veio do RAG, caso contrário null
      "confidence": 0.95, // Grau de certeza entre 0.0 e 1.0
      "explanation": "Explicação curta e direta de como a fonte inspirou este trecho."
    }}
  ],
  "summary": "Resumo geral em 1 frase das fontes principais utilizadas."
}}

Regras invioláveis:
- Analise CADA um dos {len(paragraphs)} parágrafos fornecidos na ordem exata de 1 a {len(paragraphs)}.
- "knowledge_base": use quando a informação específica veio de um dos [RAG_ITEM_X] (preencha kb_id e kb_item_id se presentes).
- "system_prompt": use quando a informação veio das instruções, persona, regras ou políticas do System Prompt.
- "dynamic_prompt": use quando a informação veio de regras dinâmicas ou variáveis.
- "context_variable": use quando veio de uma variável injetada (ex: nome do usuário, telefone, data).
- "general_reasoning": use para frases de conexão, empatia ou saudações genéricas formuladas pelo modelo.
- Use linguagem em português do Brasil."""

    try:
        client = get_openai_client()
        completion = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "user", "content": meta_prompt}
            ],
            temperature=0.1,
            response_format={"type": "json_object"}
        )

        raw_text = completion.choices[0].message.content
        data = json.loads(raw_text)

        parsed_segments = []
        raw_segs = data.get("segments", [])

        # Mapear e associar links para cada parágrafo
        for i, p_text in enumerate(paragraphs):
            seg_match = next((s for s in raw_segs if s.get("segment_index") == i + 1), None)
            if not seg_match and i < len(raw_segs):
                seg_match = raw_segs[i]

            s_type = seg_match.get("source_type", "general_reasoning") if seg_match else "general_reasoning"
            s_title = seg_match.get("source_title", "Raciocínio Geral") if seg_match else "Raciocínio Geral"
            s_snippet = seg_match.get("source_snippet") if seg_match else None
            kb_id = seg_match.get("kb_id") if seg_match else None
            kb_item_id = seg_match.get("kb_item_id") if seg_match else None
            confidence = float(seg_match.get("confidence", 0.9)) if seg_match else 0.9
            explanation = seg_match.get("explanation", "") if seg_match else ""

            # Fallback para associar kb_id a partir dos rag_items caso o LLM não tenha extraído
            if s_type == "knowledge_base" and not kb_id and rag_items:
                kb_id = rag_items[0].get("knowledge_base_id") or rag_items[0].get("kb_id")
                if not kb_item_id:
                    kb_item_id = rag_items[0].get("id") or rag_items[0].get("item_id")

            # Construir Link interativo
            link = None
            if s_type == "knowledge_base":
                if kb_id:
                    link = SourceLink(
                        type="knowledge_base",
                        url=f"/knowledge-bases/{kb_id}",
                        label=f"Abrir Base de Conhecimento #{kb_id}"
                    )
                else:
                    link = SourceLink(
                        type="knowledge_base",
                        url="/knowledge-bases",
                        label="Abrir Bases de Conhecimento"
                    )
            elif s_type in ["system_prompt", "dynamic_prompt"]:
                agent_id = request.agent_id
                link = SourceLink(
                    type="agent_prompt",
                    url=f"/agent/{agent_id}" if agent_id else "/agent/new",
                    label="Editar Prompt do Agente"
                )
            elif s_type == "context_variable":
                agent_id = request.agent_id
                link = SourceLink(
                    type="context_variable",
                    url=f"/agent/{agent_id}" if agent_id else None,
                    label="Ver Configuração do Agente"
                )

            parsed_segments.append(
                SourceSegment(
                    segment_index=i + 1,
                    text=p_text,
                    source_type=s_type,
                    source_title=s_title,
                    source_snippet=s_snippet,
                    kb_id=kb_id,
                    kb_item_id=kb_item_id,
                    agent_id=request.agent_id,
                    confidence=confidence,
                    explanation=explanation,
                    link=link
                )
            )

        # Calcular custo
        usage = completion.usage
        cost_usd, cost_brl = 0.0, 0.0
        if usage:
            cost_usd, cost_brl = calculate_ai_cost(
                "gpt-4o-mini",
                usage.prompt_tokens,
                usage.completion_tokens,
                getattr(usage, 'cached_tokens', 0)
            )

        summary = data.get("summary", "Mapeamento de fontes concluído com sucesso.")

        return SourceAttributionResponse(
            segments=parsed_segments,
            summary=summary,
            cost_usd=cost_usd,
            cost_brl=cost_brl
        )

    except Exception as e:
        logger.error(f"Erro ao atribuir fontes da resposta da IA: {e}")
        # Fallback resiliente: divide em parágrafos e mapeia heuristicamente
        fallback_segments = []
        for i, p_text in enumerate(paragraphs):
            # Se encontrar palavras da Base RAG
            matched_rag = None
            for r in rag_items:
                ans = r.get("answer", "")
                ques = r.get("question", "")
                if any(w.lower() in p_text.lower() for w in ans.split() if len(w) > 5):
                    matched_rag = r
                    break

            if matched_rag:
                kb_id = matched_rag.get("knowledge_base_id") or matched_rag.get("kb_id")
                fallback_segments.append(
                    SourceSegment(
                        segment_index=i + 1,
                        text=p_text,
                        source_type="knowledge_base",
                        source_title=f"Base de Conhecimento: {matched_rag.get('category', 'Geral')}",
                        source_snippet=f"Perg: {matched_rag.get('question')}\nResp: {matched_rag.get('answer')}",
                        kb_id=kb_id,
                        kb_item_id=matched_rag.get("id"),
                        confidence=0.8,
                        explanation="Correspondência semântica com item recuperado da Base de Conhecimento.",
                        link=SourceLink(
                            type="knowledge_base",
                            url=f"/knowledge-bases/{kb_id}" if kb_id else "/knowledge-bases",
                            label=f"Abrir Base #{kb_id}" if kb_id else "Abrir Bases"
                        )
                    )
                )
            else:
                fallback_segments.append(
                    SourceSegment(
                        segment_index=i + 1,
                        text=p_text,
                        source_type="system_prompt" if request.resolved_prompt else "general_reasoning",
                        source_title="Prompt de Sistema" if request.resolved_prompt else "Raciocínio Geral",
                        source_snippet=None,
                        confidence=0.7,
                        explanation="Trecho derivado das instruções gerais do prompt ou raciocínio do modelo.",
                        link=SourceLink(
                            type="agent_prompt",
                            url=f"/agent/{request.agent_id}" if request.agent_id else None,
                            label="Editar Prompt"
                        ) if request.agent_id else None
                    )
                )

        return SourceAttributionResponse(
            segments=fallback_segments,
            summary="Mapeamento aproximado baseado em correspondência de termos.",
            cost_usd=0.0,
            cost_brl=0.0
        )

