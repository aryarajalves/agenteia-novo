import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from services.rag.decomposition import split_by_question_marks, decompose_user_queries
from services.rag.core import search_knowledge_base, _search_single_query, RAGUsage

def test_split_by_question_marks_multiple_questions():
    """Deve separar corretamente perguntas distintas terminadas em '?' no fallback."""
    text = "possui certificado do mec ? quem é tarcira ?"
    qs = split_by_question_marks(text)
    assert len(qs) == 2
    assert "possui certificado do mec" in qs[0]
    assert "quem é tarcira" in qs[1]

def test_split_by_question_marks_single_query_with_multiple_marks():
    """Pergunta única com múltiplos pontos de interrogação seguidos não deve ser dividida."""
    text = "onde fica a escola???"
    qs = split_by_question_marks(text)
    assert len(qs) == 1
    assert "onde fica a escola" in qs[0]

def test_split_by_question_marks_cleans_leading_conjunctions():
    """Deve limpar conjunções iniciais como 'e ', 'ou ' em perguntas subsequentes."""
    text = "qual o valor do curso? e vocês emitem certificado?"
    qs = split_by_question_marks(text)
    assert len(qs) == 2
    assert qs[0].strip().startswith("qual o valor")
    assert qs[1].strip().startswith("vocês emitem")

def test_split_by_question_marks_newline_lists():
    """Deve separar perguntas dispostas em lista com quebra de linha."""
    text = "1. Qual o endereço da clínica?\n2. Aceitam plano de saúde Unimed?"
    qs = split_by_question_marks(text)
    assert len(qs) == 2
    assert "Qual o endereço da clínica?" in qs[0]
    assert "Aceitam plano de saúde Unimed?" in qs[1]

@pytest.mark.asyncio
async def test_decompose_user_queries_ai_extraction():
    """A IA deve analisar semanticamente a mensagem, ignorar saudações e extrair as perguntas limpas."""
    query = "olá boa tarde tudo bem? queria saber se tem certificado do mec e quem é tarcira?"
    mock_resp = MagicMock()
    mock_resp.choices = [MagicMock()]
    mock_resp.choices[0].message.content = '{"questions": ["O curso possui certificado reconhecido pelo MEC?", "Quem é Tarcira?"]}'
    mock_resp.usage = MagicMock()
    mock_resp.usage.prompt_tokens = 45
    mock_resp.usage.completion_tokens = 22

    with patch("services.rag.decomposition.call_rag_llm", new_callable=AsyncMock) as mock_llm:
        mock_llm.return_value = mock_resp
        qs, usage = await decompose_user_queries(query)
        assert len(qs) == 2
        assert "MEC" in qs[0]
        assert "Tarcira" in qs[1]
        assert usage is not None
        assert usage.prompt_tokens == 45
        assert usage.completion_tokens == 22

@pytest.mark.asyncio
async def test_decompose_user_queries_ai_fallback_on_error():
    """Se a chamada à IA falhar (ex: timeout ou erro de rede), deve usar fallback automático por pontuação."""
    query = "possui certificado do mec ? quem é tarcira ?"
    with patch("services.rag.decomposition.call_rag_llm", side_effect=Exception("OpenAI API timeout")):
        qs, usage = await decompose_user_queries(query)
        assert len(qs) == 2
        assert "possui certificado do mec" in qs[0]
        assert "quem é tarcira" in qs[1]
        assert usage is None

@pytest.mark.asyncio
async def test_decompose_user_queries_short_query_skips_ai():
    """Palavras simples ou muito curtas não precisam gastar tokens de IA."""
    qs, usage = await decompose_user_queries("preço")
    assert qs == ["preço"]
    assert usage is None

@pytest.mark.asyncio
async def test_search_knowledge_base_grouped_results():
    """search_knowledge_base deve executar buscas individuais e retornar grouped_results."""
    db = AsyncMock()
    
    # Mock _search_single_query para simular resultados diferentes por pergunta
    async def mock_single_query(db, query, target_ids, **kwargs):
        if "certificado" in query:
            item = {"id": 1, "question": "Tem certificado?", "answer": "Sim, certificado MEC.", "relevance_score": 0.95}
            disc = {"id": 10, "question": "Item irrelevante 1", "discard_filter": "AGENTIC EVAL"}
            usage = RAGUsage(prompt_tokens=10, completion_tokens=5)
            return [item], [disc], usage
        else:
            item = {"id": 2, "question": "Quem é Tarcira?", "answer": "Tarcira é a fundadora.", "relevance_score": 0.98}
            disc = {"id": 20, "question": "Item irrelevante 2", "discard_filter": "AGENTIC EVAL"}
            usage = RAGUsage(prompt_tokens=12, completion_tokens=6)
            return [item], [disc], usage

    with patch("services.rag.core.decompose_user_queries", new_callable=AsyncMock) as mock_decomp, \
         patch("services.rag.core._search_single_query", side_effect=mock_single_query):
        
        mock_decomp.return_value = (["possui certificado do mec ?", "quem é tarcira ?"], RAGUsage(prompt_tokens=30, completion_tokens=10))

        items, discarded, usage = await search_knowledge_base(
            db=db,
            query="possui certificado do mec ? quem é tarcira ?",
            kb_id=1
        )

        # Deve mesclar os itens encontrados
        assert len(items) == 2
        item_ids = {it["id"] for it in items}
        assert item_ids == {1, 2}

        # Deve conter grouped_results com as 2 perguntas individualizadas
        assert usage is not None
        assert len(usage.grouped_results) == 2
        
        g1 = usage.grouped_results[0]
        assert "certificado" in g1["sub_query"]
        assert len(g1["items"]) == 1
        assert g1["items"][0]["id"] == 1
        assert len(g1["discarded_items"]) == 1
        assert g1["discarded_items"][0]["id"] == 10

        g2 = usage.grouped_results[1]
        assert "tarcira" in g2["sub_query"]
        assert len(g2["items"]) == 1
        assert g2["items"][0]["id"] == 2
        assert len(g2["discarded_items"]) == 1
        assert g2["discarded_items"][0]["id"] == 20

        # Tokens totais devem incluir a decomposição + buscas
        assert usage.prompt_tokens == 52  # 30 (decomp) + 10 + 12
        assert usage.completion_tokens == 21  # 10 (decomp) + 5 + 6
