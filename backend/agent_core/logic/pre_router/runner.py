import os
import re
import json
import logging
import openai

from .prompts import get_date_context, _build_pre_router_system_prompt
from .shortcuts import (
    check_programmatic_shortcuts,
    is_user_answering_assistant_question,
    _is_purchase_declaration
)
from .enrichment import enrich_user_message, _get_kb_reference_context
from .post_processing import sanitize_and_split_questions, format_debug_and_memory

logger = logging.getLogger(__name__)

async def run_pre_router_ai(message: str, history: list, main_agent, secondary_agents: list = None, context_variables: dict = None, db = None) -> dict:
    """
    Triagem inicial da mensagem para identificar saudações, extrair datas, desmembrar perguntas e rotear agentes.
    """
    raw_user_message = message
    secondary_agents = secondary_agents or []
    
    msg_clean = message.lower().strip()
    is_first_msg = not history or len(history) == 0
    
    # Lista de termos de confirmação comuns
    common_confirmations = [
        "ok", "blz", "show", "combinado", "perfeito", "certo", "beleza", "entendi", "tendi",
        "tá", "ta", "sim", "isso", "fechado", "ta bom", "tá bom", "ta bem", "tá bem",
        "tudo bem", "tudo bom", "tá certo", "ta certo", "tá ótimo", "ta otimo", "ótimo", "otimo",
        "maravilha", "belezinha", "fechou", "tá joia", "ta joia", "joia", "jóia", "combinadíssimo", "combinadissimo"
    ]
    
    # Lista de anúncios configurada (se houver)
    ignore_messages = []
    initial_ignore = getattr(main_agent, 'initial_ignore_message', None)
    if initial_ignore:
        try:
            ignore_messages = json.loads(initial_ignore)
            if not isinstance(ignore_messages, list):
                ignore_messages = [initial_ignore]
        except Exception:
            ignore_messages = [initial_ignore]
    
    # Check for match in ignore list (Ads) - only for first message
    is_ad = False
    similarity_info = None
    cleaned_message = message
    
    # Executa a triagem programática de anúncios apenas se ad_mode for 'panel'
    if getattr(main_agent, 'ad_mode', 'panel') == 'panel' and is_first_msg and ignore_messages:
        sorted_ads = sorted(ignore_messages, key=len, reverse=True)
        for ad_text in sorted_ads:
            ad_clean = ad_text.strip()
            if not ad_clean:
                continue
                
            pattern = re.compile(re.escape(ad_clean), re.IGNORECASE)
            if pattern.search(cleaned_message):
                is_ad = True
                similarity_info = f"Contém anúncio: '{ad_text}'"
                cleaned_message = pattern.sub("", cleaned_message)
                logger.info(f"📢 [AD DETECTED] Removido trecho do anúncio: '{ad_text}'")
                
        if not is_ad:
            msg_words = re.findall(r'\b\w+\b', msg_clean)
            for ad_text in ignore_messages:
                ad_clean = ad_text.lower().strip()
                ad_words = re.findall(r'\b\w+\b', ad_clean)
                
                if msg_words and ad_words:
                    ad_set = set(ad_words)
                    matches = sum(1 for w in msg_words if w in ad_set)
                    pct = matches / len(msg_words)
                    if pct >= 0.60:
                        is_ad = True
                        similarity_info = f"Similaridade: {pct*100:.1f}% com '{ad_text}'"
                        cleaned_message = ""
                        logger.info(f"📢 [AD DETECTED] Mensagem similar ao anúncio configurado: {similarity_info}")
                        break

    cleaned_message = cleaned_message.strip()
    
    initial_msg = getattr(main_agent, 'initial_message', None)
    if not initial_msg or str(initial_msg).strip().lower() in ["", "none", "null"]:
        initial_msg = "Olá! Como posso ajudar?"

    shortcut_result = check_programmatic_shortcuts(
        raw_user_message=raw_user_message,
        history=history,
        main_agent=main_agent,
        is_first_msg=is_first_msg,
        is_ad=is_ad,
        similarity_info=similarity_info,
        cleaned_message=cleaned_message,
        message=message,
        context_variables=context_variables
    )
    if shortcut_result is not None:
        shortcut_result.setdefault("eh_saudacao", False)
        shortcut_result.setdefault("eh_agradecimento", False)
        shortcut_result.setdefault("eh_agradecimento_recorrente", False)
        shortcut_result.setdefault("eh_mensagem_automatica", False)
        shortcut_result.setdefault("eh_resposta_ao_agente", False)
        shortcut_result.setdefault("precisa_esclarecimento", False)
        shortcut_result.setdefault("resposta_esclarecimento", None)
        shortcut_result.setdefault("resposta_direta", None)
        shortcut_result.setdefault("perguntas_extraidas", None)
        shortcut_result.setdefault("lista_perguntas_extraidas", [])
        shortcut_result.setdefault("chamada_ferramenta", None)
        shortcut_result.setdefault("data_extraida", None)
        shortcut_result.setdefault("precisa_rag", False)
        shortcut_result.setdefault("eh_anuncio", is_ad)
        shortcut_result.setdefault("detalhe_anuncio", similarity_info)
        shortcut_result.setdefault("mensagem_original", raw_user_message)
        shortcut_result.setdefault("mensagem_melhorada", None)
        return shortcut_result

    # Se a mensagem contém algo além de saudação/anúncio, usamos o conteúdo limpo no processamento
    message = cleaned_message

    api_key = os.getenv("OPENAI_API_KEY")
    client = openai.AsyncOpenAI(api_key=api_key) if api_key else None

    # Análise Semântica 100% via LLM (gpt-4o-mini) para detecção de interesse ou aceite de envio do link do curso
    if client and history and len(message.strip()) > 0:
        from .link_intent_ai import analyze_link_intent_with_llm
        link_analysis = await analyze_link_intent_with_llm(message=message, history=history, client=client)
        if link_analysis.get("quer_link") is True:
            target_q = "Qual é o link do curso / link de inscrição?"
            extra_qs = link_analysis.get("duvidas_adicionais") or []
            if isinstance(extra_qs, str):
                extra_qs = [extra_qs]
            if link_analysis.get("outra_duvida"):
                extra_qs.append(str(link_analysis.get("outra_duvida")))
            lista_q = [target_q]
            for eq in extra_qs:
                if eq and str(eq).strip() and str(eq).strip().lower() not in ["null", "none"] and str(eq).strip() not in lista_q:
                    lista_q.append(str(eq).strip())

            # Se no histórico o assistente ofereceu formas de pagamento ou informações adicionais, garante que constem na lista
            last_asst_lower = ""
            for h in reversed(history):
                r = (h.get("role") if isinstance(h, dict) else getattr(h, "role", "")).lower()
                if r in ("assistant", "agent", "bot"):
                    last_asst_lower = str(h.get("content") if isinstance(h, dict) else getattr(h, "content", "")).lower()
                    break
            if "pagamento" in last_asst_lower and not any("pagamento" in q.lower() for q in lista_q):
                lista_q.append("Quais são as formas de pagamento do curso?")
            if ("mais informações" in last_asst_lower or "informacoes" in last_asst_lower or "como funciona" in last_asst_lower) and not any("como funciona" in q.lower() for q in lista_q):
                lista_q.insert(0, "Como funciona o curso?")

            perguntas_str = "\n".join(lista_q)
            
            logger.info(f"🎯 [LINK INTENT AI] Decisão 100% LLM: usuário quer o link ({link_analysis.get('motivo')}). RAG ATIVADO com query: '{perguntas_str}'")
            return {
                "eh_saudacao": False,
                "eh_agradecimento": False,
                "eh_agradecimento_recorrente": False,
                "eh_mensagem_automatica": False,
                "eh_resposta_ao_agente": True,
                "precisa_esclarecimento": False,
                "resposta_esclarecimento": None,
                "id_agente_alvo": main_agent.id,
                "resposta_direta": None,
                "perguntas_extraidas": perguntas_str,
                "lista_perguntas_extraidas": lista_q,
                "data_extraida": None,
                "precisa_rag": True,
                "chamada_ferramenta": None,
                "eh_anuncio": is_ad,
                "detalhe_anuncio": similarity_info,
                "mensagem_original": raw_user_message,
                "mensagem_melhorada": target_q,
                "tipo_mensagem": "Solicitação de Link do Curso (Detectado 100% por LLM)",
                "_model_used": "gpt-4o-mini",
                "_usage": link_analysis.get("_usage", {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0}),
                "_debug_prompt": link_analysis.get("_debug_prompt", "")
            }

    if not api_key or not client:
        clean_thanks = raw_user_message.lower().strip("!., \t\n")
        if clean_thanks in ["obrigado", "obrigada", "valeu", "gratidao"]:
            return {
                "eh_saudacao": True,
                "eh_agradecimento": True,
                "eh_agradecimento_recorrente": False,
                "id_agente_alvo": main_agent.id,
                "resposta_direta": "Por nada! Se precisar de mais alguma coisa, é só chamar.",
                "perguntas_extraidas": None,
                "lista_perguntas_extraidas": [],
                "precisa_rag": False,
                "eh_anuncio": False,
                "detalhe_anuncio": None
            }
        return {
            "eh_saudacao": False, 
            "eh_agradecimento": False,
            "id_agente_alvo": main_agent.id, 
            "perguntas_extraidas": message,
            "eh_anuncio": False,
            "detalhe_anuncio": None
        }
    
    # Enriquecimento da Mensagem com IA baseado no Histórico
    if client and history and len(message.strip()) < 150:
        message = await enrich_user_message(message, history, client)
    
    agents_desc = f"1 (PRINCIPAL). ID: {main_agent.id} | Nome: {main_agent.name} | Descrição: {getattr(main_agent, 'description', 'Agente Principal')}\n"
    for idx, sa in enumerate(secondary_agents):
        agents_desc += f"{idx + 2} (SECUNDÁRIO). ID: {sa.id} | Nome: {sa.name} | Descrição: {getattr(sa, 'description', 'Agente Secundário')}\n"
        
    history_text = ""
    if history:
        history_text = "HISTÓRICO RECENTE:\n"
        for h in history:
            role = h.get('role', 'user').upper()
            content = h.get('content', '')
            history_text += f"{role}: {content}\n\n"
            
    main_system_prompt_cleaned = getattr(main_agent, 'system_prompt', '') or ''
    main_dynamic_prompt = getattr(main_agent, 'dynamic_prompt', '') or ''
    if main_dynamic_prompt:
        main_system_prompt_cleaned += f"\n\n### DIRETRIZES E REGRAS DINÂMICAS DO AGENTE:\n{main_dynamic_prompt}"
        
    if main_system_prompt_cleaned:
        from agent_core.logic.substitution import resolve_conditional_blocks
        main_system_prompt_cleaned = resolve_conditional_blocks(main_system_prompt_cleaned, context_variables)
        main_system_prompt_cleaned = re.sub(r'(?m)^[ \t]*#+[ \t]*', '', main_system_prompt_cleaned)

    tools_list = getattr(main_agent, "tools", None) or []
    agent_tool_prompts = getattr(main_agent, "tool_prompts", None) or {}
    tools_desc = ""
    for t in tools_list:
        p_schema = t.parameters_schema
        if isinstance(p_schema, bytes):
            p_schema = p_schema.decode('utf-8')
        
        custom_hint = agent_tool_prompts.get(str(t.id))
        desc_to_use = custom_hint.strip() if custom_hint and custom_hint.strip() else t.description
        tools_desc += f"- {t.name}: {desc_to_use}. Parâmetros/Schema: {p_schema}\n"

    if getattr(main_agent, "handoff_enabled", False):
        custom_handoff = agent_tool_prompts.get("transferir_suporte_humano")
        desc_handoff = custom_handoff.strip() if custom_handoff and custom_handoff.strip() else "Transfere o atendimento para um atendente humano."
        tools_desc += f"- transferir_suporte_humano: {desc_handoff} Parâmetros/Schema: " + '{"type": "object", "properties": {"motivo": {"type": "string", "description": "Motivo solicitado pelo usuário"}}, "required": ["motivo"]}\n'
    
    custom_duvida = agent_tool_prompts.get("registrar_duvida_sem_resposta")
    desc_duvida = custom_duvida.strip() if custom_duvida and custom_duvida.strip() else "Registra apenas perguntas objetivas/fáticas com dados ausentes (ex: preço/endereço ausente). PROIBIDO para objeções ou medos do cliente."
    tools_desc += f"- registrar_duvida_sem_resposta: {desc_duvida} Parâmetros/Schema: " + '{"type": "object", "properties": {"pergunta": {"type": "string", "description": "A pergunta objetiva exata do usuário"}}, "required": ["pergunta"]}\n'


    template_vars = dict(
        initial_msg=initial_msg,
        initial_ignore_message=getattr(main_agent, 'initial_ignore_message', '') or '',
        greeting_mode=getattr(main_agent, 'greeting_mode', 'prompt'),
        ad_mode=getattr(main_agent, 'ad_mode', 'panel'),
        main_system_prompt=main_system_prompt_cleaned,
        tools_desc=tools_desc,
        agents_desc=agents_desc,
        main_agent_id=main_agent.id,
        date_context=(get_date_context(main_agent) if getattr(main_agent, 'date_awareness', False) else ''),
    )
    system_prompt = _build_pre_router_system_prompt(main_agent, template_vars)

    kb_alignment_context, kb_info = await _get_kb_reference_context(main_agent, message, async_db=db)
    if kb_alignment_context:
        system_prompt += f"\n\n{kb_alignment_context}"

    if not is_first_msg:
        system_prompt += "\n⚠️ REGRA CRÍTICA DE HISTÓRICO: Há interações anteriores na conversa. Se a mensagem for apenas uma saudação curta ou cumprimento isolado (Ex: 'Oi', 'Olá', 'Bom dia', 'Tudo bem?'), você PODE definir 'eh_saudacao' como true. Mas se o usuário trouxer qualquer dúvida, resposta ou assunto novo, trate a mensagem como continuação normal da conversa (eh_saudacao = false)."

    user_prompt = f"{history_text}\nMENSAGEM ATUAL DO USUÁRIO:\n{message}"

    try:
        model_to_use = getattr(main_agent, 'router_simple_model', None) or getattr(main_agent, 'model', 'gpt-4o-mini')
        temp_to_use = 0.0
        if "o1" in model_to_use.lower() or "gpt-5" in model_to_use.lower():
            temp_to_use = 1.0

        response = await client.chat.completions.create(
            model=model_to_use,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=temp_to_use,
            response_format={"type": "json_object"}
        )
        result = json.loads(response.choices[0].message.content.strip())
        
        is_answering = is_user_answering_assistant_question(raw_user_message, history)
        question_triggers_regex = (
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
        has_real_question = bool(re.search(question_triggers_regex, raw_user_message, re.IGNORECASE)) or (not is_answering and "?" in raw_user_message)
        
        msg_clean_no_punct = cleaned_message.lower().strip()
        for char in ["?", "!", ".", ",", ";", ":", "-", "_", "(", ")", "[", "]", "{", "}"]:
            msg_clean_no_punct = msg_clean_no_punct.replace(char, "")
        msg_clean_no_punct = msg_clean_no_punct.strip()

        common_emojis = ["👍🏻", "👍🏼", "👍🏽", "👍🏾", "👍🏿", "👌🏻", "👌🏼", "👌🏽", "👌🏾", "👌🏿", "👍", "👌", "👏", "🙌", "✌️", "❤️", "✔️", "☑️", "✅", "🆗"]
        has_reaction_emoji = any(em in msg_clean_no_punct for em in common_emojis)

        result = sanitize_and_split_questions(
            result=result,
            raw_user_message=raw_user_message,
            has_real_question=has_real_question,
            is_first_msg=is_first_msg,
            main_agent=main_agent,
            initial_msg=initial_msg,
            msg_clean_no_punct=msg_clean_no_punct,
            common_confirmations=common_confirmations,
            has_reaction_emoji=has_reaction_emoji,
            history=history,
            context_variables=context_variables
        )
        
        result = format_debug_and_memory(
            result=result,
            raw_user_message=raw_user_message,
            message=message,
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            model_to_use=model_to_use,
            is_ad=is_ad,
            similarity_info=similarity_info,
            kb_info=kb_info,
            history=history,
            main_agent=main_agent,
            response=response
        )
        
        if _is_purchase_declaration(raw_user_message):
            result["eh_compra_informada"] = True

        return result
    except Exception as e:
        logger.error(f"❌ Erro no Pre-Router (OpenAI): {e}")
        return {
            "eh_saudacao": False, 
            "eh_agradecimento": False,
            "precisa_esclarecimento": False,
            "id_agente_alvo": main_agent.id, 
            "perguntas_extraidas": message,
            "resposta_direta": None,
            "resposta_esclarecimento": None,
            "data_extraida": None,
            "eh_anuncio": is_ad,
            "detalhe_anuncio": similarity_info,
            "eh_compra_informada": _is_purchase_declaration(raw_user_message),
            "pre_router_error": str(e)
        }
