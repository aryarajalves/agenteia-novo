import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from agent_core.logic.pre_router import run_pre_router_ai
from config_store import AgentConfig

@pytest.fixture
def mock_config():
    return AgentConfig(
        id=1,
        name="Test Agent",
        system_prompt="You are a test agent.",
        model="gpt-4o-mini",
        router_enabled=True,
        date_awareness=False,
        handoff_enabled=False,
        context_window=3
    )

@pytest.mark.asyncio
async def test_pre_router_formats_mensagens_origem_memorias_respecting_context_window(mock_config):
    history = [
        {"role": "user", "content": "msg 1"},
        {"role": "assistant", "content": "resp 1"},
        {"role": "user", "content": "msg 2"},
        {"role": "assistant", "content": "resp 2"},
        {"role": "user", "content": "msg 3"},
        {"role": "assistant", "content": "resp 3"},
        {"role": "user", "content": "msg 4"},
        {"role": "assistant", "content": "resp 4"}
    ]
    
    mock_llm_json = '{"eh_saudacao": false, "eh_agradecimento": false, "eh_mensagem_automatica": false, "precisa_esclarecimento": false, "resposta_esclarecimento": null, "id_agente_alvo": 1, "perguntas_extraidas": "msg 5", "lista_perguntas_extraidas": ["msg 5"], "precisa_rag": true, "chamada_ferramenta": null}'
    mock_choice = MagicMock()
    mock_choice.message.content = mock_llm_json
    mock_response = MagicMock()
    mock_response.choices = [mock_choice]
    mock_response.usage = None

    with patch("openai.AsyncOpenAI") as mock_openai:
        mock_client = AsyncMock()
        mock_client.chat.completions.create = AsyncMock(return_value=mock_response)
        mock_openai.return_value = mock_client

        with patch("os.getenv", return_value="fake-api-key"):
            res = await run_pre_router_ai("msg 5", history, mock_config, [])
            
            # Deve respeitar context_window=3 (máximo 3 do usuário e 3 do assistente mais recentes)
            memorias = res.get("mensagens_origem_memorias", [])
            assert len(memorias) == 6
            assert "Usuário: msg 2" in memorias[0]
            assert "Agente: resp 2" in memorias[1]
            assert "Usuário: msg 3" in memorias[2]
            assert "Agente: resp 3" in memorias[3]
            assert "Usuário: msg 4" in memorias[4]
            assert "Agente: resp 4" in memorias[5]
