import React from 'react';

export const AgentHistoryHeader = ({
    selectedSessions,
    sortedSessions,
    handleSelectAll,
    extractBatchQuestions,
    onOpenDeleteModal
}) => {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                    type="checkbox"
                    onChange={(e) => handleSelectAll(e, sortedSessions)}
                    checked={selectedSessions.size === sortedSessions.length && sortedSessions.length > 0}
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                />
                <span className="section-label">Conversas Agrupadas por Sessão</span>
            </div>

            {selectedSessions.size > 0 && (
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                        onClick={extractBatchQuestions}
                        className="batch-extract-premium"
                    >
                        💎 Extrair Perguntas ({selectedSessions.size})
                    </button>
                    <button
                        onClick={onOpenDeleteModal}
                        className="delete-btn"
                        style={{
                            background: 'rgba(239, 68, 68, 0.1)',
                            color: '#ef4444',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            padding: '6px 12px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontWeight: '600',
                            fontSize: '0.85rem'
                        }}
                    >
                        🗑️ Deletar ({selectedSessions.size})
                    </button>
                </div>
            )}
        </div>
    );
};

export default AgentHistoryHeader;

