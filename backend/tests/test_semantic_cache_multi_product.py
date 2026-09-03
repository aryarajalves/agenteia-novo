import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from services.semantic_cache_service import (
    save_semantic_cache,
    lookup_semantic_cache,
    update_semantic_cache,
    list_semantic_caches
)
from models import SemanticCacheModel

@pytest.mark.asyncio
async def test_save_and_update_with_category_tag():
    mock_db = AsyncMock()
    mock_res = MagicMock()
    mock_res.scalars.return_value.first.return_value = None
    mock_db.execute.return_value = mock_res

    with patch("services.semantic_cache_service.get_embedding", new_callable=AsyncMock) as mock_emb:
        mock_emb.return_value = ([0.1, 0.2], 10)
        
        item = await save_semantic_cache(
            db=mock_db,
            agent_id=1,
            user_query="Como comprar o Método Laser Day?",
            approved_response="Aqui está o link: https://pay.laserday.com",
            category_tag="Método Laser Day"
        )

        assert item.category_tag == "Método Laser Day"
        assert item.user_query == "Como comprar o Método Laser Day?"


@pytest.mark.asyncio
async def test_lookup_semantic_cache_product_isolation():
    """Valida que itens vinculados a outros produtos são excluídos da disputa quando há um active_product diferente."""
    mock_db = AsyncMock()

    # Item do Curso Laser Day
    item_laser = MagicMock(spec=SemanticCacheModel)
    item_laser.id = 1
    item_laser.user_query = "Quero o link do Laser Day"
    item_laser.approved_response = "Link Laser Day"
    item_laser.category_tag = "Método Laser Day"
    item_laser.embedding = [1.0, 0.0]
    item_laser.alternate_embeddings = []
    item_laser.similarity_threshold = None
    item_laser.is_active = True

    # Item do Curso Sobrancelhas
    item_sobrancelha = MagicMock(spec=SemanticCacheModel)
    item_sobrancelha.id = 2
    item_sobrancelha.user_query = "Quero o link do Sobrancelhas"
    item_sobrancelha.approved_response = "Link Sobrancelhas"
    item_sobrancelha.category_tag = "Master Sobrancelhas"
    item_sobrancelha.embedding = [0.0, 1.0]
    item_sobrancelha.alternate_embeddings = []
    item_sobrancelha.similarity_threshold = None
    item_sobrancelha.is_active = True

    mock_res = MagicMock()
    mock_res.scalars.return_value.all.return_value = [item_laser, item_sobrancelha]
    mock_db.execute.return_value = mock_res

    with patch("services.semantic_cache_service.get_embedding", new_callable=AsyncMock) as mock_emb:
        # Retorna embedding genérico de 'link'
        mock_emb.side_effect = [
            ([0.5, 0.5], 5), # embedding da query original
            ([0.99, 0.05], 10) # embedding da query enriquecida com [Método Laser Day]
        ]

        # Quando active_product = "Método Laser Day", item_sobrancelha é isolado e item_laser dá match!
        matched, sim = await lookup_semantic_cache(
            db=mock_db,
            agent_id=1,
            user_query="Me manda o link",
            threshold=0.85,
            active_product="Método Laser Day"
        )

        assert matched is not None
        assert matched.id == 1
        assert matched.category_tag == "Método Laser Day"
        assert sim >= 0.85


@pytest.mark.asyncio
async def test_update_semantic_cache_clear_category_tag():
    mock_db = AsyncMock()
    
    item = MagicMock(spec=SemanticCacheModel)
    item.id = 10
    item.user_query = "Dúvida"
    item.approved_response = "Resposta"
    item.category_tag = "Antigo Produto"

    mock_res = MagicMock()
    mock_res.scalars.return_value.first.return_value = item
    mock_db.execute.return_value = mock_res

    updated = await update_semantic_cache(
        db=mock_db,
        cache_id=10,
        clear_category_tag=True
    )

    assert updated is not None
    assert updated.category_tag is None
