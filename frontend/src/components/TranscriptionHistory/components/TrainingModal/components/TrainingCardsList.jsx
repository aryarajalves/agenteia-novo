import React from 'react';
import TrainingCardItem from './TrainingCardItem';

export default function TrainingCardsList({
    qaList,
    isQaMode,
    metaModule,
    metaChapter,
    metadataVal,
    hasDuplicates,
    onRemoveDuplicates,
    onAddManualCard,
    onFieldChange,
    onRemoveCard
}) {
    return (
        <div className="training-edit-wrapper">
            <div className="training-edit-header">
                <div>
                    <span>Total: <strong>{qaList.length}</strong> {isQaMode ? 'conhecimentos' : 'trechos'}</span>
                    {(metaModule || metaChapter) && (
                        <div className="training-edit-meta-badge">🏷️ {metadataVal}</div>
                    )}
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {hasDuplicates && (
                        <button 
                            onClick={onRemoveDuplicates} 
                            className="training-btn-remove-duplicates" 
                            id="btn-remove-duplicates" 
                            style={{
                                background: 'rgba(239, 68, 68, 0.15)',
                                color: '#f87171',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                padding: '6px 12px',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontSize: '0.85rem',
                                fontWeight: 600,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                transition: 'all 0.2s'
                            }}
                        >
                            🗑️ Remover Duplicados
                        </button>
                    )}
                    <button 
                        onClick={onAddManualCard} 
                        className="training-btn-add-manual" 
                        id="btn-add-manual-card"
                    >
                        ➕ {isQaMode ? 'Adicionar Manual' : 'Adicionar Trecho'}
                    </button>
                </div>
            </div>

            <div className="training-cards-list">
                {qaList.map((item, index) => (
                    <TrainingCardItem
                        key={item.localId}
                        item={item}
                        index={index}
                        isQaMode={isQaMode}
                        onFieldChange={onFieldChange}
                        onRemove={onRemoveCard}
                    />
                ))}
            </div>
        </div>
    );
}
