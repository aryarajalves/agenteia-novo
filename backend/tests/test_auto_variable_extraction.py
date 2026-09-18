import os
import sys
import pytest
from unittest.mock import MagicMock, patch, AsyncMock
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

# Adicionar o diretório pai ao sys.path para importar os módulos do backend
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from models import GlobalContextVariableModel, UserMemoryModel
from agent_core.memory import update_user_memory
from agent_core.core import process_message

@pytest.mark.asyncio
async def test_global_context_variable_schema():
    # Valida que as novas propriedades existem na classe do modelo
    var = GlobalContextVariableModel(
        key="teste_extraido",
        value="padrão",
        extraction_method="ai",
        extraction_prompt="Extraia x do diálogo"
    )
    assert var.extraction_method == "ai"
    assert var.extraction_prompt == "Extraia x do diálogo"

@pytest.mark.asyncio
@patch("agent_core.memory.get_openai_client")
async def test_update_user_memory_with_ai_extraction(mock_get_client):
    from unittest.mock import MagicMock, patch, AsyncMock
    # Mock do DB com spec=AsyncSession
    db = AsyncMock(spec=AsyncSession)
    
    # Mock do retorno da query de variáveis globais
    var_ia = GlobalContextVariableModel(
        key="nicho_mercado",
        type="string",
        extraction_method="ai",
        extraction_prompt="Identifique o nicho de mercado do cliente"
    )
    
    # Simular resultado de select(GlobalContextVariableModel)
    mock_scalars = MagicMock()
    mock_scalars.all.return_value = [var_ia]
    
    mock_result_vars = MagicMock()
    mock_result_vars.scalars.return_value = mock_scalars
    
    # Simular que a variável não existe na memória ainda
    mock_scalars_mem = MagicMock()
    mock_scalars_mem.first.return_value = None
    
    mock_result_mem = MagicMock()
    mock_result_mem.scalars.return_value = mock_scalars_mem
    
    calls = []
    def db_execute_mock(stmt):
        calls.append(stmt)
        if len(calls) == 1:
            return mock_result_vars
        return mock_result_mem
    db.execute.side_effect = db_execute_mock

    
    # Mock do retorno da chamada da LLM
    mock_choice = MagicMock()
    mock_choice.message.content = '{"nicho_mercado": "Infoprodutos e IA", "fatos_gerais": ["gosta de tecnologia"]}'
    
    mock_response = MagicMock()
    mock_response.choices = [mock_choice]
    
    mock_client = MagicMock()
    mock_client.chat.completions.create = AsyncMock(return_value=mock_response)
    mock_get_client.return_value = mock_client
    
    # Executar update_user_memory
    await update_user_memory(db, "session_test_123", "Oi, eu vendo infoprodutos", "Entendi, legal.")
    
    # Verificar se as informações foram inseridas
    assert db.add.called
    added_obj = db.add.call_args[0][0]
    assert isinstance(added_obj, UserMemoryModel)
    assert added_obj.session_id == "session_test_123"
    assert added_obj.key == "nicho_mercado"
    assert added_obj.value == "Infoprodutos e IA"

@pytest.mark.asyncio
@patch("agent_core.core.get_openai_client")
async def test_process_message_injects_extracted_variables(mock_get_client):
    from unittest.mock import MagicMock, patch, AsyncMock
    db = AsyncMock(spec=AsyncSession)


    
    # Mock das variáveis configuradas no banco
    var_ia = GlobalContextVariableModel(
        key="nicho_mercado",
        value="Geral",
        type="string",
        extraction_method="ai"
    )
    
    # Simula o valor da memória recuperado para o contato
    memoria_salva = UserMemoryModel(
        session_id="session_test_123",
        key="nicho_mercado",
        value="Infoprodutos e IA"
    )
    
    # Mocks para queries no core.py
    mock_scalars_vars = MagicMock()
    mock_scalars_vars.all.return_value = [var_ia]
    mock_res_vars = MagicMock()
    mock_res_vars.scalars.return_value = mock_scalars_vars
    
    mock_scalars_mem = MagicMock()
    mock_scalars_mem.all.return_value = [memoria_salva]
    mock_res_mem = MagicMock()
    mock_res_mem.scalars.return_value = mock_scalars_mem
    
    db.execute.side_effect = [mock_res_vars, mock_res_mem]
    
    # Configurar mock de agent config
    config = MagicMock()
    config.model = "gpt-4o-mini"
    config.system_prompt = "Olá, sei que seu nicho é {nicho_mercado}."
    config.dynamic_prompt = ""
    config.initial_question_message = None
    config.question_mode = "panel"
    config.context_window = 5
    config.router_enabled = False

    
    # Mock do client OpenAI para o process_message em si
    mock_choice = MagicMock()
    mock_choice.message.content = "Resposta do assistente"
    mock_choice.message.tool_calls = []
    
    mock_response = MagicMock()
    mock_response.choices = [mock_choice]
    
    mock_client = MagicMock()
    mock_client.chat.completions.create = AsyncMock(return_value=mock_response)
    mock_get_client.return_value = mock_client
    
    ctx = {"session_id": "session_test_123"}
    
    await process_message(
        message="Olá",
        history=[],
        config=config,
        context_variables=ctx,
        db=db
    )
    
    # Validar que o nicho_mercado no context_variables foi preenchido com o valor da memória ("Infoprodutos e IA")
    # em vez do valor padrão "Geral"
    assert ctx["nicho_mercado"] == "Infoprodutos e IA"


@pytest.mark.asyncio
@patch("agent_core.memory.get_openai_client")
async def test_update_user_memory_notifies_pipeline_on_step(mock_get_client):
    """Valida que o update_user_memory invoca on_step com o título correto quando variáveis de IA são extraídas."""
    db = AsyncMock(spec=AsyncSession)

    var_ia = GlobalContextVariableModel(
        key="valor_faturamento",
        type="number",
        extraction_method="ai",
        extraction_prompt="Extraia quanto o usuário deseja faturar"
    )

    mock_scalars = MagicMock()
    mock_scalars.all.return_value = [var_ia]
    mock_result_vars = MagicMock()
    mock_result_vars.scalars.return_value = mock_scalars

    mock_scalars_mem = MagicMock()
    mock_scalars_mem.first.return_value = None
    mock_result_mem = MagicMock()
    mock_result_mem.scalars.return_value = mock_scalars_mem

    calls = []
    def db_execute_mock(stmt):
        calls.append(stmt)
        if len(calls) == 1:
            return mock_result_vars
        return mock_result_mem
    db.execute.side_effect = db_execute_mock

    mock_choice = MagicMock()
    mock_choice.message.content = '{"valor_faturamento": 50000}'
    mock_response = MagicMock()
    mock_response.choices = [mock_choice]
    mock_client = MagicMock()
    mock_client.chat.completions.create = AsyncMock(return_value=mock_response)
    mock_get_client.return_value = mock_client

    on_step_mock = MagicMock()

    await update_user_memory(
        db=db,
        session_id="session_test_99",
        new_message="Quero faturar 50 mil por mês",
        response_text="Excelente meta!",
        on_step=on_step_mock
    )

    assert on_step_mock.called
    step_name, step_detail = on_step_mock.call_args[0]
    assert "✨ Informações Extraídas do Usuário (Variáveis)" in step_name
    assert "valor_faturamento" in step_detail
    assert "50000" in step_detail


def test_dispatch_records_extracted_vars_step():
    """Valida que o dispatch registra a etapa de '📊 Variáveis Extraídas' buscando pelas variáveis de memória do lead."""
    from webhook_tasks.dispatch import handle_post_execution_and_dispatch
    import webhook_tasks

    db = MagicMock()
    
    # Simula variáveis globais cadastradas
    var1 = GlobalContextVariableModel(key="valor_faturamento", extraction_method="ai")
    var2 = GlobalContextVariableModel(key="contact_name", extraction_method="manual")
    var3 = GlobalContextVariableModel(key="nicho", extraction_method="ai")

    # Simula memória salva para o lead
    mem1 = UserMemoryModel(session_id="lead_123", key="valor_faturamento", value="50000")

    mock_scalars_vars = MagicMock()
    mock_scalars_vars.all.return_value = [var1, var2, var3]
    res_vars = MagicMock()
    res_vars.scalars.return_value = mock_scalars_vars

    mock_scalars_mems = MagicMock()
    mock_scalars_mems.all.return_value = [mem1]
    res_mems = MagicMock()
    res_mems.scalars.return_value = mock_scalars_mems

    def db_execute_mock(stmt, *args, **kwargs):
        stmt_str = str(stmt).lower()
        if "global_context_variables" in stmt_str:
            return res_vars
        elif "user_memory" in stmt_str:
            return res_mems
        mock_default = MagicMock()
        mock_default.scalars.return_value.all.return_value = []
        mock_default.scalars.return_value.first.return_value = None
        return mock_default

    db.execute.side_effect = db_execute_mock

    event = MagicMock()
    event.id = 1
    event.conversa_id = "conv_zap_99"
    event.conta_id = "conta_1"
    event.mensagem = "Quero faturar 50 mil"
    event.contato_nome = "João da Silva"
    event.telefone = "5511999999999"

    config = MagicMock()
    config.id = 1

    db_agent = MagicMock()
    db_agent.system_prompt = "Você é um assistente."
    db_agent.tools = []

    with patch.object(webhook_tasks, "_add_step") as mock_add_step, \
         patch("webhook_tasks.dispatch._clean_debounce"):
        
        handle_post_execution_and_dispatch(
            db=db,
            event=event,
            config=config,
            db_agent=db_agent,
            result={"content": "Resposta legal"},
            history=[],
            session_id="tel_5511999999999",
            lead_internal_id="lead_123",
            event_id=1,
            is_simulated=True
        )

        step_titles = [call[0][2] for call in mock_add_step.call_args_list]
        assert "📊 Variáveis Extraídas" in step_titles

        # Encontrar a chamada da etapa de variáveis
        extracted_call = next(call for call in mock_add_step.call_args_list if call[0][2] == "📊 Variáveis Extraídas")
        metadata = extracted_call[1].get("metadata", {})
        
        # valor_faturamento foi recuperado da memória (lead_internal_id)
        assert metadata["saved"]["valor_faturamento"] == "50000"
        # contact_name foi extraído do evento
        assert metadata["saved"]["contact_name"] == "João da Silva"
        # nicho é variável de IA pendente
        assert "nicho" in metadata["pending"]


@pytest.mark.asyncio
@patch("agent_core.memory.get_openai_client")
async def test_update_user_memory_preserves_boolean_flags(mock_get_client):
    """Valida que uma variável booleana já consolidada como True na memória não é revertida passivamente para False."""
    db = AsyncMock(spec=AsyncSession)

    var_ia = GlobalContextVariableModel(
        key="link_enviado",
        type="boolean",
        extraction_method="ai",
        extraction_prompt="Quando o agente enviar o link marque como true, caso contrario marque como false."
    )

    # Simular que a variável já existe na memória como True
    mem_existente = UserMemoryModel(
        session_id="session_tfeww",
        key="link_enviado",
        value="True"
    )

    mock_scalars_vars = MagicMock()
    mock_scalars_vars.all.return_value = [var_ia]
    mock_res_vars = MagicMock()
    mock_res_vars.scalars.return_value = mock_scalars_vars

    mock_scalars_mem = MagicMock()
    mock_scalars_mem.all.return_value = [mem_existente]
    mock_scalars_mem.first.return_value = mem_existente
    mock_res_mem = MagicMock()
    mock_res_mem.scalars.return_value = mock_scalars_mem

    def db_execute_mock(stmt):
        # Diferencia chamadas por tipo ou ordem
        if "global_context_variables" in str(stmt):
            return mock_res_vars
        return mock_res_mem

    db.execute.side_effect = db_execute_mock

    # Simular que a LLM, seguindo "caso contrario false", retornou false porque a mensagem não contém link
    mock_choice = MagicMock()
    mock_choice.message.content = '{"link_enviado": false, "fatos_gerais": []}'
    mock_response = MagicMock()
    mock_response.choices = [mock_choice]
    mock_client = MagicMock()
    mock_client.chat.completions.create = AsyncMock(return_value=mock_response)
    mock_get_client.return_value = mock_client

    saved = await update_user_memory(
        db=db,
        session_id="session_tfeww",
        new_message="possui certificado?",
        response_text="Sim, o certificado é emitido ao final."
    )

    # Validar que link_enviado permaneceu True (ou foi preservado) e NÃO foi salvo como False
    assert saved.get("link_enviado") is True
    assert mem_existente.value == "True"


@pytest.mark.asyncio
@patch("agent_core.memory.get_openai_client")
async def test_update_user_memory_detects_url_deterministically(mock_get_client):
    """Valida que o envio de link com URL no response_text ativa deterministicamente a flag booleana de link."""
    db = AsyncMock(spec=AsyncSession)

    var_ia = GlobalContextVariableModel(
        key="link_enviado",
        type="boolean",
        extraction_method="ai",
        extraction_prompt="Quando o agente enviar o link do curso marque como true"
    )

    mock_scalars_vars = MagicMock()
    mock_scalars_vars.all.return_value = [var_ia]
    mock_res_vars = MagicMock()
    mock_res_vars.scalars.return_value = mock_scalars_vars

    mock_scalars_mem = MagicMock()
    mock_scalars_mem.all.return_value = []
    mock_scalars_mem.first.return_value = None
    mock_res_mem = MagicMock()
    mock_res_mem.scalars.return_value = mock_scalars_mem

    db.execute.side_effect = lambda stmt: mock_res_vars if "global_context_variables" in str(stmt) else mock_res_mem

    mock_choice = MagicMock()
    mock_choice.message.content = '{"link_enviado": null, "fatos_gerais": []}'
    mock_response = MagicMock()
    mock_response.choices = [mock_choice]
    mock_client = MagicMock()
    mock_client.chat.completions.create = AsyncMock(return_value=mock_response)
    mock_get_client.return_value = mock_client

    saved = await update_user_memory(
        db=db,
        session_id="session_test_link",
        new_message="pode enviar",
        response_text="Aqui está o link: https://pay.kiwify.com.br/VVme7C2"
    )

    assert saved.get("link_enviado") is True
    assert db.add.called
    added = db.add.call_args[0][0]
    assert added.key == "link_enviado"
    assert added.value == "True"


