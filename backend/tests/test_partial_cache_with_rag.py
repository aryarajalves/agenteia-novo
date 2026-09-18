import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from agent_core.core import process_message
from agent_core.logic.cache_handler import handle_semantic_cache_check


@pytest.mark.asyncio
async def test_partial_cache_triggers_rag_for_pending_questions():
    """
    Valida que quando o Cache Semantico retornar Hit Parcial (uma duvida respondida, outra pendente),
    o sistema NAO dispensa o RAG e executa a busca na Base de Conhecimento para a duvida pendente.
    """
    mock_db = AsyncMock()
    mock_config = MagicMock()
    mock_config.id = 36
    mock_config.system_prompt = "Voce e um atendente util."
    mock_config.dynamic_prompt = None
    mock_config.model = "gpt-4o-mini"
    mock_config.knowledge_bases = [MagicMock(id=1)]
    mock_config.knowledge_base_ids = [1]
    mock_config.semantic_cache_enabled = True
    mock_config.router_enabled = False
    mock_config.security_language_complexity = "standard"
    mock_config.security_forbidden_topics = None
    mock_config.security_competitor_blacklist = None
    mock_config.security_discount_policy = None

    partial_diag = {
        "status": "partial_hit",
        "status_label": "Hit Parcial (Multi-Perguntas)",
        "similarity": 0.82,
        "matched_id": 7,
        "matched_query": "quanto custa o curso?",
        "pending_questions": ["qual e a sua carga horaria?"]
    }
    partial_block = "\n\n# RESPOSTAS OFICIAIS PRE-APROVADAS DO CACHE SEMANTICO:\n- Duvida: quanto custa o curso?\n  Resposta Oficial: Custa R$ 297."

    rag_item_carga = {
        "id": 194,
        "question": "Quantas horas de aula tem o curso?",
        "answer": "Estamos na turma fundadora, aulas lancadas semanalmente sem carga fechada."
    }

    steps_logged = []
    def record_step(title, desc=""):
        steps_logged.append((title, desc))

    with patch("agent_core.core.handle_semantic_cache_check", new_callable=AsyncMock) as mock_cache, \
         patch("rag_service.search_knowledge_base", new_callable=AsyncMock) as mock_rag_search, \
         patch("agent_core.core.get_openai_client") as mock_get_client:

        mock_cache.return_value = (None, partial_block, partial_diag)
        mock_rag_search.return_value = ([rag_item_carga], [], None)

        mock_openai_client = MagicMock()
        mock_completion = MagicMock()
        mock_choice = MagicMock()
        mock_choice.message.content = "O curso custa R$ 297 e como e turma fundadora as aulas sao semanais."
        mock_choice.message.tool_calls = None
        mock_completion.choices = [mock_choice]
        mock_completion.usage.prompt_tokens = 50
        mock_completion.usage.completion_tokens = 30
        mock_completion.usage.prompt_tokens_details.cached_tokens = 0
        mock_openai_client.chat.completions.create = AsyncMock(return_value=mock_completion)
        mock_get_client.return_value = mock_openai_client

        response = await process_message(
            db=mock_db,
            message="quanto custa o curso e qual e a sua carga horaria?",
            history=[],
            config=mock_config,
            context_variables={"session_id": "test_sess_partial"},
            on_step=record_step
        )

        # 1. RAG DEVE ter sido chamado para a duvida pendente
        assert mock_rag_search.called
        call_kwargs = mock_rag_search.call_args.kwargs
        assert call_kwargs.get("query") == "qual e a sua carga horaria?"

        # 2. O prompt enviado a LLM deve conter AMBOS: o bloco do cache e o bloco do RAG
        resolved_prompt = response["debug"]["resolved_prompt"]
        assert "RESPOSTAS OFICIAIS PRE-APROVADAS DO CACHE SEMANTICO" in resolved_prompt
        assert "Custa R$ 297" in resolved_prompt
        assert "Estamos na turma fundadora" in resolved_prompt

        # 3. O debug["rag_items"] deve conter o item recuperado pelo RAG
        assert len(response["debug"]["rag_items"]) == 1
        assert response["debug"]["rag_items"][0]["id"] == 194

        # 4. Validar que as perguntas enviadas para o RAG e respondidas pelo cache estao discriminadas no debug
        assert "rag_queries" in response["debug"]
        assert "qual e a sua carga horaria?" in response["debug"]["rag_queries"]
        assert response["debug"]["rag_query"] == "qual e a sua carga horaria?"


@pytest.mark.asyncio
async def test_cache_hit_persists_link_enviado_flag():
    """
    Valida que quando o cache semantico entrega resposta contendo URL de link,
    a flag link_enviado=True e gravada no context_variables e salva na memoria.
    """
    mock_db = AsyncMock()
    mock_config = MagicMock()
    mock_config.id = 36
    mock_config.semantic_cache_enabled = True
    mock_config.semantic_cache_threshold = 0.85

    cached_item = MagicMock()
    cached_item.id = 10
    cached_item.user_query = "pode enviar o link do curso"
    cached_item.approved_response = "O link do curso e esse: https://pay.kiwify.com.br/VVme7C2"
    cached_item.similarity_threshold = None

    context_vars = {"session_id": "sess_link_123", "link_enviado": "false"}

    mock_res_select = MagicMock()
    mock_res_select.scalars.return_value.first.return_value = None
    mock_db.execute.return_value = mock_res_select

    with patch("services.semantic_cache_service.lookup_semantic_cache", new_callable=AsyncMock) as mock_lookup:
        mock_lookup.return_value = (cached_item, 0.95, cached_item)

        result, rag_ctx, diag = await handle_semantic_cache_check(
            config=mock_config,
            message="pode enviar o link do curso",
            history=[],
            context_variables=context_vars,
            db=mock_db,
            return_diagnostics=True
        )

        assert result is not None
        assert result["from_semantic_cache"] is True
        assert context_vars["link_enviado"] is True

        # Validar que inseriu ou atualizou em UserMemoryModel
        assert mock_db.add.called
        added_obj = mock_db.add.call_args[0][0]
        assert added_obj.key == "link_enviado"
        assert added_obj.value == "True"
        assert mock_db.commit.called


@pytest.mark.asyncio
async def test_partial_cache_fallback_when_pending_questions_not_in_diagnostics():
    """
    Valida que mesmo se cache_diagnostics não tiver 'pending_questions' pré-definido,
    o fallback do RAG isola a pergunta pendente chamando extract_sub_questions_ai e busca no RAG.
    """
    mock_db = AsyncMock()
    mock_config = MagicMock()
    mock_config.id = 36
    mock_config.system_prompt = "Voce e um atendente util."
    mock_config.dynamic_prompt = None
    mock_config.model = "gpt-4o-mini"
    mock_config.knowledge_bases = [MagicMock(id=1)]
    mock_config.knowledge_base_ids = [1]
    mock_config.semantic_cache_enabled = True
    mock_config.router_enabled = False
    mock_config.security_language_complexity = "standard"
    mock_config.security_forbidden_topics = None
    mock_config.security_competitor_blacklist = None
    mock_config.security_discount_policy = None

    # Diagnóstico SEM pending_questions
    partial_diag = {
        "status": "partial_hit",
        "status_label": "Hit Parcial (Multi-Perguntas)",
        "similarity": 0.85,
        "matched_id": 16,
        "matched_query": "Possui certificado?"
    }
    partial_block = "\n\n# RESPOSTAS OFICIAIS PRE-APROVADAS DO CACHE SEMANTICO:\n- Duvida: Possui certificado?\n  Resposta Oficial: Tem sim certificado."

    rag_item_horas = {
        "id": 201,
        "question": "Quantas horas de aula o curso possui?",
        "answer": "Estamos na turma fundadora sem carga total fechada."
    }

    with patch("agent_core.core.handle_semantic_cache_check", new_callable=AsyncMock) as mock_cache, \
         patch("services.semantic_cache_service.extract_sub_questions_ai", new_callable=AsyncMock) as mock_extract, \
         patch("rag_service.search_knowledge_base", new_callable=AsyncMock) as mock_rag_search, \
         patch("agent_core.core.get_openai_client") as mock_get_client:

        mock_cache.return_value = (None, partial_block, partial_diag)
        mock_extract.return_value = ["Possui certificado?", "Quantas horas de curso temos?"]
        mock_rag_search.return_value = ([rag_item_horas], [], None)

        mock_openai_client = MagicMock()
        mock_completion = MagicMock()
        mock_choice = MagicMock()
        mock_choice.message.content = "Possui certificado e as horas estao em aberto."
        mock_choice.message.tool_calls = None
        mock_completion.choices = [mock_choice]
        mock_completion.usage.prompt_tokens = 50
        mock_completion.usage.completion_tokens = 30
        mock_completion.usage.prompt_tokens_details.cached_tokens = 0
        mock_openai_client.chat.completions.create = AsyncMock(return_value=mock_completion)
        mock_get_client.return_value = mock_openai_client

        response = await process_message(
            db=mock_db,
            message="quantas horas de curso temos e possui certificado?",
            history=[],
            config=mock_config,
            context_variables={"session_id": "test_sess_fallback"}
        )

        assert mock_rag_search.called
        call_kwargs = mock_rag_search.call_args.kwargs
        # Pergunta pendente isolada pelo fallback
        assert "Quantas horas de curso temos?" in call_kwargs.get("query")


@pytest.mark.asyncio
async def test_search_knowledge_base_handles_list_and_int_kb_id():
    """
    Valida que search_knowledge_base lida seguramente com kb_id e kb_ids
    passados como int, list ou set sem disparar TypeError: unhashable type.
    """
    from services.rag.core import search_knowledge_base

    mock_db = AsyncMock()
    # Mock do retorno da busca no banco
    mock_res = MagicMock()
    mock_res.fetchall.return_value = []
    mock_db.execute.return_value = mock_res

    with patch("services.rag.core.get_embedding", new_callable=AsyncMock) as mock_emb:
        mock_emb.return_value = [0.1] * 1536

        # 1. Testar com kb_id como int
        res1 = await search_knowledge_base(mock_db, "teste query", kb_id=36)
        assert isinstance(res1, tuple)

        # 2. Testar com kb_id como list
        res2 = await search_knowledge_base(mock_db, "teste query", kb_id=[36])
        assert isinstance(res2, tuple)

        # 3. Testar com kb_ids como int
        res3 = await search_knowledge_base(mock_db, "teste query", kb_ids=36)
        assert isinstance(res3, tuple)

        # 4. Testar com kb_ids como list
        res4 = await search_knowledge_base(mock_db, "teste query", kb_ids=[36, 37])
        assert isinstance(res4, tuple)