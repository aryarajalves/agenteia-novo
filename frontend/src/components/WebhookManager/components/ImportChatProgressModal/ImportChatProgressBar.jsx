import React from 'react';

const ImportChatProgressBar = ({ current, total, percentage, error, cancelled, done }) => {
    const percentageColor = cancelled ? '#fbbf24' : done ? '#34d399' : '#818cf8';

    const barGradient = error
        ? 'linear-gradient(90deg, #ef4444, #f87171)'
        : cancelled
            ? 'linear-gradient(90deg, #f59e0b, #fbbf24)'
            : done
                ? 'linear-gradient(90deg, #10b981, #34d399)'
                : 'linear-gradient(90deg, #6366f1, #818cf8)';

    const barGlow = error
        ? '0 0 10px rgba(239, 68, 68, 0.5)'
        : cancelled
            ? '0 0 10px rgba(245, 158, 11, 0.5)'
            : done
                ? '0 0 10px rgba(16, 185, 129, 0.5)'
                : '0 0 10px rgba(99, 102, 241, 0.5)';

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem' }}>
                <span style={{ color: '#cbd5e1', fontWeight: 600 }}>
                    {total > 0 ? `Conversa ${current} de ${total}` : 'Carregando...'}
                </span>
                <span style={{
                    color: percentageColor,
                    fontWeight: 800,
                    fontSize: '0.9rem'
                }}>
                    {percentage}%
                </span>
            </div>
            <div style={{
                width: '100%',
                height: '10px',
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                borderRadius: '6px',
                overflow: 'hidden',
                position: 'relative'
            }}>
                <div style={{
                    width: `${Math.min(Math.max(percentage, 0), 100)}%`,
                    height: '100%',
                    background: barGradient,
                    borderRadius: '6px',
                    transition: 'width 0.3s ease',
                    boxShadow: barGlow
                }} />
            </div>
        </div>
    );
};

export default ImportChatProgressBar;
