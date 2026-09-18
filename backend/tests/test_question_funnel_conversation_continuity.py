import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from agent_core.logic.question_funnel_handler import handle_question_funnel_check

@pytest.mark.asyncio
async def test_question_funnel_stores_transcription_in_consolidated_history():
    mock_config = MagicMock()
    mock_config.id = 36 # Tarcira

    mock_db = AsyncMock()

    mock_funnel = MagicMock()
    mock_funnel.id = 10
    mock_funnel.name = "Explicacao Curso Laser"
    mock_funnel.trigger_question = "como funciona o curso de vcs?"
    mock_funnel.trigger_variations = []
    mock_funnel.similarity_threshold = 0.80
    mock_funnel.frequency_mode = "once_per_lead"
    mock_funnel.is_active = True
    mock_funnel.embedding = [1.0] + [0.0] * 1535
    mock_funnel.variation_embeddings = []
    mock_funnel.steps = [
        {
            "step_number": 1,
            "type": "audio",
            "media_url": "https://s3.com/audio-laser.mp3",
            "transcription": "O curso Método Laser Day é 100% online com acesso vitalício, aulas práticas em modelos reais e certificado.",
            "delay_seconds": 0
        },
        {
            "step_number": 2,
            "type": "text",
            "content": "Posso ajudar você com mais alguma dúvida sobre o Método Laser Day?",
            "delay_seconds": 3
        }
    ]

    mock_res = MagicMock()
    mock_res.scalars.return_value.all.return_value = [mock_funnel]
    mock_db.execute.return_value = mock_res

    context_vars = {}

    with patch("agent_core.logic.question_funnel_handler.get_embedding", new_callable=AsyncMock) as mock_emb:
        mock_emb.return_value = ([1.0] + [0.0] * 1535, 10)

        result, diag = await handle_question_funnel_check(
            config=mock_config,
            message="como funciona o curso de vcs?",
            history=[],
            context_variables=context_vars,
            db=mock_db,
            return_diagnostics=True
        )

        assert result is not None
        assert result["from_question_funnel"] is True
        # Verifica se o conteúdo consolidado para o histórico contém tanto o resumo/transcrição do áudio quanto o texto
        assert "O curso Método Laser Day é 100% online" in result["content"]
        assert "Posso ajudar você com mais alguma dúvida" in result["content"]
        # Verifica se a lista de IDs executados foi adicionada ao context_variables
        assert 10 in context_vars["executed_question_funnels"]
