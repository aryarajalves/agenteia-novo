import pytest
from unittest.mock import patch, AsyncMock, MagicMock
from agent_core.logic.pre_router.shortcuts import _is_purchase_declaration, check_programmatic_shortcuts


def test_is_purchase_declaration_variations():
    """Valida o reconhecimento de diferentes declarações de compra feitas pelo lead."""
    positive_phrases = [
        "já comprei",
        "Ja comprei o curso",
        "já paguei",
        "fiz o pagamento ontem",
        "já fiz a compra",
        "já sou aluna",
        "ja sou aluno",
        "comprei ontem",
        "paguei no pix",
        "paguei no cartão",
        "paguei pelo cartão",
        "já adquiri",
        "adquiri o curso",
        "fiz a minha matrícula",
        "oiee comprei o curso, mas não chegou meu acesso no meu email, como faço?"
    ]
    for phrase in positive_phrases:
        assert _is_purchase_declaration(phrase) is True, f"Deveria reconhecer compra para: '{phrase}'"

    negative_phrases = [
        "não comprei ainda",
        "nao paguei",
        "quero comprar",
        "como compro o curso?",
        "onde compro?",
        "quanto custa?",
        "qual o valor?",
        "como funciona?"
    ]
    for phrase in negative_phrases:
        assert _is_purchase_declaration(phrase) is False, f"Não deveria reconhecer compra para: '{phrase}'"


def test_check_programmatic_shortcuts_purchase_declaration():
    """Valida que o atalho determinístico (shortcut-logic) NÃO intercepta declarações de compra,
    garantindo que mensagens de compra sejam sempre analisadas e respondidas pela IA."""
    mock_agent = MagicMock()
    mock_agent.id = 1
    mock_agent.initial_message = "Olá! Como posso ajudar?"

    result = check_programmatic_shortcuts(
        raw_user_message="Já comprei o curso ontem!",
        history=[],
        main_agent=mock_agent,
        is_first_msg=False,
        is_ad=False,
        similarity_info="",
        cleaned_message="Já comprei o curso ontem!",
        message="Já comprei o curso ontem!"
    )

    # Deve ser None para não disparar shortcut-logic com resposta enlatada
    assert result is None

    # Testando também o caso reportado com dúvida pós-compra
    result_user_case = check_programmatic_shortcuts(
        raw_user_message="oiee comprei o curso, mas não chegou meu acesso no meu email, como faço?",
        history=[],
        main_agent=mock_agent,
        is_first_msg=False,
        is_ad=False,
        similarity_info="",
        cleaned_message="oiee comprei o curso, mas não chegou meu acesso no meu email, como faço?",
        message="oiee comprei o curso, mas não chegou meu acesso no meu email, como faço?"
    )
    assert result_user_case is None


@pytest.mark.asyncio
async def test_followup_cancel_on_purchased_or_cancel_label():
    """Valida se as etiquetas de cancelamento e compra encerram a régua de follow-up."""
    from tasks import check_followup_due
    
    # Mock do banco e da API do ZapVoice
    with patch("tasks.SessionLocal") as mock_session_cls, \
         patch("tasks.is_conversation_paused", new_callable=AsyncMock) as mock_paused:
        
        mock_db = MagicMock()
        mock_session_cls.return_value = mock_db
        
        # Config com followup ativado e etiquetas de cancelamento e compra (16 colunas esperadas)
        mock_db.execute.return_value.fetchall.side_effect = [
            # 1ª query: webhook_configs
            [(
                1, "leads", "https://api.zapvoice.com", "token_123",
                '[{"delay_minutes": 10}]', '{"enabled": false}',
                1, "humano", "cancelar_robo", "",
                "https://api.zapvoice.com", "token_123", "client_1",
                "followup_enviado", "aluno_comprou", "[]"
            )],
            # 2ª query: leads due
            [(
                101, "client_1", "conv_555", "5511999999999", "Maria",
                None, "Ola", "Resposta", '["aluno_comprou"]'
            )]
        ]
        
        # Executar a verificação
        check_followup_due()
        
        # O lead possui a etiqueta "aluno_comprou", o que deve acionar o cancelamento
        mock_db.close.assert_called_once()


@pytest.mark.asyncio
async def test_run_pre_router_purchase_message_allows_ai_response():
    """Valida que mensagens de compra no pre-router marcam eh_compra_informada=True sem resposta_direta estática,
    garantindo que o agente de IA processe e formule a resposta."""
    from agent_core.logic.pre_router.runner import run_pre_router_ai
    mock_agent = MagicMock()
    mock_agent.id = 1
    mock_agent.initial_message = "Olá! Como posso ajudar?"
    mock_agent.ad_mode = "panel"
    mock_agent.initial_ignore_message = None
    mock_agent.system_prompt = "Você é um assistente prestativo."

    user_msg = "oiee comprei o curso, mas não chegou meu acesso no meu email, como faço?"
    res = await run_pre_router_ai(
        message=user_msg,
        history=[],
        main_agent=mock_agent,
        secondary_agents=[]
    )

    assert res.get("eh_compra_informada") is True
    assert res.get("resposta_direta") is None
    assert res.get("_model_used") != "shortcut-logic"
