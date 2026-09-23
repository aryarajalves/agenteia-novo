import { api } from '../../../api/client';
import {
    normalizeMessagesList,
    generateConversationHtml
} from './exportTemplates';

export { normalizeMessagesList, generateConversationHtml };

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

