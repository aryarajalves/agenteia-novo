import pytest
from datetime import datetime, timedelta
from tasks import _is_within_business_hours, calculate_elapsed_business_minutes

def test_is_within_business_hours_disabled():
    # Quando desativado ou None, deve retornar True sempre
    assert _is_within_business_hours(None) is True
    assert _is_within_business_hours({}) is True
    assert _is_within_business_hours({"enabled": False}) is True

def test_is_within_business_hours_json_string():
    # Deve aceitar JSON serializado em string (como salvo no banco de dados)
    bh_str = '{"enabled": true, "start": "08:00", "end": "20:00", "weekdays": true, "saturday": false, "sunday": false}'
    # Testando parsing sem estourar exceção
    res = _is_within_business_hours(bh_str)
    assert isinstance(res, bool)

def test_calculate_elapsed_business_minutes_overnight_pause():
    # Config de horário comercial: 08:00 às 20:00 (12h ativas por dia = 720 min/dia)
    bh = {
        "enabled": True,
        "start": "08:00",
        "end": "20:00",
        "weekdays": True,
        "saturday": True,
        "sunday": True
    }
    
    # 2026-08-10 é uma segunda-feira
    # Mensagem enviada às 19:00 SP (22:00 UTC)
    start_utc = datetime(2026, 8, 10, 22, 0, 0) 
    
    # 1 hora depois (20:00 SP / 23:00 UTC) -> deve ter contado 60 minutos úteis
    end_20h_utc = datetime(2026, 8, 10, 23, 0, 0)
    elapsed_1h = calculate_elapsed_business_minutes(start_utc, end_20h_utc, bh)
    assert elapsed_1h == 60.0

    # Na madrugada (03:00 SP do dia seguinte / 06:00 UTC do dia 11) -> continua tendo apenas 60 min úteis!
    end_3am_utc = datetime(2026, 8, 11, 6, 0, 0)
    elapsed_night = calculate_elapsed_business_minutes(start_utc, end_3am_utc, bh)
    assert elapsed_night == 60.0  # As 7 horas da madrugada não contaram

    # Às 09:00 SP do dia 11 (12:00 UTC do dia 11) -> 60 min (das 19h às 20h do dia anterior) + 60 min (das 08h às 09h de hoje) = 120 min
    end_9am_utc = datetime(2026, 8, 11, 12, 0, 0)
    elapsed_9am = calculate_elapsed_business_minutes(start_utc, end_9am_utc, bh)
    assert elapsed_9am == 120.0

def test_calculate_elapsed_business_minutes_disabled():
    # Quando o horário comercial está desativado, o tempo flui 24h normalmente
    start_utc = datetime(2026, 8, 10, 0, 0, 0)
    end_utc = datetime(2026, 8, 10, 3, 0, 0) # 3 horas = 180 min
    
    elapsed = calculate_elapsed_business_minutes(start_utc, end_utc, None)
    assert elapsed == 180.0
