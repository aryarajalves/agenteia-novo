import { api } from '../../../api/client';

/**
 * Normaliza qualquer formato de lista de mensagens (do estado do chat ou do backend)
 * para um array consistente de objetos { role: 'user' | 'assistant', content, timestamp, ... }
 */
export const normalizeMessagesList = (rawList) => {
    if (!Array.isArray(rawList)) return [];
    
    const normalized = [];
    
    rawList.forEach((item, idx) => {
        if (!item) return;

        // Formato com par de user_message e agent_response (ex: logs do backend)
        if (item.user_message || item.agent_response) {
            if (item.user_message) {
                normalized.push({
                    id: `${item.id || idx}_u`,
                    role: 'user',
                    content: item.user_message,
                    timestamp: item.timestamp || null
                });
            }
            if (item.agent_response) {
                normalized.push({
                    id: `${item.id || idx}_a`,
                    role: 'assistant',
                    content: item.agent_response,
                    timestamp: item.timestamp || null,
                    model_used: item.model_used || null,
                    metrics: (item.input_tokens || item.output_tokens || item.cost_brl) ? {
                        tokens: (item.input_tokens || 0) + (item.output_tokens || 0),
                        cost: item.cost_brl || 0
                    } : null
                });
            }
            return;
        }

        // Formato padrão { role, content } do estado do frontend
        const role = item.role || (item.isUser ? 'user' : 'assistant');
        const rawContent = item.content !== undefined ? item.content : (item.text || '');
        const content = typeof rawContent === 'string' ? rawContent : JSON.stringify(rawContent);

        normalized.push({
            id: item.id || idx + 1,
            role: role === 'user' ? 'user' : 'assistant',
            content: content,
            timestamp: item.timestamp || item.created_at || null,
            model_used: item.model_used || item.model || null,
            metrics: item.metrics || null,
            debug: item.debug || null
        });
    });

    return normalized;
};

/**
 * Gera um documento HTML autônomo focado exclusivamente na conversa
 * (Perguntas do Usuário e Respostas do Agente), ideal para leitura e estudo.
 */
export const generateConversationHtml = ({
    agentName,
    sessionId,
    messages,
    exportedAt
}) => {
    const normalizedMsgs = normalizeMessagesList(messages);
    const totalMsgs = normalizedMsgs.length;
    const formattedDate = new Date(exportedAt || Date.now()).toLocaleString('pt-BR');

    const escapeHtml = (text) => {
        if (!text) return '';
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    };

    const messagesHtml = normalizedMsgs.map((msg, index) => {
        const isUser = msg.role === 'user';
        const roleName = isUser ? 'Usuário' : (agentName || 'Agente de IA');
        const roleIcon = isUser ? '👤' : '🤖';
        const roleClass = isUser ? 'user-msg' : 'agent-msg';
        const content = msg.content || '';
        const timeStr = msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '';

        let metricsHtml = '';
        if (!isUser && (msg.metrics || msg.model_used)) {
            const tokens = msg.metrics?.tokens || (msg.metrics?.input_tokens ? msg.metrics.input_tokens + (msg.metrics.output_tokens || 0) : null);
            const cost = msg.metrics?.cost || msg.metrics?.cost_brl;
            
            metricsHtml = `
                <div class="msg-metrics">
                    ${msg.model_used ? `<span class="metric-pill model">✨ ${escapeHtml(msg.model_used)}</span>` : ''}
                    ${tokens ? `<span class="metric-pill">⚡ ${tokens} tokens</span>` : ''}
                    ${cost ? `<span class="metric-pill cost">💰 R$ ${Number(cost).toFixed(4)}</span>` : ''}
                </div>
            `;
        }

        return `
            <div class="message-card ${roleClass}">
                <div class="message-header">
                    <div class="author-info">
                        <span class="avatar-badge">${roleIcon}</span>
                        <strong class="author-name">${escapeHtml(roleName)}</strong>
                    </div>
                    <span class="message-meta-tag">#${index + 1} ${timeStr ? `• ${timeStr}` : ''}</span>
                </div>
                <div class="message-content">${escapeHtml(content).replace(/\n/g, '<br>')}</div>
                ${metricsHtml}
            </div>
        `;
    }).join('\n');

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Conversa com ${escapeHtml(agentName)} - ${escapeHtml(sessionId)}</title>
    <style>
        :root {
            --bg-color: #0b0f19;
            --card-bg: rgba(30, 41, 59, 0.7);
            --border-color: rgba(255, 255, 255, 0.1);
            --text-main: #f1f5f9;
            --text-muted: #94a3b8;
            --primary: #6366f1;
            --primary-light: #818cf8;
            --user-bg: rgba(99, 102, 241, 0.15);
            --user-border: rgba(99, 102, 241, 0.4);
            --agent-bg: rgba(15, 23, 42, 0.9);
            --agent-border: rgba(255, 255, 255, 0.1);
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background-color: var(--bg-color);
            color: var(--text-main);
            line-height: 1.6;
            padding: 32px 16px;
            display: flex;
            justify-content: center;
        }

        .container {
            width: 100%;
            max-width: 860px;
            display: flex;
            flex-direction: column;
            gap: 20px;
        }

        /* Top Header */
        .page-header {
            background: var(--card-bg);
            border: 1px solid var(--border-color);
            border-radius: 16px;
            padding: 20px 24px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            flex-wrap: wrap;
            gap: 16px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        }

        .agent-title {
            display: flex;
            align-items: center;
            gap: 14px;
        }

        .agent-avatar-big {
            font-size: 2rem;
            background: rgba(99, 102, 241, 0.2);
            border: 1px solid var(--primary);
            border-radius: 12px;
            width: 50px;
            height: 50px;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .agent-info h1 {
            font-size: 1.35rem;
            font-weight: 700;
            color: #ffffff;
        }

        .agent-info p {
            font-size: 0.85rem;
            color: var(--text-muted);
        }

        .meta-badges {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
        }

        .meta-tag {
            background: rgba(255, 255, 255, 0.06);
            border: 1px solid var(--border-color);
            border-radius: 8px;
            padding: 6px 12px;
            font-size: 0.8rem;
            color: #cbd5e1;
            font-weight: 500;
        }

        /* Conversation List */
        .chat-timeline {
            display: flex;
            flex-direction: column;
            gap: 16px;
        }

        .message-card {
            border-radius: 14px;
            padding: 16px 20px;
            display: flex;
            flex-direction: column;
            gap: 10px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            transition: transform 0.2s ease;
        }

        .message-card.user-msg {
            background: var(--user-bg);
            border: 1px solid var(--user-border);
            border-left: 4px solid var(--primary-light);
        }

        .message-card.agent-msg {
            background: var(--agent-bg);
            border: 1px solid var(--agent-border);
            border-left: 4px solid #10b981;
        }

        .message-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 0.85rem;
            padding-bottom: 6px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }

        .author-info {
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .avatar-badge {
            font-size: 1.1rem;
        }

        .author-name {
            color: #ffffff;
            font-weight: 700;
            font-size: 0.95rem;
        }

        .user-msg .author-name {
            color: #a5b4fc;
        }

        .agent-msg .author-name {
            color: #6ee7b7;
        }

        .message-meta-tag {
            font-size: 0.75rem;
            color: var(--text-muted);
        }

        .message-content {
            font-size: 0.96rem;
            color: #f8fafc;
            line-height: 1.6;
            white-space: pre-wrap;
            word-break: break-word;
        }

        .msg-metrics {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
            margin-top: 4px;
        }

        .metric-pill {
            font-size: 0.72rem;
            padding: 3px 8px;
            border-radius: 6px;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.08);
            color: var(--text-muted);
        }

        .metric-pill.cost {
            color: #fbbf24;
            background: rgba(245, 158, 11, 0.1);
            border-color: rgba(245, 158, 11, 0.2);
        }

        .metric-pill.model {
            color: #a5b4fc;
            background: rgba(99, 102, 241, 0.1);
            border-color: rgba(99, 102, 241, 0.2);
        }

        /* Footer */
        .page-footer {
            text-align: center;
            font-size: 0.8rem;
            color: var(--text-muted);
            padding: 20px;
            border-top: 1px solid var(--border-color);
            margin-top: 10px;
        }

        @media print {
            body {
                background: #ffffff;
                color: #000000;
                padding: 0;
            }
            .page-header, .message-card {
                background: #ffffff !important;
                color: #000000 !important;
                border: 1px solid #cccccc !important;
                box-shadow: none !important;
            }
            .message-content, .author-name, .agent-info h1 {
                color: #000000 !important;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Cabeçalho -->
        <header class="page-header">
            <div class="agent-title">
                <div class="agent-avatar-big">💬</div>
                <div class="agent-info">
                    <h1>Conversa com ${escapeHtml(agentName)}</h1>
                    <p>Relatório de Mensagens da Sessão</p>
                </div>
            </div>
            <div class="meta-badges">
                <span class="meta-tag">🆔 Sessão: ${escapeHtml(sessionId)}</span>
                <span class="meta-tag">💬 Mensagens: ${totalMsgs}</span>
                <span class="meta-tag">📅 Data: ${formattedDate}</span>
            </div>
        </header>

        <!-- Conversa Linha do Tempo (Perguntas e Respostas) -->
        <main class="chat-timeline">
            ${messagesHtml || '<p style="text-align:center; color:#94a3b8; padding: 40px;">Nenhuma mensagem registrada nesta conversa.</p>'}
        </main>

        <!-- Rodapé -->
        <footer class="page-footer">
            Relatório gerado em ${formattedDate} • Agent Flow
        </footer>
    </div>
</body>
</html>`;
};

/**
 * Exporta a conversa no formato HTML interativo e dispara o download.
 */
export const exportConversationForTraining = async ({
    messages,
    sessionId,
    selectedAgentId,
    agents,
    sessionStats,
    showToast
}) => {
    // 1. Obter lista inicial das mensagens do estado local
    let conversationList = Array.isArray(messages) ? messages : [];

    // Se estiver vazio no estado local, tentar buscar do histórico da sessão
    if (conversationList.length === 0 && sessionId) {
        try {
            const res = await api.get(`/sessions/${sessionId}/export-training`);
            if (res.ok) {
                const data = await res.json();
                if (data.raw_conversation && data.raw_conversation.length > 0) {
                    conversationList = data.raw_conversation;
                }
            }
        } catch (err) {
            console.warn("Não foi possível buscar mensagens do backend:", err);
        }
    }

    if (!conversationList || conversationList.length === 0) {
        showToast?.("Nenhuma mensagem na conversa atual para exportar.", "warning");
        return;
    }

    try {
        const currentAgent = agents?.find(a => a.id == selectedAgentId);
        const agentName = currentAgent?.name || 'Agente Inteligente';

        const htmlContent = generateConversationHtml({
            agentName,
            sessionId,
            messages: conversationList,
            sessionStats,
            exportedAt: new Date().toISOString()
        });

        const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const sanitizedAgentName = agentName.toLowerCase().replace(/[^a-z0-9]/gi, '_');
        a.href = url;
        a.download = `conversa_${sanitizedAgentName}_${sessionId}_${Date.now()}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showToast?.("Conversa exportada em HTML com sucesso!", "success");
    } catch (error) {
        console.error("Erro ao exportar conversa em HTML:", error);
        showToast?.("Erro ao exportar conversa.", "error");
    }
};
