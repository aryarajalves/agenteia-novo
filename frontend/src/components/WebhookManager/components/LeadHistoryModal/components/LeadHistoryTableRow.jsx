import React from 'react';
import { formatDate } from '../../../utils/helpers';
import EventCostBadge from './EventCostBadge';

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
    onSaveToCache,
    isRetrying
}) => {
    const isAgent = event.dono === 'agente' || event.dono === 'bot' || event.dono === 'Agente' || event.dono === 'Agente de IA';
    const isGrouped = event.status === 'grouped';
    const message = event.mensagem || event.conteudo || event.agent_response || '—';
    const isStuck = event.status === 'processing' && (new Date() - new Date(event.updated_at || event.created_at) > 120000);
    const isProcessingAndNotStuck = event.status === 'processing' && !isStuck;
    const isFollowUp = Boolean(
        event.event_type === 'followup' || 
        event.is_followup || 
        (typeof event.mensagem === 'string' && event.mensagem.toLowerCase().includes('follow-up')) ||
        (typeof event.message_type === 'string' && event.message_type.toLowerCase() === 'followup')
    );
    const isTemplate = Boolean(
        event.message_type === 'template' || 
        event.is_template || 
        (typeof event.agent_response === 'string' && event.agent_response.startsWith('[Template Oficial]'))
    );

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
            <td style={{ padding: '1rem 0.5rem 1rem 1rem', fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>{event.id}</td>
            
            {/* Mensagem do Usuário / Trigger */}
            <td style={{ padding: '1rem', fontSize: '0.85rem', color: isAgent && event.event_type !== 'followup' && !event.is_template && event.message_type !== 'template' ? 'rgba(255,255,255,0.2)' : '#e2e8f0', maxWidth: '250px' }}>
                {event.event_type === 'followup' ? (
                    <span style={{ fontSize: '0.78rem', color: '#c084fc', fontWeight: 700 }}>
                        {event.mensagem || '🔄 Follow-Up Disparado'}
                    </span>
                ) : (event.message_type === 'template' || event.is_template) ? (
                    <span style={{ fontSize: '0.78rem', color: '#a5b4fc', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        📋 Disparo Template WhatsApp
                    </span>
                ) : !isAgent && (
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
            <td style={{ padding: '1rem 0.5rem', textAlign: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                    {event.event_type === 'followup' ? (
                        <span style={{ 
                            fontSize: '0.6rem', fontWeight: 900, 
                            background: 'rgba(168, 85, 247, 0.2)', 
                            color: '#c084fc',
                            padding: '2px 8px', borderRadius: '4px', textTransform: 'uppercase',
                            border: '1px solid rgba(168, 85, 247, 0.4)'
                        }}>
                            🔄 FOLLOW-UP
                        </span>
                    ) : (event.message_type === 'template' || event.is_template) ? (
                        <span style={{ 
                            fontSize: '0.6rem', fontWeight: 900, 
                            background: 'rgba(99, 102, 241, 0.2)', 
                            color: '#a5b4fc',
                            padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase',
                            border: '1px solid rgba(99, 102, 241, 0.4)'
                        }}>
                            📋 TEMPLATE
                        </span>
                    ) : event.event_type === 'memory' && !isAgent ? (
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
                    {isAgent && !event.agent_response && (
                        <EventCostBadge event={event} compact={true} style={{ marginTop: '2px' }} />
                    )}
                </div>
            </td>
            
            {/* Resposta IA */}
            <td style={{ padding: '1rem', fontSize: '0.85rem', color: '#818cf8', maxWidth: '250px' }}>
                {event.event_type === 'followup' ? (
                    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ marginBottom: '4px' }}>
                            <EventCostBadge event={event} />
                        </div>
                        <div style={{ maxHeight: '60px', overflowY: 'auto', lineHeight: '1.4', paddingRight: (event.agent_response || '').length > 50 ? '24px' : '0' }}>
                            {event.agent_response || '—'}
                        </div>
                        {(event.agent_response || '').length > 50 && (
                            <button
                                onClick={() => setMaximizedText(event.agent_response)}
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
                                onMouseOver={e => e.currentTarget.style.background = 'rgba(99, 102, 241, 0.2)'}
                                onMouseOut={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
                            >⛶</button>
                        )}
                    </div>
                ) : (isAgent || event.agent_response) && !isGrouped ? (
                    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ marginBottom: '4px' }}>
                            <EventCostBadge event={event} />
                        </div>
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
            <td style={{ padding: '1rem 0.5rem', fontSize: '0.8rem', color: '#64748b', whiteSpace: 'nowrap' }}>{formatDate(event.created_at)}</td>
            
            {/* Ações */}
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
        </tr>
    );
};

export default LeadHistoryTableRow;
