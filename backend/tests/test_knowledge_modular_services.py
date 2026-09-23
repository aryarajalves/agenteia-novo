import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi import HTTPException
from api.services.knowledge_service import (
    MAX_QUESTION_VARIATIONS,
    get_item_embedding_text,
    clean_variations_list,
    validate_variations_count,
    export_knowledge_base_dict,
    parse_import_payload,
    process_variation_addition,
    process_variation_removal
)
from api.services.knowledge_parser import (
    analyze_kb_file_content,
    analyze_kb_text_content
)
from models import KnowledgeBaseModel, KnowledgeItemModel


def test_clean_variations_list():
    assert clean_variations_list(None) == []
    assert clean_variations_list([]) == []
    assert clean_variations_list('["Var 1", "  Var 2  "]') == ["Var 1", "Var 2"]
    assert clean_variations_list('invalid-json') == []
    assert clean_variations_list(["  Item A  ", "", "Item B"]) == ["Item A", "Item B"]


def test_validate_variations_count():
    validate_variations_count(5)
    validate_variations_count(MAX_QUESTION_VARIATIONS)
    with pytest.raises(HTTPException) as exc:
        validate_variations_count(MAX_QUESTION_VARIATIONS + 1)
    assert exc.value.status_code == 400


def test_process_variation_addition():
    current = ["Como funciona?"]
    # Adicionar variação nova
    updated, added = process_variation_addition(current, "Qual o funcionamento?", None)
    assert "Qual o funcionamento?" in updated
    assert added == ["Qual o funcionamento?"]

    # Variação duplicada (case-insensitive) não deve ser adicionada novamente
    updated2, added2 = process_variation_addition(updated, "como funciona?", None)
    assert added2 == []
    assert len(updated2) == 2

    # Exceder limite deve lançar HTTPException 400
    full_list = [f"Var {i}" for i in range(MAX_QUESTION_VARIATIONS)]
    with pytest.raises(HTTPException) as exc:
        process_variation_addition(full_list, "Mais uma", None)
    assert exc.value.status_code == 400


def test_process_variation_removal():
    current = ["Como funciona?", "Qual o preço?"]
    updated = process_variation_removal(current, "como funciona?")
    assert updated == ["Qual o preço?"]

    with pytest.raises(HTTPException) as exc:
        process_variation_removal(updated, "Inexistente")
    assert exc.value.status_code == 404


def test_export_knowledge_base_dict():
    kb = KnowledgeBaseModel(
        id=10,
        name="Base FAQ",
        description="FAQ da empresa",
        kb_type="qa",
        question_label="Pergunta",
        answer_label="Resposta",
        metadata_label="Metadado"
    )
    item = KnowledgeItemModel(
        id=1,
        knowledge_base_id=10,
        question="Qual o horário?",
        answer="Das 9h às 18h",
        category="Geral",
        metadata_val="suporte",
        question_variations=["Que horas abre?"]
    )
    kb.items = [item]
    exported = export_knowledge_base_dict(kb)
    assert exported["name"] == "Base FAQ"
    assert len(exported["items"]) == 1
    assert exported["items"][0]["question"] == "Qual o horário?"
    assert exported["items"][0]["question_variations"] == ["Que horas abre?"]


def test_parse_import_payload():
    payload = {
        "items": [
            {
                "question": "O que é isso?",
                "answer": "É uma demonstração.",
                "category": "Ajuda",
                "question_variations": ["O que significa?"]
            }
        ]
    }
    parsed = parse_import_payload(payload)
    assert len(parsed) == 1
    assert parsed[0]["question"] == "O que é isso?"
    assert parsed[0]["question_variations"] == ["O que significa?"]


def test_analyze_kb_text_content():
    sample_csv = "nome,idade\nJoão,30\nMaria,25"
    result = analyze_kb_text_content(sample_csv)
    assert "columns" in result
    assert "preview" in result
    assert result["total_rows"] == 5 or len(result["preview"]) > 0
