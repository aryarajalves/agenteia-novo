import React from 'react';

export const PipelineHeader = ({
    webhookInfo,
    leadInfo,
    pipelineData,
    overallStatus,
    onClose,
    onRefresh,
    loading
}) => {
    return (
        <>
            {/* Header Superior */}
            <div className="modal-header-premium" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.75rem', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                    <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(99, 102, 241, 0.15)', border: '1px solid rgba(99, 102, 241, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem' }}>
                        ⏱️
                    </div>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            <span style={{ fontWeight: 800, fontSize: '1.15rem', color: '#f8fafc' }}>
                                Pipeline de Follow-Up
                            </span>
                            <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.06)', color: '#94a3b8' }}>
                                {webhookInfo?.name || 'Webhook'}
                            </span>
                            {pipelineData?.active_funnel?.name && (
                                <span style={{
                                    fontSize: '0.75rem',
                                    padding: '0.2rem 0.6rem',
                                    borderRadius: '8px',
                                    background: 'rgba(99, 102, 241, 0.2)',
                                    color: '#a5b4fc',
                                    border: '1px solid rgba(99, 102, 241, 0.35)',
                                    fontWeight: 700
                                }}>
                                    📦 Fluxo: {pipelineData.active_funnel.name}
                                </span>
                            )}
                        </div>
                        <div style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: '0.15rem' }}>
                            Contato: <strong style={{ color: '#e2e8f0' }}>{leadInfo?.contato_nome || 'Sem Nome'}</strong> ({leadInfo?.telefone})
                        </div>
                    </div>
                </div>
                <button 
                    type="button" 
                    onClick={onClose} 
                    className="modal-close-btn-premium"
                    style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer', padding: '0.5rem' }}
                    title="Fechar"
                >
                    ✕
                </button>
            </div>

            {/* Status Bar */}
            <div style={{ padding: '0.85rem 1.75rem', background: 'rgba(255, 255, 255, 0.02)', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Status no Funil:</span>
                    <span style={{
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        padding: '0.25rem 0.7rem',
                        borderRadius: '8px',
                        background: (overallStatus === 'completed' || overallStatus === 'responded') ? 'rgba(16, 185, 129, 0.2)' : overallStatus === 'cancelled' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                        color: (overallStatus === 'completed' || overallStatus === 'responded') ? '#34d399' : overallStatus === 'cancelled' ? '#f87171' : '#60a5fa',
                        border: `1px solid ${(overallStatus === 'completed' || overallStatus === 'responded') ? '#10b981' : overallStatus === 'cancelled' ? '#ef4444' : '#3b82f6'}`
                    }}>
                        {pipelineData?.status_message || 'Carregando status...'}
                    </span>
                    {overallStatus === 'cancelled' && pipelineData?.cancellation_reason && (
                        <span style={{
                            fontSize: '0.75rem',
                            color: '#fca5a5',
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.25)',
                            padding: '0.2rem 0.6rem',
                            borderRadius: '6px'
                        }}>
                            🛑 {pipelineData.cancellation_reason}
                        </span>
                    )}
                </div>

                <button
                    type="button"
                    onClick={onRefresh}
                    disabled={loading}
                    style={{
                        background: 'rgba(255, 255, 255, 0.04)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: '#94a3b8',
                        padding: '0.35rem 0.75rem',
                        borderRadius: '8px',
                        fontSize: '0.78rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem'
                    }}
                >
                    🔄 Atualizar
                </button>
            </div>
        </>
    );
};

export default PipelineHeader;

