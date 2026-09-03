import React from 'react';

const SessionItem = ({
    session,
    currentSessionId,
    isSelectionMode,
    isSelected,
    onToggleSelection,
    onLoadSession
}) => {
    return (
        <div
            className={`history-item ${session.session_id === currentSessionId ? 'active' : ''} ${isSelectionMode ? 'selection-mode' : ''}`}
            onClick={() => isSelectionMode ? onToggleSelection(session.session_id) : onLoadSession(session.session_id)}
        >
            {isSelectionMode && (
                <div className="checkbox-wrapper">
                    <input
                        type="checkbox"
                        checked={isSelected}
                        readOnly
                    />
                </div>
            )}
            <div className="history-content-wrapper">
                <div className="history-meta">
                    <span>{session.last_interaction ? new Date(session.last_interaction).toLocaleDateString() : 'Hoje'}</span>
                    <span>{session.last_interaction ? new Date(session.last_interaction).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                    {session.is_test_session && (
                        <span className="test-badge">🤖 TESTE</span>
                    )}
                </div>
                <div className="history-summary">
                    {session.summary ? (session.summary.length > 60 ? session.summary.substring(0, 60) + '...' : session.summary) : `Conversa de ${session.message_count || 0} mensagens`}
                </div>
                <div className="history-footer">
                    <span className="cost-tag">R$ {(session.total_cost ?? session.cost_brl ?? 0).toFixed(2)}</span>
                    <div style={{ display: 'flex', gap: '5px', marginLeft: 'auto' }}>
                        <span className="agent-tag">{session.agent_name || 'Agente'}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SessionItem;
