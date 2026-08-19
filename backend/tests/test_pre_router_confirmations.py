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
async def test_enrich_user_message_bypasses_passive_confirmations():
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
