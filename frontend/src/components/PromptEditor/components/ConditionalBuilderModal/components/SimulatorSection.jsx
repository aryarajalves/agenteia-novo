import React from 'react';

export default function SimulatorSection({
    usedVars = [],
    simulatedValues = {},
    setSimulatedValues,
    renderValueInput,
    evaluationResult = ''
}) {
    if (usedVars.length === 0) return null;

    return (
        <div className="realtime-preview-card" style={{ marginTop: '1rem', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
            <div className="preview-header" style={{ borderBottom: '1px solid rgba(99, 102, 241, 0.2)' }}>
                <span style={{ color: '#818cf8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    🧪 Simulador de Resultado
                </span>
                <span className="preview-glow-dot" style={{ background: '#818cf8', boxShadow: '0 0 10px #818cf8' }}></span>
            </div>
            <div style={{ padding: '1.2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.75rem' }}>
                    {usedVars.map(v => (
                        <div key={v} className="form-group-inline flex-grow" style={{ minWidth: '150px' }}>
                            <label style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 'bold' }}>
                                {v}
                            </label>
                            {renderValueInput(
                                v,
                                simulatedValues[v] || '',
                                (val) => setSimulatedValues(prev => ({ ...prev, [v]: val })),
                                `sim-value-input-${v}`
                            )}
                        </div>
                    ))}
                </div>
                <div style={{ background: 'rgba(0, 0, 0, 0.3)', borderRadius: '8px', padding: '0.75rem 1rem', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.25rem', fontWeight: 'bold' }}>
                        Resultado Esperado:
                    </div>
                    <div
                        data-testid="expected-result"
                        style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: '#34d399', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}
                    >
                        {evaluationResult}
                    </div>
                </div>
            </div>
        </div>
    );
}
