// leadScoringUtils.js - Funções utilitárias para o Lead Scoring

/**
 * Formata data ISO para padrão pt-BR legível
 */
export const formatDate = (isoString) => {
    if (!isoString) return '';
    const d = new Date(isoString);
    return d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

/**
 * Normaliza a classificação em uma classe semântica (quente, morno, frio, indefinida)
 */
export const getClassificationClass = (classification) => {
    if (!classification) return 'indefinida';
    const clean = classification.toLowerCase();
    if (clean.includes('quente')) return 'quente';
    if (clean.includes('morno')) return 'morno';
    if (clean.includes('frio')) return 'frio';
    return 'indefinida';
};

/**
 * Filtra e ordena a lista de leads com base na pesquisa, classificação e critério de ordenação
 */
export const filterAndSortLeads = (leads = [], searchQuery = '', filterClass = 'Todos', sortBy = 'hot') => {
    return leads
        .filter(lead => {
            const nameMatch = (lead.contato_nome || '').toLowerCase().includes(searchQuery.toLowerCase());
            const phoneMatch = (lead.telefone || '').toLowerCase().includes(searchQuery.toLowerCase());
            const queryMatch = nameMatch || phoneMatch;

            if (filterClass === 'Todos') return queryMatch;
            const itemClass = getClassificationClass(lead.lead_classification);
            const filterClassClean = getClassificationClass(filterClass);
            return queryMatch && itemClass === filterClassClean;
        })
        .sort((a, b) => {
            if (sortBy === 'hot') {
                // Pontuações mais altas primeiro
                const scoreA = a.lead_score !== null && a.lead_score !== undefined ? a.lead_score : -1;
                const scoreB = b.lead_score !== null && b.lead_score !== undefined ? b.lead_score : -1;
                if (scoreB !== scoreA) return scoreB - scoreA;
            }
            // Fallback para os mais recentes/atualizados primeiro
            const dateA = a.updated_at || a.created_at || '';
            const dateB = b.updated_at || b.created_at || '';
            return dateB.localeCompare(dateA);
        });
};
