"""
test_rag_query_cleaning.py

Testa a lógica de limpeza de queries antes de enviar ao banco vetorial,
e a prioridade de seleção da query limpa do pre-router vs. mensagem bruta.
"""
import re
import pytest


def _clean_rag_query(q: str) -> str:
    """Replica da função usada em webhook_tasks.py e agent_core/core.py"""
    q = re.sub(r'\.{2,}', ' ', q)
    q = re.sub(r'\betc\.?\b', '', q, flags=re.IGNORECASE)
    q = re.sub(r'[,;:\s]+$', '', q.strip())
    q = re.sub(r'\s{2,}', ' ', q)
    return q.strip()


class TestCleanRagQuery:
    def test_remove_multiple_dots(self):
        """Pontos múltiplos devem ser substituídos por espaço."""
        result = _clean_rag_query("Me fale sobre o curso ....valores...etc....")
        assert "...." not in result
        assert "..." not in result

    def test_remove_etc(self):
        """'etc.' e 'etc' devem ser removidos."""
        result = _clean_rag_query("Me fale sobre o curso, valores, etc.")
        assert "etc" not in result.lower()

    def test_remove_etc_mid_sentence(self):
        """'etc' no meio da frase também deve ser removido."""
        result = _clean_rag_query("Quero saber sobre preços, condições etc e prazos")
        assert "etc" not in result.lower()

    def test_preserves_real_content(self):
        """Conteúdo real não deve ser removido."""
        result = _clean_rag_query("Qual o valor do curso?")
        assert "valor" in result
        assert "curso" in result

    def test_cleans_trailing_punctuation(self):
        """Pontuação no final deve ser removida."""
        result = _clean_rag_query("Me fale sobre o curso, valores,")
        assert not result.endswith(",")

    def test_normalizes_spaces(self):
        """Múltiplos espaços devem ser normalizados."""
        result = _clean_rag_query("Me fale   sobre    o curso")
        assert "  " not in result

    def test_full_noisy_query(self):
        """Query com todos os ruídos combinados deve produzir texto limpo."""
        raw = "Me fale sobre o curso ....valores...etc...."
        result = _clean_rag_query(raw)
        assert "valores" in result
        assert "curso" in result
        assert "...." not in result
        assert "etc" not in result.lower()
        assert result == "Me fale sobre o curso valores"

    def test_empty_string(self):
        """String vazia não deve causar erro."""
        result = _clean_rag_query("")
        assert result == ""

    def test_only_noise(self):
        """String com apenas ruído deve resultar em string vazia."""
        result = _clean_rag_query("....etc....")
        assert result == ""


class TestPerguntasListPriority:
    """Testa a lógica de prioridade de seleção de query para o RAG."""

    def _simulate_query_selection(self, pre_router_result: dict, fallback_message: str) -> list:
        """Simula a lógica de seleção de query do webhook_tasks.py"""
        perguntas_list = pre_router_result.get("lista_perguntas_extraidas")
        if not perguntas_list or not isinstance(perguntas_list, list) or not any(p.strip() for p in perguntas_list):
            pergunta_limpa = pre_router_result.get("perguntas_extraidas") or pre_router_result.get("mensagem_melhorada")
            if pergunta_limpa and str(pergunta_limpa).strip():
                perguntas_list = [str(pergunta_limpa).strip()]
            else:
                perguntas_list = [fallback_message]

        perguntas_list = [_clean_rag_query(q) for q in perguntas_list if q and q.strip()]
        if not perguntas_list:
            perguntas_list = [fallback_message]
        return perguntas_list

    def test_uses_lista_perguntas_extraidas_when_available(self):
        """Deve usar lista_perguntas_extraidas quando disponível e não vazia."""
        pre_router = {
            "lista_perguntas_extraidas": ["Qual o valor do curso?", "Como funciona o pagamento?"],
            "perguntas_extraidas": "mensagem original bruta"
        }
        result = self._simulate_query_selection(pre_router, "fallback")
        assert "Qual o valor do curso?" in result
        assert "Como funciona o pagamento?" in result

    def test_falls_back_to_perguntas_extraidas(self):
        """Deve usar perguntas_extraidas quando lista está vazia."""
        pre_router = {
            "lista_perguntas_extraidas": [],
            "perguntas_extraidas": "Qual o valor do curso?"
        }
        result = self._simulate_query_selection(pre_router, "fallback bruto")
        assert result == ["Qual o valor do curso?"]

    def test_falls_back_to_mensagem_melhorada(self):
        """Deve usar mensagem_melhorada quando perguntas_extraidas também está vazia."""
        pre_router = {
            "lista_perguntas_extraidas": None,
            "perguntas_extraidas": None,
            "mensagem_melhorada": "Qual o valor do curso de laser?"
        }
        result = self._simulate_query_selection(pre_router, "fallback bruto")
        assert result == ["Qual o valor do curso de laser?"]

    def test_falls_back_to_raw_message(self):
        """Deve usar mensagem bruta como último recurso."""
        pre_router = {
            "lista_perguntas_extraidas": None,
            "perguntas_extraidas": None,
            "mensagem_melhorada": None
        }
        result = self._simulate_query_selection(pre_router, "Me fale sobre o curso")
        assert result == ["Me fale sobre o curso"]

    def test_cleans_noisy_query_from_lista(self):
        """Queries na lista devem ser limpas de ruídos."""
        pre_router = {
            "lista_perguntas_extraidas": ["Me fale sobre o curso ....valores...etc...."]
        }
        result = self._simulate_query_selection(pre_router, "fallback")
        assert "etc" not in result[0].lower()
        assert "...." not in result[0]
        assert "valores" in result[0]
