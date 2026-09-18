import pytest
import json
from unittest.mock import AsyncMock, MagicMock, patch
from webhook_services import _build_agent_config
from agent_core.tools.handlers.internal import check_and_apply_qualification_fallback

def test_build_agent_config_maps_qualification_final_action():
    """Valida que _build_agent_config repassa qualification_final_action e qualification_criteria."""
    db_agent = MagicMock()
    db_agent.id = 42
    db_agent.name = "Agente Teste"
    db_agent.description = "Desc"
    db_agent.model = "gpt-4o-mini"
    db_agent.fallback_model = None
    db_agent.temperature = 0.7
    db_agent.top_p = 1.0
    db_agent.date_awareness = False
    db_agent.system_prompt = "Você é um assistente."
    db_agent.context_window = 10
    db_agent.knowledge_base = None
    db_agent.rag_retrieval_count = 5
    db_agent.rag_translation_enabled = False
    db_agent.rag_multi_query_enabled = False
    db_agent.rag_rerank_enabled = False
    db_agent.rag_agentic_eval_enabled = False
    db_agent.rag_parent_expansion_enabled = False
    db_agent.is_active = True
    db_agent.simulated_time = None
    db_agent.security_competitor_blacklist = None
    db_agent.security_forbidden_topics = None
    db_agent.security_discount_policy = None
    db_agent.security_language_complexity = None
    db_agent.security_pii_filter = False
    db_agent.security_bot_protection = False
    db_agent.security_max_messages_per_session = 50
    db_agent.security_semantic_threshold = 0.8
    db_agent.security_loop_count = 3
    db_agent.security_validator_ia = False
    db_agent.inbox_capture_enabled = False
    db_agent.ui_primary_color = "#fff"
    db_agent.ui_header_color = "#000"
    db_agent.ui_chat_title = "Chat"
    db_agent.ui_welcome_message = "Olá"
    db_agent.router_enabled = False
    db_agent.router_simple_model = None
    db_agent.router_simple_fallback_model = None
    db_agent.router_complex_model = None
    db_agent.handoff_enabled = False
    db_agent.response_translation_enabled = False
    db_agent.response_translation_fallback_lang = "portuguese"
    db_agent.top_k = 5
    db_agent.presence_penalty = 0.0
    db_agent.frequency_penalty = 0.0
    db_agent.safety_settings = None
    db_agent.model_settings = None
    db_agent.qualification_questions = '[{"title": "Qual é o seu nome?"}, "Qual é o seu email?"]'
    db_agent.qualification_labels = '["lead-qualificado"]'
    db_agent.qualification_criteria = "Critério de qualificação"
    db_agent.qualification_final_action = "Pergunte se eu posso enviar o link do curso para ele."
    db_agent.qualification_final_action_trigger = "hot"
    db_agent.initial_question_message = None

    cfg = _build_agent_config(db_agent)
    assert cfg.qualification_final_action == "Pergunte se eu posso enviar o link do curso para ele."
    assert cfg.qualification_final_action_trigger == "hot"
    assert cfg.qualification_criteria == "Critério de qualificação"
    assert cfg.qualification_labels == '["lead-qualificado"]'

@pytest.mark.asyncio
async def test_check_and_apply_qualification_fallback_triggers_when_email_provided():
    """Valida que o fallback detecta resposta de email e dispara handle_lead_qualified se a tool nao foi acionada diretamente."""
    mock_db = MagicMock()
    context_variables = {"contact_name": "Aryaraj", "contact_phone": "5585998259497"}
    
    config = MagicMock()
    config.id = 36
    config.qualification_questions = '[{"title": "Qual é o seu nome?"}, "Qual é o seu email?"]'
    
    history = [
        {"role": "user", "content": "Aryaraj"},
        {"role": "assistant", "content": "Perfeito, Aryaraj! Qual é o seu e-mail?"}
    ]
    message = "aryarajunity@gmail.com"
    tool_calls_log = []
    
    with patch("agent_core.tools.handlers.internal.handle_lead_qualified", new_callable=AsyncMock) as mock_handle:
        mock_handle.return_value = "Lead qualificado com sucesso."
        
        await check_and_apply_qualification_fallback(
            db=mock_db,
            context_variables=context_variables,
            config=config,
            history=history,
            message=message,
            tool_calls_log=tool_calls_log
        )
        
        assert mock_handle.called
        assert len(tool_calls_log) == 1
        assert tool_calls_log[0]["name"] == "lead_qualificado"
        assert "aryarajunity@gmail.com" in tool_calls_log[0]["args"]

@pytest.mark.asyncio
async def test_check_and_apply_qualification_fallback_skips_if_already_called():
    """Valida que o fallback não duplica a execução se a ferramenta lead_qualificado já está no log."""
    mock_db = MagicMock()
    context_variables = {}
    config = MagicMock()
    config.id = 36
    config.qualification_questions = '["Qual é o seu email?"]'
    history = [{"role": "assistant", "content": "Qual seu email?"}]
    message = "teste@gmail.com"
    tool_calls_log = [{"name": "lead_qualificado", "output": "ok"}]
    
    with patch("agent_core.tools.handlers.internal.handle_lead_qualified", new_callable=AsyncMock) as mock_handle:
        await check_and_apply_qualification_fallback(
            db=mock_db,
            context_variables=context_variables,
            config=config,
            history=history,
            message=message,
            tool_calls_log=tool_calls_log
        )
        assert not mock_handle.called


@pytest.mark.asyncio
async def test_two_step_qualification_permission_instruction_in_tool_output():
    """Valida que a instrução de fechamento contém a regra de permissão em dois passos."""
    from agent_core.tools.handlers.internal import handle_lead_qualified
    mock_db = AsyncMock()
    mock_agent = MagicMock()
    mock_agent.qualification_labels = '["lead-qualificado"]'
    mock_agent.qualification_final_action = "Pergunte se eu posso enviar o link do curso para ele. Lembre-se que o link é: https://pay.kiwify.com.br/123"
    
    mock_wh = MagicMock()
    mock_wh.id = 1
    mock_wh.zapvoice_url = "https://zv.test"
    mock_wh.zapvoice_api_token = "token"
    
    res_agent = MagicMock()
    res_agent.scalars.return_value.first.return_value = mock_agent
    res_wh = MagicMock()
    res_wh.scalars.return_value.first.return_value = mock_wh
    res_lead = MagicMock()
    res_lead.fetchone.return_value = (None, None)
    res_upd = MagicMock()
    res_upd.rowcount = 1
    
    mock_db.execute.side_effect = [res_agent, res_wh, res_lead, res_upd]
    
    with patch("zapvoice_utils.sync_conversation_labels", new_callable=AsyncMock), \
         patch("lead_scoring_service.calculate_lead_score", new_callable=AsyncMock) as mock_score:
        mock_score.return_value = {"lead_score": 10, "lead_classification": "Quente 🔥", "lead_justification": "Ok"}
        output = await handle_lead_qualified(
            mock_db,
            {"contact_name": "Aryaraj", "contact_phone": "558199999", "leads_table": "leads", "conversation_id": 10, "account_id": 1},
            json.dumps({"respostas": {"email": "a@a.com"}}),
            agent_id=1
        )
        assert "REGRA DE DOIS PASSOS" in output
        assert "NUNCA ENVIE O LINK ANTES DO 'SIM'" in output
        assert "NÃO envie o link, URL ou checkout agora" in output


def test_already_qualified_prompt_preserves_final_action_and_checkout_rules():
    """Valida que o lead já qualificado mantém a diretriz de fechamento e link no system prompt."""
    from agent_core.logic.qualification_prompt import build_qualification_prompt
    config = MagicMock()
    config.qualification_final_action = "Link do curso: https://pay.kiwify.com.br/checkout"
    
    prompt = build_qualification_prompt(config, tools=[], context_variables={"lead_already_qualified": True})
    
    assert "STATUS DO LEAD: JÁ QUALIFICADO ANTERIORMENTE" in prompt
    assert "DIRETRIZ DE FECHAMENTO & LINK / OFERTA PÓS-QUALIFICAÇÃO" in prompt
    assert "https://pay.kiwify.com.br/checkout" in prompt
    assert "Se o lead confirmou, disse 'sim', 'pode enviar'" in prompt


def test_already_qualified_prompt_blocks_repeating_link_when_link_enviado_is_true():
    """Valida que quando link_enviado=True, o prompt proíbe expressamente perguntar se pode enviar o link."""
    from agent_core.logic.qualification_prompt import build_qualification_prompt
    config = MagicMock()
    config.qualification_final_action = "Link do curso: https://pay.kiwify.com.br/checkout"
    
    prompt = build_qualification_prompt(
        config, tools=[], context_variables={"lead_already_qualified": True, "link_enviado": True}
    )
    
    assert "STATUS DO LINK: JÁ ENVIADO ANTERIORMENTE" in prompt
    assert "TERMINANTEMENTE PROIBIDO perguntar novamente se pode enviar o link" in prompt
    assert "DIRETRIZ DE FECHAMENTO & LINK / OFERTA PÓS-QUALIFICAÇÃO" not in prompt


def test_already_qualified_prompt_blocks_repeating_link_when_history_contains_link():
    """Valida que quando o histórico já possui mensagem do assistente com o link, o prompt bloqueia re-pergunta."""
    from agent_core.logic.qualification_prompt import build_qualification_prompt
    config = MagicMock()
    config.qualification_final_action = "Link do curso: https://pay.kiwify.com.br/checkout"
    
    history = [
        {"role": "user", "content": "pode mandar o link"},
        {"role": "assistant", "content": "O link do curso é esse: https://pay.kiwify.com.br/checkout"},
        {"role": "user", "content": "obrigado"}
    ]
    
    prompt = build_qualification_prompt(
        config, tools=[], context_variables={"lead_already_qualified": True}, history=history
    )
    
    assert "STATUS DO LINK: JÁ ENVIADO ANTERIORMENTE" in prompt
    assert "TERMINANTEMENTE PROIBIDO perguntar novamente se pode enviar o link" in prompt



@pytest.mark.asyncio
async def test_pre_router_affirmation_shortcut_after_question():
    """Valida que resposta 'Sim' a uma pergunta do assistente usa atalho programático sem passar por IA."""
    from agent_core.logic.pre_router import run_pre_router_ai
    
    config = MagicMock()
    config.id = 1
    config.greeting_mode = "panel"
    config.initial_message = "Olá"
    config.qualification_questions = None
    
    mock_msg_hist = MagicMock()
    mock_msg_hist.role = "assistant"
    mock_msg_hist.content = "Você gostaria de receber nosso material?"
    
    result = await run_pre_router_ai("Sim", [mock_msg_hist], config)
    
    assert result["eh_saudacao"] is False
    assert result["perguntas_extraidas"] == "Sim"


@pytest.mark.asyncio
async def test_qualification_final_action_conditional_triggers():
    """Valida o comportamento condicional de disparo da ação final de acordo com a temperatura do lead."""
    from agent_core.tools.handlers.internal import handle_lead_qualified
    
    # 1. Caso: Trigger = 'hot' e Lead é Quente 🔥 -> Deve disparar a pergunta final de fechamento
    mock_db = AsyncMock()
    mock_agent = MagicMock()
    mock_agent.qualification_labels = '["lead-qualificado"]'
    mock_agent.qualification_criteria = "Critérios"
    mock_agent.qualification_final_action = "Pergunte se posso enviar o link do curso."
    mock_agent.qualification_final_action_trigger = "hot"

    mock_wh = MagicMock()
    mock_wh.id = 1
    mock_wh.zapvoice_url = "https://zv.test"
    mock_wh.zapvoice_api_token = "token"

    res_agent = MagicMock()
    res_agent.scalars.return_value.first.return_value = mock_agent
    res_wh = MagicMock()
    res_wh.scalars.return_value.first.return_value = mock_wh
    res_lead = MagicMock()
    res_lead.fetchone.return_value = (None, None)
    res_upd = MagicMock()
    res_upd.rowcount = 1

    mock_db.execute.side_effect = [res_agent, res_wh, res_lead, res_upd]

    with patch("zapvoice_utils.sync_conversation_labels", new_callable=AsyncMock), \
         patch("lead_scoring_service.calculate_lead_score", new_callable=AsyncMock) as mock_scoring:
        mock_scoring.return_value = {"lead_score": 11, "lead_classification": "Quente 🔥", "lead_justification": "Orçamento alto"}
        
        output_hot = await handle_lead_qualified(
            mock_db,
            {"contact_name": "Aryaraj", "contact_phone": "558199999", "leads_table": "leads", "conversation_id": 10, "account_id": 1},
            json.dumps({"respostas": {"email": "hot@teste.com"}}),
            agent_id=1
        )
        assert "PERGUNTA DE FECHAMENTO OBRIGATÓRIA" in output_hot
        assert "REGRA DE DOIS PASSOS" in output_hot

    # 2. Caso: Trigger = 'hot' e Lead é Frio ❄️ -> NÃO deve disparar oferta de fechamento
    mock_db2 = AsyncMock()
    mock_db2.execute.side_effect = [res_agent, res_wh, res_lead, res_upd]
    with patch("zapvoice_utils.sync_conversation_labels", new_callable=AsyncMock), \
         patch("lead_scoring_service.calculate_lead_score", new_callable=AsyncMock) as mock_scoring:
        mock_scoring.return_value = {"lead_score": 2, "lead_classification": "Frio ❄️", "lead_justification": "Sem orçamento"}
        
        output_cold = await handle_lead_qualified(
            mock_db2,
            {"contact_name": "Aryaraj", "contact_phone": "558199999", "leads_table": "leads", "conversation_id": 10, "account_id": 1},
            json.dumps({"respostas": {"email": "cold@teste.com"}}),
            agent_id=1
        )
        assert "PERGUNTA DE FECHAMENTO OBRIGATÓRIA" not in output_cold
        assert "NÃO faça oferta de fechamento nem envie link de checkout" in output_cold

    # 3. Caso: Trigger = 'hot_warm' e Lead é Morno ⚡ -> DEVE disparar pergunta final
    mock_agent.qualification_final_action_trigger = "hot_warm"
    mock_db3 = AsyncMock()
    mock_db3.execute.side_effect = [res_agent, res_wh, res_lead, res_upd]
    with patch("zapvoice_utils.sync_conversation_labels", new_callable=AsyncMock), \
         patch("lead_scoring_service.calculate_lead_score", new_callable=AsyncMock) as mock_scoring:
        mock_scoring.return_value = {"lead_score": 7, "lead_classification": "Morno ⚡", "lead_justification": "Interesse médio"}
        
        output_warm = await handle_lead_qualified(
            mock_db3,
            {"contact_name": "Aryaraj", "contact_phone": "558199999", "leads_table": "leads", "conversation_id": 10, "account_id": 1},
            json.dumps({"respostas": {"email": "warm@teste.com"}}),
            agent_id=1
        )
        assert "PERGUNTA DE FECHAMENTO OBRIGATÓRIA" in output_warm
        assert "REGRA DE DOIS PASSOS" in output_warm


def test_qualification_prompt_strict_probing_and_no_intermediate_closing():
    """Valida que o prompt gerado exige cumprimento estrito do objetivo de sondagem e proíbe antecipação de links."""
    from agent_core.logic.qualification_prompt import build_qualification_prompt
    
    config = MagicMock()
    config.qualification_questions = json.dumps([
        {"title": "Qual é o seu nome?", "prompt": "Descubra quanto o lead ganha para qualificar", "criteria": "Renda informada"},
        {"title": "Qual é o seu email?"}
    ])
    config.qualification_final_action = "Pergunte se posso enviar o link do curso: https://pay.kiwify.com.br/teste"
    config.qualification_final_action_trigger = "all"
    
    mock_tool = MagicMock()
    mock_tool.name = "lead_qualificado"
    
    prompt = build_qualification_prompt(config, tools=[mock_tool], context_variables={"lead_already_qualified": False})
    
    # 1. Deve conter regra estrita de cumprimento do objetivo de sondagem
    assert "CUMPRIMENTO ESTRITO DO OBJETIVO DE SONDAGEM" in prompt
    assert "O cumprimento de cada etapa depende ESTRITAMENTE do seu 'Objetivo / Prompt de Sondagem'" in prompt
    
    # 2. Deve conter regra rígida proibindo antecipação de fechamento e links nas etapas intermediárias
    assert "PROIBIDO ANTECIPAR O FECHAMENTO OU MENCIONAR LINKS/OFERTAS NAS ETAPAS INTERMEDIÁRIAS" in prompt
    assert "Enquanto houver etapas pendentes de qualificação no funil, você está TERMINANTEMENTE PROIBIDO" in prompt
    assert "SOMENTE APÓS TODAS AS ETAPAS CONCLUÍDAS" in prompt


@pytest.mark.asyncio
async def test_empty_criteria_qualifies_lead_as_hot_and_applies_labels():
    """Valida que quando qualification_criteria for vazio (apenas coleta de dados), o lead conclui qualificado como Quente e recebe as etiquetas."""
    from agent_core.tools.handlers.internal import handle_lead_qualified
    
    mock_db = AsyncMock()
    mock_agent = MagicMock()
    mock_agent.qualification_labels = '["lead-qualificado"]'
    mock_agent.qualification_criteria = None  # Sem critérios definidos
    mock_agent.qualification_final_action = "Pergunte se posso enviar o link do curso."
    mock_agent.qualification_final_action_trigger = "all"

    mock_wh = MagicMock()
    mock_wh.id = 1
    mock_wh.zapvoice_url = "https://zv.test"
    mock_wh.zapvoice_api_token = "token"

    res_agent = MagicMock()
    res_agent.scalars.return_value.first.return_value = mock_agent
    res_wh = MagicMock()
    res_wh.scalars.return_value.first.return_value = mock_wh
    res_lead = MagicMock()
    res_lead.fetchone.return_value = (None, None)
    res_upd = MagicMock()
    res_upd.rowcount = 1

    mock_db.execute.side_effect = [res_agent, res_wh, res_lead, res_upd]

    with patch("zapvoice_utils.sync_conversation_labels", new_callable=AsyncMock) as mock_sync, \
         patch("lead_scoring_service.calculate_lead_score", new_callable=AsyncMock) as mock_score:
        mock_score.return_value = {
            "lead_score": 100,
            "lead_classification": "Quente 🔥",
            "lead_justification": "Lead concluiu com sucesso todas as etapas."
        }
        output = await handle_lead_qualified(
            mock_db,
            {"contact_name": "Aryaraj", "contact_phone": "5585998259497", "leads_table": "leads", "conversation_id": 105, "account_id": 1},
            json.dumps({"respostas": {"nome": "Aryaraj", "email": "aryarajunity@gmail.com"}}),
            agent_id=36
        )
        assert "Etiquetas sincronizadas: lead-qualificado" in output
        mock_sync.assert_called_once_with(
            zapvoice_url="https://zv.test",
            client_id="1",
            conversation_id=105,
            token="token",
            to_add=["lead-qualificado"],
            to_remove=[]
        )


@pytest.mark.asyncio
async def test_calculate_lead_score_empty_criteria_fallback():
    """Valida que calculate_lead_score retorna Indefinida com score None quando criteria for vazio."""
    from lead_scoring_service import calculate_lead_score
    mock_db = AsyncMock()
    res_agent = MagicMock()
    mock_agent = MagicMock()
    mock_agent.qualification_criteria = None
    res_agent.scalars.return_value.first.return_value = mock_agent
    mock_db.execute.return_value = res_agent

    result = await calculate_lead_score(mock_db, agent_id=36, respostas={"email": "teste@gmail.com"}, criteria=None)
    assert result["lead_classification"] == "Indefinida"
    assert result["lead_score"] is None


@pytest.mark.asyncio
async def test_check_and_apply_qualification_fallback_appends_closing_question():
    """Valida que o fallback de qualificação substitui despedidas genéricas e insere a pergunta da diretriz de fechamento."""
    from agent_core.tools.handlers.internal import check_and_apply_qualification_fallback
    
    mock_db = AsyncMock()
    mock_agent = MagicMock()
    mock_agent.id = 36
    mock_agent.qualification_questions = '[{"title": "Email", "prompt": "Pergunte o email"}]'
    mock_agent.qualification_funnels = None
    mock_agent.qualification_final_action = "Pergunte se eu posso enviar o link do curso para ele."
    mock_agent.qualification_final_action_trigger = "all"
    
    history = [{"role": "assistant", "content": "Por favor, me informe seu e-mail para continuarmos."}]
    message = "aryarajunity@gmail.com"
    tool_calls_log = []
    generic_response = "Muito obrigado pelas informações, Aryaraj!\n\nSe tiver mais alguma dúvida sobre o Método Laser Day, pode perguntar!"
    
    with patch("agent_core.tools.handlers.internal.handle_lead_qualified", new_callable=AsyncMock) as mock_handle:
        mock_handle.return_value = "Lead qualificado com sucesso."
        
        final_resp = await check_and_apply_qualification_fallback(
            db=mock_db,
            context_variables={"contact_name": "Aryaraj"},
            config=mock_agent,
            history=history,
            message=message,
            tool_calls_log=tool_calls_log,
            last_response=generic_response
        )
        
        assert "Posso enviar o link do curso para você?" in final_resp
        assert "Se tiver mais alguma dúvida" not in final_resp
        assert any(tc["name"] == "lead_qualificado" for tc in tool_calls_log)






