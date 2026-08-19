import pytest
from agent_core.logic.pre_router import run_pre_router_ai, _count_payment_issue_occurrences

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

def test_count_payment_issue_occurrences():
    history = [
        {"role": "user", "content": "Não estou conseguindo pagar com cartão"},
        {"role": "assistant", "content": "Entendo, você pode tentar outro cartão ou via PIX."},
    ]
    
    # 1ª mensagem de pagamento no histórico + 2ª mensagem atual -> count == 2
    count = _count_payment_issue_occurrences(history, "Eu consigo pagar por outro link?")
    assert count == 2

    # 3ª mensagem no mesmo fluxo -> count == 3
    history.append({"role": "user", "content": "Eu consigo pagar por outro link?"})
    count_3 = _count_payment_issue_occurrences(history, "Estou desde ontem tentando")
    assert count_3 == 3

@pytest.mark.asyncio
async def test_recurrent_payment_issue_triggers_human_transfer_only_on_3rd_time():
    config = MockConfig()
    
    # 2 mensagens anteriores do cliente no histórico
    history = [
        {"role": "user", "content": "Não estou conseguindo pagar com cartão"},
        {"role": "assistant", "content": "Entendo! Você pode tentar por PIX ou boleto."},
        {"role": "user", "content": "Eu consigo pagar por outro link?"},
        {"role": "assistant", "content": "Vou gerar um novo link de pagamento para você."}
    ]
    
    # 2ª mensagem (count == 2) -> NÃO deve transferir ainda
    history_count_2 = history[:2]
    res_2 = await run_pre_router_ai("Eu consigo pagar por outro link?", history_count_2, config)
    assert res_2.get("chamada_ferramenta") is None

    # 3ª mensagem (count == 3) -> DEVE transferir para suporte humano
    message_3 = "Estou desde ontem tentando"
    result_3 = await run_pre_router_ai(message_3, history, config)
    
    assert result_3.get("chamada_ferramenta") is not None
    assert result_3["chamada_ferramenta"]["name"] == "transferir_suporte_humano"
    assert "Dificuldade recorrente de pagamento" in result_3["chamada_ferramenta"]["arguments"]["motivo"]
    assert result_3.get("resposta_direta") is not None
    assert "suporte humano" in result_3["resposta_direta"].lower()
