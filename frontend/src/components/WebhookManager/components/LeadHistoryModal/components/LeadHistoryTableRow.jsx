import React from 'react';
import { formatDate } from '../../../utils/helpers';
import OriginTypeCell from './TableRow/OriginTypeCell';
import ResponseAiCell from './TableRow/ResponseAiCell';
import RowActionsCell from './TableRow/RowActionsCell';

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
            <td style={{ padding: '1rem 0.5rem 1rem 1rem', fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>
                {event.id}
            </td>
            
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
            <OriginTypeCell
                event={event}
                isAgent={isAgent}
                isGrouped={isGrouped}
                getMessageTypeLabel={getMessageTypeLabel}
            />
            
            {/* Resposta IA */}
            <ResponseAiCell
                event={event}
                isAgent={isAgent}
                isGrouped={isGrouped}
                message={message}
                setMaximizedText={setMaximizedText}
            />
            
            {/* Data/Hora */}
            <td style={{ padding: '1rem 0.5rem', fontSize: '0.8rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                {formatDate(event.created_at)}
            </td>
            
            {/* Ações */}
            <RowActionsCell
                event={event}
                isAgent={isAgent}
                isGrouped={isGrouped}
                isFollowUp={isFollowUp}
                isTemplate={isTemplate}
                message={message}
                isRetrying={isRetrying}
                isProcessingAndNotStuck={isProcessingAndNotStuck}
                handleRetryEvent={handleRetryEvent}
                setSelectedPipelineEvent={setSelectedPipelineEvent}
                onSaveToCache={onSaveToCache}
                handleDeleteEvent={handleDeleteEvent}
            />
        </tr>
    );
};

export default LeadHistoryTableRow;
