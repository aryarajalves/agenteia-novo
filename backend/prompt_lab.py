from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import os
import openai
import logging
from agent import resolve_conditional_blocks, get_openai_client
from config_store import format_ai_params
from agent_core.logic.pre_router import run_pre_router_ai
from database import SessionLocal
from models import AgentConfigModel

logger = logging.getLogger(__name__)

router = APIRouter()

class PlaygroundRequest(BaseModel):
    agent_id: Optional[int] = None
    system_prompt: str
    user_message: str
    history: List[Dict[str, str]] = []
    variables: Dict[str, Any] = {}
    model: str = "gpt-4o-mini"
    temperature: float = 0.7
    initial_message: Optional[str] = None

class PromptRequest(BaseModel):
    identity: str
    mission: str
    tone: str
    audience: str
    restrictions: str

class SearchOccurrence(BaseModel):
    text_snippet: str
    line_start: int
    line_end: int
    explanation: str

class SearchRequest(BaseModel):
    agent_id: Optional[int] = None
    system_prompt: str
    query: str
    model: Optional[str] = None

class SearchResponse(BaseModel):
    found: bool
    reasoning: str
    corrected_query: Optional[str] = None
    occurrences: List[SearchOccurrence] = []

class ChatRequest(BaseModel):
    agent_id: Optional[int] = None
    model: Optional[str] = None
    current_prompt: str
    messages: list[dict] # [{"role": "user", "content": "..."}, {"role": "assistant", "content": "..."}]
    image_url: Optional[str] = None # Base64 ou URL pública

async def get_best_model_for_agent(agent_id: Optional[int], requested_model: Optional[str] = None, default_model: str = "gpt-4o"):
    """
    Busca o melhor modelo configurado para o agente seguindo a hierarquia:
    1. requested_model (se informado pelo frontend na tela de configurações)
    2. router_complex_model (Modelo para Perguntas Complexas)
    3. router_complex_fallback_model
    4. model
    5. fallback_model
    6. default_model
    """
    if requested_model and requested_model.strip() and requested_model.lower() not in ["", "none", "null"]:
        return requested_model.strip()

    if not agent_id:
        return default_model

    from database import SessionLocal
    from models import AgentConfigModel
    from sqlalchemy import select

    try:
        async with SessionLocal() as db:
            result = await db.execute(select(AgentConfigModel).where(AgentConfigModel.id == agent_id))
            agent = result.scalars().first()
            if not agent:
                return default_model
            
            models = [
                agent.router_complex_model,
                agent.router_complex_fallback_model,
                agent.model,
                agent.fallback_model
            ]
            
            for m in models:
                if m and m.strip():
                    if m.lower() not in ["", "none", "null"]:
                        return m
                        
    except Exception as e:
        logger.warning(f"⚠️ Erro ao buscar modelo do agente {agent_id}: {e}. Usando fallback {default_model}")
        return default_model

async def log_advisor_interaction(
    agent_id: Optional[int],
    user_message: str,
    agent_response: str,
    model_used: str,
    input_tokens: int,
    output_tokens: int,
    origin: str = "Assistente de Prompt"
):
    """
    Grava os custos e tokens consumidos pelo Assistente de Prompt na tabela InteractionLog,
    permitindo rastreabilidade financeira completa no painel e relatórios.
    """
    try:
        from database import SessionLocal
        from models import InteractionLog
        from api.services.cost_service import calculate_ai_cost
        import json
        from datetime import datetime, timezone

        cost_usd, cost_brl = calculate_ai_cost(model_used, input_tokens, output_tokens)
        
        safe_agent_id = None
        if agent_id:
            try:
                parsed_id = int(agent_id)
                if parsed_id > 0:
                    safe_agent_id = parsed_id
            except (ValueError, TypeError):
                safe_agent_id = None

        async with SessionLocal() as db:
            new_log = InteractionLog(
                agent_id=safe_agent_id,
                session_id=f"advisor_{safe_agent_id or 'global'}",
                user_message=user_message or "Interação com Assistente de Prompt",
                agent_response=agent_response or "",
                model_used=f"{model_used} ({origin})",
                input_tokens=input_tokens or 0,
                output_tokens=output_tokens or 0,
                cached_tokens=0,
                cost_usd=cost_usd,
                cost_brl=cost_brl,
                debug_info=json.dumps({"origin": origin, "source": "prompt_lab"}),
                timestamp=datetime.now(timezone.utc)
            )
            db.add(new_log)
            await db.commit()
            logger.info(f"💰 Log financeiro gravado: {model_used} ({origin}) -> {input_tokens + output_tokens} tokens / R$ {cost_brl:.4f}")
    except Exception as e:
        logger.warning(f"⚠️ Erro ao registrar InteractionLog do Advisor: {e}")

@router.post("/generate-prompt")
async def generate_prompt(request: PromptRequest):
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="API Key not configured")

    system_instruction = """
    Você é um Engenheiro de Prompts Sênior especializado em criar Personas para Agentes de IA Profissionais.
    Sua missão é transformar inputs do usuário em um SYSTEM PROMPT dividido em 4 MACRO-BLOCOS obrigatórios:

    1. # PERSONA (Quem a IA é? Detalhes psicológicos, tom de autoridade).
    2. # TOM DE VOZ (Como ela fala? Formalidade, uso de gírias, brevidade).
    3. # REGRAS E LIMITAÇÕES (O que ela NUNCA deve fazer? Limites éticos e comportamentais).
    4. # CONTEXTO E INSTRUÇÕES GERAIS (Como ela deve agir em situações específicas e o contexto do negócio).

    DIRETRIZES:
    - Use Markdown para formatar.
    - O prompt final deve estar em Português do Brasil.
    - Seja criativo e transforme ideias simples em diretrizes de alto desempenho.
    - Mantenha a separação clara entre os 4 blocos acima.
    """

    user_input = f"""
    Crie um System Prompt profissional com base nestes dados brutos:
    
    - IDENTIDADE: {request.identity}
    - MISSÃO: {request.mission}
    - TOM DE VOZ: {request.tone}
    - PÚBLICO ALVO: {request.audience}
    - RESTRIÇÕES: {request.restrictions}
    """

    try:
        client = openai.Client(api_key=api_key)
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_instruction},
                {"role": "user", "content": user_input}
            ]
        )

        # Registra no financeiro
        if hasattr(response, 'usage') and response.usage:
            await log_advisor_interaction(
                agent_id=None,
                user_message=f"Gerar prompt: {request.identity} / {request.mission}",
                agent_response=response.choices[0].message.content,
                model_used="gpt-4o-mini",
                input_tokens=response.usage.prompt_tokens,
                output_tokens=response.usage.completion_tokens,
                origin="Gerador de Prompt"
            )
        
        return {"prompt": response.choices[0].message.content}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class PublishRequest(BaseModel):
    prompt: str

@router.patch("/agents/{agent_id}/publish")
async def publish_prompt(agent_id: int, request: PublishRequest):
    from database import SessionLocal
    from models import AgentConfigModel
    from sqlalchemy import select
    
    async with SessionLocal() as db:
        result = await db.execute(select(AgentConfigModel).where(AgentConfigModel.id == agent_id))
        db_config = result.scalars().first()
        
        if not db_config:
            raise HTTPException(status_code=404, detail="Agente não encontrado")
            
        db_config.system_prompt = request.prompt
        await db.commit()
        
        return {"message": f"Prompt publicado com sucesso no agente {db_config.name}!"}

@router.post("/prompt-chat")
async def prompt_chat(request: ChatRequest):
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="API Key not configured")

    # Prioriza o modelo selecionado nas configurações (Perguntas Complexas) ou o configurado no agente
    model_to_use = await get_best_model_for_agent(request.agent_id, request.model, "gpt-4o")

    lines = request.current_prompt.split('\n')
    numbered_prompt = "\n".join([f"{i+1}: {line}" for i, line in enumerate(lines)])

    system_instruction = f"""
    ### IDENTIDADE
    Você é um Engenheiro de Prompts Sênior e Analista Visual. Sua função é analisar o System Prompt e as IMAGENS enviadas para otimizar as instruções do agente.

    ### PROMPT ATUAL (NUMERADO PARA REFERÊNCIA)
    ---
    {numbered_prompt}
    ---

    ### CAPACIDADE VISUAL
    Você PODE e DEVE visualizar as imagens enviadas pelo usuário para entender o contexto (ex: prints de telas, fluxogramas, erros de interface) e sugerir melhorias no prompt baseadas nessa análise visual.

    ### REGRAS RÍGIDAS DE COMPORTAMENTO
    1. **REFERÊNCIA DE LINHAS:** Toda vez que mencionar algo do prompt, você DEVE citar o número da linha.
    2. **RESOLUÇÃO DE AMBIGUIDADE:** Se houver múltiplos assuntos parecidos, liste as linhas e PERGUNTAR qual deles alterar.

    ### PADRÃO OBRIGATÓRIO PARA RESPOSTAS DE EDIÇÃO (APENAS PEDIDOS DE MUDANÇA)
    Sempre que for propor uma alteração, você DEVE seguir este formato:
    
    "Na linha **[X]**, o texto atual é:
    '[Texto Original]'
    
    Vou alterar para:
    '[Novo Texto]'
    
    Clique em **'✨ Aplicar ao Editor'** para efetivar a alteração."

    ### DIRETRIZES DE COMPORTAMENTO
    1. FOCO NO TEXTO: Analise a imagem para entender a dúvida, mas sua resposta final deve ser focada em como atualizar o texto do prompt.
    2. TOM DE VOZ: Direto, técnico e profissional.
    """

    # Prepara as mensagens.
    formatted_messages = []
    for m in request.messages:
        # Garantir que o conteúdo seja string pura inicialmente
        msg_content = str(m.get("content") or "")
        formatted_messages.append({"role": m["role"], "content": msg_content})

    # Se houver uma imagem no request, injetamos na ÚLTIMA mensagem do usuário
    if request.image_url:
        # Encontra a última mensagem do usuário
        last_user_msg = None
        for m in reversed(formatted_messages):
            if m["role"] == "user":
                last_user_msg = m
                break
        
        if last_user_msg:
            last_user_msg["content"] = [
                {"type": "text", "text": last_user_msg["content"] or "Analise esta imagem."},
                {"type": "image_url", "image_url": {"url": request.image_url}}
            ]
        else:
            formatted_messages.append({
                "role": "user",
                "content": [
                    {"type": "text", "text": "Analise esta imagem em relação ao prompt."},
                    {"type": "image_url", "image_url": {"url": request.image_url}}
                ]
            })

    messages = [{"role": "system", "content": system_instruction}] + formatted_messages

    try:
        logger.info(f"🤖 Advisor: Processando chat (Modelo: {model_to_use})")
        
        from config_store import get_real_model_id, format_ai_params
        real_model_id = get_real_model_id(model_to_use)
        
        client = get_openai_client(real_model_id)
        
        kwargs = format_ai_params(real_model_id, model_to_use, {
            "messages": messages,
            "temperature": 0.5
        })

        response = await client.chat.completions.create(**kwargs)

        # Registra custo no financeiro
        try:
            last_user_text = "Interação com Assistente"
            for m in reversed(formatted_messages):
                if m["role"] == "user":
                    c = m.get("content")
                    if isinstance(c, list):
                        for part in c:
                            if isinstance(part, dict) and part.get("type") == "text":
                                last_user_text = part.get("text")
                                break
                    elif isinstance(c, str):
                        last_user_text = c
                    break

            if hasattr(response, 'usage') and response.usage:
                await log_advisor_interaction(
                    agent_id=request.agent_id,
                    user_message=last_user_text,
                    agent_response=response.choices[0].message.content,
                    model_used=response.model or model_to_use,
                    input_tokens=response.usage.prompt_tokens,
                    output_tokens=response.usage.completion_tokens,
                    origin="Assistente de Prompt"
                )
        except Exception as log_e:
            logger.warning(f"Erro ao salvar log do assistente: {log_e}")

        return {
            "content": response.choices[0].message.content,
            "model": response.model,
            "usage": {
                "prompt_tokens": response.usage.prompt_tokens,
                "completion_tokens": response.usage.completion_tokens,
                "total_tokens": response.usage.total_tokens
            }
        }
    except Exception as e:
        logger.error(f"❌ Erro no Advisor ({model_to_use}): {e}")
        # Fallback final para gpt-4o se tudo falhar
        if model_to_use != "gpt-4o":
            logger.info("🔄 Tentando fallback final para gpt-4o...")
            try:
                client = get_openai_client("gpt-4o")
                response = await client.chat.completions.create(
                    model="gpt-4o",
                    messages=messages,
                    temperature=0.5
                )

                # Registra no financeiro (fallback)
                if hasattr(response, 'usage') and response.usage:
                    await log_advisor_interaction(
                        agent_id=request.agent_id,
                        user_message="Interação Assistente (Fallback)",
                        agent_response=response.choices[0].message.content,
                        model_used=response.model or "gpt-4o",
                        input_tokens=response.usage.prompt_tokens,
                        output_tokens=response.usage.completion_tokens,
                        origin="Assistente de Prompt (Fallback)"
                    )

                return {
                    "content": response.choices[0].message.content,
                    "model": response.model,
                    "usage": {
                        "prompt_tokens": response.usage.prompt_tokens,
                        "completion_tokens": response.usage.completion_tokens,
                        "total_tokens": response.usage.total_tokens
                    }
                }
            except Exception as e2:
                raise HTTPException(status_code=500, detail=f"Erro crítico no Advisor: {str(e2)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/apply-suggestions")
async def apply_suggestions(request: ChatRequest):
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="API Key not configured")

    model_to_use = await get_best_model_for_agent(request.agent_id, request.model, "gpt-4o")
    chat_summary = "\n".join([f"{m['role']}: {m['content']}" for m in request.messages])

    system_instruction = """
    Você é um Engenheiro de Prompts Sênior. Sua missão é aplicar as alterações decididas na conversa ao System Prompt atual.
    
    REGRAS CRÍTICAS DE INTEGRIDADE:
    1. **PRESERVAÇÃO TOTAL:** Você deve manter ABSOLUTAMENTE TODAS as linhas e instruções originais que não foram objeto de alteração na conversa. 
    2. **PROIBIDO RESUMIR:** Jamais resuma ou simplifique o prompt original. Se o prompt tem 200 linhas, ele deve continuar com aproximadamente 200 linhas após a edição.
    3. **EDIÇÃO CIRÚRGICA:** Substitua apenas os trechos ou valores discutidos.
    4. **MACRO-BLOCOS:** Mantenha a estrutura de # PERSONA, # TOM DE VOZ, # REGRAS E LIMITAÇÕES e # CONTEXTO E INSTRUÇÕES GERAIS se elas já existirem.
    5. **INTEGRIDADE:** Se você omitir qualquer seção por "preguiça" ou economia de tokens, você estará falhando gravemente. Entregue o PROMPT COMPLETO.
    """

    user_input = f"""
    PROMPT ATUAL:
    ---
    {request.current_prompt}
    ---
    
    HISTÓRICO DA CONVERSA DE AJUSTE:
    ---
    {chat_summary}
    ---
    
    Com base na conversa acima, gere a nova versão mestre do prompt.
    """

    try:
        client = get_openai_client(model_to_use)
        from config_store import format_ai_params
        kwargs = format_ai_params(model_to_use, model_to_use, {
            "messages": [
                {"role": "system", "content": system_instruction},
                {"role": "user", "content": user_input}
            ],
            "temperature": 0
        })
        response = await client.chat.completions.create(**kwargs)

        # Registra custo no financeiro
        if hasattr(response, 'usage') and response.usage:
            await log_advisor_interaction(
                agent_id=request.agent_id,
                user_message="Aplicar sugestões ao editor de prompt",
                agent_response=response.choices[0].message.content,
                model_used=response.model or model_to_use,
                input_tokens=response.usage.prompt_tokens,
                output_tokens=response.usage.completion_tokens,
                origin="Aplicar Sugestões"
            )

        return {"prompt": response.choices[0].message.content}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/playground/test")
async def playground_test(request: PlaygroundRequest):
    # ... logic stays the same but using get_openai_client properly
    processed_prompt = resolve_conditional_blocks(request.system_prompt, request.variables)
    all_vars = request.variables.copy()
    for k, v in all_vars.items():
        processed_prompt = processed_prompt.replace(f"{{{k}}}", str(v))
        processed_prompt = processed_prompt.replace(f"{{ {k} }}", str(v))

    # --- INTEGRAÇÃO COM O CORE (PROCESS_MESSAGE) ---
    # Se temos um agent_id, usamos o fluxo real para garantir paridade total
    if request.agent_id:
        db = SessionLocal()
        try:
            from models import AgentConfigModel
            db_agent = db.query(AgentConfigModel).filter(AgentConfigModel.id == request.agent_id).first()
            if db_agent:
                # Se o usuário editou o prompt na tela, fazemos override temporário
                if request.system_prompt:
                    db_agent.system_prompt = request.system_prompt
                if request.model:
                    db_agent.model = request.model
                
                from agent_core.core import process_message
                result = await process_message(
                    message=request.user_message,
                    history=request.history,
                    config=db_agent,
                    tools=db_agent.tools,
                    context_variables=request.variables,
                    db=db
                )
                
                return {
                    "response": result["content"],
                    "rendered_prompt": processed_prompt, # Mantém para debug na UI
                    "usage": {
                        "prompt_tokens": result["usage"].prompt_tokens,
                        "completion_tokens": result["usage"].completion_tokens,
                        "total_tokens": result["usage"].total_tokens
                    },
                    "debug": result.get("debug")
                }
        except Exception as e_core:
            logger.error(f"Erro no core do playground: {e_core}")
        finally:
            db.close()

    # Fallback para teste de prompt puro (sem agente salvo)
    try:
        model_name = request.model or "gpt-4o-mini"
        client = get_openai_client(model_name)
        messages = [{"role": "system", "content": processed_prompt}]
        for msg in request.history:
            messages.append(msg)
        messages.append({"role": "user", "content": request.user_message})

        from config_store import format_ai_params
        kwargs = format_ai_params(model_name, model_name, {
            "messages": messages,
            "temperature": request.temperature,
            "max_tokens": 1000
        })

        response = await client.chat.completions.create(**kwargs)
        return {
            "response": response.choices[0].message.content,
            "rendered_prompt": processed_prompt,
            "usage": {
                "prompt_tokens": response.usage.prompt_tokens,
                "completion_tokens": response.usage.completion_tokens,
                "total_tokens": response.usage.total_tokens
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/search-prompt", response_model=SearchResponse)
async def search_prompt(request: SearchRequest):
    model_to_use = await get_best_model_for_agent(request.agent_id, "gpt-4o-mini")

    system_instruction = """
    Você é um Analista de Prompts super inteligente especializado em localização de conteúdo e intenção.
    Sua missão é ler o SYSTEM PROMPT fornecido e identificar onde o assunto pesquisado é tratado.
    
    ETAPAS OBRIGATÓRIAS:
    1. LIMPEZA E CORREÇÃO: Analise o 'ASSUNTO A PROCURAR'. Se houver erros de ortografia, gramática ou falta de clareza, corrija-o para um Português do Brasil limpo, seco e profissional.
    2. BUSCA SEMÂNTICA: Use a versão CORRIGIDA para buscar no prompt. Não busque apenas ocorrências literais. Se o usuário buscar "preço", você pode retornar seções que falem de "valor", "investimento" ou "pagamento".
    
    REGRAS CRÍTICAS:
    1. Se o assunto FOR encontrado, retorne found=true e uma lista de ocorrências.
    2. Cada ocorrência deve ter o campo 'text_snippet' com o texto exato do prompt (sem os números de linha), a 'line_start', 'line_end' e o campo 'explanation' (breve motivo da escolha).
    3. Retorne o campo 'corrected_query' com a versão limpa e corrigida do que o usuário digitou.
    4. No campo 'reasoning', forneça uma breve explicação da busca.
    5. Se o assunto NÃO for encontrado, retorne found=false.
    6. Retorne APENAS o JSON válido.
    """

    lines = request.system_prompt.split('\n')
    numbered_prompt = "\n".join([f"{i+1}: {line}" for i, line in enumerate(lines)])

    user_input = f"""
    ASSUNTO A PROCURAR: {request.query}
    
    SYSTEM PROMPT (numerado):
    ---
    {numbered_prompt}
    ---
    
    Retorne o resultado no formato JSON.
    """

    try:
        client = get_openai_client(model_to_use)
        from config_store import format_ai_params
        kwargs = format_ai_params(model_to_use, model_to_use, {
            "messages": [
                {"role": "system", "content": system_instruction},
                {"role": "user", "content": user_input}
            ],
            "response_format": {"type": "json_object"},
            "temperature": 0
        })

        response = await client.chat.completions.create(**kwargs)
        import json as _json
        return _json.loads(response.choices[0].message.content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
