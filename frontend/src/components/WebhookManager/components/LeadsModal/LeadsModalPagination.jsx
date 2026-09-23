import React from 'react';

const LeadsModalPagination = ({
    pageSize,
    page,
    total,
    loading,
    onFilterChange,
    onPageChange
}) => {
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    return (
        <div style={{ padding: '0.75rem 1.5rem', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(15, 23, 42, 0.6)' }}>
            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                Exibir: <select
                    value={pageSize}
                    onChange={e => onFilterChange({ pageSize: Number(e.target.value) })}
                    style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '6px', padding: '2px 6px', margin: '0 8px' }}
                >
                    <option value="10">10 por vez</option>
                    <option value="20">20 por vez</option>
                    <option value="50">50 por vez</option>
                </select>
                Página <strong>{page}</strong> de <strong>{totalPages}</strong>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button
                    disabled={page <= 1 || loading}
                    onClick={() => onPageChange(page - 1)}
                    style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', color: page <= 1 ? '#475569' : '#fff', borderRadius: '8px', padding: '0.4rem 1rem', cursor: page <= 1 ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: '0.75rem' }}
                >← Anterior</button>
                <button
                    disabled={page >= totalPages || loading}
                    onClick={() => onPageChange(page + 1)}
                    style={{
                        background: page >= totalPages ? '#1e293b' : 'rgba(99, 102, 241, 0.1)',
                        border: page >= totalPages ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(99, 102, 241, 0.2)',
                        color: page >= totalPages ? '#475569' : '#fff',
                        borderRadius: '8px', padding: '0.4rem 1rem',
                        cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                        fontWeight: 700, fontSize: '0.75rem'
                    }}
                >Próxima →</button>
            </div>
        </div>
    );
};

export default LeadsModalPagination;
