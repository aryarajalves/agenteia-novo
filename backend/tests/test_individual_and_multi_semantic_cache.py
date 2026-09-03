import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from services.semantic_cache_service import (
    split_multi_questions,
    lookup_semantic_cache,
    lookup_multi_query_semantic_cache,
    save_semantic_cache,
    update_semantic_cache
)
from models import SemanticCacheModel, AgentConfigModel, WebhookEventModel, WebhookConfigModel
from webhook_tasks.pipeline_ai import execute_agent_pipeline


def test_split_multi_questions():
    # 1. Múltiplos pontos de interrogação com saudação
    msg1 = "Olá, quais valores ? Como funciona o curso ? É curso on line ou presencial?"
    parts1 = split_multi_questions(msg1)
    assert len(parts1) == 3
    assert parts1[0].lower().startswith("quais valores")
    assert "como funciona o curso" in parts1[1].lower()
    assert "curso on line ou presencial" in parts1[2].lower()

    # 2. Quebras de linha
    msg2 = "quanto custa o curso?\ntem certificado de conclusão?"
    parts2 = split_multi_questions(msg2)
    assert len(parts2) == 2

    # 3. Pergunta única simples não divide indevidamente
    msg3 = "Qual o valor do curso?"
    parts3 = split_multi_questions(msg3)
    assert len(parts3) == 1
    assert parts3[0] == "Qual o valor do curso?"


@pytest.mark.asyncio
async def test_lookup_semantic_cache_respects_individual_threshold():
    mock_db = MagicMock()

    # Item 1: exige 98% de similaridade (estrito)
    item_strict = MagicMock(spec=SemanticCacheModel)
    item_strict.id = 1
    item_strict.user_query = "quanto custa?"
    item_strict.embedding = [1.0, 0.0]
    item_strict.alternate_embeddings = []
    item_strict.similarity_threshold = 0.98
    item_strict.usage_count = 0
    item_strict.approved_response = "Custa R$ 297."

    # Item 2: limiar padrão (None)
    item_default = MagicMock(spec=SemanticCacheModel)
    item_default.id = 2
    item_default.user_query = "qual o valor?"
    item_default.embedding = [0.90, 0.43]
    item_default.alternate_embeddings = []
    item_default.similarity_threshold = None
    item_default.usage_count = 0
    item_default.approved_response = "Valor de R$ 297."

    mock_res = MagicMock()
    mock_res.scalars.return_value.all.return_value = [item_strict, item_default]
    mock_db.execute = AsyncMock(return_value=mock_res)
    mock_db.commit = AsyncMock()

    with patch("services.semantic_cache_service.get_embedding", new_callable=AsyncMock) as mock_emb, \
         patch("services.semantic_cache_service.cosine_similarity") as mock_cos:

        mock_emb.return_value = ([1.0, 0.0], {})

        # Caso A: Query tem 0.94 de similaridade com item_strict.
        # 0.94 < 0.98 -> item_strict NÃO qualifica!
        # Mas item_default atinge 0.90 >= default threshold 0.85 -> item_default qualifica!
        def side_effect_cos(a, b):
            if b == item_strict.embedding:
                return 0.94
            return 0.90
        mock_cos.side_effect = side_effect_cos

        matched, sim = await lookup_semantic_cache(
            db=mock_db,
            agent_id=1,
            user_query="quanto fica o valor?",
            threshold=0.85
        )

        assert matched == item_default
        assert sim == 0.90

        # Caso B: Query atinge 0.99 de similaridade com item_strict.
        # 0.99 >= 0.98 -> item_strict qualifica e vence com maior similaridade!
        def side_effect_high(a, b):
            if b == item_strict.embedding:
                return 0.99
            return 0.90
        mock_cos.side_effect = side_effect_high

        matched_high, sim_high = await lookup_semantic_cache(
            db=mock_db,
            agent_id=1,
            user_query="quanto custa?",
            threshold=0.85
        )

        assert matched_high == item_strict
        assert sim_high == 0.99


@pytest.mark.asyncio
async def test_lookup_multi_query_semantic_cache_all_hit():
    mock_db = AsyncMock()

    item1 = MagicMock(spec=SemanticCacheModel)
    item1.id = 10
    item1.user_query = "quais valores?"
    item1.approved_response = "O curso custa R$ 297 à vista ou 12x de R$ 30,72."

    item2 = MagicMock(spec=SemanticCacheModel)
    item2.id = 11
    item2.user_query = "como funciona?"
    item2.approved_response = "As aulas são 100% gravadas em alta resolução."

    with patch("services.semantic_cache_service.lookup_semantic_cache", new_callable=AsyncMock) as mock_single:
        # Primeiro lookup (pergunta 1) -> hit item1
        # Segundo lookup (pergunta 2) -> hit item2
        mock_single.side_effect = [
            (item1, 0.96),
            (item2, 0.95)
        ]

        items, combined_resp, avg_sim, is_all = await lookup_multi_query_semantic_cache(
            db=mock_db,
            agent_id=1,
            user_message="Quais valores? Como funciona o curso?",
            threshold=0.85
        )

        assert is_all is True
        assert len(items) == 2
        assert "R$ 297" in combined_resp
        assert "100% gravadas" in combined_resp
        assert round(avg_sim, 2) == 0.95 or round(avg_sim, 2) == 0.96


@pytest.mark.asyncio
async def test_execute_agent_pipeline_multi_query_semantic_cache_hit():
    mock_db = MagicMock()
    mock_async_db = AsyncMock()

    db_agent = MagicMock(spec=AgentConfigModel)
    db_agent.id = 36
    db_agent.semantic_cache_enabled = True
    db_agent.semantic_cache_threshold = 90
    db_agent.client_id = 1
    db_agent.security_bot_protection = False
    db_agent.system_prompt = "Assistente"

    config = MagicMock(spec=WebhookConfigModel)
    config.secondary_agent_ids = None
    config.leads_table = "leads"

    event = MagicMock(spec=WebhookEventModel)
    event.id = 888
    event.mensagem = "Olá, quais valores ? Como funciona o curso ?"
    event.telefone = "5585998259497"
    event.contato_nome = "Aryaraj"
    event.conta_id = "1"
    event.conversa_id = "100"
    event.event_type = "message"

    item1 = MagicMock()
    item1.id = 1
    item1.user_query = "quais valores?"
    item1.similarity_threshold = None
    item1.approved_response = "O curso custa R$ 297."

    item2 = MagicMock()
    item2.id = 2
    item2.user_query = "como funciona?"
    item2.similarity_threshold = 0.95
    item2.approved_response = "O curso tem acesso imediato vitalício."

    # Simular que lookup de mensagem inteira deu miss, mas multi-query deu hit
    with patch("services.semantic_cache_service.lookup_semantic_cache", new_callable=AsyncMock) as mock_single_lookup, \
         patch("services.semantic_cache_service.lookup_multi_query_semantic_cache", new_callable=AsyncMock) as mock_multi_lookup, \
         patch("webhook_tasks._add_step") as mock_add_step:

        mock_single_lookup.return_value = (None, 0.72)
        mock_multi_lookup.return_value = ([item1, item2], "O curso custa R$ 297.\n\nO curso tem acesso imediato vitalício.", 0.96, True)

        result = await execute_agent_pipeline(
            db=mock_db,
            event=event,
            config=config,
            db_agent=db_agent,
            agent_config={},
            history=[],
            mensagem=event.mensagem,
            raw_phone=event.telefone,
            clean_phone=event.telefone,
            session_id="tel_5585998259497",
            lead_internal_id=1,
            lead_created_at=None,
            event_id=888,
            is_simulated=False,
            async_db=mock_async_db
        )

        assert result["from_semantic_cache"] is True
        assert result["usage"]["total_tokens"] == 0
        assert "R$ 297" in result["content"]
        assert "acesso imediato" in result["content"]
        assert mock_add_step.called


@pytest.mark.asyncio
async def test_execute_agent_pipeline_multi_query_partial_cache_hit_injects_prompt():
    mock_db = MagicMock()
    mock_async_db = AsyncMock()

    db_agent = MagicMock(spec=AgentConfigModel)
    db_agent.id = 36
    db_agent.semantic_cache_enabled = True
    db_agent.semantic_cache_threshold = 90
    db_agent.client_id = 1
    db_agent.security_bot_protection = False
    db_agent.system_prompt = "Assistente"
    db_agent.model = "gpt-4o-mini"

    config = MagicMock(spec=WebhookConfigModel)
    config.secondary_agent_ids = None
    config.leads_table = "leads"
    config.project_assistant_label = None

    event = MagicMock(spec=WebhookEventModel)
    event.id = 999
    event.mensagem = "quais valores ? e tem suporte com professores ?"
    event.telefone = "5585998259497"
    event.contato_nome = "Aryaraj"
    event.conta_id = "1"
    event.conversa_id = "100"
    event.event_type = "message"
    event.message_type = "text"
    event.labels = None

    item1 = MagicMock()
    item1.id = 1
    item1.user_query = "quais valores?"
    item1.similarity_threshold = None
    item1.approved_response = "O curso custa R$ 297."

    # Simular que multi-query deu match parcial (1 de 2)
    with patch("services.semantic_cache_service.lookup_semantic_cache", new_callable=AsyncMock) as mock_single_lookup, \
         patch("services.semantic_cache_service.lookup_multi_query_semantic_cache", new_callable=AsyncMock) as mock_multi_lookup, \
         patch("webhook_tasks._add_step") as mock_add_step, \
         patch("webhook_tasks.run_pre_router_ai", new_callable=AsyncMock) as mock_pre_router, \
         patch("webhook_tasks.process_message", new_callable=AsyncMock) as mock_process_msg:

        mock_single_lookup.return_value = (None, 0.60)
        mock_multi_lookup.return_value = ([item1], None, 0.88, False)
        mock_pre_router.return_value = {
            "eh_saudacao": False,
            "precisa_rag": False,
            "_usage": {"prompt_tokens": 10, "completion_tokens": 5, "total_tokens": 15}
        }
        mock_process_msg.return_value = {
            "content": "O curso custa R$ 297 e também temos suporte com professores ao vivo!",
            "usage": {"prompt_tokens": 100, "completion_tokens": 30, "total_tokens": 130}
        }

        result = await execute_agent_pipeline(
            db=mock_db,
            event=event,
            config=config,
            db_agent=db_agent,
            agent_config=MagicMock(),
            history=[],
            mensagem=event.mensagem,
            raw_phone=event.telefone,
            clean_phone=event.telefone,
            session_id="tel_5585998259497",
            lead_internal_id=1,
            lead_created_at=None,
            event_id=999,
            is_simulated=False,
            async_db=mock_async_db
        )

        # 1. Verifica se o step de Cache Parcial foi registrado no pipeline
        step_titles = [call[0][2] for call in mock_add_step.call_args_list]
        assert any("Cache Semântico Parcial" in t for t in step_titles)

        # 2. Verifica se as respostas oficiais foram injetadas no pre_executed_rag_context
        _, kwargs = mock_process_msg.call_args
        injected_context = kwargs.get("pre_executed_rag_context", "")
        assert "RESPOSTAS OFICIAIS PRÉ-APROVADAS DO CACHE SEMÂNTICO" in injected_context
        assert "O curso custa R$ 297." in injected_context


@pytest.mark.asyncio
async def test_lookup_multi_query_semantic_cache_returns_diagnostics():
    mock_db = AsyncMock()

    item1 = MagicMock(spec=SemanticCacheModel)
    item1.id = 10
    item1.user_query = "como funciona?"
    item1.approved_response = "As aulas são gravadas."
    item1.similarity_threshold = 0.85

    item_cand2 = MagicMock(spec=SemanticCacheModel)
    item_cand2.id = 11
    item_cand2.user_query = "qual o valor?"
    item_cand2.similarity_threshold = 0.90

    with patch("services.semantic_cache_service.lookup_semantic_cache", new_callable=AsyncMock) as mock_single:
        # Pergunta 1: hit
        # Pergunta 2: miss com 70.7% (retorna None, 0.707, item_cand2)
        mock_single.side_effect = [
            (item1, 0.95, item1),
            (None, 0.707, item_cand2)
        ]

        items, combined_resp, avg_sim, is_all, diags = await lookup_multi_query_semantic_cache(
            db=mock_db,
            agent_id=1,
            user_message="Como funciona? Quanto custa?",
            threshold=0.85,
            return_diagnostics=True
        )

        assert is_all is False
        assert len(items) == 1
        assert len(diags) == 2

        # Validação da Pergunta 1
        assert "como funciona" in diags[0]["sub_query"].lower()
        assert diags[0]["approved"] is True
        assert diags[0]["similarity_pct"] == "95.0%"
        assert diags[0]["matched_query"] == "como funciona?"

        # Validação da Pergunta 2
        assert "quanto custa" in diags[1]["sub_query"].lower()
        assert diags[1]["approved"] is False
        assert diags[1]["similarity_pct"] == "70.7%"
        assert diags[1]["threshold_pct"] == "90.0%"
        assert diags[1]["matched_query"] == "qual o valor?"


