import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from agent_core.logic.pre_router import run_pre_router_ai

class DummyAgent:
    def __init__(self):
        self.id = 1
        self.name = "Agente Teste"
        self.initial_message = "Olá! Como posso ajudar?"
        self.greeting_mode = "panel"
        self.ad_mode = "panel"
        self.initial_ignore_message = None
        self.pre_router_prompt = None

@pytest.mark.asyncio
async def test_pre_router_greeting_metadata():
    agent = DummyAgent()
    result = await run_pre_router_ai("oie", [], agent)
    assert result.get("eh_saudacao") is True
    assert result.get("mensagem_original") == "oie"
    assert result.get("tipo_mensagem") == "Saudação (Atalho Programático)"
    assert result.get("precisa_rag") is False
    assert result.get("lista_perguntas_extraidas") == []

@pytest.mark.asyncio
async def test_pre_router_thanks_metadata():
    agent = DummyAgent()
    result = await run_pre_router_ai("obrigado", [], agent)
    assert result.get("eh_agradecimento") is True
    assert result.get("mensagem_original") == "obrigado"
    assert result.get("tipo_mensagem") == "Agradecimento (Atalho Programático)"
    assert result.get("precisa_rag") is False
    assert result.get("lista_perguntas_extraidas") == []

@pytest.mark.asyncio
async def test_pre_router_negative_emoji_metadata():
    agent = DummyAgent()
    result = await run_pre_router_ai("👎", [], agent)
    assert result.get("eh_emoji_negativo") is True
    assert result.get("mensagem_original") == "👎"
    assert "Emoji Negativo" in result.get("tipo_mensagem")
    assert result.get("precisa_rag") is False
    assert result.get("lista_perguntas_extraidas") == []

@pytest.mark.asyncio
async def test_pre_router_all_shortcuts_have_precisa_rag_false():
    agent = DummyAgent()
    
    shortcut_messages = [
        "olá", "oi", "bom dia", "boa tarde", "boa noite",
        "valeu", "obrigado!", "muito obrigado",
        "ok", "combinado", "perfeito", "beleza",
        "já comprei o curso", "meu email é teste@gmail.com",
        "tenho uma dúvida sobre o curso"
    ]
    
    for msg in shortcut_messages:
        result = await run_pre_router_ai(msg, [], agent)
        if result and result.get("_model_used") == "shortcut-logic":
            assert result.get("precisa_rag") is False, f"Atalho para '{msg}' deve ter precisa_rag == False"
            assert result.get("lista_perguntas_extraidas") == [], f"Atalho para '{msg}' deve ter lista_perguntas_extraidas vazia"

@pytest.mark.asyncio
async def test_pre_router_understood_no_more_doubts_not_vague():
    agent = DummyAgent()
    
    closing_messages = [
        "Entendi perfeitamente e não tenho mais duvidas",
        "Entendi tudo, não tenho mais dúvidas",
        "Tudo claro, sem dúvidas",
        "Perfeito, não tenho mais dúvidas",
        "Não tenho mais dúvidas",
        "sem mais dúvidas por enquanto",
        "Não tenho nenhuma dúvida, obrigado"
    ]
    
    for msg in closing_messages:
        result = await run_pre_router_ai(msg, [], agent)
        assert result is not None, f"Mensagem '{msg}' deve retornar resultado"
        # NUNCA deve ser classificado como tópico vago / esclarecimento
        assert result.get("precisa_esclarecimento") is not True, f"'{msg}' não deve ser pedido de esclarecimento/tópico vago"
        assert "Tópico Vago" not in result.get("tipo_mensagem", ""), f"'{msg}' não deve ter tipo_mensagem de Tópico Vago"
        # Deve ser tratado como encerramento / atalho
        assert result.get("tipo_mensagem") == "Encerramento / Sem Mais Dúvidas (Atalho Programático)" or result.get("eh_agradecimento") is True
        assert result.get("precisa_rag") is False
        assert result.get("resposta_direta") is not None


