import pytest
from unittest.mock import MagicMock, AsyncMock, patch
from agent_core.logic.pre_router import is_user_answering_assistant_question, run_pre_router_ai

def test_is_user_answering_assistant_question_qualification():
    """Valida que respostas a perguntas de qualificação e experiência do assistente são identificadas."""
    history = [
        {"role": "user", "content": "Como funciona o curso?"},
        {"role": "assistant", "content": "O curso é 100% online. Você possui mais alguma dúvida?"},
        {"role": "user", "content": "Não."},
        {"role": "assistant", "content": "Perfeito! Você já atua na área da estética ou está começando do zero? Qual é o seu objetivo com o curso?"}
    ]
    
    # Resposta de experiência e objetivo
    msg1 = "Sim já atuo, eu quero conseguir me qualificar para conseguir aumentar meu salário e atender mais clientes"
    assert is_user_answering_assistant_question(msg1, history) is True
    
    # Resposta começando do zero
    msg2 = "Começando do zero"
    assert is_user_answering_assistant_question(msg2, history) is True
    
    # Resposta afirmativa curta
    msg3 = "Já atuo sim"
    assert is_user_answering_assistant_question(msg3, history) is True
    
    # Pergunta real de dúvida do usuário NÃO deve ser considerada apenas resposta
    msg_duvida = "Quanto custa o curso?"
    assert is_user_answering_assistant_question(msg_duvida, history) is False

    msg_duvida2 = "Como funciona o parcelamento no cartão?"
    assert is_user_answering_assistant_question(msg_duvida2, history) is False


def test_is_user_answering_assistant_question_no_history():
    """Sem histórico, pergunta sobre valor é dúvida, declaração pessoal é tratada corretamente."""
    assert is_user_answering_assistant_question("Quanto custa?", []) is False
    assert is_user_answering_assistant_question("Sim já atuo há 2 anos na área", []) is True


@pytest.mark.asyncio
async def test_pre_router_qualification_response():
    """Valida que o Pre-Router não força precisa_rag=True quando o usuário está respondendo à pergunta de qualificação."""
    agent = MagicMock()
    agent.id = 1
    agent.name = "Agente Laser"
    agent.initial_message = "Olá!"
    agent.initial_ignore_message = None
    agent.greeting_mode = "panel"
    agent.ad_mode = "panel"
    agent.system_prompt = "Você é um assistente de vendas do Método Laser Day."
    agent.pre_router_prompt = None
    agent.knowledge_bases = []
    agent.knowledge_base_id = None
    agent.tools = []
    agent.tools_config = []

    history = [
        {"role": "user", "content": "Como funciona o curso?"},
        {"role": "assistant", "content": "O curso é 100% online. Você possui mais alguma dúvida?"},
        {"role": "user", "content": "Não."},
        {"role": "assistant", "content": "Perfeito! Você já atua na área da estética ou está começando do zero? Qual é o seu objetivo com o curso?"}
    ]

    msg = "Sim já atuo, eu quero conseguir me qualificar para conseguir aumentar meu salário e atender mais clientes"

    with patch("openai.AsyncOpenAI") as mock_openai_cls:
        mock_client = MagicMock()
        mock_resp = MagicMock()
        mock_resp.choices = [
            MagicMock(message=MagicMock(content='''{
                "eh_saudacao": false,
                "eh_agradecimento": false,
                "eh_agradecimento_recorrente": false,
                "eh_mensagem_automatica": false,
                "precisa_esclarecimento": false,
                "eh_anuncio": false,
                "resposta_direta": null,
                "resposta_esclarecimento": null,
                "id_agente_alvo": 1,
                "perguntas_extraidas": null,
                "lista_perguntas_extraidas": [],
                "data_extraida": null,
                "precisa_rag": false,
                "chamada_ferramenta": null
            }'''))
        ]
        mock_client.chat.completions.create = AsyncMock(return_value=mock_resp)
        mock_openai_cls.return_value = mock_client

        res = await run_pre_router_ai(msg, history, agent)

        assert res["precisa_rag"] is False
        assert res["eh_saudacao"] is False
        assert res["tipo_mensagem"] == "Resposta Conversacional / Qualificação do Usuário"
        assert res["lista_perguntas_extraidas"] == []
        assert res["resposta_direta"] is None


def test_is_user_answering_assistant_question_when_assistant_invites_doubts():
    """Valida que quando o assistente pergunta qual a dúvida do usuário, perguntas feitas sem '?' NÃO são tratadas como qualificação."""
    history = [
        {"role": "user", "content": "oie"},
        {"role": "assistant", "content": "oiee! Qual sua dúvida sobre o Método Laser Day?"}
    ]

    # Perguntas sem ponto de interrogação nunca devem ser tratadas como resposta de qualificação
    assert is_user_answering_assistant_question("quem é tarcira", history) is False
    assert is_user_answering_assistant_question("quem é a professora", history) is False
    assert is_user_answering_assistant_question("qual o valor do curso", history) is False
    assert is_user_answering_assistant_question("como funciona", history) is False
    assert is_user_answering_assistant_question("o que vou aprender", history) is False


def test_is_user_answering_assistant_question_interrogatives_without_question_mark():
    """Valida que termos interrogativos sem ponto de interrogação não são marcados como resposta conversacional."""
    assert is_user_answering_assistant_question("quem é tarcira", []) is False
    assert is_user_answering_assistant_question("quem é a dona do curso", []) is False
    assert is_user_answering_assistant_question("qual o valor", []) is False
    assert is_user_answering_assistant_question("onde fica a sede", []) is False
    assert is_user_answering_assistant_question("como posso me inscrever", []) is False


@pytest.mark.asyncio
async def test_pre_router_preserves_precisa_rag_for_quem_e_tarcira():
    """Valida que o Pre-Router preserva precisa_rag=True para 'quem é tarcira' e não sobrescreve para qualificação."""
    agent = MagicMock()
    agent.id = 36
    agent.name = "Agente Tarcira"
    agent.initial_message = "Olá!"
    agent.initial_ignore_message = None
    agent.greeting_mode = "panel"
    agent.ad_mode = "panel"
    agent.system_prompt = "Você é um assistente de vendas da Tarcira."
    agent.pre_router_prompt = None
    agent.knowledge_bases = []
    agent.knowledge_base_id = None
    agent.tools = []
    agent.tools_config = []

    history = [
        {"role": "user", "content": "oie"},
        {"role": "assistant", "content": "oiee! Qual sua dúvida sobre o Método Laser Day?"}
    ]

    msg = "quem é tarcira"

    with patch("openai.AsyncOpenAI") as mock_openai_cls:
        mock_client = MagicMock()
        mock_resp = MagicMock()
        mock_resp.choices = [
            MagicMock(message=MagicMock(content='''{
                "eh_saudacao": false,
                "eh_agradecimento": false,
                "eh_agradecimento_recorrente": false,
                "eh_mensagem_automatica": false,
                "precisa_esclarecimento": false,
                "eh_anuncio": false,
                "resposta_direta": null,
                "resposta_esclarecimento": null,
                "id_agente_alvo": 36,
                "perguntas_extraidas": "Quem é Tarcira?",
                "lista_perguntas_extraidas": ["Quem é a Tarcira?", "Quem é a professora do curso?"],
                "data_extraida": null,
                "precisa_rag": true,
                "chamada_ferramenta": null
            }'''))
        ]
        mock_client.chat.completions.create = AsyncMock(return_value=mock_resp)
        mock_openai_cls.return_value = mock_client

        res = await run_pre_router_ai(msg, history, agent)

        assert res["precisa_rag"] is True
        assert res["eh_saudacao"] is False
        assert "Quem é a Tarcira?" in res["lista_perguntas_extraidas"]
        assert res["tipo_mensagem"] != "Resposta Conversacional / Qualificação do Usuário"


def test_is_user_accepting_assistant_offer_link():
    """Valida se respostas afirmativas a ofertas de link são identificadas corretamente."""
    from agent_core.logic.pre_router import is_user_accepting_assistant_offer

    history = [
        {"role": "user", "content": "Bom dia, posso ver também as previsões da minha mulher?"},
        {"role": "assistant", "content": "Sim! O curso ensina as 12 Portas. Fez sentido? Quer que eu te mande o link de inscrição? 😊"}
    ]

    # Variações comuns de aceite de link
    for positive_msg in ["pode enviar", "pode mandar", "manda", "envia", "sim", "quero", "claro", "por favor", "manda o link", "pode mandar o link"]:
        is_acc, topic = is_user_accepting_assistant_offer(positive_msg, history)
        assert is_acc is True, f"Falhou para '{positive_msg}'"
        assert topic == "link"

        # Garante que is_user_answering_assistant_question NÃO considera isso qualificação passiva sem RAG
        assert is_user_answering_assistant_question(positive_msg, history) is False, f"Não deveria ser resposta passiva para '{positive_msg}'"


@pytest.mark.asyncio
async def test_enrich_user_message_on_link_offer():
    """Valida que mensagens curtas de aceite de link são enriquecidas com o termo de busca do link."""
    from agent_core.logic.pre_router import enrich_user_message

    history = [
        {"role": "user", "content": "Bom dia, como funciona?"},
        {"role": "assistant", "content": "O treinamento é 100% online. Fez sentido? Quer que eu te mande o link de inscrição? 😊"}
    ]

    mock_client = MagicMock()
    mock_resp = MagicMock()
    mock_resp.choices = [
        MagicMock(message=MagicMock(content='''{
            "quer_link": true,
            "motivo": "Usuário aceitou a oferta do link",
            "outra_duvida": null
        }'''))
    ]
    mock_resp.usage = MagicMock(prompt_tokens=40, completion_tokens=10, total_tokens=50)
    mock_client.chat.completions.create = AsyncMock(return_value=mock_resp)

    enriched = await enrich_user_message("pode enviar", history, mock_client)
    assert "link" in enriched.lower()


@pytest.mark.asyncio
async def test_pre_router_activates_rag_for_link_offer_acceptance():
    """Valida que quando o usuário aceita a oferta de link ('pode enviar'), o Pre-Router ativa o RAG e busca o link."""
    agent = MagicMock()
    agent.id = 203
    agent.name = "Agente - Crassus"
    agent.initial_message = "Olá!"
    agent.initial_ignore_message = None
    agent.greeting_mode = "panel"
    agent.ad_mode = "panel"
    agent.system_prompt = "Você é o Assistente do treinamento online Bússola Astrológica."
    agent.pre_router_prompt = None
    agent.knowledge_bases = []
    agent.knowledge_base_id = None
    agent.tools = []
    agent.tools_config = []

    history = [
        {"role": "user", "content": "Bom dia, quanto custa?"},
        {"role": "assistant", "content": "Valor R$67. Fez sentido? Quer que eu te mande o link de inscrição? 😊"}
    ]

    msg = "pode enviar"

    with patch("openai.AsyncOpenAI") as mock_openai_cls:
        mock_client = MagicMock()
        mock_resp = MagicMock()
        mock_resp.choices = [
            MagicMock(message=MagicMock(content='''{
                "quer_link": true,
                "motivo": "Usuário aceitou o link do curso",
                "outra_duvida": null
            }'''))
        ]
        mock_resp.usage = MagicMock(prompt_tokens=40, completion_tokens=12, total_tokens=52)
        mock_client.chat.completions.create = AsyncMock(return_value=mock_resp)
        mock_openai_cls.return_value = mock_client

        res = await run_pre_router_ai(msg, history, agent)

        assert res["precisa_rag"] is True
        assert res["eh_saudacao"] is False
        assert any("link" in p.lower() for p in res["lista_perguntas_extraidas"])
        assert "link" in str(res["perguntas_extraidas"]).lower()
        assert res["tipo_mensagem"] == "Solicitação de Link do Curso (Detectado 100% por LLM)"


@pytest.mark.asyncio
async def test_analyze_link_intent_with_llm_direct():
    """Valida que analyze_link_intent_with_llm envia para o gpt-4o-mini e processa o JSON corretamente."""
    from agent_core.logic.pre_router.link_intent_ai import analyze_link_intent_with_llm

    history = [
        {"role": "user", "content": "Bom dia, quanto custa?"},
        {"role": "assistant", "content": "Valor R$67. Quer que eu te envie o link do curso? 😊"}
    ]

    mock_client = MagicMock()
    mock_resp = MagicMock()
    mock_resp.choices = [
        MagicMock(message=MagicMock(content='''{
            "quer_link": true,
            "motivo": "Usuário confirmou que quer o link do curso",
            "outra_duvida": null
        }'''))
    ]
    mock_resp.usage = MagicMock(prompt_tokens=45, completion_tokens=15, total_tokens=60)
    mock_client.chat.completions.create = AsyncMock(return_value=mock_resp)

    res = await analyze_link_intent_with_llm("sim pode enviar o link", history, client=mock_client)
    assert res["quer_link"] is True
    assert res["_usage"]["total_tokens"] == 60
    assert res["_model_used"] == "gpt-4o-mini"


