import pytest
import json
from unittest.mock import AsyncMock, patch, MagicMock
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from models import WebhookConfigModel, WebhookEventModel

@pytest.mark.asyncio
async def test_explain_webhook_event_cached(client: AsyncClient, db_session: AsyncSession):
    """Testa que o endpoint retorna o raciocínio em cache se já estiver salvo no metadata."""
    config = WebhookConfigModel(name="Webhook Explain Test", token="tok-exp-1", leads_table="leads")
    db_session.add(config)
    await db_session.commit()
    await db_session.refresh(config)

    cached_reasoning = {
        "summary": "IA acolheu a negação e avançou no funil.",
        "primeira_parte": {
            "texto": "Maravilha!",
            "motivo": "Acolhimento amigável obrigatório pela Regra 5."
        },
        "pergunta_conducao": {
            "texto": "Qual o seu nome?",
            "motivo": "Etapa 1 pendente no funil."
        },
        "passo_a_passo": ["Passo 1: Recebeu Não", "Passo 2: Acolheu", "Passo 3: Perguntou nome"],
        "fatores": [{"titulo": "Regra 5", "explicacao": "Acolheu negação", "relevancia": "alta"}]
    }

    steps = [
        {"step": "🔍 Raio-X: Contexto Enviado", "detail": json.dumps({"prompt_sistema": "Regra 5"})},
        {"step": "✅ Resposta gerada pelo agente", "detail": "Maravilha! Qual o seu nome?", "metadata": {"reasoning": cached_reasoning}}
    ]

    event = WebhookEventModel(
        webhook_config_id=config.id,
        status="completed",
        mensagem="Não tenho",
        agent_response="Maravilha! Qual o seu nome?",
        processing_steps=json.dumps(steps)
    )
    db_session.add(event)
    await db_session.commit()
    await db_session.refresh(event)

    resp = await client.post(f"/webhooks/events/{event.id}/explain-response")
    assert resp.status_code == 200
    data = resp.json()
    assert data["summary"] == "IA acolheu a negação e avançou no funil."
    assert data["primeira_parte"]["texto"] == "Maravilha!"
    assert data["pergunta_conducao"]["texto"] == "Qual o seu nome?"
    assert len(data["passo_a_passo"]) == 3

@pytest.mark.asyncio
async def test_explain_webhook_event_generate(client: AsyncClient, db_session: AsyncSession):
    """Testa que o endpoint gera e persiste o raciocínio da IA quando ainda não está em cache."""
    config = WebhookConfigModel(name="Webhook Explain Gen", token="tok-exp-2", leads_table="leads")
    db_session.add(config)
    await db_session.commit()
    await db_session.refresh(config)

    steps = [
        {"step": "🔍 Raio-X: Contexto Enviado", "detail": json.dumps({"prompt_sistema": "Regras do Agente Tarcira"})},
        {"step": "✅ Resposta gerada pelo agente", "detail": "Maravilha! Você já atua na área da estética?"}
    ]

    event = WebhookEventModel(
        webhook_config_id=config.id,
        status="completed",
        mensagem="Não tenho",
        agent_response="Maravilha! Você já atua na área da estética?",
        processing_steps=json.dumps(steps)
    )
    db_session.add(event)
    await db_session.commit()
    await db_session.refresh(event)

    mock_llm_json = {
        "summary": "O modelo acolheu com simpatia e formulou a pergunta de qualificação do lead.",
        "primeira_parte": {
            "texto": "Maravilha!",
            "motivo": "Acolhimento com simpatia exigido pela Regra 5 após resposta negativa do lead."
        },
        "pergunta_conducao": {
            "texto": "Você já atua na área da estética?",
            "motivo": "Exemplo prático de sondagem contido na Regra 5."
        },
        "passo_a_passo": [
            "1. Lead declarou não ter dúvidas.",
            "2. Regra 5 foi acionada para evitar finalização prematura.",
            "3. Foi formulado o acolhimento 'Maravilha!'.",
            "4. A pergunta sobre estética foi incluída para sondar a experiência."
        ],
        "fatores": [
            {"titulo": "Regra 5 - Continuidade do Funil", "explicacao": "Forçou a continuação do diálogo", "relevancia": "alta"}
        ]
    }

    mock_client = MagicMock()
    mock_choice = MagicMock()
    mock_choice.message.content = json.dumps(mock_llm_json)
    mock_completion = MagicMock()
    mock_completion.choices = [mock_choice]
    mock_client.chat.completions.create = AsyncMock(return_value=mock_completion)

    with patch("agent_core.clients.get_openai_client", return_value=mock_client):
        resp = await client.post(f"/webhooks/events/{event.id}/explain-response")
        assert resp.status_code == 200
        data = resp.json()
        assert data["summary"] == "O modelo acolheu com simpatia e formulou a pergunta de qualificação do lead."
        assert data["primeira_parte"]["texto"] == "Maravilha!"
        assert data["pergunta_conducao"]["texto"] == "Você já atua na área da estética?"
        assert len(data["passo_a_passo"]) == 4

    await db_session.refresh(event)
    persisted_steps = json.loads(event.processing_steps)
    resp_step = next(s for s in persisted_steps if "Resposta gerada pelo agente" in s["step"])
    assert resp_step["metadata"]["reasoning"]["summary"] == mock_llm_json["summary"]

@pytest.mark.asyncio
async def test_explain_webhook_event_not_found(client: AsyncClient):
    """Testa erro 404 para evento inexistente."""
    resp = await client.post("/webhooks/events/999999/explain-response")
    assert resp.status_code == 404
