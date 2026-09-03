import re
import pytest
from agent_core.utils import format_whatsapp_message

def test_format_whatsapp_message_crammed_text():
    """Valida que o formatador transforma blocos de texto amontoados em mensagens arejadas com \\n\\n."""
    crammed_input = (
        "Claro.\n"
        "O Método Laser Day é 100% online com acesso vitalício. Estamos na Turma Fundadora e as aulas são lançadas semanalmente.\n"
        "Formato: aulas teóricas e práticas, com demonstrações em papel, balão e modelos reais.\n"
        "Conteúdo: protocolos completos de remoção de tatuagem, remoção de micropigmentação.\n"
        "Plataforma: Kiwify. Ao concluir todas as aulas você emite o certificado.\n"
        "Professora: Tarcira Martins, com 17 anos de experiência.\n"
        "Sobre equipamento: não é necessário comprar a máquina.\n"
        "Qualquer dúvida, estou à disposição."
    )

    formatted = format_whatsapp_message(crammed_input)

    # Não deve ter tópicos colados com '\n' simples
    assert "\nFormato:" not in formatted or "\n\nFormato:" in formatted
    assert "\nConteúdo:" not in formatted or "\n\nConteúdo:" in formatted
    assert "\nPlataforma:" not in formatted or "\n\nPlataforma:" in formatted
    assert "\nProfessora:" not in formatted or "\n\nProfessora:" in formatted
    assert "\nSobre equipamento:" not in formatted or "\n\nSobre equipamento:" in formatted
    assert "\nQualquer dúvida" not in formatted or "\n\nQualquer dúvida" in formatted

    # Deve separar a saudação inicial 'Claro.'
    assert formatted.startswith("Claro.\n\n")

    # Ao fazer split por '\n\n+', deve gerar múltiplos parágrafos/balões
    parts = [p.strip() for p in re.split(r'\n\n+', formatted) if p.strip()]
    assert len(parts) >= 5


def test_format_whatsapp_message_already_spaced():
    """Valida que mensagens já bem formatadas não são alteradas negativamente."""
    already_clean = "Olá!\n\nTudo bem?\n\nO valor do curso é R$ 197,00 à vista."
    formatted = format_whatsapp_message(already_clean)
    assert formatted == already_clean
