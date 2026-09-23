import React from 'react';

export default function ContextMemoryFooter({ onClose }) {
    return (
        <div style={{
            padding: '0.85rem 2rem',
            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
            background: 'rgba(15, 23, 42, 0.8)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.74rem',
            color: '#64748b'
        }}>
            <span>
                💡 Estas mensagens foram carregadas do banco de dados e injetadas no prompt da IA como memória de curto prazo.
            </span>
            <button
                onClick={onClose}
                style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#cbd5e1',
                    padding: '4px 14px',
                    borderRadius: '8px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                }}
            >
                Fechar
            </button>
        </div>
    );
}
