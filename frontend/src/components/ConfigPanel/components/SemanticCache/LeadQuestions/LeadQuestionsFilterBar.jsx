import React from 'react';

const LeadQuestionsFilterBar = ({
    filterStatus,
    noCacheCount,
    hasCacheCount,
    searchTerm,
    onFilterChange,
    onSearchChange,
    onClearSearch,
    onRefresh
}) => {
    return (
        <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '12px',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(30, 41, 59, 0.4)',
            padding: '16px',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.05)'
        }}>
            {/* Status Pills */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                    type="button"
                    data-testid="filter-no-cache"
                    onClick={() => onFilterChange('no_cache')}
                    style={{
                        padding: '6px 14px',
                        borderRadius: '8px',
                        border: filterStatus === 'no_cache' ? '1px solid #f59e0b' : '1px solid rgba(255, 255, 255, 0.1)',
                        background: filterStatus === 'no_cache' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(15, 23, 42, 0.6)',
                        color: filterStatus === 'no_cache' ? '#fbbf24' : '#94a3b8',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                    }}
                >
                    <span>💡 Sem Cache (Candidatas)</span>
                    <span style={{
                        background: 'rgba(245, 158, 11, 0.3)',
                        padding: '1px 6px',
                        borderRadius: '10px',
                        fontSize: '0.75rem',
                        color: '#fff'
                    }}>
                        {noCacheCount}
                    </span>
                </button>

                <button
                    type="button"
                    data-testid="filter-has-cache"
                    onClick={() => onFilterChange('has_cache')}
                    style={{
                        padding: '6px 14px',
                        borderRadius: '8px',
                        border: filterStatus === 'has_cache' ? '1px solid #10b981' : '1px solid rgba(255, 255, 255, 0.1)',
                        background: filterStatus === 'has_cache' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(15, 23, 42, 0.6)',
                        color: filterStatus === 'has_cache' ? '#34d399' : '#94a3b8',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                    }}
                >
                    <span>⚡ No Cache</span>
                    <span style={{
                        background: 'rgba(16, 185, 129, 0.3)',
                        padding: '1px 6px',
                        borderRadius: '10px',
                        fontSize: '0.75rem',
                        color: '#fff'
                    }}>
                        {hasCacheCount}
                    </span>
                </button>

                <button
                    type="button"
                    data-testid="filter-all"
                    onClick={() => onFilterChange('all')}
                    style={{
                        padding: '6px 14px',
                        borderRadius: '8px',
                        border: filterStatus === 'all' ? '1px solid #6366f1' : '1px solid rgba(255, 255, 255, 0.1)',
                        background: filterStatus === 'all' ? 'rgba(99, 102, 241, 0.2)' : 'rgba(15, 23, 42, 0.6)',
                        color: filterStatus === 'all' ? '#a5b4fc' : '#94a3b8',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                    }}
                >
                    <span>Todas as Dúvidas</span>
                    <span style={{
                        background: 'rgba(255, 255, 255, 0.1)',
                        padding: '1px 6px',
                        borderRadius: '10px',
                        fontSize: '0.75rem',
                        color: '#cbd5e1'
                    }}>
                        {noCacheCount + hasCacheCount}
                    </span>
                </button>
            </div>

            {/* Campo de Busca e Botão Atualizar */}
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flex: '1 1 300px', maxWidth: '420px' }}>
                <div style={{ position: 'relative', width: '100%' }}>
                    <input
                        type="text"
                        data-testid="search-lead-questions"
                        placeholder="Buscar dúvida, nome ou telefone..."
                        value={searchTerm}
                        onChange={onSearchChange}
                        style={{
                            width: '100%',
                            padding: '8px 32px 8px 12px',
                            borderRadius: '8px',
                            background: 'rgba(15, 23, 42, 0.8)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            color: '#f8fafc',
                            fontSize: '0.85rem'
                        }}
                    />
                    {searchTerm && (
                        <button
                            type="button"
                            onClick={onClearSearch}
                            style={{
                                position: 'absolute', right: '8px', top: '50%',
                                transform: 'translateY(-50%)', background: 'none', border: 'none',
                                color: '#94a3b8', cursor: 'pointer', fontSize: '0.85rem'
                            }}
                        >
                            ✕
                        </button>
                    )}
                </div>

                <button
                    type="button"
                    onClick={onRefresh}
                    title="Atualizar lista"
                    style={{
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        background: 'rgba(30, 41, 59, 0.8)',
                        color: '#cbd5e1',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        whiteSpace: 'nowrap'
                    }}
                >
                    🔄
                </button>
            </div>
        </div>
    );
};

export default LeadQuestionsFilterBar;
