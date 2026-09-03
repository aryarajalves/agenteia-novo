import pytest
from services.semantic_cache_service import split_multi_questions

def test_split_multi_questions_single_question_mark_with_followup_text():
    """Valida que 'Como funciona? Me manda o link' é quebrado em 2 sub-perguntas."""
    text = "Como funciona? Me manda o link"
    sub_qs = split_multi_questions(text)
    assert len(sub_qs) == 2
    assert "Como funciona?" in sub_qs[0]
    assert "Me manda o link" in sub_qs[1]

def test_split_multi_questions_two_question_marks():
    """Valida que 'Quanto custa? Aceita pix?' é quebrado em 2 perguntas."""
    text = "Quanto custa? Aceita pix?"
    sub_qs = split_multi_questions(text)
    assert len(sub_qs) == 2
    assert "Quanto custa?" in sub_qs[0]
    assert "Aceita pix?" in sub_qs[1]

def test_split_multi_questions_with_conjunction():
    """Valida que 'Como funciona e qual o valor' é quebrado em 2 perguntas."""
    text = "Como funciona e qual o valor"
    sub_qs = split_multi_questions(text)
    assert len(sub_qs) == 2
    assert "Como funciona" in sub_qs[0]
    assert "qual o valor" in sub_qs[1]

def test_split_multi_questions_single_clean_query():
    """Valida que uma pergunta única simples não é desmembrada incorretamente."""
    text = "Qual o valor do investimento no curso?"
    sub_qs = split_multi_questions(text)
    assert len(sub_qs) == 1
    assert sub_qs[0] == "Qual o valor do investimento no curso?"
