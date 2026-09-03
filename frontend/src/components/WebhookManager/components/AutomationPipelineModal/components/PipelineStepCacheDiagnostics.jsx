import React from 'react';

/**
 * Exibe o diagnóstico detalhado das dúvidas analisadas no Cache Semântico,
 * mostrando a pergunta feita pelo usuário, a similaridade obtida, o limiar exigido
 * e a correspondência mais próxima encontrada no banco de dados.
 */
export default function PipelineStepCacheDiagnostics({ queriesEvaluated = [], maxSimilarity, threshold }) {
    if (!Array.isArray(queriesEvaluated) || queriesEvaluated.length === 0) {
        return null;
    }

    return (
        <div style={{
            marginBottom: '1rem',
            background: 'rgba(15, 23, 42, 0.6)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '14px',
            padding: '1rem 1.15rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>🎯</span> Dúvidas Analisadas no Cache Semântico ({queriesEvaluated.length})
                </span>
                {threshold && (
                    <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>
                        Limiar Exigido: <strong style={{ color: '#cbd5e1' }}>{typeof threshold === 'number' && threshold <= 1.0 ? `${(threshold * 100).toFixed(1)}%` : `${threshold}%`}</strong>
                    </span>
                )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {queriesEvaluated.map((q, idx) => {
                    const isApproved = Boolean(q.approved);
                    const simPct = q.similarity_pct || (q.similarity ? `${(q.similarity * 100).toFixed(1)}%` : '--');
                    const threshPct = q.threshold_pct || (q.threshold ? `${(q.threshold * 100).toFixed(1)}%` : '--');

                    return (
                        <div 
                            key={idx}
                            style={{
                                background: isApproved ? 'rgba(16, 185, 129, 0.06)' : 'rgba(239, 68, 68, 0.05)',
                                border: `1px solid ${isApproved ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.2)'}`,
                                borderRadius: '12px',
                                padding: '10px 14px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '6px'
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>#{idx + 1}</span>
                                    <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#f8fafc' }}>
                                        "{q.sub_query}"
                                    </span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{
                                        fontSize: '0.72rem',
                                        fontWeight: 800,
                                        background: isApproved ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.15)',
                                        color: isApproved ? '#34d399' : '#f87171',
                                        border: `1px solid ${isApproved ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.3)'}`,
                                        padding: '2px 8px',
                                        borderRadius: '6px',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                    }}>
                                        <span>{isApproved ? '✅' : '❌'}</span>
                                        <span>{isApproved ? `Aprovada (${simPct})` : `${simPct} < ${threshPct}`}</span>
                                    </span>
                                </div>
                            </div>

                            {q.matched_query ? (
                                <div style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                    <span>↳ Resposta mais próxima no cache:</span>
                                    <span style={{ color: '#cbd5e1', fontStyle: 'italic', fontWeight: 600 }}>
                                        "{q.matched_query}"
                                    </span>
                                    <span style={{ color: isApproved ? '#34d399' : '#fbbf24', fontWeight: 700 }}>
                                        (Similaridade: {simPct})
                                    </span>
                                </div>
                            ) : (
                                <div style={{ fontSize: '0.78rem', color: '#64748b', fontStyle: 'italic' }}>
                                    ↳ Nenhuma correspondência relevante encontrada no cache.
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
