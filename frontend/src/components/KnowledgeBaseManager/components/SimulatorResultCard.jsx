import React from 'react';
import ItemVariationQuickAdd from './ItemVariationQuickAdd';

const SimulatorResultCard = ({
    item,
    idx,
    queryContext,
    keyPrefix = 'item',
    setItemToEdit,
    setIsEditOpen,
    handleOpenDelete
}) => {
    const itemKey = item.id ?? `${keyPrefix}-${idx}`;
    return (
        <div key={itemKey} className="kb-result-card" data-testid={`result-card-${itemKey}`}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', marginBottom: '0.5rem' }}>
                <span style={{ color: '#f1f5f9', fontWeight: 700, fontSize: '0.9rem' }}>
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
            <div style={{ color: '#94a3b8', fontSize: '0.85rem', whiteSpace: 'pre-wrap' }}>
                {item.answer}
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '0.75rem' }}>
                {item.category && (
                    <span className="kb-meta-chip">{item.category}</span>
                )}
                {item.search_type && (
                    <span className="kb-meta-chip">{item.search_type}</span>
                )}
                {item.metadata_val && item.metadata_val.split('|').map((meta, mIdx) => (
                    <span key={mIdx} className="kb-meta-chip">🏷️ {meta.trim()}</span>
                ))}
            </div>
            <ItemVariationQuickAdd item={item} defaultQuery={queryContext} />
        </div>
    );
};

export default SimulatorResultCard;
