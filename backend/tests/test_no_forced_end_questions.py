import pytest
from unittest.mock import AsyncMock, patch
from agent_core.core import process_message
from config_store import AgentConfig

@pytest.mark.asyncio
async def test_agent_does_not_append_forced_questions_at_end():
    """Valida se o prompt do sistema proíbe o agente de acrescentar perguntas de engajamento não solicitadas."""
    config = AgentConfig(
        id=99,
        name="Agente Direto",
        system_prompt="Você é um assistente do Método Laser Day.",
        model="gpt-4o-mini"
    )

    mock_db = AsyncMock()
    pre_router_mock = {"precisa_rag": False}

    with patch("agent_core.core.run_pre_router_ai", return_value=pre_router_mock):
        result = await process_message("Já faço laser e fiz 2 cursos online.", [], config, [], {}, db=mock_db)
        
        content = result.get("content", "")
        # Confirm that strict rule 6 is present in the resolved prompt
        resolved_prompt = result.get("debug", {}).get("resolved_prompt", "")
        assert "PROIBIÇÃO DE FAZER PERGUNTAS NÃO SOLICITADAS NO FINAL DAS RESPOSTAS" in resolved_prompt
