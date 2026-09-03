import pytest
import json
from unittest.mock import AsyncMock, MagicMock
from api.routers.semantic_cache import get_lead_questions_for_cache
from models import WebhookEventModel

@pytest.mark.asyncio
async def test_get_lead_questions_returns_paginated_data():
    mock_db = AsyncMock()

    # Mock dos config_ids
    res_configs = MagicMock()
    res_configs.fetchall.return_value = [(10,)]

    # Mock dos caches existentes
    res_cached = MagicMock()
    res_cached.all.return_value = []

    # Mock dos contadores
    counts_row = MagicMock()
    counts_row.total = 3
    counts_row.has_cache = 1
    counts_row.no_cache = 2
    res_counts = MagicMock()
    res_counts.first.return_value = counts_row

    # Mock do count filtrado
    res_total = MagicMock()
    res_total.scalar.return_value = 3

    # Mock dos eventos
    ev1 = MagicMock(spec=WebhookEventModel)
    ev1.id = 101
    ev1.mensagem = "Qual o valor do curso?"
    ev1.agent_response = "Custa R$ 297."
    ev1.contato_nome = "João Silva"
    ev1.telefone = "+558599999999"
    ev1.created_at = None
    ev1.processing_steps = json.dumps([
        {"step": "⚡ Resposta do Cache", "metadata": {"from_semantic_cache": True, "max_similarity": 0.96}}
    ])

    ev2 = MagicMock(spec=WebhookEventModel)
    ev2.id = 102
    ev2.mensagem = "Tem certificado?"
    ev2.agent_response = "Sim, com carga horária de 40h."
    ev2.contato_nome = "Maria"
    ev2.telefone = "+558588888888"
    ev2.created_at = None
    ev2.processing_steps = json.dumps([
        {"step": "🔍 Verificação de Cache", "metadata": {"from_semantic_cache": False, "max_similarity": 0.65}}
    ])

    res_items = MagicMock()
    res_items.scalars.return_value.all.return_value = [ev1, ev2]

    # Configurar side_effect das 5 execuções de db.execute
    mock_db.execute.side_effect = [
        res_configs,
        res_cached,
        res_counts,
        res_total,
        res_items
    ]

    response = await get_lead_questions_for_cache(
        agent_id=1,
        page=1,
        page_size=20,
        search=None,
        filter_status="all",
        db=mock_db,
        _=None
    )

    assert response.total == 3
    assert response.has_cache_count == 1
    assert response.no_cache_count == 2
    assert len(response.items) == 2

    # Evento 1: cache hit
    item1 = response.items[0]
    assert item1.event_id == 101
    assert item1.user_query == "Qual o valor do curso?"
    assert item1.from_cache is True
    assert item1.similarity_pct == "96.0%"
    assert item1.contact_name == "João Silva"

    # Evento 2: cache miss (candidata a novo cache)
    item2 = response.items[1]
    assert item2.event_id == 102
    assert item2.user_query == "Tem certificado?"
    assert item2.from_cache is False
    assert item2.similarity_pct == "65.0%"


@pytest.mark.asyncio
async def test_get_lead_questions_filter_no_cache():
    mock_db = AsyncMock()

    res_configs = MagicMock()
    res_configs.fetchall.return_value = [(10,)]

    res_cached = MagicMock()
    res_cached.all.return_value = []

    counts_row = MagicMock()
    counts_row.total = 3
    counts_row.has_cache = 1
    counts_row.no_cache = 2
    res_counts = MagicMock()
    res_counts.first.return_value = counts_row

    res_total = MagicMock()
    res_total.scalar.return_value = 2

    ev = MagicMock(spec=WebhookEventModel)
    ev.id = 102
    ev.mensagem = "Tem certificado?"
    ev.agent_response = "Sim, emitimos certificado."
    ev.contato_nome = "Maria"
    ev.telefone = "+558588888888"
    ev.created_at = None
    ev.processing_steps = None

    res_items = MagicMock()
    res_items.scalars.return_value.all.return_value = [ev]

    mock_db.execute.side_effect = [
        res_configs,
        res_cached,
        res_counts,
        res_total,
        res_items
    ]

    response = await get_lead_questions_for_cache(
        agent_id=1,
        page=1,
        page_size=20,
        search=None,
        filter_status="no_cache",
        db=mock_db,
        _=None
    )

    assert response.total == 2
    assert len(response.items) == 1
    assert response.items[0].from_cache is False


@pytest.mark.asyncio
async def test_get_lead_questions_dynamically_detects_existing_variation():
    """Valida se uma dúvida histórica passa a ser reconhecida dinamicamente como Já no Cache."""
    mock_db = AsyncMock()

    res_configs = MagicMock()
    res_configs.fetchall.return_value = [(10,)]

    # Mock do cache contendo a variação 'Me manda o link'
    res_cached = MagicMock()
    res_cached.all.return_value = [
        ("como comprar?", ["Me manda o link", "onde clico?"])
    ]

    counts_row = MagicMock()
    counts_row.total = 1
    counts_row.has_cache = 1
    counts_row.no_cache = 0
    res_counts = MagicMock()
    res_counts.first.return_value = counts_row

    res_total = MagicMock()
    res_total.scalar.return_value = 1

    # Evento gravado no passado como sem cache (38.8%)
    ev = MagicMock(spec=WebhookEventModel)
    ev.id = 200
    ev.mensagem = "Me manda o link"
    ev.agent_response = "Aqui está o link:..."
    ev.contato_nome = "Aryaraj"
    ev.telefone = "+5585998259497"
    ev.created_at = None
    ev.processing_steps = json.dumps([
        {"step": "🔍 Verificação de Cache", "metadata": {"from_semantic_cache": False, "max_similarity": 0.388}}
    ])

    res_items = MagicMock()
    res_items.scalars.return_value.all.return_value = [ev]

    mock_db.execute.side_effect = [
        res_configs,
        res_cached,
        res_counts,
        res_total,
        res_items
    ]

    response = await get_lead_questions_for_cache(
        agent_id=1,
        page=1,
        page_size=20,
        search=None,
        filter_status="all",
        db=mock_db,
        _=None
    )

    assert len(response.items) == 1
    item = response.items[0]
    # Reconhecido dinamicamente como Já no Cache!
    assert item.from_cache is True
    assert item.similarity_pct == "100.0% · Já no Cache"


@pytest.mark.asyncio
async def test_ignore_lead_question_updates_steps():
    from api.routers.semantic_cache import ignore_lead_question
    mock_db = AsyncMock()

    ev = MagicMock(spec=WebhookEventModel)
    ev.id = 555
    ev.processing_steps = json.dumps([{"step": "initial"}])

    res = MagicMock()
    res.scalars.return_value.first.return_value = ev
    mock_db.execute.return_value = res

    res_json = await ignore_lead_question(
        event_id=555,
        db=mock_db,
        _=None
    )

    assert res_json["success"] is True
    assert res_json["event_id"] == 555
    
    saved_steps = json.loads(ev.processing_steps)
    assert len(saved_steps) == 2
    assert saved_steps[1]["metadata"]["ignored_for_cache"] is True
    assert mock_db.commit.called
