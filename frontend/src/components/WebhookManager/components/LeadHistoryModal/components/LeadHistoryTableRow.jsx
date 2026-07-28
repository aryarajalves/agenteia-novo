import React from 'react';
import { formatDate } from '../../../utils/helpers';

const renderAiStatusBadge = (event, isGrouped) => {
    if (isGrouped || event.status === 'grouped') {
        return <span style={{ fontSize: '0.75rem', color: '#64748b', fontStyle: 'italic' }}>Absorvida pela próxima</span>;
    }

    let stepsText = '';
    if (event.processing_steps) {
        if (typeof event.processing_steps === 'string') {
            stepsText = event.processing_steps;
        } else if (Array.isArray(event.processing_steps)) {
            stepsText = JSON.stringify(event.processing_steps);
        }
    }

    if (event.event_type === 'memory' || event.status === 'ignored_silent' || stepsText.includes('Modo Silencioso')) {
        return (
            <span style={{ 
                fontSize: '0.68rem', fontWeight: 800, 
                background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', 
                padding: '3px 8px', borderRadius: '6px', border: '1px solid rgba(245, 158, 11, 0.3)',
                display: 'inline-flex', alignItems: 'center', gap: '4px'
            }}>
                🤐 Modo Silencioso (IA Desativada)
            </span>
        );
    }

    if (stepsText.includes('Pre-Router') || event.status === 'ignored' || stepsText.includes('handoff')) {
        return (
            <span style={{ 
                fontSize: '0.68rem', fontWeight: 800, 
                background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', 
                padding: '3px 8px', borderRadius: '6px', border: '1px solid rgba(239, 68, 68, 0.3)',
                display: 'inline-flex', alignItems: 'center', gap: '4px'
            }}>
                ⏸️ Pausado pelo Pre-Router
            </span>
        );
    }

    if (event.status === 'error') {
        return (
            <span style={{ 
                fontSize: '0.68rem', fontWeight: 800, 
                background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', 
                padding: '3px 8px', borderRadius: '6px', border: '1px solid rgba(239, 68, 68, 0.3)',
                display: 'inline-flex', alignItems: 'center', gap: '4px'
            }}>
                ⚠️ Falha na Geração
            </span>
        );
    }

    if (event.status === 'waiting' || event.status === 'processing') {
        return (
            <span style={{ 
                fontSize: '0.68rem', fontWeight: 800, 
                background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', 
                padding: '3px 8px', borderRadius: '6px', border: '1px solid rgba(59, 130, 246, 0.3)',
                display: 'inline-flex', alignItems: 'center', gap: '4px'
            }}>
                ⏳ Processando Resposta...
            </span>
        );
    }

    return (
        <span style={{ 
            fontSize: '0.68rem', fontWeight: 700, 
            background: 'rgba(245, 158, 11, 0.12)', color: '#fbbf24', 
            padding: '3px 8px', borderRadius: '6px', border: '1px dashed rgba(245, 158, 11, 0.3)',
            display: 'inline-flex', alignItems: 'center', gap: '4px'
        }}>
            ⏸️ IA Pausada (Sem Resposta)
        </span>
    );
};

const LeadHistoryTableRow = ({ 
    event, 
    getMessageTypeLabel, 
    setMaximizedText, 
    setSelectedPipelineEvent, 
    handleDeleteEvent,
    handleRetryEvent,
    isRetrying
}) => {
    const isAgent = event.dono === 'agente' || event.dono === 'bot';
    const isGrouped = event.status === 'grouped';
    const message = event.mensagem || event.conteudo || event.agent_response || '—';
    const isStuck = event.status === 'processing' && (new Date() - new Date(event.updated_at || event.created_at) > 120000);
    const isProcessingAndNotStuck = event.status === 'processing' && !isStuck;

    return (
        <tr 
            style={{ 
                borderBottom: '1px solid rgba(255,255,255,0.02)', 
                transition: 'background 0.2s',
                opacity: isGrouped ? 0.4 : 1,
                filter: isGrouped ? 'grayscale(0.5)' : 'none'
            }} 
            onMouseOver={e => !isGrouped && (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')} 
            onMouseOut={e => !isGrouped && (e.currentTarget.style.background = 'transparent')}
        >
            {/* ID Interno */}
            <td style={{ padding: '1rem', fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>{event.id}</td>
            
            {/* Mensagem do Usuário */}
            <td style={{ padding: '1rem', fontSize: '0.85rem', color: isAgent ? 'rgba(255,255,255,0.2)' : '#e2e8f0', maxWidth: '250px' }}>
                {!isAgent && (
                    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ maxHeight: '60px', overflowY: 'auto', lineHeight: '1.4', fontStyle: isGrouped ? 'italic' : 'normal', paddingRight: message.length > 50 ? '24px' : '0' }}>
                            {isGrouped && <span style={{ fontSize: '0.65rem', marginRight: '4px', opacity: 0.8 }}>📦</span>}
                            {message}
                        </div>
                        {message.length > 50 && (
                            <button
                                onClick={() => setMaximizedText(message)}
                                title="Maximizar"
                                style={{
                                    position: 'absolute',
                                    top: 0,
                                    right: 0,
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    border: 'none',
                                    color: '#6366f1',
                                    borderRadius: '4px',
                                    width: '18px',
                                    height: '18px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '0.65rem',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    zIndex: 10
                                }}
                                onMouseOver={e => e.currentTarget.style.background = 'rgba(99, 102, 241, 0.2)'}
                                onMouseOut={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
                            >⛶</button>
                        )}
                    </div>
                )}
            </td>
            
            {/* Origem e Tipo */}
            <td style={{ padding: '1rem', textAlign: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                    {event.event_type === 'memory' ? (
                        <span style={{ 
                            fontSize: '0.6rem', fontWeight: 900, 
                            background: 'rgba(245, 158, 11, 0.15)', 
                            color: '#f59e0b',
                            padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase',
                            border: '1px solid rgba(245, 158, 11, 0.2)'
                        }}>
                            🔌 OUTRA PLATAFORMA
                        </span>
                    ) : (
                        <span style={{ 
                            fontSize: '0.6rem', fontWeight: 900, 
                            background: isGrouped ? 'rgba(148, 163, 184, 0.1)' : (isAgent ? 'rgba(99, 102, 241, 0.15)' : 'rgba(16, 185, 129, 0.15)'), 
                            color: isGrouped ? '#94a3b8' : (isAgent ? '#818cf8' : '#10b981'),
                            padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase',
                            border: `1px solid ${isGrouped ? 'rgba(148, 163, 184, 0.2)' : (isAgent ? 'rgba(99, 102, 241, 0.2)' : 'rgba(16, 185, 129, 0.2)')}`
                        }}>
                            {isGrouped ? 'AGRUPADO' : (isAgent ? 'AGENTE' : 'USUÁRIO')}
                        </span>
                    )}
                    <span style={{ 
                        fontSize: '0.65rem', fontWeight: 800, background: 'rgba(255,255,255,0.05)', 
                        padding: '4px 8px', borderRadius: '6px', color: '#94a3b8' 
                    }}>
                        {getMessageTypeLabel(event.message_type)}
                    </span>
                </div>
            </td>
            
            {/* Resposta IA */}
            <td style={{ padding: '1rem', fontSize: '0.85rem', color: '#818cf8', maxWidth: '250px' }}>
                {(isAgent || event.agent_response) && !isGrouped ? (
                    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ maxHeight: '60px', overflowY: 'auto', lineHeight: '1.4', paddingRight: (isAgent ? message : event.agent_response).length > 50 ? '24px' : '0' }}>
                            {isAgent ? message : event.agent_response}
                        </div>
                        {(isAgent ? message : event.agent_response).length > 50 && (
                            <button
                                onClick={() => setMaximizedText(isAgent ? message : event.agent_response)}
                                title="Maximizar"
                                style={{
                                    position: 'absolute',
                                    top: 0,
                                    right: 0,
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    border: 'none',
                                    color: '#818cf8',
                                    borderRadius: '4px',
                                    width: '18px',
                                    height: '18px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '0.65rem',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    zIndex: 10
                                }}
                                onMouseOver={e => e.currentTarget.style.background = 'rgba(129, 140, 248, 0.2)'}
                                onMouseOut={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
                            >⛶</button>
                        )}
                    </div>
                ) : (
                    renderAiStatusBadge(event, isGrouped)
                )}
            </td>
            
            {/* Data/Hora */}
            <td style={{ padding: '1rem', fontSize: '0.8rem', color: '#64748b', whiteSpace: 'nowrap' }}>{formatDate(event.created_at)}</td>
            
            {/* Ações */}
            <td style={{ padding: '1rem', textAlign: 'center' }}>
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
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
                                    padding: '6px', 
                                    cursor: (isRetrying || isProcessingAndNotStuck) ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '0.85rem'
                                }}
                            >🔄</button>
                            <button
                                onClick={() => setSelectedPipelineEvent(event)}
                                title="Ver Pipeline"
                                style={{ background: 'rgba(99, 102, 241, 0.1)', border: 'none', color: '#818cf8', borderRadius: '6px', padding: '6px', cursor: 'pointer' }}
                            >⚡</button>
                        </>
                    )}
                    <button
                        onClick={() => handleDeleteEvent(event.id)}
                        title="Excluir"
                        style={{ background: 'rgba(239, 68, 68, 0.1)', border: 'none', color: '#ef4444', borderRadius: '6px', padding: '6px', cursor: 'pointer' }}
                    >🗑️</button>
                </div>
            </td>
        </tr>
    );
};

export default LeadHistoryTableRow;
