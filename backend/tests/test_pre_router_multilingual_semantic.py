import pytest
from unittest.mock import MagicMock, AsyncMock, patch
from agent_core.logic.pre_router import run_pre_router_ai
from agent_core.logic.pre_router.shortcuts import check_programmatic_shortcuts, is_user_answering_assistant_question
from models import AgentConfigModel

@pytest.fixture
def mock_agent():
    agent = MagicMock(spec=AgentConfigModel)
    agent.id = 1
    agent.name = "Tarcira"
    agent.description = "Especialista em Remoção de Tatuagem"
    agent.router_simple_model = "gpt-4o-mini"
    agent.model = "gpt-4o-mini"
    agent.initial_message = "Olá! Seja bem-vindo."
    agent.initial_ignore_message = None
    agent.greeting_mode = "panel"
    agent.ad_mode = "panel"
    agent.system_prompt = "Você é um atendente prestativo."
    agent.dynamic_prompt = ""
    agent.pre_router_prompt = ""
    agent.date_awareness = False
    agent.context_window = 5
    agent.tools = []
    agent.knowledge_bases = []
    agent.knowledge_base_id = None
    return agent

@pytest.mark.asyncio
async def test_pre_router_multilingual_closing_no_questions(mock_agent):
    """Valida que mensagens de encerramento em múltiplos idiomas (PT, EN, ES)
    são devidamente interpretadas sem pedir esclarecimento indevido e sem RAG."""
    history = [
        {"role": "assistant", "content": "O valor é R$ 297,00 no cartão ou Pix. Posso te ajudar com algo mais?"}
    ]

    mock_response = MagicMock()
    mock_response.choices = [MagicMock()]
    mock_response.choices[0].message.content = (
        '{"eh_saudacao": true, "eh_agradecimento": true, "eh_agradecimento_recorrente": false, '
        '"eh_mensagem_automatica": false, "eh_resposta_ao_agente": false, '
        '"precisa_esclarecimento": false, "resposta_direta": "Perfeito! Fico à disposição. Até logo! 😊", '
        '"resposta_esclarecimento": null, "id_agente_alvo": 1, "perguntas_extraidas": null, '
        '"lista_perguntas_extraidas": [], "precisa_rag": false, "chamada_ferramenta": null}'
    )
    mock_response.usage = MagicMock()
    mock_response.usage.prompt_tokens = 20
    mock_response.usage.completion_tokens = 10
    mock_response.usage.total_tokens = 30

    with patch("os.getenv", return_value="fake-key"):
        with patch("openai.AsyncOpenAI") as mock_openai:
            mock_client = MagicMock()
            mock_openai.return_value = mock_client
            mock_client.chat.completions.create = AsyncMock(return_value=mock_response)

            for msg in ["não tenho mais dúvidas", "I have no questions, thanks", "no tengo más dudas, gracias"]:
                result = await run_pre_router_ai(msg, history, mock_agent, [])
                assert result["precisa_esclarecimento"] is False, f"Falhou para {msg}"
                assert result["eh_saudacao"] is True, f"Falhou para {msg}"
                assert result["precisa_rag"] is False, f"Falhou para {msg}"
                assert result["eh_mensagem_automatica"] is False, f"Falhou para {msg}"

@pytest.mark.asyncio
async def test_pre_router_multilingual_vague_doubt(mock_agent):
    """Valida que tópicos vagos ou declarações afirmativas de dúvida (PT, EN, ES)
    solicitam esclarecimento sem acionar o RAG nem inventar perguntas."""
    history = []

    mock_response = MagicMock()
    mock_response.choices = [MagicMock()]
    mock_response.choices[0].message.content = (
        '{"eh_saudacao": false, "eh_agradecimento": false, "eh_agradecimento_recorrente": false, '
        '"eh_mensagem_automatica": false, "eh_resposta_ao_agente": false, '
        '"precisa_esclarecimento": true, "resposta_direta": null, '
        '"resposta_esclarecimento": "Olá! Quais seriam as suas dúvidas sobre a máquina? Me conte para que eu possa ajudar!", '
        '"id_agente_alvo": 1, "perguntas_extraidas": null, '
        '"lista_perguntas_extraidas": [], "precisa_rag": false, "chamada_ferramenta": null}'
    )
    mock_response.usage = MagicMock()
    mock_response.usage.prompt_tokens = 20
    mock_response.usage.completion_tokens = 10
    mock_response.usage.total_tokens = 30

    with patch("os.getenv", return_value="fake-key"):
        with patch("openai.AsyncOpenAI") as mock_openai:
            mock_client = MagicMock()
            mock_openai.return_value = mock_client
            mock_client.chat.completions.create = AsyncMock(return_value=mock_response)

            for msg in ["Sobre a máquina", "I have some doubts about the machine", "Tengo dudas sobre el equipo"]:
                result = await run_pre_router_ai(msg, history, mock_agent, [])
                assert result["precisa_esclarecimento"] is True, f"Falhou para {msg}"
                assert result["precisa_rag"] is False, f"Falhou para {msg}"
                assert result["resposta_esclarecimento"] is not None, f"Falhou para {msg}"

def test_answering_assistant_inviting_doubts_negation():
    """Valida que quando o assistente pergunta se há dúvidas, responder que não há
    é reconhecido como resposta ao assistente e não como uma nova dúvida."""
    history = [
        {"role": "assistant", "content": "Tudo bem? Vi que você não finalizou. Você tem alguma dúvida?"}
    ]
    
    assert is_user_answering_assistant_question("Não tenho dúvida", history) is True
    assert is_user_answering_assistant_question("Não tenho", history) is True
    assert is_user_answering_assistant_question("Nenhuma", history) is True
    assert is_user_answering_assistant_question("Sem dúvidas", history) is True
    assert is_user_answering_assistant_question("Não", history) is True

@pytest.mark.asyncio
async def test_shortcut_result_schema_completeness(mock_agent):
    """Valida que os atalhos programáticos contêm sempre todas as chaves obrigatórias."""
    # Testar declaração de compra
    res_purchase = check_programmatic_shortcuts(
        raw_user_message="Já comprei o curso ontem no pix",
        history=[],
        main_agent=mock_agent,
        is_first_msg=False,
        is_ad=False,
        similarity_info="",
        cleaned_message="Já comprei o curso ontem no pix",
        message="Já comprei o curso ontem no pix"
    )
    assert res_purchase is not None
    # Executar via run_pre_router_ai para validar os defaults injetados em runner.py
    full_res = await run_pre_router_ai("Já comprei o curso ontem no pix", [], mock_agent, [])
    for key in ["eh_saudacao", "eh_agradecimento", "eh_agradecimento_recorrente", "eh_mensagem_automatica", "eh_resposta_ao_agente", "precisa_esclarecimento", "precisa_rag", "lista_perguntas_extraidas"]:
        assert key in full_res, f"Chave {key} ausente no resultado do atalho"
