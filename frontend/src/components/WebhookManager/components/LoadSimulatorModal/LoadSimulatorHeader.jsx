import React from 'react';

const LoadSimulatorHeader = ({ webhook, onClose, simulating }) => {
    return (
        <div style={{
            padding: '1.25rem 1.5rem',
            background: 'linear-gradient(180deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.95) 100%)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <div style={{
                    width: '40px', height: '40px', borderRadius: '12px',
                    background: 'rgba(99, 102, 241, 0.15)', border: '1px solid rgba(99, 102, 241, 0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem'
                }}>⚡</div>
                <div>
                    <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#f8fafc', fontWeight: 800 }}>
                        Simulador de Carga & Escala
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.78rem', color: '#94a3b8' }}>
                        Integração: <strong>{webhook?.name}</strong> (Modo MOCK / Zero Tokens)
                    </p>
                </div>
            </div>
            <button 
                onClick={onClose} 
                disabled={simulating}
                style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#94a3b8',
                    borderRadius: '8px',
                    width: '32px',
                    height: '32px',
                    cursor: simulating ? 'not-allowed' : 'pointer',
                    fontSize: '0.9rem'
                }}
            >✕</button>
        </div>
    );
};

export default LoadSimulatorHeader;
