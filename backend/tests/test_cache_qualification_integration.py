import pytest
import json
from unittest.mock import AsyncMock, patch, MagicMock
from agent_core.logic.cache_handler import handle_semantic_cache_check

@pytest.mark.asyncio
async def test_semantic_cache_with_active_qualification_funnel():
    """Quando o funil de qualificação está ativo e o lead não foi qualificado, injeta a resposta do cache no contexto da IA."""
    config = MagicMock()
    config.id = 1
    config.semantic_cache_enabled = True
    config.semantic_cache_threshold = 0.90
    config.qualification_questions = json.dumps([
        {
            "title": "Qual é o seu nome?",
            "prompt": "Tente descobrir quanto o lead ganha para qualificar."
        }
    ])
    
    cached_item = MagicMock()
    cached_item.id = 101
    cached_item.user_query = "Quanto custa o curso?"
    cached_item.approved_response = "O investimento no Método Laser Day é de R$297."
    cached_item.similarity_threshold = 0.90
    
    db = AsyncMock()
    
    with patch("services.semantic_cache_service.lookup_semantic_cache", new_callable=AsyncMock) as mock_lookup:
        mock_lookup.return_value = (cached_item, 0.95)
        
        steps_recorded = []
        def mock_on_step(title, detail):
            steps_recorded.append((title, detail))
            
        result, rag_context = await handle_semantic_cache_check(
            config=config,
            message="quanto custa o curso?",
            history=[],
            context_variables={},
            db=db,
            on_step=mock_on_step
        )
        
        # Não encerra com resposta estática (permite que a IA formule a pergunta do funil)
        assert result is None
        assert rag_context is not None
        assert "O investimento no Método Laser Day é de R$297." in rag_context
        assert "RESPOSTA OFICIAL PRÉ-APROVADA DO CACHE SEMÂNTICO" in rag_context
        assert "Funil de Qualificação" in rag_context
        assert any("Funil de Qualificação Ativo" in s[0] for s in steps_recorded)

@pytest.mark.asyncio
async def test_semantic_cache_direct_hit_when_already_qualified():
    """Quando o lead já foi qualificado no histórico, entrega a resposta direto do cache a custo zero."""
    config = MagicMock()
    config.id = 1
    config.semantic_cache_enabled = True
    config.semantic_cache_threshold = 0.90
    config.qualification_questions = json.dumps([
        {"title": "Qual é o seu nome?", "prompt": "Descobrir nome"}
    ])
    
    cached_item = MagicMock()
    cached_item.id = 101
    cached_item.user_query = "Quanto custa o curso?"
    cached_item.approved_response = "O investimento no Método Laser Day é de R$297."
    cached_item.similarity_threshold = 0.90
    
    db = AsyncMock()
    history = [
        {"role": "assistant", "content": "Lead qualificado com sucesso via lead_qualificado!"}
    ]
    
    with patch("services.semantic_cache_service.lookup_semantic_cache", new_callable=AsyncMock) as mock_lookup:
        mock_lookup.return_value = (cached_item, 0.95)
        
        result, rag_context = await handle_semantic_cache_check(
            config=config,
            message="quanto custa o curso?",
            history=history,
            context_variables={},
            db=db
        )
        
        # Encerra direto com cache hit a custo zero
        assert result is not None
        assert result["from_semantic_cache"] is True
        assert result["content"] == "O investimento no Método Laser Day é de R$297."

@pytest.mark.asyncio
async def test_semantic_cache_direct_hit_without_qualification_questions():
    """Quando o agente não tem perguntas de qualificação, entrega direto do cache a custo zero."""
    config = MagicMock()
    config.id = 1
    config.semantic_cache_enabled = True
    config.semantic_cache_threshold = 0.90
    config.qualification_questions = None
    
    cached_item = MagicMock()
    cached_item.id = 101
    cached_item.user_query = "Quanto custa o curso?"
    cached_item.approved_response = "O investimento no Método Laser Day é de R$297."
    cached_item.similarity_threshold = 0.90
    
    db = AsyncMock()
    
    with patch("services.semantic_cache_service.lookup_semantic_cache", new_callable=AsyncMock) as mock_lookup:
        mock_lookup.return_value = (cached_item, 0.95)
        
        result, rag_context = await handle_semantic_cache_check(
            config=config,
            message="quanto custa o curso?",
            history=[],
            context_variables={},
            db=db
        )
        
        assert result is not None
        assert result["from_semantic_cache"] is True
        assert result["content"] == "O investimento no Método Laser Day é de R$297."
