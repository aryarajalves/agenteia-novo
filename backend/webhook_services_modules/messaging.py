import os
import logging
import httpx
import time
import re
import sys

logger = logging.getLogger(__name__)


def _get_send_media_func():
    ws_mod = sys.modules.get("webhook_services")
    if ws_mod and hasattr(ws_mod, "_send_zapvoice_media"):
        return getattr(ws_mod, "_send_zapvoice_media")
    return _send_zapvoice_media


def _get_send_message_func():
    ws_mod = sys.modules.get("webhook_services")
    if ws_mod and hasattr(ws_mod, "_send_zapvoice_message"):
        return getattr(ws_mod, "_send_zapvoice_message")
    return _send_zapvoice_message


def _send_zapvoice_media(db, event_id, conversation_id, client_id, media_url, media_type, config, caption="", meta_data=None, total_cost=None):
    """
    Envia uma mensagem de mídia (áudio, imagem, vídeo, documento) para o ZapVoice.
    Dispara via POST {zapvoice_url}/chat/conversations/{conversation_id}/media
    """
    import webhook_tasks
    try:
        url = (config.zapvoice_url or os.getenv("ZAPVOICE_URL", "")).rstrip("/")
        if url and not url.endswith("/api"):
            url = f"{url}/api"
        token = config.zapvoice_api_token or os.getenv("ZAPVOICE_API_TOKEN", "")

        if not url or not token:
            webhook_tasks._add_step(db, event_id, "❌ Erro: ZapVoice não configurado", "URL ou Token ausentes no .env/config.")
            return False

        if not conversation_id or not client_id:
            webhook_tasks._add_step(db, event_id, "❌ Erro: Dados faltantes", f"conversa_id={conversation_id}, client_id={client_id}")
            return False

        # Normalizar tipo de mídia para os tipos esperados pelo ZapVoice
        m_type = (media_type or "audio").lower()
        if m_type in ("audio", "voice", "ptt", "audio/ogg", "audio/mpeg", "audio/mp3", "audio/webm"):
            m_type = "audio"
        elif m_type in ("image", "foto", "photo", "image/png", "image/jpeg", "image/webp"):
            m_type = "image"
        elif m_type in ("video", "video/mp4", "video/quicktime"):
            m_type = "video"
        elif m_type in ("document", "file", "pdf", "application/pdf"):
            m_type = "document"

        headers = {
            "Authorization": f"Bearer {token}",
            "X-Client-ID": str(client_id),
            "Content-Type": "application/json"
        }
        full_url = f"{url}/chat/conversations/{conversation_id}/media"

        payload = {
            "media_url": media_url,
            "message_type": m_type
        }
        if caption and m_type in ("image", "video", "document"):
            payload["caption"] = caption
        if total_cost is not None:
            payload["total_cost"] = total_cost
        if meta_data is not None:
            payload["meta_data"] = meta_data

        part_success = False
        last_err_msg = ""
        for attempt in range(1, 4):
            try:
                with httpx.Client(timeout=60.0) as client:
                    resp = client.post(full_url, json=payload, headers=headers)
                    if resp.status_code in (200, 201):
                        part_success = True
                        break
                    else:
                        last_err_msg = f"Status {resp.status_code}: {resp.text[:200]}"
            except Exception as http_err:
                last_err_msg = str(http_err)

            if not part_success and attempt < 3:
                time.sleep(2 * attempt)

        if not part_success:
            webhook_tasks._add_step(db, event_id, f"❌ Falha no Envio de Mídia ({m_type})", f"Tentativas esgotadas (60s timeout). Último erro: {last_err_msg}")
            return False

        webhook_tasks._add_step(db, event_id, f"🎙️ Mídia entregue ({m_type})", f"Mídia enviada com sucesso ao ZapVoice.")
        return True
    except Exception as e:
        webhook_tasks._add_step(db, event_id, "❌ Erro crítico no envio de mídia", str(e))
        return False


def _send_zapvoice_message(db, event_id, conversation_id, client_id, content, config, split_paragraphs=False, delay=0, meta_data=None, total_cost=None, attachments=None):
    """
    Envia a resposta do agente para o ZapVoice.
    Nas partes intermediárias envia apenas o content. Na última parte envia content + total_cost / meta_data.
    Suporta anexos (attachments) de áudio, vídeo ou imagem via endpoint dedicado /media do ZapVoice.
    """
    import webhook_tasks
    try:
        url = (config.zapvoice_url or os.getenv("ZAPVOICE_URL", "")).rstrip("/")
        if url and not url.endswith("/api"):
            url = f"{url}/api"
        token = config.zapvoice_api_token or os.getenv("ZAPVOICE_API_TOKEN", "")

        if not url or not token:
            webhook_tasks._add_step(db, event_id, "❌ Erro: ZapVoice não configurado", "URL ou Token ausentes no .env/config.")
            return False

        if not conversation_id or not client_id:
            webhook_tasks._add_step(db, event_id, "❌ Erro: Dados faltantes", f"conversa_id={conversation_id}, client_id={client_id}")
            return False

        # Se houver anexos (attachments), despacha via endpoint de mídia do ZapVoice (/media)
        if attachments:
            send_media_func = _get_send_media_func()
            for att in attachments:
                att_url = att.get("data_url") or att.get("url") or att.get("media_url")
                att_type = att.get("file_type") or att.get("message_type") or "audio"
                att_caption = att.get("caption") or (content if att_type in ("image", "video", "document") else "")
                media_ok = send_media_func(
                    db, event_id, conversation_id, client_id,
                    media_url=att_url, media_type=att_type, config=config,
                    caption=att_caption, meta_data=meta_data, total_cost=total_cost
                )
                if not media_ok:
                    return False
                # Se o anexo era imagem/vídeo/documento e já levou o conteúdo como caption, limpa o texto para não duplicar
                if att_caption and content and att_type in ("image", "video", "document"):
                    content = ""

        from agent_core.utils import format_whatsapp_message
        formatted_content = format_whatsapp_message(content) if content else ""

        # Se não há texto para envio (ex: passo exclusivamente de áudio de funil por dúvida), encerra com sucesso
        if not formatted_content or not formatted_content.strip():
            return True

        if split_paragraphs and formatted_content:
            parts = [p.strip() for p in re.split(r'\n\n+', formatted_content) if p.strip()]
            if not parts:
                parts = [formatted_content]
        else:
            parts = [formatted_content]

        total_parts = len(parts)
        if total_parts > 1:
            webhook_tasks._add_step(db, event_id, "✂️ Resposta Fragmentada", f"A mensagem será enviada em {total_parts} partes com delay de {delay}s entre elas.")

        headers = {
            "Authorization": f"Bearer {token}",
            "X-Client-ID": str(client_id),
            "Content-Type": "application/json"
        }
        full_url = f"{url}/chat/conversations/{conversation_id}/messages"

        success = True
        for i, part in enumerate(parts):
            time.sleep(1)
            is_last_part = (i == total_parts - 1)

            payload = {"content": part, "is_private": False}
            # Apenas na última parte enviamos o custo total / meta_data
            if is_last_part:
                if total_cost is not None:
                    payload["total_cost"] = total_cost
                if meta_data is not None:
                    payload["meta_data"] = meta_data

            part_success = False
            last_err_msg = ""
            for attempt in range(1, 4):
                try:
                    with httpx.Client(timeout=60.0) as client:
                        resp = client.post(full_url, json=payload, headers=headers)
                        if resp.status_code in (200, 201):
                            part_success = True
                            break
                        else:
                            last_err_msg = f"Status {resp.status_code}: {resp.text[:200]}"
                except Exception as http_err:
                    last_err_msg = str(http_err)

                # Se falhou e ainda restam tentativas, aguarda um tempo progressivo (2s, 4s) antes de tentar novamente
                if not part_success and attempt < 3:
                    time.sleep(2 * attempt)

            if not part_success:
                webhook_tasks._add_step(db, event_id, f"❌ Falha de Conexão (Parte {i+1})", f"Tentativas esgotadas (60s timeout). Último erro: {last_err_msg}")
                success = False
                break

            if i < total_parts - 1 and delay > 0:
                time.sleep(delay)

        if success:
            if total_parts > 1:
                webhook_tasks._add_step(db, event_id, "📤 Partes entregues", f"Todas as {total_parts} partes foram enviadas com sucesso ao ZapVoice.")
            else:
                webhook_tasks._add_step(db, event_id, "📤 Resposta enviada ao ZapVoice", f"Mensagem única entregue com sucesso.")

        return success
    except Exception as e:
        webhook_tasks._add_step(db, event_id, "❌ Erro crítico no envio", str(e))
        return False
