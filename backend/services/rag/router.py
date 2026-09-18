import json
import logging
import re
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

COMMON_PRODUCT_VARIABLE_KEYS = [
    "curso_interesse",
    "produto_interesse",
    "curso",
    "produto",
    "mentoria_interesse",
    "plano_interesse",
    "nome_curso",
    "nome_produto"
]

def _normalize_text(text: str) -> str:
    """Normaliza texto para comparações simples (minúsculas, sem pontuação excessiva)."""
    if not text:
        return ""
    text = text.lower()
    text = re.sub(r'[\s\-_/]+', ' ', text)
    return text.strip()

async def route_knowledge_bases(
    query: str,
    available_kbs: List[Dict[str, Any]],
    context_variables: Optional[Dict[str, Any]] = None,
    routing_var_name: Optional[str] = None,
    client: Any = None,
    model: str = "gpt-4o-mini"
) -> Dict[str, Any]:
    """
    Roteia dinamicamente a consulta do usuário para a(s) Base(s) de Conhecimento mais relevante(s),
    analisando:
    1. A variável de contexto de produto/curso (ex: curso_interesse).
    2. A descrição e nome de cada base de conhecimento vinculada.
    3. A pergunta do usuário e possíveis menções diretas.
    
    Retorna:
    {
        "selected_kb_ids": [id1, ...],
        "routing_variable": "curso_interesse",
        "extracted_product": "Curso de Tráfego Pago",
        "reason": "Base selecionada pela descrição correspondente ao curso",
        "is_ambiguous": False,
        "matched_kb_name": "Base - Curso de Tráfego Pago"
    }
    """
    if not available_kbs:
        return {
            "selected_kb_ids": [],
            "routing_variable": routing_var_name,
            "extracted_product": None,
            "reason": "Nenhuma base de conhecimento vinculada.",
            "is_ambiguous": False,
            "matched_kb_name": None
        }

    all_ids = [kb["id"] for kb in available_kbs if "id" in kb]
    if len(available_kbs) == 1:
        # Apenas 1 base vinculada: não há necessidade de roteamento
        first_kb = available_kbs[0]
        return {
            "selected_kb_ids": [first_kb["id"]],
            "routing_variable": routing_var_name,
            "extracted_product": None,
            "reason": f"Apenas uma base vinculada ('{first_kb.get('name')}').",
            "is_ambiguous": False,
            "matched_kb_name": first_kb.get("name")
        }

    context_variables = context_variables or {}

    # 1. Determinar qual variável de contexto consultar
    target_key = None
    if routing_var_name and routing_var_name.strip():
        target_key = routing_var_name.strip()
    else:
        # Procura chaves comuns em context_variables
        for k in COMMON_PRODUCT_VARIABLE_KEYS:
            if k in context_variables and context_variables[k] and str(context_variables[k]).strip() != "":
                target_key = k
                break
        if not target_key:
            for k in context_variables.keys():
                if "curso" in k.lower() or "produto" in k.lower():
                    if context_variables[k] and str(context_variables[k]).strip() != "":
                        target_key = k
                        break

    product_val = None
    if target_key and target_key in context_variables:
        raw_val = context_variables[target_key]
        if raw_val and str(raw_val).strip() not in ["", "None", "null"]:
            product_val = str(raw_val).strip()

    # 2. Matching Heurístico Rápido por Palavras-Chave (Economiza chamada LLM se for óbvio)
    if product_val:
        norm_product = _normalize_text(product_val)
        words = [w for w in norm_product.split() if len(w) > 3 and w not in ["curso", "para", "com", "como", "sobre"]]
        
        best_match = None
        best_score = 0
        for kb in available_kbs:
            kb_name = _normalize_text(kb.get("name", ""))
            kb_desc = _normalize_text(kb.get("description", ""))
            score = 0
            if norm_product in kb_name or norm_product in kb_desc:
                score += 10
            for w in words:
                if w in kb_name:
                    score += 3
                if w in kb_desc:
                    score += 2
            if score > best_score:
                best_score = score
                best_match = kb

        if best_match and best_score >= 3:
            logger.info(f"🎯 [KB ROUTER] Matching heurístico certeiro: Produto '{product_val}' -> Base '{best_match.get('name')}' (Score: {best_score})")
            return {
                "selected_kb_ids": [best_match["id"]],
                "routing_variable": target_key,
                "extracted_product": product_val,
                "reason": f"Produto '{product_val}' associado à base '{best_match.get('name')}' por correspondência direta.",
                "is_ambiguous": False,
                "matched_kb_name": best_match.get("name")
            }

    # 3. Matching Inteligente via LLM (quando há ambiguidade, sinônimos ou produto não claro)
    if not client:
        try:
            from agent import get_openai_client
            client = get_openai_client()
        except Exception:
            client = None

    if not client:
        # Fallback seguro caso client OpenAI não esteja disponível
        return {
            "selected_kb_ids": all_ids,
            "routing_variable": target_key,
            "extracted_product": product_val,
            "reason": "Cliente OpenAI indisponível; fallback para todas as bases.",
            "is_ambiguous": False,
            "matched_kb_name": None
        }

    kbs_catalog_text = ""
    for kb in available_kbs:
        kbs_catalog_text += f"- ID: {kb.get('id')} | Nome: '{kb.get('name')}' | Descrição: '{kb.get('description') or 'Sem descrição'}'\n"

    system_prompt = (
        "Você é o Seletor Agêntico de Bases de Conhecimento (KB Router) de uma plataforma de atendimento.\n"
        "Sua função é analisar a mensagem do usuário, o produto/curso de interesse já identificado e o catálogo de bases disponíveis (nomes e descrições) para selecionar EXATAMENTE qual base de conhecimento deve ser consultada.\n\n"
        "REGRAS DE DECISÃO:\n"
        "1. Se o produto/curso de interesse for conhecido ou for mencionado na mensagem do usuário (ou sinônimo evidente), selecione unicamente o ID da base de conhecimento correspondente àquele produto.\n"
        "2. Se a dúvida do usuário for genérica (ex: 'como funciona?', 'qual o valor?') e NÃO houver informação sobre qual produto/curso ele se refere, marque 'is_ambiguous': true e 'selected_kb_ids': [todos os IDs].\n"
        "3. Se a dúvida for sobre um assunto geral da empresa (ex: 'quem é o professor?', 'qual o WhatsApp de suporte?') aplicável a todas as bases, marque 'is_ambiguous': false e inclua os IDs pertinentes ou todos.\n"
        "4. Retorne APENAS um JSON no formato:\n"
        "{\n"
        '  "selected_kb_ids": [number],\n'
        '  "extracted_product": string or null,\n'
        '  "is_ambiguous": boolean,\n'
        '  "reason": string,\n'
        '  "matched_kb_name": string or null\n'
        "}"
    )

    user_prompt = (
        f"CATÁLOGO DE BASES DISPONÍVEIS:\n{kbs_catalog_text}\n"
        f"PRODUTO/CURSO ATUAL NA VARIÁVEL ('{target_key or 'não configurada'}'): {product_val or 'Nenhum valor informado ainda'}\n"
        f"MENSAGEM / DÚVIDA DO USUÁRIO: \"{query}\"\n\n"
        "Qual base de conhecimento deve ser consultada?"
    )

    try:
        response = await client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.0,
            response_format={"type": "json_object"}
        )
        content = response.choices[0].message.content.strip()
        data = json.loads(content)

        sel_ids = data.get("selected_kb_ids") or []
        # Validar que os IDs retornados pertencem aos IDs disponíveis
        valid_ids = [i for i in sel_ids if i in all_ids]
        if not valid_ids:
            valid_ids = all_ids

        matched_name = data.get("matched_kb_name")
        if len(valid_ids) == 1 and not matched_name:
            chosen = next((kb for kb in available_kbs if kb.get("id") == valid_ids[0]), None)
            if chosen:
                matched_name = chosen.get("name")

        return {
            "selected_kb_ids": valid_ids,
            "routing_variable": target_key,
            "extracted_product": data.get("extracted_product") or product_val,
            "reason": data.get("reason", "Roteamento definido por análise semântica."),
            "is_ambiguous": bool(data.get("is_ambiguous", False)),
            "matched_kb_name": matched_name
        }

    except Exception as e:
        logger.error(f"⚠️ [KB ROUTER ERROR] Falha no roteamento agêntico: {e}")
        return {
            "selected_kb_ids": all_ids,
            "routing_variable": target_key,
            "extracted_product": product_val,
            "reason": f"Fallback por erro na seleção: {e}",
            "is_ambiguous": False,
            "matched_kb_name": None
        }
