import pytest
from unittest.mock import MagicMock
from agent_core.logic.pre_router.shortcuts import check_programmatic_shortcuts, _is_recurrent_thank_you_or_closing

def test_first_thank_you_after_explanation():
    """Valida que o primeiro 'obrigado' após uma explicação (mesmo com 'estou à disposição') NÃO é silenciado."""
    history = [
        {"role": "user", "content": "como funciona o curso?"},
        {"role": "assistant", "content": "O Método Laser Day é 100% online com acesso vitalício. Qualquer dúvida, estou à disposição."}
    ]
    main_agent = MagicMock()
    main_agent.id = 1
    main_agent.greeting_mode = "panel"

    # Não deve ser considerado recorrente
    assert _is_recurrent_thank_you_or_closing(history) is False

    res = check_programmatic_shortcuts(
        raw_user_message="obrigado",
        history=history,
        main_agent=main_agent,
        is_first_msg=False,
        is_ad=False,
        similarity_info="",
        cleaned_message="obrigado",
        message="obrigado"
    )

    # O 1º agradecimento não deve ser interceptado com shortcut-logic, deve delegar à LLM pequena
    assert res is None


def test_second_consecutive_thank_you():
    """Valida que um segundo 'obrigado' CONSECUTIVO (após o assistente já ter respondido 'Por nada') é silenciado."""
    history = [
        {"role": "user", "content": "obrigado"},
        {"role": "assistant", "content": "Por nada! Se precisar de mais alguma coisa, é só chamar."}
    ]
    main_agent = MagicMock()
    main_agent.id = 1
    main_agent.greeting_mode = "panel"

    # Deve ser considerado recorrente consecutivo
    assert _is_recurrent_thank_you_or_closing(history) is True

    res = check_programmatic_shortcuts(
        raw_user_message="obrigado",
        history=history,
        main_agent=main_agent,
        is_first_msg=False,
        is_ad=False,
        similarity_info="",
        cleaned_message="obrigado",
        message="obrigado"
    )

    assert res is not None
    assert res.get("eh_agradecimento_recorrente") is True
    assert res.get("resposta_direta") is None
    assert "Agradecimento Recorrente" in res.get("tipo_mensagem")
