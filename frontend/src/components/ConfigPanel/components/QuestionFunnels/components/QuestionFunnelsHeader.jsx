import React from 'react';

const QuestionFunnelsHeader = ({ activeCount, totalItems, onNewFunnel }) => {
    return (
        <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
            padding: '1.25rem',
            background: 'rgba(15, 23, 42, 0.6)',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.06)'
        }}>
            <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#f8fafc', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>🎯</span> Funis de Conversão por Dúvida (Áudios & Sequências)
                </h3>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.84rem', color: '#94a3b8' }}>
                    Dispare áudios humanizados PTT e mensagens pré-configuradas para dúvidas estratégicas na primeira vez que o cliente perguntar.
                </p>
            </div>

            <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                <div style={{ padding: '0.4rem 0.75rem', background: 'rgba(30, 41, 59, 0.6)', borderRadius: '8px', fontSize: '0.82rem', color: '#cbd5e1' }}>
                    Ativos: <strong style={{ color: '#4ade80' }}>{activeCount}</strong> de {totalItems}
                </div>
                <button
                    type="button"
                    onClick={onNewFunnel}
                    style={{
                        padding: '0.55rem 1.15rem',
                        background: '#2563eb',
                        border: 'none',
                        borderRadius: '8px',
                        color: '#ffffff',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.4)'
                    }}
                >
                    <span>+</span> Novo Funil por Dúvida
                </button>
            </div>
        </div>
    );
};

export default QuestionFunnelsHeader;
