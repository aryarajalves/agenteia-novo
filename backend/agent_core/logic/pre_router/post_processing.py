import re
import logging
from .shortcuts import (
    _is_closing_or_no_more_doubts,
    _is_explicit_farewell,
    _agent_has_active_qualification_funnel,
    is_user_answering_assistant_question,
    is_user_accepting_assistant_offer
)

logger = logging.getLogger(__name__)

def sanitize_and_split_questions(
    result: dict,
    raw_user_message: str,
    has_real_question: bool,
    is_first_msg: bool,
    main_agent,
    initial_msg: str,
    msg_clean_no_punct: str,
    common_confirmations: list,
    has_reaction_emoji: bool,
    history: list,
    context_variables: dict = None
) -> dict:
    if result.get("tipo_mensagem") == "Solicitação de Link do Curso (Detectado 100% por LLM)":
        result["precisa_rag"] = True
        result["eh_saudacao"] = False
        result["eh_agradecimento"] = False
        result["eh_resposta_ao_agente"] = True
        return result

    short_negations = {
        "nao", "não", "nao.", "não.", "nao nao", "não não",
        "nenhuma", "nenhum", "nada",
        "ainda nao", "ainda não", "por enquanto nao", "por enquanto não",
        "nao tenho", "não tenho", "nao trabalho", "não trabalho", "nao atuo", "não atuo",
        "nao sou", "não sou", "começando do zero", "comecando do zero", "do zero",
        "nunca trabalhei", "nunca atuei", "nao tenho curso", "não tenho curso"
    }
    has_extracted_q = bool(result.get("perguntas_extraidas") and len(str(result.get("perguntas_extraidas")).strip()) > 3 and not any(term in str(result.get("perguntas_extraidas")).lower() for term in ["não possui dúvidas", "nao possui duvidas", "sem dúvidas"]))
    is_negation_msg = (msg_clean_no_punct in short_negations or bool(re.match(r'^(?:n[aã]o|nenhum[a]?|nada|ainda\s+n[aã]o)\b', msg_clean_no_punct))) and not has_real_question
    is_answering_qual = is_user_answering_assistant_question(raw_user_message, history) and not has_real_question

    # Tratamento prioritário de Aceite de Ofertas (Links de Inscrição / Pagamento / Material): DEVE SEMPRE ACIONAR O RAG!
    is_accepting_offer, offer_topic = is_user_accepting_assistant_offer(raw_user_message, history)
    if is_accepting_offer:
        target_q = "Qual é o link do curso / link de inscrição?" if offer_topic == "link" else (
            "Quais são as formas de pagamento do curso?" if offer_topic == "pagamento" else "Qual é o conteúdo e material do curso?"
        )
        result["eh_saudacao"] = False
        result["eh_agradecimento"] = False
        result["eh_agradecimento_recorrente"] = False
        result["eh_resposta_ao_agente"] = True
        result["precisa_esclarecimento"] = False
        result["resposta_esclarecimento"] = None
        result["precisa_rag"] = True
        
        extracted = str(result.get("perguntas_extraidas") or "").strip()
        if not extracted or extracted.lower() in [raw_user_message.strip().lower(), "pode enviar", "sim", "manda", "quero", "claro", "por favor"]:
            result["perguntas_extraidas"] = target_q
            result["lista_perguntas_extraidas"] = [target_q]
        else:
            if not result.get("lista_perguntas_extraidas"):
                result["lista_perguntas_extraidas"] = [extracted]
        result["mensagem_melhorada"] = target_q
        result["tipo_mensagem"] = "Solicitação de Link / Material Ofertado"
        result["resposta_direta"] = None
        return result

    # Se a LLM já classificou como saudação/encerramento/agradecimento com resposta direta, respeitamos a decisão semântica da LLM
    if (result.get("eh_saudacao") or result.get("eh_agradecimento")) and result.get("resposta_direta"):
        is_negation_msg = False
        is_answering_qual = False

    if is_negation_msg:
        result["eh_saudacao"] = False
        result["eh_agradecimento"] = False
        result["eh_agradecimento_recorrente"] = False
        result["eh_resposta_ao_agente"] = True
        result["precisa_esclarecimento"] = False
        result["resposta_esclarecimento"] = None
        result["precisa_rag"] = False
        result["perguntas_extraidas"] = raw_user_message.strip()
        result["lista_perguntas_extraidas"] = []
        result["mensagem_melhorada"] = raw_user_message.strip()
        result["tipo_mensagem"] = "Resposta ao Agente / Declaração"
        result["resposta_direta"] = None
        return result

    if is_answering_qual and not has_real_question:
        result["eh_saudacao"] = False
        result["eh_agradecimento"] = False
        result["eh_agradecimento_recorrente"] = False
        result["eh_resposta_ao_agente"] = True
        result["precisa_esclarecimento"] = False
        result["resposta_esclarecimento"] = None
        result["precisa_rag"] = False
        result["perguntas_extraidas"] = None
        result["lista_perguntas_extraidas"] = []
        result["mensagem_melhorada"] = raw_user_message.strip()
        result["tipo_mensagem"] = "Resposta ao Agente / Declaração"
        result["resposta_direta"] = None
        return result

    if has_real_question or has_extracted_q or result.get("precisa_rag"):
        result["eh_saudacao"] = False
        result["eh_agradecimento"] = False
        result["eh_agradecimento_recorrente"] = False
        result["resposta_direta"] = None
        result["precisa_esclarecimento"] = False
        result["resposta_esclarecimento"] = None
        result["precisa_rag"] = True
        if not result.get("perguntas_extraidas"):
            result["perguntas_extraidas"] = raw_user_message
            result["lista_perguntas_extraidas"] = [raw_user_message]
        
        # Garantia de separação de múltiplas perguntas em lista_perguntas_extraidas no Python
        raw_list = result.get("lista_perguntas_extraidas") or []
        split_list = []
        if isinstance(raw_list, list) and raw_list:
            for item in raw_list:
                if isinstance(item, str):
                    if item.count("?") > 1:
                        parts = [p.strip() + ("?" if not p.strip().endswith("?") else "") for p in item.split("?") if p.strip()]
                        split_list.extend(parts)
                    elif ("," in item or ";" in item) and any(qw in item.lower() for qw in ["quanto", "qual", "como", "onde", "valor", "preço", "preco"]):
                        sub_parts = re.split(r'[,;]|\s+e\s+(?=(?:quanto|qual|como|onde|o que|tem|possui)\b)', item, flags=re.IGNORECASE)
                        valid_sp = []
                        for sp in sub_parts:
                            sp_c = sp.strip()
                            if len(sp_c) >= 3:
                                if not sp_c.endswith("?") and not sp_c.endswith("."):
                                    sp_c += "?"
                                valid_sp.append(sp_c)
                        if len(valid_sp) >= 2:
                            split_list.extend(valid_sp)
                        else:
                            split_list.append(item.strip())
                    elif item.strip():
                        split_list.append(item.strip())
            if split_list:
                result["lista_perguntas_extraidas"] = split_list

        # Garantia adicional: Verificar se o usuário enviou múltiplas linhas/perguntas e o LLM omitiu alguma delas
        raw_lines = [l.strip() for l in re.split(r'[\n\r]+|[,;]|\s+e\s+(?=(?:quanto|qual|como|onde|o que|tem|possui)\b)', raw_user_message, flags=re.IGNORECASE) if l.strip()]
        if len(raw_lines) > 1 or "?" in raw_user_message:
            current_extracted_lower = " ".join([str(x).lower() for x in result.get("lista_perguntas_extraidas", [])])
            question_triggers = [
                "de onde", "onde fica", "onde e", "onde é", "qual", "quais", "como funciona", "como", "quanto", "quantos",
                "quem", "quando", "por que", "porque", "posso", "consigo", "tem", "oferece", "certificado",
                "duracao", "duração", "suporte", "valor", "preco", "preço"
            ]

            for raw_line in raw_lines:
                line_clean = raw_line.lower().strip()
                has_q_indicator = "?" in raw_line or any(trig in line_clean for trig in question_triggers)

                if has_q_indicator:
                    keywords = [w for w in line_clean.replace("?", "").replace(",", "").split() if len(w) > 2 and w not in ["que", "com", "para", "uma", "uns", "curso", "esta", "está"]]
                    matched = any(kw in current_extracted_lower for kw in keywords) if keywords else False

                    if not matched:
                        missing_q = raw_line.strip()
                        if not missing_q.endswith("?") and not missing_q.endswith("."):
                            missing_q += "?"

                        if "de onde" in line_clean or "onde fica" in line_clean or "onde e" in line_clean or "onde é" in line_clean:
                            missing_q = "De onde você é / onde fica a sede do curso?"
                        elif "como funciona" in line_clean:
                            missing_q = "Como funciona o curso?"

                        if "lista_perguntas_extraidas" not in result or not isinstance(result["lista_perguntas_extraidas"], list):
                            result["lista_perguntas_extraidas"] = []

                        # Se missing_q for "Como funciona o curso?", inserir no início se for pergunta estrutural
                        if "como funciona" in line_clean:
                            result["lista_perguntas_extraidas"].insert(0, missing_q)
                        else:
                            result["lista_perguntas_extraidas"].append(missing_q)
                        current_extracted_lower += " " + missing_q.lower()

        if isinstance(result.get("lista_perguntas_extraidas"), list) and len(result["lista_perguntas_extraidas"]) > 1:
            link_qs = [q for q in result["lista_perguntas_extraidas"] if "link" in str(q).lower() or "inscrição" in str(q).lower() or "inscricao" in str(q).lower() or "comprar" in str(q).lower()]
            other_qs = [q for q in result["lista_perguntas_extraidas"] if q not in link_qs]
            if link_qs:
                result["lista_perguntas_extraidas"] = other_qs + link_qs
            result["perguntas_extraidas"] = "\n".join(result["lista_perguntas_extraidas"])

        # Sanitização de perguntas gerais sobre curso
        if result.get("perguntas_extraidas"):
            pe_lower = str(result["perguntas_extraidas"]).lower()
            raw_lower = raw_user_message.lower()
            if "disponíveis" in pe_lower or "disponiveis" in pe_lower:
                if "disponíveis" not in raw_lower and "disponiveis" not in raw_lower:
                    if "gostaria de saber" in raw_lower or "queria saber" in raw_lower or "saber sobre" in raw_lower or "quais os cursos" in raw_lower:
                        result["perguntas_extraidas"] = "Como funciona o curso de remoção de tatuagem?"
                        if isinstance(result.get("lista_perguntas_extraidas"), list) and len(result["lista_perguntas_extraidas"]) == 1:
                            result["lista_perguntas_extraidas"] = ["Como funciona o curso de remoção de tatuagem?"]

        # Resolução de confirmação a ofertas anteriores do assistente
        raw_clean = raw_user_message.strip().lower()
        raw_words_count = len(raw_clean.split())
        if (raw_words_count <= 4 or len(raw_clean) <= 25) and history:
            short_interest_words = ["gostaria", "quero", "sim", "pode ser", "gostaria sim", "aceito", "gostaria de saber", "manda", "envia", "mande", "envie"]
            if any(raw_clean == w or raw_clean.startswith(w) for w in short_interest_words):
                last_assistant_msg = ""
                for h in reversed(history):
                    if isinstance(h, dict) and h.get("role") == "assistant" and h.get("content"):
                        last_assistant_msg = str(h["content"]).lower()
                        break
                
                if last_assistant_msg:
                    questions_to_add = []
                    current_pe_lower = str(result.get("perguntas_extraidas") or "").lower()
                    
                    if ("pagamento" in last_assistant_msg or "pagamentos" in last_assistant_msg) and "pagamento" not in current_pe_lower:
                        questions_to_add.append("Quais são as formas de pagamento?")
                    
                    if ("link" in last_assistant_msg or "compra" in last_assistant_msg or "inscrição" in last_assistant_msg) and ("link" not in current_pe_lower and "compra" not in current_pe_lower):
                        questions_to_add.append("Qual é o link de compra / inscrição?")

                    if questions_to_add:
                        if not isinstance(result.get("lista_perguntas_extraidas"), list) or not result.get("lista_perguntas_extraidas"):
                            result["lista_perguntas_extraidas"] = ["Como funciona o curso de remoção de tatuagem?"]
                        for q in questions_to_add:
                            if q not in result["lista_perguntas_extraidas"]:
                                result["lista_perguntas_extraidas"].append(q)
                        
                        link_qs = [q for q in result["lista_perguntas_extraidas"] if "link" in str(q).lower() or "inscrição" in str(q).lower() or "inscricao" in str(q).lower() or "comprar" in str(q).lower()]
                        other_qs = [q for q in result["lista_perguntas_extraidas"] if q not in link_qs]
                        if link_qs:
                            result["lista_perguntas_extraidas"] = other_qs + link_qs
                        result["perguntas_extraidas"] = "\n".join(result["lista_perguntas_extraidas"])
    elif result.get("eh_saudacao") or result.get("eh_mensagem_automatica"):
        if result.get("eh_agradecimento"):
            if not result.get("resposta_direta") or str(result.get("resposta_direta")).strip().lower() in ["", "none", "null"]:
                result["resposta_direta"] = "Por nada! Se precisar de mais alguma coisa, é só chamar."
        elif result.get("eh_mensagem_automatica"):
            result["resposta_direta"] = None
            result["eh_saudacao"] = False
            result["perguntas_extraidas"] = None
        else:
            if is_first_msg:
                if getattr(main_agent, 'greeting_mode', 'prompt') == 'panel':
                    if not result.get("resposta_direta") or str(result.get("resposta_direta")).strip().lower() in ["", "none", "null"]:
                        result["resposta_direta"] = initial_msg
                elif getattr(main_agent, 'greeting_mode', 'prompt') == 'disabled':
                    result["resposta_direta"] = None
                    result["eh_saudacao"] = False
            else:
                if not result.get("resposta_direta"):
                    is_conf = any(term in msg_clean_no_punct for term in common_confirmations) or has_reaction_emoji
                    if is_conf:
                        result["resposta_direta"] = "Perfeito! Qualquer dúvida, estou à disposição. 😊"
                    else:
                        result["resposta_direta"] = "Olá! Como posso te ajudar?"

    # Salvaguarda rígida: Mensagens coloquiais de encerramento e negação de dúvidas NUNCA devem pedir esclarecimento
    if _is_closing_or_no_more_doubts(raw_user_message, history):
        result["precisa_esclarecimento"] = False
        result["resposta_esclarecimento"] = None
        has_active_funnel = _agent_has_active_qualification_funnel(main_agent, context_variables)
        if has_active_funnel and not _is_explicit_farewell(raw_user_message):
            result["eh_saudacao"] = False
            result["eh_agradecimento"] = False
            result["eh_resposta_ao_agente"] = True
            result["perguntas_extraidas"] = None
            result["lista_perguntas_extraidas"] = []
            result["precisa_rag"] = False
            result["resposta_direta"] = None
            result["tipo_mensagem"] = "Resposta de Ausência de Dúvidas / Continuidade de Qualificação"
        else:
            result["eh_saudacao"] = True
            result["eh_agradecimento"] = True
            result["perguntas_extraidas"] = None
            result["lista_perguntas_extraidas"] = []
            result["precisa_rag"] = False
            if not result.get("resposta_direta") or str(result.get("resposta_direta")).strip().lower() in ["", "none", "null"]:
                result["resposta_direta"] = "Perfeito! Fico à disposição se precisar de qualquer outra informação ou se tiver alguma dúvida. Bons estudos e até logo! 😊"

    return result


def format_debug_and_memory(
    result: dict,
    raw_user_message: str,
    message: str,
    system_prompt: str,
    user_prompt: str,
    model_to_use: str,
    is_ad: bool,
    similarity_info: str,
    kb_info: dict,
    history: list,
    main_agent,
    response=None
) -> dict:
    """Preenche os metadados de depuração, janela de contexto de memória e tokens utilizados."""
    result["_model_used"] = model_to_use
    result["_debug_prompt"] = f"SYSTEM:\n{system_prompt}\n\nUSER:\n{user_prompt}"
    result["mensagem_original"] = raw_user_message
    
    if result.get("perguntas_extraidas"):
        lower_ext = str(result["perguntas_extraidas"]).lower()
        orig_lower = raw_user_message.lower()
        if any(term in lower_ext for term in ["garantia", "vai resolver", "resolver mesmo"]) and not any(term in orig_lower for term in ["garantia", "vai resolver"]):
            result["perguntas_extraidas"] = raw_user_message
            if result.get("lista_perguntas_extraidas"):
                result["lista_perguntas_extraidas"] = [raw_user_message]
        result["mensagem_melhorada"] = result["perguntas_extraidas"]
    elif message != raw_user_message:
        result["mensagem_melhorada"] = message

    if not result.get("tipo_mensagem"):
        if result.get("eh_saudacao"):
            result["tipo_mensagem"] = "Saudação / Cortesia"
        elif result.get("eh_agradecimento"):
            result["tipo_mensagem"] = "Agradecimento"
        elif result.get("chamada_ferramenta"):
            result["tipo_mensagem"] = f"Solicitação de Ferramenta ({result['chamada_ferramenta'].get('nome', '')})"
        elif result.get("precisa_rag"):
            result["tipo_mensagem"] = "Dúvida / Pergunta de Conhecimento"
        else:
            result["tipo_mensagem"] = "Conversação Geral / Roteamento de Agente"

    context_window_limit = getattr(main_agent, 'context_window', 5)
    if not isinstance(context_window_limit, int) or context_window_limit <= 0:
        context_window_limit = 5

    origens = []
    if history:
        user_count = 0
        agent_count = 0
        for h in reversed(history):
            role = h.get('role', 'user')
            content = (h.get('content') or '').strip()
            if not content:
                continue
            if role == 'user' and user_count < context_window_limit:
                origens.append((h, f"Usuário: {content}"))
                user_count += 1
            elif role == 'assistant' and agent_count < context_window_limit:
                origens.append((h, f"Agente: {content}"))
                agent_count += 1
            if user_count >= context_window_limit and agent_count >= context_window_limit:
                break
        origens.reverse()
        origens = [texto for _h, texto in origens]

    result["mensagens_origem_memorias"] = origens

    if response and getattr(response, 'usage', None):
        result["_usage"] = {
            "prompt_tokens": response.usage.prompt_tokens,
            "completion_tokens": response.usage.completion_tokens,
            "total_tokens": response.usage.total_tokens
        }
        
    if not result.get("id_agente_alvo"):
        result["id_agente_alvo"] = main_agent.id
        
    result["eh_anuncio"] = result.get("eh_anuncio", False) or is_ad
    result["detalhe_anuncio"] = result.get("detalhe_anuncio", None) or similarity_info
    
    if kb_info:
        result["_kb_alignment_info"] = kb_info
        
    return result
