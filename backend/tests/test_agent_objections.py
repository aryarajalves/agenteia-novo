import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from agent_core.core import process_message
from config_store import AgentConfig

@pytest.mark.asyncio
async def test_agent_does_not_trigger_unanswered_tool_on_objections():
    """Valida se mensagens com medos/objeções de clientes NÃO acionam registrar_duvida_sem_resposta."""
    config = AgentConfig(
        id=177,
        name="Agente Teste",
        system_prompt="Você é um assistente de vendas do Método Laser Day. Explique o protocolo completo de remoção de tatuagem com parâmetros ajustados.",
        model="gpt-4o-mini",
        router_enabled=False
    )

    mock_db = AsyncMock()

    # Pre-router mock returning normal flow
    pre_router_mock = {
        "eh_saudacao": False,
        "eh_agradecimento": False,
        "tipo_mensagem": "Objeção / Relato de Cliente",
        "precisa_rag": False,
        "precisa_ferramenta": False,
        "chamada_ferramenta": None
    }

    with patch("agent_core.core.run_pre_router_ai", return_value=pre_router_mock):
        message = "Já faço laser fiz 2 cursos on line mas tenho dificuldade em remover tatuagem e medo de comprar outro curso e não resolver."
        result = await process_message(message, [], config, [], {}, db=mock_db)

        # Confirm response generated
        assert result.get("content") is not None
        # Confirm registrar_duvida_sem_resposta was not executed
        performed_tools = result.get("tool_calls", [])
        tool_names = [t.get("name") for t in performed_tools] if performed_tools else []
        assert "registrar_duvida_sem_resposta" not in tool_names
