import React from 'react';
import WebhookCard from './WebhookCard';

const WebhookList = ({ 
    webhooks, 
    loading, 
    selectedWebhooks, 
    toggleSelectWebhook, 
    handleToggleActive, 
    togglingId, 
    copyToClipboard, 
    copiedToken,
    onViewErrors,
    onViewHistory,
    onViewLeads,
    onSimulateLoad,
    onEdit,
    onDelete
}) => {
    if (loading) {
        return (
            <div className="finance-loading-overlay">
                <div className="loading-spinner"></div>
                <p>Carregando integrações...</p>
            </div>
        );
    }

    if (webhooks.length === 0) {
        return (
            <div className="empty-state-card fade-in" style={{ 
                padding: '4rem 2rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center'
            }}>
                <div className="empty-icon" style={{ fontSize: '3.5rem', marginBottom: '1.5rem', opacity: 0.5 }}>🔗</div>
                <h3 style={{ margin: '0 0 0.5rem', color: '#fff' }}>Nenhuma integração encontrada</h3>
                <p style={{ color: 'var(--wh-text-secondary)', maxWidth: '400px', margin: '0' }}>
                    Conecte o Chatwoot ou WhatsApp criando seu primeiro Webhook de entrada.
                </p>
            </div>
        );
    }

    return (
        <div className="webhook-list-grid">
            {webhooks.map((wh, index) => (
                <div key={wh.id} style={{ animationDelay: `${index * 0.05}s` }} className="fade-in">
                    <WebhookCard 
                        webhook={wh}
                        selectedWebhooks={selectedWebhooks}
                        toggleSelectWebhook={toggleSelectWebhook}
                        handleToggleActive={handleToggleActive}
                        togglingId={togglingId}
                        copyToClipboard={copyToClipboard}
                        copiedToken={copiedToken}
                        onViewErrors={() => onViewErrors(wh)}
                        onViewHistory={() => onViewHistory(wh)}
                        onViewLeads={() => onViewLeads(wh)}
                        onSimulateLoad={() => onSimulateLoad && onSimulateLoad(wh)}
                        onEdit={() => onEdit(wh)}
                        onDelete={() => onDelete(wh)}
                    />
                </div>
            ))}
        </div>
    );

};

export default WebhookList;
