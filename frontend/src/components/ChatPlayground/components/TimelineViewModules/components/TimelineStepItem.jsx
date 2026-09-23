import React from 'react';
import TimelinePreRouterContent from './TimelinePreRouterContent';
import TimelineSemanticCacheContent from './TimelineSemanticCacheContent';

const getTitleColor = (step) => {
    if (step.isViolation) return '#f43f5e';
    if (step.isContextVars) return '#f59e0b';
    if (step.isSemanticCache) {
        if (step.cacheStatus === 'miss') return '#94a3b8';
        if (step.cacheStatus === 'hit_qualification') return '#22d3ee';
        return '#34d399';
    }
    if (step.isPreRouter) return '#fbbf24';
    if (step.isWebhook) return '#60a5fa';
    return '';
};

const TimelineStepItem = ({ step, onOpenPreRouterDecision, onOpenPreRouterPrompt }) => {
    const titleColor = getTitleColor(step);

    return (
        <div className={`timeline-step ${step.isViolation ? 'violation' : ''}`}>
            <div className="step-icon">{step.icon}</div>
            <div className="step-content">
                <div className="step-title" style={{ color: titleColor }}>
                    {step.title}
                </div>

                {step.isPreRouter ? (
                    <TimelinePreRouterContent
                        step={step}
                        onOpenPreRouterDecision={onOpenPreRouterDecision}
                        onOpenPreRouterPrompt={onOpenPreRouterPrompt}
                    />
                ) : step.isImprovedMsg ? (
                    <div style={{ marginTop: '6px', fontSize: '0.78rem', background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '6px', padding: '8px' }}>
                        <div style={{ color: '#94a3b8', marginBottom: '4px' }}>
                            <strong style={{ color: '#cbd5e1' }}>Mensagem Original:</strong> "{step.origMsg}"
                        </div>
                        <div style={{ color: '#4ade80' }}>
                            <strong style={{ color: '#86efac' }}>Mensagem Melhorada / Enriquecida:</strong> "{step.improvedMsg}"
                        </div>
                    </div>
                ) : step.isContextVars && step.vars ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                        {Object.entries(step.vars).map(([k, v]) => (
                            <span key={k} style={{
                                display: 'inline-flex', alignItems: 'center', gap: '4px',
                                background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)',
                                borderRadius: '12px', padding: '2px 8px', fontSize: '0.72rem',
                                fontFamily: 'monospace', color: '#fbbf24'
                            }}>
                                <span style={{ color: '#f59e0b', fontWeight: 700 }}>{k}</span>
                                <span style={{ opacity: 0.5 }}>=</span>
                                <span>{String(v)}</span>
                            </span>
                        ))}
                    </div>
                ) : step.isSemanticCache ? (
                    <TimelineSemanticCacheContent step={step} />
                ) : (
                    step.desc && (
                        <div className="step-desc" style={{ color: step.isViolation ? '#fda4af' : '' }}>
                            {step.desc}
                        </div>
                    )
                )}
            </div>
        </div>
    );
};

export default TimelineStepItem;
