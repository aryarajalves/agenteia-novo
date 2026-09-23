import React from 'react';

const PromptModalFooter = ({ copied, onCopy, onClose }) => {
    return (
        <div className="modal-footer" style={{ 
            display: 'flex', 
            justifyContent: 'flex-end', 
            gap: '12px',
            padding: '24px 32px',
            background: 'rgba(15, 23, 42, 0.4)',
            borderTop: '1px solid rgba(255,255,255,0.08)',
            flexDirection: 'row',
            alignItems: 'center'
        }}>
            <button 
                onClick={onCopy} 
                style={{
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    color: '#e2e8f0',
                    padding: '10px 20px',
                    borderRadius: '10px',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.2s'
                }}
                className="modal-btn-cancel-custom"
            >
                {copied ? '✅ Copiado!' : '📋 Copiar Conteúdo'}
            </button>
            <button 
                onClick={onClose}
                style={{
                    background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                    border: 'none',
                    color: '#ffffff',
                    padding: '10px 24px',
                    borderRadius: '10px',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    fontWeight: '700',
                    boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
                    transition: 'all 0.2s'
                }}
                className="modal-btn-primary-custom"
            >
                Fechar
            </button>
        </div>
    );
};

export default PromptModalFooter;
