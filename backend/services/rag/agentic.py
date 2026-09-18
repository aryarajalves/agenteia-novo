import json
from .providers import call_rag_llm

async def rerank_results(query: str, items: list[dict], model: str = "gpt-4o-mini", fallback: str = None, q_label: str = "Pergunta", a_label: str = "Resposta", m_label: str = "Metadado"):
    """Uses LLM to re-rank the top results for maximum precision."""
    if not items or len(items) <= 1:
        return items, None
        
    try:
        # Prepare the list for the LLM to evaluate
        context_to_rank = ""
        for i, item in enumerate(items):
            meta_str = f"{m_label}: {item.get('metadata_val', '')}\n" if item.get('metadata_val') else ""
            vars_list = item.get("question_variations") or []
            vars_str = f" (Variações: {', '.join(vars_list)})" if vars_list else ""
            context_to_rank += f"[{i}] {meta_str}{q_label}: {item['question']}{vars_str}\n{a_label}: {item['answer']}\n\n"
            
        prompt = f"""
Sua tarefa é avaliar e reordenar os conhecimentos abaixo do mais relevante para o menos relevante em relação à Pergunta do Usuário.

Pergunta do Usuário: "{query}"

Conhecimentos Disponíveis:
{context_to_rank}

Diretrizes:
1. Analise o quanto cada conhecimento responde de forma direta, útil e precisa à pergunta do usuário.
2. Atribua uma nota de relevância de 0 a 100 para cada conhecimento com base em sua utilidade real para a pergunta.
3. Ordene a lista da maior nota (mais relevante) para a menor nota (menos relevante).

Responda EXCLUSIVAMENTE em formato JSON:
{{
  "ranking": [
    {{"index": 0, "score": 95}},
    {{"index": 1, "score": 80}}
  ]
}}
"""
        response = await call_rag_llm(
            model=model,
            fallback=fallback,
            response_format={"type": "json_object"},
            messages=[{"role": "user", "content": prompt}]
        )
        
        content = response.choices[0].message.content.strip()
        new_order = []
        score_by_idx = {}
        try:
            # Tenta limpar markdown se houver
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                content = content.split("```")[1].split("```")[0].strip()
            
            # Remove possíveis textos explicativos antes/depois do JSON
            if content.find("{") != -1 and content.rfind("}") != -1:
                content = content[content.find("{"):content.rfind("}")+1]
            elif content.find("[") != -1 and content.rfind("]") != -1:
                content = content[content.find("["):content.rfind("]")+1]

            parsed_data = json.loads(content)
            
            # Formato 1: {"ranking": [{"index": 0, "score": 95}, ...]}
            if isinstance(parsed_data, dict):
                raw_list = parsed_data.get("ranking") or parsed_data.get("items") or parsed_data.get("results")
                if not isinstance(raw_list, list) and parsed_data.values():
                    first_val = list(parsed_data.values())[0]
                    if isinstance(first_val, list):
                        raw_list = first_val
                if isinstance(raw_list, list):
                    for entry in raw_list:
                        if isinstance(entry, dict) and "index" in entry:
                            idx = entry.get("index")
                            sc = entry.get("score")
                            if isinstance(idx, int) and 0 <= idx < len(items):
                                new_order.append(idx)
                                if isinstance(sc, (int, float)):
                                    norm_sc = float(sc) / 100.0 if float(sc) > 1.0 else float(sc)
                                    score_by_idx[idx] = round(max(0.0, min(1.0, norm_sc)), 4)
                        elif isinstance(entry, int) and 0 <= entry < len(items):
                            new_order.append(entry)
            # Formato 2: Lista simples [2, 0, 1] ou de dicts
            elif isinstance(parsed_data, list):
                for entry in parsed_data:
                    if isinstance(entry, dict) and "index" in entry:
                        idx = entry.get("index")
                        sc = entry.get("score")
                        if isinstance(idx, int) and 0 <= idx < len(items):
                            new_order.append(idx)
                            if isinstance(sc, (int, float)):
                                norm_sc = float(sc) / 100.0 if float(sc) > 1.0 else float(sc)
                                score_by_idx[idx] = round(max(0.0, min(1.0, norm_sc)), 4)
                    elif isinstance(entry, int) and 0 <= entry < len(items):
                        new_order.append(entry)
        except Exception as json_e:
            print(f"[RERANK JSON ERROR] Failed to parse: {json_e} | Content: {content[:100]}...")
            new_order = []
            score_by_idx = {}

        reranked_items = []
        seen_indices = set()
        for idx in new_order:
            if 0 <= idx < len(items) and idx not in seen_indices:
                it = dict(items[idx])
                it["search_type"] = "hybrid + reranked"
                it["vector_score"] = it.get("relevance_score")
                if idx in score_by_idx:
                    it["relevance_score"] = score_by_idx[idx]
                    it["rerank_score"] = score_by_idx[idx]
                reranked_items.append(it)
                seen_indices.add(idx)
        
        for i, item in enumerate(items):
            if i not in seen_indices:
                it = dict(item)
                it["vector_score"] = it.get("relevance_score")
                if i in score_by_idx:
                    it["relevance_score"] = score_by_idx[i]
                    it["rerank_score"] = score_by_idx[i]
                reranked_items.append(it)
                
        return reranked_items, response.usage
        
    except Exception as e:
        print(f"[RERANK ERROR] Failed to rerank: {e}")
        return items, None

async def evaluate_rag_relevance(query: str, items: list[dict], model: str = "gpt-4o-mini", fallback: str = None, q_label: str = "Pergunta", a_label: str = "Resposta", m_label: str = "Metadado"):
    """Agentic step: Validates each retrieved item and returns only those that are truly relevant."""
    if not items:
        return [], None
        
    # Security bypass: If an item has a very high vector similarity, keep it regardless of evaluation
    # (Distance < 0.45 is usually a very strong match in cosine distance)
    TRUST_THRESHOLD = 0.45
    trusted_items = [i for i in items if i.get("distance") is not None and i.get("distance") < TRUST_THRESHOLD]
    
    try:
        context = ""
        for i, item in enumerate(items):
            meta_prefix = f"{m_label}: {item.get('metadata_val', '')} | " if item.get('metadata_val') else ""
            vars_list = item.get("question_variations") or []
            vars_str = f" [Variações: {', '.join(vars_list)}]" if vars_list else ""
            q_text = item['question'] if q_label == 'Pergunta' else q_label + ': ' + item['question']
            context += f"Conhecimento [{i}] (ID: {item['id']}): {meta_prefix}{q_text}{vars_str} -> {item['answer'][:400] if a_label == 'Resposta' else a_label + ': ' + item['answer'][:400]}\n"
            
        prompt = f"""
Sua tarefa é agir como um filtro de relevância para um sistema RAG (Busca de Conhecimento).
Pergunta do Usuário: "{query}"

Conhecimentos Recrutados:
{context}

Analise item por item e determine quais são ÚTEIS para responder à pergunta. 
Siga estas diretrizes:
1. Seja PERMISSIVO: Se o assunto for o mesmo, mantenha o item.
2. Sinônimos: 'Matriz' e 'Matriz de Fidelidade' indicam o mesmo assunto. 'Dívidas' e 'Débitos' também.
3. Parcialmente Útil: Se o conhecimento explica como chegar na resposta ou dá contexto relacionado, é ÚTIL.
4. Lixo/Irrelevante: Apenas descarte se o assunto for totalmente diferente (ex: o usuário pergunta de 'Preços' e o item fala de 'Faltas de Funcionários').

Responda APENAS com um objeto JSON contendo:
- "useful_indices": lista de índices considerados úteis.
- "discarded_reasons": um objeto onde a chave é o índice descartado e o valor é uma frase curta explicando o motivo do descarte.

Exemplo de resposta:
{{
  "useful_indices": [0, 2],
  "discarded_reasons": {{
    "1": "O item trata sobre políticas de cancelamento e o usuário perguntou sobre agendamento de consultas."
  }}
}}
"""
        response = await call_rag_llm(
            model="gpt-4o-mini", 
            fallback=model,
            max_tokens=300,
            response_format={"type": "json_object"},
            messages=[{"role": "user", "content": prompt}]
        )
        
        content = response.choices[0].message.content.strip()
        discarded_reasons = {}
        try:
            data = json.loads(content)
            useful_indices = data.get("useful_indices", [])
            discarded_reasons = data.get("discarded_reasons", {})
        except:
            if "SIM" in content.upper() or "[" in content:
                useful_indices = list(range(len(items)))
            else:
                useful_indices = []

        final_indices = set(useful_indices)
        for i, item in enumerate(items):
            if item.get("distance") is not None and item.get("distance") < TRUST_THRESHOLD:
                final_indices.add(i)
                if str(i) in discarded_reasons:
                    discarded_reasons.pop(str(i), None)
        
        relevant_items = [items[idx] for idx in sorted(list(final_indices)) if idx < len(items)]
        
        discarded_items = []
        for i, item in enumerate(items):
            if i not in final_indices:
                reason = discarded_reasons.get(str(i)) or discarded_reasons.get(i) or "Baixa similaridade semântica/avaliação de relevância negativa."
                item_copy = dict(item)
                item_copy["discard_reason"] = reason
                item_copy["discard_filter"] = "AGENTIC EVAL"
                discarded_items.append(item_copy)

        if not relevant_items and items and items[0].get("distance", 1.0) < 0.6:
             relevant_items = [items[0]]
             discarded_items = [x for x in discarded_items if x["id"] != items[0]["id"]]

        return relevant_items, discarded_items, response.usage
            
    except Exception as e:
        print(f"[AGENTIC RAG ERROR] Evaluation failed: {e}")
        return items, [], None

async def generate_multi_queries(query: str, count: int = 3, model: str = "gpt-4o-mini", fallback: str = None):
    """Generates multiple variations of the query to improve retrieval coverage."""
    try:
        prompt = f"""
Sua tarefa é gerar {count} variações curtas e diferentes da pergunta do usuário para ajudar na busca em um banco de dados.
Gere perguntas que foquem em diferentes palavras-chave ou intenções contidas na pergunta original.

Pergunta Original: "{query}"

Responda APENAS com uma lista JSON de strings.
Exemplo: ["pergunta 1", "pergunta 2", "pergunta 3"]
"""
        response = await call_rag_llm(
            model=model,
            fallback=fallback,
            response_format={"type": "json_object"},
            messages=[{"role": "user", "content": prompt}]
        )
        
        content = response.choices[0].message.content.strip()
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0].strip()
            
        data = json.loads(content)
        if isinstance(data, dict):
            queries = list(data.values())[0] if isinstance(list(data.values())[0], list) else []
        else:
            queries = data
            
        if query not in queries:
            queries.append(query)
            
        return queries[:count+1], response.usage
    except Exception as e:
        print(f"[MULTI-QUERY ERROR] Failed to generate: {e}")
        return [query], None
