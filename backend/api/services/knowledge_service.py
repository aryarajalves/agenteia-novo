import json
import time
import logging
from typing import List, Optional, Dict, Any, Tuple
from fastapi import HTTPException
from models import KnowledgeBaseModel

logger = logging.getLogger(__name__)

MAX_QUESTION_VARIATIONS = 8


def get_item_embedding_text(question: str, variations: Optional[List[str]] = None) -> str:
    """Combina pergunta e suas variações para gerar vetor semântico composto."""
    clean_q = (question or "").strip()
    if variations and isinstance(variations, list):
        clean_vars = [v.strip() for v in variations if isinstance(v, str) and v.strip()]
        if clean_vars:
            return f"{clean_q}\n" + "\n".join(clean_vars)
    return clean_q


def clean_variations_list(raw_vars: Any) -> List[str]:
    """Normaliza e sanitiza lista de variações de perguntas."""
    if isinstance(raw_vars, str):
        try:
            raw_vars = json.loads(raw_vars)
        except Exception:
            raw_vars = []
    if not isinstance(raw_vars, list):
        return []
    return [str(v).strip() for v in raw_vars if isinstance(v, str) and str(v).strip()]


def validate_variations_count(count: int):
    """Garante que a quantidade de variações não ultrapasse o limite."""
    if count > MAX_QUESTION_VARIATIONS:
        raise HTTPException(
            status_code=400,
            detail=f"O item pode ter no máximo {MAX_QUESTION_VARIATIONS} variações de perguntas para manter a alta precisão semântica (evitar diluição do vetor)."
        )


def export_knowledge_base_dict(kb: KnowledgeBaseModel) -> Dict[str, Any]:
    """Estrutura os dados de uma base de conhecimento para exportação JSON."""
    return {
        "name": kb.name,
        "description": kb.description,
        "kb_type": kb.kb_type,
        "question_label": kb.question_label,
        "answer_label": kb.answer_label,
        "metadata_label": kb.metadata_label,
        "version": "1.0",
        "exported_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "items": [
            {
                "question": item.question,
                "answer": item.answer,
                "category": item.category,
                "metadata_val": item.metadata_val,
                "question_variations": item.question_variations or []
            }
            for item in (kb.items or [])
        ]
    }


def parse_import_payload(raw_data: Any) -> List[Dict[str, Any]]:
    """Extrai e valida itens de um JSON de importação."""
    items_data = raw_data.get("items") if isinstance(raw_data, dict) and "items" in raw_data else (raw_data if isinstance(raw_data, list) else [])
    if not items_data or not isinstance(items_data, list):
        raise HTTPException(status_code=400, detail="Formato inválido. O JSON deve conter um array 'items' ou uma lista de itens.")

    valid_items = []
    for item in items_data:
        if not isinstance(item, dict):
            continue
        q = item.get("question") or item.get("pergunta") or item.get("title") or ""
        a = item.get("answer") or item.get("resposta") or item.get("content") or ""
        cat = item.get("category") or item.get("categoria") or "Geral"
        meta = item.get("metadata_val") or item.get("metadata") or ""
        clean_vars = clean_variations_list(item.get("question_variations") or item.get("variacoes"))
        if q and a:
            valid_items.append({
                "question": q,
                "answer": a,
                "category": cat,
                "metadata_val": meta,
                "question_variations": clean_vars
            })
    return valid_items


def process_variation_addition(
    current_vars_raw: Any,
    variation: Optional[str],
    variations: Optional[List[str]]
) -> Tuple[List[str], List[str]]:
    """Valida e adiciona novas variações a um item sem ultrapassar o limite."""
    current_vars = clean_variations_list(current_vars_raw)
    if len(current_vars) >= MAX_QUESTION_VARIATIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Limite máximo de {MAX_QUESTION_VARIATIONS} variações atingido para manter a alta precisão semântica (evitar diluição do vetor). Exclua ou edite uma variação existente antes de adicionar uma nova."
        )

    incoming = []
    if variation and variation.strip():
        incoming.append(variation.strip())
    if variations:
        for v in variations:
            if isinstance(v, str) and v.strip():
                incoming.append(v.strip())

    if not incoming:
        raise HTTPException(status_code=400, detail="Nenhuma variação fornecida.")

    existing_lower = {v.lower().strip() for v in current_vars}
    added = []
    for v in incoming:
        if v.lower() not in existing_lower:
            existing_lower.add(v.lower())
            added.append(v)

    if not added:
        return current_vars, []

    if len(current_vars) + len(added) > MAX_QUESTION_VARIATIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Adicionar {len(added)} nova(s) variação(ões) excederia o limite máximo de {MAX_QUESTION_VARIATIONS}. Atualmente o item já possui {len(current_vars)} variações. Exclua ou edite variações existentes antes de adicionar novas."
        )

    updated_vars = list(current_vars) + added
    return updated_vars, added


def process_variation_removal(current_vars_raw: Any, variation_to_remove: str) -> List[str]:
    """Remove uma variação do item de conhecimento."""
    current_vars = clean_variations_list(current_vars_raw)
    var_lower = variation_to_remove.strip().lower()
    updated_vars = [v for v in current_vars if v.strip().lower() != var_lower]
    if len(updated_vars) == len(current_vars):
        raise HTTPException(status_code=404, detail="Variação não encontrada no item")
    return updated_vars
