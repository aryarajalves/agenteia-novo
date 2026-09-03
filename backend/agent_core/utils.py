import re

# Chaves internas do contexto que nunca devem ser expostas no debug/Raio-X
INTERNAL_CTX_KEYS = frozenset(("session_id", "thread_id", "agent_id"))

def sanitize_phone_number(phone: str) -> str:
    """Remove todos os caracteres não numéricos de uma string de telefone."""
    if not phone:
        return ""
    return re.sub(r"\D", "", str(phone))


def format_whatsapp_message(text: str) -> str:
    """
    Formata e limpa o texto para garantir leitura visual confortável no WhatsApp:
    - Impede que linhas e tópicos fiquem grudados em um único bloco denso de texto;
    - Separa saudações iniciais (ex: 'Claro.', 'Olá!') do parágrafo seguinte com linha em branco dupla;
    - Separa tópicos com dois pontos (ex: 'Formato:', 'Conteúdo:', 'Plataforma:') com quebras de linha duplas;
    - Separa frases terminadas em ponto quando seguidas de nova linha simples e letra maiúscula;
    - Normaliza quebras de linha múltiplas para no máximo 2 (\n\n).
    """
    if not text or not isinstance(text, str):
        return text or ""

    formatted = text.strip()

    # 1. Separar saudações iniciais curtas (ex: 'Claro.', 'Olá!', 'Oi!') do primeiro parágrafo
    formatted = re.sub(
        r'^(?P<greeting>Claro|Olá|Oi|Oie|Perfeito|Com certeza|Tudo bem|Entendi|Combinado|Show|Maravilha|Certo|Bom dia|Boa tarde|Boa noite)(?P<punct>[.!,?]?)\s*\n(?!\n)(?P<next>[A-ZÀ-Ú])',
        r'\g<greeting>\g<punct>\n\n\g<next>',
        formatted,
        flags=re.MULTILINE | re.IGNORECASE
    )

    # 2. Separar tópicos / listas com dois pontos grudados (ex: '\nFormato:', '\nConteúdo:', '\nPlataforma:', '\nSobre equipamento:')
    formatted = re.sub(
        r'([^\n])\n([A-ZÀ-Ú][a-zà-ú\w\s]{1,25}:)',
        r'\1\n\n\2',
        formatted
    )

    # 3. Separar frases terminadas em ponto final/exclamação/interrogação quando a próxima linha começa com maiúscula
    formatted = re.sub(
        r'([.!?])\n(?!\n)([A-ZÀ-Ú])',
        r'\1\n\n\2',
        formatted
    )

    # 4. Separar conclusões comuns no final (ex: '\nQualquer dúvida', '\nSe precisar', '\nFico à disposição')
    formatted = re.sub(
        r'([^\n])\n(Qualquer dúvida|Se precisar|Fico à disposição|Estou à disposição|Conte comigo|Um abraço)',
        r'\1\n\n\2',
        formatted,
        flags=re.IGNORECASE
    )

    # 5. Normalizar quebras de linha múltiplas para no máximo 2 (\n\n)
    formatted = re.sub(r'\n{3,}', '\n\n', formatted)

    return formatted.strip()
