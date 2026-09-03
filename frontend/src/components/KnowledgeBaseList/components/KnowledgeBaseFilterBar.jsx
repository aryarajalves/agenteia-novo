import React from 'react';

const FILTERS = [
    { id: 'all', label: 'Tudo', icon: '🌈' },
    { id: 'qa', label: 'FAQ', icon: '💬' },
    { id: 'product', label: 'Produtos', icon: '📦' }
];

export default function KnowledgeBaseFilterBar({
    activeTab,
    onTabChange,
    filterType,
    onFilterChange,
    hasBases,
    isAllSelected,
    onToggleSelectAll
}) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            {activeTab !== 'inbox' && (
                <div className="tab-control" style={{
                    display: 'flex',
                    gap: '1rem',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    paddingBottom: '0.5rem'
                }}>
                    <button
                        onClick={() => onTabChange('bases')}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: activeTab === 'bases' ? 'white' : 'var(--text-secondary)',
                            fontWeight: activeTab === 'bases' ? 800 : 500,
                            fontSize: '1rem',
                            cursor: 'pointer',
                            borderBottom: activeTab === 'bases' ? '2px solid #6366f1' : 'none',
                            paddingBottom: '0.5rem',
                            transition: 'all 0.2s'
                        }}
                    >
                        📚 Minhas Bases
                    </button>
                    <button
                        onClick={() => onTabChange('history')}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: activeTab === 'history' ? 'white' : 'var(--text-secondary)',
                            fontWeight: activeTab === 'history' ? 800 : 500,
                            fontSize: '1rem',
                            cursor: 'pointer',
                            borderBottom: activeTab === 'history' ? '2px solid #6366f1' : 'none',
                            paddingBottom: '0.5rem',
                            transition: 'all 0.2s'
                        }}
                    >
                        📜 Histórico
                    </button>
                </div>
            )}

            {activeTab === 'bases' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                    <div className="filter-controls" style={{
                        display: 'flex',
                        gap: '8px',
                        background: 'rgba(255, 255, 255, 0.02)',
                        padding: '4px',
                        borderRadius: '12px',
                        border: '1px solid rgba(255, 255, 255, 0.05)'
                    }}>
                        {FILTERS.map(f => (
                            <button
                                key={f.id}
                                onClick={() => onFilterChange(f.id)}
                                style={{
                                    padding: '6px 14px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    fontSize: '0.8rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                    background: filterType === f.id ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                                    color: filterType === f.id ? '#818cf8' : '#64748b',
                                    boxShadow: filterType === f.id ? '0 4px 12px rgba(99, 102, 241, 0.1)' : 'none'
                                }}
                            >
                                <span style={{ opacity: filterType === f.id ? 1 : 0.6 }}>{f.icon}</span>
                                {f.label}
                            </button>
                        ))}
                    </div>

                    {hasBases && (
                        <button 
                            onClick={onToggleSelectAll}
                            style={{ 
                                background: 'rgba(255, 255, 255, 0.05)', 
                                border: '1px solid rgba(255, 255, 255, 0.1)', 
                                color: '#94a3b8', 
                                padding: '8px 14px', 
                                borderRadius: '10px', 
                                fontSize: '0.8rem', 
                                fontWeight: 700, 
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                transition: 'all 0.2s'
                            }}
                            onMouseOver={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'; e.currentTarget.style.color = '#fff'; }}
                            onMouseOut={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'; e.currentTarget.style.color = '#94a3b8'; }}
                        >
                            <div style={{ 
                                width: '18px', height: '18px', borderRadius: '4px', border: '2px solid currentColor',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s',
                                background: isAllSelected ? '#6366f1' : 'transparent',
                                borderColor: isAllSelected ? '#6366f1' : 'currentColor'
                            }}>
                                {isAllSelected && (
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                                )}
                            </div>
                            Selecionar Todas
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
