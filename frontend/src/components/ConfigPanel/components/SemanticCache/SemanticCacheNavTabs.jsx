import React from 'react';

const SemanticCacheNavTabs = ({
    activeSubTab,
    setActiveSubTab,
    totalCount,
    semanticCacheEnabled
}) => {
    return (
        <div style={{
            display: 'flex',
            gap: '10px',
            background: 'rgba(15, 23, 42, 0.7)',
            padding: '6px',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            marginBottom: '20px'
        }}>
            <button
                type="button"
                data-testid="subtab-cache-responses"
                onClick={() => setActiveSubTab('responses')}
                style={{
                    flex: 1,
                    padding: '10px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    background: activeSubTab === 'responses' ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                    color: activeSubTab === 'responses' ? '#34d399' : '#94a3b8',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'all 0.2s ease',
                    boxShadow: activeSubTab === 'responses' ? '0 4px 12px rgba(16, 185, 129, 0.15)' : 'none'
                }}
            >
                <span>📋 Respostas no Cache</span>
                <span style={{
                    background: activeSubTab === 'responses' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255, 255, 255, 0.08)',
                    padding: '1px 8px',
                    borderRadius: '10px',
                    fontSize: '0.78rem',
                    color: activeSubTab === 'responses' ? '#fff' : '#cbd5e1'
                }}>
                    {totalCount}
                </span>
            </button>

            <button
                type="button"
                data-testid="subtab-lead-questions"
                onClick={() => setActiveSubTab('lead_questions')}
                style={{
                    flex: 1,
                    padding: '10px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    background: activeSubTab === 'lead_questions' ? 'rgba(245, 158, 11, 0.25)' : 'transparent',
                    color: activeSubTab === 'lead_questions' ? '#fbbf24' : '#94a3b8',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'all 0.2s ease',
                    boxShadow: activeSubTab === 'lead_questions' ? '0 4px 12px rgba(245, 158, 11, 0.15)' : 'none'
                }}
            >
                <span>📥 Dúvidas dos Leads</span>
                <span style={{
                    background: activeSubTab === 'lead_questions' ? 'rgba(245, 158, 11, 0.3)' : 'rgba(255, 255, 255, 0.08)',
                    padding: '1px 8px',
                    borderRadius: '10px',
                    fontSize: '0.78rem',
                    color: activeSubTab === 'lead_questions' ? '#fff' : '#cbd5e1'
                }}>
                    Mineração
                </span>
            </button>

            <button
                type="button"
                data-testid="subtab-cache-settings"
                onClick={() => setActiveSubTab('settings')}
                style={{
                    flex: 1,
                    padding: '10px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    background: activeSubTab === 'settings' ? 'rgba(99, 102, 241, 0.25)' : 'transparent',
                    color: activeSubTab === 'settings' ? '#a5b4fc' : '#94a3b8',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'all 0.2s ease',
                    boxShadow: activeSubTab === 'settings' ? '0 4px 12px rgba(99, 102, 241, 0.15)' : 'none'
                }}
            >
                <span>⚙️ Configurações & Limiares</span>
                <span style={{
                    background: semanticCacheEnabled ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                    color: semanticCacheEnabled ? '#34d399' : '#f87171',
                    padding: '1px 8px',
                    borderRadius: '10px',
                    fontSize: '0.75rem',
                    fontWeight: 700
                }}>
                    {semanticCacheEnabled ? 'Ativo' : 'Pausado'}
                </span>
            </button>
        </div>
    );
};

export default SemanticCacheNavTabs;
