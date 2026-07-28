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

@pytest.mark.asyncio
async def test_pre_router_thanks_metadata():
    agent = DummyAgent()
    result = await run_pre_router_ai("obrigado", [], agent)
    assert result.get("eh_agradecimento") is True
    assert result.get("mensagem_original") == "obrigado"
    assert result.get("tipo_mensagem") == "Agradecimento (Atalho Programático)"

@pytest.mark.asyncio
async def test_pre_router_negative_emoji_metadata():
    agent = DummyAgent()
    result = await run_pre_router_ai("👎", [], agent)
    assert result.get("eh_emoji_negativo") is True
    assert result.get("mensagem_original") == "👎"
    assert "Emoji Negativo" in result.get("tipo_mensagem")
