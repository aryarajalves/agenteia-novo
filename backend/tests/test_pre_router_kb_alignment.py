import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from agent_core.logic.pre_router import _get_kb_reference_context, run_pre_router_ai

@pytest.mark.asyncio
async def test_get_kb_reference_context_sql_catalog():
    mock_agent = MagicMock()
    mock_agent.id = 1
    mock_agent.knowledge_base_id = 10
    mock_agent.knowledge_bases = []
    mock_agent.model = "gpt-4o-mini"

    mock_db = AsyncMock()

    mock_agent_scalars = MagicMock()
    mock_agent_scalars.first.return_value = mock_agent

    mock_questions_scalars = MagicMock()
    mock_questions_scalars.all.return_value = [
        "Qual a duração do curso e quando posso começar os atendimentos presenciais?",
        "Qual o valor dos materiais do curso?",
        "Como funciona a mentoria individual?"
    ]

    def mock_execute_side_effect(stmt):
        res = MagicMock()
        if "agent_configs" in str(stmt).lower():
            res.scalars.return_value = mock_agent_scalars
        else:
            res.scalars.return_value = mock_questions_scalars
        return res

    mock_db.execute.side_effect = mock_execute_side_effect

    ctx, info = await _get_kb_reference_context(mock_agent, "Em quanto tempo estou pronta pra atender?", async_db=mock_db)

    assert "REFERÊNCIA DE CATÁLOGO PARA ALINHAMENTO" in ctx
    assert "Qual a duração do curso" in ctx
    assert info["fase"] == "Catálogo de Referência (Pré-Router)"


@pytest.mark.asyncio
async def test_pre_router_disables_ambiguity_when_question_extracted():
    mock_agent = MagicMock()
    mock_agent.id = 1
    mock_agent.name = "Agente Teste"
    mock_agent.knowledge_base_id = None
    mock_agent.knowledge_bases = []
    mock_agent.model = "gpt-4o-mini"
    mock_agent.system_prompt = "Instruções do agente"
    mock_agent.greeting_mode = "panel"
    mock_agent.ad_mode = "panel"
    mock_agent.qualification_questions = None
    mock_agent.initial_ignore_message = None
    mock_agent.initial_msg = "Olá!"
    mock_agent.tools = []
    mock_agent.tool_prompts = {}
    mock_agent.date_awareness = False
    mock_agent.handoff_enabled = False
    mock_agent.context_window = 5

    # Simula resposta do LLM que incorretamente veio com precisa_esclarecimento=True apesar de extrair a pergunta
    mock_llm_json = '{"eh_saudacao": false, "eh_agradecimento": false, "eh_mensagem_automatica": false, "precisa_esclarecimento": true, "resposta_esclarecimento": "Voce enviou uma descricao...", "id_agente_alvo": 1, "perguntas_extraidas": "É curso on-line? como funciona ele?", "lista_perguntas_extraidas": ["É curso on-line? como funciona ele?"], "precisa_rag": true, "chamada_ferramenta": null}'

    mock_choice = MagicMock()
    mock_choice.message.content = mock_llm_json
    mock_response = MagicMock()
    mock_response.choices = [mock_choice]

    with patch("openai.AsyncOpenAI") as mock_openai:
        mock_client = AsyncMock()
        mock_client.chat.completions.create = AsyncMock(return_value=mock_response)
        mock_openai.return_value = mock_client

        with patch("os.getenv", return_value="fake-api-key"):
            res = await run_pre_router_ai("É curso on-line? como funciona ele?", [], mock_agent, [])
            
            assert res["precisa_esclarecimento"] is False
            assert res["resposta_esclarecimento"] is None
            assert res["perguntas_extraidas"] == "É curso on-line?\ncomo funciona ele?"
            assert res["lista_perguntas_extraidas"] == ["É curso on-line?", "como funciona ele?"]
            assert res["precisa_rag"] is True


@pytest.mark.asyncio
async def test_pre_router_splits_multiple_questions_into_list():
    mock_agent = MagicMock()
    mock_agent.id = 1
    mock_agent.name = "Agente Teste"
    mock_agent.knowledge_base_id = None
    mock_agent.knowledge_bases = []
    mock_agent.model = "gpt-4o-mini"
    mock_agent.system_prompt = "Instruções do agente"
    mock_agent.greeting_mode = "panel"
    mock_agent.ad_mode = "panel"
    mock_agent.qualification_questions = None
    mock_agent.initial_ignore_message = None
    mock_agent.initial_msg = "Olá!"
    mock_agent.tools = []
    mock_agent.tool_prompts = {}
    mock_agent.date_awareness = False
    mock_agent.handoff_enabled = False
    mock_agent.context_window = 5

    # Simula resposta do LLM onde a lista veio junta em um unico elemento
    mock_llm_json = '{"eh_saudacao": false, "eh_agradecimento": false, "eh_mensagem_automatica": false, "precisa_esclarecimento": false, "resposta_esclarecimento": null, "id_agente_alvo": 1, "perguntas_extraidas": "Quanto custa o curso? Tem certificado?", "lista_perguntas_extraidas": ["Quanto custa o curso? Tem certificado?"], "precisa_rag": true, "chamada_ferramenta": null}'

    mock_choice = MagicMock()
    mock_choice.message.content = mock_llm_json
    mock_response = MagicMock()
    mock_response.choices = [mock_choice]

    with patch("openai.AsyncOpenAI") as mock_openai:
        mock_client = AsyncMock()
        mock_client.chat.completions.create = AsyncMock(return_value=mock_response)
        mock_openai.return_value = mock_client

        with patch("os.getenv", return_value="fake-api-key"):
            res = await run_pre_router_ai("Quanto custa o curso? Tem certificado?", [], mock_agent, [])
            
            assert res["lista_perguntas_extraidas"] == ["Quanto custa o curso?", "Tem certificado?"]


@pytest.mark.asyncio
async def test_pre_router_retains_como_funciona_when_omitted():
    mock_agent = MagicMock()
    mock_agent.id = 1
    mock_agent.name = "Agente Teste"
    mock_agent.knowledge_base_id = None
    mock_agent.knowledge_bases = []
    mock_agent.model = "gpt-4o-mini"
    mock_agent.system_prompt = "Instruções do agente"
    mock_agent.greeting_mode = "panel"
    mock_agent.ad_mode = "panel"
    mock_agent.qualification_questions = None
    mock_agent.initial_ignore_message = None
    mock_agent.initial_msg = "Olá!"
    mock_agent.tools = []
    mock_agent.tool_prompts = {}
    mock_agent.date_awareness = False
    mock_agent.handoff_enabled = False
    mock_agent.context_window = 5

    # Simula resposta do LLM omitindo 'como funciona' ao focar apenas no valor dos equipamentos
    mock_llm_json = '{"eh_saudacao": false, "eh_agradecimento": false, "eh_mensagem_automatica": false, "precisa_esclarecimento": false, "resposta_esclarecimento": null, "id_agente_alvo": 1, "perguntas_extraidas": "Qual o valor dos equipamentos?", "lista_perguntas_extraidas": ["Qual o valor dos equipamentos?"], "precisa_rag": true, "chamada_ferramenta": null}'

    mock_choice = MagicMock()
    mock_choice.message.content = mock_llm_json
    mock_response = MagicMock()
    mock_response.choices = [mock_choice]

    with patch("openai.AsyncOpenAI") as mock_openai:
        mock_client = AsyncMock()
        mock_client.chat.completions.create = AsyncMock(return_value=mock_response)
        mock_openai.return_value = mock_client

        with patch("os.getenv", return_value="fake-api-key"):
            res = await run_pre_router_ai("como funciona, quanto custa os equipamentos?", [], mock_agent, [])
            
            assert res["lista_perguntas_extraidas"] == ["Como funciona o curso?", "Qual o valor dos equipamentos?"]



