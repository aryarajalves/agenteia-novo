import pytest
from agent_core.logic.strict_rules_prompt import get_strict_rules_prompt
from agent_core.logic.qualification_prompt import build_qualification_prompt
from unittest.mock import MagicMock
from models import AgentConfigModel

def test_strict_rules_prompt_contains_link_history_rule():
    prompt = get_strict_rules_prompt()
    assert "DIRETRIZ CRÍTICA SOBRE HISTÓRICO DO LINK" in prompt
    assert "Analise o histórico recente" in prompt
    assert "NUNCA pergunte novamente se o usuário quer receber o link" in prompt
    assert "Trate o link como já entregue" in prompt

def test_qualification_prompt_contains_link_history_directive_when_already_sent():
    config = MagicMock(spec=AgentConfigModel)
    config.qualification_funnels = None
    config.qualification_questions = None
    config.qualification_final_action = "Acesse o link: https://pay.kiwify.com.br/VVme7C2"
    
    context_variables = {"lead_already_qualified": True, "link_enviado": True}
    history = [
        {"role": "assistant", "content": "Aqui está seu link de matrícula: https://pay.kiwify.com.br/VVme7C2"}
    ]
    
    prompt = build_qualification_prompt(config, [], context_variables, history=history)
    assert "STATUS DO LINK: JÁ ENVIADO ANTERIORMENTE" in prompt
    assert "Analise o histórico recente" in prompt
    assert "NUNCA pergunte novamente se o usuário quer receber o link" in prompt
    assert "Trate o link como já entregue" in prompt
