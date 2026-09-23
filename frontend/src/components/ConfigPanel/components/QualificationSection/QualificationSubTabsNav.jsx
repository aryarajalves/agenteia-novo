import React from 'react';

export const QualificationSubTabsNav = ({
    activeSubTab,
    setActiveSubTab,
    stagesCount = 0,
    labelsCount = 0,
    hasFinalAction = false,
    hasCriteria = false
}) => {
    return (
        <div style={{
            display: 'flex',
            gap: '8px',
            background: 'rgba(15, 23, 42, 0.6)',
            padding: '6px',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            marginBottom: '1.25rem',
            marginTop: '1.25rem',
            flexWrap: 'wrap'
        }}>
            <button
                type="button"
                data-testid="subtab-funnel-stages"
                onClick={() => setActiveSubTab('stages')}
                style={{
                    flex: 1,
                    minWidth: '160px',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: 'none',
                    background: activeSubTab === 'stages' ? 'rgba(99, 102, 241, 0.25)' : 'transparent',
                    color: activeSubTab === 'stages' ? '#a5b4fc' : '#94a3b8',
                    fontWeight: 700,
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'all 0.2s ease',
                    boxShadow: activeSubTab === 'stages' ? '0 4px 12px rgba(99, 102, 241, 0.2)' : 'none'
                }}
            >
                <span>🎯 Etapas de Sondagem</span>
                <span style={{
                    background: activeSubTab === 'stages' ? 'rgba(99, 102, 241, 0.4)' : 'rgba(255, 255, 255, 0.08)',
                    padding: '2px 8px',
                    borderRadius: '10px',
                    fontSize: '0.75rem',
                    color: activeSubTab === 'stages' ? '#fff' : '#cbd5e1'
                }}>
                    {stagesCount}
                </span>
            </button>

            <button
                type="button"
                data-testid="subtab-funnel-labels"
                onClick={() => setActiveSubTab('labels')}
                style={{
                    flex: 1,
                    minWidth: '160px',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: 'none',
                    background: activeSubTab === 'labels' ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                    color: activeSubTab === 'labels' ? '#34d399' : '#94a3b8',
                    fontWeight: 700,
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'all 0.2s ease',
                    boxShadow: activeSubTab === 'labels' ? '0 4px 12px rgba(16, 185, 129, 0.15)' : 'none'
                }}
            >
                <span>🏷️ Etiquetas</span>
                <span style={{
                    background: activeSubTab === 'labels' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255, 255, 255, 0.08)',
                    padding: '2px 8px',
                    borderRadius: '10px',
                    fontSize: '0.75rem',
                    color: activeSubTab === 'labels' ? '#fff' : '#cbd5e1'
                }}>
                    {labelsCount}
                </span>
            </button>

            <button
                type="button"
                data-testid="subtab-funnel-final-action"
                onClick={() => setActiveSubTab('final_action')}
                style={{
                    flex: 1,
                    minWidth: '160px',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: 'none',
                    background: activeSubTab === 'final_action' ? 'rgba(236, 72, 153, 0.2)' : 'transparent',
                    color: activeSubTab === 'final_action' ? '#f472b6' : '#94a3b8',
                    fontWeight: 700,
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'all 0.2s ease',
                    boxShadow: activeSubTab === 'final_action' ? '0 4px 12px rgba(236, 72, 153, 0.2)' : 'none'
                }}
            >
                <span>🚀 Ação Final / Fechamento</span>
                {hasFinalAction && (
                    <span style={{
                        background: 'rgba(236, 72, 153, 0.3)',
                        padding: '2px 6px',
                        borderRadius: '10px',
                        fontSize: '0.72rem',
                        color: '#fbcfe8'
                    }}>
                        Ativa
                    </span>
                )}
            </button>

            <button
                type="button"
                data-testid="subtab-funnel-scoring"
                onClick={() => setActiveSubTab('scoring')}
                style={{
                    flex: 1,
                    minWidth: '160px',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: 'none',
                    background: activeSubTab === 'scoring' ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                    color: activeSubTab === 'scoring' ? '#fbbf24' : '#94a3b8',
                    fontWeight: 700,
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'all 0.2s ease',
                    boxShadow: activeSubTab === 'scoring' ? '0 4px 12px rgba(245, 158, 11, 0.15)' : 'none'
                }}
            >
                <span>🔥 Lead Scoring & Critérios</span>
                {hasCriteria && (
                    <span style={{
                        background: 'rgba(245, 158, 11, 0.3)',
                        padding: '2px 6px',
                        borderRadius: '10px',
                        fontSize: '0.72rem',
                        color: '#fef3c7'
                    }}>
                        Definido
                    </span>
                )}
            </button>
        </div>
    );
};

export default QualificationSubTabsNav;

