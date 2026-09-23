import React from 'react';

const AiStatusBadge = ({ event, isGrouped }) => {
    if (isGrouped || event.status === 'grouped') {
        return <span style={{ fontSize: '0.75rem', color: '#64748b', fontStyle: 'italic' }}>Absorvida pela próxima</span>;
    }

    let stepsText = '';
    if (event.processing_steps) {
        if (typeof event.processing_steps === 'string') {
            stepsText = event.processing_steps;
        } else if (Array.isArray(event.processing_steps)) {
            stepsText = JSON.stringify(event.processing_steps);
        }
    }

    if (event.event_type === 'memory' || event.status === 'ignored_silent' || stepsText.includes('Modo Silencioso')) {
        return (
            <span style={{ 
                fontSize: '0.68rem', fontWeight: 800, 
                background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', 
                padding: '3px 8px', borderRadius: '6px', border: '1px solid rgba(245, 158, 11, 0.3)',
                display: 'inline-flex', alignItems: 'center', gap: '4px'
            }}>
                🤐 Modo Silencioso (IA Desativada)
            </span>
        );
    }

    if (stepsText.includes('Pre-Router') || event.status === 'ignored' || stepsText.includes('handoff')) {
        return (
            <span style={{ 
                fontSize: '0.68rem', fontWeight: 800, 
                background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', 
                padding: '3px 8px', borderRadius: '6px', border: '1px solid rgba(239, 68, 68, 0.3)',
                display: 'inline-flex', alignItems: 'center', gap: '4px'
            }}>
                ⏸️ Pausado pelo Pre-Router
            </span>
        );
    }

    if (event.status === 'error') {
        return (
            <span style={{ 
                fontSize: '0.68rem', fontWeight: 800, 
                background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', 
                padding: '3px 8px', borderRadius: '6px', border: '1px solid rgba(239, 68, 68, 0.3)',
                display: 'inline-flex', alignItems: 'center', gap: '4px'
            }}>
                ⚠️ Falha na Geração
            </span>
        );
    }

    if (event.status === 'waiting' || event.status === 'processing') {
        return (
            <span style={{ 
                fontSize: '0.68rem', fontWeight: 800, 
                background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', 
                padding: '3px 8px', borderRadius: '6px', border: '1px solid rgba(59, 130, 246, 0.3)',
                display: 'inline-flex', alignItems: 'center', gap: '4px'
            }}>
                ⏳ Processando Resposta...
            </span>
        );
    }

    return (
        <span style={{ 
            fontSize: '0.68rem', fontWeight: 700, 
            background: 'rgba(245, 158, 11, 0.12)', color: '#fbbf24', 
            padding: '3px 8px', borderRadius: '6px', border: '1px dashed rgba(245, 158, 11, 0.3)',
            display: 'inline-flex', alignItems: 'center', gap: '4px'
        }}>
            ⏸️ IA Pausada (Sem Resposta)
        </span>
    );
};

export default AiStatusBadge;
