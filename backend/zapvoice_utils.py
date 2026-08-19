import httpx
import logging
import json
import os

logger = logging.getLogger(__name__)

async def sync_conversation_labels(zapvoice_url: str, client_id: str, conversation_id: int, token: str, to_add: list = None, to_remove: list = None):
    """
    Sincroniza as etiquetas de uma conversa no ZapVoice de forma idempotente.
    Retorna uma tupla (sucesso: bool, etiquetas_finais: list)
    """
    if not zapvoice_url or not client_id or not conversation_id or not token:
        logger.warning(f"Dados insuficientes para sincronizar etiquetas ZapVoice: url={zapvoice_url}, client_id={client_id}, conv={conversation_id}")
        return False, []

    zapvoice_url = zapvoice_url.rstrip("/")
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

async def is_conversation_paused(zapvoice_url: str, client_id: str, conversation_id: int, token: str, ignore_label: str) -> bool:
    """
    Verifica se uma conversa deve ser ignorada baseada em uma etiqueta de pausa no ZapVoice.
    Retorna True se a etiqueta estiver presente, False caso contrário.
    """
    zapvoice_url = zapvoice_url.rstrip("/")
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
    zapvoice_url = zapvoice_url.rstrip("/")
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
    zapvoice_url = zapvoice_url.rstrip("/")
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

