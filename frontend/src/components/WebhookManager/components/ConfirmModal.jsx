import React from 'react';

const ConfirmModal = ({ 
    type, 
    isOpen, 
    onClose, 
    onConfirm, 
    isBulk = false, 
    name = '', 
    phone = '', 
    id = '', 
    isDeleting = false 
}) => {
    if (!isOpen) return null;

    let icon = '⚠️';
    let title = 'Confirmar Exclusão';
    let text = '';
    let confirmBtnText = 'Sim, Excluir';
    let iconBg = 'rgba(239, 68, 68, 0.1)';
    let iconBorder = 'rgba(239, 68, 68, 0.3)';

    if (type === 'webhook') {
        text = isBulk 
            ? `Tem certeza que deseja excluir permanentemente as ${name} selecionadas?`
            : `Tem certeza que deseja excluir permanentemente a integração "${name}"?`;
    } else if (type === 'cw-webhook') {
        title = 'Excluir Webhook ZapVoice / WhatsApp';
        text = 'Tem certeza que deseja deletar este webhook do ZapVoice / WhatsApp?';
        confirmBtnText = 'Sim, Excluir';
    } else if (type === 'followup') {
        icon = '🗑️';
        title = 'Remover Passo';
        text = 'Tem certeza que deseja remover este passo do follow-up?';
        confirmBtnText = 'Sim, Remover';
    } else if (type === 'lead') {
        text = isBulk
            ? `Tem certeza que deseja excluir permanentemente os ${name} contatos selecionados?`
            : `Tem certeza que deseja excluir o contato ${phone}?`;
        confirmBtnText = isDeleting ? 'Excluindo...' : 'Sim, Excluir';
    } else if (type === 'event') {
        title = 'Excluir Mensagem';
        text = isBulk
            ? `Tem certeza que deseja excluir permanentemente os ${name} eventos selecionados?`
            : `Tem certeza que deseja excluir permanentemente a mensagem #${id}?`;
    }

    return (
        <div className="premium-modal-overlay" style={type === 'event' ? { zIndex: 1020 } : undefined}>
            <div className="premium-modal-content compact" style={type === 'followup' ? { maxWidth: '380px' } : type === 'lead' ? { maxWidth: '420px' } : undefined} onClick={e => e.stopPropagation()}>
                <div className="modal-header-premium">
                    <div className="header-info">
                        <span className="header-icon" style={{ background: iconBg, borderColor: iconBorder }}>{icon}</span>
                        <span className="header-title">{title}</span>
                    </div>
                </div>
                <div style={{ padding: '2.5rem 2rem', textAlign: 'center' }}>
                    <p style={{ color: 'var(--wh-text-secondary)', marginBottom: '2rem', fontSize: type === 'followup' ? '1rem' : '1.05rem', lineHeight: '1.6' }}>
                        {type === 'lead' && !isBulk ? (
                            <>Tem certeza que deseja excluir o contato <strong>{phone}</strong>?</>
                        ) : type === 'event' && !isBulk ? (
                            <>Tem certeza que deseja excluir permanentemente a mensagem <strong>#{id}</strong>?</>
                        ) : text}
                        {type !== 'followup' && (
                            <>
                                <br/>
                                <span style={{ opacity: 0.7, fontSize: '0.9rem' }}>
                                    {type === 'lead' ? 'Esta ação é permanente e removerá todo o histórico.' : 'Esta ação não pode ser desfeita.'}
                                </span>
                            </>
                        )}
                    </p>
                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                        <button 
                            onClick={onClose} 
                            className="btn-action-edit"
                            style={{ padding: type === 'followup' ? '0.8rem' : '0.8rem 2rem', borderRadius: '14px', flex: type === 'followup' || type === 'lead' ? 1 : undefined }}
                        >
                            {type === 'followup' ? 'Não, Manter' : 'Cancelar'}
                        </button>
                        <button 
                            onClick={onConfirm}
                            disabled={isDeleting}
                            className={type === 'followup' || type === 'lead' || type === 'event' ? 'btn-action-delete' : 'btn-new-webhook'} 
                            style={{ 
                                background: '#ef4444', 
                                borderColor: '#ef4444', 
                                padding: type === 'followup' ? '0.8rem' : type === 'lead' || type === 'event' ? '0.8rem' : '0.8rem 2rem', 
                                borderRadius: '14px', 
                                boxShadow: '0 8px 20px rgba(239, 68, 68, 0.2)',
                                flex: type === 'followup' || type === 'lead' || type === 'event' ? 1 : undefined,
                                color: '#fff',
                                border: type === 'followup' || type === 'lead' || type === 'event' ? 'none' : undefined,
                                fontWeight: type === 'followup' || type === 'lead' || type === 'event' ? 600 : undefined,
                                cursor: isDeleting ? 'not-allowed' : 'pointer',
                                opacity: isDeleting ? 0.7 : 1,
                                display: type === 'lead' && isDeleting ? 'flex' : undefined,
                                alignItems: type === 'lead' && isDeleting ? 'center' : undefined,
                                justifyContent: type === 'lead' && isDeleting ? 'center' : undefined,
                                gap: type === 'lead' && isDeleting ? '8px' : undefined
                            }}
                        >
                            {type === 'lead' && isDeleting ? (
                                <>
                                    <span className="spinner-small" style={{ width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></span>
                                    Excluindo...
                                </>
                            ) : confirmBtnText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;
