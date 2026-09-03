import React from 'react';

export default function PipelineLoadingState() {
    return (
        <div style={{ flex: 1, height: '100%', minHeight: '300px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1.25rem' }}>
            <div className="pipeline-spinner" style={{ width: '42px', height: '42px', borderWidth: '4px' }}></div>
            <div style={{ textAlign: 'center' }}>
                <div style={{ fontWeight: 800, color: '#f8fafc', fontSize: '1.05rem', letterSpacing: '-0.01em' }}>
                    Carregando Pipeline de Automação...
                </div>
                <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px', fontWeight: 600 }}>
                    Obtendo todas as etapas de processamento
                </div>
            </div>
        </div>
    );
}
