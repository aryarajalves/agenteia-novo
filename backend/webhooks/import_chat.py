import os
import json
import logging
import asyncio
import math
import time
import httpx
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from database import get_db, async_session
from core.timezone import get_now_br
from core.websocket import manager
from models import WebhookConfigModel, WebhookEventModel
from .utils import normalize_phone, get_phone_suffix
from .service import ensure_leads_table

logger = logging.getLogger(__name__)
router = APIRouter()

# Rastreamento em memória da importação ativa e status atual por webhook_id
_ACTIVE_IMPORTS = set()
_CANCEL_REQUESTS = set()
_RUNNING_TASKS = {}
_IMPORT_STATUS = {}


def _update_status(webhook_id: int, **kwargs):
    prev = _IMPORT_STATUS.get(webhook_id, {
        "active": True,
        "current": 0,
        "total": 0,
        "percentage": 0,
        "status": "",
        "created_leads": 0,
        "imported_messages": 0,
        "current_contact": "",
        "done": False,
        "cancelled": False,
        "error": None,
        "started_at": None,
        "elapsed_seconds": 0
    })
    prev.update(kwargs)
    _IMPORT_STATUS[webhook_id] = prev
    return prev



def resolve_fast_zapvoice_url(raw_url: str) -> str:
    """
    Substitui a URL pública da Cloudflare pela URL interna do Docker quando disponível,
    evitando que requisições em massa passem pelo túnel da internet (reduz latência de 2s para 10ms).
    """
    url = (raw_url or "").rstrip("/")
    if "api.aryaraj.shop" in url or "localhost:8000" in url or "127.0.0.1:8000" in url:
        return os.getenv("ZAPVOICE_INTERNAL_URL", "http://zapvoice_app:8000").rstrip("/")
    return url


def to_naive_datetime(dt):
    """Converte qualquer datetime ou string para datetime UTC naive (sem tzinfo) para colunas TIMESTAMP."""
    if dt is None:
        return None
    if isinstance(dt, str):
        try:
            dt = datetime.fromisoformat(dt.replace("Z", "+00:00"))
        except Exception:
            return datetime.utcnow()
    if isinstance(dt, datetime):
        if dt.tzinfo is not None:
            return dt.astimezone(timezone.utc).replace(tzinfo=None)
        return dt
    return datetime.utcnow()


def to_aware_utc(dt):
    """Converte qualquer datetime ou string para datetime UTC aware (com tzinfo=timezone.utc)."""
    if dt is None:
        return datetime.now(timezone.utc)
    if isinstance(dt, str):
        try:
            dt = datetime.fromisoformat(dt.replace("Z", "+00:00"))
        except Exception:
            return datetime.now(timezone.utc)
    if isinstance(dt, datetime):
        if dt.tzinfo is None:
            return dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)
    return datetime.now(timezone.utc)


def is_system_or_badge_message(m: dict) -> bool:
    """
    Identifica se a mensagem é um badge ou evento de sistema (ex: marcadores adicionados,
    início de funil, logs de atendente) para não importar como resposta de agente.
    Templates do WhatsApp NUNCA são considerados badges.
    """
    if not isinstance(m, dict):
        return True

    msg_type = str(m.get("message_type") or "").strip().lower()
    meta = m.get("meta_data") if isinstance(m.get("meta_data"), dict) else {}
    content = str(m.get("content") or "").strip()

    # 1. WhatsApp Templates são mensagens legítimas enviadas ao lead (boas-vindas, confirmação de compra, etc.)
    if msg_type == "template" or meta.get("is_template") or content.startswith("[Template:"):
        return False

    sender_type = str(m.get("sender_type") or "").strip().lower()
    if sender_type in ("system", "badge", "event", "log", "system_event"):
        return True

    if msg_type in ("funnel_event", "system_event", "badge", "log", "tag_event", "label_event"):
        return True

    if not content:
        # Se não tem texto nem mídia, não é uma mensagem real
        return not bool(m.get("media_url"))

    content_lower = content.lower()

    # Menções a marcadores / etiquetas do sistema
    if "marcador(es)" in content_lower:
        return True

    # Notificações de ação de atendente do ZapVoice (ex: 'O atendente Super Admin adicionou...')
    if "o atendente" in content_lower and ("adicionou" in content_lower or "removeu" in content_lower):
        return True

    # Notificações de início ou execução de funis
    if "🚀 funil" in content_lower or "funil em execução" in content_lower or "foi iniciado" in content_lower:
        return True

    return False


async def run_chat_import_task(webhook_id: int):
    """Executa a importação completa de conversas e mensagens do ZapJords em segundo plano."""
    if webhook_id in _ACTIVE_IMPORTS:
        logger.warning(f"[ImportChat] Importação já em andamento para webhook_id={webhook_id}")
        return

    _ACTIVE_IMPORTS.add(webhook_id)
    _CANCEL_REQUESTS.discard(webhook_id)
    _RUNNING_TASKS[webhook_id] = asyncio.current_task()

    def is_cancelled():
        return webhook_id in _CANCEL_REQUESTS

    try:
        async with async_session() as db:
            config = await db.get(WebhookConfigModel, webhook_id)
            if not config:
                logger.error(f"[ImportChat] Webhook {webhook_id} não encontrado para importação.")
                return

            zv_url_raw = (getattr(config, "zapvoice_url", None) or os.getenv("ZAPVOICE_URL", "")).rstrip("/")
            zv_token = getattr(config, "zapvoice_api_token", None) or os.getenv("ZAPVOICE_API_TOKEN", "")
            zv_client_id = getattr(config, "zapvoice_client_id", None) or os.getenv("ZAPVOICE_CLIENT_ID", "")

            if not zv_url_raw or not zv_token:
                err_msg = "Configurações de URL ou Token do ZapVoice/ZapJords não preenchidas."
                logger.error(f"[ImportChat] {err_msg}")
                await manager.broadcast({
                    "type": "chat_import_progress",
                    "webhook_id": webhook_id,
                    "status": err_msg,
                    "error": err_msg,
                    "done": True
                })
                return

            zv_url = resolve_fast_zapvoice_url(zv_url_raw)
            leads_table = config.leads_table or "leads"
            await ensure_leads_table(leads_table)

            headers = {
                "Authorization": f"Bearer {zv_token}"
            }
            if zv_client_id:
                headers["X-Client-ID"] = str(zv_client_id)

            start_timestamp = time.time()
            init_st = _update_status(
                webhook_id,
                active=True,
                status="Conectando ao ZapJords e buscando conversas...",
                current=0,
                total=0,
                percentage=0,
                created_leads=0,
                imported_messages=0,
                current_contact="",
                done=False,
                cancelled=False,
                error=None,
                started_at=start_timestamp,
                elapsed_seconds=0
            )
            await manager.broadcast({
                "type": "chat_import_progress",
                "webhook_id": webhook_id,
                **init_st
            })

            # Concorrência otimizada (10 workers com conexão direta ou 5 externa)
            is_fast_direct = "zapvoice_app" in zv_url
            concurrency = 10 if is_fast_direct else 5
            sem = asyncio.Semaphore(concurrency)
            limits = httpx.Limits(max_keepalive_connections=concurrency + 5, max_connections=concurrency + 10)
            conv_queue = asyncio.Queue(maxsize=300)

            completed_lock = asyncio.Lock()
            completed_count = 0
            created_leads_count = 0
            imported_messages_count = 0
            last_broadcast_time = 0.0
            last_leads_sync_time = 0.0
            total_convs = 0
            producer_finished = False

            async def _process_conv(conv, http_client):
                nonlocal completed_count, created_leads_count, imported_messages_count, last_broadcast_time, last_leads_sync_time
                conv_id = conv.get("id")
                if not conv_id:
                    return

                raw_phone = conv.get("phone", "")
                phone = normalize_phone(raw_phone)
                contact_name = conv.get("contact_name") or ""
                labels_raw = conv.get("labels", [])
                labels_json = json.dumps(labels_raw, ensure_ascii=False) if isinstance(labels_raw, list) else (labels_raw or "[]")
                last_msg_content = conv.get("last_message_content") or ""
                last_msg_at_str = conv.get("last_message_at")
                last_msg_at = to_naive_datetime(last_msg_at_str)
                client_id_val = str(conv.get("client_id") or zv_client_id or "")

                lead_created_delta = 0
                msg_imported_delta = 0
                skip_messages_fetch = False
                existing_lead_id = None
                lead_already_exists = False

                # 🧠 Otimização 3: Filtro Inteligente de Mensagens por Data / Cache
                # Verifica no banco se o lead já existe e se a data da última mensagem coincide
                async with async_session() as conv_db:
                    suffix = get_phone_suffix(phone, 8) if phone else ""
                    check_lead_q = text(f"""
                        SELECT id, ultima_mensagem_em, labels, contato_nome FROM {leads_table}
                        WHERE webhook_config_id = :wid 
                        AND (
                            (conversa_id IS NOT NULL AND conversa_id = :cid)
                            OR (:tel != '' AND (telefone = :tel OR RIGHT(telefone, 8) = :suffix))
                        )
                        LIMIT 1
                    """)
                    lead_res = await conv_db.execute(check_lead_q, {
                        "wid": webhook_id,
                        "cid": str(conv_id),
                        "tel": phone,
                        "suffix": suffix
                    })
                    lead_row = lead_res.fetchone()

                    if lead_row:
                        lead_already_exists = True
                        try:
                            existing_lead_id = lead_row[0]
                            existing_ultima_msg = lead_row[1] if len(lead_row) > 1 else None
                            existing_labels = lead_row[2] if len(lead_row) > 2 else None
                            existing_name = lead_row[3] if len(lead_row) > 3 else None
                        except Exception:
                            existing_lead_id = getattr(lead_row, "id", None)
                            existing_ultima_msg = getattr(lead_row, "ultima_mensagem", None)
                            existing_labels = getattr(lead_row, "etiquetas", None)
                            existing_name = getattr(lead_row, "nome", None)
                        # Compara datas com tolerância de fuso horário / segundos
                        dt1 = existing_ultima_msg.replace(tzinfo=None) if (existing_ultima_msg and hasattr(existing_ultima_msg, "tzinfo") and existing_ultima_msg.tzinfo) else existing_ultima_msg
                        dt2 = last_msg_at.replace(tzinfo=None) if (last_msg_at and hasattr(last_msg_at, "tzinfo") and last_msg_at.tzinfo) else last_msg_at
                        is_same_date = (dt1 is not None and dt2 is not None and abs((dt1 - dt2).total_seconds()) <= 2)

                        if is_same_date and not is_system_or_badge_message({"content": last_msg_content}):
                            # Verifica se o histórico dessa conversa já possui mensagens gravadas
                            has_events = await conv_db.scalar(
                                text("SELECT 1 FROM webhook_events WHERE webhook_config_id = :wid AND conversa_id = :cid LIMIT 1"),
                                {"wid": webhook_id, "cid": str(conv_id)}
                            )
                            if has_events:
                                skip_messages_fetch = True
                                # Atualiza dados cadastrais se houve alteração de nome ou etiquetas
                                if (contact_name and contact_name != existing_name) or (labels_json and labels_json != existing_labels):
                                    await conv_db.execute(text(f"""
                                        UPDATE {leads_table}
                                        SET contato_nome = COALESCE(NULLIF(:nome, ''), contato_nome),
                                            labels = :labels,
                                            updated_at = :now
                                        WHERE id = :lid
                                    """), {
                                        "nome": contact_name,
                                        "labels": labels_json,
                                        "now": datetime.utcnow(),
                                        "lid": existing_lead_id
                                    })
                                    await conv_db.commit()

                if not skip_messages_fetch and not is_cancelled():
                    async with sem:
                        try:
                            msg_resp = await http_client.get(
                                f"{zv_url}/api/chat/conversations/{conv_id}/messages",
                                headers=headers,
                                params={"limit": 0}
                            )
                            raw_messages = msg_resp.json() if (msg_resp.status_code == 200 and isinstance(msg_resp.json(), list)) else []
                        except Exception as e_msg_fetch:
                            logger.warning(f"[ImportChat] Falha ao buscar mensagens da conversa {conv_id}: {repr(e_msg_fetch)}")
                            raw_messages = []

                        if is_system_or_badge_message({"content": last_msg_content}):
                            for rm in reversed(raw_messages):
                                if not is_system_or_badge_message(rm):
                                    last_msg_content = rm.get("content") or ""
                                    if rm.get("timestamp"):
                                        last_msg_at = to_naive_datetime(rm.get("timestamp"))
                                    break

                        async with async_session() as conv_db:
                            if not lead_already_exists:
                                insert_lead_q = text(f"""
                                    INSERT INTO {leads_table} (
                                        webhook_config_id, conta_id, conversa_id, telefone, contato_nome,
                                        labels, mensagem, message_type, pode_enviar_mensagem,
                                        ultima_mensagem_em, followup_step, created_at, updated_at
                                    ) VALUES (
                                        :wid, :conta_id, :cid, :tel, :nome,
                                        :labels, :msg, 'text', TRUE,
                                        :ultima_msg_em, -1, :created_at, :updated_at
                                    )
                                """)
                                now_naive = datetime.utcnow()
                                await conv_db.execute(insert_lead_q, {
                                    "wid": webhook_id,
                                    "conta_id": client_id_val,
                                    "cid": str(conv_id),
                                    "tel": phone,
                                    "nome": contact_name,
                                    "labels": labels_json,
                                    "msg": last_msg_content,
                                    "ultima_msg_em": last_msg_at,
                                    "created_at": now_naive,
                                    "updated_at": now_naive
                                })
                                lead_created_delta = 1
                            else:
                                # Atualiza dados do lead com a última mensagem encontrada
                                await conv_db.execute(text(f"""
                                    UPDATE {leads_table}
                                    SET mensagem = COALESCE(NULLIF(:msg, ''), mensagem),
                                        ultima_mensagem_em = COALESCE(:ultima_msg_em, ultima_mensagem_em),
                                        contato_nome = COALESCE(NULLIF(:nome, ''), contato_nome),
                                        labels = :labels,
                                        updated_at = :now
                                    WHERE id = :lid
                                """), {
                                    "msg": last_msg_content,
                                    "ultima_msg_em": last_msg_at,
                                    "nome": contact_name,
                                    "labels": labels_json,
                                    "now": datetime.utcnow(),
                                    "lid": existing_lead_id
                                })

                            existing_msg_ids_q = text("""
                                SELECT mensagem_id FROM webhook_events 
                                WHERE webhook_config_id = :wid AND conversa_id = :cid AND mensagem_id IS NOT NULL
                            """)
                            ex_res = await conv_db.execute(existing_msg_ids_q, {"wid": webhook_id, "cid": str(conv_id)})
                            existing_msg_ids = set(r[0] for r in ex_res.fetchall())

                            for m in raw_messages:
                                msg_id = str(m.get("id"))
                                if not msg_id or msg_id in existing_msg_ids:
                                    continue

                                if is_system_or_badge_message(m):
                                    continue

                                sender_type = str(m.get("sender_type") or "contact").lower()
                                msg_type = m.get("message_type") or "text"
                                content = m.get("content") or ""
                                media_url = m.get("media_url")
                                timestamp_str = m.get("timestamp")
                                meta = m.get("meta_data") if isinstance(m.get("meta_data"), dict) else {}

                                msg_created_at = to_aware_utc(timestamp_str)

                                is_template = (
                                    msg_type == "template"
                                    or meta.get("is_template") is True
                                    or content.startswith("[Template:")
                                )

                                if is_template and not content:
                                    tpl_name = meta.get("template_name") or ""
                                    content = f"[WhatsApp Template: {tpl_name}]" if tpl_name else "[WhatsApp Template]"

                                if sender_type == "contact":
                                    dono = "usuario"
                                    msg_text = content
                                    agent_resp = None
                                elif is_template or sender_type in ("user", "agent", "bot", "attendant", "system"):
                                    dono = "agente"
                                    msg_text = None
                                    agent_resp = content
                                else:
                                    continue

                                step_title = "📥 Importação do ZapVoice (Template)" if is_template else "📥 Importação do ZapVoice"
                                step_detail = "Template WhatsApp importado via API do ZapJords" if is_template else "Histórico importado via API do ZapJords"

                                import_steps = json.dumps([
                                    {
                                        "step": step_title,
                                        "detail": step_detail,
                                        "metadata": {
                                            "is_zapvoice_import": True,
                                            "origin": "zapvoice_import",
                                            "is_template": is_template,
                                            "cost": 0.0
                                        }
                                    }
                                ], ensure_ascii=False)

                                raw_import_payload = json.dumps({
                                    "origin": "zapvoice_import",
                                    "is_zapvoice_import": True,
                                    "is_template": is_template,
                                    "zapjords_conversation_id": str(conv_id),
                                    "zapjords_message_id": msg_id
                                }, ensure_ascii=False)

                                new_event = WebhookEventModel(
                                    webhook_config_id=webhook_id,
                                    event_type="message_created",
                                    message_type=msg_type,
                                    conta_id=client_id_val,
                                    conversa_id=str(conv_id),
                                    mensagem_id=msg_id,
                                    telefone=phone,
                                    contato_nome=contact_name,
                                    mensagem=msg_text,
                                    agent_response=agent_resp,
                                    link=media_url,
                                    status="completed",
                                    dono=dono,
                                    created_at=msg_created_at,
                                    updated_at=msg_created_at,
                                    is_automatic=False,
                                    processing_steps=import_steps,
                                    raw_payload=raw_import_payload
                                )
                                conv_db.add(new_event)
                                existing_msg_ids.add(msg_id)
                                msg_imported_delta += 1

                            await conv_db.commit()

                async with completed_lock:
                    completed_count += 1
                    created_leads_count += lead_created_delta
                    imported_messages_count += msg_imported_delta
                    pct = int((completed_count / total_convs) * 100)
                    contact_label = contact_name or phone or f"Conversa #{conv_id}"

                    elapsed_sec = int(time.time() - start_timestamp)
                    st_cur = _update_status(
                        webhook_id,
                        active=True,
                        current=completed_count,
                        total=total_convs,
                        percentage=pct,
                        status=f"Importando conversa {completed_count} de {total_convs} - {contact_label}...",
                        created_leads=created_leads_count,
                        imported_messages=imported_messages_count,
                        current_contact=contact_label,
                        done=False,
                        started_at=start_timestamp,
                        elapsed_seconds=elapsed_sec
                    )

                    now_loop_time = asyncio.get_event_loop().time()
                    if (now_loop_time - last_broadcast_time >= 0.35) or (completed_count == total_convs):
                        last_broadcast_time = now_loop_time
                        try:
                            await manager.broadcast({
                                "type": "chat_import_progress",
                                "webhook_id": webhook_id,
                                **st_cur
                            })
                        except Exception:
                            pass

                    # 🔄 Transmite atualização para a lista de contatos capturados a cada 8s ou no final
                    if (now_loop_time - last_leads_sync_time >= 8.0) or (completed_count == total_convs):
                        last_leads_sync_time = now_loop_time
                        try:
                            await manager.broadcast({
                                "type": "leads_synced",
                                "webhook_id": webhook_id,
                                "action": "import_chat_progress",
                                "created_leads": created_leads_count,
                                "imported_messages": imported_messages_count
                            })
                        except Exception:
                            pass

            async with httpx.AsyncClient(timeout=15.0, limits=limits) as http_client:
                if is_cancelled():
                    raise asyncio.CancelledError()

                # 1. Busca a Página 1 para obter o total_count e iniciar o streaming imediato
                try:
                    resp = await http_client.get(
                        f"{zv_url}/api/chat/conversations",
                        headers=headers,
                        params={"limit": 100, "page": 1, "status": "all"}
                    )
                except Exception as net_err:
                    err_msg = f"Falha de conexão com ZapJords: {net_err}"
                    logger.error(f"[ImportChat] {err_msg}")
                    st_err = _update_status(webhook_id, active=False, status=err_msg, error=err_msg, done=True)
                    await manager.broadcast({
                        "type": "chat_import_progress",
                        "webhook_id": webhook_id,
                        **st_err
                    })
                    return

                if resp.status_code != 200:
                    err_msg = f"Erro da API ZapJords ({resp.status_code}): {resp.text}"
                    logger.error(f"[ImportChat] {err_msg}")
                    st_err = _update_status(webhook_id, active=False, status=err_msg, error=err_msg, done=True)
                    await manager.broadcast({
                        "type": "chat_import_progress",
                        "webhook_id": webhook_id,
                        **st_err
                    })
                    return

                data = resp.json()
                first_convs = data.get("conversations", []) if isinstance(data, dict) else (data if isinstance(data, list) else [])
                total_count_val = data.get("total_count") if isinstance(data, dict) else len(first_convs)
                total_convs = total_count_val or len(first_convs)

                if total_convs == 0 or not first_convs:
                    st_empty = _update_status(
                        webhook_id,
                        active=False,
                        status="Nenhuma conversa encontrada no ZapJords para importar.",
                        current=0,
                        total=0,
                        percentage=100,
                        created_leads=0,
                        imported_messages=0,
                        done=True
                    )
                    await manager.broadcast({
                        "type": "chat_import_completed",
                        "webhook_id": webhook_id,
                        **st_empty
                    })
                    return

                total_pages = math.ceil(total_convs / 100) if total_convs > 100 else 1

                st_start = _update_status(
                    webhook_id,
                    status=f"Encontradas {total_convs} conversas. Importando em fluxo contínuo...",
                    current=0,
                    total=total_convs,
                    percentage=0,
                    created_leads=0,
                    imported_messages=0,
                    done=False
                )
                await manager.broadcast({
                    "type": "chat_import_progress",
                    "webhook_id": webhook_id,
                    **st_start
                })

                # Coloca a Página 1 na fila para início imediato
                for c in first_convs:
                    if is_cancelled():
                        break
                    await conv_queue.put(c)

                # Produtor para buscar as páginas restantes (2..N) concorrentemente
                async def _fetch_remaining_pages():
                    nonlocal producer_finished
                    if total_pages > 1 and not is_cancelled():
                        page_sem = asyncio.Semaphore(4 if is_fast_direct else 2)

                        async def _fetch_page(pg_num):
                            if is_cancelled():
                                return
                            async with page_sem:
                                try:
                                    p_resp = await http_client.get(
                                        f"{zv_url}/api/chat/conversations",
                                        headers=headers,
                                        params={"limit": 100, "page": pg_num, "status": "all"}
                                    )
                                    if p_resp.status_code == 200 and not is_cancelled():
                                        p_data = p_resp.json()
                                        p_convs = p_data.get("conversations", []) if isinstance(p_data, dict) else []
                                        for conv_item in p_convs:
                                            if is_cancelled():
                                                break
                                            await conv_queue.put(conv_item)
                                except Exception as p_err:
                                    logger.warning(f"[ImportChat] Erro ao buscar página {pg_num}: {p_err}")

                        page_tasks = [_fetch_page(p) for p in range(2, total_pages + 1)]
                        await asyncio.gather(*page_tasks, return_exceptions=True)

                    producer_finished = True
                    for _ in range(concurrency):
                        await conv_queue.put(None)

                producer_task = asyncio.create_task(_fetch_remaining_pages())

                async def _worker():
                    while True:
                        if is_cancelled():
                            break
                        try:
                            conv = await asyncio.wait_for(conv_queue.get(), timeout=0.5)
                        except asyncio.TimeoutError:
                            if producer_finished and conv_queue.empty():
                                break
                            continue

                        if conv is None:
                            conv_queue.task_done()
                            break

                        try:
                            if not is_cancelled():
                                await _process_conv(conv, http_client)
                        except Exception as worker_err:
                            logger.error(f"[ImportChat] Erro na conversa {conv.get('id')}: {worker_err}", exc_info=True)
                        finally:
                            conv_queue.task_done()

                worker_tasks = [asyncio.create_task(_worker()) for _ in range(concurrency)]
                await asyncio.gather(producer_task, *worker_tasks, return_exceptions=True)

            if is_cancelled():
                logger.info(f"[ImportChat] Importação cancelada pelo usuário (webhook_id={webhook_id})")
                st_cancel = _update_status(
                    webhook_id,
                    active=False,
                    status="Importação cancelada pelo usuário.",
                    done=True,
                    cancelled=True,
                    elapsed_seconds=int(time.time() - start_timestamp)
                )
                await manager.broadcast({
                    "type": "chat_import_cancelled",
                    "webhook_id": webhook_id,
                    **st_cancel
                })
                await manager.broadcast({
                    "type": "leads_synced",
                    "webhook_id": webhook_id,
                    "action": "import_chat_cancelled"
                })
                return

            # 3. Finalização
            total_duration = int(time.time() - start_timestamp)
            final_status = f"Importação concluída em {total_duration}s! {created_leads_count} novos contatos criados e {imported_messages_count} mensagens importadas."
            logger.info(f"[ImportChat] {final_status} (webhook_id={webhook_id})")

            st_done = _update_status(
                webhook_id,
                active=False,
                status=final_status,
                current=total_convs,
                total=total_convs,
                percentage=100,
                created_leads=created_leads_count,
                imported_messages=imported_messages_count,
                done=True,
                elapsed_seconds=total_duration
            )

            await manager.broadcast({
                "type": "chat_import_completed",
                "webhook_id": webhook_id,
                **st_done
            })

            await manager.broadcast({
                "type": "leads_synced",
                "webhook_id": webhook_id,
                "action": "import_chat",
                "created_leads": created_leads_count,
                "imported_messages": imported_messages_count
            })

    except asyncio.CancelledError:
        logger.info(f"[ImportChat] Tarefa de importação cancelada para webhook_id={webhook_id}")
        st_cancel = _update_status(
            webhook_id,
            active=False,
            status="Importação cancelada pelo usuário.",
            done=True,
            cancelled=True,
            elapsed_seconds=int(time.time() - start_timestamp)
        )
        try:
            await manager.broadcast({
                "type": "chat_import_cancelled",
                "webhook_id": webhook_id,
                **st_cancel
            })
            await manager.broadcast({
                "type": "leads_synced",
                "webhook_id": webhook_id,
                "action": "import_chat_cancelled"
            })
        except Exception:
            pass
    except Exception as e:
        logger.error(f"[ImportChat] Erro inesperado na importação do webhook {webhook_id}: {e}", exc_info=True)
        st_err = _update_status(
            webhook_id,
            active=False,
            status=f"Erro inesperado: {str(e)}",
            error=str(e),
            done=False
        )
        try:
            await manager.broadcast({
                "type": "chat_import_progress",
                "webhook_id": webhook_id,
                **st_err
            })
        except Exception:
            pass
    finally:
        _ACTIVE_IMPORTS.discard(webhook_id)
        _CANCEL_REQUESTS.discard(webhook_id)
        _RUNNING_TASKS.pop(webhook_id, None)
        if webhook_id in _IMPORT_STATUS:
            _IMPORT_STATUS[webhook_id]["active"] = False


@router.post("/{webhook_id}/leads/import-zapjords")
async def import_chat_from_zapjords(webhook_id: int, db: AsyncSession = Depends(get_db)):
    """Inicia a importação em segundo plano de todas as conversas e mensagens do ZapJords."""
    config = await db.get(WebhookConfigModel, webhook_id)
    if not config:
        raise HTTPException(status_code=404, detail="Webhook não encontrado")

    zv_url = (getattr(config, "zapvoice_url", None) or os.getenv("ZAPVOICE_URL", "")).rstrip("/")
    zv_token = getattr(config, "zapvoice_api_token", None) or os.getenv("ZAPVOICE_API_TOKEN", "")

    if not zv_url or not zv_token:
        raise HTTPException(
            status_code=400,
            detail="Configurações do ZapVoice/ZapJords (URL ou Token) não configuradas nesta integração."
        )

    if webhook_id in _ACTIVE_IMPORTS:
        return {
            "ok": True,
            "message": "A importação já está em andamento. Acompanhe pelo painel.",
            "active": True
        }

    asyncio.create_task(run_chat_import_task(webhook_id))

    return {
        "ok": True,
        "message": "Importação de conversas e histórico iniciada com sucesso.",
        "active": True
    }


@router.get("/{webhook_id}/leads/import-status")
async def get_chat_import_status(webhook_id: int, db: AsyncSession = Depends(get_db)):
    """Retorna o status atual da importação de conversas do ZapJords para o webhook."""
    status = _IMPORT_STATUS.get(webhook_id)
    if not status:
        config = await db.get(WebhookConfigModel, webhook_id)
        table_name = getattr(config, "leads_table", "leads") or "leads"
        total_leads = 0
        try:
            res = await db.execute(text(f"SELECT count(*) FROM {table_name} WHERE webhook_config_id = :wid"), {"wid": webhook_id})
            total_leads = res.scalar() or 0
        except Exception:
            total_leads = 0

        is_act = webhook_id in _ACTIVE_IMPORTS
        return {
            "active": is_act,
            "current": total_leads,
            "total": total_leads,
            "percentage": 100 if (not is_act and total_leads > 0) else 0,
            "status": f"Importação concluída. {total_leads} contatos sincronizados." if (not is_act and total_leads > 0) else "Nenhuma importação ativa",
            "created_leads": total_leads,
            "imported_messages": 0,
            "current_contact": "",
            "done": not is_act,
            "error": None,
            "started_at": None,
            "elapsed_seconds": 0
        }
    return status


@router.post("/{webhook_id}/leads/cancel-import")
async def cancel_chat_import(webhook_id: int):
    """Cancela uma importação de conversas do ZapJords em andamento."""
    if webhook_id not in _ACTIVE_IMPORTS:
        return {
            "ok": False,
            "message": "Nenhuma importação ativa para este webhook.",
            "active": False
        }

    _CANCEL_REQUESTS.add(webhook_id)
    logger.info(f"[ImportChat] Cancelamento solicitado para webhook_id={webhook_id}")

    cur_status = _IMPORT_STATUS.get(webhook_id, {})
    started_at = cur_status.get("started_at")
    elapsed = int(time.time() - started_at) if started_at else cur_status.get("elapsed_seconds", 0)

    st_cancel = _update_status(
        webhook_id,
        active=False,
        status="Importação cancelada pelo usuário.",
        done=True,
        cancelled=True,
        elapsed_seconds=elapsed
    )

    task = _RUNNING_TASKS.get(webhook_id)
    if task and not task.done():
        task.cancel()

    try:
        await manager.broadcast({
            "type": "chat_import_cancelled",
            "webhook_id": webhook_id,
            **st_cancel
        })
        await manager.broadcast({
            "type": "leads_synced",
            "webhook_id": webhook_id,
            "action": "import_chat_cancelled"
        })
    except Exception:
        pass

    return {
        "ok": True,
        "message": "Importação cancelada com sucesso.",
        "active": False
    }

