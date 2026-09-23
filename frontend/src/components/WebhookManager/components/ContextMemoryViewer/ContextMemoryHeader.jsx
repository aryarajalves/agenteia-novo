import React from 'react';

export default function ContextMemoryHeader({ totalMessages, numInteractions, contextWindow, onClose }) {
    return (
        <div style={{
            padding: '1.5rem 2rem',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'rgba(255, 255, 255, 0.02)'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.3rem',
                    boxShadow: '0 0 20px rgba(168, 85, 247, 0.3)'
                }}>
                    🧠
                </div>
                <div>
                    <div style={{ fontWeight: 800, color: '#fff', fontSize: '1.15rem' }}>
                        Memória de Contexto Injetada
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
                        <span style={{
                            fontSize: '0.72rem',
                            background: 'rgba(168, 85, 247, 0.15)',
                            color: '#c084fc',
                            border: '1px solid rgba(168, 85, 247, 0.3)',
                            padding: '2px 8px',
                            borderRadius: '6px',
                            fontWeight: 700
                        }}>
                            💬 {totalMessages} {totalMessages === 1 ? 'mensagem' : 'mensagens'}
                        </span>
                        {numInteractions > 0 && (
                            <span style={{
                                fontSize: '0.72rem',
                                background: 'rgba(99, 102, 241, 0.15)',
                                color: '#a5b4fc',
                                border: '1px solid rgba(99, 102, 241, 0.3)',
                                padding: '2px 8px',
                                borderRadius: '6px',
                                fontWeight: 700
                            }}>
                                🔄 {numInteractions} {numInteractions === 1 ? 'interação' : 'interações'}
                            </span>
                        )}
                        <span style={{
                            fontSize: '0.72rem',
                            background: 'rgba(148, 163, 184, 0.1)',
                            color: '#94a3b8',
                            border: '1px solid rgba(148, 163, 184, 0.2)',
                            padding: '2px 8px',
                            borderRadius: '6px',
                            fontWeight: 700
                        }}>
                            🎯 Janela Máx: {contextWindow * 2} msgs ({contextWindow} pares)
                        </span>
                    </div>
                </div>
            </div>
            <button 
                id="context-memory-modal-close"
                onClick={onClose}
                style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#94a3b8',
                    borderRadius: '12px',
                    width: '36px',
                    height: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    transition: 'all 0.2s'
                }}
            >
                ✕
            </button>
        </div>
    );
}
