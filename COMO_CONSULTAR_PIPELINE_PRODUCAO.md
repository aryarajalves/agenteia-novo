# 🚀 Como Consultar o Pipeline Completo da IA em Produção

Este guia detalha como realizar requisições HTTP para inspecionar passo a passo todas as etapas de processamento, raciocínio, ferramentas acionadas e respostas geradas pelo agente de IA em ambiente de produção.

---

## 🌐 1. URLs Base

- **Produção (Túnel Cloudflare / Servidor):** `https://backendagente.aryaraj.shop`
- **Desenvolvimento Local:** `http://localhost:8002`

---

## 📍 2. Endpoints Disponíveis

### A. Consultar o Pipeline de um Evento Específico (Recomendado)
Retorna o log detalhado e cronológico de todas as etapas executadas pelo agente naquele evento específico.

- **Método:** `GET`
- **Rota:** `/webhooks/{webhook_id}/events/{event_id}` ou `/webhooks/events/{event_id}`
- **Exemplo de URL:** `https://backendagente.aryaraj.shop/webhooks/1/events/1234`

#### 📥 Exemplo de Resposta JSON:
```json
{
  "id": 1234,
  "webhook_config_id": 1,
  "status": "completed",
  "agent_response": "Sim! Aqui está o link de pagamento do Método Laser Day...",
  "processing_steps": "[{\"step\": \"📥 Webhook Recebido\", \"detail\": \"Mensagem do contato 5535984623775 agrupada\", \"timestamp\": \"2026-08-18T10:58:50-03:00\"}, {\"step\": \"🧭 Pre-Router AI\", \"detail\": \"Intenção: Dúvida sobre Pagamento\", \"timestamp\": \"2026-08-18T10:58:52-03:00\"}, {\"step\": \"🔍 Busca RAG\", \"detail\": \"1 item encontrado com relevância 0.92\", \"timestamp\": \"2026-08-18T10:58:53-03:00\"}, {\"step\": \"💬 Resposta Enviada\", \"detail\": \"Disparado via ZapVoice\", \"timestamp\": \"2026-08-18T10:59:49-03:00\"}]",
  "created_at": "2026-08-18T10:58:50Z",
  "updated_at": "2026-08-18T10:59:49Z",
  "scheduled_at": "2026-08-18T10:59:20Z",
  "server_now": "2026-08-19T14:10:00-03:00"
}
```

---

### B. Listar Eventos e Encontrar o `event_id` pelo Telefone do Cliente
Se você não souber o `event_id`, pode buscá-lo pelo número de telefone ou nome do contato.

- **Método:** `GET`
- **Rota:** `/webhooks/{webhook_id}/events`
- **Parâmetros de Consulta (Query Params):**
  - `page`: Número da página (padrão: `1`)
  - `limit`: Quantidade por página (padrão: `50`)
  - `search`: Número de telefone do cliente (ex: `5535984623775` ou `984623775`)
  - `status`: Filtro por status (`completed`, `received`, `failed`, `all`)
  - `event_type`: `message` ou `all`

- **Exemplo de URL:**
  ```text
  https://backendagente.aryaraj.shop/webhooks/1/events?search=5535984623775&limit=10
  ```

---

### C. Pipeline Completo de Follow-up de um Lead
Retorna a linha do tempo completa de todos os disparos, respostas e mensagens trocadas com um lead específico.

- **Método:** `GET`
- **Rota:** `/webhooks/{webhook_id}/leads/{lead_id}/followup-pipeline`

---

## 💻 3. Exemplos Práticos de Requisição

### Exemplo 1: cURL (Linha de Comando / Terminal)

```bash
# Consultar o pipeline do evento ID 1234 do Webhook ID 1
curl -X GET "https://backendagente.aryaraj.shop/webhooks/1/events/1234" \
     -H "Accept: application/json"
```

---

### Exemplo 2: Python (com `requests` e parse dos passos)

```python
import json
import requests

BASE_URL = "https://backendagente.aryaraj.shop"
WEBHOOK_ID = 1
EVENT_ID = 1234

url = f"{BASE_URL}/webhooks/{WEBHOOK_ID}/events/{EVENT_ID}"
response = requests.get(url)

if response.status_code == 200:
    data = response.json()
    print(f"Status do Evento: {data['status']}")
    print(f"Resposta do Agente:\n{data['agent_response']}\n")
    
    # Faz o parse da lista de passos gravados
    steps = json.loads(data.get("processing_steps") or "[]")
    print("📋 Linha do Tempo do Pipeline:")
    for idx, step in enumerate(steps, 1):
        print(f"  {idx}. [{step.get('timestamp')}] {step.get('step')}: {step.get('detail')}")
else:
    print(f"Erro {response.status_code}: {response.text}")
```

---

### Exemplo 3: JavaScript / Node.js / Fetch

```javascript
const BASE_URL = "https://backendagente.aryaraj.shop";
const webhookId = 1;
const eventId = 1234;

async function getPipeline() {
  const response = await fetch(`${BASE_URL}/webhooks/${webhookId}/events/${eventId}`);
  if (!response.ok) {
    throw new Error(`Erro: ${response.statusText}`);
  }
  
  const data = await response.json();
  const steps = JSON.parse(data.processing_steps || "[]");
  
  console.log("Status:", data.status);
  console.log("Resposta da IA:", data.agent_response);
  console.log("Etapas do Pipeline:", steps);
}

getPipeline();
```

---

## 🔍 4. O que Significa Cada Etapa no `processing_steps`

| Ícone / Nome da Etapa | Descrição |
|---|---|
| **📥 Webhook Recebido** | Recebimento do webhook do ZapVoice e agrupamento por debounce. |
| **🛡️ Bot Defense** | Verificação de proteção anti-loop e limite de mensagens. |
| **🧭 Pre-Router AI** | Triagem de intenção (saudação, anúncio, encerramento, negação de dúvidas) e enriquecimento de contexto. |
| **🔍 Busca RAG (Vetorial)** | Consulta na base de conhecimento com scores de relevância. |
| **🤖 Agente Principal (LLM)** | Processamento pelo GPT-5.2, execução de *Tool Calls* e regras de prompt. |
| **💬 Resposta Gerada** | Texto final formatado e preparado para envio. |
| **📤 Disparo ZapVoice** | Envio da mensagem final para o WhatsApp do cliente. |
| **🤫 Automação Silenciada** | Quando a IA encerra o atendimento para evitar envio repetitivo de mensagens. |

---

## 🖥️ 5. Visualização no Painel Web (Frontend)

Se preferir visualizar graficamente:
1. Acesse o painel do sistema (`https://backendagente.aryaraj.shop` ou `http://localhost:5300`).
2. Vá na aba **Integrações (Webhooks)**.
3. No card da integração ativa, clique no botão **Histórico de Disparos**.
4. Localize a mensagem do cliente e clique no botão **"Ver Pipeline"** (ícone de linha do tempo 🔍).
5. O modal abrirá exibindo toda a linha do tempo visual do processamento em tempo real.
