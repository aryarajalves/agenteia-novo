import pytest
from unittest.mock import AsyncMock, patch
from agent_core.core import process_message
from config_store import AgentConfig

@pytest.mark.asyncio
async def test_rag_resolution_finds_kb_ids_from_knowledge_base_ids():
    """Valida se process_message consegue resolver as bases de conhecimento via knowledge_base_ids mesmo se knowledge_bases estiver vazio."""
    config = AgentConfig(
        id=1,
        name="Agente RAG Teste",
        system_prompt="Você é um assistente virtual.",
        model="gpt-4o-mini",
        knowledge_base_ids=[10, 20]
    )

    mock_db = AsyncMock()
    pre_router_mock = {"precisa_rag": True}

    rag_item_mock = {
        "id": 42,
        "question": "Qualquer pessoa pode fazer curso Ou precisa ter formação em alguma área?",
        "answer": "Qualquer pessoa pode fazer o curso, não é necessária formação prévia.",
        "category": "Geral",
        "relevance_score": 0.95
    }

    with patch("agent_core.core.run_pre_router_ai", return_value=pre_router_mock), \
         patch("services.rag.core.search_knowledge_base", new_callable=AsyncMock) as mock_search, \
         patch("rag_service.search_knowledge_base", new_callable=AsyncMock) as mock_search2:
        
        mock_search.return_value = ([rag_item_mock], [], None)
        mock_search2.return_value = ([rag_item_mock], [], None)

        result = await process_message("Qualquer pessoa pode fazer curso?", [], config, [], {}, db=mock_db)

        debug = result.get("debug", {})
        rag_items = debug.get("rag_items", [])
        
        # Confirm that search_knowledge_base was invoked and retrieved the item
        assert len(rag_items) == 1
        assert rag_items[0]["id"] == 42
