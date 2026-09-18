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
            for prev_h in reversed_hist[i+1:]:
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
        # Padrões flexíveis com prefixos de entendimento/confirmação ("Entendi perfeitamente e não tenho mais dúvidas", "Tudo claro, sem dúvidas")
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


def is_user_accepting_assistant_offer(mensagem: str, history: list = None) -> tuple[bool, str]:
    """
    Verifica se o usuário está aceitando uma oferta feita pelo assistente no turno anterior,
    como envio de link de inscrição/checkout, formas de pagamento ou materiais.
    Retorna (True, 'link'|'pagamento'|'material') se for aceite, ou (False, '').
    """
    if not mensagem or not str(mensagem).strip() or not history or not isinstance(history, list):
        return False, ""

    msg_raw = str(mensagem).strip()
    msg_clean = re.sub(r'[^\w\s]', '', msg_raw.lower()).strip()
    words = msg_clean.split()

    # Busca a última mensagem enviada pelo assistente no histórico
    last_agent_msg = ""
    for h in reversed(history):
        role = h.get("role", "") if isinstance(h, dict) else getattr(h, "role", "")
        dono = h.get("dono", "") if isinstance(h, dict) else getattr(h, "dono", "")
        if role in ("assistant", "agent", "bot") or dono in ("agente", "bot"):
            c = h.get("content", "") if isinstance(h, dict) else getattr(h, "content", "")
            if c and str(c).strip():
                last_agent_msg = str(c).strip().lower()
                break

    if not last_agent_msg:
        return False, ""

    # Verifica se o assistente fez uma oferta ou convite na última mensagem
    has_link_offer = (
        ("link" in last_agent_msg or "inscrição" in last_agent_msg or "inscricao" in last_agent_msg or
         "checkout" in last_agent_msg or "matrícula" in last_agent_msg or "matricula" in last_agent_msg or
         "garantir sua vaga" in last_agent_msg or "página oficial" in last_agent_msg or "pagina oficial" in last_agent_msg or
         "link de pagamento" in last_agent_msg or "link do curso" in last_agent_msg or "link de compra" in last_agent_msg) and
        any(trigger in last_agent_msg for trigger in [
            "quer", "posso", "gostaria", "deseja", "mando", "envio", "mandar", "enviar",
            "passar", "encaminhar", "avisa", "avise", "liberar", "?"
        ])
    )

    has_payment_offer = (
        ("pagamento" in last_agent_msg or "pagamentos" in last_agent_msg or "valores" in last_agent_msg or "preço" in last_agent_msg or "preco" in last_agent_msg) and
        any(trigger in last_agent_msg for trigger in ["quer", "posso", "gostaria", "deseja", "saber", "ver", "conhecer", "passar", "passo", "?"])
    )

    has_material_offer = (
        ("material" in last_agent_msg or "conteúdo" in last_agent_msg or "conteudo" in last_agent_msg or "ementa" in last_agent_msg or "grade" in last_agent_msg) and
        any(trigger in last_agent_msg for trigger in ["quer", "posso", "gostaria", "deseja", "ver", "conhecer", "passar", "passo", "enviar", "mandar", "?"])
    )

    if not (has_link_offer or has_payment_offer or has_material_offer):
        return False, ""

    # Padrões de aceitação explícita de link pelo usuário
    explicit_link_requests = [
        "manda o link", "manda link", "envia o link", "envie o link", "mande o link",
        "quero o link", "passa o link", "pode mandar o link", "pode enviar o link",
        "manda o link por favor", "envia o link por favor", "link por favor", "o link"
    ]
    if any(req in msg_clean for req in explicit_link_requests):
        return True, "link"

    # Aceites gerais / curtos (até 7 palavras) sem interrogação
    if len(words) <= 7 and "?" not in msg_raw:
        acceptance_phrases = [
            "pode enviar", "pode mandar", "pode passar", "pode ser", "pode sim", "pode",
            "manda", "envia", "mande", "envie", "manda ai", "manda aí", "manda aqui", "manda pra mim",
            "manda por favor", "envie por favor", "envia por favor", "mande por favor",
            "sim", "sim por favor", "sim quero", "sim pode", "sim pode mandar", "sim pode enviar",
            "sim manda", "sim envia", "quero", "quero sim", "com certeza", "claro", "por favor",
            "aceito", "gostaria", "gostaria sim", "favor enviar", "favor mandar", "isso", "perfeito manda",
            "opa manda", "pode encaminhar", "encaminha", "mande ver", "bora", "com certeza pode enviar"
        ]
        if any(msg_clean == p or msg_clean.startswith(p + " ") or msg_clean.endswith(" " + p) for p in acceptance_phrases):
            if has_link_offer:
                return True, "link"
            elif has_payment_offer:
                return True, "pagamento"
            elif has_material_offer:
                return True, "material"

    return False, ""


def is_user_answering_assistant_question(mensagem: str, history: list = None) -> bool:
    """
    Verifica se a mensagem do usuário é uma resposta conversacional a uma pergunta
    feita anteriormente pelo assistente (ex: qualificação, objetivo, confirmação, experiência)
    e que NÃO deve ser enviada para consulta no Cache Semântico nem tratada como dúvida de RAG.
    """
    if not mensagem or not str(mensagem).strip():
        return False

    # Se o usuário está aceitando uma oferta do assistente (ex: link, pagamento), NÃO é resposta passiva de qualificação!
    is_accepting, _ = is_user_accepting_assistant_offer(mensagem, history)
    if is_accepting:
        return False
        
    msg_raw = str(mensagem).strip()
    msg_clean = re.sub(r'[^\w\s]', '', msg_raw.lower()).strip()
    
    # Se o usuário fez uma pergunta explícita sobre o produto/curso, precisa ser tratada como dúvida
    explicit_doubts_regex = (
        r'\b(?:quem\s+(?:[ée]|s[aã]o|ministra|ensina|criou|fez|d[aá]|atende|trabalha)|'
        r'o\s+que\s+(?:[ée]|ensina|tem|vou\s+aprender|est[aá]\s+incluso)|'
        r'qual\s+(?:[ée]|o\s+valor|o\s+pre[çc]o|a\s+dura[çc][aã]o|o\s+hor[aá]rio|a\s+ementa|o\s+conte[uú]do|a\s+plataforma|o\s+link|a\s+garantia|o\s+curso)|'
        r'quais\s+(?:s[aã]o|os\s+conte[uú]dos|as\s+formas|os\s+m[oó]dulos|os\s+b[oô]nus|os\s+procedimentos|os\s+cursos)|'
        r'como\s+(?:funciona|[ée]|fa[çc]o|posso|acessar|entrar|comprar|alugar|emitir|receber)|'
        r'quanto\s+(?:custa|[ée]|tempo|vale)|'
        r'quantas?\s+(?:aulas?|horas?|sess[oõ]es?|dias?)|'
        r'onde\s+(?:fica|[ée]|comprar|alugar|encontrar|acessar|assistir)|'
        r'quando\s+(?:come[çc]a|[ée]|inicia|vai\s+ser|acontece)|'
        r'por\s*que|porque|pra\s+que|'
        r'(?:tem|possui|oferece|disponibiliza|d[aá]|emite)\s+(?:certificado|garantia|suporte|acesso|nota|desconto|material|apostila|grupo)|'
        r'aceita\s+(?:cart[aã]o|pix|boleto|parcelamento)|'
        r'(?:posso|consigo|d[aá]\s+pra)\s+(?:fazer|alugar|parcelar|comprar|assistir|trabalhar|atender)|'
        r'vale\s+a\s+pena)\b'
    )
    if re.search(explicit_doubts_regex, msg_raw, re.IGNORECASE):
        return False
        
    # Se a mensagem contiver termos interrogativos no início ou acompanhados de '?'
    interrogative_words = ["o que", "como", "qual", "quais", "onde", "quando", "quanto", "quantos", "quanta", "quantas", "quem", "porque", "por que"]
    if any(term in msg_clean for term in interrogative_words):
        if "?" in msg_raw or any(msg_clean.startswith(term) for term in interrogative_words):
            return False

    # 1. Verifica se há histórico e se o último turno do assistente foi uma pergunta de qualificação
    if history and isinstance(history, list):
        last_agent_msg = ""
        for h in reversed(history):
            role = h.get("role", "") if isinstance(h, dict) else getattr(h, "role", "")
            dono = h.get("dono", "") if isinstance(h, dict) else getattr(h, "dono", "")
            if role in ("assistant", "agent", "bot") or dono in ("agente", "bot"):
                c = h.get("content", "") if isinstance(h, dict) else getattr(h, "content", "")
                if c and str(c).strip():
                    last_agent_msg = str(c).strip()
                    break
        
        if last_agent_msg:
            # Se o assistente perguntou se o usuário tem dúvidas (ex: "Qual sua dúvida?", "Tem alguma dúvida?", "Ficou com dúvidas?"),
            # o usuário NÃO está respondendo a uma pergunta de qualificação, está enviando sua dúvida!
            inviting_doubts_patterns = [
                r'\bqual\s+(?:sua|a\s+sua)\s+d[uú]vida\b',
                r'\btem\s+(?:mais\s+)?alguma\s+d[uú]vida\b',
                r'\bficou\s+(?:com\s+)?(?:alguma\s+)?d[uú]vida\b',
                r'\bem\s+que\s+posso\s+(?:te\s+)?ajudar\b',
                r'\bcomo\s+posso\s+(?:te\s+)?ajudar\b'
            ]
            if any(re.search(p, last_agent_msg, re.IGNORECASE) for p in inviting_doubts_patterns):
                # Se o usuário respondeu negativamente declarando que NÃO tem dúvidas, ele está respondendo à pergunta do assistente!
                negation_answering_prefixes = ("nao", "não", "nenhum", "nenhuma", "zero", "sem duvida", "sem dúvida")
                if any(msg_clean.startswith(p) for p in negation_answering_prefixes):
                    return True
                return False

            # Perguntas específicas de nome feitas pelo assistente
            asking_name_patterns = [
                r'\bqual\s+(?:[ée]\s+)?(?:o\s+)?seu\s+nome\b',
                r'\bcomo\s+(?:voc[eê]\s+)?se\s+chama\b',
                r'\bme\s+(?:diga|fala|conta)\s+seu\s+nome\b',
                r'\bseu\s+nome\b'
            ]
            if any(re.search(p, last_agent_msg, re.IGNORECASE) for p in asking_name_patterns):
                if "?" not in msg_raw and not any(term in msg_clean for term in interrogative_words):
                    return True

            has_assistant_q = "?" in last_agent_msg or any(term in last_agent_msg.lower() for term in [
                "qual", "como", "você", "voce", "já atua", "ja atua", "começando", "comecando", "objetivo", "interesse", "me conte"
            ])
            if has_assistant_q:
                lead_response_prefixes = (
                    "sim", "nao", "não", "já", "ja", "ainda", "nunca", "começando", "comecando",
                    "sou", "tenho", "trabalho", "atuo", "meu objetivo", "quero", "pretendo",
                    "estou", "faço", "faco", "atendo", "moro", "meu nome", "me chamo", "nenhuma", "nenhum", "nada"
                )
                if any(msg_clean.startswith(p) for p in lead_response_prefixes):
                    return True

                # Resposta curta direta (até 5 palavras) sem interrogação ou termos de dúvida
                words_list = msg_clean.split()
                if len(words_list) <= 5 and "?" not in msg_raw:
                    if not any(term in msg_clean for term in interrogative_words):
                        return True

    # 2. Se a mensagem não contiver '?' e for puramente declarativa/pessoal sem termos de dúvida
    if "?" not in msg_raw:
        personal_declaration_prefixes = (
            "sim", "já", "ja", "sou", "tenho", "trabalho", "atuo", "começando", "comecando",
            "meu objetivo", "quero me qualificar", "quero aprender", "pretendo", "estou começando", "estou comecando"
        )
        if any(msg_clean.startswith(p) for p in personal_declaration_prefixes):
            return True

    return False


def check_programmatic_shortcuts(
    raw_user_message: str,
    history: list,
    main_agent,
    is_first_msg: bool,
    is_ad: bool,
    similarity_info: str,
    cleaned_message: str,
    message: str,
    context_variables: dict = None
) -> dict | None:
    """Verifica e executa todos os atalhos determinísticos/programáticos rápidos antes de chamar o LLM."""
    has_prev_closing = _is_recurrent_thank_you_or_closing(history)
    
    # Listas de saudações e agradecimentos comuns
    common_greetings = ["oi", "ola", "oie", "oiee", "bom dia", "boa tarde", "boa noite"]
    common_thanks = ["obrigado", "obrigada", "valeu", "gratidao", "obrigadao", "thanks", "tanks"]
    common_emojis = ["👍🏻", "👍🏼", "👍🏽", "👍🏾", "👍🏿", "👌🏻", "👌🏼", "👌🏽", "👌🏾", "👌🏿", "👍", "👌", "👏", "🙌", "✌️", "❤️", "✔️", "☑️", "✅", "🆗"]
    negative_emojis = ["👎🏻", "👎🏼", "👎🏽", "👎🏾", "👎🏿", "🖕🏻", "🖕🏼", "🖕🏽", "🖕🏾", "🖕🏿", "👎", "🖕", "😡", "😠", "🤬", "😕", "🙁", "☹️", "😢", "😭"]
    common_confirmations = [
        "ok", "blz", "show", "combinado", "perfeito", "certo", "beleza", "entendi", "tendi",
        "tá", "ta", "sim", "isso", "fechado", "ta bom", "tá bom", "ta bem", "tá bem",
        "tudo bem", "tudo bom", "tá certo", "ta certo", "tá ótimo", "ta otimo", "ótimo", "otimo",
        "maravilha", "belezinha", "fechou", "tá joia", "ta joia", "joia", "jóia", "combinadíssimo", "combinadissimo"
    ]
    
    initial_msg = getattr(main_agent, 'initial_message', None)
    if not initial_msg or str(initial_msg).strip().lower() in ["", "none", "null"]:
        initial_msg = "Olá! Como posso ajudar?"

    msg_clean_no_punct = cleaned_message.lower().strip()
    for char in ["?", "!", ".", ",", ";", ":", "-", "_", "(", ")", "[", "]", "{", "}"]:
        msg_clean_no_punct = msg_clean_no_punct.replace(char, "")
    msg_clean_no_punct = msg_clean_no_punct.strip()

    msg_no_emojis = msg_clean_no_punct
    has_reaction_emoji = False
    has_negative_emoji = False
    
    for em in negative_emojis:
        if em in msg_no_emojis:
            has_negative_emoji = True
        msg_no_emojis = msg_no_emojis.replace(em, "")
        
    for em in common_emojis:
        if em in msg_no_emojis:
            has_reaction_emoji = True
        msg_no_emojis = msg_no_emojis.replace(em, "")
        
    msg_no_emojis = msg_no_emojis.strip()

    # Declarações de compra não são interceptadas com resposta estática pré-programada (shortcut-logic).
    # Toda mensagem de compra/aluno segue para análise e resposta contextual da IA,
    # mantendo apenas o flag interno para rotulação e cancelamento de follow-up.

    # 1b. Atalho para Resposta de E-mail / Cadastro de Lead (fornecendo e-mail no fluxo de qualificação)
    email_match = re.search(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b', raw_user_message.strip())
    if email_match and len(raw_user_message.strip().split()) <= 4:
        logger.info(f"📧 [EMAIL DETECTED] E-mail do usuário detectado: '{email_match.group(0)}'. Desativando RAG para continuidade do fluxo de atendimento/qualificação.")
        return {
            "eh_saudacao": False,
            "eh_agradecimento": False,
            "eh_agradecimento_recorrente": False,
            "eh_mensagem_automatica": False,
            "precisa_esclarecimento": False,
            "resposta_esclarecimento": None,
            "eh_anuncio": is_ad,
            "detalhe_anuncio": similarity_info,
            "resposta_direta": None,
            "perguntas_extraidas": raw_user_message.strip(),
            "lista_perguntas_extraidas": [],
            "id_agente_alvo": main_agent.id,
            "precisa_ferramenta": False,
            "chamada_ferramenta": None,
            "precisa_rag": False,
            "data_extraida": None,
            "mensagem_original": raw_user_message,
            "mensagem_melhorada": None,
            "tipo_mensagem": "Resposta de Dados / E-mail do Usuário",
            "_model_used": "shortcut-logic"
        }

    target_msg_for_questions = cleaned_message if is_ad else raw_user_message
    has_real_question = "?" in target_msg_for_questions or any(term in target_msg_for_questions.lower() for term in [
        "qual", "como", "quanto", "quem", "onde", "quando", "pode", "precisa",
        "faz", "curso", "valor", "preço", "preco", "gostaria", "tenho interesse", "funciona",
        "endereço", "endereco", "horario", "horário", "ajuda",
        "inscrição", "incrição", "requisito", "formação", "formacao", "posso", "consigo",
        "serve", "aula", "aulas", "plano", "planos", "comprar", "alugar", "saber mais"
    ])

    # 1b. Atalho para Dificuldade Recorrente no Pagamento (>= 3 mensagens relatando erro/tentativa)
    payment_issue_count = _count_payment_issue_occurrences(history, raw_user_message)
    if payment_issue_count >= 3:
        return {
            "eh_saudacao": False,
            "eh_agradecimento": False,
            "eh_agradecimento_recorrente": False,
            "precisa_esclarecimento": False,
            "resposta_esclarecimento": None,
            "id_agente_alvo": main_agent.id,
            "chamada_ferramenta": {
                "name": "transferir_suporte_humano",
                "arguments": {"motivo": f"Dificuldade recorrente de pagamento ({payment_issue_count} mensagens do cliente tentando pagar sem sucesso)"}
            },
            "resposta_direta": "Poxa, lamento muito que esteja com dificuldades para concluir o pagamento! Vou te transferir agora mesmo para nossa equipe de suporte humano para te ajudar a finalizar certinho. Um momento, por favor! 😊",
            "perguntas_extraidas": None,
            "lista_perguntas_extraidas": [],
            "data_extraida": None,
            "precisa_rag": False,
            "eh_anuncio": is_ad,
            "detalhe_anuncio": similarity_info,
            "mensagem_original": raw_user_message,
            "mensagem_melhorada": None,
            "tipo_mensagem": "Dificuldade Recorrente de Pagamento (Transferir para Suporte Humano)",
            "_model_used": "shortcut-logic"
        }

    # 1c. Atalho para Encerramento / Sem Mais Dúvidas ("Não era só isso mesmo", "Só isso mesmo", "Não preciso de mais nada")
    if _is_closing_or_no_more_doubts(raw_user_message, history):
        has_active_funnel = _agent_has_active_qualification_funnel(main_agent, context_variables)
        if has_active_funnel and not _is_explicit_farewell(raw_user_message):
            logger.info(f"🎯 [QUALIFICATION FUNNEL] Lead declarou ausência de dúvidas ('{raw_user_message}'), mas o agente possui funil de qualificação ativo com etapas pendentes. Prosseguindo para o Agente Principal continuar o funil.")
            return {
                "eh_saudacao": False,
                "eh_agradecimento": False,
                "eh_agradecimento_recorrente": False,
                "eh_mensagem_automatica": False,
                "eh_resposta_ao_agente": True,
                "precisa_esclarecimento": False,
                "resposta_esclarecimento": None,
                "eh_anuncio": is_ad,
                "detalhe_anuncio": similarity_info,
                "resposta_direta": None,
                "perguntas_extraidas": None,
                "lista_perguntas_extraidas": [],
                "id_agente_alvo": main_agent.id,
                "precisa_ferramenta": False,
                "chamada_ferramenta": None,
                "precisa_rag": False,
                "data_extraida": None,
                "mensagem_original": raw_user_message,
                "mensagem_melhorada": None,
                "tipo_mensagem": "Resposta de Ausência de Dúvidas / Continuidade de Qualificação",
                "_model_used": "shortcut-logic"
            }

        if has_prev_closing:
            return {
                "eh_saudacao": True,
                "eh_agradecimento": True,
                "eh_agradecimento_recorrente": True,
                "precisa_esclarecimento": False,
                "resposta_esclarecimento": None,
                "id_agente_alvo": main_agent.id,
                "resposta_direta": None,
                "perguntas_extraidas": None,
                "lista_perguntas_extraidas": [],
                "data_extraida": None,
                "precisa_rag": False,
                "eh_anuncio": is_ad,
                "detalhe_anuncio": similarity_info,
                "mensagem_original": raw_user_message,
                "mensagem_melhorada": message if message != raw_user_message else None,
                "tipo_mensagem": "Agradecimento / Encerramento Recorrente (Não Responder)",
                "motivo_silencio": "2º agradecimento/encerramento consecutivo detectado. Automação silenciada para evitar envio de mensagens infinitamente.",
                "_model_used": "shortcut-logic"
            }
        else:
            return {
                "eh_saudacao": True,
                "eh_agradecimento": True,
                "eh_agradecimento_recorrente": False,
                "precisa_esclarecimento": False,
                "resposta_esclarecimento": None,
                "id_agente_alvo": main_agent.id,
                "resposta_direta": "Perfeito! Fico à disposição se precisar de qualquer outra informação ou se tiver alguma dúvida. Bons estudos e até logo! 😊",
                "perguntas_extraidas": None,
                "lista_perguntas_extraidas": [],
                "data_extraida": None,
                "precisa_rag": False,
                "eh_anuncio": is_ad,
                "detalhe_anuncio": similarity_info,
                "mensagem_original": raw_user_message,
                "mensagem_melhorada": message if message != raw_user_message else None,
                "tipo_mensagem": "Encerramento / Sem Mais Dúvidas (Atalho Programático)",
                "_model_used": "shortcut-logic"
            }

    # 1d. Atalho para Respostas Negativas / Conversacionais Curtas (Ex: "Não", "Nao", "Ainda não", "Nenhuma", "Não trabalho na área", "Não tenho dúvidas", "Era só isso")
    short_negations = {
        "nao", "não", "nao.", "não.", "nao nao", "não não",
        "nenhuma", "nenhum", "nada", "nada mais", "mais nada",
        "ainda nao", "ainda não", "por enquanto nao", "por enquanto não",
        "nao tenho", "não tenho", "nao trabalho", "não trabalho", "nao atuo", "não atuo",
        "nao sou", "não sou", "começando do zero", "comecando do zero", "do zero",
        "nunca trabalhei", "nunca atuei", "nao tenho curso", "não tenho curso",
        "nao era so isso", "não era só isso", "nao era so isso mesmo", "não era só isso mesmo",
        "era so isso", "era só isso", "era so isso mesmo", "era só isso mesmo",
        "so isso", "só isso", "so isso mesmo", "só isso mesmo",
        "so essa duvida", "só essa dúvida", "era so essa duvida", "era só essa dúvida",
        "nao tenho mais duvidas", "não tenho mais dúvidas", "sem mais duvidas", "sem mais dúvidas",
        "sem duvidas", "sem dúvidas", "por enquanto e so", "por enquanto é só",
        "nao preciso de mais nada", "não preciso de mais nada", "tudo certo", "tudo claro"
    }
    if (msg_clean_no_punct in short_negations or bool(re.match(r'^(?:n[aã]o|nenhum[a]?|nada|ainda\s+n[aã]o|sem\s+d[uú]vidas?|era\s+s[oó]|s[oó]\s+isso|por\s+enquanto)\b', msg_clean_no_punct))) and not has_real_question:
        logger.info(f"🛑 [CONVERSATIONAL NEGATION] Resposta negativa conversacional detectada: '{raw_user_message}'. Desativando RAG e mantendo texto original para continuidade do atendimento.")
        return {
            "eh_saudacao": False,
            "eh_agradecimento": False,
            "eh_agradecimento_recorrente": False,
            "eh_mensagem_automatica": False,
            "precisa_esclarecimento": False,
            "resposta_esclarecimento": None,
            "eh_anuncio": is_ad,
            "detalhe_anuncio": similarity_info,
            "resposta_direta": None,
            "perguntas_extraidas": raw_user_message.strip(),
            "lista_perguntas_extraidas": [],
            "id_agente_alvo": main_agent.id,
            "precisa_ferramenta": False,
            "chamada_ferramenta": None,
            "precisa_rag": False,
            "data_extraida": None,
            "mensagem_original": raw_user_message,
            "mensagem_melhorada": raw_user_message,
            "tipo_mensagem": "Resposta Conversacional / Qualificação do Usuário",
            "_model_used": "shortcut-logic"
        }

    is_thank_you = (msg_clean_no_punct in common_thanks) or (msg_no_emojis in common_thanks)

    # 3. Saudação simples ou Anúncio puro sem perguntas (apenas se não houver pergunta)
    if not has_real_question and (msg_clean_no_punct in common_greetings or (msg_clean_no_punct == "" and (not raw_user_message.strip() or is_ad))):
        greeting_prefix = None
        if "bom dia" in msg_clean_no_punct:
            greeting_prefix = "Bom dia!"
        elif "boa tarde" in msg_clean_no_punct:
            greeting_prefix = "Boa tarde!"
        elif "boa noite" in msg_clean_no_punct:
            greeting_prefix = "Boa noite!"

        if is_first_msg:
            if initial_msg:
                clean_initial = initial_msg.strip()
                if greeting_prefix:
                    match_lead_greet = re.match(r'^(?:oi|olá|ola|oie|oiee|bom dia|boa tarde|boa noite)[\s,!-]*', clean_initial, re.IGNORECASE)
                    if match_lead_greet:
                        rest_of_msg = clean_initial[match_lead_greet.end():].lstrip()
                        resposta = f"{greeting_prefix} {rest_of_msg}".strip()
                    else:
                        resposta = f"{greeting_prefix} {clean_initial}".strip()
                else:
                    resposta = clean_initial
            else:
                prefix = greeting_prefix or "Olá!"
                resposta = f"{prefix} Como posso te ajudar?"
        else:
            if greeting_prefix:
                resposta = f"{greeting_prefix} Como posso te ajudar?"
            else:
                resposta = "Olá! Como posso te ajudar?"

        if getattr(main_agent, 'greeting_mode', 'prompt') == 'disabled':
            logger.info(f"🚫 [GREETING DISABLED] Saudação inicial desativada nas configurações do agente. Pulando atalho programático de saudação.")
            return None
        elif getattr(main_agent, 'greeting_mode', 'prompt') == 'panel':
            return {
                "eh_saudacao": True,
                "eh_agradecimento": False,
                "precisa_esclarecimento": False,
                "id_agente_alvo": main_agent.id,
                "resposta_direta": resposta,
                "perguntas_extraidas": None,
                "lista_perguntas_extraidas": [],
                "data_extraida": None,
                "precisa_rag": False,
                "eh_anuncio": is_ad,
                "detalhe_anuncio": similarity_info,
                "mensagem_original": raw_user_message,
                "mensagem_melhorada": message if message != raw_user_message else None,
                "tipo_mensagem": "Saudação (Atalho Programático)",
                "_model_used": "shortcut-logic"
            }
    elif is_thank_you:
        if has_prev_closing:
            return {
                "eh_saudacao": True,
                "eh_agradecimento": True,
                "eh_agradecimento_recorrente": True,
                "precisa_esclarecimento": False,
                "id_agente_alvo": main_agent.id,
                "resposta_direta": None,
                "perguntas_extraidas": None,
                "lista_perguntas_extraidas": [],
                "data_extraida": None,
                "precisa_rag": False,
                "eh_anuncio": is_ad,
                "detalhe_anuncio": similarity_info,
                "mensagem_original": raw_user_message,
                "mensagem_melhorada": message if message != raw_user_message else None,
                "tipo_mensagem": "Agradecimento Recorrente (Não Responder)",
                "motivo_silencio": "2º agradecimento/encerramento consecutivo detectado. Automação silenciada para evitar envio de mensagens infinitamente.",
                "_model_used": "shortcut-logic"
            }
        # Não interceptamos o 1º agradecimento via shortcut-logic!
        # Delegamos para a LLM pequena do Pré-Router (router_simple_model / gpt-4o-mini)
        # para entender contextualmente o que o usuário deseja e gastar poucos tokens reais.
        return None
    else:
        is_pure_emoji_reaction = (has_reaction_emoji or has_negative_emoji) and msg_no_emojis == ""
        is_confirmation_word = msg_clean_no_punct in common_confirmations or msg_no_emojis in common_confirmations
        
        if is_pure_emoji_reaction or is_confirmation_word:
            if has_negative_emoji and is_pure_emoji_reaction:
                return {
                    "eh_saudacao": True,
                    "eh_agradecimento": False,
                    "eh_emoji_negativo": True,
                    "precisa_esclarecimento": False,
                    "id_agente_alvo": main_agent.id,
                    "resposta_direta": "Puxa, sinto muito! 😕 Percebi que algo não deu certo. O que aconteceu? Como posso te ajudar a resolver de uma forma melhor?",
                    "perguntas_extraidas": None,
                    "lista_perguntas_extraidas": [],
                    "data_extraida": None,
                    "precisa_rag": False,
                    "eh_anuncio": is_ad,
                    "detalhe_anuncio": similarity_info,
                    "mensagem_original": raw_user_message,
                    "mensagem_melhorada": message if message != raw_user_message else None,
                    "tipo_mensagem": "Emoji Negativo / Insatisfação (Atalho Empático)",
                    "_model_used": "shortcut-logic"
                }

            last_assistant_asked = False
            if history:
                for h in reversed(history):
                    if h.get("role") == "assistant":
                        content = h.get("content", "")
                        if "?" in content:
                            last_assistant_asked = True
                        break
            
            if is_pure_emoji_reaction or not last_assistant_asked:
                if has_prev_closing:
                    return {
                        "eh_saudacao": True,
                        "eh_agradecimento": True,
                        "eh_agradecimento_recorrente": True,
                        "precisa_esclarecimento": False,
                        "id_agente_alvo": main_agent.id,
                        "resposta_direta": None,
                        "perguntas_extraidas": None,
                        "lista_perguntas_extraidas": [],
                        "data_extraida": None,
                        "precisa_rag": False,
                        "eh_anuncio": is_ad,
                        "detalhe_anuncio": similarity_info,
                        "mensagem_original": raw_user_message,
                        "mensagem_melhorada": message if message != raw_user_message else None,
                        "tipo_mensagem": "Agradecimento Recorrente (Não Responder)",
                        "motivo_silencio": "2º agradecimento/encerramento consecutivo detectado. Automação silenciada para evitar envio de mensagens infinitamente.",
                        "_model_used": "shortcut-logic"
                    }
                else:
                    resposta_confirmacao = "Perfeito! Se precisar de mais alguma coisa, é só chamar. 😊"
                    if "combinado" in msg_clean_no_punct:
                        resposta_confirmacao = "Combinado! Qualquer dúvida, estou por aqui. 😉"
                    elif "ok" in msg_clean_no_punct:
                        resposta_confirmacao = "Combinado! Se precisar de algo, é só chamar. 👍"
                    elif "certo" in msg_clean_no_punct:
                        resposta_confirmacao = "Certo! Se precisar de mais alguma ajuda, estou à disposição. 👍"
                    elif any(t in msg_clean_no_punct for t in ["ta bom", "tá bom", "ta bem", "tá bem", "tudo bem", "tudo bom"]):
                        resposta_confirmacao = "Combinado! Se precisar de qualquer ajuda, estou por aqui. 😊"
                    elif any(t in msg_clean_no_punct for t in ["ótimo", "otimo", "maravilha", "show", "beleza", "blz"]):
                        resposta_confirmacao = "Maravilha! Qualquer dúvida, é só me chamar por aqui. 😊"
                        
                    return {
                        "eh_saudacao": True,
                        "eh_agradecimento": False,
                        "precisa_esclarecimento": False,
                        "id_agente_alvo": main_agent.id,
                        "resposta_direta": resposta_confirmacao,
                        "perguntas_extraidas": None,
                        "lista_perguntas_extraidas": [],
                        "data_extraida": None,
                        "precisa_rag": False,
                        "eh_anuncio": is_ad,
                        "detalhe_anuncio": similarity_info,
                        "mensagem_original": raw_user_message,
                        "mensagem_melhorada": message if message != raw_user_message else None,
                        "tipo_mensagem": "Confirmação / Reação (Atalho Programático)",
                        "_model_used": "shortcut-logic"
                    }

    return None
