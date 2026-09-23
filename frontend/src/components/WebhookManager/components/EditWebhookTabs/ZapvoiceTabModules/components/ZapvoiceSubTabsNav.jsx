import React from 'react';

const ZapvoiceSubTabsNav = ({ zapvoiceSubTab, setZapvoiceSubTab }) => {
    return (
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '0.75rem', flexWrap: 'wrap' }}>
            <button
                type="button"
                onClick={() => setZapvoiceSubTab('credenciais')}
                style={{
                    background: zapvoiceSubTab === 'credenciais' ? 'rgba(14, 165, 233, 0.25)' : 'rgba(255, 255, 255, 0.03)',
                    color: zapvoiceSubTab === 'credenciais' ? '#38bdf8' : '#94a3b8',
                    border: zapvoiceSubTab === 'credenciais' ? '1px solid #0ea5e9' : '1px solid rgba(255, 255, 255, 0.08)',
                    padding: '0.45rem 0.9rem',
                    borderRadius: '10px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem'
                }}
            >
                🔑 Credenciais & Conexão
            </button>
            <button
                type="button"
                onClick={() => setZapvoiceSubTab('etiquetas')}
                style={{
                    background: zapvoiceSubTab === 'etiquetas' ? 'rgba(52, 211, 153, 0.25)' : 'rgba(255, 255, 255, 0.03)',
                    color: zapvoiceSubTab === 'etiquetas' ? '#34d399' : '#94a3b8',
                    border: zapvoiceSubTab === 'etiquetas' ? '1px solid #34d399' : '1px solid rgba(255, 255, 255, 0.08)',
                    padding: '0.45rem 0.9rem',
                    borderRadius: '10px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem'
                }}
            >
                🏷️ Etiquetas Automáticas
            </button>
            <button
                type="button"
                onClick={() => setZapvoiceSubTab('handoff')}
                style={{
                    background: zapvoiceSubTab === 'handoff' ? 'rgba(236, 72, 153, 0.25)' : 'rgba(255, 255, 255, 0.03)',
                    color: zapvoiceSubTab === 'handoff' ? '#f472b6' : '#94a3b8',
                    border: zapvoiceSubTab === 'handoff' ? '1px solid #ec4899' : '1px solid rgba(255, 255, 255, 0.08)',
                    padding: '0.45rem 0.9rem',
                    borderRadius: '10px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem'
                }}
            >
                🆘 Suporte & Handoff
            </button>
            <button
                type="button"
                onClick={() => setZapvoiceSubTab('projeto')}
                style={{
                    background: zapvoiceSubTab === 'projeto' ? 'rgba(168, 85, 247, 0.25)' : 'rgba(255, 255, 255, 0.03)',
                    color: zapvoiceSubTab === 'projeto' ? '#c084fc' : '#94a3b8',
                    border: zapvoiceSubTab === 'projeto' ? '1px solid #a855f7' : '1px solid rgba(255, 255, 255, 0.08)',
                    padding: '0.45rem 0.9rem',
                    borderRadius: '10px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem'
                }}
            >
                📊 Assistente de Projeto
            </button>
        </div>
    );
};

export default ZapvoiceSubTabsNav;
