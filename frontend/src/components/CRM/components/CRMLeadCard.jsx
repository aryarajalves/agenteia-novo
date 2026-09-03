import React from 'react';

const CRMLeadCard = ({ lead, onClick, onDragStart }) => {
    const isQuente = lead.lead_classification?.includes('Quente') || (lead.lead_score && lead.lead_score >= 70);
    const isMorno = lead.lead_classification?.includes('Morno') || (lead.lead_score && lead.lead_score >= 40 && lead.lead_score < 70);

    const getScoreBadge = () => {
        if (isQuente) return <span className="crm-score-pill" style={{ color: '#ef4444' }}>🔥 {lead.lead_score || 80}</span>;
        if (isMorno) return <span className="crm-score-pill" style={{ color: '#f59e0b' }}>🟡 {lead.lead_score || 50}</span>;
        return <span className="crm-score-pill" style={{ color: '#38bdf8' }}>❄️ {lead.lead_score || 20}</span>;
    };

    const formatDateShort = (dtStr) => {
        if (!dtStr) return 'Recente';
        try {
            const d = new Date(dtStr);
            return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
        } catch {
            return 'Recente';
        }
    };

    return (
        <div
            className="crm-lead-card"
            draggable
            onDragStart={(e) => onDragStart(e, lead)}
            onClick={() => onClick(lead)}
        >
            <div className="crm-card-header">
                <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div className="crm-card-name">{lead.contato_nome || 'Lead sem Nome'}</div>
                    <div className="crm-card-phone">
                        <span>📞</span>
                        <span>{lead.telefone || 'Sem telefone'}</span>
                    </div>
                </div>
                <div>
                    <span className={`crm-badge-source ${lead.source || 'template'}`}>
                        {lead.source === 'organico' ? '🌐 Direto' : '📢 Template'}
                    </span>
                </div>
            </div>

            {lead.mensagem && (
                <div className="crm-card-message">
                    "{lead.mensagem}"
                </div>
            )}

            {lead.sale_info && (
                <div style={{ fontSize: '0.7rem', color: '#34d399', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <span>💰</span>
                    <span>Venda: R$ {lead.sale_info.valor || '0,00'} ({lead.sale_info.plataforma})</span>
                </div>
            )}

            <div className="crm-card-footer">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {getScoreBadge()}
                    <span>• {formatDateShort(lead.ultima_mensagem_em || lead.created_at)}</span>
                </div>
            </div>
        </div>
    );
};

export default CRMLeadCard;
