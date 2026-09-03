import React from 'react';

export default function PipelineFilterBar({
    selectedCategory,
    onSelectCategory,
    counts,
    searchTerm = '',
    onSearchChange,
    totalVisibleSteps = 0,
    totalSteps = 0
}) {
    const tabs = [
        { key: 'all', label: 'Todos', icon: '📋', count: counts?.all || 0 },
        ...(counts?.cache > 0 ? [{ key: 'cache', label: 'Cache Semântico', icon: '⚡', count: counts.cache, isCache: true }] : []),
        { key: 'ai', label: 'IA & Decisões', icon: '🧠', count: counts?.ai || 0 },
        { key: 'tools', label: 'Ferramentas & Mídia', icon: '🛠️', count: counts?.tools || 0 },
        { key: 'errors', label: 'Erros & Alertas', icon: '❌', count: counts?.errors || 0, isError: true }
    ];

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            marginBottom: '1.25rem',
            paddingBottom: '0.75rem',
            borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
        }}>
            {/* Linha Superior: Abas de Categoria em Linha Única */}
            <div style={{
                display: 'flex',
                gap: '6px',
                alignItems: 'center',
                flexWrap: 'nowrap',
                overflowX: 'auto'
            }} className="custom-scrollbar">
                {tabs.map((tab) => {
                    const isActive = selectedCategory === tab.key;
                    const hasErrors = tab.isError && tab.count > 0;
                    const isCache = tab.isCache;

                    let btnBg = 'rgba(255, 255, 255, 0.03)';
                    let btnBorder = 'rgba(255, 255, 255, 0.08)';
                    let btnColor = '#94a3b8';

                    if (isActive) {
                        btnBg = hasErrors ? 'rgba(239, 68, 68, 0.15)' : (isCache ? 'rgba(16, 185, 129, 0.2)' : 'rgba(99, 102, 241, 0.15)');
                        btnBorder = hasErrors ? 'rgba(239, 68, 68, 0.4)' : (isCache ? 'rgba(16, 185, 129, 0.4)' : 'rgba(99, 102, 241, 0.4)');
                        btnColor = hasErrors ? '#f87171' : (isCache ? '#34d399' : '#818cf8');
                    } else if (hasErrors) {
                        btnBg = 'rgba(239, 68, 68, 0.08)';
                        btnBorder = 'rgba(239, 68, 68, 0.2)';
                        btnColor = '#f87171';
                    } else if (isCache) {
                        btnBg = 'rgba(16, 185, 129, 0.08)';
                        btnBorder = 'rgba(16, 185, 129, 0.25)';
                        btnColor = '#34d399';
                    }

                    return (
                        <button
                            key={tab.key}
                            type="button"
                            onClick={() => onSelectCategory(tab.key)}
                            style={{
                                background: btnBg,
                                border: `1px solid ${btnBorder}`,
                                color: btnColor,
                                padding: '5px 10px',
                                borderRadius: '8px',
                                fontSize: '0.74rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px',
                                transition: 'all 0.2s ease',
                                whiteSpace: 'nowrap',
                                flexShrink: 0
                            }}
                        >
                            <span>{tab.icon}</span>
                            <span>{tab.label}</span>
                            <span style={{
                                fontSize: '0.68rem',
                                background: isActive ? (hasErrors ? 'rgba(239, 68, 68, 0.25)' : 'rgba(99, 102, 241, 0.25)') : 'rgba(255, 255, 255, 0.06)',
                                padding: '1px 6px',
                                borderRadius: '6px',
                                fontWeight: 800
                            }}>
                                {tab.count}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Linha Inferior: Barra de Busca Rápida */}
            <div style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center'
            }}>
                <span style={{
                    position: 'absolute',
                    left: '12px',
                    fontSize: '0.85rem',
                    color: '#64748b',
                    pointerEvents: 'none'
                }}>🔍</span>
                <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder="Buscar no pipeline (ex: Cache Semântico, RAG, IA, Pre-Router, ZapVoice...)"
                    style={{
                        width: '100%',
                        padding: '7px 34px 7px 34px',
                        borderRadius: '10px',
                        background: 'rgba(15, 23, 42, 0.6)',
                        border: searchTerm ? '1px solid #6366f1' : '1px solid rgba(255, 255, 255, 0.08)',
                        color: '#f8fafc',
                        fontSize: '0.8rem',
                        fontWeight: 500,
                        outline: 'none',
                        transition: 'all 0.2s ease',
                        boxShadow: searchTerm ? '0 0 10px rgba(99, 102, 241, 0.15)' : 'none'
                    }}
                />
                {searchTerm && (
                    <button
                        type="button"
                        onClick={() => onSearchChange('')}
                        style={{
                            position: 'absolute',
                            right: '10px',
                            background: 'rgba(255, 255, 255, 0.1)',
                            border: 'none',
                            borderRadius: '50%',
                            width: '18px',
                            height: '18px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.65rem',
                            color: '#94a3b8',
                            cursor: 'pointer'
                        }}
                        title="Limpar busca"
                    >
                        ✕
                    </button>
                )}
            </div>
            {searchTerm && (
                <div style={{ fontSize: '0.72rem', color: '#818cf8', fontWeight: 600, paddingLeft: '4px' }}>
                    🔍 Exibindo {totalVisibleSteps} de {totalSteps} passos encontrados
                </div>
            )}
        </div>
    );
}
