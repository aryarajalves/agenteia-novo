"""Orquestrador da tarefa de importação em streaming de conversas do ZapJords."""

import os
import sys
import time
import math
import asyncio
import logging
import httpx

from database import async_session
from core.websocket import manager
from models import WebhookConfigModel
from webhooks.service import ensure_leads_table
from .state import (
    _ACTIVE_IMPORTS,
    _CANCEL_REQUESTS,
    _RUNNING_TASKS,
    _IMPORT_STATUS,
    _update_status,
)
from .helpers import resolve_fast_zapvoice_url
from .processor import process_single_conversation

logger = logging.getLogger(__name__)


def _get_parent_attr(attr_name, default):
    """Obtém atributo dinamicamente do módulo pai webhooks.import_chat para respeitar mocks de teste."""
    mod = sys.modules.get("webhooks.import_chat") or sys.modules.get("backend.webhooks.import_chat")
    if mod and hasattr(mod, attr_name):
        return getattr(mod, attr_name)
    return default


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

    session_factory = _get_parent_attr("async_session", async_session)
    ensure_fn = _get_parent_attr("ensure_leads_table", ensure_leads_table)
    ws_manager = _get_parent_attr("manager", manager)
    httpx_mod = _get_parent_attr("httpx", httpx)

    try:
        async with session_factory() as db:
            config = await db.get(WebhookConfigModel, webhook_id)
            if not config:
                logger.error(f"[ImportChat] Webhook {webhook_id} não encontrado para importação.")
                return

            zv_url_raw = (getattr(config, "zapvoice_url", None) or os.getenv("ZAPVOICE_URL", "")).rstrip("/")
            zv_token = getattr(config, "zapvoice_api_token", None) or os.getenv("ZAPVOICE_API_TOKEN", "")
            zv_client_id = getattr(config, "zapvoice_client_id", None) or os.getenv("ZAPVOICE_CLIENT_ID", "")
            leads_table = config.leads_table or "leads"

        if not zv_url_raw or not zv_token:
            err_msg = "Configurações de URL ou Token do ZapVoice/ZapJords não preenchidas."
            logger.error(f"[ImportChat] {err_msg}")
            await ws_manager.broadcast({
                "type": "chat_import_progress",
                "webhook_id": webhook_id,
                "status": err_msg,
                "error": err_msg,
                "done": True
            })
            return

        zv_url = resolve_fast_zapvoice_url(zv_url_raw)
        await ensure_fn(leads_table)

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
        await ws_manager.broadcast({
            "type": "chat_import_progress",
            "webhook_id": webhook_id,
            **init_st
        })

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
            lead_delta, msg_delta, contact_label = await process_single_conversation(
                conv=conv,
                http_client=http_client,
                webhook_id=webhook_id,
                zv_url=zv_url,
                headers=headers,
                zv_client_id=zv_client_id,
                leads_table=leads_table,
                sem=sem,
                is_cancelled_fn=is_cancelled
            )

            async with completed_lock:
                completed_count += 1
                created_leads_count += lead_delta
                imported_messages_count += msg_delta
                pct = int((completed_count / total_convs) * 100) if total_convs > 0 else 0

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
                        await ws_manager.broadcast({
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
                        await ws_manager.broadcast({
                            "type": "leads_synced",
                            "webhook_id": webhook_id,
                            "action": "import_chat_progress",
                            "created_leads": created_leads_count,
                            "imported_messages": imported_messages_count
                        })
                    except Exception:
                        pass

        async_client_cls = getattr(httpx_mod, "AsyncClient", httpx.AsyncClient)
        async with async_client_cls(timeout=15.0, limits=limits) as http_client:
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
                await ws_manager.broadcast({
                    "type": "chat_import_progress",
                    "webhook_id": webhook_id,
                    **st_err
                })
                return

            if resp.status_code != 200:
                err_msg = f"Erro da API ZapJords ({resp.status_code}): {resp.text}"
                logger.error(f"[ImportChat] {err_msg}")
                st_err = _update_status(webhook_id, active=False, status=err_msg, error=err_msg, done=True)
                await ws_manager.broadcast({
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
                await ws_manager.broadcast({
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
            await ws_manager.broadcast({
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
            await ws_manager.broadcast({
                "type": "chat_import_cancelled",
                "webhook_id": webhook_id,
                **st_cancel
            })
            await ws_manager.broadcast({
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

        await ws_manager.broadcast({
            "type": "chat_import_completed",
            "webhook_id": webhook_id,
            **st_done
        })

        await ws_manager.broadcast({
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
            await ws_manager.broadcast({
                "type": "chat_import_cancelled",
                "webhook_id": webhook_id,
                **st_cancel
            })
            await ws_manager.broadcast({
                "type": "leads_synced",
                "webhook_id": webhook_id,
                "action": "import_chat_cancelled"
            })
        except Exception:
            pass
    except Exception as e:
        logger.error(f"[ImportChat] Erro inesperado na importação do webhook {webhook_id}: {e}", exc_info=True)
        if total_convs > 0 and completed_count >= total_convs:
            logger.info(f"[ImportChat] Importação concluída com sucesso para todas as {total_convs} conversas antes de erro de teardown.")
            st_done = _update_status(
                webhook_id,
                active=False,
                status=f"Importação concluída! {created_leads_count} novos contatos e {imported_messages_count} mensagens importadas.",
                current=total_convs,
                total=total_convs,
                percentage=100,
                created_leads=created_leads_count,
                imported_messages=imported_messages_count,
                done=True
            )
            try:
                await ws_manager.broadcast({
                    "type": "chat_import_completed",
                    "webhook_id": webhook_id,
                    **st_done
                })
            except Exception:
                pass
        else:
            st_err = _update_status(
                webhook_id,
                active=False,
                status=f"Erro inesperado: {str(e)}",
                error=str(e),
                done=False
            )
            try:
                await ws_manager.broadcast({
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
