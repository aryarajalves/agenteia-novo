import re
import json
from .providers import call_rag_llm

def split_by_question_marks(text: str) -> list[str]:
    """
    Splitter rápido por pontuação/regex. Utilizado como fallback de segurança
    quando a IA não estiver disponível ou falhar.
    
    Exemplos:
      - "possui certificado do mec ? quem é tarcira ?" -> ["possui certificado do mec ?", "quem é tarcira ?"]
      - "1. onde fica? 2. qual o horário?" -> ["onde fica?", "qual o horário?"]
      - "onde fica a escola???" -> ["onde fica a escola???"] (1 pergunta única)
    """
    if not text or not text.strip():
        return []
    
    stripped = text.strip()
    
    # 1. Separado por quebra de linha com numeração ou marcadores
    lines = [l.strip() for l in stripped.splitlines() if l.strip()]
    if len(lines) >= 2:
        valid_lines = []
        for line in lines:
            cleaned = re.sub(r'^\d+[\.\)\-]\s*|^[-*•]\s*', '', line).strip()
            if len(cleaned) >= 3:
                valid_lines.append(cleaned)
        if len(valid_lines) >= 2:
            return valid_lines

    # 2. Separado por pontos de interrogação distintos
    segments = re.findall(r'[^?]+(?:\?+|$)', stripped)
    cleaned_segments = [s.strip() for s in segments if s.strip()]

    if len(cleaned_segments) >= 2:
        meaningful = []
        for seg in cleaned_segments:
            cleaned = re.sub(r'^(e\s+|ou\s+|além disso,\s*|também,\s*)', '', seg, flags=re.IGNORECASE).strip()
            if len(cleaned) >= 3:
                meaningful.append(cleaned)
        
        q_mark_count = stripped.count("?")
        if q_mark_count >= 2 and len(meaningful) >= 2:
            return meaningful

    return [stripped]


async def decompose_user_queries(
    query: str, 
    model: str = "gpt-4o-mini", 
    fallback: str = None,
    use_ai: bool = True
) -> tuple[list[str], any]:
    """
    Decompõe e extrai perguntas da mensagem do usuário usando IA semântica (LLM).
    
    A IA:
    1. Filtra ruídos e saudações ("oi", "tudo bem?") que não devem ser buscados na base.
    2. Identifica se existem 1, 2 ou mais perguntas independentes, mesmo sem interrogação.
    3. Formula perguntas atômicas, limpas e canônicas para máxima precisão na busca vetorial.
    4. Caso a IA falhe ou timeout, aciona o fallback resiliente por regex.
    """
    if not query or not query.strip():
        return [], None

    cleaned_query = query.strip()

    # Otimização: se for palavra única ou trivial (ex: "preço", "oi", "pix"), não gasta IA
    words = cleaned_query.split()
    if len(words) <= 2 and "?" not in cleaned_query and " e " not in cleaned_query.lower():
        return [cleaned_query], None

    if use_ai:
        try:
            prompt = f"""Você é um analisador semântico de mensagens para um sistema de busca em base de conhecimento (RAG).
Sua tarefa é analisar a mensagem do usuário e extrair as dúvidas e perguntas reais que devem ser pesquisadas na base.

Diretrizes OBRIGATÓRIAS:
1. Ignore saudações e gentilezas conversacionais (ex: "olá", "boa tarde", "tudo bem?", "obrigado"). Elas NÃO são perguntas para a base de conhecimento.
2. Se a mensagem contiver mais de uma dúvida/pergunta diferente (mesmo que não use ponto de interrogação ou use conjunções como 'e', 'além disso'), separe-as em perguntas atômicas, limpas e diretas.
3. Se duas frases tratam do mesmo assunto/intenção, unifique-as em uma única pergunta limpa.
4. Se houver apenas uma dúvida, retorne uma lista com apenas essa pergunta limpa e bem formulada.
5. Mantenha os termos técnicos, nomes de produtos ou professores intactos.

Mensagem do usuário: "{cleaned_query}"

Responda APENAS com um objeto JSON no formato:
{{
  "questions": ["pergunta 1 limpa", "pergunta 2 limpa"]
}}"""

            response = await call_rag_llm(
                model=model,
                fallback=fallback,
                response_format={"type": "json_object"},
                messages=[{"role": "user", "content": prompt}],
                max_tokens=250
            )

            content = response.choices[0].message.content.strip()
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                content = content.split("```")[1].split("```")[0].strip()

            data = json.loads(content)
            questions = data.get("questions", [])
            if isinstance(questions, list) and len(questions) > 0:
                valid_qs = [q.strip() for q in questions if isinstance(q, str) and len(q.strip()) >= 3]
                if valid_qs:
                    return valid_qs, response.usage
        except Exception as e:
            print(f"[DECOMPOSITION ERROR] Falha na análise por IA, acionando fallback por pontuação: {e}")

    # Fallback por pontuação / regex se a chamada de IA falhar
    fast_questions = split_by_question_marks(cleaned_query)
    if len(fast_questions) >= 2:
        return fast_questions, None

    return [cleaned_query], None
