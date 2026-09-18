import json
import logging
from .qualification_prompt import resolve_active_qualification_funnel

logger = logging.getLogger(__name__)


def prepare_agent_tools(
    tools: list,
    config,
    context_variables: dict,
    pre_router_result: dict,
    is_already_qualified: bool,
    has_lead_qualified: bool
) -> list:
    """Monta a lista de ferramentas da OpenAI respeitando permissoes e filtros do Pre-Router."""
    openai_tools = []
    if tools:
        for t in tools:
            if getattr(t, "name", "") == "lead_qualificado" and is_already_qualified:
                continue
            openai_tools.append({
                "type": "function",
                "function": {
                    "name": t.name,
                    "description": t.description,
                    "parameters": json.loads(t.parameters_schema) if isinstance(t.parameters_schema, str) else t.parameters_schema
                }
            })

    if getattr(config, 'handoff_enabled', False):
        openai_tools.append({
            "type": "function",
            "function": {
                "name": "transferir_suporte_humano",
                "description": (
                    "Transfere a conversa para um atendente humano. "
                    "REGRAS RIGIDAS: 1. Use APENAS se o usuario pedir explicitamente ('quero falar com alguem', 'me passa pra um atendente'). "
                    "2. NUNCA use se voce simplesmente nao souber uma resposta (para isso, use 'registrar_duvida_sem_resposta'). "
                    "3. NUNCA assuma que nomes desconhecidos sao de atendentes."
                ),
                "parameters": {
                    "type": "object",
                    "properties": {
                        "motivo": {"type": "string", "description": "Motivo real e especifico solicitado pelo usuario"}
                    },
                    "required": ["motivo"]
                }
            }
        })

    has_unanswered = any(t.name == "registrar_duvida_sem_resposta" for t in tools) if tools else False
    if not has_unanswered:
        openai_tools.append({
            "type": "function",
            "function": {
                "name": "registrar_duvida_sem_resposta",
                "description": (
                    "Chame esta ferramenta APENAS quando o conhecimento (RAG) E o seu prompt de sistema nao forem suficientes para responder. "
                    "Se a informacao (ex: nome de um funcionario ou politica) estiver no seu prompt, use-a e NAO chame esta ferramenta. "
                    "Isso registra a duvida para a equipe verificar depois."
                ),
                "parameters": {
                    "type": "object",
                    "properties": {
                        "pergunta": {"type": "string", "description": "A pergunta exata do usuario"}
                    },
                    "required": ["pergunta"]
                }
            }
        })

    active_funnel_for_tool = resolve_active_qualification_funnel(
        config,
        (context_variables or {}).get("active_qualification_funnel_id")
    )
    if active_funnel_for_tool.get("questions") and has_lead_qualified:
        openai_tools.append({
            "type": "function",
            "function": {
                "name": "lead_qualificado",
                "description": (
                    "Chame esta ferramenta quando o usuario responder com sucesso todas as perguntas de qualificacao. "
                    "Passe no dicionario de respostas as chaves representando cada pergunta e o valor respondido pelo usuario."
                ),
                "parameters": {
                    "type": "object",
                    "properties": {
                        "respostas": {
                            "type": "object",
                            "description": "Objeto chave-valor contendo cada pergunta e a resposta fornecida pelo usuario"
                        }
                    },
                    "required": ["respostas"]
                }
            }
        })

    pr_result = pre_router_result or {}
    if pr_result.get("precisa_ferramenta") is False:
        allowed = (["registrar_duvida_sem_resposta"] if pr_result.get("precisa_rag") else []) + (["lead_qualificado"] if has_lead_qualified else [])
        openai_tools = [t for t in openai_tools if t.get("function", {}).get("name") in allowed]
    else:
        has_pre_executed_handoff = False
        if pr_result.get("chamada_ferramenta"):
            tc_name = pr_result["chamada_ferramenta"].get("nome")
            if tc_name in ["transferir_atendimento", "transferir_suporte_humano"]:
                has_pre_executed_handoff = True
        
        if not has_pre_executed_handoff:
            openai_tools = [t for t in openai_tools if t["function"]["name"] not in ["transferir_atendimento", "transferir_suporte_humano"]]

    return openai_tools