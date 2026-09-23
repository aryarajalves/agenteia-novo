import React from 'react';

const ImportChatActions = ({
    isRunning,
    onCancel,
    onRequestCancel,
    isCancelling,
    onClose,
    error,
    done
}) => {
    const mainButtonBg = error
        ? 'rgba(239, 68, 68, 0.2)'
        : done
            ? 'linear-gradient(135deg, #10b981, #059669)'
            : 'rgba(255, 255, 255, 0.08)';

    const mainButtonBorder = error
        ? 'rgba(239, 68, 68, 0.4)'
        : done
            ? 'rgba(16, 185, 129, 0.4)'
            : 'rgba(255, 255, 255, 0.15)';

    const mainButtonLabel = error
        ? 'Fechar'
        : done
            ? '✅ Concluir'
            : isRunning
                ? 'Ocultar em Segundo Plano'
                : 'Fechar';

    return (
        <div style={{
            display: 'flex',
            justifyContent: isRunning ? 'space-between' : 'flex-end',
            alignItems: 'center',
            marginTop: '0.5rem',
            gap: '10px'
        }}>
            {isRunning && onCancel && (
                <button
                    type="button"
                    onClick={onRequestCancel}
                    disabled={isCancelling}
                    style={{
                        padding: '0.55rem 1.2rem',
                        borderRadius: '8px',
                        background: 'rgba(239, 68, 68, 0.15)',
                        border: '1px solid rgba(239, 68, 68, 0.35)',
                        color: '#fca5a5',
                        fontWeight: 700,
                        fontSize: '0.82rem',
                        cursor: isCancelling ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                    }}
                >
                    {isCancelling ? '⏳ Cancelando...' : '🛑 Cancelar Importação'}
                </button>
            )}

            <button
                type="button"
                onClick={onClose}
                style={{
                    padding: '0.55rem 1.4rem',
                    borderRadius: '8px',
                    background: mainButtonBg,
                    border: `1px solid ${mainButtonBorder}`,
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                }}
            >
                {mainButtonLabel}
            </button>
        </div>
    );
};

export default ImportChatActions;
