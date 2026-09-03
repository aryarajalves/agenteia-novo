import os
import re
import json
import logging
import openai

from .prompts import get_date_context, _build_pre_router_system_prompt
from .shortcuts import check_programmatic_shortcuts
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
        message=message
    )
    if shortcut_result is not None:
        return shortcut_result

    # Se a mensagem contém algo além de saudação/anúncio, usamos o conteúdo limpo no processamento
    message = cleaned_message

    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return {
            "eh_saudacao": False, 
            "eh_agradecimento": False,
            "id_agente_alvo": main_agent.id, 
            "perguntas_extraidas": message,
            "eh_anuncio": False,
            "detalhe_anuncio": None
        }
        
    client = openai.AsyncOpenAI(api_key=api_key)
    
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

    if getattr(main_agent, "qualification_questions", None):
        custom_qual = agent_tool_prompts.get("lead_qualificado")
        desc_qual = custom_qual.strip() if custom_qual and custom_qual.strip() else "Registra que o lead respondeu todas as perguntas de qualificação."
        tools_desc += f"- lead_qualificado: {desc_qual} Parâmetros/Schema: " + '{"type": "object", "properties": {"respostas": {"type": "object", "description": "Objeto contendo as respostas para cada pergunta"}}, "required": ["respostas"]}\n'

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
        
        has_real_question = "?" in raw_user_message or any(term in raw_user_message.lower() for term in [
            "qual", "como", "quanto", "quem", "onde", "quando", "pode", "precisa",
            "faz", "curso", "valor", "preço", "preco", "gostaria", "tenho interesse", "funciona",
            "endereço", "endereco", "horario", "horário", "ajuda",
            "inscrição", "incrição", "requisito", "formação", "formacao", "posso", "consigo",
            "serve", "aula", "aulas", "plano", "planos", "comprar", "alugar", "saber mais"
        ])
        
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
            history=history
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
            "pre_router_error": str(e)
        }
