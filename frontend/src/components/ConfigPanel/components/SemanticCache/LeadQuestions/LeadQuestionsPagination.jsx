import React from 'react';

const LeadQuestionsPagination = ({
    questionsCount,
    pageSize,
    currentPage,
    totalPages,
    totalCount,
    loading,
    onPageChange
}) => {
    if (!questionsCount || questionsCount === 0) return null;

    return (
        <div 
            data-testid="lead-questions-pagination"
            style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 18px',
                background: 'rgba(15, 23, 42, 0.6)',
                borderRadius: '10px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                fontSize: '0.85rem',
                color: '#94a3b8',
                flexWrap: 'wrap',
                gap: '12px',
                marginTop: '1rem'
            }}
        >
            <div>
                Mostrando até <strong style={{ color: '#38bdf8' }}>{pageSize}</strong> por página • Página <strong style={{ color: '#fff' }}>{currentPage}</strong> de <strong style={{ color: '#fff' }}>{totalPages}</strong> ({totalCount} dúvidas no total)
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                    type="button"
                    data-testid="lead-questions-prev-page"
                    disabled={currentPage <= 1 || loading}
                    onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                    style={{
                        padding: '6px 14px',
                        borderRadius: '6px',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        background: (currentPage <= 1 || loading) ? 'rgba(15, 23, 42, 0.4)' : 'rgba(99, 102, 241, 0.2)',
                        color: (currentPage <= 1 || loading) ? '#64748b' : '#fff',
                        fontWeight: 600,
                        fontSize: '0.82rem',
                        cursor: (currentPage <= 1 || loading) ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s ease',
                        opacity: (currentPage <= 1 || loading) ? 0.6 : 1
                    }}
                >
                    ◀ Anterior
                </button>
                <span style={{ fontSize: '0.8rem', color: '#cbd5e1', padding: '0 4px', fontWeight: 600 }}>
                    {currentPage} / {totalPages}
                </span>
                <button
                    type="button"
                    data-testid="lead-questions-next-page"
                    disabled={currentPage >= totalPages || loading}
                    onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                    style={{
                        padding: '6px 14px',
                        borderRadius: '6px',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        background: (currentPage >= totalPages || loading) ? 'rgba(15, 23, 42, 0.4)' : 'rgba(99, 102, 241, 0.2)',
                        color: (currentPage >= totalPages || loading) ? '#64748b' : '#fff',
                        fontWeight: 600,
                        fontSize: '0.82rem',
                        cursor: (currentPage >= totalPages || loading) ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s ease',
                        opacity: (currentPage >= totalPages || loading) ? 0.6 : 1
                    }}
                >
                    Próxima ▶
                </button>
            </div>
        </div>
    );
};

export default LeadQuestionsPagination;
