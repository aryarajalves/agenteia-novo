import React from 'react';
import PipelineStepMemoryAction from './PipelineStepMemoryAction';

export default function PipelineStepCardHeader({
    step,
    isCollapsed,
    setIsCollapsed,
    isError,
    isCacheHit,
    isCachePartial,
    isCacheMiss,
    isQualifiedStep,
    copied,
    handleCopyStep,
    onMaximize
}) {
    return (
        <div 
            onClick={() => setIsCollapsed(!isCollapsed)}
            style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                marginBottom: isCollapsed ? 0 : '1rem',
                cursor: 'pointer',
                userSelect: 'none'
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '1.2rem' }}>{step.icon}</span>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: isError ? '#fca5a5' : (isCacheHit ? '#34d399' : (isCachePartial ? '#fbbf24' : '#f1f5f9')) }}>
                    {step.title}
                </h3>
                {isCacheHit ? (
                    <span style={{
                        fontSize: '0.68rem',
                        background: 'rgba(16, 185, 129, 0.2)',
                        color: '#34d399',
                        border: '1px solid rgba(16, 185, 129, 0.4)',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontWeight: 800,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px'
                    }}>
                        <span>⚡</span> CUSTO ZERO
                    </span>
                ) : isCachePartial ? (
                    <span style={{
                        fontSize: '0.68rem',
                        background: 'rgba(245, 158, 11, 0.15)',
                        color: '#fbbf24',
                        border: '1px solid rgba(245, 158, 11, 0.3)',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontWeight: 800,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px'
                    }}>
                        <span>⚡</span> CACHE PARCIAL
                    </span>
                ) : isCacheMiss ? (
                    <span style={{
                        fontSize: '0.68rem',
                        background: 'rgba(148, 163, 184, 0.1)',
                        color: '#94a3b8',
                        border: '1px solid rgba(148, 163, 184, 0.25)',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontWeight: 800,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px'
                    }}>
                        <span>🔍</span> SIMILARIDADE INSUFICIENTE
                    </span>
                ) : null}

                {step.metadata?.similarity_pct && (
                    <span style={{
                        fontSize: '0.68rem',
                        background: isCacheHit ? 'rgba(16, 185, 129, 0.15)' : 'rgba(148, 163, 184, 0.1)',
                        color: isCacheHit ? '#6ee7b7' : '#cbd5e1',
                        border: `1px solid ${isCacheHit ? 'rgba(16, 185, 129, 0.3)' : 'rgba(148, 163, 184, 0.2)'}`,
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontWeight: 800
                    }}>
                        🎯 {step.metadata.similarity_pct}
                    </span>
                )}

                {step.metadata?.model && (
                    <span style={{
                        fontSize: '0.68rem',
                        background: 'rgba(99, 102, 241, 0.15)',
                        color: '#a5b4fc',
                        border: '1px solid rgba(99, 102, 241, 0.3)',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontWeight: 800
                    }}>
                        🤖 {step.metadata.model}
                    </span>
                )}

                {step.metadata?.usage?.total_tokens > 0 && (
                    <span style={{
                        fontSize: '0.68rem',
                        background: 'rgba(168, 85, 247, 0.15)',
                        color: '#d8b4fe',
                        border: '1px solid rgba(168, 85, 247, 0.3)',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontWeight: 800
                    }}>
                        🎟️ {step.metadata.usage.total_tokens.toLocaleString()} tok
                    </span>
                )}

                {step.metadata?.cost > 0 && (
                    <span style={{
                        fontSize: '0.68rem',
                        background: 'rgba(234, 179, 8, 0.15)',
                        color: '#fde047',
                        border: '1px solid rgba(234, 179, 8, 0.3)',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontWeight: 800
                    }}>
                        💰 R$ {Number(step.metadata.cost).toFixed(4)}
                    </span>
                )}

                {isQualifiedStep && step.metadata?.funnel_name && (
                    <span style={{
                        fontSize: '0.68rem',
                        background: 'rgba(59, 130, 246, 0.15)',
                        color: '#60a5fa',
                        border: '1px solid rgba(59, 130, 246, 0.3)',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontWeight: 800
                    }}>
                        🎯 {step.metadata.funnel_name}
                    </span>
                )}

                {isQualifiedStep && step.metadata?.lead_classification && (
                    <span style={{
                        fontSize: '0.68rem',
                        background: String(step.metadata.lead_classification).toLowerCase().includes('quente') 
                            ? 'rgba(239, 68, 68, 0.15)' 
                            : String(step.metadata.lead_classification).toLowerCase().includes('morno') 
                                ? 'rgba(245, 158, 11, 0.15)' 
                                : 'rgba(148, 163, 184, 0.15)',
                        color: String(step.metadata.lead_classification).toLowerCase().includes('quente')
                            ? '#f87171'
                            : String(step.metadata.lead_classification).toLowerCase().includes('morno')
                                ? '#fbbf24'
                                : '#94a3b8',
                        border: `1px solid ${
                            String(step.metadata.lead_classification).toLowerCase().includes('quente') 
                                ? 'rgba(239, 68, 68, 0.3)' 
                                : String(step.metadata.lead_classification).toLowerCase().includes('morno')
                                    ? 'rgba(245, 158, 11, 0.3)'
                                    : 'rgba(148, 163, 184, 0.3)'
                        }`,
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontWeight: 800
                    }}>
                        🌡️ {step.metadata.lead_classification} {step.metadata.lead_score ? `(${step.metadata.lead_score}/100)` : ''}
                    </span>
                )}

                {isQualifiedStep && step.metadata?.labels_applied?.length > 0 && (
                    <span style={{
                        fontSize: '0.68rem',
                        background: 'rgba(16, 185, 129, 0.2)',
                        color: '#34d399',
                        border: '1px solid rgba(16, 185, 129, 0.4)',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontWeight: 800,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                    }}>
                        🏷️ {step.metadata.labels_applied.join(', ')}
                    </span>
                )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <PipelineStepMemoryAction step={step} onMaximize={onMaximize} variant="header" />

                <button
                    onClick={handleCopyStep}
                    style={{
                        background: copied ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                        border: copied ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(255, 255, 255, 0.1)',
                        color: copied ? '#34d399' : '#94a3b8',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        transition: 'all 0.2s'
                    }}
                    title="Copiar texto desta etapa"
                >
                    <span>{copied ? '✓' : '📋'}</span>
                    <span>{copied ? 'Copiado!' : 'Copiar'}</span>
                </button>

                {step.durationFormatted && (
                    <span style={{
                        fontSize: '0.75rem',
                        color: '#818cf8',
                        background: 'rgba(99, 102, 241, 0.1)',
                        border: '1px solid rgba(99, 102, 241, 0.2)',
                        padding: '2px 6px',
                        borderRadius: '6px',
                        fontWeight: 700
                    }}>
                        ⚡ {step.durationFormatted}
                    </span>
                )}
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    {step.timestampFormatted}
                </span>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    {isCollapsed ? '▼' : '▲'}
                </span>
            </div>
        </div>
    );
}

