import React from 'react';

export default function PipelineStepDiagnostic({ diagnostic }) {
    if (!diagnostic) return null;

    return (
        <div style={{
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            borderRadius: '14px',
            padding: '1rem 1.25rem',
            marginBottom: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '1.1rem' }}>💡</span>
                <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#fca5a5' }}>
                    {diagnostic.title}
                </span>
            </div>
            <p style={{ margin: 0, fontSize: '0.82rem', color: '#cbd5e1', lineHeight: '1.5' }}>
                {diagnostic.tip}
            </p>
            {diagnostic.action && (
                <div style={{ marginTop: '4px' }}>
                    <span style={{
                        fontSize: '0.72rem',
                        background: 'rgba(239, 68, 68, 0.2)',
                        color: '#fca5a5',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontWeight: 700
                    }}>
                        Ação Sugerida: {diagnostic.action}
                    </span>
                </div>
            )}
        </div>
    );
}
