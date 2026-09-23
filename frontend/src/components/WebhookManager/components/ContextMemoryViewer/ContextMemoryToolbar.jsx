import React from 'react';

export default function ContextMemoryToolbar({
    roleFilter,
    setRoleFilter,
    messagesCount,
    userCount,
    assistantCount,
    searchTerm,
    setSearchTerm,
    copiedAll,
    onCopyAll
}) {
    return (
        <div style={{
            padding: '0.85rem 2rem',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '1rem',
            flexWrap: 'wrap',
            background: 'rgba(255, 255, 255, 0.01)'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button
                    onClick={() => setRoleFilter('all')}
                    style={{
                        padding: '5px 12px',
                        borderRadius: '8px',
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        border: roleFilter === 'all' ? '1px solid rgba(168, 85, 247, 0.4)' : '1px solid rgba(255, 255, 255, 0.06)',
                        background: roleFilter === 'all' ? 'rgba(168, 85, 247, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                        color: roleFilter === 'all' ? '#e9d5ff' : '#94a3b8'
                    }}
                >
                    Todas ({messagesCount})
                </button>
                <button
                    onClick={() => setRoleFilter('user')}
                    style={{
                        padding: '5px 12px',
                        borderRadius: '8px',
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        border: roleFilter === 'user' ? '1px solid rgba(59, 130, 246, 0.4)' : '1px solid rgba(255, 255, 255, 0.06)',
                        background: roleFilter === 'user' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                        color: roleFilter === 'user' ? '#93c5fd' : '#94a3b8'
                    }}
                >
                    👤 Lead ({userCount})
                </button>
                <button
                    onClick={() => setRoleFilter('assistant')}
                    style={{
                        padding: '5px 12px',
                        borderRadius: '8px',
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        border: roleFilter === 'assistant' ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(255, 255, 255, 0.06)',
                        background: roleFilter === 'assistant' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                        color: roleFilter === 'assistant' ? '#6ee7b7' : '#94a3b8'
                    }}
                >
                    🤖 Agente ({assistantCount})
                </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, maxWidth: '400px', justifyContent: 'flex-end' }}>
                <input
                    type="text"
                    placeholder="Buscar no histórico..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    style={{
                        background: 'rgba(15, 23, 42, 0.6)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '8px',
                        padding: '5px 10px',
                        fontSize: '0.78rem',
                        color: '#fff',
                        width: '100%',
                        maxWidth: '220px',
                        outline: 'none'
                    }}
                />
                {messagesCount > 0 && (
                    <button
                        onClick={onCopyAll}
                        style={{
                            background: copiedAll ? 'rgba(16, 185, 129, 0.2)' : 'rgba(168, 85, 247, 0.15)',
                            border: copiedAll ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(168, 85, 247, 0.3)',
                            color: copiedAll ? '#34d399' : '#c084fc',
                            padding: '5px 12px',
                            borderRadius: '8px',
                            fontSize: '0.76rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            whiteSpace: 'nowrap'
                        }}
                    >
                        <span>{copiedAll ? '✓' : '📋'}</span>
                        <span>{copiedAll ? 'Copiado!' : 'Copiar Tudo'}</span>
                    </button>
                )}
            </div>
        </div>
    );
}
