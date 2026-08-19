import pytest
from tasks import _format_delay_text

def test_format_delay_text_minutes():
    assert _format_delay_text(15) == "15 minutos"
    assert _format_delay_text(30) == "30 minutos"
    assert _format_delay_text(45) == "45 minutos"

def test_format_delay_text_hours():
    assert _format_delay_text(60) == "1 hora"
    assert _format_delay_text(120) == "2 horas"
    assert _format_delay_text(90) == "1.5 horas"

def test_format_delay_text_days():
    assert _format_delay_text(1440) == "1 dia"
    assert _format_delay_text(2880) == "2 dias"
    assert _format_delay_text(4320) == "3 dias"
