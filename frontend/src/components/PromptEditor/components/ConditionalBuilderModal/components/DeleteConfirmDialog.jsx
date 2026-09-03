import React from 'react';

export default function DeleteConfirmDialog({
    show,
    onCancel,
    onConfirm
}) {
    if (!show) return null;

    return (
        <div className="cond-modal-overlay fade-in" style={{ zIndex: 1100, background: 'rgba(0, 0, 0, 0.75)', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="cond-modal-card" style={{ maxWidth: '400px', textAlign: 'center', padding: '2rem', background: '#1e1b4b', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '1rem', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
                <header className="modal-header" style={{ justifyContent: 'center', borderBottom: 'none', padding: 0 }}>
                    <h3 style={{ color: '#f87171', margin: 0 }}>⚠️ Confirmar Exclusão</h3>
                </header>
                <div className="modal-body" style={{ margin: '1.5rem 0', padding: 0 }}>
                    <p style={{ fontSize: '0.95rem', opacity: 0.9, color: '#e0e7ff' }}>
                        Tem certeza de que deseja deletar esta condicional?
                    </p>
                    <p style={{ fontSize: '0.8rem', opacity: 0.6, marginTop: '0.5rem', color: '#c7d2fe' }}>
                        Esta ação não pode ser desfeita e removerá todo o bloco condicional do prompt.
                    </p>
                </div>
                <footer className="modal-footer" style={{ display: 'flex', justifyContent: 'center', gap: '1rem', borderTop: 'none', padding: 0 }}>
                    <button
                        onClick={onCancel}
                        className="secondary-btn"
                        style={{ padding: '0.75rem 1.5rem', background: 'rgba(255, 255, 255, 0.1)', color: '#fff', border: '1px solid rgba(255, 255, 255, 0.2)' }}
                        type="button"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={onConfirm}
                        className="primary-btn"
                        style={{ background: '#ef4444', borderColor: '#ef4444', color: '#fff', padding: '0.75rem 1.5rem' }}
                        type="button"
                    >
                        Sim, Deletar
                    </button>
                </footer>
            </div>
        </div>
    );
}
