import React from 'react';
import LeadHistoryTableRow from './LeadHistoryTableRow';

const LeadHistoryTable = ({
    events,
    loading,
    getMessageTypeLabel,
    setMaximizedText,
    setSelectedPipelineEvent,
    handleDeleteEvent,
    handleRetryEvent,
    onSaveToCache,
    retryingEvents
}) => {
    return (
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'auto', background: 'rgba(15, 23, 42, 0.2)' }}>
            <table style={{ width: '100%', minWidth: '920px', borderCollapse: 'collapse', textAlign: 'left', tableLayout: 'fixed' }}>
                <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(15, 23, 42, 0.4)' }}>
                        <th style={{ width: '80px', padding: '1rem 0.5rem 1rem 1rem', fontSize: '0.65rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>ID INTERNO</th>
                        <th style={{ width: '26%', padding: '1rem', fontSize: '0.65rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>MENSAGEM USUÁRIO</th>
                        <th style={{ width: '125px', padding: '1rem 0.5rem', fontSize: '0.65rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', textAlign: 'center' }}>ORIGEM / TIPO</th>
                        <th style={{ width: '30%', padding: '1rem', fontSize: '0.65rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>RESPOSTA IA</th>
                        <th style={{ width: '145px', padding: '1rem 0.5rem', fontSize: '0.65rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>DATA/HORA</th>
                        <th style={{ width: '175px', padding: '1rem 1.25rem 1rem 0.5rem', fontSize: '0.65rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', textAlign: 'center' }}>AÇÕES</th>
                    </tr>
                </thead>
                <tbody>
                    {loading ? (
                        <tr>
                            <td colSpan="6" style={{ padding: '5rem', textAlign: 'center', color: '#64748b' }}>Buscando disparos...</td>
                        </tr>
                    ) : events.length === 0 ? (
                        <tr>
                            <td colSpan="6" style={{ padding: '5rem', textAlign: 'center', color: '#64748b' }}>Nenhum disparo encontrado.</td>
                        </tr>
                    ) : events.map(event => (
                        <LeadHistoryTableRow
                            key={event.id}
                            event={event}
                            getMessageTypeLabel={getMessageTypeLabel}
                            setMaximizedText={setMaximizedText}
                            setSelectedPipelineEvent={setSelectedPipelineEvent}
                            handleDeleteEvent={handleDeleteEvent}
                            handleRetryEvent={handleRetryEvent}
                            onSaveToCache={onSaveToCache}
                            isRetrying={retryingEvents.has(event.id)}
                        />
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default LeadHistoryTable;
