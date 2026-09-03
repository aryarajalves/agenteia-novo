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
        r'\bn[aã]o\s+(?:tenho|tem|fiquei|restou|h[aá])\s+(?:nenhuma\s+)?d[uú]vidas?\b',
        r'\bsem\s+d[uú]vidas?\b',
        r'\bnenhuma\s+d[uú]vidas?\b',
        r'\bzero\s+d[uú]vidas?\b',
        r'\btudo\s+(?:certo|claro|esclarecido|tranquilo)\b',
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

    has_doubt_word = bool(re.search(r'\bd[uú]vidas?\b', msg_clean))
    is_about_topic = bool(re.search(r'^(?:sobre|a respeito|referente|relacionado)\s+(?:a|o|as|os)?\s*', msg_clean))
    is_unfinished = bool(re.search(r'\bn[aã]o\s+(?:finalizei|conclui|comprei|terminei)\b', msg_clean))

    if has_doubt_word or is_about_topic or is_unfinished:
        return True

    return False


def _is_closing_or_no_more_doubts(raw_message: str, history: list = None) -> bool:
    """
    Verifica se a mensagem do usuário é um encerramento educado, confirmação de que não restam dúvidas
    ou expressão coloquial indicando que era apenas aquilo (ex: 'Não era só isso mesmo', 'Era só isso',
    'Só isso mesmo', 'Não preciso de mais nada', 'Nada mais', 'Por enquanto é só').
    """
    if not raw_message or not raw_message.strip():
        return False

    msg_clean = raw_message.lower().strip()
    msg_clean_no_punct = re.sub(r'[^\w\s]', '', msg_clean).strip()

    # Expressões exatas comuns de encerramento / término de dúvidas
    closing_exact_phrases = {
        "nao era so isso mesmo", "não era só isso mesmo", "era so isso mesmo", "era só isso mesmo",
        "era so isso", "era só isso", "so isso mesmo", "só isso mesmo", "so isso", "só isso",
        "nao so isso", "não só isso", "nao era so isso", "não era só isso",
        "so era isso", "só era isso", "so era isso mesmo", "só era isso mesmo",
        "so essa duvida", "só essa dúvida", "era so essa duvida", "era só essa dúvida",
        "nada mais", "mais nada", "nao mais nada", "não mais nada",
        "nao preciso de mais nada", "não preciso de mais nada",
        "nao tenho mais duvidas", "não tenho mais dúvidas", "sem mais duvidas", "sem mais dúvidas",
        "por enquanto e so", "por enquanto é só", "por enquanto nao", "por enquanto não",
        "por hoje e so", "por hoje é só", "nao por enquanto", "não por enquanto",
        "nao obrigado", "não obrigado", "nao obrigada", "não obrigada"
    }

    if msg_clean_no_punct in closing_exact_phrases:
        return True

    # Padrões com regex
    closing_patterns = [
        r'^(?:n[aã]o[,.]?\s*)?(?:era\s+)?s[oó]\s+isso(?:\s+mesmo)?$',
        r'^(?:n[aã]o[,.]?\s*)?era\s+s[oó]\s+isso$',
        r'^(?:n[aã]o[,.]?\s*)?(?:mais\s+nada|nada\s+mais)$',
        r'^(?:n[aã]o[,.]?\s*)?n[aã]o\s+preciso\s+de\s+mais\s+nada$',
        r'^(?:n[aã]o[,.]?\s*)?por\s+(?:enquanto|hoje)\s+[eé]\s+s[oó]$',
        r'^(?:n[aã]o[,.]?\s*)?s[oó]\s+(?:era\s+isso|isso\s+mesmo)(?:[,.]?\s*obrigad[oa])?$',
        r'^(?:n[aã]o[,.]?\s*)?obrigad[oa][,.]?\s*(?:era\s+)?s[oó]\s+isso(?:\s+mesmo)?$'
    ]
    if any(re.search(p, msg_clean) for p in closing_patterns):
        return True

    # Se a última mensagem do assistente perguntou se o usuário tem mais alguma dúvida ou ofereceu ajuda
    if history:
        last_asst = ""
        for h in reversed(history):
            role = (h.get("role") if isinstance(h, dict) else getattr(h, "role", "")).lower()
            if role == "assistant":
                last_asst = ((h.get("content") if isinstance(h, dict) else getattr(h, "content", "")) or "").lower()
                break

        if last_asst:
            last_asst_norm = re.sub(r'\s+', ' ', last_asst).strip()
            doubt_prompts = [
                "mais alguma dúvida", "mais alguma duvida",
                "tem alguma dúvida", "tem alguma duvida",
                "possui mais alguma dúvida", "possui mais alguma duvida",
                "possui alguma dúvida", "possui alguma duvida",
                "qual sua dúvida", "qual sua duvida",
                "alguma dúvida", "alguma duvida",
                "qualquer dúvida", "qualquer duvida",
                "posso ajudar você com mais alguma",
                "posso ajudar com mais alguma",
                "posso ajudar em algo mais",
                "posso te ajudar em algo mais",
                "posso te ajudar com mais alguma"
            ]
            if any(term in last_asst_norm for term in doubt_prompts):
                if msg_clean_no_punct in [
                    "nao", "não", "nao nao", "não não", "nenhuma", "nenhum", "tranquilo",
                    "tudo certo", "tudo claro", "por enquanto nao", "por enquanto não",
                    "nada", "nada mais", "não preciso", "nao preciso", "nao obrigado", "não obrigado",
                    "nao obrigada", "não obrigada", "sem duvidas", "sem dúvidas"
                ]:
                    return True
                if re.search(r'^(?:n[aã]o|nenhuma|sem)\s+(?:mais\s+)?d[uú]vidas?$', msg_clean_no_punct):
                    return True

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


def check_programmatic_shortcuts(
    raw_user_message: str,
    history: list,
    main_agent,
    is_first_msg: bool,
    is_ad: bool,
    similarity_info: str,
    cleaned_message: str,
    message: str
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

    # 1. Atalho para Declaração de Compra Confirmada (Lead informou que já comprou/pagou)
    if _is_purchase_declaration(raw_user_message):
        return {
            "eh_saudacao": True,
            "eh_agradecimento": False,
            "eh_compra_informada": True,
            "precisa_esclarecimento": False,
            "id_agente_alvo": main_agent.id,
            "resposta_direta": "Parabéns pela sua decisão e seja muito bem-vindo(a)! 🎉 Tenho certeza de que você vai aproveitar muito o curso. Caso precise de qualquer orientação sobre o seu acesso ou tenha dúvidas, estou por aqui para te ajudar! 😊",
            "perguntas_extraidas": None,
            "lista_perguntas_extraidas": [],
            "data_extraida": None,
            "precisa_rag": False,
            "eh_anuncio": is_ad,
            "detalhe_anuncio": similarity_info,
            "mensagem_original": raw_user_message,
            "mensagem_melhorada": None,
            "tipo_mensagem": "Declaração de Compra / Aluno Confirmado",
            "_model_used": "shortcut-logic"
        }

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
                "data_extraida": None,
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

    # 1d. Atalho para Respostas Negativas / Conversacionais Curtas (Ex: "Não", "Nao", "Ainda não", "Nenhuma", "Não trabalho na área")
    short_negations = {
        "nao", "não", "nao.", "não.", "nao nao", "não não",
        "nenhuma", "nenhum", "nada", "nada mais", "mais nada",
        "ainda nao", "ainda não", "por enquanto nao", "por enquanto não",
        "nao tenho", "não tenho", "nao trabalho", "não trabalho", "nao atuo", "não atuo",
        "nao sou", "não sou", "começando do zero", "comecando do zero", "do zero",
        "nunca trabalhei", "nunca atuei", "nao tenho curso", "não tenho curso"
    }
    if (msg_clean_no_punct in short_negations or bool(re.match(r'^(?:n[aã]o|nenhum[a]?|nada|ainda\s+n[aã]o|sem\s+d[uú]vidas?)\b', msg_clean_no_punct))) and not has_real_question:
        logger.info(f"🛑 [CONVERSATIONAL NEGATION] Resposta negativa conversacional detectada: '{raw_user_message}'. Desativando RAG e mantendo texto original para continuidade do atendimento.")
        return {
            "eh_saudacao": False,
            "eh_agradecimento": False,
            "eh_agradecimento_recorrente": False,
            "eh_mensagem_automatica": False,
            "precisa_esclarecimento": False,
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

    # 2. Declaração de dúvida genérica ou tópico vago
    if _is_generic_doubt_or_vague_topic(raw_user_message):
        topic_match = re.search(r'(?:sobre|a respeito|referente|relacionado)\s+(?:a|o|as|os)?\s*([a-z0-9áàâãéèêíïóôõöúçñ\s]+)', raw_user_message.lower().strip())
        if topic_match:
            topic_str = topic_match.group(1).strip()
            topic_str = re.sub(r'^(?:a|o|as|os)\s+', '', topic_str).strip()
            if topic_str:
                resposta_esclarecimento = f"Olá! Quais são as suas dúvidas sobre {topic_str}? Pode me dizer exatamente o que gostaria de saber para que eu possa te ajudar?"
            else:
                resposta_esclarecimento = "Olá! Pode me dizer exatamente qual é a sua dúvida? Me conte o que você gostaria de saber para que eu possa te ajudar!"
        else:
            resposta_esclarecimento = "Olá! Pode me dizer exatamente qual é a sua dúvida? Me conte o que você gostaria de saber para que eu possa te ajudar!"

        return {
            "eh_saudacao": False,
            "eh_agradecimento": False,
            "precisa_esclarecimento": True,
            "resposta_esclarecimento": resposta_esclarecimento,
            "id_agente_alvo": main_agent.id,
            "resposta_direta": None,
            "perguntas_extraidas": None,
            "lista_perguntas_extraidas": [],
            "data_extraida": None,
            "precisa_rag": False,
            "eh_anuncio": is_ad,
            "detalhe_anuncio": similarity_info,
            "mensagem_original": raw_user_message,
            "mensagem_melhorada": None,
            "tipo_mensagem": "Declaração de Dúvida / Tópico Vago (Solicitar Esclarecimento)",
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

        if getattr(main_agent, 'greeting_mode', 'prompt') == 'panel':
            return {
                "eh_saudacao": True,
                "eh_agradecimento": False,
                "precisa_esclarecimento": False,
                "id_agente_alvo": main_agent.id,
                "resposta_direta": resposta,
                "perguntas_extraidas": None,
                "data_extraida": None,
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
                "data_extraida": None,
                "eh_anuncio": is_ad,
                "detalhe_anuncio": similarity_info,
                "mensagem_original": raw_user_message,
                "mensagem_melhorada": message if message != raw_user_message else None,
                "tipo_mensagem": "Agradecimento Recorrente (Não Responder)",
                "motivo_silencio": "2º agradecimento/encerramento consecutivo detectado. Automação silenciada para evitar envio de mensagens infinitamente.",
                "_model_used": "shortcut-logic"
            }
        else:
            return {
                "eh_saudacao": True,
                "eh_agradecimento": True,
                "precisa_esclarecimento": False,
                "id_agente_alvo": main_agent.id,
                "resposta_direta": "Por nada! Se precisar de mais alguma coisa, é só chamar.",
                "perguntas_extraidas": None,
                "data_extraida": None,
                "eh_anuncio": is_ad,
                "detalhe_anuncio": similarity_info,
                "mensagem_original": raw_user_message,
                "mensagem_melhorada": message if message != raw_user_message else None,
                "tipo_mensagem": "Agradecimento (Atalho Programático)",
                "_model_used": "shortcut-logic"
            }
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
                    "data_extraida": None,
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
                        "data_extraida": None,
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
