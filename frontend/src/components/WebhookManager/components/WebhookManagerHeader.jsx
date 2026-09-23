import React from 'react';

const WebhookManagerHeader = ({
    searchQuery,
    setSearchQuery,
    onOpenCreate
}) => {
    return (
        <header className="webhook-manager-header">
            <div className="header-title-group">
                <h1 id="page-title">Integrações Webhook</h1>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <div style={{ position: 'relative' }}>
                    <input
                        type="text"
                        placeholder="Buscar integração..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        style={{
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid var(--wh-border)',
                            borderRadius: '12px',
                            padding: '0.6rem 1rem 0.6rem 2.5rem',
                            color: '#fff',
                            fontSize: '0.85rem',
                            width: '200px',
                            outline: 'none'
                        }}
                    />
                    <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>🔍</span>
                </div>
                <button
                    id="btn-new-webhook"
                    className="btn-new-webhook"
                    onClick={onOpenCreate}
                >
                    <span>+</span> Novo Webhook
                </button>
            </div>
        </header>
    );
};

export default WebhookManagerHeader;
