import React from 'react';

export default function LogoutConfirmModal({
    isOpen,
    onCancel,
    onLogout
}) {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <span className="modal-icon">👋</span>
                <h2 className="modal-title">Até logo!</h2>
                <p className="modal-message">
                    Você tem certeza que deseja encerrar sua sessão no painel do Agent Flow?
                </p>
                <div className="modal-actions">
                    <button
                        className="modal-btn modal-btn-cancel"
                        onClick={onCancel}
                    >
                        Cancelar
                    </button>
                    <button
                        className="modal-btn modal-btn-confirm"
                        onClick={onLogout}
                    >
                        Sim, Sair
                    </button>
                </div>
            </div>
        </div>
    );
}
