import React from 'react';

const RowActionsCell = ({
    event,
    isAgent,
    isGrouped,
    isFollowUp,
    isTemplate,
    message,
    isRetrying,
    isProcessingAndNotStuck,
    handleRetryEvent,
    setSelectedPipelineEvent,
    onSaveToCache,
    handleDeleteEvent
}) => {
    return (
        <td style={{ padding: '0.85rem 1.25rem 0.85rem 0.5rem', textAlign: 'center' }}>
            <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', alignItems: 'center', flexWrap: 'nowrap' }}>
                {!isAgent && event.event_type !== 'memory' && !isGrouped && (
                    <>
                        <button
                            onClick={() => handleRetryEvent(event.id)}
                            title={isRetrying || isProcessingAndNotStuck ? "Reprocessando..." : "Reiniciar Automação"}
                            disabled={isRetrying || isProcessingAndNotStuck}
                            className={isRetrying || isProcessingAndNotStuck ? "loading-spin" : ""}
                            style={{ 
                                background: 'rgba(129, 140, 248, 0.1)', 
                                border: 'none', 
                                color: '#a5b4fc', 
                                borderRadius: '6px', 
                                width: '28px',
                                height: '28px',
                                minWidth: '28px',
                                padding: 0, 
                                cursor: (isRetrying || isProcessingAndNotStuck) ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.85rem',
                                flexShrink: 0
                            }}
                        >🔄</button>
                        <button
                            onClick={() => setSelectedPipelineEvent(event)}
                            title="Ver Pipeline"
                            style={{ 
                                background: 'rgba(99, 102, 241, 0.1)', 
                                border: 'none', 
                                color: '#818cf8', 
                                borderRadius: '6px', 
                                width: '28px',
                                height: '28px',
                                minWidth: '28px',
                                padding: 0, 
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.85rem',
                                flexShrink: 0
                            }}
                        >⚡</button>
                        {!isFollowUp && !isTemplate && (event.agent_response || message) && (
                            <button
                                onClick={() => onSaveToCache ? onSaveToCache(event) : null}
                                data-testid={`save-cache-btn-${event.id}`}
                                title="Aprovar e Salvar no Cache Semântico (Custo Zero)"
                                style={{
                                    background: 'rgba(16, 185, 129, 0.15)',
                                    border: '1px solid rgba(16, 185, 129, 0.35)',
                                    color: '#34d399',
                                    borderRadius: '6px',
                                    width: '28px',
                                    height: '28px',
                                    minWidth: '28px',
                                    padding: 0,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '0.85rem',
                                    flexShrink: 0,
                                    transition: 'all 0.2s'
                                }}
                                onMouseOver={e => e.currentTarget.style.background = 'rgba(16, 185, 129, 0.3)'}
                                onMouseOut={e => e.currentTarget.style.background = 'rgba(16, 185, 129, 0.15)'}
                            >💾</button>
                        )}
                    </>
                )}
                {isAgent && !isGrouped && !isFollowUp && (
                    <button
                        onClick={() => onSaveToCache ? onSaveToCache(event) : null}
                        data-testid={`save-cache-btn-${event.id}`}
                        title="Aprovar e Salvar no Cache Semântico (Custo Zero)"
                        style={{
                            background: 'rgba(16, 185, 129, 0.15)',
                            border: '1px solid rgba(16, 185, 129, 0.35)',
                            color: '#34d399',
                            borderRadius: '6px',
                            width: '28px',
                            height: '28px',
                            minWidth: '28px',
                            padding: 0,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.85rem',
                            flexShrink: 0,
                            transition: 'all 0.2s'
                        }}
                        onMouseOver={e => e.currentTarget.style.background = 'rgba(16, 185, 129, 0.3)'}
                        onMouseOut={e => e.currentTarget.style.background = 'rgba(16, 185, 129, 0.15)'}
                    >💾</button>
                )}
                <button
                    onClick={() => handleDeleteEvent(event.id)}
                    title="Excluir"
                    style={{ 
                        background: 'rgba(239, 68, 68, 0.1)', 
                        border: 'none', 
                        color: '#ef4444', 
                        borderRadius: '6px', 
                        width: '28px',
                        height: '28px',
                        minWidth: '28px',
                        padding: 0, 
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.85rem',
                        flexShrink: 0
                    }}
                >🗑️</button>
            </div>
        </td>
    );
};

export default RowActionsCell;
