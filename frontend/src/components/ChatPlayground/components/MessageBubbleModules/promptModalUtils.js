export const extractStaticPrompt = (fullContent) => {
    if (!fullContent) return '';
    const lines = fullContent.split('\n');
    const cleanLines = [];
    for (const line of lines) {
        if (line.includes('### DIRETRIZES DE SEGURANÇA E ESTILO') || 
            line.includes('# CONTEXTO RAG:') || 
            line.includes('# RESUMO DAS MEMÓRIAS')) {
            break;
        }
        cleanLines.push(line);
    }
    return cleanLines.join('\n').trim();
};

export const extractDynamicBlocks = (fullContent) => {
    if (!fullContent) return '';
    const lines = fullContent.split('\n');
    const qualifLines = [];
    let isQualif = false;
    for (const line of lines) {
        if (line.includes('🎯 **QUALIFICAÇÃO DE LEAD')) {
            isQualif = true;
        }
        if (isQualif) {
            if (line.includes('### DIRETRIZES DE SEGURANÇA')) {
                break;
            }
            qualifLines.push(line);
        }
    }
    return qualifLines.join('\n').trim();
};

export const extractInjectedPrompt = (fullContent) => {
    if (!fullContent) return '';
    const lines = fullContent.split('\n');
    const injectedLines = [];
    let isInjected = false;
    for (const line of lines) {
        if (line.includes('### DIRETRIZES DE SEGURANÇA') || line.includes('# CONTEXTO RAG:')) {
            isInjected = true;
        }
        if (isInjected) {
            injectedLines.push(line);
        }
    }
    return injectedLines.join('\n').trim();
};

export const getTextToCopy = (activeModal, activePreRouterTab) => {
    if (!activeModal) return '';
    if (activeModal.type === 'pre_router' && activePreRouterTab !== 'raw' && activeModal.rawData) {
        if (activePreRouterTab === 'classifications') {
            return JSON.stringify(
                Object.fromEntries(
                    Object.entries(activeModal.rawData).filter(
                        ([k]) => typeof activeModal.rawData[k] === 'boolean' || k === 'id_agente_alvo'
                    )
                ),
                null,
                2
            );
        }
        if (activePreRouterTab === 'questions') {
            return activeModal.rawData.perguntas_extraidas || '';
        }
        return activeModal.rawData.resumo_memorias || '';
    }
    return activeModal.content || '';
};
