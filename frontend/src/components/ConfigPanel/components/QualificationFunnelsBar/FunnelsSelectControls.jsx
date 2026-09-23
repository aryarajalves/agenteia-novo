import React from 'react';

export const FunnelsSelectControls = ({
    funnels = [],
    currentFunnel = {},
    activeFunnelId = '',
    onSelectFunnel,
    onOpenCreate,
    onOpenRename,
    onOpenDelete
}) => {
    return (
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: '1', minWidth: '300px' }}>
                    <div style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '10px',
                        background: 'rgba(99, 102, 241, 0.2)',
                        border: '1px solid rgba(99, 102, 241, 0.4)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.2rem',
                        flexShrink: 0
                    }}>
                        🎯
                    </div>

                    <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                Funil de Qualificação Ativo
                            </span>
                            {currentFunnel.is_default && (
                                <span style={{
                                    fontSize: '0.7rem',
                                    fontWeight: 700,
                                    padding: '2px 8px',
                                    borderRadius: '999px',
                                    background: 'rgba(245, 158, 11, 0.15)',
                                    color: '#fbbf24',
                                    border: '1px solid rgba(245, 158, 11, 0.35)'
                                }}>
                                    ⭐ Padrão
                                </span>
                            )}
                        </div>

                        {/* Dropdown de Seleção */}
                        <select
                            data-testid="funnels-select"
                            value={currentFunnel.id || activeFunnelId}
                            onChange={(e) => onSelectFunnel(e.target.value)}
                            style={{
                                width: '100%',
                                background: '#1e293b',
                                border: '1px solid rgba(99, 102, 241, 0.45)',
                                borderRadius: '8px',
                                padding: '8px 12px',
                                fontSize: '0.9rem',
                                fontWeight: 600,
                                color: '#ffffff',
                                outline: 'none',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
                            }}
                        >
                            {funnels.map(f => (
                                <option key={f.id} value={f.id}>
                                    {f.name} {f.is_default ? '(Padrão)' : `[ID: ${f.id}]`}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Botões de Ação */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                        type="button"
                        data-testid="new-funnel-btn"
                        onClick={() => onOpenCreate()}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '8px 14px',
                            borderRadius: '8px',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            color: '#e0e7ff',
                            background: 'rgba(99, 102, 241, 0.22)',
                            border: '1px solid rgba(99, 102, 241, 0.45)',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            boxShadow: '0 2px 6px rgba(99, 102, 241, 0.2)'
                        }}
                        title="Criar novo funil de perguntas"
                    >
                        <span>➕</span>
                        <span>Novo Funil</span>
                    </button>

                    <button
                        type="button"
                        data-testid="rename-funnel-btn"
                        onClick={() => onOpenRename()}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '8px 12px',
                            borderRadius: '8px',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            color: '#cbd5e1',
                            background: 'rgba(51, 65, 85, 0.4)',
                            border: '1px solid rgba(148, 163, 184, 0.3)',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                        title="Renomear funil atual"
                    >
                        <span>✏️</span>
                        <span>Renomear</span>
                    </button>

                    {!currentFunnel.is_default && (
                        <button
                            type="button"
                            data-testid="delete-funnel-btn"
                            onClick={() => onOpenDelete()}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '8px 12px',
                                borderRadius: '8px',
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                color: '#fca5a5',
                                background: 'rgba(239, 68, 68, 0.15)',
                                border: '1px solid rgba(239, 68, 68, 0.35)',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                            title="Excluir este funil"
                        >
                            <span>🗑️</span>
                            <span>Excluir</span>
                        </button>
                    )}
                </div>
            </div>

    );
};
