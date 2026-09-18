import pytest
import json
from unittest.mock import AsyncMock, patch, MagicMock
from agent_core.logic.cache_handler import handle_semantic_cache_check

@pytest.mark.asyncio
async def test_cache_handler_diagnostics_hit_qualification():
    """Valida que quando há hit no cache com funil de qualificação ativo, os diagnósticos retornam status hit_qualification."""
    config = MagicMock()
    config.id = 36
    config.semantic_cache_enabled = True
    config.semantic_cache_threshold = 0.85
    config.qualification_questions = json.dumps([
        {"title": "Qual é o seu nome?", "prompt": "Descobrir nome"}
    ])
    
    cached_item = MagicMock()
    cached_item.id = 12
    cached_item.user_query = "como funciona?"
    cached_item.approved_response = "O curso é 100% online e você tem acesso vitalício."
    cached_item.similarity_threshold = 0.85
    
    db = AsyncMock()
    
    with patch("services.semantic_cache_service.lookup_semantic_cache", new_callable=AsyncMock) as mock_lookup:
        mock_lookup.return_value = (cached_item, 0.931, cached_item)
        
        result, rag_context, diag = await handle_semantic_cache_check(
            config=config,
            message="como funciona o curso",
            history=[],
            context_variables={},
            db=db,
            return_diagnostics=True
        )
        
        assert result is None
        assert rag_context is not None
        assert "O curso é 100% online" in rag_context
        assert diag is not None
        assert diag["status"] == "hit_qualification"
        assert diag["funnel_active"] is True
        assert diag["matched_id"] == 12
        assert diag["matched_query"] == "como funciona?"
        assert diag["similarity"] == 0.931
        assert diag["similarity_pct"] == "93.1%"
        assert diag["threshold"] == 0.85

@pytest.mark.asyncio
async def test_cache_handler_diagnostics_hit_direct():
    """Valida que quando o lead já concluiu a qualificação, retorna hit_direct a custo zero com diagnósticos no resultado."""
    config = MagicMock()
    config.id = 36
    config.semantic_cache_enabled = True
    config.semantic_cache_threshold = 0.85
    config.qualification_questions = json.dumps([
        {"title": "Qual é o seu nome?", "prompt": "Descobrir nome"}
    ])
    
    cached_item = MagicMock()
    cached_item.id = 12
    cached_item.user_query = "como funciona?"
    cached_item.approved_response = "O curso é 100% online."
    cached_item.similarity_threshold = 0.85
    
    db = AsyncMock()
    history = [
        {"role": "assistant", "content": "Lead qualificado com sucesso."}
    ]
    
    with patch("services.semantic_cache_service.lookup_semantic_cache", new_callable=AsyncMock) as mock_lookup:
        mock_lookup.return_value = (cached_item, 0.931, cached_item)
        
        result, rag_context, diag = await handle_semantic_cache_check(
            config=config,
            message="como funciona o curso",
            history=history,
            context_variables={},
            db=db,
            return_diagnostics=True
        )
        
        assert result is not None
        assert result["from_semantic_cache"] is True
        assert result["content"] == "O curso é 100% online."
        assert diag["status"] == "hit_direct"
        assert diag["funnel_active"] is False
        assert result["debug"]["semantic_cache"]["status"] == "hit_direct"

@pytest.mark.asyncio
async def test_cache_handler_diagnostics_miss():
    """Valida que quando não há match, os diagnósticos registram o candidato mais próximo e status miss."""
    config = MagicMock()
    config.id = 36
    config.semantic_cache_enabled = True
    config.semantic_cache_threshold = 0.85
    
    closest_item = MagicMock()
    closest_item.user_query = "qual o valor do investimento no curso?"
    
    db = AsyncMock()
    
    with patch("services.semantic_cache_service.lookup_semantic_cache", new_callable=AsyncMock) as mock_lookup, \
         patch("services.semantic_cache_service.lookup_multi_query_semantic_cache", new_callable=AsyncMock) as mock_mq:
        mock_lookup.return_value = (None, 0.5944, closest_item)
        mock_mq.return_value = (None, None, 0.0, False)
        
        result, rag_context, diag = await handle_semantic_cache_check(
            config=config,
            message="onde fica o consultório?",
            history=[],
            context_variables={},
            db=db,
            return_diagnostics=True
        )
        
        assert result is None
        assert diag["status"] == "miss"
        assert diag["closest_candidate"] == "qual o valor do investimento no curso?"
        assert diag["closest_similarity"] == 0.5944
        assert diag["closest_similarity_pct"] == "59.4%"

@pytest.mark.asyncio
async def test_cache_handler_diagnostics_disabled():
    """Valida que quando o cache está desligado, retorna status disabled com flag enabled=False."""
    config = MagicMock()
    config.id = 36
    config.semantic_cache_enabled = False
    
    result, rag_context, diag = await handle_semantic_cache_check(
        config=config,
        message="como funciona?",
        history=[],
        context_variables={},
        db=AsyncMock(),
        return_diagnostics=True
    )
    
    assert result is None
    assert diag["enabled"] is False
    assert diag["status"] == "disabled"


@pytest.mark.asyncio
async def test_cache_handler_diagnostics_hit_direct_via_context_variable():
    """Valida que quando context_variables tem lead_already_qualified=True, retorna hit_direct a custo zero sem histórico especial."""
    config = MagicMock()
    config.id = 36
    config.semantic_cache_enabled = True
    config.semantic_cache_threshold = 0.85
    config.qualification_questions = json.dumps([
        {"title": "Qual é o seu nome?", "prompt": "Descobrir nome"}
    ])
    
    cached_item = MagicMock()
    cached_item.id = 12
    cached_item.user_query = "quanto vale o curso"
    cached_item.approved_response = "O curso custa R$ 297."
    cached_item.similarity_threshold = 0.85
    
    db = AsyncMock()
    
    with patch("services.semantic_cache_service.lookup_semantic_cache", new_callable=AsyncMock) as mock_lookup:
        mock_lookup.return_value = (cached_item, 0.95, cached_item)
        
        result, rag_context, diag = await handle_semantic_cache_check(
            config=config,
            message="quanto vale o curso",
            history=[{"role": "user", "content": "quanto vale o curso"}],
            context_variables={"lead_already_qualified": True},
            db=db,
            return_diagnostics=True
        )
        
        assert result is not None
        assert result["from_semantic_cache"] is True
        assert result["content"] == "O curso custa R$ 297."
        assert diag["status"] == "hit_direct"
        assert diag["funnel_active"] is False


@pytest.mark.asyncio
async def test_cache_handler_diagnostics_hit_direct_via_user_memory():
    """Valida que quando o banco possui lead_already_qualified para a sessão, retorna hit_direct a custo zero."""
    config = MagicMock()
    config.id = 36
    config.semantic_cache_enabled = True
    config.semantic_cache_threshold = 0.85
    config.qualification_questions = json.dumps([
        {"title": "Qual é o seu nome?", "prompt": "Descobrir nome"}
    ])
    
    cached_item = MagicMock()
    cached_item.id = 12
    cached_item.user_query = "quanto vale o curso"
    cached_item.approved_response = "O curso custa R$ 297."
    cached_item.similarity_threshold = 0.85
    
    db = AsyncMock()
    mock_scalars = MagicMock()
    mock_scalars.first.return_value = MagicMock() # Representa registro existente de UserMemoryModel
    mock_res = MagicMock()
    mock_res.scalars.return_value = mock_scalars
    db.execute.return_value = mock_res
    
    with patch("services.semantic_cache_service.lookup_semantic_cache", new_callable=AsyncMock) as mock_lookup:
        mock_lookup.return_value = (cached_item, 0.95, cached_item)
        
        result, rag_context, diag = await handle_semantic_cache_check(
            config=config,
            message="quanto vale o curso",
            history=[{"role": "user", "content": "quanto vale o curso"}],
            context_variables={"session_id": "test_session_123"},
            db=db,
            return_diagnostics=True
        )
        
        assert result is not None
        assert result["from_semantic_cache"] is True
        assert result["content"] == "O curso custa R$ 297."
        assert diag["status"] == "hit_direct"
        assert diag["funnel_active"] is False


@pytest.mark.asyncio
async def test_cache_handler_no_false_positive_when_prompt_mentions_lead_qualificado():
    """Valida que quando InteractionLog contém apenas o resolved_prompt mencionando a regra de lead_qualificado sem tool call real, NÃO ativa lead_already_qualified falso positivo e mantém hit_qualification."""
    config = MagicMock()
    config.id = 36
    config.semantic_cache_enabled = True
    config.semantic_cache_threshold = 0.85
    config.qualification_questions = json.dumps([
        {"title": "Qual é o seu nome?", "prompt": "Descobrir nome"}
    ])
    
    cached_item = MagicMock()
    cached_item.id = 12
    cached_item.user_query = "como funciona o curso de vcs?"
    cached_item.approved_response = "O curso é 100% online."
    cached_item.similarity_threshold = 0.85
    
    db = AsyncMock()
    # UserMemoryModel não encontra qualificação
    mock_scalars_empty = MagicMock()
    mock_scalars_empty.first.return_value = None
    mock_res_empty = MagicMock()
    mock_res_empty.scalars.return_value = mock_scalars_empty
    db.execute.return_value = mock_res_empty
    
    with patch("services.semantic_cache_service.lookup_semantic_cache", new_callable=AsyncMock) as mock_lookup:
        mock_lookup.return_value = (cached_item, 0.96, cached_item)
        
        result, rag_context, diag = await handle_semantic_cache_check(
            config=config,
            message="como funciona o curso de vcs?",
            history=[{"role": "user", "content": "olá"}],
            context_variables={"session_id": "8r4fym"},
            db=db,
            return_diagnostics=True
        )
        
        # Como o lead NÃO está qualificado, NÃO deve dar hit_direct a custo zero
        assert result is None
        # Deve ter injetado o contexto pré-aprovado do cache para a IA formular a próxima pergunta
        assert rag_context is not None
        assert "RESPOSTA OFICIAL PRÉ-APROVADA DO CACHE SEMÂNTICO" in rag_context
        assert "O curso é 100% online." in rag_context
        assert diag["status"] == "hit_qualification"
        assert diag["funnel_active"] is True


