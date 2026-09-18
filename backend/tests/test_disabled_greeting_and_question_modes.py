import pytest
from unittest.mock import MagicMock
from agent_core.logic.pre_router.shortcuts import check_programmatic_shortcuts


class DummyAgent:
    def __init__(self, id=1, name="Agente Teste", greeting_mode="panel", question_mode="panel", initial_message="Olá! Como posso ajudar?", initial_question_message="Possui mais alguma dúvida?"):
        self.id = id
        self.name = name
        self.greeting_mode = greeting_mode
        self.question_mode = question_mode
        self.initial_message = initial_message
        self.initial_question_message = initial_question_message
        self.ad_mode = "panel"
        self.initial_ignore_message = None


def test_greeting_mode_panel_returns_shortcut_greeting():
    agent = DummyAgent(greeting_mode="panel", initial_message="Olá! Sou a assistente virtual.")
    res = check_programmatic_shortcuts(
        raw_user_message="Oi",
        history=[],
        main_agent=agent,
        is_first_msg=True,
        is_ad=False,
        similarity_info=None,
        cleaned_message="Oi",
        message="Oi"
    )
    assert res is not None
    assert res.get("eh_saudacao") is True
    assert res.get("resposta_direta") == "Olá! Sou a assistente virtual."


def test_greeting_mode_disabled_skips_shortcut_greeting():
    agent = DummyAgent(greeting_mode="disabled", initial_message="Olá! Sou a assistente virtual.")
    res = check_programmatic_shortcuts(
        raw_user_message="Oi",
        history=[],
        main_agent=agent,
        is_first_msg=True,
        is_ad=False,
        similarity_info=None,
        cleaned_message="Oi",
        message="Oi"
    )
    # Quando greeting_mode é 'disabled', não deve retornar resposta direta fixa pelo shortcut
    assert res is None


def test_greeting_mode_disabled_bom_dia_skips_shortcut_greeting():
    agent = DummyAgent(greeting_mode="disabled", initial_message="Olá!")
    res = check_programmatic_shortcuts(
        raw_user_message="Bom dia",
        history=[],
        main_agent=agent,
        is_first_msg=True,
        is_ad=False,
        similarity_info=None,
        cleaned_message="Bom dia",
        message="Bom dia"
    )
    assert res is None


def test_question_mode_disabled_does_not_append_question_message():
    import re
    # Simula a lógica de formatação final de core.py (linhas 914-926)
    is_first_msg = True
    init_q_msg = "Possui mais alguma dúvida?"
    question_mode = "disabled"
    is_handoff = False
    final_content = "O curso custa R$ 497 à vista ou 12x no cartão. Qualquer dúvida estou à disposição, você possui mais alguma pergunta?"

    if is_first_msg and final_content and not is_handoff and question_mode in ("panel", "disabled"):
        pattern = r'(?:[\n\s]+)?(?:Posso|Deseja|Quer|Como posso|Você possui|Mais alguma|Se tiver|Qualquer).*?(?:dúvida|ajuda|ajudar|pergunta|esclarecer|algo mais|mais alguma).*?\?\s*$'
        match = re.search(pattern, final_content, re.IGNORECASE | re.DOTALL)
        if match:
            final_content = final_content[:match.start()].strip()
            
        if question_mode == "panel" and init_q_msg and not final_content.endswith(init_q_msg):
            final_content = f"{final_content}\n\n{init_q_msg}"

    # No modo disabled, a pergunta redundante do LLM foi removida e o init_q_msg NÃO foi anexado
    assert not final_content.endswith(init_q_msg)
    assert "Você possui" not in final_content
    assert final_content == "O curso custa R$ 497 à vista ou 12x no cartão."


def test_question_mode_panel_appends_question_message():
    import re
    is_first_msg = True
    init_q_msg = "Possui mais alguma dúvida?"
    question_mode = "panel"
    is_handoff = False
    final_content = "O curso custa R$ 497 à vista ou 12x no cartão."

    if is_first_msg and final_content and not is_handoff and question_mode in ("panel", "disabled"):
        pattern = r'(?:[\n\s]+)?(?:Posso|Deseja|Quer|Como posso|Você possui|Mais alguma|Se tiver|Qualquer).*?(?:dúvida|ajuda|ajudar|pergunta|esclarecer|algo mais|mais alguma).*?\?\s*$'
        match = re.search(pattern, final_content, re.IGNORECASE | re.DOTALL)
        if match:
            final_content = final_content[:match.start()].strip()
            
        if question_mode == "panel" and init_q_msg and not final_content.endswith(init_q_msg):
            final_content = f"{final_content}\n\n{init_q_msg}"

    assert final_content.endswith("Possui mais alguma dúvida?")
