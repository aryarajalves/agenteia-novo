import React from 'react';
import ReactDOM from 'react-dom';

const DeleteCacheModal = ({ isOpen, item, onClose, onConfirm, isDeleting }) => {
    if (!isOpen || !item) return null;

    return ReactDOM.createPortal(
        <div
            className="modal-backdrop"
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                background: 'rgba(0, 0, 0, 0.78)',
                backdropFilter: 'blur(8px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 999999
            }}
        >
            <div
                className="modal-panel"
                style={{
                    background: '#0f172a',
                    border: '1px solid rgba(239, 68, 68, 0.35)',
                    borderRadius: '16px',
                    padding: '28px',
                    maxWidth: '480px',
                    width: '90%',
                    boxShadow: '0 25px 60px rgba(0, 0, 0, 0.85)',
                    textAlign: 'center',
                    color: '#f8fafc'
                }}
            >
                <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🗑️</div>
                <h3 style={{ color: '#fff', margin: '0 0 8px 0', fontSize: '1.2rem' }}>
                    Excluir Resposta do Cache?
                </h3>
                <p style={{ color: '#94a3b8', fontSize: '0.88rem', lineHeight: '1.4', marginBottom: '20px' }}>
                    A pergunta <strong>"{item.user_query}"</strong> e suas variações não serão mais respondidas automaticamente a custo zero.
                </p>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                    <button
                        onClick={onClose}
                        disabled={isDeleting}
                        style={{
                            padding: '10px 20px',
                            borderRadius: '8px',
                            background: 'rgba(255, 255, 255, 0.08)',
                            border: '1px solid rgba(255, 255, 255, 0.15)',
                            color: '#fff',
                            fontWeight: 600,
                            cursor: 'pointer'
                        }}
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isDeleting}
                        style={{
                            padding: '10px 20px',
                            borderRadius: '8px',
                            background: '#ef4444',
                            border: 'none',
                            color: '#fff',
                            fontWeight: 700,
                            cursor: 'pointer'
                        }}
                    >
                        {isDeleting ? 'Excluindo...' : 'Sim, Excluir'}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default DeleteCacheModal;
