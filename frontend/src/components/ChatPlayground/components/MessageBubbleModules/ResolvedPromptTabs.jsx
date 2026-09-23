import React from 'react';
import { formatTokenCount } from '../../utils/tokenUtils';

const ResolvedPromptTabs = ({
    activeResolvedPromptTab,
    setActiveResolvedPromptTab,
    staticTokens,
    dynamicTokens,
    injectedTokens,
    totalTokens
}) => {
    const tabs = [
        { id: 'static', label: `📄 Prompt Estático (~${formatTokenCount(staticTokens)}t)` },
        { id: 'dynamic', label: `⚡ Blocos Dinâmicos (~${formatTokenCount(dynamicTokens)}t)` },
        { id: 'injected', label: `🔌 Injetado pelo Código (~${formatTokenCount(injectedTokens)}t)` },
        { id: 'variables', label: '📊 Variáveis Injetadas' },
        { id: 'full', label: `📄 Prompt Completo (~${formatTokenCount(totalTokens)}t)` }
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
                const isActive = activeResolvedPromptTab === tab.id;
                return (
                    <button 
                        key={tab.id}
                        onClick={() => setActiveResolvedPromptTab(tab.id)}
                        style={{
                            background: isActive ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                            border: '1px solid',
                            borderColor: isActive ? 'rgba(16, 185, 129, 0.4)' : 'rgba(255, 255, 255, 0.05)',
                            outline: 'none',
                            color: isActive ? '#34d399' : '#94a3b8',
                            padding: '8px 16px',
                            borderRadius: '8px',
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                            fontWeight: '600',
                            transition: 'all 0.2s',
                            boxShadow: isActive ? '0 0 12px rgba(16, 185, 129, 0.2)' : 'none'
                        }}
                    >
                        {tab.label}
                    </button>
                );
            })}
        </div>
    );
};

export default ResolvedPromptTabs;
