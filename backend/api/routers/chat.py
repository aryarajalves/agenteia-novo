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
from api.schemas import MessageRequest, MessageResponse, AgentConfig, ExplainRequest, ExplainResponse, ExplainFactor, ExplainDebateRequest, ExplainDebateResponse, ChatMessage
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
