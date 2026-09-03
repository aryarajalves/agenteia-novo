import React from 'react';

const CachePagination = ({ currentPage = 1, totalPages = 1, totalCount = 0, pageSize = 20, onPageChange, loading = false }) => {
    return (
        <div 
            data-testid="semantic-cache-pagination"
            style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: '16px',
                padding: '12px 18px',
                background: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '10px',
                fontSize: '0.85rem',
                color: '#94a3b8',
                flexWrap: 'wrap',
                gap: '12px'
            }}
        >
            <div>
                Mostrando até <strong style={{ color: '#38bdf8' }}>{pageSize}</strong> por página • Página <strong style={{ color: '#fff' }}>{currentPage}</strong> de <strong style={{ color: '#fff' }}>{totalPages}</strong> ({totalCount} respostas no total)
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                    type="button"
                    onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                    disabled={currentPage <= 1 || loading}
                    data-testid="semantic-cache-prev-page"
                    style={{
                        padding: '6px 14px',
                        borderRadius: '6px',
                        background: (currentPage <= 1 || loading) ? 'rgba(15, 23, 42, 0.4)' : 'rgba(99, 102, 241, 0.2)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: (currentPage <= 1 || loading) ? '#64748b' : '#fff',
                        fontSize: '0.82rem',
                        fontWeight: 600,
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
                    onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage >= totalPages || loading}
                    data-testid="semantic-cache-next-page"
                    style={{
                        padding: '6px 14px',
                        borderRadius: '6px',
                        background: (currentPage >= totalPages || loading) ? 'rgba(15, 23, 42, 0.4)' : 'rgba(99, 102, 241, 0.2)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: (currentPage >= totalPages || loading) ? '#64748b' : '#fff',
                        fontSize: '0.82rem',
                        fontWeight: 600,
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

export default CachePagination;
