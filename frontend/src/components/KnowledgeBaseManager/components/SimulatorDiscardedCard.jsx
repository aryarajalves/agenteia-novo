import React from 'react';
import ItemVariationQuickAdd from './ItemVariationQuickAdd';

export const getDiscardFilterStyle = (item) => {
    const rawFilter = (item?.discard_filter || '').toUpperCase();
    const reason = (item?.discard_reason || '').toLowerCase();

    if (rawFilter.includes('AGENTIC') || reason.includes('não é relevante') || reason.includes('relevância negativa') || reason.includes('sem relação') || reason.includes('outro assunto')) {
        return {
            label: '🤖 AGENTIC EVAL (Avaliação de IA)',
            bg: 'rgba(99, 102, 241, 0.18)',
            color: '#a5b4fc',
            border: '1px solid rgba(99, 102, 241, 0.4)'
        };
    }

    if (rawFilter.includes('RELEVÂNCIA') || rawFilter.includes('THRESHOLD') || reason.includes('limiar') || reason.includes('relevância inferior')) {
        return {
            label: '🎯 RELEVÂNCIA MÍNIMA (Corte por %)',
            bg: 'rgba(245, 158, 11, 0.18)',
            color: '#fbbf24',
            border: '1px solid rgba(245, 158, 11, 0.4)'
        };
    }

    if (rawFilter.includes('RERANK') || rawFilter.includes('LIMITE') || reason.includes('fora do limite') || reason.includes('limit:')) {
        return {
            label: '⚡ RERANK / LIMITE (Fora do Top Resultados)',
            bg: 'rgba(14, 165, 233, 0.18)',
            color: '#38bdf8',
            border: '1px solid rgba(14, 165, 233, 0.4)'
        };
    }

    return {
        label: item?.discard_filter || '🤖 AGENTIC EVAL',
        bg: 'rgba(99, 102, 241, 0.18)',
        color: '#a5b4fc',
        border: '1px solid rgba(99, 102, 241, 0.4)'
    };
};

const SimulatorDiscardedCard = ({
    item,
    idx,
    queryContext,
    keyPrefix = 'disc',
    setItemToEdit,
    setIsEditOpen,
    handleOpenDelete
}) => {
    const itemKey = item.id ?? `${keyPrefix}-${idx}`;
    const filterStyle = getDiscardFilterStyle(item);

    return (
        <div key={itemKey} className="kb-result-card" data-testid={`discarded-card-${itemKey}`} style={{ opacity: 0.95, borderColor: 'rgba(245, 158, 11, 0.35)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', marginBottom: '0.4rem' }}>
                <span style={{ color: '#e2e8f0', fontWeight: 700, fontSize: '0.88rem' }}>
                    {idx + 1}. {item.question}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {typeof item.relevance_score === 'number' && (
                        <span className="kb-score-badge">
                            {Math.round(item.relevance_score * 100)}%
                        </span>
                    )}
                    <button
                        type="button"
                        onClick={() => {
                            setItemToEdit(item);
                            setIsEditOpen(true);
                        }}
                        className="kb-edit-result-btn"
                        title="Editar este item"
                        data-testid={`edit-result-btn-${itemKey}`}
                        style={{
                            background: 'rgba(99, 102, 241, 0.12)',
                            border: '1px solid rgba(99, 102, 241, 0.3)',
                            color: '#818cf8',
                            borderRadius: '6px',
                            padding: '2px 8px',
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        ✏️ Editar
                    </button>
                    <button
                        type="button"
                        onClick={() => handleOpenDelete(item)}
                        className="kb-delete-result-btn"
                        title="Excluir este item da base de conhecimento"
                        data-testid={`delete-result-btn-${itemKey}`}
                        style={{
                            background: 'rgba(239, 68, 68, 0.12)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            color: '#f87171',
                            borderRadius: '6px',
                            padding: '2px 8px',
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        🗑️ Excluir
                    </button>
                </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.45rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: 600 }}>
                    Filtro que descartou:
                </span>
                <span 
                    style={{
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        padding: '2px 8px',
                        borderRadius: '6px',
                        background: filterStyle.bg,
                        color: filterStyle.color,
                        border: filterStyle.border,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                    }}
                    data-testid={`discard-filter-badge-${itemKey}`}
                >
                    {filterStyle.label}
                </span>
            </div>

            {item.answer && (
                <div style={{ color: '#94a3b8', fontSize: '0.82rem', whiteSpace: 'pre-wrap', marginBottom: '0.4rem' }}>
                    {item.answer}
                </div>
            )}

            <div style={{ 
                color: '#cbd5e1', 
                fontSize: '0.8rem', 
                background: 'rgba(0,0,0,0.25)', 
                padding: '6px 10px', 
                borderRadius: '6px', 
                borderLeft: '3px solid #f59e0b', 
                marginBottom: '0.5rem' 
            }}>
                <strong style={{ color: '#fbbf24', fontWeight: 700 }}>Motivo do descarte: </strong>
                <span>{item.discard_reason || 'Não especificado.'}</span>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                {item.category && (
                    <span className="kb-meta-chip">{item.category}</span>
                )}
                {item.metadata_val && item.metadata_val.split('|').map((meta, mIdx) => (
                    <span key={mIdx} className="kb-meta-chip">🏷️ {meta.trim()}</span>
                ))}
            </div>
            <ItemVariationQuickAdd item={item} defaultQuery={queryContext} />
        </div>
    );
};

export default SimulatorDiscardedCard;
