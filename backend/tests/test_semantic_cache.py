import pytest
import math
from unittest.mock import AsyncMock, patch, MagicMock
from services.semantic_cache_service import cosine_similarity, update_semantic_cache, save_semantic_cache, lookup_semantic_cache
from models import SemanticCacheModel

def test_cosine_similarity_identical():
    v1 = [1.0, 0.0, 0.5]
    v2 = [1.0, 0.0, 0.5]
    assert math.isclose(cosine_similarity(v1, v2), 1.0, rel_tol=1e-5)

def test_cosine_similarity_orthogonal():
    v1 = [1.0, 0.0]
    v2 = [0.0, 1.0]
    assert math.isclose(cosine_similarity(v1, v2), 0.0, abs_tol=1e-5)

def test_cosine_similarity_empty():
    assert cosine_similarity([], []) == 0.0
    assert cosine_similarity([1.0], [1.0, 2.0]) == 0.0

def test_cosine_similarity_variations():
    v_base = [0.8, 0.2, 0.5]
    v_similar = [0.78, 0.22, 0.49]
    v_different = [-0.5, 0.8, -0.2]
    
    sim_high = cosine_similarity(v_base, v_similar)
    sim_low = cosine_similarity(v_base, v_different)
    
    assert sim_high > 0.98
    assert sim_low < 0.2

@pytest.mark.asyncio
async def test_update_semantic_cache_fields():
    mock_db = AsyncMock()
    mock_item = SemanticCacheModel(
        id=1,
        agent_id=1,
        user_query="pergunta antiga",
        approved_response="resposta antiga",
        embedding=[0.1, 0.2],
        alternate_queries=[],
        alternate_embeddings=[],
        is_active=True
    )
    
    mock_result = MagicMock()
    mock_result.scalars.return_value.first.return_value = mock_item
    mock_db.execute.return_value = mock_result

    with patch('services.semantic_cache_service.get_embedding', new_callable=AsyncMock) as mock_emb:
        mock_emb.return_value = ([0.9, 0.8], 10)
        
        updated = await update_semantic_cache(
            db=mock_db,
            cache_id=1,
            user_query="pergunta nova editada",
            approved_response="resposta nova editada",
            alternate_queries=["como funciona?", "qual o formato?"]
        )
        
        assert updated is not None
        assert updated.user_query == "pergunta nova editada"
        assert updated.approved_response == "resposta nova editada"
        assert updated.alternate_queries == ["como funciona?", "qual o formato?"]
        assert len(updated.alternate_embeddings) == 2
        mock_db.commit.assert_called_once()

@pytest.mark.asyncio
async def test_lookup_semantic_cache_hit_on_alternate_query():
    mock_db = AsyncMock()
    
    # Item com pergunta principal diferente, mas pergunta alternativa idêntica à query
    mock_item = SemanticCacheModel(
        id=1,
        agent_id=1,
        user_query="como funciona o curso de vcs?",
        approved_response="O curso é 100% online com certificado.",
        embedding=[0.1, 0.9], # Muito diferente da query buscada
        alternate_queries=["qual a metodologia do curso?"],
        alternate_embeddings=[[1.0, 0.0, 0.5]], # Perfeitamente similar à query buscada
        usage_count=0,
        is_active=True
    )
    
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = [mock_item]
    mock_db.execute.return_value = mock_result

    with patch('services.semantic_cache_service.get_embedding', new_callable=AsyncMock) as mock_emb:
        # Query que é similar à variação alternativa
        mock_emb.return_value = ([1.0, 0.0, 0.5], 5)
        
        hit_item, similarity = await lookup_semantic_cache(
            db=mock_db,
            agent_id=1,
            user_query="qual a metodologia do curso?",
            threshold=0.92
        )
        
        assert hit_item is not None
        assert hit_item.id == 1
        assert similarity >= 0.99
        assert hit_item.approved_response == "O curso é 100% online com certificado."
