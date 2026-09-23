import React from 'react';

const LeadHistoryPagination = ({
    limit,
    setLimit,
    page,
    setPage,
    eventsCount,
    total
}) => {
    const totalPages = Math.max(1, Math.ceil(total / limit));

    return (
        <div style={{ padding: '1.25rem 2.5rem', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(15, 23, 42, 0.6)' }}>
            <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                Exibir: <select value={limit} onChange={e => { setLimit(Number(e.target.value)); setPage(1); }} style={{ background: '#1e293b', border: 'none', color: '#fff', padding: '4px 8px', borderRadius: '6px' }}>
                    <option value="10">10</option>
                    <option value="20">20</option>
                    <option value="50">50</option>
                </select>
                <span style={{ marginLeft: '1rem' }}>Mostrando {eventsCount} de {total} eventos</span>
            </div>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ fontSize: '0.85rem', color: '#64748b', marginRight: '0.5rem' }}>
                        Página <strong>{page}</strong> de <strong>{totalPages}</strong>
                    </div>
                    <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="btn-page" style={{ background: 'rgba(30, 41, 59, 0.5)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px', padding: '0.5rem 1rem', cursor: page <= 1 ? 'not-allowed' : 'pointer' }}>Anterior</button>
                    <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="btn-page" style={{ background: 'rgba(30, 41, 59, 0.5)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px', padding: '0.5rem 1rem', cursor: page >= totalPages ? 'not-allowed' : 'pointer' }}>Próxima</button>
                </div>
            </div>
        </div>
    );
};

export default LeadHistoryPagination;
