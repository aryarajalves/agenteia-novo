import React from 'react';

const LeadHistoryModalHeader = ({
    lead,
    total,
    loading,
    onReload,
    onClose
}) => {
    return (
        <div className="modal-header-premium" style={{ padding: '1rem 2rem' }}>
            <div className="header-info" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{
                    width: '36px', height: '36px', borderRadius: '10px',
                    background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem'
                }}>📊</div>
                <div>
                    <h2 style={{ margin: 0, fontWeight: 900, color: '#f8fafc', fontSize: '1.1rem' }}>Histórico</h2>
                    <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
                        <span style={{ color: '#94a3b8' }}>{lead?.contato_nome || lead?.telefone}</span> · {total} disparos
                    </p>
                </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <button 
                    onClick={onReload} 
                    className={`modal-action-btn-reload ${loading ? 'loading-spin' : ''}`}
                    title="Atualizar Histórico"
                    disabled={loading}
                    style={{ 
                        width: '32px', height: '32px', borderRadius: '8px',
                        background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                        color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.9rem', cursor: loading ? 'not-allowed' : 'pointer', transition: 'all 0.3s ease'
                    }}
                    onMouseOver={e => {
                        if (!loading) {
                            e.currentTarget.style.background = 'rgba(99, 102, 241, 0.15)';
                            e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.3)';
                            e.currentTarget.style.color = '#818cf8';
                        }
                    }}
                    onMouseOut={e => {
                        if (!loading) {
                            e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                            e.currentTarget.style.color = '#94a3b8';
                        }
                    }}
                >🔄</button>
                <button onClick={onClose} className="modal-close-btn" style={{ width: '32px', height: '32px' }}>✕</button>
            </div>
        </div>
    );
};

export default LeadHistoryModalHeader;
