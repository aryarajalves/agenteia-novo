import React from 'react';
import StatusBadge from './Common/StatusBadge';
import { formatDate, getReceiveUrl } from '../utils/helpers';
import '../styles/WebhookManager.css';

const WebhookCard = ({ 
    webhook, 
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
    const isSelected = selectedWebhooks.has(webhook.id);

    return (
        <div className={`webhook-card-modern ${isSelected ? 'selected' : ''}`}>
            {/* Linha superior: nome + badge ativo */}
            <div className="card-header">
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.25rem' }}>
                    {/* Checkbox de Seleção Moderno */}
                    <div 
                        onClick={() => toggleSelectWebhook(webhook.id)}
                        className={`selection-checkbox ${isSelected ? 'selected' : ''}`}
                    >
                        {isSelected && <span>✓</span>}
                    </div>
                    <div>
                        <div className="card-title-premium">{webhook.name}</div>
                        {webhook.description && (
                            <div className="card-subtitle-premium">{webhook.description}</div>
                        )}
                    </div>
                </div>
                <div className="status-badge-container" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {webhook.disable_ai_responses && (
                        <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', borderRadius: '6px', background: 'rgba(234, 179, 8, 0.15)', color: '#facc15', border: '1px solid rgba(234, 179, 8, 0.3)', fontWeight: 600 }}>
                            🤐 SILENCIOSO
                        </span>
                    )}
                    <span className={`status-text ${webhook.is_active ? 'active' : ''}`}>
                        {webhook.is_active ? '● LIVE' : '○ OFF'}
                    </span>
                    <button
                        onClick={() => handleToggleActive(webhook)}
                        disabled={togglingId === webhook.id}
                        className={`toggle-switch ${webhook.is_active ? 'active' : ''}`}
                    >
                        <div className="toggle-knob" />
                    </button>
                </div>
            </div>

            {/* URL e Tabela */}
            <div className="card-info-row">
                <div className="info-item">
                    <span className="info-label">Tabela de Leads</span>
                    <code className="info-value-code">{webhook.leads_table}</code>
                </div>
            </div>

            <div className="url-display-premium">
                <code className="url-text">{getReceiveUrl(webhook.token)}</code>
                <button
                    onClick={() => copyToClipboard(webhook.token, webhook.id)}
                    className={`copy-btn ${copiedToken === webhook.id ? 'success' : ''}`}
                    title="Copiar URL"
                >
                    {copiedToken === webhook.id ? '✓' : '📋'}
                </button>
            </div>

            {/* Rodapé: botões premium */}
            <div className="card-footer-modern">
                <span className="timestamp-premium">
                    Criado em {formatDate(webhook.created_at)}
                </span>
                <div className="actions-group">
                    <button onClick={() => onViewLeads && onViewLeads(webhook)} className="btn-action-leads" title="Ver Leads Capturados">
                        <span>👥</span> Contatos
                    </button>
                    <button onClick={onSimulateLoad} className="btn-action-leads" style={{ background: 'rgba(99, 102, 241, 0.15)', borderColor: 'rgba(99, 102, 241, 0.3)', color: '#a5b4fc' }} title="Simular Carga & Escala em MOCK">
                        <span>⚡</span> Simular Carga
                    </button>
                    <button onClick={onEdit} className="btn-action-edit" title="Editar Integração">
                        <span>⚙️</span> Editar
                    </button>
                    <button onClick={onDelete} className="btn-action-delete" title="Excluir">
                        <span>🗑️</span> Excluir
                    </button>
                </div>
            </div>
        </div>
    );

};

export default WebhookCard;
