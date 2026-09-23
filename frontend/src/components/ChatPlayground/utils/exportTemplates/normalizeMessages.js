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

