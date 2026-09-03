import pytest
from unittest.mock import MagicMock
from agent_core.logic.pre_router.shortcuts import check_programmatic_shortcuts

def test_greeting_shortcut_bom_dia_with_initial_msg():
    """Quando o usuário manda 'bom dia', responde 'Bom dia!' substituindo o 'Oi' da mensagem inicial."""
    main_agent = MagicMock()
    main_agent.id = 1
    main_agent.greeting_mode = "panel"
    main_agent.initial_message = "Oi, eu sou a Ana, assistente do Vinícius. Como posso te ajudar?"
    
    res = check_programmatic_shortcuts(
        raw_user_message="Bom dia",
        history=[],
        main_agent=main_agent,
        is_first_msg=True,
        is_ad=False,
        similarity_info=None,
        cleaned_message="Bom dia",
        message="Bom dia"
    )
    
    assert res is not None
    assert res["eh_saudacao"] is True
    assert "Bom dia!" in res["resposta_direta"]
    assert "eu sou a Ana" in res["resposta_direta"]

def test_greeting_shortcut_boa_tarde():
    """Quando o usuário manda 'boa tarde', responde 'Boa tarde!' com a mensagem configurada."""
    main_agent = MagicMock()
    main_agent.id = 1
    main_agent.greeting_mode = "panel"
    main_agent.initial_message = "Olá! Qual sua dúvida sobre o curso?"
    
    res = check_programmatic_shortcuts(
        raw_user_message="Boa tarde",
        history=[],
        main_agent=main_agent,
        is_first_msg=True,
        is_ad=False,
        similarity_info=None,
        cleaned_message="Boa tarde",
        message="Boa tarde"
    )
    
    assert res is not None
    assert res["eh_saudacao"] is True
    assert "Boa tarde!" in res["resposta_direta"]
    assert "Qual sua dúvida sobre o curso?" in res["resposta_direta"]

def test_greeting_shortcut_boa_noite():
    """Quando o usuário manda 'boa noite', responde 'Boa noite!' com a mensagem configurada."""
    main_agent = MagicMock()
    main_agent.id = 1
    main_agent.greeting_mode = "panel"
    main_agent.initial_message = "Oi! Em que posso te ajudar hoje?"
    
    res = check_programmatic_shortcuts(
        raw_user_message="Boa noite",
        history=[],
        main_agent=main_agent,
        is_first_msg=True,
        is_ad=False,
        similarity_info=None,
        cleaned_message="Boa noite",
        message="Boa noite"
    )
    
    assert res is not None
    assert res["eh_saudacao"] is True
    assert "Boa noite!" in res["resposta_direta"]
    assert "Em que posso te ajudar hoje?" in res["resposta_direta"]
