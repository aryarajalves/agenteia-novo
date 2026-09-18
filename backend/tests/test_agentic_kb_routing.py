import os
import sys
import pytest
from unittest.mock import MagicMock, patch, AsyncMock
from sqlalchemy.ext.asyncio import AsyncSession

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from services.rag.router import route_knowledge_bases
from agent_core.memory import extract_target_variable_early
from models import GlobalContextVariableModel, UserMemoryModel, KnowledgeBaseModel, AgentConfigModel

@pytest.mark.asyncio
async def test_route_knowledge_bases_single_kb():
    """Quando há apenas 1 base vinculada, retorna diretamente essa base sem chamada externa."""
    available_kbs = [{"id": 10, "name": "Base Única", "description": "Base Geral"}]
    res = await route_knowledge_bases(
        query="como funciona?",
        available_kbs=available_kbs,
        context_variables={}
    )
    assert res["selected_kb_ids"] == [10]
    assert res["is_ambiguous"] is False
    assert res["matched_kb_name"] == "Base Única"

@pytest.mark.asyncio
async def test_route_knowledge_bases_empty():
    """Quando não há bases vinculadas, retorna lista vazia de forma segura."""
    res = await route_knowledge_bases(query="olá", available_kbs=[])
    assert res["selected_kb_ids"] == []

@pytest.mark.asyncio
async def test_route_knowledge_bases_heuristic_matching():
    """Valida que quando a variável de contexto contém o nome do curso, a correspondência heurística seleciona a base certa."""
    available_kbs = [
        {"id": 1, "name": "Base - Curso de Tráfego Pago", "description": "Módulos e aulas sobre anúncios e tráfego pago"},
        {"id": 2, "name": "Base - Curso de Copywriting", "description": "Módulos sobre escrita persuasiva e vendas"},
        {"id": 3, "name": "Base - Mentoria 10x", "description": "Acompanhamento individual e grupo VIP"}
    ]
    context_variables = {"curso_interesse": "Curso de Tráfego Pago"}

    res = await route_knowledge_bases(
        query="como funciona o curso?",
        available_kbs=available_kbs,
        context_variables=context_variables,
        routing_var_name="curso_interesse"
    )

    assert res["selected_kb_ids"] == [1]
    assert res["is_ambiguous"] is False
    assert res["matched_kb_name"] == "Base - Curso de Tráfego Pago"
    assert "Curso de Tráfego Pago" in res["extracted_product"]

@pytest.mark.asyncio
async def test_route_knowledge_bases_llm_matching():
    """Valida a seleção inteligente via LLM quando necessário."""
    available_kbs = [
        {"id": 1, "name": "Base - Curso de Tráfego Pago", "description": "Módulos e aulas sobre anúncios"},
        {"id": 2, "name": "Base - Curso de Copywriting", "description": "Aulas de persuasão e copywriting"},
    ]
    context_variables = {}

    mock_client = MagicMock()
    mock_choice = MagicMock()
    mock_choice.message.content = '{"selected_kb_ids": [2], "extracted_product": "Curso de Copywriting", "is_ambiguous": false, "reason": "Cliente perguntou sobre copy", "matched_kb_name": "Base - Curso de Copywriting"}'
    mock_resp = MagicMock()
    mock_resp.choices = [mock_choice]
    mock_client.chat.completions.create = AsyncMock(return_value=mock_resp)

    res = await route_knowledge_bases(
        query="qual é a garantia do curso de copy?",
        available_kbs=available_kbs,
        context_variables=context_variables,
        client=mock_client
    )

    assert res["selected_kb_ids"] == [2]
    assert res["is_ambiguous"] is False
    assert res["extracted_product"] == "Curso de Copywriting"

@pytest.mark.asyncio
async def test_route_knowledge_bases_ambiguity_detected():
    """Valida detecção de ambiguidade quando o usuário não especifica o curso e a dúvida é genérica."""
    available_kbs = [
        {"id": 1, "name": "Base - Curso de Tráfego", "description": "Módulos do curso de tráfego"},
        {"id": 2, "name": "Base - Curso de Copywriting", "description": "Módulos do curso de copy"}
    ]
    context_variables = {}

    mock_client = MagicMock()
    mock_choice = MagicMock()
    mock_choice.message.content = '{"selected_kb_ids": [1, 2], "extracted_product": null, "is_ambiguous": true, "reason": "Dúvida genérica sem produto informado", "matched_kb_name": null}'
    mock_resp = MagicMock()
    mock_resp.choices = [mock_choice]
    mock_client.chat.completions.create = AsyncMock(return_value=mock_resp)

    res = await route_knowledge_bases(
        query="como funciona?",
        available_kbs=available_kbs,
        context_variables=context_variables,
        client=mock_client
    )

    assert res["is_ambiguous"] is True
    assert set(res["selected_kb_ids"]) == {1, 2}

@pytest.mark.asyncio
@patch("agent_core.memory.get_openai_client")
async def test_extract_target_variable_early(mock_get_client):
    """Valida que extract_target_variable_early extrai o curso mencionado na mensagem e o salva na memória."""
    db = AsyncMock(spec=AsyncSession)

    var_model = GlobalContextVariableModel(
        key="curso_interesse",
        type="string",
        extraction_method="ai",
        extraction_prompt="Identifique o curso mencionado"
    )

    # Simular select de variável e memória
    mock_res_var = MagicMock()
    mock_res_var.scalars.return_value.first.return_value = var_model

    mock_res_mem = MagicMock()
    mock_res_mem.scalars.return_value.first.return_value = None

    calls = []
    def execute_side_effect(stmt):
        calls.append(stmt)
        if len(calls) == 1:
            return mock_res_var
        return mock_res_mem
    db.execute.side_effect = execute_side_effect

    mock_client = MagicMock()
    mock_choice = MagicMock()
    mock_choice.message.content = '{"valor": "Curso de Tráfego Pago"}'
    mock_resp = MagicMock()
    mock_resp.choices = [mock_choice]
    mock_client.chat.completions.create = AsyncMock(return_value=mock_resp)
    mock_get_client.return_value = mock_client

    on_step_mock = MagicMock()

    key, val = await extract_target_variable_early(
        db=db,
        session_id="sess_123",
        message="Olá, tenho interesse no Curso de Tráfego Pago",
        target_key="curso_interesse",
        on_step=on_step_mock
    )

    assert key == "curso_interesse"
    assert val == "Curso de Tráfego Pago"
    assert db.add.called
    added = db.add.call_args[0][0]
    assert isinstance(added, UserMemoryModel)
    assert added.key == "curso_interesse"
    assert added.value == "Curso de Tráfego Pago"
    assert on_step_mock.called

@pytest.mark.asyncio
@patch("agent_core.memory.get_openai_client")
async def test_extract_target_variable_early_already_in_memory(mock_get_client):
    """Valida que se o curso já estiver na memória, retorna diretamente sem chamar a LLM."""
    db = AsyncMock(spec=AsyncSession)

    var_model = GlobalContextVariableModel(
        key="curso_interesse",
        type="string",
        extraction_method="ai"
    )
    existing_mem = UserMemoryModel(session_id="sess_123", key="curso_interesse", value="Curso de Copywriting")

    mock_res_var = MagicMock()
    mock_res_var.scalars.return_value.first.return_value = var_model

    mock_res_mem = MagicMock()
    mock_res_mem.scalars.return_value.first.return_value = existing_mem

    calls = []
    def execute_side_effect(stmt):
        calls.append(stmt)
        if len(calls) == 1:
            return mock_res_var
        return mock_res_mem
    db.execute.side_effect = execute_side_effect

    key, val = await extract_target_variable_early(
        db=db,
        session_id="sess_123",
        message="como funciona?",
        target_key="curso_interesse"
    )

    assert key == "curso_interesse"
    assert val == "Curso de Copywriting"
    assert not mock_get_client.called
