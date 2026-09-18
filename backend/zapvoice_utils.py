import httpx
import logging
import json
import os
import asyncio

logger = logging.getLogger(__name__)

def resolve_fast_zapvoice_url(raw_url: str) -> str:
    """Substitui URL pública pela URL interna do Docker quando disponível para acelerar requisições em 100x."""
    url = (raw_url or "").rstrip("/")
    if "api.aryaraj.shop" in url or "localhost:8000" in url or "127.0.0.1:8000" in url:
        return os.getenv("ZAPVOICE_INTERNAL_URL", "http://zapvoice_app:8000").rstrip("/")
    return url

async def sync_conversation_labels(zapvoice_url: str, client_id: str, conversation_id: int, token: str, to_add: list = None, to_remove: list = None):
    """
    Sincroniza as etiquetas de uma conversa no ZapVoice de forma idempotente.
    Retorna uma tupla (sucesso: bool, etiquetas_finais: list)
    """
    if not zapvoice_url or not client_id or not conversation_id or not token:
        logger.warning(f"Dados insuficientes para sincronizar etiquetas ZapVoice: url={zapvoice_url}, client_id={client_id}, conv={conversation_id}")
        return False, []

    zapvoice_url = resolve_fast_zapvoice_url(zapvoice_url)
    if not zapvoice_url.endswith("/api"):
        zapvoice_url = f"{zapvoice_url}/api"
    to_add = to_add or []
    to_remove = to_remove or []

    # 1. Obter etiquetas atuais
    # No ZapVoice, para ler etiquetas de uma conversa específica, podemos buscar a lista de conversas e filtrar
    conversas_url = f"{zapvoice_url}/chat/conversations"
    headers = {
        "Authorization": f"Bearer {token}",
        "X-Client-ID": str(client_id),
        "Content-Type": "application/json"
    }
    
    try:
        async with httpx.AsyncClient(timeout=10, verify=False) as client:
            cur_resp = await client.get(conversas_url, headers=headers)
            current_labels = []
            if cur_resp.status_code == 200:
                convs = cur_resp.json()
                # ZapVoice pode retornar a lista encapsulada em chave (ex: {"conversations": [...]})
                if isinstance(convs, dict):
                    # Tenta descobrir o array de conversas
                    convs = convs.get("conversations") or convs.get("data") or convs.get("results") or list(convs.values())[0] if convs.values() else []
                if isinstance(convs, list):
                    for c in convs:
                        if isinstance(c, dict) and str(c.get("id")) == str(conversation_id):
                            current_labels = c.get("labels", [])
                            break
            else:
                logger.error(f"❌ Erro ao listar conversas para buscar etiquetas no ZapVoice: {cur_resp.status_code} - {cur_resp.text}")
                return False, []
            
            # 2. Calcular novo conjunto de etiquetas
            final_labels = [l for l in current_labels if l not in to_remove]
            for l in to_add:
                if l not in final_labels:
                    final_labels.append(l)
            
            # 3. Se não houver mudança e nem to_add/to_remove vazios pendentes, pula o POST
            if not to_add and not to_remove:
                return True, current_labels

            if set(final_labels) == set(current_labels):
                logger.info(f"✅ Etiquetas já sincronizadas para conversa {conversation_id} no ZapVoice")
                return True, final_labels
                
            # 4. Atualizar no ZapVoice
            labels_url = f"{zapvoice_url}/chat/conversations/{conversation_id}/labels"
            update_resp = await client.post(labels_url, json={"labels": final_labels}, headers=headers)
            if update_resp.status_code == 200:
                logger.info(f"🏷️ Etiquetas sincronizadas no ZapVoice para conversa {conversation_id}: +{to_add} -{to_remove}")
                return True, final_labels
            else:
                logger.error(f"❌ Erro ao atualizar etiquetas no ZapVoice: {update_resp.status_code} - {update_resp.text}")
                return False, current_labels
                
    except Exception as e:
        logger.error(f"⚠️ Exceção ao sincronizar etiquetas ZapVoice: {e}")
        return False, []

def get_default_reset_labels(config) -> list:
    """
    Retorna a lista de etiquetas padrão para reset/deleção de um lead.
    Prioridade:
    1. config.delete_labels
    2. config.labels_on_message (etiquetas padrão da conversa)
    3. [] (caso nenhum esteja configurado)
    """
    if not config:
        return []
    
    # 1. Tentar delete_labels
    raw_delete = getattr(config, "delete_labels", None)
    if raw_delete:
        if isinstance(raw_delete, list):
            return [str(l).strip() for l in raw_delete if str(l).strip()]
        if isinstance(raw_delete, str) and raw_delete.strip():
            try:
                parsed = json.loads(raw_delete)
                if isinstance(parsed, list):
                    return [str(l).strip() for l in parsed if str(l).strip()]
            except Exception:
                pass

    # 2. Fallback: labels_on_message (etiquetas padrão adicionadas nas conversas)
    raw_msg_labels = getattr(config, "labels_on_message", None)
    if raw_msg_labels:
        if isinstance(raw_msg_labels, list):
            return [str(l).strip() for l in raw_msg_labels if str(l).strip()]
        if isinstance(raw_msg_labels, str) and raw_msg_labels.strip():
            try:
                parsed = json.loads(raw_msg_labels)
                if isinstance(parsed, list):
                    return [str(l).strip() for l in parsed if str(l).strip()]
            except Exception:
                pass

    return []

async def reset_conversation_labels(zapvoice_url: str, client_id: str, conversation_id: int or str, token: str, labels: list = None) -> bool:
    """
    Substitui todas as etiquetas de uma conversa no ZapVoice pelas etiquetas padrão fornecidas.
    """
    if not zapvoice_url or not conversation_id or not token:
        logger.warning(f"Dados insuficientes para resetar etiquetas ZapVoice: url={zapvoice_url}, conv={conversation_id}")
        return False

    zapvoice_url = zapvoice_url.rstrip("/")
    if not zapvoice_url.endswith("/api"):
        zapvoice_url = f"{zapvoice_url}/api"

    labels_url = f"{zapvoice_url}/chat/conversations/{conversation_id}/labels"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    if client_id:
        headers["X-Client-ID"] = str(client_id)

    payload_labels = labels if labels is not None else []

    try:
        async with httpx.AsyncClient(timeout=10.0, verify=False) as client:
            resp = await client.post(labels_url, json={"labels": payload_labels}, headers=headers)
            if resp.status_code in (200, 201):
                logger.info(f"🏷️ Etiquetas da conversa {conversation_id} resetadas no ZapVoice para o padrão: {payload_labels}")
                return True
            else:
                logger.error(f"❌ Erro ao resetar etiquetas no ZapVoice ({resp.status_code}): {resp.text}")
                return False
    except Exception as e:
        logger.error(f"⚠️ Exceção ao resetar etiquetas ZapVoice: {e}")
        return False


async def bulk_reset_conversation_labels(
    zapvoice_url: str,
    default_client_id: str,
    conv_info_list: list,
    token: str,
    labels: list = None,
    concurrency: int = 5
) -> dict:
    """
    Reseta as etiquetas de múltiplas conversas no ZapVoice de forma concorrente e reutilizando o pool HTTP.
    Ideal para exclusão em lote de contatos sem travar a interface do usuário.
    conv_info_list: lista de tuplas (conv_id, acc_id)
    """
    if not zapvoice_url or not conv_info_list or not token:
        return {"total": 0, "success": 0, "failed": 0}

    zapvoice_url = resolve_fast_zapvoice_url(zapvoice_url)
    if not zapvoice_url.endswith("/api"):
        zapvoice_url = f"{zapvoice_url}/api"

    # Deduplicar conversas para não fazer requisições repetidas
    seen = set()
    unique_convs = []
    for item in conv_info_list:
        if not item or not item[0]:
            continue
        c_id = str(item[0])
        if c_id not in seen:
            seen.add(c_id)
            unique_convs.append((c_id, item[1] if len(item) > 1 else None))

    payload_labels = labels if labels is not None else []
    total = len(unique_convs)
    if total == 0:
        return {"total": 0, "success": 0, "failed": 0}

    logger.info(f"🏷️ [BULK-RESET] Iniciando reset concorrente de etiquetas para {total} conversas no ZapVoice.")

    semaphore = asyncio.Semaphore(concurrency)
    success_count = 0
    fail_count = 0

    limits = httpx.Limits(max_keepalive_connections=concurrency, max_connections=concurrency + 5)
    async with httpx.AsyncClient(timeout=10.0, verify=False, limits=limits) as client:
        async def _reset_one(conv_id, acc_id):
            nonlocal success_count, fail_count
            eff_aid = acc_id or default_client_id
            labels_url = f"{zapvoice_url}/chat/conversations/{conv_id}/labels"
            headers = {
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json"
            }
            if eff_aid:
                headers["X-Client-ID"] = str(eff_aid)
            async with semaphore:
                try:
                    resp = await client.post(labels_url, json={"labels": payload_labels}, headers=headers)
                    if resp.status_code in (200, 201):
                        success_count += 1
                    else:
                        fail_count += 1
                        logger.warning(f"Aviso ao resetar etiquetas da conversa {conv_id} ({resp.status_code})")
                except Exception as e:
                    fail_count += 1
                    logger.warning(f"Exceção ao resetar etiquetas da conversa {conv_id}: {e}")

        tasks = [_reset_one(c_id, a_id) for c_id, a_id in unique_convs]
        await asyncio.gather(*tasks, return_exceptions=True)

    logger.info(f"✅ [BULK-RESET] Concluído reset para {total} conversas ({success_count} sucesso, {fail_count} falhas).")
    return {"total": total, "success": success_count, "failed": fail_count}


def reset_conversation_labels_sync(zapvoice_url: str, client_id: str, conversation_id: int or str, token: str, labels: list = None) -> bool:
    """
    Versão síncrona para resetar etiquetas de conversa no ZapVoice.
    """
    if not zapvoice_url or not conversation_id or not token:
        logger.warning(f"Dados insuficientes para resetar etiquetas ZapVoice (sync): url={zapvoice_url}, conv={conversation_id}")
        return False

    zapvoice_url = resolve_fast_zapvoice_url(zapvoice_url)
    if not zapvoice_url.endswith("/api"):
        zapvoice_url = f"{zapvoice_url}/api"

    labels_url = f"{zapvoice_url}/chat/conversations/{conversation_id}/labels"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    if client_id:
        headers["X-Client-ID"] = str(client_id)

    payload_labels = labels if labels is not None else []

    try:
        with httpx.Client(timeout=10.0, verify=False) as client:
            resp = client.post(labels_url, json={"labels": payload_labels}, headers=headers)
            if resp.status_code in (200, 201):
                logger.info(f"🏷️ Etiquetas da conversa {conversation_id} resetadas no ZapVoice (sync) para o padrão: {payload_labels}")
                return True
            else:
                logger.error(f"❌ Erro ao resetar etiquetas no ZapVoice sync ({resp.status_code}): {resp.text}")
                return False
    except Exception as e:
        logger.error(f"⚠️ Exceção ao resetar etiquetas ZapVoice (sync): {e}")
        return False

async def is_conversation_paused(zapvoice_url: str, client_id: str, conversation_id: int, token: str, ignore_label: str) -> bool:
    """
    Verifica se uma conversa deve ser ignorada baseada em uma etiqueta de pausa no ZapVoice.
    Retorna True se a etiqueta estiver presente, False caso contrário.
    """
    zapvoice_url = resolve_fast_zapvoice_url(zapvoice_url)
    if not zapvoice_url.endswith("/api"):
        zapvoice_url = f"{zapvoice_url}/api"
    conversas_url = f"{zapvoice_url}/chat/conversations"
    headers = {
        "Authorization": f"Bearer {token}",
        "X-Client-ID": str(client_id),
        "Content-Type": "application/json"
    }
    try:
        async with httpx.AsyncClient(timeout=10, verify=False) as client:
            resp = await client.get(conversas_url, headers=headers)
            if resp.status_code == 200:
                convs = resp.json()
                if isinstance(convs, dict):
                    convs = convs.get("conversations") or convs.get("data") or convs.get("results") or (list(convs.values())[0] if convs.values() else [])
                current_labels = []
                if isinstance(convs, list):
                    for c in convs:
                        if isinstance(c, dict) and str(c.get("id")) == str(conversation_id):
                            current_labels = c.get("labels", [])
                            break
                # Comparação case-insensitive
                return any(l.lower() == ignore_label.lower().strip() for l in current_labels if isinstance(l, str))
            else:
                logger.warning(f"⚠️ Falha ao buscar etiquetas (Status {resp.status_code}) para verificar pausa no ZapVoice")
    except Exception as e:
        logger.error(f"⚠️ Erro ao verificar etiquetas para ignorar no ZapVoice: {e}")
    return False

async def send_zapvoice_message(zapvoice_url: str, client_id: str, conversation_id: int, token: str, content: str, is_private: bool = False):
    """Envia uma mensagem (normal ou nota privada/handoff) para uma conversa no ZapVoice."""
    if not zapvoice_url or not client_id or not conversation_id or not token or not content:
        return False
    zapvoice_url = resolve_fast_zapvoice_url(zapvoice_url)
    if not zapvoice_url.endswith("/api"):
        zapvoice_url = f"{zapvoice_url}/api"
    url = f"{zapvoice_url}/chat/conversations/{conversation_id}/messages"
    headers = {
        "Authorization": f"Bearer {token}",
        "X-Client-ID": str(client_id),
        "Content-Type": "application/json"
    }
    try:
        async with httpx.AsyncClient(timeout=10, verify=False) as client:
            resp = await client.post(url, json={"content": content, "is_private": is_private}, headers=headers)
            return resp.status_code in (200, 201)
    except Exception as e:
        logger.error(f"Erro ao enviar mensagem ZapVoice: {e}")
        return False

def get_conversation_labels_sync(zapvoice_url: str, client_id: str, conversation_id: int, token: str) -> list:
    """
    Busca as etiquetas de uma conversa de forma síncrona no ZapVoice.
    """
    zapvoice_url = resolve_fast_zapvoice_url(zapvoice_url)
    if not zapvoice_url.endswith("/api"):
        zapvoice_url = f"{zapvoice_url}/api"
    url = f"{zapvoice_url}/chat/conversations"
    headers = {
        "Authorization": f"Bearer {token}",
        "X-Client-ID": str(client_id)
    }
    try:
        with httpx.Client(timeout=10, verify=False) as client:
            resp = client.get(url, headers=headers)
            if resp.status_code == 200:
                convs = resp.json()
                if isinstance(convs, dict):
                    convs = convs.get("conversations") or convs.get("data") or convs.get("results") or list(convs.values())[0] if convs.values() else []
                if isinstance(convs, list):
                    for c in convs:
                        if isinstance(c, dict) and str(c.get("id")) == str(conversation_id):
                            return c.get("labels", [])
                return []
            else:
                logger.error(f"Erro ao obter etiquetas do ZapVoice síncronamente (Status {resp.status_code}): {resp.text}")
                return None
    except Exception as e:
        logger.error(f"Exceção ao obter etiquetas do ZapVoice síncronamente: {e}")
        return None

async def update_zapvoice_lead_public(zapvoice_url: str, phone: str, token: str, data: dict):
    """
    Atualiza um contato no ZapVoice através do endpoint público de contatos.
    Rota: POST /api/leads/public/{phone}/update
    """
    if not zapvoice_url or not phone or not token:
        logger.warning("Dados insuficientes para atualizar contato público no ZapVoice")
        return False

    zapvoice_url = zapvoice_url.rstrip("/")
    if zapvoice_url.endswith("/api"):
        zapvoice_url = zapvoice_url[:-4]
        
    url = f"{zapvoice_url}/api/leads/public/{phone}/update"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    try:
        async with httpx.AsyncClient(timeout=10, verify=False) as client:
            resp = await client.post(url, json=data, headers=headers)
            if resp.status_code in (200, 201):
                logger.info(f"✅ Contato {phone} atualizado com sucesso no ZapVoice público.")
                return True
            else:
                logger.error(f"❌ Erro ao atualizar contato público no ZapVoice: {resp.status_code} - {resp.text}")
                return False
    except Exception as e:
        logger.error(f"⚠️ Exceção ao atualizar contato público no ZapVoice: {e}")
        return False

async def get_zapvoice_whatsapp_templates(zapvoice_url: str, token: str, client_id: str = None):
    """
    Busca a lista de templates oficiais do WhatsApp configurados no ZapVoice.
    Rota: GET /api/whatsapp/templates
    """
    if not zapvoice_url or not token:
        logger.warning("Dados insuficientes para buscar templates do ZapVoice")
        return []

    zapvoice_url = zapvoice_url.rstrip("/")
    if not zapvoice_url.endswith("/api"):
        zapvoice_url = f"{zapvoice_url}/api"

    url = f"{zapvoice_url}/whatsapp/templates"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    if client_id:
        headers["X-Client-ID"] = str(client_id)

    try:
        async with httpx.AsyncClient(timeout=10, verify=False) as client:
            resp = await client.get(url, headers=headers)
            if resp.status_code == 200:
                data = resp.json()
                templates = []
                if isinstance(data, list):
                    templates = data
                elif isinstance(data, dict):
                    templates = data.get("templates") or data.get("data") or data.get("results") or []
                logger.info(f"✅ {len(templates)} templates WhatsApp recuperados do ZapVoice.")
                return templates
            else:
                logger.error(f"❌ Erro ao buscar templates no ZapVoice: {resp.status_code} - {resp.text}")
                return []
    except Exception as e:
        logger.error(f"⚠️ Exceção ao buscar templates no ZapVoice: {e}")
        return []

async def send_zapvoice_whatsapp_template(zapvoice_url: str, token: str, client_id: str, phone: str, template_name: str, language: str = "pt_BR", components: list = None):
    """
    Envia um template oficial do WhatsApp através da API do ZapVoice.
    Rota: POST /api/whatsapp/send-template
    """
    if not zapvoice_url or not token or not phone or not template_name:
        logger.warning(f"Dados insuficientes para enviar template WhatsApp: url={zapvoice_url}, phone={phone}, template={template_name}")
        return False, "Dados insuficientes para envio"

    zapvoice_url = zapvoice_url.rstrip("/")
    if not zapvoice_url.endswith("/api"):
        zapvoice_url = f"{zapvoice_url}/api"

    url = f"{zapvoice_url}/whatsapp/send-template"
    clean_phone = phone.lstrip("+").replace(" ", "").replace("-", "").replace("(", "").replace(")", "")
    
    payload = {
        "phone_number": clean_phone,
        "template_name": template_name,
        "language": language or "pt_BR",
        "components": components or []
    }
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    if client_id:
        headers["X-Client-ID"] = str(client_id)

    try:
        async with httpx.AsyncClient(timeout=15, verify=False) as client:
            resp = await client.post(url, json=payload, headers=headers)
            if resp.status_code in (200, 201):
                logger.info(f"🚀 Template '{template_name}' enviado com sucesso para {clean_phone} via ZapVoice!")
                return True, resp.json() if resp.text else {}
            else:
                err_msg = f"Status {resp.status_code}: {resp.text}"
                logger.error(f"❌ Erro ao enviar template WhatsApp no ZapVoice: {err_msg}")
                return False, err_msg
    except Exception as e:
        logger.error(f"⚠️ Exceção ao enviar template WhatsApp no ZapVoice: {e}")
        return False, str(e)

