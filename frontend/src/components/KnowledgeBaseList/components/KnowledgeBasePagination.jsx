import React from 'react';

export default function KnowledgeBasePagination({
    currentPage,
    totalPages,
    onPageChange
}) {
    if (totalPages <= 1) return null;

    return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '0.5rem',
            marginTop: '2.5rem'
        }}>
            <button
                onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                style={{
                    padding: '0.6rem 1rem',
                    borderRadius: '10px',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    background: 'rgba(255, 255, 255, 0.03)',
                    color: currentPage === 1 ? '#475569' : '#e2e8f0',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s'
                }}
            >
                ← Anterior
            </button>

            <div style={{ display: 'flex', gap: '0.4rem' }}>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                        key={page}
                        onClick={() => onPageChange(page)}
                        style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '10px',
                            border: page === currentPage ? 'none' : '1px solid rgba(255, 255, 255, 0.08)',
                            background: page === currentPage
                                ? 'linear-gradient(135deg, #6366f1, #a855f7)'
                                : 'rgba(255, 255, 255, 0.03)',
                            color: page === currentPage ? '#fff' : '#94a3b8',
                            fontWeight: 800,
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                            boxShadow: page === currentPage ? '0 4px 12px rgba(99, 102, 241, 0.35)' : 'none',
                            transition: 'all 0.2s'
                        }}
                    >
                        {page}
                    </button>
                ))}
            </div>

            <button
                onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                style={{
                    padding: '0.6rem 1rem',
                    borderRadius: '10px',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    background: 'rgba(255, 255, 255, 0.03)',
                    color: currentPage === totalPages ? '#475569' : '#e2e8f0',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s'
                }}
            >
                Próxima →
            </button>
        </div>
    );
}
