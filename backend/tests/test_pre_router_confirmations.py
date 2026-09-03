import pytest
from unittest.mock import MagicMock, AsyncMock
from agent_core.logic.pre_router import run_pre_router_ai, enrich_user_message

@pytest.fixture
def mock_agent():
    agent = MagicMock()
    agent.id = 1
    agent.name = "Agente Vendas"
    agent.initial_message = "Olá! Como posso te ajudar?"
    agent.initial_ignore_message = None
    agent.greeting_mode = "panel"
    agent.ad_mode = "panel"
    agent.system_prompt = "Você é um vendedor atencioso."
    agent.pre_router_prompt = None
    agent.knowledge_bases = []
    agent.knowledge_base_id = None
    agent.tools = []
    agent.tools_config = []
    return agent

@pytest.mark.asyncio
async def test_pre_router_handles_ta_bom_confirmation(mock_agent):
    """Valida que mensagens de encerramento/confirmação como 'Ta bom' são interceptadas
    com resposta amigável e sem acionar RAG nem reenviar links."""
    history = [
        {"role": "user", "content": "Mas posso fazer o pagamento no dia 30"},
        {"role": "assistant", "content": "Sim! Aqui está o link de pagamento do Método Laser Day: https://pay.kiwify.com.br/VVme7C2"}
    ]
    
    for term in ["Ta bom", "Tá bom", "ta bem", "tá bem", "tudo bem", "Beleza", "Ótimo", "Maravilha", "Combinado", "Ok"]:
        result = await run_pre_router_ai(term, history, mock_agent)
        
        assert result["eh_saudacao"] is True, f"Falhou para termo: {term}"
        assert result["precisa_rag"] is False, f"Falhou para termo: {term}"
        assert result["perguntas_extraidas"] is None, f"Falhou para termo: {term}"
        assert result["resposta_direta"] is not None, f"Falhou para termo: {term}"
        assert "http" not in result["resposta_direta"].lower(), f"Não deve conter link para: {term}"
        assert "kiwify" not in result["resposta_direta"].lower(), f"Não deve conter link para: {term}"

@pytest.mark.asyncio
async def test_enrich_user_message_bypasses_passive_confirmations(mock_agent):
    """Valida que 'Ta bom', 'Ok', 'Entendi' e variações não são enriquecidos com ofertas de link/pagamento."""
    history = [
        {"role": "user", "content": "Posso pagar dia 30?"},
        {"role": "assistant", "content": "Sim! Aqui está o link de pagamento do Método Laser Day e formas de pagamento: https://pay.kiwify.com.br/VVme7C2"}
    ]
    mock_client = MagicMock()
    mock_client.chat.completions.create = AsyncMock()

    for term in ["Ta bom", "Tá bom", "Ta bem", "Ok", "Entendi", "Beleza", "Certo", "Ótimo", "Maravilha"]:
        enriched = await enrich_user_message(term, history, mock_client)
        assert enriched == term, f"Termo {term} não deveria ter sido reescrito para {enriched}"
        
    # O cliente LLM sequer deve ser chamado para confirmações passivas
    assert not mock_client.chat.completions.create.called

    result = await run_pre_router_ai("👍", history, mock_agent)
    assert result["eh_saudacao"] is True
    assert result["resposta_direta"] is not None
    assert "Se precisar de mais alguma coisa" in result["resposta_direta"]


@pytest.mark.asyncio
async def test_pre_router_handles_user_email_response(mock_agent):
    """Valida que quando o usuário envia seu e-mail como resposta a 'Qual seu e-mail?', o Pre-Router preserva o e-mail, NÃO aciona RAG e NÃO reescreve como pergunta."""
    history = [
        {"role": "user", "content": "Me chamo Aryaraj"},
        {"role": "assistant", "content": "Perfeito, Aryaraj! Qual é o seu e-mail?"}
    ]
    email_msg = "aryarajunity@gmail.com"

    result = await run_pre_router_ai(email_msg, history, mock_agent)

    assert result["eh_saudacao"] is False
    assert result["precisa_rag"] is False
    assert result["perguntas_extraidas"] == email_msg
    assert result.get("tipo_mensagem") == "Resposta de Dados / E-mail do Usuário"

    # Testar enriquecimento
    mock_client = MagicMock()
    mock_client.chat.completions.create = AsyncMock()
    enriched = await enrich_user_message(email_msg, history, mock_client)
    assert enriched == email_msg
    assert not mock_client.chat.completions.create.called

    assert result["resposta_direta"] is None

@pytest.mark.asyncio
async def test_pre_router_silences_recurrent_closing_after_ta_bom(mock_agent):
    """Valida que um segundo encerramento após o assistente já ter se despedido silencia a automação."""
    history = [
        {"role": "user", "content": "Ta bom"},
        {"role": "assistant", "content": "Combinado! Se precisar de qualquer ajuda, estou por aqui. 😊"}
    ]
    
    result = await run_pre_router_ai("Obrigada", history, mock_agent)
    assert result["eh_saudacao"] is True
    assert result["eh_agradecimento_recorrente"] is True
    assert result["resposta_direta"] is None


@pytest.mark.asyncio
async def test_pre_router_handles_nao_after_doubt_question(mock_agent):
    """Valida que quando o usuário responde 'Não.' para 'Você possui mais alguma dúvida?', o Pre-Router intercepta com encerramento amigável, NÃO aciona RAG e NÃO reescreve como 'Como funciona o curso?'."""
    history = [
        {"role": "user", "content": "Como funciona o curso?"},
        {"role": "assistant", "content": "O curso é 100% online...\n\nVocê possui mais alguma  dúvida sobre o Método Laser Day?"}
    ]
    user_msg = "Não."

    result = await run_pre_router_ai(user_msg, history, mock_agent)

    assert result["eh_saudacao"] is True
    assert result["eh_agradecimento"] is True
    assert result["precisa_rag"] is False
    assert result["perguntas_extraidas"] is None
    assert result["resposta_direta"] is not None
    assert "disposição" in result["resposta_direta"] or "precisar" in result["resposta_direta"]

    # Testar que o enriquecimento não reescreve "Não." para "Como funciona o curso?"
    mock_client = MagicMock()
    mock_client.chat.completions.create = AsyncMock()
    enriched = await enrich_user_message(user_msg, history, mock_client)
    assert enriched == user_msg
    assert not mock_client.chat.completions.create.called


@pytest.mark.asyncio
async def test_pre_router_handles_nao_for_qualification_question(mock_agent):
    """Valida que quando o usuário responde 'Não' a uma pergunta de qualificação ('Você já trabalha na área?'),
    o Pre-Router mantém a resposta 'Não', NÃO aciona RAG e NÃO transforma em pergunta de curso."""
    history = [
        {"role": "user", "content": "Como funciona o curso?"},
        {"role": "assistant", "content": "O curso é 100% online...\n\nVocê já trabalha na área ou está começando do zero?"}
    ]
    for nao_term in ["Não", "nao", "Não.", "Ainda não", "Nenhuma", "Não trabalho na área"]:
        result = await run_pre_router_ai(nao_term, history, mock_agent)
        assert result["precisa_rag"] is False, f"Falhou para termo: {nao_term}"
        assert result["perguntas_extraidas"] == nao_term, f"Falhou para termo: {nao_term}"
        assert result["lista_perguntas_extraidas"] == [], f"Falhou para termo: {nao_term}"
        assert result["tipo_mensagem"] == "Resposta Conversacional / Qualificação do Usuário", f"Falhou para termo: {nao_term}"
        assert result["resposta_direta"] is None, f"Falhou para termo: {nao_term}"


