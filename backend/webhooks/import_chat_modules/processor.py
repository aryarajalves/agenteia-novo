"""Processamento individual de conversas e sincronização de mensagens e contatos."""

import sys
import json
import logging
from datetime import datetime
from sqlalchemy import text

from database import async_session
from models import WebhookEventModel
from webhooks.utils import normalize_phone, get_phone_suffix
from .helpers import to_naive_datetime, to_aware_utc, is_system_or_badge_message

logger = logging.getLogger(__name__)


def _get_async_session():
    """Recupera dinamicamente a async_session do módulo import_chat para suportar patches de teste."""
    mod = sys.modules.get("webhooks.import_chat") or sys.modules.get("backend.webhooks.import_chat")
    if mod and hasattr(mod, "async_session"):
        return mod.async_session
    return async_session


async def process_single_conversation(
    conv: dict,
    http_client,
    webhook_id: int,
    zv_url: str,
    headers: dict,
    zv_client_id: str,
    leads_table: str,
    sem,
    is_cancelled_fn
):
    """Processa uma única conversa: verifica cache, insere/atualiza o lead e importa as mensagens."""
    conv_id = conv.get("id")
    if not conv_id:
        return 0, 0, ""

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

    session_factory = _get_async_session()

    # 🧠 Filtro Inteligente de Mensagens por Data / Cache
    async with session_factory() as conv_db:
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

    if not skip_messages_fetch and not is_cancelled_fn():
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

            async with session_factory() as conv_db:
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

    contact_label = contact_name or phone or f"Conversa #{conv_id}"
    return lead_created_delta, msg_imported_delta, contact_label
