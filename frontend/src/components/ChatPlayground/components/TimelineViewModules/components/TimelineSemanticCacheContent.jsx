import React from 'react';

const TimelineSemanticCacheContent = ({ step }) => {
    return (
        <div style={{ marginTop: '6px', fontSize: '0.8rem' }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                <span style={{
                    background: step.cacheStatus === 'miss' ? 'rgba(148, 163, 184, 0.15)' : step.cacheStatus === 'hit_qualification' ? 'rgba(6, 182, 212, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                    border: `1px solid ${step.cacheStatus === 'miss' ? 'rgba(148, 163, 184, 0.3)' : step.cacheStatus === 'hit_qualification' ? 'rgba(6, 182, 212, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
                    color: step.cacheStatus === 'miss' ? '#94a3b8' : step.cacheStatus === 'hit_qualification' ? '#22d3ee' : '#34d399',
                    padding: '2px 8px', borderRadius: '12px', fontWeight: 'bold'
                }}>
                    {step.badgeLabel}
                </span>
                {step.simLabel && (
                    <span style={{
                        background: 'rgba(99, 102, 241, 0.15)', border: '1px solid rgba(99, 102, 241, 0.3)',
                        color: '#818cf8', padding: '2px 8px', borderRadius: '12px', fontWeight: 600
                    }}>
                        🎯 {step.simLabel}
                    </span>
                )}
            </div>
            <div style={{ color: '#cbd5e1', fontSize: '0.78rem' }}>
                {step.desc}
            </div>
            {step.matchedQueries && step.matchedQueries.length > 0 && (
                <div style={{ marginTop: '6px', padding: '6px 8px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '6px', borderLeft: '2px solid #34d399', fontSize: '0.75rem' }}>
                    <div style={{ color: '#86efac', fontWeight: 600, marginBottom: '2px' }}>
                        {step.matchedQueries.length > 1 ? 'Perguntas respondidas pelo Cache:' : 'Pergunta respondida pelo Cache:'}
                    </div>
                    <ul style={{ margin: 0, paddingLeft: '16px', color: '#e2e8f0' }}>
                        {step.matchedQueries.map((q, qIdx) => (
                            <li key={qIdx} style={{ margin: '1px 0' }}>"{q}"</li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default TimelineSemanticCacheContent;
