import json
import logging
from datetime import datetime
import zoneinfo

logger = logging.getLogger(__name__)

def is_within_business_hours(bh: dict | str | None) -> bool:
    """Retorna True se o momento atual estiver dentro do horário comercial configurado (ou se sem restrição)."""
    if not bh:
        return True
    if isinstance(bh, str):
        try:
            bh = json.loads(bh)
        except Exception:
            return True
    if not isinstance(bh, dict) or not bh.get("enabled"):
        return True

    now = datetime.now(zoneinfo.ZoneInfo("America/Sao_Paulo"))
    weekday = now.weekday()  # 0=Mon … 6=Sun
    allowed_day = (
        (weekday < 5 and bh.get("weekdays", True)) or
        (weekday == 5 and bh.get("saturday", False)) or
        (weekday == 6 and bh.get("sunday", False))
    )
    if not allowed_day:
        return False
    current = now.strftime("%H:%M")
    start = bh.get("start", "08:00")
    end = bh.get("end", "20:00")
    return start <= current <= end


def calculate_elapsed_business_minutes(start_time: datetime, end_time: datetime, bh: dict | str | None) -> float:
    """Calcula minutos úteis decorridos considerando apenas a janela comercial."""
    if not bh:
        diff = end_time - start_time
        return diff.total_seconds() / 60.0

    if isinstance(bh, str):
        try:
            bh = json.loads(bh)
        except Exception:
            bh = None

    if not isinstance(bh, dict) or not bh.get("enabled"):
        diff = end_time - start_time
        return diff.total_seconds() / 60.0

    sp_tz = zoneinfo.ZoneInfo("America/Sao_Paulo")
    start_dt = start_time.replace(tzinfo=zoneinfo.ZoneInfo("UTC")).astimezone(sp_tz)
    end_dt = end_time.replace(tzinfo=zoneinfo.ZoneInfo("UTC")).astimezone(sp_tz)

    if start_dt >= end_dt:
        return 0.0

    total_minutes = 0.0
    bh_start_str = bh.get("start", "08:00")
    bh_end_str = bh.get("end", "20:00")

    try:
        h_start, m_start = map(int, bh_start_str.split(":"))
        h_end, m_end = map(int, bh_end_str.split(":"))
    except Exception:
        h_start, m_start = 8, 0
        h_end, m_end = 20, 0

    current = start_dt

    while current < end_dt:
        weekday = current.weekday()
        allowed_day = (
            (weekday < 5 and bh.get("weekdays", True)) or
            (weekday == 5 and bh.get("saturday", False)) or
            (weekday == 6 and bh.get("sunday", False))
        )

        day_start = current.replace(hour=h_start, minute=m_start, second=0, microsecond=0)
        day_end = current.replace(hour=h_end, minute=m_end, second=0, microsecond=0)

        if allowed_day:
            interval_start = max(current, day_start)
            interval_end = min(end_dt, day_end)
            if interval_start < interval_end:
                diff = interval_end - interval_start
                total_minutes += diff.total_seconds() / 60.0

        current = (current + datetime.resolution).replace(hour=0, minute=0, second=0, microsecond=0)
        current = current.replace(day=current.day) + (day_end - day_start)
        # Avança para o início do próximo dia
        from datetime import timedelta
        current = (current + timedelta(days=1)).replace(hour=h_start, minute=m_start, second=0, microsecond=0)

    return total_minutes


def check_lead_score_filter(lead_score: int | None, lead_classification: str | None, trigger: str | None) -> bool:
    """
    Avalia se o lead atende ao critério de temperatura/score do passo de follow-up.
    Triggers suportados: 'all' (padrão), 'hot', 'warm', 'cold', 'hot_warm'.
    """
    trigger_mode = (trigger or "all").lower().strip()
    if trigger_mode in ("all", "todos", "*", ""):
        return True

    classification = (lead_classification or "").lower().strip()
    score = lead_score if lead_score is not None else 0

    if trigger_mode in ("hot", "quente"):
        return classification == "quente" or score >= 70

    if trigger_mode in ("warm", "morno"):
        return classification == "morno" or (40 <= score < 70)

    if trigger_mode in ("cold", "frio"):
        return classification == "frio" or (score < 40 and classification != "quente")

    if trigger_mode in ("hot_warm", "quente_morno"):
        return classification in ("quente", "morno") or score >= 40

    return True


def resolve_ab_variation(step: dict, telefone: str) -> tuple[dict, str | None]:
    """
    Resolve se o passo possui teste A/B ativo e retorna os parâmetros da variação ('A' ou 'B')
    de forma determinística 50/50 baseada no telefone do lead.
    """
    if not step.get("ab_test_enabled"):
        return step, None

    # Extrai o último dígito numérico do telefone para split consistente 50/50
    digits = [c for c in str(telefone or "") if c.isdigit()]
    last_digit = int(digits[-1]) if digits else 0
    selected_var = "A" if (last_digit % 2 == 0) else "B"

    resolved_step = dict(step)
    if selected_var == "B":
        # Sobrescreve com os valores da variação B
        if step.get("variation_b_prompt"):
            resolved_step["custom_prompt"] = step.get("variation_b_prompt")
        if step.get("variation_b_message"):
            resolved_step["fixed_message"] = step.get("variation_b_message")
        if step.get("variation_b_template_name"):
            resolved_step["template_name"] = step.get("variation_b_template_name")

    return resolved_step, selected_var


def calculate_projected_dispatch_time(start_time: datetime, delay_minutes: float, bh: dict | str | None) -> datetime:
    """
    Calcula a data e hora projetada para o disparo:
    O delay é o intervalo real de inatividade (ex: 60 min, 1 dia = 24h, 2 dias = 48h).
    A janela comercial atua como trava de segurança (Não Perturbe): se a data prevista
    cair fora do horário comercial ou em dia não permitido, o envio é postergado para
    a reabertura do próximo expediente permitido.
    """
    from datetime import timedelta
    if delay_minutes <= 0:
        return start_time

    if isinstance(bh, str):
        try:
            bh = json.loads(bh)
        except Exception:
            bh = None

    sp_tz = zoneinfo.ZoneInfo("America/Sao_Paulo")
    if start_time.tzinfo is None:
        start_dt = start_time.replace(tzinfo=zoneinfo.ZoneInfo("UTC")).astimezone(sp_tz)
    else:
        start_dt = start_time.astimezone(sp_tz)

    target_dt = start_dt + timedelta(minutes=delay_minutes)

    if not isinstance(bh, dict) or not bh.get("enabled"):
        return target_dt.astimezone(zoneinfo.ZoneInfo("UTC"))

    bh_start_str = bh.get("start", "08:00")
    bh_end_str = bh.get("end", "20:00")

    try:
        h_start, m_start = map(int, bh_start_str.split(":"))
        h_end, m_end = map(int, bh_end_str.split(":"))
    except Exception:
        h_start, m_start = 8, 0
        h_end, m_end = 20, 0

    current = target_dt
    max_days = 365
    loops = 0

    while loops < max_days:
        loops += 1
        weekday = current.weekday()
        allowed_day = (
            (weekday < 5 and bh.get("weekdays", True)) or
            (weekday == 5 and bh.get("saturday", False)) or
            (weekday == 6 and bh.get("sunday", False))
        )

        day_start = current.replace(hour=h_start, minute=m_start, second=0, microsecond=0)
        day_end = current.replace(hour=h_end, minute=m_end, second=0, microsecond=0)

        if not allowed_day or current >= day_end:
            # Avança para a abertura do próximo dia
            current = (current + timedelta(days=1)).replace(hour=h_start, minute=m_start, second=0, microsecond=0)
            continue

        if current < day_start:
            # Antes da abertura, ajusta para o horário de abertura
            current = day_start
            break

        # Dentro do expediente permitido
        break

    return current.astimezone(zoneinfo.ZoneInfo("UTC"))
