import React from 'react';
import { formatDate, getClassificationClass } from '../utils/leadScoringUtils';

const LeadScoringCardHeader = ({
    lead,
    leadUniqueId,
    isExpanded,
    isDeleting,
    onToggleExpand,
    onRequestDelete
}) => {
    const scoreClass = getClassificationClass(lead.lead_classification);
    const hasScore = lead.lead_score !== null && lead.lead_score !== undefined;

    return (
        <div className="lead-card-header" onClick={() => onToggleExpand(leadUniqueId)}>
            <div className="lead-main-info">
                <div className={`lead-score-circle score-${scoreClass}`}>
                    <span className="lead-score-value">{hasScore ? lead.lead_score : '-'}</span>
                    {hasScore && <span className="lead-score-max">/13</span>}
                </div>

                <div className="lead-meta-details">
                    <h3 className="lead-name">{lead.contato_nome}</h3>
                    <div className="lead-phone">
                        <span>📱</span> {lead.telefone || 'Sem telefone'}
                    </div>
                </div>
            </div>

            <div className="lead-meta-badges">
                <span className={`classification-badge ${scoreClass}`}>
                    {lead.lead_classification || 'Pendente ⏳'}
                </span>
                {lead.inbox_nome && (
                    <span className="inbox-badge">
                        📥 {lead.inbox_nome}
                    </span>
                )}
                {lead.agent_name && (
                    <span className="inbox-badge" style={{
                        background: 'rgba(99, 102, 241, 0.15)',
                        color: '#a5b4fc',
                        border: '1px solid rgba(99, 102, 241, 0.25)'
                    }}>
                        🤖 {lead.agent_name}
                    </span>
                )}
                <span className="date-badge">
                    {formatDate(lead.updated_at || lead.created_at)}
                </span>
            </div>

            <div className="lead-actions-summary" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button 
                    type="button"
                    className="btn-trash"
                    disabled={isDeleting}
                    onClick={(e) => {
                        e.stopPropagation();
                        onRequestDelete(lead);
                    }}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#ef4444',
                        fontSize: '1rem',
                        padding: '0.5rem',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s',
                        opacity: isDeleting ? 0.5 : 1
                    }}
                    onMouseOver={(e) => {
                        if (!isDeleting) {
                            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                        }
                    }}
                    onMouseOut={(e) => {
                        e.currentTarget.style.background = 'transparent';
                    }}
                    title="Remover qualificação do lead"
                >
                    🗑️
                </button>
                <button className={`btn-chevron ${isExpanded ? 'expanded' : ''}`}>
                    ▼
                </button>
            </div>
        </div>
    );
};

export default LeadScoringCardHeader;
