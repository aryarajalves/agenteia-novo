from pydantic import BaseModel, ConfigDict
from typing import List, Dict, Any, Union, Optional
import json
import os
import time
from datetime import datetime

CONFIG_FILE = "config.json"

# =============================================================================
# MODEL_INFO: Referência de Famílias de Modelos
# - Os IDs reais são descobertos DINAMICAMENTE via discover_models()
# - Este dicionário define QUAIS famílias mostrar e seus PREÇOS/CAPACIDADES
# - Chaves = nomes de família que correspondem a prefixos de modelos reais
# =============================================================================
MODEL_INFO = {
    # == OpenAI Models (Preços por token) ==
    "gpt-5.4": {"input": 0.0000025, "output": 0.000015, "supports_tools": True, "supports_temperature": True, "context_window": "1.05M", "provider": "openai"},
    "gpt-5.2": {"input": 0.00000175, "output": 0.000014, "supports_tools": True, "supports_temperature": False, "context_window": "128k", "provider": "openai"},
    "gpt-5-mini": {"input": 0.0000003, "output": 0.0000021, "supports_tools": True, "supports_temperature": True, "context_window": "128k", "provider": "openai"},
    "gpt-5": {"input": 0.0000015, "output": 0.000012, "supports_tools": True, "supports_temperature": False, "context_window": "128k", "provider": "openai"},
    "o3-mini": {"input": 0.0000011, "output": 0.0000044, "supports_tools": True, "supports_temperature": False, "context_window": "200k", "provider": "openai"},
    "o1-mini": {"input": 0.0000011, "output": 0.0000044, "supports_tools": True, "supports_temperature": False, "context_window": "128k", "provider": "openai"},
    "gpt-4.1": {"input": 0.000001, "output": 0.000008, "supports_tools": True, "supports_temperature": True, "context_window": "128k", "provider": "openai"},
    "gpt-4o-mini": {"input": 0.00000015, "output": 0.0000006, "supports_tools": True, "supports_temperature": True, "context_window": "128k", "provider": "openai"},
    "gpt-4o": {"input": 0.0000025, "output": 0.00001, "supports_tools": True, "supports_temperature": True, "context_window": "128k", "provider": "openai"},
    "gpt-4-turbo": {"input": 0.00001, "output": 0.00003, "supports_tools": True, "supports_temperature": True, "context_window": "128k", "provider": "openai"},

    # == Gemini Models (Preços por token) ==
    "gemini-2.5-pro": {"input": 0.00000125, "output": 0.00001, "supports_tools": True, "supports_temperature": True, "context_window": "2M", "provider": "gemini"},
    "gemini-2.5-flash": {"input": 0.0000003, "output": 0.0000025, "supports_tools": True, "supports_temperature": True, "context_window": "1M", "provider": "gemini"},
    "gemini-2.0-flash": {"input": 0.0000001, "output": 0.0000004, "supports_tools": True, "supports_temperature": True, "context_window": "1M", "provider": "gemini"},
    "gemini-1.5-pro": {"input": 0.00000125, "output": 0.00001, "supports_tools": True, "supports_temperature": True, "context_window": "2M", "provider": "gemini"},
    "gemini-1.5-flash": {"input": 0.0000003, "output": 0.0000025, "supports_tools": True, "supports_temperature": True, "context_window": "1M", "provider": "gemini"},

    # == Anthropic Models (Preços por token) ==
    "claude-3-7-sonnet": {"input": 0.000003, "output": 0.000015, "supports_tools": True, "supports_temperature": True, "context_window": "200k", "provider": "anthropic"},
    "claude-3-5-sonnet": {"input": 0.000003, "output": 0.000015, "supports_tools": True, "supports_temperature": True, "context_window": "200k", "provider": "anthropic"},
    "claude-3-5-haiku": {"input": 0.000001, "output": 0.000005, "supports_tools": True, "supports_temperature": True, "context_window": "200k", "provider": "anthropic"},
    "claude-3-opus": {"input": 0.000015, "output": 0.000075, "supports_tools": True, "supports_temperature": True, "context_window": "200k", "provider": "anthropic"},
}

USD_TO_BRL = float(os.getenv("USD_TO_BRL_RATE") or os.getenv("USD_TO_BRL") or 5.30)
WHATSAPP_TEMPLATE_COST_BRL = 0.30 # Valor fixo sugerido para cada disparo de template

# =============================================================================
# Descoberta Dinâmica de Modelos via APIs
# =============================================================================
_models_cache = {"data": None, "timestamp": 0}
_MODELS_CACHE_TTL = 86400  # 24 horas

# Filtros para excluir modelos que não são de chat
_OPENAI_EXCLUDE = ["audio", "realtime", "tts", "transcribe", "search", "image", "instruct", "embedding", "codex"]
_GEMINI_EXCLUDE = ["embedding", "robotics", "audio", "tts", "customtools", "computer-use", "native-audio"]
_ANTHROPIC_EXCLUDE = []


def discover_models() -> list:
    """
    Busca modelos reais das APIs OpenAI e Gemini, cruza com MODEL_INFO
    para enriquecer com preços e capacidades. Cache de 24 horas via Redis (ou em memória local).
    
    Retorna lista de dicts com: id, real_id, supports_tools, supports_temperature,
    input, output, context_window, provider, available_versions
    """
    global _models_cache

    now = time.time()
    
    # 1. Tentar ler do Redis antes de bater nas APIs
    import redis as redis_lib
    r_client = None
    try:
        redis_url = os.getenv("REDIS_URL", "redis://redis:6379/0")
        r_client = redis_lib.from_url(redis_url, decode_responses=True)
        cached_data = r_client.get("ai_models_discovered")
        if cached_data:
            parsed = json.loads(cached_data)
            # Atualiza o cache local em memória por garantia e retorna
            _models_cache["data"] = parsed
            _models_cache["timestamp"] = now
            return parsed
    except Exception as e_redis:
        print(f"⚠️ Redis temporariamente indisponível para cache de modelos: {e_redis}")

    # Fallback para cache em memória local se o Redis falhar e ainda estiver no prazo do TTL
    if _models_cache["data"] and (now - _models_cache["timestamp"]) < _MODELS_CACHE_TTL:
        return _models_cache["data"]

    from openai import OpenAI

    openai_ids = []
    gemini_ids = []
    anthropic_ids = []

    # 1. Busca modelos OpenAI
    try:
        api_key = os.getenv("OPENAI_API_KEY")
        if api_key:
            client = OpenAI(api_key=api_key)
            api_models = client.models.list()
            openai_ids = sorted([
                m.id for m in api_models
                if m.id.startswith("gpt-")
                and not any(ex in m.id for ex in _OPENAI_EXCLUDE)
            ])
            print(f"✅ OpenAI: {len(openai_ids)} modelos de chat descobertos")
    except Exception as e:
        print(f"⚠️ Falha ao buscar modelos OpenAI: {e}")

    # 2. Busca modelos Gemini
    try:
        api_key = os.getenv("GEMINI_API_KEY")
        if api_key:
            client = OpenAI(
                api_key=api_key,
                base_url="https://generativelanguage.googleapis.com/v1beta/openai/"
            )
            api_models = client.models.list()
            gemini_ids = sorted([
                m.id.replace("models/", "") for m in api_models
                if "gemini" in m.id.lower()
                and not any(ex in m.id.lower() for ex in _GEMINI_EXCLUDE)
            ])
            print(f"✅ Gemini: {len(gemini_ids)} modelos de chat descobertos")
    except Exception as e:
        print(f"⚠️ Falha ao buscar modelos Gemini: {e}")

    # 3. Busca modelos Anthropic
    try:
        api_key = os.getenv("ANTHROPIC_API_KEY")
        if api_key:
            import anthropic
            ant_client = anthropic.Anthropic(api_key=api_key)
            ant_models = ant_client.models.list()
            anthropic_ids = sorted([m.id for m in ant_models.data if hasattr(m, 'id')])
            print(f"✅ Anthropic: {len(anthropic_ids)} modelos de chat descobertos")
    except Exception as e:
        print(f"⚠️ Falha ao buscar modelos Anthropic: {e}")

    has_openai = bool(os.getenv("OPENAI_API_KEY"))
    has_gemini = bool(os.getenv("GEMINI_API_KEY"))
    has_anthropic = bool(os.getenv("ANTHROPIC_API_KEY"))

    # 4. Cruza famílias do MODEL_INFO com modelos reais encontrados
    result = []
    for family, info in MODEL_INFO.items():
        provider = info.get("provider", "openai")
        if provider == "openai" and not (has_openai and openai_ids):
            continue
        if provider == "gemini" and not (has_gemini and gemini_ids):
            continue
        if provider == "anthropic" and not (has_anthropic and anthropic_ids):
            continue

        if provider == "gemini": pool = gemini_ids
        elif provider == "anthropic": pool = anthropic_ids
        else: pool = openai_ids

        # Encontra versões reais disponíveis para esta família
        versions = [m for m in pool if m.startswith(family)]

        # Resolve o melhor ID real
        if family in pool:
            # O alias base existe (ex: "gpt-5.2", "gemini-2.5-pro")
            real_id = family
        elif versions:
            # Pega versão datada mais recente
            dated = [v for v in versions if any(c.isdigit() for c in v.replace(family, "").lstrip("-"))]
            real_id = sorted(dated)[-1] if dated else versions[0]
        else:
            # Nenhum modelo encontrado para esta família específica.
            # Verificamos se existe algum modelo do mesmo provedor para usar como fallback
            if provider == "openai" and openai_ids:
                # Se for "gpt-5", "gpt-4" etc, tenta o melhor disponível (o1 > gpt-4o > gpt-4o-mini)
                o1_models = [m for m in openai_ids if m.startswith("o1")]
                gpt4_models = [m for m in openai_ids if m.startswith("gpt-4o")]
                
                if o1_models: real_id = sorted(o1_models)[-1]
                elif gpt4_models: real_id = sorted(gpt4_models)[-1]
                else: real_id = openai_ids[-1]
                
                print(f"⚠️ Família '{family}' não encontrada. Usando melhor disponível OpenAI: {real_id}")
            elif provider == "gemini":
                # Resolução direta para Gemini (mapeia famílias futurísticas para estáveis)
                if "3.1" in family or "2.5" in family:
                    is_pro = "pro" in family
                    if gemini_ids:
                        # Se temos modelos reais, tenta achar o melhor 'pro' ou 'flash'
                        pros = [m for m in gemini_ids if "pro" in m]
                        flashes = [m for m in gemini_ids if "flash" in m]
                        if is_pro and pros: real_id = sorted(pros)[-1]
                        elif not is_pro and flashes: real_id = sorted(flashes)[-1]
                        else: real_id = gemini_ids[-1]
                    else:
                        # Fallback hardcoded se a descoberta falhar completamente
                        real_id = "gemini-1.5-pro-002" if is_pro else "gemini-1.5-flash-002"
                elif gemini_ids:
                    # Pega o melhor Gemini disponível para outras famílias
                    gemini_pros = [m for m in gemini_ids if "pro" in m]
                    real_id = sorted(gemini_pros)[-1] if gemini_pros else gemini_ids[-1]
                else:
                    real_id = "gemini-1.5-pro-002"
                print(f"⚠️ Família '{family}' não encontrada. Usando mapeamento Gemini: {real_id}")
            elif provider == "anthropic":
                # Resolução direta de IDs reais para chamadas de API (Hifenizado, sem pontos)
                if "4.6-opus" in family:
                    real_id = "claude-opus-4-6"
                elif "4.6-sonnet" in family:
                    real_id = "claude-sonnet-4-6"
                elif "4.5-haiku" in family:
                    real_id = "claude-haiku-4-5"
                elif "3.5-sonnet" in family:
                    real_id = "claude-3-5-sonnet-20241022"
                elif "opus" in family:
                    real_id = "claude-3-opus-20240229"
                elif "sonnet" in family:
                    real_id = "claude-3-7-sonnet-20250219"
                elif "haiku" in family:
                    real_id = "claude-3-5-haiku-20241022"
                else:
                    real_id = "claude-sonnet-4-6"
                print(f"✅ Família '{family}' mapeada para identificador exato '{real_id}'")
            else:
                # Nenhum modelo encontrado — usa o nome da família como último recurso
                real_id = family
                print(f"❌ Família '{family}' não encontrada na API {provider} e nenhum fallback possível.")

        result.append({
            "id": family,
            "real_id": real_id,
            "supports_tools": info.get("supports_tools", True),
            "supports_temperature": info.get("supports_temperature", True),
            "input": info.get("input", 0),
            "output": info.get("output", 0),
            "context_window": info.get("context_window", "Unknown"),
            "provider": provider,
            "available_versions": versions
        })

    # Salva no Redis com TTL de 24 horas para evitar chamadas de API externas frequentes
    try:
        if r_client:
            # TTL de 24h = 86400 segundos
            r_client.setex("ai_models_discovered", 86400, json.dumps(result))
            print("💾 Descoberta de modelos gravada no Redis com sucesso (Expira em 24h).")
    except Exception as e_redis_save:
        print(f"⚠️ Erro ao persistir cache de modelos no Redis: {e_redis_save}")

    _models_cache = {"data": result, "timestamp": now}
    return result


def get_real_model_id(family_name: str) -> str:
    """Resolve um nome de família (ex: 'gemini-3.1-pro') para o ID real da API."""
    models = discover_models()
    for m in models:
        if m["id"] == family_name:
            return m["real_id"]
    # Se não encontrou na lista, retorna como está
    return family_name


def get_model_pricing(model_name: str) -> dict:
    """Busca preço de um modelo pelo nome (família ou ID real). Usado no cálculo de custos."""
    # Tenta match direto
    if model_name in MODEL_INFO:
        return MODEL_INFO[model_name]
    # Tenta match por prefixo (ex: "gpt-5.2-2025-12-11" → "gpt-5.2")
    for family in sorted(MODEL_INFO.keys(), key=len, reverse=True):
        if model_name.startswith(family):
            return MODEL_INFO[family]
    return {}


def format_ai_params(api_model_name: str, family_name: str, base_params: dict) -> dict:
    """
    Ajusta os parâmetros da chamada de Chat Completion baseado no modelo.
    Ex: Converte max_tokens em max_completion_tokens para modelos NEXT-GEN (GPT-5, O1).
    """
    info = get_model_pricing(family_name)
    supports_temp = info.get("supports_temperature", True)
    
    # Detecção de próxima geração (prefixo gpt-5, o1 ou flag explícita)
    is_next_gen = api_model_name.startswith("o1") or api_model_name.startswith("gpt-5") or not supports_temp
    
    kwargs = base_params.copy()
    kwargs["model"] = api_model_name
    
    if is_next_gen:
        # Next-gen models em OpenAI não suportam temperature, top_p, penalty, e exigem max_completion_tokens
        if "max_tokens" in kwargs:
            kwargs["max_completion_tokens"] = kwargs.pop("max_tokens")
        
        kwargs.pop("temperature", None)
        kwargs.pop("top_p", None)
        kwargs.pop("presence_penalty", None)
        kwargs.pop("frequency_penalty", None)
        
        # o1 models also don't support response_format="json_object" currently
        if "response_format" in kwargs and kwargs["response_format"].get("type") == "json_object":
            kwargs.pop("response_format")

    return kwargs

class KnowledgeItem(BaseModel):
    id: int | None = None
    question: str
    answer: str
    metadata_val: str | None = None
    category: str | None = "Geral"
    source_metadata: str | None = None

    model_config = ConfigDict(from_attributes=True)

class KnowledgeBase(BaseModel):
    id: int | None = None
    name: str = "Nova Base"
    description: str | None = None
    kb_type: str = "qa"
    question_label: str = "Pergunta"
    answer_label: str = "Resposta"
    metadata_label: str = "Metadado"
    items: list[KnowledgeItem] = []
    updated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)

class AgentConfig(BaseModel):
    id: int | None = None
    name: str = "Novo Agente"
    description: str | None = None
    model: str = "gpt-5.2"
    fallback_model: str | None = None
    temperature: float | None = 1.0
    top_p: float | None = 1.0
    top_k: int | None = 40
    presence_penalty: float | None = 0.0
    frequency_penalty: float | None = 0.0
    safety_settings: str | None = "standard" # standard, high, low, none
    model_settings: dict = {} # Map of role -> {temperature, top_p, etc}
    is_active: bool = True
    date_awareness: bool = False
    date_awareness_past_days: int = 7
    date_awareness_future_days: int = 7
    system_prompt: str = "Você é um assistente útil e inteligente."
    context_window: int = 5
    knowledge_base: list = [] # Manual FAQs
    knowledge_base_id: int | None = None # Linked KB (Legacy)
    knowledge_base_ids: list[int] = [] # Linked KBs (Multi)
    rag_retrieval_count: int = 5 # RAG Top-K
    rag_translation_enabled: bool = False
    rag_multi_query_enabled: bool = False
    rag_rerank_enabled: bool = True
    rag_agentic_eval_enabled: bool = True
    rag_parent_expansion_enabled: bool = True
    tool_ids: list[int] = [] # Selected tools
    simulated_time: str | None = None # HH:MM for time override
    
    # Security Guardrails
    security_competitor_blacklist: str | None = None
    security_forbidden_topics: str | None = None
    security_discount_policy: str | None = None
    security_language_complexity: str = "standard" # standard, simple, technical
    security_pii_filter: bool = False
    security_validator_ia: bool = False
    
    # Bot-to-Bot Defense (Anti-Loop)
    security_bot_protection: bool = False
    security_max_messages_per_session: int = 20
    security_semantic_threshold: float = 0.85
    security_loop_count: int = 3
    
    # UI Customization
    ui_primary_color: str = "#6366f1"
    ui_header_color: str = "#0f172a"
    ui_chat_title: str = "Suporte Inteligente"
    ui_welcome_message: str = "Olá! Como posso te ajudar hoje?"
    initial_message: Optional[str] = None
    initial_question_message: Optional[str] = None
    initial_ignore_message: Optional[str] = None
    inbox_capture_enabled: bool = True
    router_enabled: bool = False
    router_simple_model: str = "gpt-5-mini"
    router_simple_fallback_model: str | None = None
    router_complex_model: str = "gpt-5.2"
    router_complex_fallback_model: str | None = None
    handoff_enabled: bool = False
    inbox_capture_enabled: bool = True
    response_translation_enabled: bool = False
    response_translation_fallback_lang: str = "portuguese"
    tool_prompts: dict | None = None
    greeting_mode: str = "prompt"
    qualification_questions: Optional[str] = None
    qualification_labels: Optional[str] = None
    qualification_criteria: Optional[str] = None
    qualification_final_action: Optional[str] = None
    unanswered_handoff_limit: Optional[int] = 2
    unanswered_question_prompt: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

def load_config():
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                return AgentConfig(**data)
        except Exception as e:
            print(f"Erro ao carregar config: {e}")
    return AgentConfig()

_current_config = load_config()

def get_config() -> AgentConfig:
    global _current_config
    return _current_config

def update_config(new_config: AgentConfig):
    global _current_config
    _current_config = new_config
    try:
        with open(CONFIG_FILE, "w", encoding="utf-8") as f:
            json.dump(new_config.dict(), f, indent=4, ensure_ascii=False)
    except Exception as e:
        print(f"Erro ao salvar config: {e}")
