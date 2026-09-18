import pytest
import json
from unittest.mock import AsyncMock, MagicMock, patch
from agent_core.logic.qualification_prompt import (
    resolve_active_qualification_funnel,
    build_qualification_prompt
)

def test_resolve_active_qualification_funnel_legacy_fallback():
    """Valida fallback seguro para campos legados quando qualification_funnels não existe."""
    mock_config = MagicMock()
    mock_config.qualification_funnels = None
    mock_config.qualification_questions = json.dumps(["Qual seu nome?", "Qual seu faturamento?"])
    mock_config.qualification_labels = '["lead-legado"]'
    mock_config.qualification_final_action = "Link legado: https://checkout.test/legado"
    mock_config.qualification_final_action_trigger = "hot"
    mock_config.qualification_criteria = "Critério legado"

    res = resolve_active_qualification_funnel(mock_config, None)
    assert res["id"] == "default"
    assert res["name"] == "Padrão"
    assert "Qual seu nome?" in res["questions"]
    assert res["labels"] == '["lead-legado"]'
    assert res["final_action"] == "Link legado: https://checkout.test/legado"
    assert res["final_action_trigger"] == "hot"
    assert res["criteria"] == "Critério legado"

def test_resolve_active_qualification_funnel_selection():
    """Valida seleção de funil específico e funil padrão quando há múltiplos funis configurados."""
    mock_config = MagicMock()
    funnels = [
        {
            "id": "funnel_principal",
            "name": "Funil Principal",
            "is_default": True,
            "questions": [{"title": "Nome"}, {"title": "Profissão"}],
            "labels": ["lead-principal"],
            "final_action": "Enviar link do curso geral",
            "final_action_trigger": "all",
            "criteria": "Critério geral"
        },
        {
            "id": "mentoria",
            "name": "Venda de Mentoria",
            "is_default": False,
            "questions": [{"title": "Faturamento Atual"}, {"title": "Tamanho da Equipe"}],
            "labels": ["lead-mentoria-vip"],
            "final_action": "Convidar para sessão estratégica de mentoria",
            "final_action_trigger": "hot",
            "criteria": "Critério mentoria VIP"
        }
    ]
    mock_config.qualification_funnels = json.dumps(funnels)

    # 1. Sem active_funnel_id -> seleciona o padrão (funnel_principal)
    default_res = resolve_active_qualification_funnel(mock_config, None)
    assert default_res["id"] == "funnel_principal"
    assert default_res["name"] == "Funil Principal"
    assert default_res["labels"] == ["lead-principal"]

    # 2. Com active_funnel_id="mentoria" -> seleciona o funil de mentoria
    mentoria_res = resolve_active_qualification_funnel(mock_config, "mentoria")
    assert mentoria_res["id"] == "mentoria"
    assert mentoria_res["name"] == "Venda de Mentoria"
    assert mentoria_res["labels"] == ["lead-mentoria-vip"]
    assert mentoria_res["final_action"] == "Convidar para sessão estratégica de mentoria"
    assert mentoria_res["final_action_trigger"] == "hot"

    # 3. Com active_funnel_id inexistente -> fallback para o padrão
    fallback_res = resolve_active_qualification_funnel(mock_config, "id_inexistente")
    assert fallback_res["id"] == "funnel_principal"

def test_build_qualification_prompt_with_multiple_funnels():
    """Valida que o prompt de qualificação gerado reflete as perguntas e fechamento do funil ativo."""
    mock_config = MagicMock()
    funnels = [
        {
            "id": "evento_presencial",
            "name": "Imersão Presencial",
            "is_default": True,
            "questions": [
                {"title": "Cidade", "prompt": "Pergunte em qual cidade o lead reside", "criteria": "Cidade informada"}
            ],
            "labels": ["imersao-presencial"],
            "final_action": "Pergunte se posso enviar o link do ingresso VIP.",
            "final_action_trigger": "hot"
        }
    ]
    mock_config.qualification_funnels = json.dumps(funnels)
    mock_tool = MagicMock()
    mock_tool.name = "lead_qualificado"

    prompt = build_qualification_prompt(mock_config, [mock_tool], context_variables={"active_qualification_funnel_id": "evento_presencial"})
    assert "[ETAPA: Cidade]" in prompt
    assert "Pergunte em qual cidade o lead reside" in prompt
    assert "Pergunte se posso enviar o link do ingresso VIP." in prompt
    assert "E o lead for classificado como Quente 🔥" in prompt

@pytest.mark.asyncio
async def test_handle_lead_qualified_with_active_funnel():
    """Valida que handle_lead_qualified aplica as etiquetas e critérios do funil ativo."""
    from agent_core.tools.handlers.internal import handle_lead_qualified

    mock_db = AsyncMock()
    mock_agent = MagicMock()
    funnels = [
        {
            "id": "mentoria_high_ticket",
            "name": "Mentoria High Ticket",
            "is_default": True,
            "questions": [{"title": "Renda"}],
            "labels": ["mentoria-high-ticket-qualificado"],
            "final_action": "Pergunte se posso enviar o convite para a mentoria.",
            "final_action_trigger": "hot",
            "criteria": "Critério Mentoria"
        }
    ]
    mock_agent.qualification_funnels = json.dumps(funnels)

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
         patch("lead_scoring_service.calculate_lead_score", new_callable=AsyncMock) as mock_scoring:
        mock_scoring.return_value = {"lead_score": 12, "lead_classification": "Quente 🔥", "lead_justification": "Apto para mentoria"}

        output = await handle_lead_qualified(
            mock_db,
            {
                "contact_name": "Lead Mentoria",
                "contact_phone": "5511988887777",
                "leads_table": "leads",
                "conversation_id": 50,
                "account_id": 1,
                "active_qualification_funnel_id": "mentoria_high_ticket"
            },
            json.dumps({"respostas": {"renda": "30k"}}),
            agent_id=1
        )

        assert "PERGUNTA DE FECHAMENTO OBRIGATÓRIA" in output
        assert "Pergunte se posso enviar o convite para a mentoria." in output
        # Verifica se passou a etiqueta do funil de mentoria para sincronização e to_remove vazio
        mock_sync.assert_called_once()
        _, kwargs = mock_sync.call_args
        assert "mentoria-high-ticket-qualificado" in kwargs["to_add"]
        assert kwargs["to_remove"] == []


@pytest.mark.asyncio
async def test_handle_lead_qualified_notifies_on_step_with_exact_labels():
    """Valida que handle_lead_qualified envia para o on_step o detalhe completo com a etiqueta exata e metadados."""
    from agent_core.tools.handlers.internal import handle_lead_qualified

    mock_db = AsyncMock()
    mock_agent = MagicMock()
    funnels = [
        {
            "id": "funnel_vip",
            "name": "Mentoria VIP",
            "is_default": True,
            "questions": [{"title": "Renda"}],
            "labels": ["etiqueta-vip-aprovado"],
            "final_action": "Pergunte sobre agendamento",
            "final_action_trigger": "hot",
            "criteria": "Critério VIP"
        }
    ]
    mock_agent.qualification_funnels = json.dumps(funnels)

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

    mock_on_step = MagicMock()

    with patch("zapvoice_utils.sync_conversation_labels", new_callable=AsyncMock), \
         patch("lead_scoring_service.calculate_lead_score", new_callable=AsyncMock) as mock_scoring:
        mock_scoring.return_value = {"lead_score": 10, "lead_classification": "Quente 🔥", "lead_justification": "Renda alta"}

        await handle_lead_qualified(
            mock_db,
            {
                "contact_name": "Aryaraj",
                "contact_phone": "5511999998888",
                "leads_table": "leads",
                "conversation_id": 99,
                "account_id": 1,
                "active_qualification_funnel_id": "funnel_vip"
            },
            json.dumps({"respostas": {"renda": "50k"}}),
            agent_id=1,
            on_step=mock_on_step
        )

        mock_on_step.assert_called_once()
        step_title, step_detail = mock_on_step.call_args[0]
        step_meta = mock_on_step.call_args[1].get("metadata", {})

        assert "Lead Qualificado" in step_title
        assert "Mentoria VIP" in step_detail
        assert "etiqueta-vip-aprovado" in step_detail
        assert "Quente 🔥" in step_detail
        assert "50k" in step_detail

        assert step_meta.get("labels_applied") == ["etiqueta-vip-aprovado"]
        assert step_meta.get("funnel_name") == "Mentoria VIP"
        assert step_meta.get("lead_classification") == "Quente 🔥"
        assert step_meta.get("lead_score") == 10

