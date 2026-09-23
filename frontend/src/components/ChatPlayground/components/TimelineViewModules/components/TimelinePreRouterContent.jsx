import React from 'react';
import { estimateTokens, formatTokenCount } from '../../../utils/tokenUtils';

const TimelinePreRouterContent = ({ step, onOpenPreRouterDecision, onOpenPreRouterPrompt }) => {
    return (
        <div style={{ marginTop: '6px', fontSize: '0.8rem', color: '#cbd5e1' }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
                <span style={{ background: 'rgba(251, 191, 36, 0.15)', border: '1px solid rgba(251, 191, 36, 0.3)', color: '#fbbf24', padding: '2px 8px', borderRadius: '12px', fontWeight: 'bold' }}>
                    🏷️ {step.tipoMsg}
                </span>
                <span style={{ 
                    background: (step.ragStatus?.includes('Dispensado') || step.ragStatus === 'Não Consultado') ? 'rgba(16, 185, 129, 0.15)' : 'rgba(99, 102, 241, 0.15)', 
                    border: (step.ragStatus?.includes('Dispensado') || step.ragStatus === 'Não Consultado') ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(99, 102, 241, 0.3)', 
                    color: (step.ragStatus?.includes('Dispensado') || step.ragStatus === 'Não Consultado') ? '#34d399' : '#818cf8', 
                    padding: '2px 8px', 
                    borderRadius: '12px' 
                }}>
                    📚 RAG: {step.ragStatus}
                </span>
                <span style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#34d399', padding: '2px 8px', borderRadius: '12px' }}>
                    🛠️ Ferramentas: {step.toolStatus}
                </span>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                {step.hasDecisionBtn && (
                    <button
                        type="button"
                        onClick={onOpenPreRouterDecision}
                        style={{
                            background: 'rgba(251, 191, 36, 0.1)',
                            border: '1px solid rgba(251, 191, 36, 0.3)',
                            color: '#fbbf24',
                            padding: '4px 10px',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            transition: 'all 0.2s'
                        }}
                        className="playground-action-btn"
                    >
                        🧠 Ver Decisão do Pre-Router
                    </button>
                )}
                {step.hasPromptBtn && (
                    <button
                        type="button"
                        onClick={onOpenPreRouterPrompt}
                        style={{
                            background: 'rgba(251, 191, 36, 0.1)',
                            border: '1px solid rgba(251, 191, 36, 0.3)',
                            color: '#fbbf24',
                            padding: '4px 10px',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            transition: 'all 0.2s',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}
                        className="playground-action-btn"
                    >
                        📝 Ver Prompt Enviado
                        {step.preRouterData?._debug_prompt && (
                            <span style={{
                                background: 'rgba(251, 191, 36, 0.2)',
                                border: '1px solid rgba(251, 191, 36, 0.3)',
                                color: '#fbbf24',
                                padding: '1px 6px',
                                borderRadius: '10px',
                                fontSize: '0.7rem',
                                fontWeight: 'bold'
                            }}>
                                ~{formatTokenCount(estimateTokens(step.preRouterData._debug_prompt))}t
                            </span>
                        )}
                    </button>
                )}
            </div>
        </div>
    );
};

export default TimelinePreRouterContent;
