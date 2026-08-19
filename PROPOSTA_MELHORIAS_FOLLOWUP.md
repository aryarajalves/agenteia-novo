# 🚀 Proposta de Evolução do Sistema de Follow-Up Automático (AgentFlow)

Este documento detalha o plano de melhorias e novas funcionalidades propostas para transformar o módulo de **Follow-Up Automático** do AgentFlow em uma ferramenta de alta conversão para recuperação de vendas, suporte e engajamento no WhatsApp.

---

## 📌 Visão Geral do Cenário Atual

Atualmente, o sistema de Follow-Up do AgentFlow possui a seguinte estrutura:
- **Ativação / Desativação global via Toggle** no painel.
- **Passos com atraso fixo em horas** (ex: 24h).
- **Geração de mensagem via IA (Claude Haiku / GPT-4o-mini)** utilizando um prompt padrão fixado no backend (`tasks.py`).
- **Verificação periódica** via Celery Beat (a cada 5 minutos).
- **Filtros básicos de etiquetas de pausa** (`ignore_by_label`) e horário comercial (`followup_business_hours`).

---

## 💡 Pilares de Melhoria Propostos

### 1. ⏱️ Flexibilidade de Tempo (Minutos, Horas e Dias)
- **Problema Atual:** O atraso é configurado apenas em **horas inteiras** (ex: 24h).
- **Solução Proposta:** Permitir a escolha da unidade de tempo para cada passo: **Minutos**, **Horas** ou **Dias**.
- **Impacto no Negócio:** Essencial para estratégias de **recuperação de carrinho abandonado** ou **PIX gerado**, onde a primeira abordagem precisa ocorrer entre **15 a 30 minutos** após a interrupção da conversa.

---

### 2. 🧠 Customização de Prompt e Conteúdo por Passo
- **Problema Atual:** Todos os passos utilizam o mesmo prompt genérico no backend.
- **Solução Proposta:** Permitir configurar o comportamento de cada passo individualmente:
  1. **IA Contextual com Instrução Customizada:** Define uma diretriz específica para o prompt daquele passo.
     - *Passo 1 (30 min):* "Retome o assunto focando em tirar dúvidas sobre o checkout."
     - *Passo 2 (24h):* "Apresente os principais benefícios e suporte pós-venda para quebrar objeções de preço."
     - *Passo 3 (48h):* "Envie uma última chamada de cortesia lembrando que a vaga/oferta é por tempo limitado."
  2. **Mensagem Fixa / Template:** Texto fixo definido pelo usuário com variáveis dinâmicas (ex: `{nome}`, `{curso}`, `{link_checkout}`).

---

### 3. 🎯 Gatilhos Inteligentes e Cancelamento Automático (Smart Triggers)
- **Cancelamento Automático por Venda:** Integração direta com webhooks de venda (Hotmart/Kiwify/Eduzz). Se o pagamento for confirmado, os follow-ups agendados daquele lead são **cancelados imediatamente**.
- **Cancelamento por Resposta do Lead:** Se o cliente enviar qualquer mensagem após o agendamento, o ciclo de follow-up é interrompido.
- **Segmentação por Etiqueta / Status:** Permitir definir quais etiquetas ou status ativam o follow-up (ex: apenas leads com a tag `carrinho-abandonado` ou `duvida-comercial`).

---

### 4. 🌙 Janela de Envio e Proteção "Não Perturbe"
- **Controle de Horário de Disparo:** Garantir que o envio respeite a janela configurada (ex: 08:00 às 20:00).
- **Reagendamento Inteligente:** Se uma mensagem de 24h for programada para disparar às 03:00 da madrugada, o sistema retém o disparo e o envia no primeiro minuto da janela comercial do dia seguinte (às 08:00).
- **Benefício:** Protege a conta de WhatsApp contra denúncias por spam noturno e aumenta a taxa de resposta.

---

### 5. 🎙️ Suporte a Mídias e Áudios Humanizados
- Permitir configurar o envio de **Áudios Humanizados** (ex: ZapVoice / áudio gravado em formato PTT) ou **Imagens de Prova Social** em passos específicos.
- *Exemplo de Uso:* No Passo 2 do follow-up, o bot pode disparar um áudio gravado parecendo que a especialista da clínica/curso está entrando em contato pessoalmente.

---

### 6. 📊 Dashboard e Métricas de Recuperação (Analytics)
Adição de indicadores visuais no painel do agente:
- 📥 **Leads em Follow-Up Ativo**
- 💬 **Taxa de Resposta (%)** (porcentagem de leads que voltaram a engajar)
- 💰 **Vendas Recuperadas ($)**

---

## 🎨 Protótipo de Interface Proposta (UX)

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ 🔄 FOLLOW-UP AUTOMÁTICO                                           [ ON ]   │
│ A IA enviará mensagens automáticas baseadas no contexto e nas regras abaixo.│
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  [ Passo #1 ]                                                              │
│  Atraso: [ 30 ] [ Minutos  ▼ ]                                            │
│  Tipo:   [ IA Contextual com Instrução Customizada ▼ ]                    │
│  Prompt: "Pergunte de forma sutil se o cliente teve alguma dúvida no PIX" │
│                                                                            │
│  [ Passo #2 ]                                                              │
│  Atraso: [ 24 ] [ Horas    ▼ ]                                            │
│  Tipo:   [ Mensagem Fixa + Áudio Humanizado ▼ ]                            │
│  Texto:  "Oi {nome}, gravei esse áudio rápido para você..."                │
│  Mídia:  [ audio_depoimento.mp3 ]                                          │
│                                                                            │
│  + Adicionar Novo Passo                                                    │
│                                                                            │
│ ────────────────────────────────────────────────────────────────────────── │
│ ⚙️ Configurações Avançadas:                                                │
│ [x] Cancelar follow-up automaticamente se o lead responder                 │
│ [x] Cancelar quando houver venda confirmada no Webhook                     │
│ Horário de Envio: [ 08:00 ] até [ 20:00 ]                                  │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## 📋 Próximos Passos Sugeridos

1. **Aprovação do Escopo:** Validar quais das 6 melhorias têm prioridade para a primeira fase de implementação.
2. **Atualização de Esquema do Banco:** Criar migração SQL para novos campos em `webhook_configs` ou tabela dedicada de `followup_steps`.
3. **Refatoração da Task no Worker (`tasks.py`):** Suportar atrasos em minutos, execução de prompts customizados por passo e retenção noturna.
4. **Atualização da Interface (Frontend React):** Componente renovado de configuração de passos no AgentFlow.
