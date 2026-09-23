"""Identificadores de aceites de ofertas e respostas contextuais a perguntas anteriores do assistente."""

import logging
import re

logger = logging.getLogger(__name__)


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
