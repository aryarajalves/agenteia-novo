import pytest
from datetime import datetime
import zoneinfo
from services.followup_service import (
    is_within_business_hours,
    calculate_elapsed_business_minutes,
    format_delay_text
)


def test_format_delay_text():
    assert format_delay_text(15) == "15 minutos"
    assert format_delay_text(60) == "1 hora"
    assert format_delay_text(120) == "2 horas"
    assert format_delay_text(1440) == "1 dia"
    assert format_delay_text(2880) == "2 dias"
    assert format_delay_text(90) == "1.5 horas"


def test_is_within_business_hours_disabled():
    assert is_within_business_hours(None) is True
    assert is_within_business_hours("") is True
    assert is_within_business_hours({}) is True
    assert is_within_business_hours({"enabled": False}) is True


def test_calculate_elapsed_business_minutes_no_restriction():
    t1 = datetime(2026, 9, 18, 10, 0, 0)
    t2 = datetime(2026, 9, 18, 10, 45, 0)
    diff = calculate_elapsed_business_minutes(t1, t2, None)
    assert diff == 45.0


def test_calculate_elapsed_business_minutes_with_hours():
    bh = {
        "enabled": True,
        "start": "08:00",
        "end": "18:00",
        "weekdays": True,
        "saturday": False,
        "sunday": False
    }
    # Segunda-feira 2026-09-21: 10:00 UTC até 12:00 UTC (ambos dentro do horário comercial)
    t1 = datetime(2026, 9, 21, 13, 0, 0) # 10:00 SP
    t2 = datetime(2026, 9, 21, 15, 0, 0) # 12:00 SP
    elapsed = calculate_elapsed_business_minutes(t1, t2, bh)
    assert elapsed == 120.0
