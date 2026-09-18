import pytest
from unittest.mock import MagicMock, AsyncMock
from agent_core.logic.pre_router.shortcuts import is_user_answering_assistant_question
from agent_core.logic.pre_router.enrichment import enrich_user_message
from agent_core.logic.pre_router.post_processing import sanitize_and_split_questions

def test_is_user_answering_name_question():
    "history de resposta a nome"
    history = [
        {"role": "user", "content": "como funciona o curso da Tarcira?"},
        {"role": "assistant", "content": "O Método Laser Day é 100% online... Qual é o seu nome?"}
    ]

    assert is_user_answering_assistant_question("Aryaraj", history) is True
    assert is_user_answering_assistant_question("Aryaraj Alves", history) is True
    assert is_user_answering_assistant_question("Me chamo Aryaraj", history) is True
    assert is_user_answering_assistant_question("Sou o João", history) is True
    assert is_user_answering_assistant_question("Maria Eduarda", history) is True

    assert is_user_answering_assistant_question("quanto custa o curso?", history) is False
    assert is_user_answering_assistant_question("qual o valor?", history) is False
    assert is_user_answering_assistant_question("onde fica?", history) is False

@pytest.mark.asyncio
async def test_enrich_user_message_bypasses_qualification_answers():
    history = [
        {"role": "user", "content": "como funciona o curso da Tarcira?"},
        {"role": "assistant", "content": "O Método Laser Day é 100% online... Qual é o seu nome?"}
    ]
    mock_client = MagicMock()
    mock_client.chat.completions.create = AsyncMock()

    result = await enrich_user_message("Aryaraj", history, mock_client)
    assert result == "Aryaraj"
    assert not mock_client.chat.completions.create.called

def test_sanitize_and_split_questions_for_qualification():
    history = [
        {"role": "user", "content": "como funciona o curso da Tarcira?"},
        {"role": "assistant", "content": "O Método Laser Day é 100% online... Qual é o seu nome?"}
    ]
    raw_user_message = "Aryaraj"
    mock_agent = MagicMock()
    mock_agent.id = 1
    mock_agent.initial_message = "Olá"

    initial_result = {
        "eh_saudacao": False,
        "eh_agradecimento": False,
        "precisa_rag": True,
        "perguntas_extraidas": "Como funciona o curso da Tarcira?",
        "lista_perguntas_extraidas": ["Como funciona o curso da Tarcira?"]
    }

    sanitized = sanitize_and_split_questions(
        result=initial_result,
        raw_user_message=raw_user_message,
        has_real_question=False,
        is_first_msg=False,
        main_agent=mock_agent,
        initial_msg="Olá",
        msg_clean_no_punct="aryaraj",
        common_confirmations=[],
        has_reaction_emoji=False,
        history=history
    )

    assert sanitized["precisa_rag"] is False
    assert sanitized["perguntas_extraidas"] is None
    assert sanitized["lista_perguntas_extraidas"] == []
    assert sanitized["eh_resposta_ao_agente"] is True
    assert sanitized["tipo_mensagem"] == "Resposta ao Agente / Declaração"

def test_raw_user_input_preservation_logic():
    raw_user_input = "Aryaraj"
    extracted_message = "Como funciona o curso da Tarcira?"
    user_prompt_content = str(raw_user_input).strip() if raw_user_input else extracted_message
    assert user_prompt_content == "Aryaraj"
