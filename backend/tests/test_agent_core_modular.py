import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from agent_core.core import format_ai_error_message, process_message
from agent_core.logic.prompt_builder import prepare_context_variables, build_system_prompt_messages
from agent_core.logic.rag_resolver import clean_rag_query, resolve_agent_kb_ids
from agent_core.logic.tool_executor import inject_pre_executed_tool_calls
from agent_core.logic.output_processor import process_final_response
from datetime import datetime


def test_format_ai_error_message():
    err_quota = Exception("insufficient_quota: you exceeded your current quota")
    msg_quota = format_ai_error_message(err_quota, "OpenAI")
    assert "Saldo de créditos esgotado" in msg_quota

    err_rate = Exception("rate_limit_exceeded (429)")
    msg_rate = format_ai_error_message(err_rate, "OpenAI")
    assert "Limite de requisições excedido" in msg_rate

    err_key = Exception("invalid_api_key (401)")
    msg_key = format_ai_error_message(err_key, "Anthropic")
    assert "Chave de API inválida" in msg_key

    err_model = Exception("model_not_found: The model does not exist")
    msg_model = format_ai_error_message(err_model, "OpenAI")
    assert "O modelo de IA solicitado não existe" in msg_model


@pytest.mark.asyncio
async def test_prepare_context_variables():
    ctx = {"user_name": "João"}
    res = await prepare_context_variables(ctx, db=None)
    assert res["user_name"] == "João"
    assert "dia_semana" in res
    assert "data_atual" in res
    assert "hora_atual" in res


@pytest.mark.asyncio
async def test_build_system_prompt_messages():
    mock_config = MagicMock()
    mock_config.system_prompt = "### Bem-vindo ao sistema {nome_empresa}."
    mock_config.dynamic_prompt = "Regra especial: seja amigável."
    mock_config.unanswered_question_prompt = "Peça desculpas educadamente."
    mock_config.security_language_complexity = "simple"
    mock_config.security_forbidden_topics = "política, religião"
    mock_config.security_competitor_blacklist = "ConcorrenteX"
    mock_config.security_discount_policy = "Máximo 10% de desconto"

    ctx = {"nome_empresa": "MinhaEmpresa"}
    messages = await build_system_prompt_messages(
        config=mock_config,
        context_variables=ctx,
        tools=[],
        history=[],
        db=None
    )

    assert len(messages) >= 1
    content = messages[0]["content"]
    assert "MinhaEmpresa" in content
    assert "Regra especial: seja amigável" in content
    assert "Estilo de Linguagem Simples" in content
    assert "TÓPICOS PROIBIDOS" in content
    assert "política, religião" in content
    assert "ConcorrenteX" in content
    assert "Máximo 10% de desconto" in content


def test_clean_rag_query():
    raw_query = "Qual o valor do curso etc... ?"
    cleaned = clean_rag_query(raw_query)
    assert "etc" not in cleaned
    assert "..." not in cleaned
    assert "Qual o valor do curso" in cleaned


@pytest.mark.asyncio
async def test_resolve_agent_kb_ids():
    cfg1 = MagicMock()
    cfg1.knowledge_bases = [MagicMock(id=10), MagicMock(id=20)]
    ids1 = await resolve_agent_kb_ids(cfg1, database=None)
    assert ids1 == [10, 20]

    cfg2 = MagicMock()
    cfg2.knowledge_bases = []
    cfg2.knowledge_base_ids = [30, 40]
    ids2 = await resolve_agent_kb_ids(cfg2, database=None)
    assert ids2 == [30, 40]


def test_inject_pre_executed_tool_calls():
    messages = []
    tool_calls_log = []
    pre_calls = [
        {
            "name": "transferir_atendimento",
            "args": {"motivo": "Cliente pediu atendente"},
            "output": "Transferência realizada com sucesso."
        }
    ]
    handoff_data, is_terminal, last_resp = inject_pre_executed_tool_calls(
        messages=messages,
        pre_executed_tool_calls=pre_calls,
        tool_calls_log=tool_calls_log,
        now_br=datetime.now()
    )

    assert is_terminal is True
    assert handoff_data["handoff"] is True
    assert handoff_data["destino"] == "humano"
    assert len(messages) == 2  # 1 assistant + 1 tool
    assert len(tool_calls_log) == 1


@pytest.mark.asyncio
async def test_process_final_response():
    mock_config = MagicMock()
    mock_config.security_validator_ia = False
    mock_config.initial_question_message = "Como posso te ajudar hoje?"
    mock_config.question_mode = "panel"

    raw_response = "{ferramenta}{arg:1} Olá! O produto custa R$ 100. Posso te ajudar com mais alguma dúvida?"
    final = await process_final_response(
        last_response=raw_response,
        handoff_data={"handoff": False},
        config=mock_config,
        history=[],
        message="Olá",
        context_variables={},
        db=None,
        tool_calls_log=[],
        has_lead_qualified=False
    )

    assert "{ferramenta}" not in final
    assert "R$ 100" in final
    assert "Como posso te ajudar hoje?" in final
