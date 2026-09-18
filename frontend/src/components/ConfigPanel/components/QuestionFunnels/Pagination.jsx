import React from 'react';

/**
 * Componente modular de Paginação estilizado para o painel de Funis.
 * Garante navegação fluida de 20 em 20 itens com resumo e controles responsivos.
 */
const Pagination = ({
    currentPage = 1,
    totalPages = 1,
    totalItems = 0,
    pageSize = 20,
    onPageChange
}) => {
    if (totalItems <= 0) return null;

    const startItem = (currentPage - 1) * pageSize + 1;
    const endItem = Math.min(currentPage * pageSize, totalItems);

    const getPageNumbers = () => {
        const pages = [];
        const maxVisible = 5;
        let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
        let end = Math.min(totalPages, start + maxVisible - 1);

        if (end - start + 1 < maxVisible) {
            start = Math.max(1, end - maxVisible + 1);
        }

        for (let i = start; i <= end; i++) {
            pages.push(i);
        }
        return pages;
    };

    const pages = getPageNumbers();

    return (
        <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.75rem',
            padding: '0.75rem 1rem',
            background: 'rgba(15, 23, 42, 0.6)',
            borderRadius: '10px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            marginTop: '0.75rem',
            fontSize: '0.85rem',
            color: '#94a3b8'
        }}>
            {/* Resumo de Itens */}
            <div>
                Mostrando <strong style={{ color: '#f8fafc' }}>{startItem}–{endItem}</strong> de{' '}
                <strong style={{ color: '#f8fafc' }}>{totalItems}</strong> funis{' '}
                <span style={{ color: '#64748b' }}>({pageSize} por página)</span>
            </div>

            {/* Controles de Navegação */}
            {totalPages > 1 && (
                <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                    {/* Botão Anterior */}
                    <button
                        type="button"
                        aria-label="Página Anterior"
                        disabled={currentPage <= 1}
                        onClick={() => onPageChange(currentPage - 1)}
                        style={{
                            padding: '0.4rem 0.75rem',
                            background: currentPage <= 1 ? 'rgba(30, 41, 59, 0.3)' : 'rgba(30, 41, 59, 0.8)',
                            border: '1px solid #334155',
                            borderRadius: '6px',
                            color: currentPage <= 1 ? '#64748b' : '#cbd5e1',
                            cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
                            fontWeight: 600,
                            fontSize: '0.82rem',
                            transition: 'all 0.15s ease'
                        }}
                    >
                        ◀ Anterior
                    </button>

                    {/* Botões Numéricos */}
                    {pages.map((p) => {
                        const isCurrent = p === currentPage;
                        return (
                            <button
                                key={p}
                                type="button"
                                aria-label={`Página ${p}`}
                                aria-current={isCurrent ? 'page' : undefined}
                                onClick={() => onPageChange(p)}
                                style={{
                                    minWidth: '32px',
                                    height: '32px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: '0 0.5rem',
                                    background: isCurrent ? '#2563eb' : 'rgba(30, 41, 59, 0.6)',
                                    border: isCurrent ? '1px solid #3b82f6' : '1px solid #334155',
                                    borderRadius: '6px',
                                    color: isCurrent ? '#ffffff' : '#cbd5e1',
                                    fontWeight: isCurrent ? 700 : 500,
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease'
                                }}
                            >
                                {p}
                            </button>
                        );
                    })}

                    {/* Botão Próxima */}
                    <button
                        type="button"
                        aria-label="Próxima Página"
                        disabled={currentPage >= totalPages}
                        onClick={() => onPageChange(currentPage + 1)}
                        style={{
                            padding: '0.4rem 0.75rem',
                            background: currentPage >= totalPages ? 'rgba(30, 41, 59, 0.3)' : 'rgba(30, 41, 59, 0.8)',
                            border: '1px solid #334155',
                            borderRadius: '6px',
                            color: currentPage >= totalPages ? '#64748b' : '#cbd5e1',
                            cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
                            fontWeight: 600,
                            fontSize: '0.82rem',
                            transition: 'all 0.15s ease'
                        }}
                    >
                        Próxima ▶
                    </button>
                </div>
            )}
        </div>
    );
};

export default Pagination;
