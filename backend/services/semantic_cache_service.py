import json
import logging
import math
import asyncio
from typing import Optional, Tuple, List, Union, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, func, desc, or_
from datetime import datetime, timezone

from models import SemanticCacheModel, AgentConfigModel
import re
from services.rag.providers import get_embedding

logger = logging.getLogger(__name__)

INVISIBLE_CHARS_REGEX = re.compile(r"[\u200B-\u200F\u202A-\u202E\u2060-\u206F\u17B4\u17B5\uFEFF]")

def clean_invisible_chars(text: str) -> str:
    """Remove caracteres invisíveis/zero-width introduzidos por templates ou sistemas externos."""
    if not text:
        return ""
    return INVISIBLE_CHARS_REGEX.sub("", str(text)).strip()

def cosine_similarity(v1: list, v2: list) -> float:
    """Calcula a similaridade de cosseno entre dois vetores numéricos."""
    if not v1 or not v2 or len(v1) != len(v2):
        return 0.0
    dot_product = sum(a * b for a, b in zip(v1, v2))
    norm_v1 = math.sqrt(sum(a * a for a in v1))
    norm_v2 = math.sqrt(sum(b * b for b in v2))
    if norm_v1 == 0.0 or norm_v2 == 0.0:
        return 0.0
    return dot_product / (norm_v1 * norm_v2)


def clean_user_question_intro(text: str) -> str:
    """
    Remove saudações iniciais e apresentações pessoais (ex: 'Me chamo X, ', 'Meu nome é Y, ')
    preservando a pergunta/solicitação real do lead para busca vetorial precisa no Cache Semântico.
    """
    if not text:
        return ""
    q = clean_invisible_chars(text).strip()
    
    # 1. Padrão: saudação + apresentação pessoal (ex: "Oi, me chamo Aryaraj, qual é o seu nome?")
    pattern_combo = r'^(?:(?:ol[áa]|oie?|oi|bom dia|boa tarde|boa noite)[\s,;:!-]+)*(?:me\s+chamo|meu\s+nome\s+[eé]|sou\s+[oa])\s+[^,;!?\n]+[,;!?\s]+'
    cleaned = re.sub(pattern_combo, '', q, flags=re.IGNORECASE).strip()
    if cleaned != q and len(cleaned) >= 3 and any(char.isalpha() for char in cleaned):
        return cleaned

    # 2. Padrão: apenas apresentação pessoal (ex: "Me chamo Aryaraj, qual é o seu nome?")
    pattern_intro = r'^(?:me\s+chamo|meu\s+nome\s+[eé]|sou\s+[oa])\s+[^,;!?\n]+[,;!?\s]+'
    cleaned = re.sub(pattern_intro, '', q, flags=re.IGNORECASE).strip()
    if cleaned != q and len(cleaned) >= 3 and any(char.isalpha() for char in cleaned):
        return cleaned

    # 3. Padrão: apenas saudação inicial (ex: "Olá! Quanto custa?")
    pattern_greeting = r'^(?:ol[áa]|oie?|oi|bom dia|boa tarde|boa noite)[\s,;:!-]+'
    cleaned = re.sub(pattern_greeting, '', q, flags=re.IGNORECASE).strip()
    if cleaned != q and len(cleaned) >= 3 and any(char.isalpha() for char in cleaned):
        return cleaned

    return q



async def generate_embeddings_for_queries(queries: List[str]) -> Tuple[List[str], List[list]]:
    """Gera embeddings para uma lista de perguntas alternativas, retornando (queries_limpas, embeddings)."""
    clean_queries = []
    embeddings = []
    for q in queries:
        clean_q = clean_invisible_chars(q)
        if clean_q and clean_q not in clean_queries:
            try:
                emb, _ = await get_embedding(clean_q)
                if emb:
                    clean_queries.append(clean_q)
                    embeddings.append(emb)
            except Exception as e:
                logger.warning(f"⚠️ [CACHE SEMÂNTICO] Falha ao gerar embedding para variação '{clean_q}': {e}")
    return clean_queries, embeddings


async def save_semantic_cache(
    db: AsyncSession,
    agent_id: int,
    user_query: str,
    approved_response: str,
    alternate_queries: Optional[List[str]] = None,
    client_id: Optional[int] = None,
    similarity_threshold: Optional[float] = None,
    category_tag: Optional[str] = None
) -> SemanticCacheModel:
    """Salva ou atualiza uma resposta aprovada no Cache Semântico com suporte a variações, limiar individual e tag de produto."""
    clean_query = clean_invisible_chars(user_query)
    clean_response = approved_response.strip()

    if not clean_query or not clean_response:
        raise ValueError("Pergunta e resposta não podem ser vazias.")

    clean_thresh = float(similarity_threshold) if similarity_threshold is not None else None
    if clean_thresh is not None and clean_thresh > 1.0:
        clean_thresh = clean_thresh / 100.0

    clean_cat = category_tag.strip() if category_tag and category_tag.strip() else None

    # 1. Gerar Embedding da Pergunta Principal
    embedding_data, _ = await get_embedding(clean_query)

    # 2. Gerar Embeddings das Perguntas Alternativas (se houver)
    clean_alt_queries, alt_embeddings = [], []
    if alternate_queries:
        clean_alt_queries, alt_embeddings = await generate_embeddings_for_queries(alternate_queries)

    # 3. Verificar se já existe uma entrada idêntica para o mesmo agente
    stmt = select(SemanticCacheModel).where(
        SemanticCacheModel.agent_id == agent_id,
        SemanticCacheModel.user_query == clean_query
    )
    res = await db.execute(stmt)
    existing = res.scalars().first()

    if existing:
        existing.approved_response = clean_response
        existing.embedding = embedding_data
        existing.alternate_queries = clean_alt_queries
        existing.alternate_embeddings = alt_embeddings
        if similarity_threshold is not None:
            existing.similarity_threshold = clean_thresh
        if category_tag is not None:
            existing.category_tag = clean_cat
        existing.is_active = True
        existing.updated_at = datetime.now(timezone.utc)
        await db.commit()
        await db.refresh(existing)
        logger.info(f"⚡ [CACHE SEMÂNTICO] Entrada atualizada para o agente {agent_id}: '{clean_query[:40]}...' (tag={clean_cat}, +{len(clean_alt_queries)} variações, limiar={clean_thresh})")
        return existing

    # 4. Criar nova entrada
    new_cache = SemanticCacheModel(
        agent_id=agent_id,
        client_id=client_id,
        user_query=clean_query,
        approved_response=clean_response,
        embedding=embedding_data,
        alternate_queries=clean_alt_queries,
        alternate_embeddings=alt_embeddings,
        usage_count=0,
        similarity_threshold=clean_thresh,
        category_tag=clean_cat,
        is_active=True,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc)
    )
    db.add(new_cache)
    await db.commit()
    await db.refresh(new_cache)
    logger.info(f"⚡ [CACHE SEMÂNTICO] Nova entrada salva para o agente {agent_id}: '{clean_query[:40]}...' (tag={clean_cat}, +{len(clean_alt_queries)} variações, limiar={clean_thresh})")
    return new_cache


async def lookup_semantic_cache(
    db: AsyncSession,
    agent_id: int,
    user_query: str,
    client_id: Optional[int] = None,
    threshold: float = 0.92,
    is_followup: bool = False,
    return_diagnostics: bool = False,
    active_product: Optional[str] = None
) -> Union[Tuple[Optional[SemanticCacheModel], float], Tuple[Optional[SemanticCacheModel], float, Optional[SemanticCacheModel]]]:
    """
    Busca uma resposta aprovada no Cache Semântico por proximidade vetorial.
    Suporta isolamento por produto (category_tag) e enriquecimento contextual automático.
    """
    if is_followup:
        if return_diagnostics:
            return None, 0.0, None
        return None, 0.0

    clean_query = clean_user_question_intro(user_query)
    if not clean_query or len(clean_query) < 3:
        if return_diagnostics:
            return None, 0.0, None
        return None, 0.0

    # 1. Carregar itens ativos do agente
    stmt = select(SemanticCacheModel).where(
        SemanticCacheModel.agent_id == agent_id,
        SemanticCacheModel.is_active == True
    )
    res = await db.execute(stmt)
    active_caches = res.scalars().all()

    if not active_caches:
        if return_diagnostics:
            return None, 0.0, None
        return None, 0.0

    # 2. Gerar embeddings da query (original e enriquecida contextualmente com active_product se presente)
    clean_active_prod = active_product.strip() if active_product and active_product.strip() else None
    try:
        query_embedding, _ = await get_embedding(clean_query)
        enriched_embedding = None
        if clean_active_prod and len(clean_query) < 150:
            enriched_query = f"{clean_query} [{clean_active_prod}]"
            enriched_embedding, _ = await get_embedding(enriched_query)
    except Exception as e:
        logger.warning(f"⚠️ [CACHE SEMÂNTICO] Falha ao gerar embedding da query: {e}")
        if return_diagnostics:
            return None, 0.0, None
        return None, 0.0

    # 3. Calcular similaridade com todos os itens elegíveis e suas variações
    qualifying_items = []
    best_overall_item = None
    best_overall_similarity = 0.0

    for item in active_caches:
        # Isolamento por Produto (Opção 2):
        # Se o item tem tag de produto específica e temos um produto ativo diferente na conversa, exclui para evitar colisão
        if item.category_tag and clean_active_prod:
            if item.category_tag.strip().lower() != clean_active_prod.lower():
                continue

        item_best_sim = 0.0

        # Comparar com pergunta principal
        if item.embedding:
            main_sim = cosine_similarity(query_embedding, item.embedding)
            if enriched_embedding:
                main_sim_enriched = cosine_similarity(enriched_embedding, item.embedding)
                main_sim = max(main_sim, main_sim_enriched)
            if main_sim > item_best_sim:
                item_best_sim = main_sim

        # Comparar com perguntas alternativas
        if item.alternate_embeddings and isinstance(item.alternate_embeddings, list):
            for alt_emb in item.alternate_embeddings:
                if alt_emb:
                    alt_sim = cosine_similarity(query_embedding, alt_emb)
                    if enriched_embedding:
                        alt_sim_enriched = cosine_similarity(enriched_embedding, alt_emb)
                        alt_sim = max(alt_sim, alt_sim_enriched)
                    if alt_sim > item_best_sim:
                        item_best_sim = alt_sim

        if item_best_sim > best_overall_similarity:
            best_overall_similarity = item_best_sim
            best_overall_item = item

        # Determinar o limiar específico deste item (ou fallback para o threshold padrão)
        item_threshold = item.similarity_threshold if item.similarity_threshold is not None else threshold
        if item_threshold > 1.0:
            item_threshold = item_threshold / 100.0

        if item_best_sim >= item_threshold:
            qualifying_items.append((item, item_best_sim, item_threshold))

    # 4. Avaliar se houve algum item qualificado
    if qualifying_items:
        qualifying_items.sort(key=lambda x: x[1], reverse=True)
        best_item, best_similarity, used_thresh = qualifying_items[0]

        best_item.usage_count = (best_item.usage_count or 0) + 1
        best_item.updated_at = datetime.now(timezone.utc)
        await db.commit()
        logger.info(f"🎯 [CACHE SEMÂNTICO HIT] Similaridade {best_similarity:.3f} >= {used_thresh:.2f} (item #{best_item.id}, tag={best_item.category_tag}) para agente {agent_id}: '{clean_query[:30]}...' -> '{best_item.user_query[:30]}...'")
        if return_diagnostics:
            return best_item, best_similarity, best_item
        return best_item, best_similarity

    if return_diagnostics:
        return None, best_overall_similarity, best_overall_item
    return None, best_overall_similarity


def split_multi_questions(text: str) -> List[str]:
    """Desmembra uma mensagem em múltiplas sub-perguntas candidatas a busca no cache."""
    if not text:
        return []
    clean_text = clean_invisible_chars(text)

    sub_qs = []
    # 1. Se contiver ponto de interrogação com texto subsequente ou múltiplos '?' (ex: "Como funciona? Me manda o link")
    if "?" in clean_text:
        raw_parts = [p.strip() for p in clean_text.split("?") if p.strip()]
        if len(raw_parts) >= 2:
            sub_qs = [p + ("?" if not p.endswith(("!", ".")) else "") for p in raw_parts[:-1]]
            last_p = raw_parts[-1]
            if clean_text.strip().endswith("?"):
                sub_qs.append(last_p + "?")
            else:
                sub_qs.append(last_p)
        elif len(raw_parts) == 1:
            sub_qs = [clean_text]
        else:
            sub_qs = [clean_text]
    # 2. Se contiver quebras de linha com frases distintas
    elif "\n" in clean_text:
        sub_qs = [p.strip() for p in clean_text.split("\n") if p.strip() and len(p.strip()) >= 4]
    # 3. Se contiver múltiplos pontos ou exclamações separando frases
    elif any(sep in clean_text for sep in [". ", "! ", "; "]):
        parts = [p.strip() for p in re.split(r'[.!;]\s+', clean_text) if p.strip()]
        if len(parts) >= 2:
            sub_qs = parts
        else:
            sub_qs = [clean_text]
    else:
        sub_qs = [clean_text]

    # 4. Se contiver termos interrogativos encadeados (ex: "Quanto custa o curso como funcion e qual e a professora")
    expanded_qs = []
    split_pattern = r'\b(?:(?=(?:qual|quanto|como|onde|quando|quem|por\s*que))\b|e\s+(?=(?:aceita|tem|dá\s+pra|posso|queria\s+saber))\b)'
    for q in sub_qs:
        parts = re.split(split_pattern, q, flags=re.IGNORECASE)
        parts = [p.strip() for p in parts if p.strip() and len(p.strip()) >= 3]
        if len(parts) >= 2:
            expanded_qs.extend(parts)
        else:
            expanded_qs.append(q)

    # Limpar saudações e apresentações pessoais na primeira pergunta
    cleaned = []
    for idx, q in enumerate(expanded_qs):
        qc = clean_user_question_intro(q) if idx == 0 else q.strip()
        if qc and len(qc) >= 3:
            cleaned.append(qc)

    # Filtrar partes que sejam exclusivamente apresentações pessoais ou saudações sem dúvida
    pure_questions = []
    for q in cleaned:
        if re.match(r'^(?:(?:ol[áa]|oie?|oi|bom dia|boa tarde|boa noite)[\s,;:!-]*)*(?:me\s+chamo|meu\s+nome\s+[eé]|sou\s+[oa])\s+[^,;!?\n]+[,;!?\s]*$', q, flags=re.IGNORECASE):
            continue
        pure_questions.append(q)

    if pure_questions:
        return pure_questions
    single_cleaned = clean_user_question_intro(clean_text)
    return [single_cleaned] if single_cleaned else [clean_text]


async def extract_sub_questions_ai(
    user_message: str,
    model: str = "gpt-4o-mini"
) -> List[str]:
    """
    Usa um micro-prompt com modelo nano/mini para identificar e quebrar 
    com precisão semântica múltiplas dúvidas/perguntas na mensagem do lead,
    sem depender da sorte da pontuação do usuário.
    """
    clean_text = clean_invisible_chars(user_message).strip()
    if not clean_text:
        return []

    # Mensagens muito curtas de 1 ou 2 palavras não precisam de IA
    words = clean_text.split()
    if len(words) <= 2 and "?" not in clean_text and "\n" not in clean_text:
        return [clean_user_question_intro(clean_text) or clean_text]

    try:
        from agent_core.clients import get_openai_client
        client = get_openai_client(model)
        if client:
            prompt = (
                "Você é um analisador semântico de mensagens de clientes no WhatsApp.\n"
                "Sua única tarefa é identificar todas as perguntas, dúvidas ou pedidos individuais na mensagem do usuário e listá-los separadamente em JSON.\n\n"
                "Diretrizes:\n"
                "1. Remova saudações iniciais (Oi, Olá, Bom dia, Boa tarde) e apresentações pessoais (ex: 'Me chamo [Nome]', 'Meu nome é [Nome]', 'Sou o [Nome]') das perguntas, isolando estritamente a dúvida ou solicitação do usuário.\n"
                "2. Mantenha cada item como uma dúvida/pergunta direta, clara e auto-suficiente.\n"
                "3. Se houver apenas 1 dúvida, retorne uma lista com 1 único item contendo a pergunta limpa (ex: 'Me chamo Aryaraj, qual é o seu nome?' -> ['Qual é o seu nome?']).\n"
                "4. Se houver 2 ou mais dúvidas ou intenções distintas (ex: 'como funciona? me manda o link'), separe cada uma em um item da lista.\n"
                "5. ⛔ REGRA ABSOLUTA DE NÃO-INVENÇÃO: Se a mensagem for apenas uma RESPOSTA a uma pergunta (ex: 'Sim já atuo', 'não tenho dúvidas', 'quero aumentar meu salário', 'começando do zero'), afirmação pessoal ou relato, e NÃO contiver perguntas ou pedidos explícitos de informação, retorne uma lista VAZIA: {\"perguntas\": []}. É PROIBIDO inventar ou transformar respostas ou objetivos do usuário em perguntas (ex: NUNCA transforme 'quero aumentar meu salário' em 'Como posso aumentar meu salário?').\n\n"
                "Exemplos:\n"
                "- 'Me chamo Aryaraj, qual é o seu nome?' -> ['Qual é o seu nome?']\n"
                "- 'Oi, meu nome é Carlos, quanto custa o curso?' -> ['Quanto custa o curso?']\n"
                "- 'Como funciona? Me manda o link' -> ['Como funciona o curso?', 'Me manda o link']\n"
                "- 'quanto custa e aceita cartao parcelado' -> ['Qual o valor do curso?', 'Aceita cartão parcelado?']\n"
                "- 'Sim já atuo, quero me qualificar para aumentar meu salário' -> []\n"
                "- 'Não tenho dúvidas' -> []\n"
                "- 'Começando do zero' -> []\n\n"
                f"Mensagem do usuário:\n\"{clean_text}\"\n\n"
                "Responda EXCLUSIVAMENTE em formato JSON:\n"
                "{\"perguntas\": [\"pergunta 1\", \"pergunta 2\"]}"
            )
            resp = await asyncio.wait_for(
                client.chat.completions.create(
                    model=model,
                    messages=[{"role": "user", "content": prompt}],
                    response_format={"type": "json_object"},
                    temperature=0.0,
                    max_tokens=250
                ),
                timeout=2.0
            )
            raw_json = resp.choices[0].message.content
            parsed = json.loads(raw_json)
            questions = parsed.get("perguntas") or parsed.get("questions") or []
            if isinstance(questions, list) and len(questions) > 0:
                cleaned_ai = [q.strip() for q in questions if isinstance(q, str) and len(q.strip()) >= 3]
                if cleaned_ai:
                    return cleaned_ai
    except Exception as e:
        logger.debug(f"Segmentação semântica por IA falhou ou timed out: {e}. Usando fallback heurístico.")

    # Fallback heurístico resiliente
    return split_multi_questions(clean_text)


async def lookup_multi_query_semantic_cache(
    db: AsyncSession,
    agent_id: int,
    user_message: str,
    client_id: Optional[int] = None,
    threshold: float = 0.92,
    is_followup: bool = False,
    return_diagnostics: bool = False,
    active_product: Optional[str] = None
) -> Union[
    Tuple[Optional[List[SemanticCacheModel]], Optional[str], float, bool],
    Tuple[Optional[List[SemanticCacheModel]], Optional[str], float, bool, List[Dict[str, Any]]]
]:
    """
    Busca respostas no Cache Semântico quando a mensagem do usuário contém múltiplas perguntas.
    Retorna:
      (matched_items, combined_response, avg_similarity, is_all_matched)
    Se return_diagnostics=True, inclui também a lista de diagnósticos por pergunta com similaridades e correspondências.
    """
    if is_followup:
        if return_diagnostics:
            return None, None, 0.0, False, []
        return None, None, 0.0, False

    sub_questions = await extract_sub_questions_ai(user_message)
    if len(sub_questions) < 2:
        # Se for pergunta única, delega para o lookup tradicional usando a pergunta limpa sem ruído
        target_query = sub_questions[0] if sub_questions and len(sub_questions) == 1 and len(sub_questions[0].strip()) >= 3 else clean_user_question_intro(user_message)
        res = await lookup_semantic_cache(
            db, agent_id, target_query, client_id, threshold, is_followup, return_diagnostics=True, active_product=active_product
        )
        if isinstance(res, (tuple, list)) and len(res) >= 3:
            item, sim, best_cand = res[0], res[1], res[2]
        elif isinstance(res, (tuple, list)) and len(res) == 2:
            item, sim = res[0], res[1]
            best_cand = item
        else:
            item, sim, best_cand = None, 0.0, None

        raw_thresh = getattr(best_cand, 'similarity_threshold', None) if best_cand else None
        if isinstance(raw_thresh, (int, float)):
            cand_thresh = float(raw_thresh)
            if cand_thresh > 1.0:
                cand_thresh = cand_thresh / 100.0
        else:
            cand_thresh = threshold

        def _safe_val(v):
            if v is None or hasattr(v, '_mock_name') or type(v).__name__ in ('MagicMock', 'AsyncMock'):
                return None
            return v

        diag = [{
            "sub_query": target_query.strip(),
            "matched_item_id": _safe_val(getattr(best_cand, 'id', None)),
            "matched_query": _safe_val(getattr(best_cand, 'user_query', None)),
            "similarity": round(sim, 4),
            "similarity_pct": f"{sim * 100:.1f}%",
            "threshold": round(cand_thresh, 4),
            "threshold_pct": f"{cand_thresh * 100:.1f}%",
            "approved": bool(item is not None)
        }]

        if item:
            if return_diagnostics:
                return [item], item.approved_response, sim, True, diag
            return [item], item.approved_response, sim, True
        if return_diagnostics:
            return None, None, sim, False, diag
        return None, None, sim, False

    matched_items = []
    responses = []
    seen_response_texts = set()
    similarities = []
    query_diagnostics = []

    def _safe_val(v):
        if v is None or hasattr(v, '_mock_name') or type(v).__name__ in ('MagicMock', 'AsyncMock'):
            return None
        return v

    for sub_q in sub_questions:
        res = await lookup_semantic_cache(
            db, agent_id, sub_q, client_id, threshold, is_followup, return_diagnostics=True, active_product=active_product
        )
        if isinstance(res, (tuple, list)) and len(res) >= 3:
            item, sim, best_cand = res[0], res[1], res[2]
        elif isinstance(res, (tuple, list)) and len(res) == 2:
            item, sim = res[0], res[1]
            best_cand = item
        else:
            item, sim, best_cand = None, 0.0, None

        raw_thresh = getattr(best_cand, 'similarity_threshold', None) if best_cand else None
        if isinstance(raw_thresh, (int, float)):
            cand_thresh = float(raw_thresh)
            if cand_thresh > 1.0:
                cand_thresh = cand_thresh / 100.0
        else:
            cand_thresh = threshold

        query_diagnostics.append({
            "sub_query": sub_q.strip(),
            "matched_item_id": _safe_val(getattr(best_cand, 'id', None)),
            "matched_query": _safe_val(getattr(best_cand, 'user_query', None)),
            "similarity": round(sim, 4),
            "similarity_pct": f"{sim * 100:.1f}%",
            "threshold": round(cand_thresh, 4),
            "threshold_pct": f"{cand_thresh * 100:.1f}%",
            "approved": bool(item is not None)
        })

        if item:
            matched_items.append(item)
            similarities.append(sim)
            resp_text = item.approved_response.strip()
            if resp_text not in seen_response_texts:
                seen_response_texts.add(resp_text)
                responses.append(resp_text)
        else:
            similarities.append(sim)

    avg_sim = sum(similarities) / len(similarities) if similarities else 0.0
    all_matched = len(matched_items) == len(sub_questions)

    if all_matched and responses:
        combined_response = "\n\n".join(responses)
        logger.info(f"⚡ [MULTI-QUERY CACHE HIT] {len(matched_items)}/{len(sub_questions)} perguntas atendidas pelo cache para agente {agent_id} (Similaridade Média: {avg_sim:.3f})")
        if return_diagnostics:
            return matched_items, combined_response, avg_sim, True, query_diagnostics
        return matched_items, combined_response, avg_sim, True

    if return_diagnostics:
        return (matched_items if matched_items else None), None, avg_sim, False, query_diagnostics
    return (matched_items if matched_items else None), None, avg_sim, False


async def update_semantic_cache(
    db: AsyncSession,
    cache_id: int,
    user_query: Optional[str] = None,
    approved_response: Optional[str] = None,
    alternate_queries: Optional[List[str]] = None,
    is_active: Optional[bool] = None,
    client_id: Optional[int] = None,
    similarity_threshold: Optional[float] = None,
    clear_similarity_threshold: bool = False,
    category_tag: Optional[str] = None,
    clear_category_tag: bool = False
) -> Optional[SemanticCacheModel]:
    """Atualiza a pergunta, resposta, variações, limiar individual e/ou tag de produto de um item do cache."""
    stmt = select(SemanticCacheModel).where(SemanticCacheModel.id == cache_id)
    if client_id is not None:
        stmt = stmt.where(SemanticCacheModel.client_id == client_id)
    res = await db.execute(stmt)
    item = res.scalars().first()
    if not item:
        return None

    if user_query is not None and user_query.strip():
        clean_q = user_query.strip()
        if clean_q != item.user_query:
            item.user_query = clean_q
            try:
                new_embedding, _ = await get_embedding(clean_q)
                item.embedding = new_embedding
            except Exception as e:
                logger.error(f"Erro ao regenerar embedding para o cache {cache_id}: {e}")

    if approved_response is not None and approved_response.strip():
        item.approved_response = approved_response.strip()

    if alternate_queries is not None:
        clean_alt_queries, alt_embeddings = await generate_embeddings_for_queries(alternate_queries)
        item.alternate_queries = clean_alt_queries
        item.alternate_embeddings = alt_embeddings

    if is_active is not None:
        item.is_active = is_active

    if clear_similarity_threshold:
        item.similarity_threshold = None
    elif similarity_threshold is not None:
        clean_thresh = float(similarity_threshold)
        if clean_thresh > 1.0:
            clean_thresh = clean_thresh / 100.0
        item.similarity_threshold = clean_thresh

    if clear_category_tag:
        item.category_tag = None
    elif category_tag is not None:
        item.category_tag = category_tag.strip() if category_tag.strip() else None

    item.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(item)
    logger.info(f"✏️ [CACHE SEMÂNTICO] Item {cache_id} atualizado com sucesso (tag={item.category_tag}, limiar={item.similarity_threshold}).")
    return item


async def list_semantic_caches(
    db: AsyncSession,
    agent_id: int,
    search: Optional[str] = None,
    page: int = 1,
    page_size: int = 10,
    client_id: Optional[int] = None,
    category_tag: Optional[str] = None
) -> Tuple[list, int, int]:
    """Lista as respostas salvas no cache semântico com paginação, busca e filtro por produto/categoria."""
    stmt = select(SemanticCacheModel).where(SemanticCacheModel.agent_id == agent_id)
    if client_id is not None:
        stmt = stmt.where(SemanticCacheModel.client_id == client_id)

    if category_tag and category_tag.strip():
        cat_clean = category_tag.strip()
        if cat_clean in ("__general__", "general", "Geral", "geral"):
            stmt = stmt.where(SemanticCacheModel.category_tag.is_(None))
        else:
            stmt = stmt.where(SemanticCacheModel.category_tag == cat_clean)

    if search and search.strip():
        search_pattern = f"%{search.strip()}%"
        stmt = stmt.where(
            (SemanticCacheModel.user_query.ilike(search_pattern)) |
            (SemanticCacheModel.approved_response.ilike(search_pattern)) |
            (SemanticCacheModel.category_tag.ilike(search_pattern))
        )

    # Contagem total
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total_res = await db.execute(count_stmt)
    total = total_res.scalar() or 0

    total_pages = max(1, math.ceil(total / page_size)) if total > 0 else 1
    offset = (max(1, page) - 1) * page_size

    stmt = stmt.order_by(desc(SemanticCacheModel.usage_count), desc(SemanticCacheModel.updated_at)).offset(offset).limit(page_size)
    res = await db.execute(stmt)
    items = list(res.scalars().all())

    return items, total, total_pages
