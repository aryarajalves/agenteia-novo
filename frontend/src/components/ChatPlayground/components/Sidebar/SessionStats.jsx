import React from 'react';

const SessionStats = ({
    sessionId,
    sessionStats,
    showToast
}) => {
    return (
        <div className="stats-container-premium">
            <div className="session-id-row" onClick={() => {
                navigator.clipboard.writeText(sessionId);
                showToast('Session ID copiado! 📋', 'success');
            }} title="Clique para copiar o Session ID">
                <span className="session-id-label">ID DA SESSÃO 📋</span>
                <code className="session-id-value">{sessionId}</code>
            </div>

            <div className="stats-grid-modern">
                <div className="modern-stat-card">
                    <div className="stat-icon-mini">💬</div>
                    <div className="stat-info">
                        <span className="modern-label">Mensagens</span>
                        <strong className="modern-value">{sessionStats.responseCount}</strong>
                    </div>
                </div>

                <div className="modern-stat-card">
                    <div className="stat-icon-mini" style={{ color: '#818cf8' }}>⚡</div>
                    <div className="stat-info">
                        <span className="modern-label">Tokens</span>
                        <strong className="modern-value highlight-tokens">{(sessionStats?.totalTokens || 0).toLocaleString()}</strong>
                    </div>
                </div>

                <div className="modern-stat-card total-cost-card">
                    <div className="stat-icon-mini" style={{ color: '#10b981' }}>💰</div>
                    <div className="stat-info">
                        <span className="modern-label">Investimento</span>
                        <strong className="modern-value highlight-cost">R$ {(sessionStats?.totalCost || 0).toFixed(2)}</strong>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SessionStats;
