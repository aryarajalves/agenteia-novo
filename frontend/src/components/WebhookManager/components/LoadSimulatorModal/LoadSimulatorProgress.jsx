import React from 'react';

const LoadSimulatorProgress = ({ contactCount, progress }) => {
    return (
        <div style={{ padding: '2.5rem 1rem', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '1.25rem', alignItems: 'center' }}>
            <div style={{ fontSize: '2.5rem', animation: 'spin 1.5s infinite linear' }}>⚡</div>
            <div>
                <h4 style={{ margin: 0, color: '#f8fafc', fontSize: '1.1rem', fontWeight: 800 }}>
                    Processando {contactCount} contatos fictícios...
                </h4>
                <p style={{ margin: '0.3rem 0 0 0', color: '#94a3b8', fontSize: '0.82rem' }}>
                    Executando inserção paralela no banco e simulação de eventos MOCK
                </p>
            </div>

            <div style={{ width: '100%', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '10px', height: '10px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{
                    width: `${progress}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, #6366f1, #10b981)',
                    transition: 'width 0.3s ease'
                }} />
            </div>
        </div>
    );
};

export default LoadSimulatorProgress;
