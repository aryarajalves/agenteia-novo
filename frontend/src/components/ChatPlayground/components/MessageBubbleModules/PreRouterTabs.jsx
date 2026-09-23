import React from 'react';

const PreRouterTabs = ({ activePreRouterTab, setActivePreRouterTab }) => {
    const tabs = [
        { id: 'classifications', label: '🔍 Classificação de Intenção' },
        { id: 'questions', label: '❓ Perguntas Extraídas' },
        { id: 'memory', label: '💾 Resumo de Memória' }
    ];

    return (
        <div className="modal-tabs" style={{
            display: 'flex',
            gap: '8px',
            padding: '16px 32px',
            background: 'rgba(15, 23, 42, 0.2)',
            borderBottom: '1px solid rgba(255,255,255,0.05)',
            overflowX: 'auto',
            overflowY: 'hidden',
            flexShrink: 0,
            alignItems: 'center'
        }}>
            {tabs.map((tab) => {
                const isActive = activePreRouterTab === tab.id;
                return (
                    <button 
                        key={tab.id}
                        onClick={() => setActivePreRouterTab(tab.id)}
                        style={{
                            background: isActive ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                            border: '1px solid',
                            borderColor: isActive ? 'rgba(99, 102, 241, 0.4)' : 'rgba(255, 255, 255, 0.05)',
                            outline: 'none',
                            color: isActive ? '#818cf8' : '#94a3b8',
                            padding: '8px 16px',
                            borderRadius: '8px',
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                            fontWeight: '600',
                            transition: 'all 0.2s',
                            boxShadow: isActive ? '0 0 12px rgba(99, 102, 241, 0.2)' : 'none'
                        }}
                    >
                        {tab.label}
                    </button>
                );
            })}
        </div>
    );
};

export default PreRouterTabs;
