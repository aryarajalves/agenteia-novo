import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from agent_core.core import process_message
from api.schemas import MessageResponse

class DummyConfig:
    def __init__(self, **kwargs):
        self.id = 36
        self.name = "Agente Teste"
        self.model = "gpt-5-mini"
        self.router_enabled = True
        self.router_simple_model = "gpt-4o-mini"
        self.router_complex_model = "gpt-5-mini"
        self.fallback_model = None
        self.system_prompt = "Você é um assistente."
        self.context_window = 5
        self.temperature = 0.7
        self.top_p = 1.0
        self.top_k = 40
        self.presence_penalty = 0.0
        self.frequency_penalty = 0.0
        self.safety_settings = "standard"
        self.is_active = True
        self.date_awareness = False
        self.knowledge_base = "[]"
        self.simulated_time = None
        self.rag_retrieval_count = 5
        self.rag_translation_enabled = False
        self.rag_multi_query_enabled = False
        self.rag_rerank_enabled = False
        self.rag_agentic_eval_enabled = False
        self.rag_parent_expansion_enabled = False
        self.rag_relevance_threshold = 0.0
        self.semantic_cache_enabled = True
        self.semantic_cache_threshold = 0.85
        self.qualification_questions = []
        for k, v in kwargs.items():
            setattr(self, k, v)

@pytest.mark.asyncio
async def test_message_response_schema_model_role():
    resp = MessageResponse(
        response="Olá!",
        cost_usd=0.001,
        cost_brl=0.005,
        input_tokens=100,
        output_tokens=20,
        model_used="gpt-4o-mini",
        model_role="router_simple"
    )
    assert resp.model_role == "router_simple"
    assert resp.model_used == "gpt-4o-mini"

@pytest.mark.asyncio
async def test_router_simple_role_on_semantic_cache_hit():
    config = DummyConfig(router_enabled=True, router_simple_model="gpt-4o-mini", router_complex_model="gpt-5-mini")
    mock_choice = MagicMock()
    mock_choice.message.content = "Como funciona o curso é assim..."
    mock_choice.message.tool_calls = None
    mock_completion = MagicMock(choices=[mock_choice], usage=MagicMock(prompt_tokens=50, completion_tokens=20, prompt_tokens_details=None))

    mock_client = AsyncMock()
    mock_client.chat.completions.create = AsyncMock(return_value=mock_completion)

    with patch("agent_core.core.get_openai_client", return_value=mock_client), \
         patch("agent_core.core.handle_semantic_cache_check", return_value=(None, "# RESPOSTA OFICIAL PRÉ-APROVADA DO CACHE SEMÂNTICO\nResposta cache", {"status": "hit_qualification"})):
        
        result = await process_message(
            message="como funciona o curso",
            history=[],
            config=config,
            tools=[]
        )
        assert result["model"] == "gpt-4o-mini"
        assert result["model_role"] == "router_simple"
        assert result["debug"]["model_role"] == "router_simple"

@pytest.mark.asyncio
async def test_router_complex_role_when_complex_message():
    config = DummyConfig(router_enabled=True, router_simple_model="gpt-4o-mini", router_complex_model="gpt-5-mini")
    mock_choice = MagicMock()
    mock_choice.message.content = "Resposta complexa detalhada"
    mock_choice.message.tool_calls = None
    mock_completion = MagicMock(choices=[mock_choice], usage=MagicMock(prompt_tokens=100, completion_tokens=50, prompt_tokens_details=None))

    mock_client = AsyncMock()
    mock_client.chat.completions.create = AsyncMock(return_value=mock_completion)

    with patch("agent_core.core.get_openai_client", return_value=mock_client), \
         patch("agent_core.core.handle_semantic_cache_check", return_value=(None, None, {"status": "miss"})), \
         patch("agent_core.core.classify_message_complexity", return_value="COMPLEX"):
        
        result = await process_message(
            message="Quero saber detalhes avançados de personalização e termos de garantia",
            history=[],
            config=config,
            tools=[]
        )
        assert result["model"] == "gpt-5-mini"
        assert result["model_role"] == "router_complex"
        assert result["debug"]["model_role"] == "router_complex"

@pytest.mark.asyncio
async def test_main_role_when_router_disabled():
    config = DummyConfig(router_enabled=False, model="gpt-5-mini")
    mock_choice = MagicMock()
    mock_choice.message.content = "Resposta padrão"
    mock_choice.message.tool_calls = None
    mock_completion = MagicMock(choices=[mock_choice], usage=MagicMock(prompt_tokens=40, completion_tokens=15, prompt_tokens_details=None))

    mock_client = AsyncMock()
    mock_client.chat.completions.create = AsyncMock(return_value=mock_completion)

    with patch("agent_core.core.get_openai_client", return_value=mock_client), \
         patch("agent_core.core.handle_semantic_cache_check", return_value=(None, None, {"status": "miss"})):
        
        result = await process_message(
            message="Olá, tudo bem?",
            history=[],
            config=config,
            tools=[]
        )
        assert result["model"] == "gpt-5-mini"
        assert result["model_role"] == "main"
