import json
import pytest
from unittest.mock import MagicMock
from agent_core.logic.pre_router.shortcuts import check_programmatic_shortcuts, _agent_has_active_qualification_funnel, _is_explicit_farewell


class AgentWithFunnel:
    def __init__(self, questions=None):
        self.id = 36
        self.name = "Agente Tarcira"
        self.greeting_mode = "panel"
        self.question_mode = "panel"
        self.initial_message = "Olá!"
        self.initial_question_message = "Possui mais alguma dúvida?"
        self.ad_mode = "panel"
        self.initial_ignore_message = None
        self.qualification_questions = questions or json.dumps([
            {"title": "Nome do Lead", "prompt": "Pergunte o nome do lead para personalizar o atendimento."},
            {"title": "Nível de Experiência", "prompt": "Investigue se o aluno já atua na área ou está começando do zero."}
        ])


def test_agent_has_active_qualification_funnel_returns_true_when_configured():
    agent = AgentWithFunnel()
    assert _agent_has_active_qualification_funnel(agent, {}) is True


def test_agent_has_active_qualification_funnel_returns_false_when_already_qualified():
    agent = AgentWithFunnel()
    assert _agent_has_active_qualification_funnel(agent, {"lead_already_qualified": True}) is False


def test_agent_has_active_qualification_funnel_returns_false_when_no_questions():
    agent = AgentWithFunnel(questions="[]")
    assert _agent_has_active_qualification_funnel(agent, {}) is False


def test_is_explicit_farewell():
    assert _is_explicit_farewell("tchau") is True
    assert _is_explicit_farewell("adeus") is True
    assert _is_explicit_farewell("até logo") is True
    assert _is_explicit_farewell("até mais") is True
    assert _is_explicit_farewell("valeu tchau") is True

    # Declarações de sem dúvidas NÃO são despedidas explícitas
    assert _is_explicit_farewell("não tenho dúvidas") is False
    assert _is_explicit_farewell("não tenho duvidas") is False
    assert _is_explicit_farewell("sem dúvidas") is False
    assert _is_explicit_farewell("era só isso") is False
    assert _is_explicit_farewell("não preciso de mais nada") is False


def test_no_doubts_with_active_funnel_does_not_close_conversation():
    agent = AgentWithFunnel()
    history = [
        {"role": "user", "content": "Qual o valor do curso?"},
        {"role": "assistant", "content": "O curso custa R$ 497. Você possui mais alguma dúvida?"}
    ]

    res = check_programmatic_shortcuts(
        raw_user_message="não tenho duvidas",
        history=history,
        main_agent=agent,
        is_first_msg=False,
        is_ad=False,
        similarity_info=None,
        cleaned_message="não tenho duvidas",
        message="não tenho duvidas",
        context_variables={}
    )

    assert res is not None
    # Deve dar continuidade ao atendimento e NÃO deve ter resposta direta de despedida fixa
    assert res.get("resposta_direta") is None
    assert res.get("eh_resposta_ao_agente") is True
    assert res.get("precisa_rag") is False
    assert res.get("eh_saudacao") is False
    assert res.get("tipo_mensagem") == "Resposta de Ausência de Dúvidas / Continuidade de Qualificação"


def test_sem_duvidas_with_active_funnel_does_not_close_conversation():
    agent = AgentWithFunnel()
    history = [
        {"role": "user", "content": "Tem certificado?"},
        {"role": "assistant", "content": "Sim, emitimos certificado válido! Ficou com alguma dúvida?"}
    ]

    res = check_programmatic_shortcuts(
        raw_user_message="sem dúvidas",
        history=history,
        main_agent=agent,
        is_first_msg=False,
        is_ad=False,
        similarity_info=None,
        cleaned_message="sem dúvidas",
        message="sem dúvidas",
        context_variables={}
    )

    assert res is not None
    assert res.get("resposta_direta") is None
    assert res.get("eh_resposta_ao_agente") is True
    assert res.get("precisa_rag") is False


def test_explicit_farewell_with_active_funnel_closes_normally():
    agent = AgentWithFunnel()
    history = [
        {"role": "user", "content": "Qual o valor?"},
        {"role": "assistant", "content": "R$ 497. Possui dúvidas?"}
    ]

    res = check_programmatic_shortcuts(
        raw_user_message="tchau obrigado",
        history=history,
        main_agent=agent,
        is_first_msg=False,
        is_ad=False,
        similarity_info=None,
        cleaned_message="tchau obrigado",
        message="tchau obrigado",
        context_variables={}
    )

    assert res is not None
    # Como foi despedida explícita, deve despedir
    assert res.get("resposta_direta") is not None
    assert "Bons estudos" in res.get("resposta_direta") or "à disposição" in res.get("resposta_direta")


def test_no_doubts_when_already_qualified_closes_normally():
    agent = AgentWithFunnel()
    history = [
        {"role": "user", "content": "Qual o horário das aulas?"},
        {"role": "assistant", "content": "As aulas são 100% gravadas e online! Você tem alguma dúvida?"}
    ]

    res = check_programmatic_shortcuts(
        raw_user_message="não, era só isso",
        history=history,
        main_agent=agent,
        is_first_msg=False,
        is_ad=False,
        similarity_info=None,
        cleaned_message="não, era só isso",
        message="não, era só isso",
        context_variables={"lead_already_qualified": True}
    )

    assert res is not None
    # Como o lead já está qualificado e não há despedida anterior, encerra com despedida educada
    assert res.get("resposta_direta") is not None
    assert "Fico à disposição" in res.get("resposta_direta")


def test_recurrent_closing_silences_even_when_already_qualified():
    agent = AgentWithFunnel()
    history = [
        {"role": "user", "content": "Obrigado pelas orientações."},
        {"role": "assistant", "content": "Por nada! Restou alguma dúvida?"}
    ]

    res = check_programmatic_shortcuts(
        raw_user_message="não, era só isso",
        history=history,
        main_agent=agent,
        is_first_msg=False,
        is_ad=False,
        similarity_info=None,
        cleaned_message="não, era só isso",
        message="não, era só isso",
        context_variables={"lead_already_qualified": True}
    )

    assert res is not None
    # Como já houve encerramento/agradecimento prévio, silencia a automação
    assert res.get("resposta_direta") is None
    assert res.get("eh_agradecimento_recorrente") is True
    assert "silenciada" in res.get("motivo_silencio", "").lower()

