import json
import logging
from agent_core.clients import get_openai_client

logger = logging.getLogger(__name__)

async def analyze_link_intent_with_llm(message: str, history: list, client=None) -> dict:
    """
    Utiliza uma LLM barata (gpt-4o-mini) para analisar 100% semanticamente se o usuário
    está querendo, pedindo ou aceitando receber o link do curso / inscrição / checkout.
    Zero textos ou regexes estáticos de palavras.
    """
    if not message or not str(message).strip():
        return {
            "quer_link": False,
            "motivo": "Mensagem vazia",
            "outra_duvida": None,
            "_model_used": "gpt-4o-mini-link-intent",
            "_usage": {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0}
        }

    history_formatted = ""
    recent_history = history[-6:] if (history and len(history) > 6) else (history or [])
    for h in recent_history:
        role = (h.get("role") if isinstance(h, dict) else getattr(h, "role", "user")).upper()
        content = (h.get("content") if isinstance(h, dict) else getattr(h, "content", ""))
        history_formatted += f"{role}: {content}\n\n"

    system_prompt = (
        "Você é um classificador semântico ultra-rápido de intenção em atendimento ao cliente.\n"
        "Sua função é analisar o contexto da conversa e a mensagem do usuário para determinar se o USUÁRIO quer, está pedindo ou está aceitando receber o LINK do curso / link de inscrição / link de pagamento / checkout / compra.\n\n"
        "REGRAS DE CLASSIFICAÇÃO SEMÂNTICA:\n"
        "1. ACEITE DE OFERTA: Se na conversa recente o assistente ofereceu ou perguntou se pode enviar o link (ex: 'Quer que eu te mande o link?', 'Posso te enviar o link?', 'Quer o link de inscrição?', 'Posso mandar o link para garantir sua vaga?', etc.), e a mensagem do usuário representa qualquer forma de concordância, aceite, permissão, consentimento ou entusiasmo (ex: 'sim', 'pode enviar', 'manda', 'quero', 'com certeza', 'claro', 'pode mandar', 'por favor', 'manda aí', 'manda o link', 'sim quero', 'bora', 'pode ser', 'envia', 'pode', etc.), defina 'quer_link' como TRUE.\n"
        "2. PEDIDO DIRETO: Se o usuário pediu diretamente o link de compra, inscrição, checkout, matrícula ou onde se inscreve, defina 'quer_link' como TRUE.\n"
        "3. DÚVIDAS, RECUSAS OU OUTROS ASSUNTOS: Se o usuário fez uma pergunta puramente informativa sem pedir link (ex: 'como funciona?', 'quanto custa?', 'quem ensina?'), recusou a oferta (ex: 'não', 'agora não', 'não quero'), apenas agradeceu sem pedir link, ou respondeu a uma pergunta de perfil/qualificação sem envolver link, defina 'quer_link' como FALSE.\n"
        "4. MÚLTIPLAS DÚVIDAS OU OFERTAS CONJUNTAS: Se na mensagem recente o assistente ofereceu outros tópicos além do link (ex: formas de pagamento, informações gerais do curso, ementa) e o usuário concordou (ex: 'Gostaria', 'Sim', 'Quero'), OU se o usuário aceitou o link e fez outra pergunta (ex: 'Pode enviar sim, e quanto custa?'), defina 'quer_link' como TRUE e liste as outras dúvidas correspondentes em 'duvidas_adicionais' (ex: ['Quais são as formas de pagamento do curso?']).\n\n"
        "Retorne ESTRITAMENTE um JSON com as seguintes chaves:\n"
        "{\n"
        '  "quer_link": true ou false,\n'
        '  "motivo": "explicação breve da decisão",\n'
        '  "duvidas_adicionais": ["lista de strings com outras perguntas/dúvidas, ou [] se não houver"]\n'
        "}"
    )

    user_prompt = f"{history_formatted}ÚLTIMA MENSAGEM DO USUÁRIO:\n{message}"

    if client is None:
        client = get_openai_client()

    try:
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.0,
            max_tokens=90,
            response_format={"type": "json_object"}
        )
        content_str = response.choices[0].message.content.strip()
        data = json.loads(content_str)
        usage = response.usage
        data["_usage"] = {
            "prompt_tokens": usage.prompt_tokens if usage else 0,
            "completion_tokens": usage.completion_tokens if usage else 0,
            "total_tokens": usage.total_tokens if usage else 0
        }
        data["_model_used"] = "gpt-4o-mini"
        data["_debug_prompt"] = f"SYSTEM:\n{system_prompt}\n\nUSER:\n{user_prompt}"
        logger.info(f"🧠 [LINK INTENT AI] Mensagem: '{message[:50]}' -> quer_link={data.get('quer_link')} (Motivo: {data.get('motivo')})")
        return data
    except Exception as e:
        logger.error(f"Erro no classificador semântico de link por LLM (link_intent_ai): {e}")
        return {
            "quer_link": False,
            "motivo": f"Erro: {str(e)}",
            "outra_duvida": None,
            "_model_used": "gpt-4o-mini-link-intent",
            "_usage": {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0}
        }
