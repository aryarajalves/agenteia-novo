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
        "fiz a minha matrícula"
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
    """Valida o atalho do pre-router para quando o lead informa compra."""
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

    assert result is not None
    assert result.get("eh_compra_informada") is True
    assert result.get("eh_saudacao") is True
    assert "Parabéns" in result.get("resposta_direta")
    assert result.get("precisa_rag") is False


@pytest.mark.asyncio
async def test_followup_cancel_on_purchased_or_cancel_label():
    """Valida se as etiquetas de cancelamento e compra encerram a régua de follow-up."""
    from tasks import check_followup_due
    
    # Mock do banco e da API do ZapVoice
    with patch("tasks.SessionLocal") as mock_session_cls, \
         patch("tasks.is_conversation_paused", new_callable=AsyncMock) as mock_paused:
        
        mock_db = MagicMock()
        mock_session_cls.return_value = mock_db
        
        # Config com followup ativado e etiquetas de cancelamento e compra
        mock_db.execute.return_value.fetchall.side_effect = [
            # 1ª query: webhook_configs
            [(
                1, "leads", "https://api.zapvoice.com", "token_123",
                '[{"delay_minutes": 10}]', '{"enabled": false}',
                1, "humano", "cancelar_robo", "",
                "https://api.zapvoice.com", "token_123", "client_1",
                "followup_enviado", "aluno_comprou"
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
