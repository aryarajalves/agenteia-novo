import React from 'react';

export const CreateCacheModalHeader = ({
    mode,
    setMode,
    onClose,
    isSaving
}) => {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div style={{ display: 'flex', gap: '8px', background: 'rgba(15, 23, 42, 0.8)', padding: '4px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                <button
                    type="button"
                    data-testid="tab-mode-new"
                    onClick={() => setMode('new')}
                    style={{
                        padding: '6px 14px',
                        borderRadius: '7px',
                        border: 'none',
                        background: mode === 'new' ? 'rgba(16, 185, 129, 0.25)' : 'transparent',
                        color: mode === 'new' ? '#34d399' : '#94a3b8',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                    }}
                >
                    <span>✨ Cadastrar Nova Resposta no Cache</span>
                </button>

                <button
                    type="button"
                    data-testid="tab-mode-link"
                    onClick={() => setMode('link')}
                    style={{
                        padding: '6px 14px',
                        borderRadius: '7px',
                        border: 'none',
                        background: mode === 'link' ? 'rgba(56, 189, 248, 0.25)' : 'transparent',
                        color: mode === 'link' ? '#38bdf8' : '#94a3b8',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                    }}
                >
                    <span>🔗 Vincular como Variação</span>
                </button>
            </div>

            <button
                onClick={onClose}
                disabled={isSaving}
                style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#94a3b8',
                    fontSize: '1.25rem',
                    cursor: 'pointer'
                }}
            >
                ✕
            </button>
        </div>
    );
};
