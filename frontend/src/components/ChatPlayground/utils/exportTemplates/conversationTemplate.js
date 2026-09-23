import { conversationStyles } from './conversationStyles';
import { normalizeMessagesList } from './normalizeMessages';

export const escapeHtml = (text) => {
    if (!text) return '';
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
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
${conversationStyles}
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

