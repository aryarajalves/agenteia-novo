import React from 'react';
import ReactDOM from 'react-dom';

const IgnoreLeadQuestionModal = ({
    isOpen,
    item,
    onClose,
    onConfirm,
    isIgnoring = false
}) => {
    if (!isOpen || !item) return null;

    return ReactDOM.createPortal(
        <div
            className="modal-backdrop"
            data-testid="ignore-lead-question-modal-backdrop"
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                background: 'rgba(0, 0, 0, 0.82)',
                backdropFilter: 'blur(8px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 999999,
                transition: 'all 0.2s ease'
            }}
        >
            <div
                className="modal-panel"
                data-testid="ignore-lead-question-modal-panel"
                onClick={(e) => e.stopPropagation()}
                style={{
                    background: '#0f172a',
                    border: '1px solid rgba(239, 68, 68, 0.35)',
                    borderRadius: '16px',
                    padding: '26px 28px',
                    maxWidth: '520px',
                    width: '90%',
                    boxShadow: '0 25px 60px rgba(0, 0, 0, 0.9), 0 0 25px rgba(239, 68, 68, 0.15)',
                    color: '#f8fafc',
                    position: 'relative',
                    animation: 'scaleUp 0.2s ease-out'
                }}
            >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                            style={{
                                width: '38px',
                                height: '38px',
                                borderRadius: '10px',
                                background: 'rgba(239, 68, 68, 0.15)',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '1.2rem'
                            }}
                        >
                            🚫
                        </div>
                        <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#f8fafc' }}>
                            Ignorar Dúvida para o Cache
                        </h3>
                    </div>

                    <button
                        onClick={onClose}
                        disabled={isIgnoring}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#94a3b8',
                            fontSize: '1.25rem',
                            cursor: 'pointer',
                            padding: '4px'
                        }}
                    >
                        ✕
                    </button>
                </div>

                {/* Corpo com Dúvida em Destaque */}
                <p style={{ color: '#cbd5e1', fontSize: '0.9rem', lineHeight: '1.5', margin: '0 0 14px 0' }}>
                    Tem certeza de que <strong>não vale a pena</strong> adicionar esta dúvida ao Cache Semântico?
                </p>

                <div
                    style={{
                        background: 'rgba(15, 23, 42, 0.8)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderLeft: '4px solid #ef4444',
                        borderRadius: '8px',
                        padding: '12px 14px',
                        marginBottom: '16px'
                    }}
                >
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                        Dúvida do Lead:
                    </span>
                    <span style={{ fontSize: '0.95rem', color: '#f1f5f9', fontWeight: 600, fontStyle: 'italic' }}>
                        "{item.user_query}"
                    </span>
                </div>

                <p style={{ color: '#94a3b8', fontSize: '0.82rem', margin: '0 0 20px 0', lineHeight: '1.4' }}>
                    Ao confirmar, esta pergunta será <strong>ocultada desta lista de sugestões</strong> e não será mais exibida como candidata para o cache.
                </p>

                {/* Footer com Apenas 1 Botão de Cancelar e 1 Botão Principal */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isIgnoring}
                        data-testid="cancel-ignore-modal-btn"
                        style={{
                            padding: '9px 18px',
                            borderRadius: '8px',
                            border: '1px solid rgba(255, 255, 255, 0.12)',
                            background: 'rgba(255, 255, 255, 0.05)',
                            color: '#cbd5e1',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            cursor: 'pointer'
                        }}
                    >
                        Cancelar
                    </button>

                    <button
                        type="button"
                        onClick={() => onConfirm(item)}
                        disabled={isIgnoring}
                        data-testid="confirm-ignore-modal-btn"
                        style={{
                            padding: '9px 20px',
                            borderRadius: '8px',
                            border: 'none',
                            background: 'linear-gradient(135deg, #dc2626, #ef4444)',
                            color: '#fff',
                            fontSize: '0.88rem',
                            fontWeight: 700,
                            cursor: isIgnoring ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            boxShadow: '0 4px 14px rgba(239, 68, 68, 0.35)'
                        }}
                    >
                        {isIgnoring ? 'Ignorando...' : '🚫 Confirmar e Ignorar'}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default IgnoreLeadQuestionModal;
