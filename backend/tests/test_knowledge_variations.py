import pytest
import json
from unittest.mock import AsyncMock, MagicMock, patch
from api.schemas import KnowledgeItem, KnowledgeItemDetail
from api.routers.knowledge import get_item_embedding_text
from models import KnowledgeItemModel

def test_get_item_embedding_text():
    """Valida a combinação correta de pergunta e variações para gerar o vetor composto."""
    # 1. Apenas pergunta
    assert get_item_embedding_text("Quem ministra as aulas?") == "Quem ministra as aulas?"
    assert get_item_embedding_text("  Quem ministra as aulas?  ", None) == "Quem ministra as aulas?"
    assert get_item_embedding_text("Quem ministra as aulas?", []) == "Quem ministra as aulas?"

    # 2. Pergunta com variações válidas
    variations = ["Quem dá o curso?", "Qual o professor responsável?"]
    combined = get_item_embedding_text("Quem ministra as aulas?", variations)
    assert combined == "Quem ministra as aulas?\nQuem dá o curso?\nQual o professor responsável?"

    # 3. Pergunta com variações vazias ou com espaços extras
    dirty_vars = ["  Quem dá o curso?  ", "", "   ", "Qual o professor?"]
    cleaned_combined = get_item_embedding_text("Quem ministra as aulas?", dirty_vars)
    assert cleaned_combined == "Quem ministra as aulas?\nQuem dá o curso?\nQual o professor?"

def test_knowledge_item_schema_variations_validation():
    """Valida a serialização e validação de question_variations nos schemas Pydantic."""
    # 1. Com lista de strings
    item = KnowledgeItem(
        question="O curso tem certificado?",
        answer="Sim, certificado emitido após conclusão.",
        question_variations=["Emitem certificado?", "Tem diploma?"]
    )
    assert item.question_variations == ["Emitem certificado?", "Tem diploma?"]

    # 2. Padrão vazio
    item_default = KnowledgeItem(
        question="Qual o valor?",
        answer="R$ 997,00."
    )
    assert item_default.question_variations == []

    # 3. Coerção a partir de string JSON
    item_json_str = KnowledgeItem(
        question="Qual o valor?",
        answer="R$ 997,00.",
        question_variations='["Quanto custa?", "Qual o preço?"]'
    )
    assert item_json_str.question_variations == ["Quanto custa?", "Qual o preço?"]

    # 4. Coerção com None
    item_none = KnowledgeItem(
        question="Q",
        answer="A",
        question_variations=None
    )
    assert item_none.question_variations == []

def test_knowledge_item_detail_inherits_variations():
    """Valida que KnowledgeItemDetail herda e serializa question_variations perfeitamente."""
    detail = KnowledgeItemDetail(
        id=42,
        question="Como acessar?",
        answer="Pela plataforma da Hotmart.",
        question_variations=["Onde fica o login?", "Qual o link das aulas?"],
        embedding=[0.1234, 0.5678]
    )
    assert detail.id == 42
    assert detail.question_variations == ["Onde fica o login?", "Qual o link das aulas?"]
    assert detail.embedding == [0.1234, 0.5678]

def test_knowledge_item_model_variations():
    """Valida a instanciação do modelo SQLAlchemy com a coluna question_variations."""
    item = KnowledgeItemModel(
        knowledge_base_id=1,
        question="Duração do curso?",
        answer="40 horas.",
        question_variations=["Quantas horas dura?", "Qual a carga horária?"]
    )
    assert item.knowledge_base_id == 1
    assert item.question == "Duração do curso?"
    assert len(item.question_variations) == 2
    assert "Quantas horas dura?" in item.question_variations

@pytest.mark.asyncio
async def test_agentic_rerank_includes_variations():
    """Valida que o módulo de reranking recebe as variações no prompt context."""
    from services.rag.agentic import rerank_results

    items = [
        {
            "id": 1,
            "question": "Quem ministra as aulas?",
            "answer": "O Dr. Fulano.",
            "question_variations": ["Quem dá o curso?", "Qual o professor?"],
            "metadata_val": ""
        },
        {
            "id": 2,
            "question": "Como comprar?",
            "answer": "Pelo link de checkout.",
            "question_variations": ["Onde compro?"],
            "metadata_val": ""
        }
    ]

    mock_resp = MagicMock()
    mock_resp.choices = [MagicMock(message=MagicMock(content="[0, 1]"))]
    mock_resp.usage = MagicMock()

    with patch("services.rag.agentic.call_rag_llm", new_callable=AsyncMock) as mock_call:
        mock_call.return_value = mock_resp
        reranked, _ = await rerank_results("quem é o professor do curso?", items)
        
        assert len(reranked) == 2
        # Verifica se o prompt enviado à LLM continha as variações
        called_prompt = mock_call.call_args[1]["messages"][0]["content"]
        assert "Quem ministra as aulas?" in called_prompt
        assert "Quem dá o curso?" in called_prompt
        assert "Qual o professor?" in called_prompt

@pytest.mark.asyncio
async def test_agentic_eval_includes_variations():
    """Valida que o avaliador de relevância do RAG recebe as variações no contexto."""
    from services.rag.agentic import evaluate_rag_relevance

    items = [
        {
            "id": 10,
            "question": "Formas de pagamento?",
            "answer": "Cartão de crédito e PIX.",
            "question_variations": ["Aceita boleto?", "Posso parcelar no cartão?"],
            "metadata_val": "",
            "distance": 0.8
        }
    ]

    mock_resp = MagicMock()
    mock_resp.choices = [MagicMock(message=MagicMock(content='{"useful_indices": [0], "discarded_reasons": {}}'))]
    mock_resp.usage = MagicMock()

    with patch("services.rag.agentic.call_rag_llm", new_callable=AsyncMock) as mock_call:
        mock_call.return_value = mock_resp
        useful, discarded, _ = await evaluate_rag_relevance("posso pagar com pix?", items)
        
        assert len(useful) == 1
        called_prompt = mock_call.call_args[1]["messages"][0]["content"]
        assert "Formas de pagamento?" in called_prompt
        assert "Aceita boleto?" in called_prompt
        assert "Posso parcelar no cartão?" in called_prompt

@pytest.mark.asyncio
async def test_add_knowledge_item_variation_success():
    """Valida a adição de uma nova variação com recálculo de embedding."""
    from api.routers.knowledge import add_knowledge_item_variation
    from api.schemas import AddVariationRequest
    from fastapi import HTTPException

    mock_item = KnowledgeItemModel(
        id=42,
        knowledge_base_id=1,
        question="Como funciona o curso?",
        answer="É 100% online.",
        question_variations=["Qual a metodologia?"]
    )

    mock_db = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalars.return_value.first.return_value = mock_item
    mock_db.execute.return_value = mock_result

    with patch("api.routers.knowledge.get_embedding", new_callable=AsyncMock) as mock_embed:
        mock_embed.return_value = ([0.1, 0.2, 0.3], 5)
        
        req = AddVariationRequest(variation="como funciona o curso MLD?")
        res = await add_knowledge_item_variation(item_id=42, request=req, db=mock_db)

        assert res["message"] == "Variação adicionada com sucesso."
        assert res["item_id"] == 42
        assert "como funciona o curso MLD?" in res["question_variations"]
        assert "Qual a metodologia?" in res["question_variations"]
        assert res["added"] == ["como funciona o curso MLD?"]
        mock_db.commit.assert_awaited_once()
        mock_embed.assert_awaited_once()

@pytest.mark.asyncio
async def test_add_knowledge_item_variation_duplicate():
    """Valida que variação duplicada não é adicionada novamente nem gasta embedding."""
    from api.routers.knowledge import add_knowledge_item_variation
    from api.schemas import AddVariationRequest

    mock_item = KnowledgeItemModel(
        id=42,
        knowledge_base_id=1,
        question="Como funciona o curso?",
        answer="É 100% online.",
        question_variations=["como funciona o curso MLD?"]
    )

    mock_db = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalars.return_value.first.return_value = mock_item
    mock_db.execute.return_value = mock_result

    with patch("api.routers.knowledge.get_embedding", new_callable=AsyncMock) as mock_embed:
        # Variação com casing diferente
        req = AddVariationRequest(variation="  COMO FUNCIONA O CURSO MLD?  ")
        res = await add_knowledge_item_variation(item_id=42, request=req, db=mock_db)

        assert res["added"] == []
        assert "já existia" in res["message"]
        mock_embed.assert_not_awaited()

@pytest.mark.asyncio
async def test_add_knowledge_item_variation_not_found():
    """Valida erro 404 quando o item não existe."""
    from api.routers.knowledge import add_knowledge_item_variation
    from api.schemas import AddVariationRequest
    from fastapi import HTTPException

    mock_db = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalars.return_value.first.return_value = None
    mock_db.execute.return_value = mock_result

    req = AddVariationRequest(variation="Qualquer coisa")
    with pytest.raises(HTTPException) as exc_info:
        await add_knowledge_item_variation(item_id=9999, request=req, db=mock_db)
    assert exc_info.value.status_code == 404

@pytest.mark.asyncio
async def test_delete_knowledge_item_variation_success():
    """Valida a remoção de uma variação existente e recálculo do embedding."""
    from api.routers.knowledge import delete_knowledge_item_variation
    from fastapi import HTTPException

    mock_item = KnowledgeItemModel(
        id=42,
        knowledge_base_id=1,
        question="Como funciona o curso?",
        answer="É 100% online.",
        question_variations=["Variação A", "Variação B"]
    )

    mock_db = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalars.return_value.first.return_value = mock_item
    mock_db.execute.return_value = mock_result

    with patch("api.routers.knowledge.get_embedding", new_callable=AsyncMock) as mock_embed:
        mock_embed.return_value = ([0.1, 0.2], 5)

        res = await delete_knowledge_item_variation(item_id=42, variation="Variação A", db=mock_db)

        assert res["message"] == "Variação removida com sucesso."
        assert "Variação A" not in res["question_variations"]
        assert "Variação B" in res["question_variations"]
        mock_db.commit.assert_awaited_once()

@pytest.mark.asyncio
async def test_delete_knowledge_item_success():
    """Valida a exclusão de um item de conhecimento da base."""
    from api.routers.knowledge import delete_knowledge_item

    mock_item = KnowledgeItemModel(
        id=77,
        knowledge_base_id=1,
        question="Item para deletar",
        answer="Resposta do item"
    )

    mock_db = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalars.return_value.first.return_value = mock_item
    mock_db.execute.return_value = mock_result

    res = await delete_knowledge_item(item_id=77, db=mock_db)

    assert res["message"] == "Item deleted"
    mock_db.delete.assert_awaited_once_with(mock_item)
    mock_db.commit.assert_awaited_once()

@pytest.mark.asyncio
async def test_add_knowledge_item_variation_exceeds_max_limit():
    """Valida erro 400 ao tentar ultrapassar o limite máximo de 8 variações."""
    from api.routers.knowledge import add_knowledge_item_variation
    from api.schemas import AddVariationRequest
    from fastapi import HTTPException

    mock_item = KnowledgeItemModel(
        id=88,
        knowledge_base_id=1,
        question="Pergunta de teste",
        answer="Resposta de teste",
        question_variations=[f"Variação {i}" for i in range(1, 9)]  # Já possui 8 variações
    )

    mock_db = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalars.return_value.first.return_value = mock_item
    mock_db.execute.return_value = mock_result

    req = AddVariationRequest(variation="Tentativa de 9ª variação")
    with pytest.raises(HTTPException) as exc_info:
        await add_knowledge_item_variation(item_id=88, request=req, db=mock_db)

    assert exc_info.value.status_code == 400
    assert "Limite máximo de 8 variações atingido" in exc_info.value.detail

@pytest.mark.asyncio
async def test_add_knowledge_item_exceeds_max_limit():
    """Valida erro 400 ao criar item com mais de 8 variações."""
    from api.routers.knowledge import add_knowledge_item
    from api.schemas import KnowledgeItem
    from fastapi import HTTPException

    mock_db = AsyncMock()
    item = KnowledgeItem(
        question="Pergunta",
        answer="Resposta",
        question_variations=[f"Variação {i}" for i in range(1, 10)]  # 9 variações
    )

    with pytest.raises(HTTPException) as exc_info:
        await add_knowledge_item(kb_id=1, item=item, db=mock_db)

    assert exc_info.value.status_code == 400
    assert "no máximo 8 variações" in exc_info.value.detail

@pytest.mark.asyncio
async def test_agentic_eval_discards_item_with_filter_name():
    """Valida que o avaliador de relevância do RAG atribui discard_filter = 'AGENTIC EVAL'."""
    from services.rag.agentic import evaluate_rag_relevance

    items = [
        {
            "id": 99,
            "question": "Aceita cartão recorrente?",
            "answer": "Não aceitamos recorrente.",
            "question_variations": [],
            "metadata_val": "",
            "distance": 0.7
        }
    ]

    mock_resp = MagicMock()
    mock_resp.choices = [MagicMock(message=MagicMock(content='{"useful_indices": [], "discarded_reasons": {"0": "O item trata de cartão recorrente, não sobre boleto."}}'))]
    mock_resp.usage = MagicMock()

    with patch("services.rag.agentic.call_rag_llm", new_callable=AsyncMock) as mock_call:
        mock_call.return_value = mock_resp
        useful, discarded, _ = await evaluate_rag_relevance("pagamento com boleto", items)

        assert len(useful) == 0
        assert len(discarded) == 1
        assert discarded[0]["id"] == 99
        assert discarded[0]["discard_filter"] == "AGENTIC EVAL"
        assert "cartão recorrente" in discarded[0]["discard_reason"]
