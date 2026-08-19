import pytest
import json
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from agent_core.tools.handlers.internal import handle_unanswered_question
from models import UnansweredQuestionModel, SupportRequestModel, AgentConfigModel

@pytest.mark.asyncio
async def test_unanswered_question_limit_triggers_handoff(db_session: AsyncSession):
    # Criar agente no banco de teste para satisfazer a chave estrangeira
    agent = AgentConfigModel(name="Agente Teste Limite", is_active=True)
    db_session.add(agent)
    await db_session.commit()
    await db_session.refresh(agent)

    context_vars = {
        "contact_phone": "5511999991111",
        "contact_name": "Cliente Teste Limite",
        "session_id": "session_test_limit_123"
    }
    history = [{"role": "user", "content": "Qual o horário do evento?"}]

    # 1ª Chamada para a ferramenta "registrar_duvida_sem_resposta"
    args_1 = json.dumps({"pergunta": "Qual o horário do evento?"})
    res_1 = await handle_unanswered_question(db_session, context_vars, args_1, history, agent.id)
    
    assert "Dúvida registrada para nossa equipe" in res_1

    # Verificar que apenas 1 dúvida foi registrada e nenhum suporte humano foi aberto
    q_count_res = await db_session.execute(
        select(UnansweredQuestionModel).where(UnansweredQuestionModel.session_id == "5511999991111")
    )
    questions = q_count_res.scalars().all()
    assert len(questions) == 1

    support_res_1 = await db_session.execute(
        select(SupportRequestModel).where(SupportRequestModel.contact_phone == "5511999991111")
    )
    assert len(support_res_1.scalars().all()) == 0

    # 2ª Chamada para a mesma ferramenta na mesma sessão (> 1 vez)
    args_2 = json.dumps({"pergunta": "Onde é o local exato do evento?"})
    res_2 = await handle_unanswered_question(db_session, context_vars, args_2, history, agent.id)

    # Deve indicar transbordo automático para suporte humano
    assert "AUTOMATICAMENTE TRANSFERIDO PARA O SUPORTE HUMANO" in res_2

    # Verificar que a 2ª dúvida foi registrada
    q_count_res_2 = await db_session.execute(
        select(UnansweredQuestionModel).where(UnansweredQuestionModel.session_id == "5511999991111")
    )
    assert len(q_count_res_2.scalars().all()) == 2

    # Verificar que o suporte humano (SupportRequestModel) foi criado automaticamente
    support_res_2 = await db_session.execute(
        select(SupportRequestModel).where(SupportRequestModel.contact_phone == "5511999991111")
    )
    supports = support_res_2.scalars().all()
    assert len(supports) == 1
    assert "Dúvida sem resposta registrada 2 vezes" in supports[0].reason

@pytest.mark.asyncio
async def test_process_message_with_unanswered_question_handoff_generates_response(db_session: AsyncSession):
    """Testa se na 2ª dúvida sem resposta o process_message NÃO retorna resposta vazia e permite a resposta da IA com handoff."""
    from unittest.mock import AsyncMock, patch, MagicMock
    from agent import process_message
    from config_store import AgentConfig

    agent_cfg = AgentConfig(
        id=99,
        name="Agente Teste Loop",
        system_prompt="Você é um assistente de vendas.",
        model="gpt-4o-mini",
        router_enabled=False,
        date_awareness=False,
        handoff_enabled=True
    )

    context_vars = {
        "contact_phone": "5511988882222",
        "contact_name": "Cliente Loop Test",
        "session_id": "session_loop_test_456"
    }

    # Pré-criar 1 dúvida no banco para que a chamada no teste seja a 2ª (ativando o handoff)
    new_q = UnansweredQuestionModel(
        agent_id=99,
        session_id="5511988882222",
        question="Primeira dúvida não respondida",
        context="contexto prévio",
        status="PENDENTE",
        source="chatwoot"
    )
    db_session.add(new_q)
    await db_session.commit()

    # Mocks para o cliente OpenAI em 2 turnos:
    # Turno 1: IA decide chamar a tool 'registrar_duvida_sem_resposta'
    mock_tool_call = MagicMock()
    mock_tool_call.id = "call_unanswered_123"
    mock_tool_call.function.name = "registrar_duvida_sem_resposta"
    mock_tool_call.function.arguments = json.dumps({"pergunta": "Qual o endereço da filial?"})

    class MockMsgTurn1:
        def __init__(self):
            self.content = None
            self.tool_calls = [mock_tool_call]

    class MockRespTurn1:
        def __init__(self):
            self.choices = [MagicMock(message=MockMsgTurn1())]
            self.usage = MagicMock(prompt_tokens=10, completion_tokens=10)

    # Turno 2: IA recebe o retorno da tool e gera a resposta explicativa acolhedora
    class MockMsgTurn2:
        def __init__(self):
            self.content = "Não encontrei o endereço exato da filial, por isso já transferi seu atendimento para nossa equipe especializada continuar com você! 😊"
            self.tool_calls = None

    class MockRespTurn2:
        def __init__(self):
            self.choices = [MagicMock(message=MockMsgTurn2())]
            self.usage = MagicMock(prompt_tokens=15, completion_tokens=15)

    with patch("agent_core.core.get_openai_client") as mock_get_client, \
         patch("agent_core.core.run_pre_router_ai", new_callable=AsyncMock) as mock_pre_router:

        mock_pre_router.return_value = {
            "eh_saudacao": False,
            "id_agente_alvo": 99,
            "perguntas_extraidas": "Qual o endereço da filial?",
            "precisa_ferramenta": True,
            "precisa_rag": False
        }

        mock_client = MagicMock()
        mock_get_client.return_value = mock_client
        mock_client.chat.completions.create = AsyncMock(side_effect=[MockRespTurn1(), MockRespTurn2()])

        result = await process_message(
            message="Qual o endereço da filial?",
            history=[],
            config=agent_cfg,
            tools=[],
            context_variables=context_vars,
            db=db_session
        )

        # Validações cruciais
        assert result["error"] is False
        assert result["content"] != ""
        assert "já transferi seu atendimento" in result["content"]
        assert result["handoff_data"]["handoff"] is True
        assert "Dúvida sem resposta acionada > 1 vez" in result["handoff_data"]["motivo"]

@pytest.mark.asyncio
async def test_process_message_with_unanswered_question_fallback_on_empty(db_session: AsyncSession):
    """Testa se na 2ª dúvida sem resposta, caso a IA retorne vazio no 2º turno, o fallback amigável é aplicado em vez de mensagem em branco."""
    from unittest.mock import AsyncMock, patch, MagicMock
    from agent import process_message
    from config_store import AgentConfig

    agent_cfg = AgentConfig(
        id=99,
        name="Agente Teste Fallback",
        system_prompt="Você é um assistente de vendas.",
        model="gpt-4o-mini",
        router_enabled=False,
        date_awareness=False,
        handoff_enabled=True
    )

    context_vars = {
        "contact_phone": "5511977773333",
        "contact_name": "Cliente Fallback Test",
        "session_id": "session_fallback_test_789"
    }

    # Pré-criar 1 dúvida no banco
    new_q = UnansweredQuestionModel(
        agent_id=99,
        session_id="5511977773333",
        question="Dúvida prévia 1",
        context="contexto prévio",
        status="PENDENTE",
        source="chatwoot"
    )
    db_session.add(new_q)
    await db_session.commit()

    # Mocks para o cliente OpenAI:
    # Turno 1: IA decide chamar a tool 'registrar_duvida_sem_resposta'
    mock_tool_call = MagicMock()
    mock_tool_call.id = "call_fallback_123"
    mock_tool_call.function.name = "registrar_duvida_sem_resposta"
    mock_tool_call.function.arguments = json.dumps({"pergunta": "Qual o CNPJ da empresa?"})

    class MockMsgTurn1:
        def __init__(self):
            self.content = None
            self.tool_calls = [mock_tool_call]

    class MockRespTurn1:
        def __init__(self):
            self.choices = [MagicMock(message=MockMsgTurn1())]
            self.usage = MagicMock(prompt_tokens=10, completion_tokens=10)

    # Turno 2: IA por algum motivo retorna content vazio
    class MockMsgTurn2:
        def __init__(self):
            self.content = ""
            self.tool_calls = None

    class MockRespTurn2:
        def __init__(self):
            self.choices = [MagicMock(message=MockMsgTurn2())]
            self.usage = MagicMock(prompt_tokens=15, completion_tokens=5)

    with patch("agent_core.core.get_openai_client") as mock_get_client, \
         patch("agent_core.core.run_pre_router_ai", new_callable=AsyncMock) as mock_pre_router:

        mock_pre_router.return_value = {
            "eh_saudacao": False,
            "id_agente_alvo": 99,
            "perguntas_extraidas": "Qual o CNPJ da empresa?",
            "precisa_ferramenta": True,
            "precisa_rag": False
        }

        mock_client = MagicMock()
        mock_get_client.return_value = mock_client
        mock_client.chat.completions.create = AsyncMock(side_effect=[MockRespTurn1(), MockRespTurn2()])

        result = await process_message(
            message="Qual o CNPJ da empresa?",
            history=[],
            config=agent_cfg,
            tools=[],
            context_variables=context_vars,
            db=db_session
        )

        # Validação do fallback amigável
        assert result["error"] is False
        assert result["content"] != ""
        assert "transferi seu atendimento para nossa equipe especializada" in result["content"]
        assert result["handoff_data"]["handoff"] is True
