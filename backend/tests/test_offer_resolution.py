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
async def test_gostaria_expands_all_offered_items_from_previous_assistant_msg():
    config = MockConfig()
    
    # Histórico com a fala do assistente igual ao print do usuário
    history = [
        {"role": "user", "content": "Tenho interesse no curso"},
        {"role": "assistant", "content": "Certo. Se quiser mais informações sobre o Método Laser Day, sobre pagamentos ou se quiser o link de compra, é só me avisar."}
    ]

    # Mensagem enviada pelo cliente no print do usuário
    message = "Gostaria"

    result = await run_pre_router_ai(message, history, config)
    
    assert result["eh_saudacao"] is False
    assert result.get("lista_perguntas_extraidas") is not None
    
    extracted_list = [str(q).lower() for q in result["lista_perguntas_extraidas"]]
    pe = str(result["perguntas_extraidas"]).lower()
    
    # Valida que AMBAS as ofertas do assistente (pagamentos e link de compra) foram incluídas na expansão do "Gostaria"
    has_payment = any("pagamento" in q for q in extracted_list)
    has_link = any("link" in q or "compra" in q for q in extracted_list)
    
    assert has_payment is True, f"Opção de pagamentos foi omitida: {extracted_list}"
    assert has_link is True, f"Opção do link de compra foi omitida: {extracted_list}"
    assert "\n" in pe
