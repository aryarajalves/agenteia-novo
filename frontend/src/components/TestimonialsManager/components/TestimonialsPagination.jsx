import React from 'react';

export default function TestimonialsPagination({
    currentPage,
    totalPages,
    onPageChange
}) {
    if (totalPages <= 1) return null;

    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px', marginTop: '2.5rem' }}>
            <button
                onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
                disabled={currentPage === 1}
                style={{
                    background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.08)',
                    padding: '8px 16px', borderRadius: '10px', cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    opacity: currentPage === 1 ? 0.4 : 1, fontWeight: 600
                }}
            >
                ‹ Anterior
            </button>
            <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }}>
                Página <strong style={{ color: '#fff' }}>{currentPage}</strong> de {totalPages}
            </span>
            <button
                onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
                disabled={currentPage === totalPages}
                style={{
                    background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.08)',
                    padding: '8px 16px', borderRadius: '10px', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                    opacity: currentPage === totalPages ? 0.4 : 1, fontWeight: 600
                }}
            >
                Próxima ›
            </button>
        </div>
    );
}
