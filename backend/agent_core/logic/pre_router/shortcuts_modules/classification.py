"""Classificadores semânticos e heurísticos de intenções de mensagens para atalhos de pré-roteamento."""

import json
import logging
import re

logger = logging.getLogger(__name__)


def _is_recurrent_thank_you_or_closing(history: list) -> bool:
    """
    Verifica se a interação atual é um 2º (ou subsequente) agradecimento/encerramento CONSECUTIVO.
    Ou seja:
    1. O usuário já havia enviado um agradecimento/confirmação anteriormente no histórico recente;
    2. O assistente já respondeu a esse agradecimento anterior com 'De nada', 'Por nada', 'Disponha', etc.;
    3. E agora o usuário está enviando OUTRO agradecimento/emoji/confirmação logo em seguida.
    """
    if not history or len(history) < 2:
        return False

    common_thanks_terms = [
        "obrigado", "obrigada", "valeu", "gratidao", "gratidão", "obrigadão", "obrigadao", "thanks", "tanks",
        "ok", "blz", "show", "combinado", "perfeito", "certo", "beleza", "entendi", "tendi",
        "ta bom", "tá bom", "ta bem", "tá bem", "tudo bem", "tudo bom", "ótimo", "otimo", "maravilha",
        "👍", "👌", "👏", "🙌", "❤️", "♥️", "😊", "🥰", "🤗"
    ]

    assistant_closing_indicators = [
        "por nada", "de nada", "disponha", "imagina", "não há de quê", "nao ha de que",
        "se precisar de mais alguma coisa, é só chamar", "se precisar de mais alguma coisa, e so chamar",
        "se precisar de mais alguma coisa", "se precisar de algo, é só chamar",
        "qualquer dúvida, é só me chamar", "qualquer duvida, e so me chamar",
        "se precisar de qualquer ajuda, estou por aqui", "se precisar de qualquer ajuda",
        "estou por aqui", "estou à disposição", "estou a disposicao", "bons estudos e até logo"
    ]

    last_assistant_msg = None
    user_msg_before_assistant = None

    reversed_hist = list(reversed(history))
    for i, h in enumerate(reversed_hist):
        role = (h.get("role") if isinstance(h, dict) else getattr(h, "role", "")).lower()
        if role == "assistant" and last_assistant_msg is None:
            last_assistant_msg = (h.get("content") if isinstance(h, dict) else getattr(h, "content", "")) or ""
            for prev_h in reversed_hist[i + 1:]:
                prev_role = (prev_h.get("role") if isinstance(prev_h, dict) else getattr(prev_h, "role", "")).lower()
                if prev_role == "user":
                    user_msg_before_assistant = (prev_h.get("content") if isinstance(prev_h, dict) else getattr(prev_h, "content", "")) or ""
                    break
            break

    if not last_assistant_msg or not user_msg_before_assistant:
        return False

    last_asst_lower = last_assistant_msg.lower().strip()
    prev_user_lower = user_msg_before_assistant.lower().strip()
    prev_user_clean = re.sub(r'[^\w\s]', '', prev_user_lower).strip()

    # 1. A mensagem anterior do usuário era um agradecimento/confirmação puro?
    if "?" in user_msg_before_assistant or len(prev_user_clean.split()) > 5:
        return False

    prev_user_was_thanks = (
        any(prev_user_clean == term or prev_user_clean.startswith(term) or prev_user_clean.endswith(term) for term in common_thanks_terms) or
        any(emoji in prev_user_lower for emoji in ["👍", "👌", "👏", "🙌", "❤️", "♥️", "😊", "🥰", "🤗"])
    )

    if not prev_user_was_thanks:
        return False

    # 2. O assistente respondeu com um encerramento/cortesia de 'de nada'?
    asst_was_closing = (
        any(ind in last_asst_lower for ind in assistant_closing_indicators) or
        last_asst_lower in ["❤️", "♥️", "😊", "🥰", "🤗", "👍"] or
        last_asst_lower.startswith("por nada") or 
        last_asst_lower.startswith("de nada") or 
        last_asst_lower.startswith("disponha")
    )

    return asst_was_closing


# Alias de compatibilidade retroativa
_has_previous_assistant_closing = _is_recurrent_thank_you_or_closing


def _count_payment_issue_occurrences(history: list, current_message: str) -> int:
    """Conta quantas mensagens do usuário na conversa relatam dificuldade para pagar ou comprar."""
    payment_terms = [
        "nao consigo pagar", "não consigo pagar", "nao estou conseguindo pagar", "não estou conseguindo pagar",
        "erro no cartao", "erro no cartão", "cartao recusado", "cartão recusado", "erro no pagamento",
        "tentando pagar", "outro link", "link de pagamento", "nao consigo comprar", "não consigo comprar",
        "erro na compra", "recusou", "tentando desde", "tentando", "desde ontem"
    ]
    
    count = 0
    all_user_msgs = []
    if history:
        for h in history:
            role = (h.get('role') if isinstance(h, dict) else getattr(h, 'role', '')).lower()
            content = (h.get('content') if isinstance(h, dict) else getattr(h, 'content', ''))
            if role == "user" and content:
                all_user_msgs.append(str(content).lower())
    
    if current_message:
        all_user_msgs.append(current_message.lower())
        
    for msg in all_user_msgs:
        if any(term in msg for term in payment_terms):
            count += 1
            
    return count


def _is_generic_doubt_or_vague_topic(raw_message: str) -> bool:
    """Verifica se a mensagem do usuário é apenas uma declaração afirmativa de dúvida ou citação de um tópico genérico
    sem fazer uma pergunta objetiva (ex: 'Não finalizei tive umas duvida', 'Sobre a máquina', 'tenho dúvidas')."""
    if not raw_message or not raw_message.strip():
        return False

    msg_clean = raw_message.lower().strip()

    # Negações de dúvida expressas (NUNCA devem ser tratadas como pedido de esclarecimento)
    negative_doubt_patterns = [
        r'\bn[aã]o\s+(?:tenho|possuo|tem|fiquei|fiquei\s+com|restou|h[aá]|tenha)\s+(?:mais\s+|nenhuma\s+|qualquer\s+|outra\s+)*d[uú]vidas?\b',
        r'\bsem\s+(?:mais\s+)?d[uú]vidas?\b',
        r'\b(?:nenhuma|zero)\s+d[uú]vidas?\b',
        r'\b(?:entendi|compreendi)(?:\s+perfeitamente|\s+tudo)?\b',
        r'\btudo\s+(?:certo|claro|esclarecido|entendido|tranquilo)\b',
        r'\b(?:j[aá]\s+)?(?:esclareceu|tirou|resolveu)\s+(?:as\s+|a\s+|minha\s+|minhas\s+)?d[uú]vidas?\b',
        r'^n[aã]o\s+tenho$',
        r'\b(?:era\s+)?s[oó]\s+isso(?:\s+mesmo)?\b',
        r'\b(?:mais\s+nada|nada\s+mais)\b',
        r'\bpor\s+enquanto\s+[eé]\s+s[oó]\b'
    ]
    if any(re.search(p, msg_clean) for p in negative_doubt_patterns):
        return False

    # Palavras explícitas que indicam uma pergunta real com intenção específica
    explicit_question_words = [
        "qual", "quais", "como", "quanto", "quantos", "quanta", "quantas",
        "quem", "onde", "quando", "por que", "porque", "porquê", "pode",
        "consigo", "funciona", "custa", "valor", "preço", "preco",
        "oferece", "disponibiliza", "inclui", "indica", "indicam", "comprar", "alugar"
    ]

    if any(re.search(r'\b' + re.escape(w) + r'\b', msg_clean) for w in explicit_question_words):
        return False

    if "?" in raw_message and len(msg_clean.split()) > 3:
        return False

    # Declaração AFIRMATIVA de dúvida (ex: "tenho uma dúvida", "estou com dúvida", "fiquei com dúvida", "dúvidas sobre...")
    has_affirmative_doubt = bool(re.search(
        r'\b(?:tenho|estou\s+com|fiquei\s+com|surgiu|apareceu|tive|com)\s+(?:uma\s+|umas\s+|alguma\s+|algumas\s+|outra\s+)?d[uú]vidas?\b|'
        r'\bd[uú]vidas?\s+(?:sobre|a\s+respeito|no|na|com|referente)\b|'
        r'^(?:minha\s+)?d[uú]vidas?(?:\s+seria)?\b',
        msg_clean
    ))
    is_about_topic = bool(re.search(r'^(?:sobre|a respeito|referente|relacionado)\s+(?:a|o|as|os)?\s*', msg_clean))
    is_unfinished = bool(re.search(r'\bn[aã]o\s+(?:finalizei|conclui|comprei|terminei)\b', msg_clean))

    if has_affirmative_doubt or is_about_topic or is_unfinished:
        return True

    return False


def _is_closing_or_no_more_doubts(raw_message: str, history: list = None) -> bool:
    """
    Verifica se a mensagem do usuário é uma despedida ou encerramento por ausência de mais dúvidas
    (ex: 'Tchau', 'Adeus', 'Não era só isso mesmo', 'Era só isso', 'Só isso mesmo', 'Não preciso de mais nada',
    'Entendi perfeitamente e não tenho mais dúvidas', 'Sem mais dúvidas').
    """
    if not raw_message or not raw_message.strip():
        return False

    msg_clean = raw_message.lower().strip()
    msg_clean_no_punct = re.sub(r'[^\w\s]', '', msg_clean).strip()

    # Se contém uma pergunta real, não pode ser encerramento
    has_real_question = "?" in raw_message or any(re.search(r'\b' + re.escape(w) + r'\b', msg_clean) for w in [
        "qual", "quais", "como", "quanto", "quantos", "quem", "onde", "quando",
        "por que", "porque", "porquê", "pode", "consigo", "funciona", "custa", "valor", "preço", "preco", "comprar", "alugar"
    ])
    if has_real_question:
        return False

    farewell_exact_phrases = {
        "tchau", "tchau tchau", "tchauzinho", "adeus", "ate logo", "até logo",
        "ate mais", "até mais", "ate breve", "até breve", "falou", "valeu tchau", "obrigado tchau",
        "nao era so isso", "não era só isso", "nao era so isso mesmo", "não era só isso mesmo",
        "era so isso", "era só isso", "era so isso mesmo", "era só isso mesmo",
        "so isso", "só isso", "so isso mesmo", "só isso mesmo",
        "so essa duvida", "só essa dúvida", "era so essa duvida", "era só essa dúvida",
        "nao tenho mais duvidas", "não tenho mais dúvidas", "sem mais duvidas", "sem mais dúvidas",
        "nao possuo mais duvidas", "não possuo mais dúvidas", "nao possuo mais duvida", "não possuo mais dúvida",
        "sem duvidas por aqui", "sem dúvidas por aqui", "sem mais duvidas por aqui", "sem mais dúvidas por aqui",
        "nao preciso de mais nada", "não preciso de mais nada",
        "por enquanto e so", "por enquanto é só"
    }

    if msg_clean_no_punct in farewell_exact_phrases:
        return True

    farewell_patterns = [
        r'^(?:tchau|adeus|at[eé]\s+(?:logo|mais|breve)|falou)(?:[,.]?\s*obrigad[oa])?$',
        r'^(?:obrigad[oa][,.]?\s*)?(?:tchau|adeus|at[eé]\s+(?:logo|mais|breve)|falou)$',
        r'^(?:n[aã]o\s+)?(?:era\s+)?s[oó]\s+isso(?:\s+mesmo)?$',
        r'^n[aã]o\s+(?:tenho|possuo)\s+mais\s+d[uú]vidas?$',
        r'^sem\s+d[uú]vidas?(?:\s+por\s+aqui)?$',
        r'^n[aã]o\s+preciso\s+de\s+mais\s+nada$',
        r'^por\s+enquanto\s+[eé]\s+s[oó]$',
        r'\b(?:n[aã]o\s+(?:tenho|possuo|restou|fiquei\s+com|h[aá]|tenha)\s+(?:mais\s+|nenhuma\s+|qualquer\s+|outra\s+)*d[uú]vidas?|sem\s+(?:mais\s+)?d[uú]vidas?|(?:zero|nenhuma)\s+d[uú]vidas?)\b',
        r'\b(?:entendi|compreendi)(?:\s+perfeitamente|\s+tudo)?(?:\s+(?:e\s+)?(?:n[aã]o\s+(?:tenho|possuo)|sem|zero)\s+d[uú]vidas?)\b',
        r'\b(?:(?:era\s+)?s[oó]\s+isso(?:\s+mesmo)?|n[aã]o\s+preciso\s+de\s+mais\s+nada|por\s+enquanto\s+[eé]\s+s[oó])\b'
    ]
    if any(re.search(p, msg_clean) for p in farewell_patterns):
        return True

    return False


def _is_explicit_farewell(raw_message: str) -> bool:
    """Verifica se o usuário está explicitamente se despedindo (ex: tchau, adeus, até mais)."""
    if not raw_message or not str(raw_message).strip():
        return False
    msg_clean = str(raw_message).lower().strip()
    msg_clean_no_punct = re.sub(r'[^\w\s]', '', msg_clean).strip()
    farewell_exact = {
        "tchau", "tchau tchau", "tchauzinho", "adeus", "ate logo", "até logo",
        "ate mais", "até mais", "ate breve", "até breve", "falou", "valeu tchau", "obrigado tchau"
    }
    if msg_clean_no_punct in farewell_exact:
        return True
    farewell_patterns = [
        r'^(?:tchau|adeus|at[eé]\s+(?:logo|mais|breve)|falou)(?:[,.]?\s*obrigad[oa])?$',
        r'^(?:obrigad[oa][,.]?\s*)?(?:tchau|adeus|at[eé]\s+(?:logo|mais|breve)|falou)$'
    ]
    return any(bool(re.search(p, msg_clean)) for p in farewell_patterns)


def _agent_has_active_qualification_funnel(main_agent, context_variables: dict = None) -> bool:
    """Verifica se o agente possui funil de qualificação ativo com etapas pendentes."""
    try:
        from agent_core.logic.qualification_prompt import resolve_active_qualification_funnel
    except Exception:
        try:
            from ...logic.qualification_prompt import resolve_active_qualification_funnel
        except Exception:
            return False

    context_vars = context_variables or {}
    if context_vars.get("lead_already_qualified", False):
        return False

    active_funnel_id = context_vars.get("active_qualification_funnel_id")
    funnel = resolve_active_qualification_funnel(main_agent, active_funnel_id)
    questions = funnel.get("questions")
    if not questions:
        return False
    if isinstance(questions, str):
        try:
            questions = json.loads(questions)
        except Exception:
            return bool(str(questions).strip())
    if isinstance(questions, list):
        return len(questions) > 0
    return False


def _is_purchase_declaration(raw_user_message: str) -> bool:
    """Verifica se a mensagem do usuário declara que já comprou, já pagou ou já é aluno."""
    if not raw_user_message or not raw_user_message.strip():
        return False
    msg_clean = raw_user_message.lower().strip()
    
    # Excluir negações ou dúvidas sobre compra
    negative_patterns = [
        "não comprei", "nao comprei", "não paguei", "nao paguei", "não fiz o pagamento", "nao fiz o pagamento",
        "quero comprar", "como compro", "onde compro", "vou comprar", "se eu comprar", "quando comprar",
        "pensando em comprar", "pretendo comprar", "posso comprar", "dúvida sobre compra", "duvida sobre compra"
    ]
    if any(neg in msg_clean for neg in negative_patterns):
        return False
        
    purchase_patterns = [
        r'\b(?:j[aá]\s+)?(?:comprei|paguei|adquiri)\b',
        r'\b(?:j[aá]\s+)?fiz\s+(?:o\s+pagamento|a\s+compra|(?:a\s+)?(?:minha\s+)?matr[ií]cula)\b',
        r'\b(?:j[aá]\s+)?(?:sou\s+alun[oa]|me\s+matriculei)\b',
        r'\b(?:comprei|paguei)\s+(?:ontem|hoje|o\s+curso|no\s+pix|no\s+cart[aã]o|pelo\s+cart[aã]o|pelo\s+pix|no\s+boleto)\b'
    ]
    return any(re.search(p, msg_clean) for p in purchase_patterns)


def _is_disinterest_declaration(raw_user_message: str) -> bool:
    """Verifica se a mensagem do usuário declara explicitamente que não tem interesse ou não vai comprar."""
    if not raw_user_message or not raw_user_message.strip():
        return False
    msg_clean = raw_user_message.lower().strip()

    # Excluir declarações positivas de interesse
    if "tenho interesse" in msg_clean and "não tenho interesse" not in msg_clean and "nao tenho interesse" not in msg_clean:
        return False

    # Padrões objetivos de desinteresse ou recusa de compra
    disinterest_patterns = [
        r'\b(?:n[aã]o|sem)\s+(?:tenho\s+)?interesse\b',
        r'\bn[aã]o\s+me\s+interessa\b',
        r'\bn[aã]o\s+(?:quero|vou|pretendo)\s+(?:comprar|adquirir|fechar|assinar|pagar|fazer\s+o\s+curso|o\s+curso|nada)\b',
        r'\bn[aã]o\s+(?:vou\s+)?querer\b',
        r'\bdesisti(?:\s+de\s+comprar|\s+do\s+curso)?\b',
        r'\bpode\s+cancelar\b',
        r'\bn[aã]o\s+quero\s+(?:mais\s+)?(?:receber\s+)?mensage(?:m|ns)\b',
        r'\b(?:pare|n[aã]o\s+precisa|n[aã]o\s+mande?)\s+(?:de\s+)?(?:me\s+)?(?:mandar|enviar)\s+(?:mais\s+)?mensage(?:m|ns)\b',
        r'\b(?:tira|remova)\s+(?:o\s+)?meu\s+(?:n[uú]mero|contato)\b'
    ]
    return any(re.search(p, msg_clean) for p in disinterest_patterns)
