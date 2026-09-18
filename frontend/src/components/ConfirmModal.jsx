import React from 'react';
import ReactDOM from 'react-dom';

function ConfirmModal({ isOpen, title, message, onConfirm, onCancel, confirmText = "Confirmar", cancelText = "Cancelar", type = "danger", isLoading = false, icon = null }) {
    if (!isOpen) return null;

    return ReactDOM.createPortal(
        <div className="confirm-modal-overlay fade-in">
            <div className={`confirm-modal-card ${isLoading ? 'is-loading' : ''}`} onClick={e => e.stopPropagation()}>
                <div className="confirm-modal-content">
                    {isLoading ? (
                        <div className="modal-loading-state">
                            <div className="premium-spinner"></div>
                            <h2 className="modal-title" style={{ marginTop: '20px' }}>Apagando...</h2>
                            <p className="modal-message">Aguarde um momento enquanto processamos sua solicitação.</p>
                        </div>
                    ) : (
                        <>
                            <div className={`modal-icon-wrapper ${type}`}>
                                {icon ? (
                                    typeof icon === 'string' ? <span style={{ fontSize: '2rem' }}>{icon}</span> : icon
                                ) : type === 'danger' ? (
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M3 6h18"></path>
                                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                                        <line x1="10" y1="11" x2="10" y2="17"></line>
                                        <line x1="14" y1="11" x2="14" y2="17"></line>
                                    </svg>
                                ) : type === 'success' ? (
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="20 6 9 17 4 12"></polyline>
                                    </svg>
                                ) : (
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>
                                    </svg>
                                )}
                            </div>

                            <h2 className="modal-title">{title}</h2>
                            <p className="modal-message">{message}</p>
                        </>
                    )}
                </div>

                {!isLoading && (
                    <div className="modal-actions-grid" style={{ 
                        gridTemplateColumns: (!onCancel || !cancelText) ? '1fr' : '1fr 1fr' 
                    }}>
                        {onCancel && cancelText && (
                            <button className="modal-btn cancel" onClick={onCancel}>
                                {cancelText}
                            </button>
                        )}
                        <button className={`modal-btn confirm ${type}`} onClick={onConfirm} style={{ borderLeft: (!onCancel || !cancelText) ? 'none' : '1px solid rgba(255,255,255,0.06)' }}>
                            {confirmText}
                        </button>
                    </div>
                )}
            </div>

            <style>{`
                .confirm-modal-overlay {
                    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
                    background: rgba(7, 10, 19, 0.85); backdrop-filter: blur(16px);
                    z-index: 10000000; display: flex; align-items: center; justify-content: center;
                    padding: 20px; animation: modalFadeIn 0.3s ease-out;
                }
                .confirm-modal-card {
                    background: linear-gradient(145deg, #161d2f 0%, #0f172a 100%); 
                    border: 1px solid rgba(255,255,255,0.1);
                    border-radius: 32px; width: 100%; max-width: 440px;
                    box-shadow: 0 50px 120px -30px rgba(0,0,0,0.9);
                    overflow: hidden; animation: modalPop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
                }
                .confirm-modal-content { padding: 45px 35px 35px; text-align: center; }
                
                .modal-icon-wrapper {
                    width: 76px; height: 76px; border-radius: 24px;
                    display: flex; align-items: center; justify-content: center;
                    margin: 0 auto 28px; font-size: 2.2rem;
                    box-shadow: 0 12px 30px rgba(0,0,0,0.3);
                }
                .modal-icon-wrapper.danger {
                    background: linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(239, 68, 68, 0.05) 100%); 
                    border: 1px solid rgba(239, 68, 68, 0.3); color: #ef4444;
                }
                .modal-icon-wrapper.info, .modal-icon-wrapper.primary {
                    background: linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(99, 102, 241, 0.05) 100%); 
                    border: 1px solid rgba(99, 102, 241, 0.3); color: #818cf8;
                }
                .modal-icon-wrapper.success {
                    background: linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(16, 185, 129, 0.05) 100%); 
                    border: 1px solid rgba(16, 185, 129, 0.3); color: #34d399;
                }

                .modal-title { color: white; font-size: 1.7rem; font-weight: 900; margin-bottom: 16px; letter-spacing: -0.02em; }
                .modal-message { color: #94a3b8; font-size: 1.05rem; line-height: 1.7; font-weight: 500; padding: 0 10px; }

                .modal-actions-grid {
                    display: grid; grid-template-columns: 1fr 1fr; gap: 0;
                    border-top: 1px solid rgba(255,255,255,0.06);
                }
                .modal-btn {
                    border: none; padding: 24px; font-size: 1rem; font-weight: 700;
                    cursor: pointer; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); background: transparent;
                }
                .modal-btn.cancel { color: #64748b; border-right: 1px solid rgba(255,255,255,0.06); }
                .modal-btn.cancel:hover { background: rgba(255,255,255,0.03); color: white; }
                
                .modal-btn.confirm.danger { color: #ef4444; }
                .modal-btn.confirm.danger:hover { background: #ef4444; color: white; }
                
                .modal-btn.confirm.info, .modal-btn.confirm.primary { color: #818cf8; }
                .modal-btn.confirm.info:hover, .modal-btn.confirm.primary:hover { background: #6366f1; color: white; }
                
                .modal-btn.confirm.success { color: #34d399; }
                .modal-btn.confirm.success:hover { background: #10b981; color: white; }

                @keyframes modalFadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes modalPop { from { opacity: 0; transform: scale(0.95) translateY(30px); } to { opacity: 1; transform: scale(1) translateY(0); } }
                
                .premium-spinner {
                    width: 60px; height: 60px;
                    border: 4px solid rgba(99, 102, 241, 0.1);
                    border-top: 4px solid #6366f1;
                    border-radius: 50%;
                    margin: 0 auto;
                    animation: spin 1s cubic-bezier(0.4, 0, 0.2, 1) infinite;
                    box-shadow: 0 0 20px rgba(99, 102, 241, 0.2);
                }

                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }

                .modal-loading-state {
                    animation: fadeIn 0.4s ease-out;
                    padding: 20px 0;
                }

                .confirm-modal-card.is-loading {
                    border-color: rgba(99, 102, 241, 0.3);
                }
            `}</style>
        </div>,
        document.body
    );
}

export default ConfirmModal;
