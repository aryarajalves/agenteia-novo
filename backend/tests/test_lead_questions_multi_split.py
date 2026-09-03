import pytest
from services.semantic_cache_service import split_multi_questions

def test_multi_query_split_three_chained_questions_without_punctuation():
    """Valida que 'Quanto custa o curso como funcion e qual e a professora' é desmembrado em 3 dúvidas."""
    msg = "Quanto custa o curso como funcion e qual e a professora"
    parts = split_multi_questions(msg)
    assert len(parts) == 3
    assert "Quanto custa o curso" in parts[0]
    assert "como funcion" in parts[1]
    assert "qual e a professora" in parts[2]

def test_multi_query_split_logic():
    """Valida a lógica de quebra de dúvidas múltiplas para o endpoint de sugestões do cache."""
    msg = "O curso tem certificado? Quem é a professora?"
    parts = split_multi_questions(msg)
    assert len(parts) == 2
    assert "O curso tem certificado?" in parts[0]
    assert "Quem é a professora?" in parts[1]

def test_multi_query_split_with_link():
    msg = "Como funciona? Me manda o link"
    parts = split_multi_questions(msg)
    assert len(parts) == 2
    assert "Como funciona?" in parts[0]
    assert "Me manda o link" in parts[1]
