import pytest
from unittest.mock import MagicMock
import agent_core.logic.pre_router.shortcuts as shortcuts
from agent_core.logic.pre_router.shortcuts_modules.classification import (
    _is_recurrent_thank_you_or_closing,
    _count_payment_issue_occurrences,
    _is_purchase_declaration,
    _is_closing_or_no_more_doubts,
)
from agent_core.logic.pre_router.shortcuts_modules.conversational import (
    is_user_accepting_assistant_offer,
    is_user_answering_assistant_question,
)
from agent_core.logic.pre_router.shortcuts_modules.matcher import (
    check_programmatic_shortcuts,
)


def test_reexports_and_completeness():
    """Valida se o barrel shortcuts reexporta todas as funções de classificação e matching."""
    expected_symbols = [
        "_is_recurrent_thank_you_or_closing",
        "_has_previous_assistant_closing",
        "_count_payment_issue_occurrences",
        "_is_generic_doubt_or_vague_topic",
        "_is_closing_or_no_more_doubts",
        "_is_explicit_farewell",
        "_agent_has_active_qualification_funnel",
        "_is_purchase_declaration",
        "is_user_accepting_assistant_offer",
        "is_user_answering_assistant_question",
        "check_programmatic_shortcuts",
    ]
    for sym in expected_symbols:
        assert hasattr(shortcuts, sym), f"shortcuts não possui {sym}"
        assert callable(getattr(shortcuts, sym))


def test_classification_purchase_declaration():
    """Valida regras de identificação de compra informada."""
    assert _is_purchase_declaration("Já comprei o curso ontem no pix") is True
    assert _is_purchase_declaration("Fiz o pagamento agora") is True
    assert _is_purchase_declaration("Sou aluna já") is True

    # Negações e intenções futuras não devem ser tratadas como compra informada
    assert _is_purchase_declaration("Não comprei ainda") is False
    assert _is_purchase_declaration("Como compro o curso?") is False
    assert _is_purchase_declaration("Quero comprar amanhã") is False


def test_classification_payment_issue_occurrences():
    """Valida contagem de relatos de erro/dificuldade no pagamento."""
    history = [
        {"role": "user", "content": "Não estou conseguindo pagar com meu cartão"},
        {"role": "assistant", "content": "Tente outro navegador"},
        {"role": "user", "content": "Deu erro no pagamento de novo"},
    ]
    current_msg = "Meu cartão recusou pela terceira vez"
    count = _count_payment_issue_occurrences(history, current_msg)
    assert count == 3


def test_classification_recurrent_thank_you():
    """Valida identificação de agradecimento/encerramento consecutivo (Regra 34)."""
    assert _is_recurrent_thank_you_or_closing([]) is False

    history = [
        {"role": "user", "content": "Obrigado!"},
        {"role": "assistant", "content": "Por nada! Se precisar de mais alguma coisa, é só chamar"},
    ]
    assert _is_recurrent_thank_you_or_closing(history) is True

    # Se a última mensagem do assistente não era encerramento de cortesia, não é recorrente
    history_answering = [
        {"role": "user", "content": "Obrigado!"},
        {"role": "assistant", "content": "O curso tem 50 aulas práticas."},
    ]
    assert _is_recurrent_thank_you_or_closing(history_answering) is False


def test_conversational_accepting_offer():
    """Valida aceite de links ou materiais oferecidos pelo assistente."""
    history = [
        {"role": "assistant", "content": "Quer que eu te envie o link com o desconto especial?"}
    ]
    is_acc, offer_type = is_user_accepting_assistant_offer("Pode enviar", history)
    assert is_acc is True
    assert offer_type == "link"

    is_acc_link, offer_type_link = is_user_accepting_assistant_offer("Manda o link por favor", history)
    assert is_acc_link is True
    assert offer_type_link == "link"


def test_conversational_answering_question():
    """Valida identificação de resposta do lead a perguntas de qualificação."""
    history = [
        {"role": "assistant", "content": "Qual o seu objetivo profissional na área?"}
    ]
    # Resposta declarativa não deve ir para RAG
    assert is_user_answering_assistant_question("Meu objetivo é abrir minha própria clínica", history) is True

    # Pergunta explícita com interrogação DEVE ir para atendimento/RAG
    assert is_user_answering_assistant_question("Qual o valor do curso?", history) is False


def test_matcher_email_shortcut():
    """Valida captura determinística de e-mail com desativação de RAG."""
    agent_mock = MagicMock(id=1, initial_message="Olá")
    res = check_programmatic_shortcuts(
        raw_user_message="cliente@exemplo.com.br",
        history=[],
        main_agent=agent_mock,
        is_first_msg=False,
        is_ad=False,
        similarity_info="",
        cleaned_message="cliente@exemplo.com.br",
        message="cliente@exemplo.com.br",
    )
    assert res is not None
    assert res["precisa_rag"] is False
    assert res["tipo_mensagem"] == "Resposta de Dados / E-mail do Usuário"


def test_matcher_purchase_not_intercepted_by_static_shortcut():
    """Valida que mensagens de compra informada NÃO são interceptadas com resposta estática (Regra 62)."""
    agent_mock = MagicMock(id=1, initial_message="Olá")
    res = check_programmatic_shortcuts(
        raw_user_message="Oi comprei o curso mas não recebi meu acesso",
        history=[],
        main_agent=agent_mock,
        is_first_msg=False,
        is_ad=False,
        similarity_info="",
        cleaned_message="Oi comprei o curso mas não recebi meu acesso",
        message="Oi comprei o curso mas não recebi meu acesso",
    )
    # Deve retornar None para que a IA processe a dúvida do cliente
    assert res is None


def test_matcher_recurrent_payment_issue_triggers_handoff():
    """Valida que 3 relatos de erro no pagamento acionam transferir_suporte_humano."""
    agent_mock = MagicMock(id=1, initial_message="Olá")
    history = [
        {"role": "user", "content": "Erro no pagamento com cartão"},
        {"role": "assistant", "content": "Tente novamente"},
        {"role": "user", "content": "Não consigo pagar de jeito nenhum"},
    ]
    res = check_programmatic_shortcuts(
        raw_user_message="Cartão recusado novamente",
        history=history,
        main_agent=agent_mock,
        is_first_msg=False,
        is_ad=False,
        similarity_info="",
        cleaned_message="Cartão recusado novamente",
        message="Cartão recusado novamente",
    )
    assert res is not None
    assert res["chamada_ferramenta"]["name"] == "transferir_suporte_humano"
    assert "Dificuldade recorrente de pagamento" in res["chamada_ferramenta"]["arguments"]["motivo"]
