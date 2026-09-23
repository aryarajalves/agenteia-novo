import re
import sys
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models import GlobalContextVariableModel, UserMemoryModel
from core.timezone import get_now_br
from .substitution import resolve_conditional_blocks
from .strict_rules_prompt import get_core_system_prompt_rules, get_strict_rules_prompt
from .qualification_prompt import build_qualification_prompt
from ..memory import fetch_user_memory

logger = logging.getLogger(__name__)


def _get_core_attr(attr_name: str, default_val):
    """Obtém atributo de agent_core.core se disponível (para respeitar patches e mocks em testes)."""
    core_mod = sys.modules.get("agent_core.core")
    if core_mod and hasattr(core_mod, attr_name):
        return getattr(core_mod, attr_name)
    return default_val


async def prepare_context_variables(context_variables: dict, db=None) -> dict:
    """Injeta variáveis temporais do Brasil e mescla variáveis salvas na memória do usuário."""
    context_variables = context_variables or {}
    now_br = get_now_br()
    dias_semana_portugues = [
        "segunda-feira", "terça-feira", "quarta-feira", 
        "quinta-feira", "sexta-feira", "sábado", "domingo"
    ]

    if "dia_semana" not in context_variables or context_variables["dia_semana"] is None:
        context_variables["dia_semana"] = dias_semana_portugues[now_br.weekday()]
    if "data_atual" not in context_variables or context_variables["data_atual"] is None:
        context_variables["data_atual"] = now_br.strftime("%Y-%m-%d")
    if "hora_atual" not in context_variables or context_variables["hora_atual"] is None:
        context_variables["hora_atual"] = now_br.strftime("%H:%M")

    session_id = context_variables.get("session_id")
    if db and session_id:
        try:
            stmt_vars = select(GlobalContextVariableModel).where(GlobalContextVariableModel.extraction_method == "ai")
            if isinstance(db, AsyncSession):
                res_vars = await db.execute(stmt_vars)
            else:
                res_vars = db.execute(stmt_vars)
            ai_vars = res_vars.scalars().all()

            if ai_vars:
                ai_keys = [v.key for v in ai_vars]
                stmt_mem = select(UserMemoryModel).where(
                    UserMemoryModel.session_id == str(session_id),
                    UserMemoryModel.key.in_(ai_keys)
                )
                if isinstance(db, AsyncSession):
                    res_mem = await db.execute(stmt_mem)
                else:
                    res_mem = db.execute(stmt_mem)
                memories = res_mem.scalars().all()
                mem_dict = {m.key: m.value for m in memories}

                for v in ai_vars:
                    if v.key in mem_dict and mem_dict[v.key] is not None:
                        context_variables[v.key] = mem_dict[v.key]
                    elif v.key not in context_variables or context_variables[v.key] is None:
                        context_variables[v.key] = v.value
        except Exception as e_ctx:
            logger.warning(f"Aviso ao mesclar variáveis de contexto da memória: {e_ctx}")

    return context_variables


async def build_system_prompt_messages(
    config, 
    context_variables: dict, 
    tools: list = None, 
    history: list = None, 
    db=None
) -> list:
    """Monta a estrutura de mensagens de sistema, aplicando regras estritas, diretrizes dinâmicas e memória de longo prazo."""
    fn_resolve_cond = _get_core_attr("resolve_conditional_blocks", resolve_conditional_blocks)
    fn_fetch_mem = _get_core_attr("fetch_user_memory", fetch_user_memory)

    system_prompt = getattr(config, 'system_prompt', '') or ""
    if system_prompt and isinstance(system_prompt, str):
        system_prompt = re.sub(r'(?m)^[ \t]*#+[ \t]*', '', system_prompt)
    else:
        system_prompt = str(system_prompt) if system_prompt and not hasattr(system_prompt, '_mock_name') else ""

    system_prompt += get_core_system_prompt_rules()
    system_prompt = fn_resolve_cond(system_prompt, context_variables)
    for k, v in context_variables.items():
        if isinstance(system_prompt, str):
            system_prompt = system_prompt.replace("{" + k + "}", str(v) if v is not None else "")

    dynamic_prompt = getattr(config, 'dynamic_prompt', '') or ''
    if dynamic_prompt and not hasattr(dynamic_prompt, '_mock_name'):
        dynamic_prompt = fn_resolve_cond(dynamic_prompt, context_variables)
        for k, v in context_variables.items():
            if isinstance(dynamic_prompt, str):
                dynamic_prompt = dynamic_prompt.replace("{" + k + "}", str(v) if v is not None else "")
        if isinstance(system_prompt, str):
            system_prompt += f"\n\n### DIRETRIZES E REGRAS DINÂMICAS DO AGENTE:\n{dynamic_prompt}"

    if context_variables and isinstance(system_prompt, str):
        tech_context = "\n\n# CONTEXTO TÉCNICO (Use para preencher parâmetros de ferramentas):\n"
        has_tech_context = False
        for key in ["account_id", "conversation_id", "contact_phone", "contact_name", "webhook_config_id"]:
            if key in context_variables and context_variables[key]:
                tech_context += f"- {key}: {context_variables[key]}\n"
                has_tech_context = True
        if has_tech_context:
            system_prompt += tech_context

    if isinstance(system_prompt, str):
        system_prompt += get_strict_rules_prompt()

    custom_unanswered_prompt = getattr(config, 'unanswered_question_prompt', None)
    if custom_unanswered_prompt and str(custom_unanswered_prompt).strip() and not hasattr(custom_unanswered_prompt, '_mock_name'):
        if isinstance(system_prompt, str):
            system_prompt += f"\n\n### 📝 DIRETRIZ PERSONALIZADA DE RESPOSTA AO REGISTRAR DÚVIDA:\nQuando você acionar a ferramenta `registrar_duvida_sem_resposta`, você DEVE OBRIGATORIAMENTE seguir esta instrução para formular sua resposta ao cliente:\n\"{str(custom_unanswered_prompt).strip()}\"\n"

    qual_prompt_text = build_qualification_prompt(config, tools, context_variables, history=history)
    if qual_prompt_text and isinstance(system_prompt, str):
        system_prompt += qual_prompt_text

    security_rules = ""
    lang_complexity = getattr(config, 'security_language_complexity', 'standard') or 'standard'
    if lang_complexity == 'simple':
        security_rules += "\n- **Estilo de Linguagem Simples (OBRIGATÓRIO):** Use respostas curtas, linguagem muito simples, clara e sem jargões técnicos ou comerciais complexos."
    elif lang_complexity == 'technical':
        security_rules += "\n- **Estilo de Linguagem Técnico (OBRIGATÓRIO):** Use respostas precisas, formais, completas e termos técnicos adequados."
    elif lang_complexity == 'standard':
        security_rules += "\n- **Estilo de Linguagem Padrão (OBRIGATÓRIO):** Escreva de forma natural, coloquial, amigável e fluida."

    forbidden_topics = getattr(config, 'security_forbidden_topics', None)
    if forbidden_topics and not hasattr(forbidden_topics, '_mock_name'):
        security_rules += f"\n- **TÓPICOS PROIBIDOS (NÃO FALE SOBRE ISSO):** Você está expressamente proibido de discutir, responder ou comentar sobre os seguintes temas: {forbidden_topics}. Caso o usuário pergunte algo sobre esses temas, desvie educadamente ou diga que não pode ajudar com esse assunto específico."

    competitor_blacklist = getattr(config, 'security_competitor_blacklist', None)
    if competitor_blacklist and not hasattr(competitor_blacklist, '_mock_name'):
        security_rules += f"\n- **CONCORRENTES PROIBIDOS (BLACKLIST):** É estritamente proibido citar, comparar ou validar os seguintes concorrentes: {competitor_blacklist}. Se o usuário mencionar algum deles, ignore a menção, mude de assunto ou foque exclusivamente nos nossos diferenciais, sem pronunciar ou confirmar o nome do concorrente."

    discount_policy = getattr(config, 'security_discount_policy', None)
    if discount_policy and not hasattr(discount_policy, '_mock_name'):
        security_rules += f"\n- **POLÍTICA DE DESCONTOS (REGRAS RÍGIDAS DE PRECIFICAÇÃO):** Você deve seguir rigorosamente a seguinte regra para descontos ou condições especiais: {discount_policy}. NUNCA ofereça, confirme ou invente qualquer desconto ou condição que viole ou não esteja prevista nesta política."

    if security_rules and isinstance(system_prompt, str):
        system_prompt += "\n\n### DIRETRIZES DE SEGURANÇA E ESTILO (SEGUIR À RISCA):\n" + security_rules

    messages = [{"role": "system", "content": system_prompt}]

    session_id = context_variables.get("session_id")
    if db and session_id:
        mem = await fn_fetch_mem(db, session_id)
        if mem:
            messages.insert(1, {"role": "system", "content": f"INFORMAÇÃO CRUCIAL:\n{mem}"})

    return messages
