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


@pytest.mark.asyncio
async def test_fts_recruited_item_computes_cosine_distance_and_non_zero_relevance_score():
    """
    Valida que itens recrutados pela busca textual (FTS) que não estavam no top vetorial inicial
    têm sua distância e relevância calculadas sob demanda a partir de seus embeddings,
    evitando que exibam 0% indevidamente na interface do simulador.
    """
    from services.rag.core import _search_single_query
    from unittest.mock import MagicMock
    import numpy as np

    mock_db = AsyncMock()

    # Item simulado com embedding de 1536 dimensões
    mock_item = MagicMock()
    mock_item.id = 186
    mock_item.question = "O certificado é reconhecido pelo MEC?"
    mock_item.answer = "Sim, o curso oferece certificado reconhecido pelo MEC."
    mock_item.metadata_val = None
    mock_item.category = "Geral"
    mock_item.source_metadata = None
    mock_item.question_variations = []
    mock_item.knowledge_base_id = 36
    # Embedding simulado que tem similaridade ~0.56 com a query
    q_emb = [0.1] * 1536
    mock_item.embedding = np.array([0.05] * 1536, dtype=np.float32)

    # 1. Vector Search retorna lista vazia (simulando item fora do corte vetorial inicial)
    mock_v_res = MagicMock()
    mock_v_res.all.return_value = []

    # 2. FTS Search retorna o mock_item
    mock_f_res = MagicMock()
    mock_f_res.scalars.return_value.all.return_value = [mock_item]

    # 3. Consulta de KnowledgeBaseModel (para labels de pergunta/resposta)
    mock_kb_res = MagicMock()
    mock_kb_res.scalars.return_value.first.return_value = None

    mock_db.execute = AsyncMock(side_effect=[mock_v_res, mock_f_res, mock_kb_res])

    with patch("services.rag.core.get_embedding", new_callable=AsyncMock) as mock_get_emb:
        mock_get_emb.return_value = (q_emb, None)

        items, discarded, usage = await _search_single_query(
            db=mock_db,
            query="o curso tem certificado?",
            target_ids={36},
            limit=5,
            similarity_threshold=0.0,
            rag_translation_enabled=False,
            rag_multi_query_enabled=False,
            rag_rerank_enabled=False,
            rag_agentic_eval_enabled=False,
            rag_parent_expansion_enabled=False
        )

        assert len(items) == 1
        found = items[0]
        assert found["id"] == 186
        # Distância e relevância devem ter sido calculadas (não podem ser None nem 0.0)
        assert found["distance"] is not None
        assert found["relevance_score"] > 0.0
        # Relevância de dois vetores colineares positivos é 1.0 (ou próxima), nunca 0%
        assert found["relevance_score"] >= 0.99


@pytest.mark.asyncio
async def test_rerank_results_assigns_descending_relevance_scores_and_updates_items():
    """
    Valida que o Reranker atribui notas oficiais de relevância aos itens reordenados,
    garantindo que o relevance_score seja atualizado e siga estritamente a ordem decrescente.
    """
    from services.rag.agentic import rerank_results
    from unittest.mock import MagicMock
    import json

    items_in = [
        {"id": 1, "question": "No curso tem certificado?", "answer": "Tem sim!", "relevance_score": 0.63},
        {"id": 2, "question": "O certificado é reconhecido pelo MEC?", "answer": "Sim, tem prova.", "relevance_score": 0.56},
        {"id": 3, "question": "Como funciona essa prova?", "answer": "A prova é online.", "relevance_score": 0.67}
    ]

    # Simular resposta do LLM com notas atribuídas pela IA
    llm_output = {
        "ranking": [
            {"index": 0, "score": 95},
            {"index": 1, "score": 85},
            {"index": 2, "score": 70}
        ]
    }

    mock_resp = MagicMock()
    mock_choice = MagicMock()
    mock_choice.message.content = json.dumps(llm_output)
    mock_resp.choices = [mock_choice]
    mock_resp.usage = MagicMock()

    with patch("services.rag.agentic.call_rag_llm", new_callable=AsyncMock) as mock_call:
        mock_call.return_value = mock_resp

        reranked, usage = await rerank_results("certificado", items_in)

        assert len(reranked) == 3
        # 1º item deve ter recebido a maior nota do rerank
        assert reranked[0]["id"] == 1
        assert reranked[0]["relevance_score"] == 0.95
        assert reranked[0]["rerank_score"] == 0.95

        # 2º item deve ter recebido a segunda maior nota
        assert reranked[1]["id"] == 2
        assert reranked[1]["relevance_score"] == 0.85

        # 3º item deve ter recebido a menor nota
        assert reranked[2]["id"] == 3
        assert reranked[2]["relevance_score"] == 0.70

        # As notas de relevância devem ser estritamente decrescentes
        scores = [it["relevance_score"] for it in reranked]
        assert scores == sorted(scores, reverse=True)


@pytest.mark.asyncio
async def test_rerank_results_backward_compatibility_plain_list():
    """
    Valida compatibilidade reversa quando o modelo LLM retorna uma lista simples de índices.
    """
    from services.rag.agentic import rerank_results
    from unittest.mock import MagicMock
    import json

    items_in = [
        {"id": 1, "question": "Q1", "answer": "A1", "relevance_score": 0.50},
        {"id": 2, "question": "Q2", "answer": "A2", "relevance_score": 0.80},
    ]

    mock_resp = MagicMock()
    mock_choice = MagicMock()
    mock_choice.message.content = json.dumps([1, 0])
    mock_resp.choices = [mock_choice]
    mock_resp.usage = MagicMock()

    with patch("services.rag.agentic.call_rag_llm", new_callable=AsyncMock) as mock_call:
        mock_call.return_value = mock_resp

        reranked, usage = await rerank_results("teste", items_in)

        assert len(reranked) == 2
        assert reranked[0]["id"] == 2
        assert reranked[1]["id"] == 1


