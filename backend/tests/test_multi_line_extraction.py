import pytest
from agent_core.logic.pre_router import run_pre_router_ai

class MockConfig:
    def __init__(self, **kwargs):
        self.id = 1
        self.name = "Test Agent"
        self.model = "gpt-4o-mini"
        self.system_prompt = "You are a helpful assistant."
        self.initial_message = "Olá! Como posso ajudar?"
        self.initial_question_message = "Você possui mais alguma dúvida?"
        self.initial_ignore_message = "{}"
        self.context_window = 5
        self.model_settings = "{}"
        self.router_enabled = False
        self.date_awareness = False
        for k, v in kwargs.items():
            setattr(self, k, v)

@pytest.mark.asyncio
async def test_multi_line_questions_are_both_extracted():
    config = MockConfig()
    history = []

    # Mensagem enviada pelo usuário em 2 linhas (exatamente como no print de erro)
    message = "O curso é on-line\nDe onde vc é"

    result = await run_pre_router_ai(message, history, config)
    
    assert result["eh_saudacao"] is False
    assert result.get("lista_perguntas_extraidas") is not None
    
    extracted_list = [str(q).lower() for q in result["lista_perguntas_extraidas"]]
    
    # Valida que AMBAS as perguntas foram preservadas e NENHUMA foi descartada
    has_online = any("online" in q or "on-line" in q for q in extracted_list)
    has_location = any("onde" in q for q in extracted_list)
    
    assert has_online is True, f"Pergunta sobre ser online foi omitida: {extracted_list}"
    assert has_location is True, f"Pergunta 'De onde vc é' foi omitida: {extracted_list}"
    assert len(result["lista_perguntas_extraidas"]) >= 2
    assert "\n" in result["perguntas_extraidas"] or ";" in result["perguntas_extraidas"]
