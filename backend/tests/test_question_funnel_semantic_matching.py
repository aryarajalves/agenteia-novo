import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from agent_core.logic.question_funnel_handler import handle_question_funnel_check
from models import QuestionFunnelModel

@pytest.mark.asyncio
async def test_question_funnel_semantic_hit():
    mock_config = MagicMock()
    mock_config.id = 36 # Agente Tarcira

    mock_db = AsyncMock()

    mock_funnel = MagicMock()
    mock_funnel.id = 1
    mock_funnel.agent_id = 36
    mock_funnel.name = "Apresentação do Curso"
    mock_funnel.trigger_question = "como funciona o curso de vocês?"
    mock_funnel.trigger_variations = ["me explica o curso"]
    mock_funnel.similarity_threshold = 0.82
    mock_funnel.frequency_mode = "once_per_lead"
    mock_funnel.is_active = True
    # Vetor padrão normalizado
    mock_funnel.embedding = [1.0] + [0.0] * 1535
    mock_funnel.variation_embeddings = [[0.9] + [0.0] * 1535]
    mock_funnel.steps = [
        {"step_number": 1, "type": "audio", "media_url": "https://s3.com/curso.mp3", "transcription": "O curso é 100% online com certificado...", "delay_seconds": 0},
        {"step_number": 2, "type": "text", "content": "Você tem interesse em saber as formas de pagamento?", "delay_seconds": 4}
    ]
    mock_funnel.total_executions = 0

    mock_res = MagicMock()
    mock_res.scalars.return_value.all.return_value = [mock_funnel]
    mock_db.execute.return_value = mock_res

    # Mock get_embedding para retornar vetor idêntico (similaridade = 1.0)
    with patch("agent_core.logic.question_funnel_handler.get_embedding", new_callable=AsyncMock) as mock_emb:
        mock_emb.return_value = ([1.0] + [0.0] * 1535, 10)

        result, diag = await handle_question_funnel_check(
            config=mock_config,
            message="como funciona o curso de vocês?",
            history=[],
            context_variables={},
            db=mock_db,
            return_diagnostics=True
        )

        assert result is not None
        assert result["from_question_funnel"] is True
        assert result["funnel_name"] == "Apresentação do Curso"
        assert len(result["funnel_steps"]) == 2
        assert "O curso é 100% online" in result["content"]
        assert diag["status"] == "hit"
        assert diag["similarity"] >= 0.82

@pytest.mark.asyncio
async def test_question_funnel_once_per_lead_skips_when_already_executed():
    mock_config = MagicMock()
    mock_config.id = 36

    mock_db = AsyncMock()

    mock_funnel = MagicMock()
    mock_funnel.id = 1
    mock_funnel.name = "Apresentação do Curso"
    mock_funnel.trigger_question = "como funciona o curso de vocês?"
    mock_funnel.similarity_threshold = 0.82
    mock_funnel.frequency_mode = "once_per_lead"
    mock_funnel.is_active = True
    mock_funnel.embedding = [1.0] + [0.0] * 1535
    mock_funnel.variation_embeddings = []

    mock_res = MagicMock()
    mock_res.scalars.return_value.all.return_value = [mock_funnel]
    mock_db.execute.return_value = mock_res

    # Lead já tem executed_question_funnels com ID 1
    context_vars = {"executed_question_funnels": [1]}

    with patch("agent_core.logic.question_funnel_handler.get_embedding", new_callable=AsyncMock) as mock_emb:
        mock_emb.return_value = ([1.0] + [0.0] * 1535, 10)

        result, diag = await handle_question_funnel_check(
            config=mock_config,
            message="como funciona o curso de vocês?",
            history=[],
            context_variables=context_vars,
            db=mock_db,
            return_diagnostics=True
        )

        # Deve pular o funil já executado para aquele lead
        assert result is None
        assert diag["status"] == "miss"

@pytest.mark.asyncio
async def test_question_funnel_always_mode_triggers_again():
    mock_config = MagicMock()
    mock_config.id = 36

    mock_db = AsyncMock()

    mock_funnel = MagicMock()
    mock_funnel.id = 2
    mock_funnel.name = "Cardápio Semanal"
    mock_funnel.trigger_question = "qual o cardapio?"
    mock_funnel.similarity_threshold = 0.80
    mock_funnel.frequency_mode = "always" # Sempre dispara
    mock_funnel.is_active = True
    mock_funnel.embedding = [1.0] + [0.0] * 1535
    mock_funnel.variation_embeddings = []
    mock_funnel.steps = [{"step_number": 1, "type": "text", "content": "Nosso cardápio atualizado..."}]

    mock_res = MagicMock()
    mock_res.scalars.return_value.all.return_value = [mock_funnel]
    mock_db.execute.return_value = mock_res

    # Lead já executou o funil 2 anteriormente
    context_vars = {"executed_question_funnels": [2]}

    with patch("agent_core.logic.question_funnel_handler.get_embedding", new_callable=AsyncMock) as mock_emb:
        mock_emb.return_value = ([1.0] + [0.0] * 1535, 10)

        result, diag = await handle_question_funnel_check(
            config=mock_config,
            message="qual o cardapio?",
            history=[],
            context_variables=context_vars,
            db=mock_db,
            return_diagnostics=True
        )

        assert result is not None
        assert result["from_question_funnel"] is True
        assert result["funnel_name"] == "Cardápio Semanal"
