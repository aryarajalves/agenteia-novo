/**
 * Utilitário para determinar se um evento do webhook foi respondido gratuitamente
 * (via Cache Semântico / Atalho Pre-Router / Follow-up sem custo) ou se foi pago (LLM / IA).
 */
export const getEventCostInfo = (event) => {
    if (!event) {
        return {
            isCache: false,
            isPartialCache: false,
            isShortcut: false,
            isZapVoiceImport: false,
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
    let isShortcut = false;
    let isZapVoiceImport = Boolean(event.is_zapvoice_import || event.origin === 'zapvoice_import');
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
            if (meta.is_zapvoice_import === true || meta.origin === 'zapvoice_import') {
                isZapVoiceImport = true;
            }
            if (meta.from_semantic_cache === true) {
                isCache = true;
            } else if (meta.from_semantic_cache === 'partial' || meta.from_semantic_cache === 'funnel' || meta.funnel_active) {
                isPartialCache = true;
            }
            const stepCost = meta.cost !== undefined ? meta.cost : s.cost;
            if (stepCost !== undefined && !isNaN(Number(stepCost))) {
                stepsCost += Number(stepCost);
            }

            const stepTitle = (s.step || '').toLowerCase();
            const stepDetail = (s.detail || '').toLowerCase();

            if (stepTitle.startsWith('📥 importação do zapvoice') || stepTitle.startsWith('📥 importacao do zapvoice')) {
                isZapVoiceImport = true;
            }

            // Identificar atalho programático / Pre-Router sem custo
            if (meta.model === 'shortcut-logic' || meta.is_shortcut === true) {
                isShortcut = true;
            }

            if (
                stepTitle.includes('atalho') || 
                stepTitle.includes('saudação direta') || 
                stepTitle.includes('saudacao direta') ||
                stepTitle.includes('resposta direta do pre-router') || 
                stepTitle.includes('agente principal pulado')
            ) {
                isShortcut = true;
            }
            if (
                stepDetail.includes('atalho programático') || 
                stepDetail.includes('atalho programatico') || 
                stepDetail.includes('sem custo de ia') || 
                stepDetail.includes('agente principal foi pulado')
            ) {
                isShortcut = true;
            }

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

    if (!isZapVoiceImport && event.raw_payload) {
        try {
            const rawObj = typeof event.raw_payload === 'string' ? JSON.parse(event.raw_payload) : event.raw_payload;
            if (rawObj && typeof rawObj === 'object' && (rawObj.origin === 'zapvoice_import' || rawObj.is_zapvoice_import === true)) {
                isZapVoiceImport = true;
            }
        } catch {
            // Ignora se não for JSON válido
        }
    }

    if (cost > 0) {
        isCache = false;
        isShortcut = false;
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

    if (isZapVoiceImport) {
        return {
            isCache: false,
            isPartialCache: false,
            isShortcut: false,
            isZapVoiceImport: true,
            isFree: true,
            isPaid: false,
            cost: 0,
            costFormatted: 'R$ 0,00',
            label: '📥 Importação do ZapVoice',
            shortLabel: '📥 ZapVoice',
            badgeType: 'zapvoice_import'
        };
    }

    if (isCache && cost === 0) {
        return {
            isCache: true,
            isPartialCache: false,
            isShortcut: false,
            isZapVoiceImport: false,
            isFree: true,
            isPaid: false,
            cost: 0,
            costFormatted: 'R$ 0,00',
            label: '⚡ De Graça (Cache Semântico · R$ 0,00)',
            shortLabel: '⚡ De Graça (Cache)',
            badgeType: 'cache'
        };
    }

    if (isShortcut && cost === 0) {
        return {
            isCache: false,
            isPartialCache: false,
            isShortcut: true,
            isZapVoiceImport: false,
            isFree: true,
            isPaid: false,
            cost: 0,
            costFormatted: 'R$ 0,00',
            label: '⚡ De Graça (Atalho Pre-Router · R$ 0,00)',
            shortLabel: '⚡ De Graça (Atalho)',
            badgeType: 'shortcut'
        };
    }

    if (isPartialCache) {
        return {
            isCache: false,
            isPartialCache: true,
            isShortcut: false,
            isZapVoiceImport: false,
            isFree: cost === 0,
            isPaid: cost > 0,
            cost,
            costFormatted,
            label: cost > 0 ? `⚡ Cache Parcial + IA (${costFormatted})` : '⚡ Cache Parcial + IA (R$ 0,00)',
            shortLabel: '⚡ Cache + Funil',
            badgeType: 'partial'
        };
    }

    if (isFollowUp) {
        return {
            isCache: false,
            isPartialCache: false,
            isShortcut: false,
            isZapVoiceImport: false,
            isFree: cost === 0,
            isPaid: cost > 0,
            cost,
            costFormatted,
            label: cost > 0 ? `🔄 Follow-Up (${costFormatted})` : '🔄 Follow-Up (Custo Zero)',
            shortLabel: '🔄 Follow-Up',
            badgeType: 'followup'
        };
    }

    const isTemplate = Boolean(
        event.is_template || 
        event.message_type === 'template' || 
        (typeof event.agent_response === 'string' && event.agent_response.startsWith('[Template Oficial]'))
    );

    if (isTemplate) {
        return {
            isCache: false,
            isPartialCache: false,
            isShortcut: false,
            isZapVoiceImport: false,
            isFree: cost === 0,
            isPaid: cost > 0,
            cost,
            costFormatted,
            label: cost > 0 ? `📋 Disparo de Template (${costFormatted})` : '📋 Disparo de Template (Custo Zero)',
            shortLabel: '📋 Template',
            badgeType: 'template'
        };
    }

    // Se houve resposta gerada
    const hasResponse = Boolean(event.agent_response || event.dono === 'agente');
    if (hasResponse) {
        if (cost === 0) {
            return {
                isCache: false,
                isPartialCache: false,
                isShortcut: false,
                isZapVoiceImport: false,
                isFree: true,
                isPaid: false,
                cost: 0,
                costFormatted: 'R$ 0,00',
                label: '⚡ De Graça (Custo Zero · R$ 0,00)',
                shortLabel: '⚡ De Graça',
                badgeType: 'free'
            };
        }

        return {
            isCache: false,
            isPartialCache: false,
            isShortcut: false,
            isZapVoiceImport: false,
            isFree: false,
            isPaid: true,
            cost,
            costFormatted,
            label: `💳 Paga (IA · ${costFormatted})`,
            shortLabel: '💳 Paga (IA)',
            badgeType: 'paid'
        };
    }

    return {
        isCache: false,
        isPartialCache: false,
        isShortcut: false,
        isZapVoiceImport: false,
        isFree: false,
        isPaid: false,
        cost: 0,
        costFormatted: 'R$ 0,00',
        label: '',
        shortLabel: '',
        badgeType: 'none'
    };
};
