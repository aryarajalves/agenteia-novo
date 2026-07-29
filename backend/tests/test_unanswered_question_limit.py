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
