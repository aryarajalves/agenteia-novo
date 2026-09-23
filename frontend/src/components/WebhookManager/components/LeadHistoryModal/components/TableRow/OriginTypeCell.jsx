import React from 'react';
import EventCostBadge from '../EventCostBadge';

const OriginTypeCell = ({ event, isAgent, isGrouped, getMessageTypeLabel }) => {
    return (
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
    );
};

export default OriginTypeCell;
