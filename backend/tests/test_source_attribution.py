import pytest
import json
from unittest.mock import AsyncMock, patch, MagicMock
from httpx import AsyncClient, ASGITransport
from api.main import app
from api.deps import verify_api_key

@pytest.mark.asyncio
async def test_attribute_sources_endpoint():
    """Testa a chamada para o endpoint /attribute-sources com mock do LLM."""
    mock_llm_json = {
        "segments": [
            {
                "segment_index": 1,
                "source_type": "knowledge_base",
                "source_title": "Base de Conhecimento: Sobre a Professora",
                "source_snippet": "Perg: Quem é Tarcira?\nResp: Tarcira tem 17 anos de experiência.",
                "kb_id": 1,
                "kb_item_id": 10,
                "confidence": 0.95,
                "explanation": "Extraído diretamente do item #10 da base de conhecimento."
            },
            {
                "segment_index": 2,
                "source_type": "system_prompt",
                "source_title": "Prompt do Agente: Política de Desconto",
                "source_snippet": "Ofereça até 20% de desconto caso o cliente hesite.",
                "agent_id": 5,
                "confidence": 0.9,
                "explanation": "Regra configurada no system prompt do agente."
            }
        ],
        "summary": "Resposta composta por dados do RAG e regra de desconto do prompt."
    }

    mock_completion = MagicMock()
    mock_completion.choices = [MagicMock(message=MagicMock(content=json.dumps(mock_llm_json)))]
    mock_completion.usage = MagicMock(prompt_tokens=150, completion_tokens=80, cached_tokens=0)

    mock_client = AsyncMock()
    mock_client.chat.completions.create = AsyncMock(return_value=mock_completion)

    async def override_verify_api_key():
        return None

    app.dependency_overrides[verify_api_key] = override_verify_api_key

    with patch("agent_core.clients.get_openai_client", return_value=mock_client):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            response = await ac.post(
                "/attribute-sources",
                json={
                    "user_message": "Tem desconto no curso?",
                    "agent_response": "O curso é ministrado pela Tarcira Martins.\n\nPodemos te dar 20% de desconto.",
                    "agent_id": 5,
                    "resolved_prompt": "Você é o assistente virtual. Ofereça até 20% de desconto.",
                    "rag_items": [
                        {
                            "id": 10,
                            "knowledge_base_id": 1,
                            "question": "Quem é Tarcira?",
                            "answer": "Tarcira tem 17 anos de experiência.",
                            "category": "Sobre a Professora"
                        }
                    ]
                }
            )

        assert response.status_code == 200
        data = response.json()
        assert "segments" in data
        assert len(data["segments"]) == 2
        
        # Valida primeiro segmento (Knowledge Base)
        seg1 = data["segments"][0]
        assert seg1["source_type"] == "knowledge_base"
        assert seg1["kb_id"] == 1
        assert seg1["link"]["type"] == "knowledge_base"
        assert seg1["link"]["url"] == "/knowledge-bases/1"

        # Valida segundo segmento (System Prompt)
        seg2 = data["segments"][1]
        assert seg2["source_type"] == "system_prompt"
        assert seg2["link"]["type"] == "agent_prompt"
        assert seg2["link"]["url"] == "/agent/5"

    app.dependency_overrides.clear()

@pytest.mark.asyncio
async def test_attribute_sources_fallback():
    """Testa o comportamento de fallback resiliente caso o LLM falhe."""
    async def override_verify_api_key():
        return None

    app.dependency_overrides[verify_api_key] = override_verify_api_key

    with patch("agent_core.clients.get_openai_client", side_effect=Exception("API Error")):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            response = await ac.post(
                "/attribute-sources",
                json={
                    "user_message": "Qual o valor?",
                    "agent_response": "O investimento é R$ 297 à vista.",
                    "agent_id": 2,
                    "resolved_prompt": "Responda cordialmente.",
                    "rag_items": [
                        {
                            "id": 25,
                            "knowledge_base_id": 3,
                            "question": "Qual o valor do curso?",
                            "answer": "O investimento é R$ 297 à vista ou parcelado.",
                            "category": "Valores"
                        }
                    ]
                }
            )

        assert response.status_code == 200
        data = response.json()
        assert len(data["segments"]) >= 1
        # Deve encontrar por fallback semântico a base de conhecimento
        assert data["segments"][0]["source_type"] == "knowledge_base"
        assert data["segments"][0]["kb_id"] == 3

    app.dependency_overrides.clear()
