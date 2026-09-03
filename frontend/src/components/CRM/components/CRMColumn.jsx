import React, { useState } from 'react';
import CRMLeadCard from './CRMLeadCard';

const ITEMS_PER_PAGE = 20;

const CRMColumn = ({
    columnKey,
    title,
    icon,
    badgeColor,
    badgeBg,
    leads = [],
    onLeadClick,
    onLeadDrop,
    onDragStart,
    onMassDispatch
}) => {
    const [isDragOver, setIsDragOver] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);

    const totalPages = Math.ceil(leads.length / ITEMS_PER_PAGE) || 1;
    const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
    const startIndex = (safeCurrentPage - 1) * ITEMS_PER_PAGE;
    const paginatedLeads = leads.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragOver(true);
    };

    const handleDragLeave = () => {
        setIsDragOver(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragOver(false);
        const leadDataStr = e.dataTransfer.getData('application/json');
        if (leadDataStr) {
            try {
                const lead = JSON.parse(leadDataStr);
                onLeadDrop(lead, columnKey);
            } catch (err) {
                console.error('Erro no drag and drop:', err);
            }
        }
    };

    return (
        <div
            className={`crm-column ${isDragOver ? 'drag-over' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            <div className="crm-column-header">
                <div className="crm-column-title-group">
                    <span style={{ fontSize: '1.1rem' }}>{icon}</span>
                    <span className="crm-column-title">{title}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {columnKey === 'comprou' && leads.length > 0 && (
                        <button
                            type="button"
                            onClick={() => onMassDispatch && onMassDispatch(leads)}
                            title="Iniciar esteira do próximo produto / Disparo em massa de template WhatsApp"
                            style={{
                                background: 'rgba(16, 185, 129, 0.2)',
                                border: '1px solid rgba(16, 185, 129, 0.4)',
                                color: '#34d399',
                                borderRadius: '6px',
                                padding: '3px 7px',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3px',
                                transition: 'all 0.15s'
                            }}
                        >
                            <span>🚀</span>
                            <span>Disparar</span>
                        </button>
                    )}
                    <div
                        className="crm-column-badge"
                        style={{ background: badgeBg, color: badgeColor, border: `1px solid ${badgeColor}` }}
                    >
                        {leads.length}
                    </div>
                </div>
            </div>

            <div className="crm-column-body">
                {leads.length === 0 ? (
                    <div className="crm-empty-column">
                        Nenhum lead nesta etapa
                    </div>
                ) : (
                    paginatedLeads.map((lead) => (
                        <CRMLeadCard
                            key={`${lead.leads_table}_${lead.id}`}
                            lead={lead}
                            onClick={onLeadClick}
                            onDragStart={onDragStart}
                        />
                    ))
                )}
            </div>

            {/* Paginação da Coluna (máximo 20 contatos por página) */}
            {leads.length > 0 && (
                <div className="crm-column-pagination">
                    <div className="crm-pagination-info">
                        <span>{startIndex + 1}-{Math.min(startIndex + ITEMS_PER_PAGE, leads.length)} de {leads.length}</span>
                    </div>
                    {totalPages > 1 && (
                        <div className="crm-pagination-controls">
                            <button
                                type="button"
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                disabled={safeCurrentPage <= 1}
                                className="crm-page-btn"
                                title="Página Anterior"
                            >
                                ◀
                            </button>
                            <span className="crm-page-current">
                                {safeCurrentPage}/{totalPages}
                            </span>
                            <button
                                type="button"
                                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                disabled={safeCurrentPage >= totalPages}
                                className="crm-page-btn"
                                title="Próxima Página"
                            >
                                ▶
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default CRMColumn;
