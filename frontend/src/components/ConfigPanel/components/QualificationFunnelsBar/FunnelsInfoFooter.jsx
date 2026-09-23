import React from 'react';

export const FunnelsInfoFooter = ({
    currentFunnelId = '',
    questionsCount = 0
}) => {
    return (
            <div style={{
                marginTop: '12px',
                paddingTop: '10px',
                borderTop: '1px solid rgba(255, 255, 255, 0.07)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '8px',
                fontSize: '0.78rem',
                color: '#94a3b8'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ color: '#38bdf8' }}>✨</span>
                    <span>Para direcionar contatos de um disparo para este funil, envie via API:</span>
                    <code style={{
                        padding: '2px 6px',
                        background: 'rgba(0, 0, 0, 0.4)',
                        borderRadius: '4px',
                        color: '#38bdf8',
                        fontFamily: 'monospace',
                        border: '1px solid rgba(56, 189, 248, 0.2)'
                    }}>
                        funnel_id: "{currentFunnelId}"
                    </code>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{
                        padding: '2px 8px',
                        borderRadius: '6px',
                        background: 'rgba(99, 102, 241, 0.15)',
                        border: '1px solid rgba(99, 102, 241, 0.3)',
                        color: '#a5b4fc',
                        fontWeight: 600
                    }}>
                        Total de etapas neste funil: {questionsCount}
                    </span>
                </div>
            </div>
    );
};
