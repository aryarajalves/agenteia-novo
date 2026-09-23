import re
import sys
import logging
from ..utils import format_whatsapp_message
from ..security import verify_output_safety, validate_response_ai
from ..memory import update_user_memory
from ..tools.handlers.internal import check_and_apply_qualification_fallback

logger = logging.getLogger(__name__)


def _get_core_attr(attr_name: str, default_val):
    """Obtém atributo de agent_core.core se disponível (para respeitar patches e mocks em testes)."""
    core_mod = sys.modules.get("agent_core.core")
    if core_mod and hasattr(core_mod, attr_name):
        return getattr(core_mod, attr_name)
    return default_val


async def process_final_response(
    last_response: str,
    handoff_data: dict,
    config,
    history: list,
    message: str,
    context_variables: dict,
    db,
    tool_calls_log: list,
    has_lead_qualified: bool,
    on_step: callable = None
) -> str:
    """Aplica filtros de segurança, auditoria, formatação e persistência de memória à resposta final."""
    session_id = (context_variables or {}).get("session_id")

    fn_verify_safety = _get_core_attr("verify_output_safety", verify_output_safety)
    fn_validate_ai = _get_core_attr("validate_response_ai", validate_response_ai)
    fn_update_mem = _get_core_attr("update_user_memory", update_user_memory)
    fn_qual_fallback = _get_core_attr("check_and_apply_qualification_fallback", check_and_apply_qualification_fallback)
    fn_format_wpp = _get_core_attr("format_whatsapp_message", format_whatsapp_message)

    if has_lead_qualified:
        last_response = await fn_qual_fallback(
            db, context_variables, config, history, message, tool_calls_log, last_response, on_step
        )

    last_response = str(last_response) if last_response is not None else ""
    
    if not last_response.strip() and (handoff_data or {}).get("handoff"):
        last_response = "Entendi perfeitamente. Registrei sua dúvida e transferi seu atendimento para nossa equipe especializada para que você receba o suporte adequado. Um momento, por favor! ✨"

    # Remove tags residuais que a IA possa ter 'vazado' (Ex: {ferramenta}{...})
    last_response = re.sub(r'\{[a-zA-Z0-9_-]+\}\s*\{.*?\}', '', last_response).strip()
    last_response = re.sub(r'\{[a-zA-Z0-9_-]+\}', '', last_response).strip()
    final_content = fn_verify_safety(last_response, config)

    # Auditoria por IA (Double-Check)
    if getattr(config, 'security_validator_ia', False):
        try:
            if on_step:
                on_step("🛡️ Iniciando Auditoria por IA", "Verificando se a resposta gerada viola as diretrizes de segurança.")
            audit = await fn_validate_ai(final_content, config)
            if not audit.get("is_safe", True):
                if on_step:
                    on_step("🚨 Bloqueio por Segurança", f"Resposta bloqueada. Motivo: {audit.get('reason')}")
                final_content = "Desculpe, não posso ajudar com este tema específico. Como posso te ajudar com outro assunto?"
            else:
                if on_step:
                    on_step("🛡️ Auditoria por IA Concluída", "A resposta gerada foi considerada segura.")
        except Exception as e_audit:
            logger.error(f"Erro ao processar auditoria de IA no core: {e_audit}")

    # Mensagem de Primeira Pergunta (Append)
    is_first_msg = not history or len(history) == 0 or not any((h.get('role') if isinstance(h, dict) else getattr(h, 'role', '')) == 'assistant' for h in history)
    init_q_msg = getattr(config, 'initial_question_message', None)
    question_mode = getattr(config, 'question_mode', 'panel')
    is_handoff = (handoff_data or {}).get("handoff", False)
    
    if is_first_msg and final_content and not is_handoff and question_mode in ("panel", "disabled"):
        pattern = r'(?:[\n\s]+)?(?:Posso|Deseja|Quer|Como posso|Você possui|Mais alguma|Se tiver|Qualquer).*?(?:dúvida|ajuda|ajudar|pergunta|esclarecer|algo mais|mais alguma).*?\?\s*$'
        match = re.search(pattern, str(final_content), re.IGNORECASE | re.DOTALL)
        if match:
            final_content = final_content[:match.start()].strip()
            
        if question_mode == "panel" and init_q_msg and not str(final_content).endswith(str(init_q_msg)):
            final_content = f"{final_content}\n\n{init_q_msg}"

    # Formatação inteligente para WhatsApp
    if final_content and not is_handoff:
        final_content = fn_format_wpp(final_content)
    
    # Atualização de memória
    if db and session_id and last_response:
        msg_for_memory = (context_variables or {}).get("raw_user_message") or message
        saved_facts = await fn_update_mem(db, session_id, msg_for_memory, last_response, on_step=on_step)
        if saved_facts and isinstance(saved_facts, dict):
            for k_m, v_m in saved_facts.items():
                context_variables[k_m] = v_m

    return final_content
