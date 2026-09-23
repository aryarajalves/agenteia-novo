from datetime import datetime, timezone, timedelta
from typing import Optional

def to_brasilia_time(dt: Optional[datetime]) -> Optional[datetime]:
    """Converte um datetime UTC (ou ingênuo) para o fuso horário de Brasília (UTC-3)."""
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    tz_brasilia = timezone(timedelta(hours=-3))
    return dt.astimezone(tz_brasilia)
