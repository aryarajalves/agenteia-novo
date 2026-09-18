import pytest
from webhook_tasks.utils import is_user_answering_assistant_question, execute_pre_rag_search
from webhook_tasks import pipeline_ai

def test_is_user_answering_assistant_question_utils_import():
    """Valida que is_user_answering_assistant_question em utils.py executa sem NameError (ex: name 're' is not defined)."""
    # Teste com mensagem que aciona regex e substituições
    resultado = is_user_answering_assistant_question(
        "Sim já atuo na área há 2 anos, quero me qualificar mais",
        history=[{"role": "assistant", "content": "Você já atua na área ou está começando do zero?"}]
    )
    assert resultado is True

    # Teste com mensagem contendo dúvida explícita
    resultado_duvida = is_user_answering_assistant_question(
        "Quanto custa o curso?",
        history=[{"role": "assistant", "content": "Você já atua na área?"}]
    )
    assert resultado_duvida is False


def test_pipeline_ai_has_no_undefined_names():
    """Valida que pipeline_ai e utils possuem todos os módulos e helpers carregados (re, get_now_utc, etc)."""
    import webhook_tasks.utils as utils
    assert hasattr(utils, 're')
    assert hasattr(pipeline_ai, 're')
    assert hasattr(pipeline_ai, 'get_now_utc')
    assert hasattr(pipeline_ai, 'get_now_br')
    assert callable(pipeline_ai.get_now_utc)
