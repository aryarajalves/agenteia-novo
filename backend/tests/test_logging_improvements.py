import logging
import pytest
from core.logging_setup import configure_logging, LOG_FORMAT, DATE_FORMAT

def test_configure_logging_setup():
    """Valida que configure_logging aplica formato com timestamp e silencia bibliotecas verbosas."""
    configure_logging("test_component")

    # 1. Verifica silenciamento de httpx, httpcore e urllib3
    assert logging.getLogger("httpx").level == logging.WARNING
    assert logging.getLogger("httpcore").level == logging.WARNING
    assert logging.getLogger("urllib3").level == logging.WARNING

    # 2. Verifica se o formato inclui timestamp (asctime)
    root_logger = logging.getLogger()
    assert len(root_logger.handlers) > 0

    handler = root_logger.handlers[0]
    assert handler.formatter is not None
    assert "%(asctime)s" in handler.formatter._fmt
    assert "%(levelname)s" in handler.formatter._fmt
    assert handler.formatter.datefmt == DATE_FORMAT

    # 3. Testa formatação de um registro de log real
    record = logging.LogRecord(
        name="test_logger",
        level=logging.INFO,
        pathname=__file__,
        lineno=25,
        msg="Teste de mensagem formatada",
        args=(),
        exc_info=None
    )
    formatted = handler.formatter.format(record)
    assert "[INFO]" in formatted
    assert "[test_logger]" in formatted
    assert "Teste de mensagem formatada" in formatted
