import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from services.semantic_cache_service import (
    clean_user_question_intro,
    split_multi_questions,
    lookup_multi_query_semantic_cache
)

def test_clean_user_question_intro_various_cases():
    # 1. Apresentação direta: "Me chamo Aryaraj, qual é o seu nome?"
    res1 = clean_user_question_intro("Me chamo Aryaraj, qual é o seu nome?")
    assert res1.lower() == "qual é o seu nome?"

    # 2. Saudação + apresentação: "Oi, meu nome é João! Quanto custa o curso?"
    res2 = clean_user_question_intro("Oi, meu nome é João! Quanto custa o curso?")
    assert res2.lower() == "quanto custa o curso?"

    # 3. Apenas saudação: "Olá! Aceita parcelamento no cartão?"
    res3 = clean_user_question_intro("Olá! Aceita parcelamento no cartão?")
    assert res3.lower() == "aceita parcelamento no cartão?"

    # 4. Sem saudação ou apresentação: "O certificado é reconhecido pelo MEC?"
    res4 = clean_user_question_intro("O certificado é reconhecido pelo MEC?")
    assert res4 == "O certificado é reconhecido pelo MEC?"

    # 5. Apenas apresentação sem pergunta: não deve quebrar
    res5 = clean_user_question_intro("Me chamo Aryaraj")
    assert res5 == "Me chamo Aryaraj"

def test_split_multi_questions_strips_intro():
    res = split_multi_questions("Me chamo Aryaraj, qual é o seu nome?")
    assert len(res) == 1
    assert res[0].lower() == "qual é o seu nome?"

@pytest.mark.asyncio
async def test_lookup_multi_query_uses_clean_question_for_diagnostics():
    mock_db = AsyncMock()
    
    with patch("services.semantic_cache_service.extract_sub_questions_ai", new_callable=AsyncMock) as mock_extract, \
         patch("services.semantic_cache_service.lookup_semantic_cache", new_callable=AsyncMock) as mock_lookup:
        
        mock_extract.return_value = ["Qual é o seu nome?"]
        mock_cand = MagicMock()
        mock_cand.id = 10
        mock_cand.user_query = "Quem é vc?"
        mock_cand.similarity_threshold = 0.85
        mock_lookup.return_value = (None, 0.90, mock_cand)

        items, resp, sim, is_all, diags = await lookup_multi_query_semantic_cache(
            db=mock_db,
            agent_id=1,
            user_message="Me chamo Aryaraj, qual é o seu nome?",
            threshold=0.85,
            return_diagnostics=True
        )

        assert len(diags) == 1
        # O diagnóstico deve conter estritamente a pergunta limpa, sem a apresentação
        assert diags[0]["sub_query"] == "Qual é o seu nome?"
        # O lookup deve ter sido invocado com a pergunta limpa
        mock_lookup.assert_called_once()
        call_args = mock_lookup.call_args
        assert call_args[0][2] == "Qual é o seu nome?"
