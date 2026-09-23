import React from 'react';

const ImportChatCancelModal = ({
    isOpen,
    onClose,
    onConfirm,
    isCancelling
}) => {
    if (!isOpen) return null;

    const handleConfirm = async () => {
        onClose();
        if (onConfirm) await onConfirm();
    };

    return (
        <div
            className="cancel-confirmation-overlay"
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                width: '100vw',
                height: '100vh',
                backgroundColor: '#000000',
                background: '#000000',
                zIndex: 10000005,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px'
            }}
            onClick={e => e.stopPropagation()}
        >
            <div
                style={{
                    maxWidth: '420px',
                    width: '90%',
                    background: '#0f172a',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '16px',
                    padding: '1.8rem',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.9), 0 0 25px rgba(239, 68, 68, 0.2)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem',
                    textAlign: 'center',
                    color: '#f8fafc'
                }}
                onClick={e => e.stopPropagation()}
            >
                <div style={{
                    width: '50px',
                    height: '50px',
                    borderRadius: '50%',
                    background: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.5rem',
                    margin: '0 auto'
                }}>
                    🛑
                </div>
                <h4 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>
                    Cancelar Importação?
                </h4>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.5 }}>
                    O processo será interrompido imediatamente. Todos os contatos e mensagens importados até o momento serão mantidos no sistema com integridade.
                </p>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginTop: '0.5rem' }}>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isCancelling}
                        style={{
                            padding: '0.55rem 1.2rem',
                            borderRadius: '8px',
                            background: 'rgba(255, 255, 255, 0.08)',
                            border: '1px solid rgba(255, 255, 255, 0.15)',
                            color: '#cbd5e1',
                            fontWeight: 600,
                            fontSize: '0.85rem',
                            cursor: 'pointer'
                        }}
                    >
                        Voltar
                    </button>
                    <button
                        type="button"
                        onClick={handleConfirm}
                        disabled={isCancelling}
                        style={{
                            padding: '0.55rem 1.3rem',
                            borderRadius: '8px',
                            background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                            border: 'none',
                            color: '#fff',
                            fontWeight: 700,
                            fontSize: '0.85rem',
                            cursor: isCancelling ? 'not-allowed' : 'pointer',
                            boxShadow: '0 0 15px rgba(239, 68, 68, 0.4)'
                        }}
                    >
                        {isCancelling ? 'Cancelando...' : 'Sim, Cancelar'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ImportChatCancelModal;
