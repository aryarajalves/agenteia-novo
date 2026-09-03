/**
 * Utilitário para determinar se um evento do webhook foi respondido gratuitamente
 * (via Cache Semântico / Follow-up sem custo) ou se foi pago (LLM / IA).
 */
export const getEventCostInfo = (event) => {
    if (!event) {
        return {
            isCache: false,
            isPartialCache: false,
            isFree: false,
            isPaid: false,
            cost: 0,
            costFormatted: 'R$ 0,00',
            label: '',
            shortLabel: '',
            badgeType: 'none'
        };
    }

    let isCache = Boolean(event.from_semantic_cache);
    let isPartialCache = Boolean(event.is_partial_cache);
    let cost = Number(event.cost || 0);

    // Extração a partir de processing_steps (fallback resiliente)
    if (event.processing_steps) {
        let steps = [];
        if (typeof event.processing_steps === 'string') {
            try {
                steps = JSON.parse(event.processing_steps);
            } catch {
                steps = [];
            }
        } else if (Array.isArray(event.processing_steps)) {
            steps = event.processing_steps;
        }

        let stepsCost = 0;
        for (const s of steps) {
            const meta = s.metadata || {};
            if (meta.from_semantic_cache === true) {
                isCache = true;
            } else if (meta.from_semantic_cache === 'partial' || meta.from_semantic_cache === 'funnel' || meta.funnel_active) {
                isPartialCache = true;
            }
            if (meta.cost && !isNaN(Number(meta.cost))) {
                stepsCost += Number(meta.cost);
            }

            const stepTitle = (s.step || '').toLowerCase();
            if (stepTitle.includes('cache semântico') || stepTitle.includes('cache semantico')) {
                if (stepTitle.includes('parcial') || stepTitle.includes('funil') || stepTitle.includes('qualificação') || stepTitle.includes('qualificacao')) {
                    isPartialCache = true;
                } else if (stepTitle.includes('custo zero') || stepTitle.includes('hit') || stepTitle.includes('resposta do cache')) {
                    isCache = true;
                }
            }
        }

        if (cost === 0 && stepsCost > 0) {
            cost = stepsCost;
        }
    }

    if (cost > 0) {
        isCache = false;
        isPartialCache = true;
    }

    const isFollowUp = Boolean(
        event.event_type === 'followup' || 
        event.is_followup || 
        (typeof event.mensagem === 'string' && event.mensagem.toLowerCase().includes('follow-up')) ||
        (typeof event.message_type === 'string' && event.message_type.toLowerCase() === 'followup')
    );

    const costFormatted = cost > 0 
        ? `R$ ${cost >= 0.01 ? cost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : cost.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}`
        : 'R$ 0,00';

    if (isCache && cost === 0) {
        return {
            isCache: true,
            isPartialCache: false,
            isFree: true,
            isPaid: false,
            cost: 0,
            costFormatted: 'R$ 0,00',
            label: '⚡ De Graça (Cache Semântico · R$ 0,00)',
            shortLabel: '⚡ De Graça (Cache)',
            badgeType: 'cache'
        };
    }

    if (isPartialCache) {
        return {
            isCache: false,
            isPartialCache: true,
            isFree: false,
            isPaid: true,
            cost,
            costFormatted,
            label: cost > 0 ? `⚡ Cache + Funil IA (${costFormatted})` : '⚡ Cache + Funil IA (R$ 0,00)',
            shortLabel: '⚡ Cache + Funil',
            badgeType: 'partial'
        };
    }

    if (isFollowUp) {
        return {
            isCache: false,
            isPartialCache: false,
            isFree: cost === 0,
            isPaid: cost > 0,
            cost,
            costFormatted,
            label: cost > 0 ? `🔄 Follow-Up (${costFormatted})` : '🔄 Follow-Up (Custo Zero)',
            shortLabel: '🔄 Follow-Up',
            badgeType: 'followup'
        };
    }

    // Se houve resposta gerada e não veio do cache
    const hasResponse = Boolean(event.agent_response || event.dono === 'agente');
    if (hasResponse) {
        return {
            isCache: false,
            isPartialCache: false,
            isFree: false,
            isPaid: true,
            cost,
            costFormatted,
            label: cost > 0 ? `💳 Paga (IA · ${costFormatted})` : '💳 Paga (IA)',
            shortLabel: '💳 Paga (IA)',
            badgeType: 'paid'
        };
    }

    return {
        isCache: false,
        isPartialCache: false,
        isFree: false,
        isPaid: false,
        cost: 0,
        costFormatted: 'R$ 0,00',
        label: '',
        shortLabel: '',
        badgeType: 'none'
    };
};
