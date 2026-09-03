import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from agent_core.logic.pre_router import run_pre_router_ai
from models import AgentConfigModel

@pytest.mark.asyncio
async def test_pre_router_negative_doubt_no_clarification():
    main_agent = MagicMock(spec=AgentConfigModel)
    main_agent.id = 1
    main_agent.name = "Tarcira"
    main_agent.description = "Especialista"
    main_agent.router_simple_model = "gpt-4o-mini"
    main_agent.initial_message = "Olá! Seja bem-vindo."
    main_agent.initial_ignore_message = None
    main_agent.system_prompt = ""
    main_agent.dynamic_prompt = ""
    main_agent.pre_router_prompt = ""
    main_agent.date_awareness = False
    main_agent.date_awareness_past_days = 7
    main_agent.date_awareness_future_days = 7
    main_agent.context_window = 5

    history = [
        {"role": "assistant", "content": "Oieee Débora, tudo bem? Vi que você não finalizou. Você tem alguma dúvida?"}
    ]

    mock_response = MagicMock()
    mock_response.choices = [MagicMock()]
    mock_response.choices[0].message.content = (
        '{"eh_saudacao": false, "eh_agradecimento": false, "eh_mensagem_automatica": false, '
        '"precisa_esclarecimento": false, "resposta_direta": null, "resposta_esclarecimento": null, '
        '"id_agente_alvo": 1, "perguntas_extraidas": "O cliente informou que não possui dúvidas sobre o método Laser Day", '
        '"lista_perguntas_extraidas": ["O cliente informou que não possui dúvidas sobre o método Laser Day"], '
        '"precisa_rag": false, "chamada_ferramenta": null}'
    )
    mock_response.usage = MagicMock()
    mock_response.usage.prompt_tokens = 10
    mock_response.usage.completion_tokens = 5
    mock_response.usage.total_tokens = 15

    with patch("os.getenv", return_value="fake-key"):
        with patch("openai.AsyncOpenAI") as mock_openai:
            mock_client = MagicMock()
            mock_openai.return_value = mock_client
            mock_client.chat.completions.create = AsyncMock(return_value=mock_response)

            # Teste 1: "Não tenho"
            result1 = await run_pre_router_ai("Não tenho", history, main_agent, [])
            assert result1["precisa_esclarecimento"] is False
            assert result1["eh_mensagem_automatica"] is False

            # Teste 2: "Não tenho dúvida"
            result2 = await run_pre_router_ai("Não tenho dúvida", history, main_agent, [])
            assert result2["precisa_esclarecimento"] is False
            assert result2["eh_mensagem_automatica"] is False


@pytest.mark.asyncio
async def test_pre_router_closing_nao_era_so_isso_mesmo():
    main_agent = MagicMock(spec=AgentConfigModel)
    main_agent.id = 1
    main_agent.name = "Tarcira"
    main_agent.description = "Especialista"
    main_agent.router_simple_model = "gpt-4o-mini"
    main_agent.initial_message = "Olá! Seja bem-vindo."
    main_agent.initial_ignore_message = None
    main_agent.system_prompt = ""
    main_agent.dynamic_prompt = ""
    main_agent.pre_router_prompt = ""
    main_agent.date_awareness = False
    main_agent.context_window = 5

    history = [
        {"role": "assistant", "content": "O link do curso é esse: https://pay.kiwify.com.br/VVme7C2\n\nPosso ajudar você com mais alguma dúvida sobre o Método Laser Day?"}
    ]

    # Teste 1: "Não era só isso mesmo" -> Deve encerrar educadamente e NUNCA pedir esclarecimento
    result1 = await run_pre_router_ai("Não era só isso mesmo", history, main_agent, [])
    assert result1["precisa_esclarecimento"] is False
    assert result1["resposta_esclarecimento"] is None
    assert result1["eh_saudacao"] is True
    assert result1["eh_agradecimento"] is True
    assert "disposição" in result1["resposta_direta"].lower() or "perfeito" in result1["resposta_direta"].lower()

    # Teste 2: "Era só isso mesmo"
    result2 = await run_pre_router_ai("Era só isso mesmo", history, main_agent, [])
    assert result2["precisa_esclarecimento"] is False
    assert result2["eh_saudacao"] is True
    assert result2["eh_agradecimento"] is True

    # Teste 3: "Só isso mesmo"
    result3 = await run_pre_router_ai("Só isso mesmo", history, main_agent, [])
    assert result3["precisa_esclarecimento"] is False
    assert result3["eh_saudacao"] is True

    # Teste 4: "Não preciso de mais nada"
    result4 = await run_pre_router_ai("Não preciso de mais nada", history, main_agent, [])
    assert result4["precisa_esclarecimento"] is False
    assert result4["eh_saudacao"] is True

    # Teste 5: "Por enquanto é só"
    result5 = await run_pre_router_ai("Por enquanto é só", history, main_agent, [])
    assert result5["precisa_esclarecimento"] is False
    assert result5["eh_saudacao"] is True

