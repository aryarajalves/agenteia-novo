import pytest
from unittest.mock import AsyncMock, patch
from agent_core.core import process_message
from config_store import AgentConfig, KnowledgeBase

@pytest.mark.asyncio
async def test_rag_items_returns_full_objects():
    """Valida se debug['rag_items'] retorna objetos completos de itens da base e não apenas IDs."""
    kb = KnowledgeBase(id=1, name="Base Teste")
    config = AgentConfig(
        id=1,
        name="Agente RAG Teste",
        system_prompt="Você é um assistente virtual.",
        model="gpt-4o-mini",
        knowledge_base_id=1,
        knowledge_bases=[kb]
    )

    mock_db = AsyncMock()
    pre_router_mock = {"precisa_rag": True}

    rag_item_mock = {
        "id": 42,
        "question": "Como funciona o curso?",
        "answer": "O curso funciona através de aulas práticas do Método Laser Day.",
        "category": "Geral",
        "relevance_score": 0.92,
        "metadata": {"page": 1}
    }

    with patch("agent_core.core.run_pre_router_ai", return_value=pre_router_mock), \
         patch("services.rag.core.search_knowledge_base", new_callable=AsyncMock) as mock_search, \
         patch("services.rag.search_knowledge_base", new_callable=AsyncMock) as mock_search2, \
         patch("rag_service.search_knowledge_base", new_callable=AsyncMock) as mock_search3:
        mock_search.return_value = ([rag_item_mock], [], None)
        mock_search2.return_value = ([rag_item_mock], [], None)
        mock_search3.return_value = ([rag_item_mock], [], None)
        
        result = await process_message("Como funciona o curso?", [], config, [], {}, db=mock_db)

        debug = result.get("debug", {})
        rag_items = debug.get("rag_items", [])
        
        assert len(rag_items) == 1
        # Validate that the object contains question, answer, category and relevance_score
        assert isinstance(rag_items[0], dict)
        assert rag_items[0]["id"] == 42
        assert rag_items[0]["question"] == "Como funciona o curso?"
        assert rag_items[0]["answer"] == "O curso funciona através de aulas práticas do Método Laser Day."
        assert rag_items[0]["category"] == "Geral"
