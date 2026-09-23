/**
 * Agrupa os logs de histórico por Session ID e ordena as sessões
 * pela data da interação mais recente (ordem decrescente).
 */
export const groupAndSortSessions = (history = []) => {
    if (!Array.isArray(history) || history.length === 0) return [];

    const sessions = history.reduce((acc, log) => {
        const sId = log.session_id || 'sem_sessao';
        if (!acc[sId]) {
            acc[sId] = {
                id: sId,
                startTime: log.timestamp,
                totalCost: 0,
                totalTokens: 0,
                interactions: []
            };
        }
        acc[sId].interactions.push(log);
        acc[sId].totalCost += log.cost_brl || 0;
        acc[sId].totalTokens += (log.input_tokens + log.output_tokens) || 0;

        // Atualiza startTime para o mais antigo encontrado no grupo
        if (new Date(log.timestamp) < new Date(acc[sId].startTime)) {
            acc[sId].startTime = log.timestamp;
        }

        return acc;
    }, {});

    return Object.values(sessions).sort((a, b) =>
        new Date(b.interactions[0].timestamp) - new Date(a.interactions[0].timestamp)
    );
};

