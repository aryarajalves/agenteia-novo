import React from 'react';
import {
    useImportChatProgress,
    ImportChatHeader,
    ImportChatProgressBar,
    ImportChatStatusBox,
    ImportChatCounters,
    ImportChatActions,
    ImportChatCancelModal
} from './ImportChatProgressModal/index';

const ImportChatProgressModal = ({
    isOpen,
    onClose,
    onCancel,
    isCancelling = false,
    progress = {}
}) => {
    const {
        showConfirmCancel,
        timerSec,
        isRunning,
        openConfirmCancel,
        closeConfirmCancel
    } = useImportChatProgress(progress);

    if (!isOpen) return null;

    const {
        current = 0,
        total = 0,
        percentage = 0,
        status = 'Iniciando importação...',
        createdLeads = 0,
        importedMessages = 0,
        done = false,
        cancelled = false,
        error = null
    } = progress || {};

    return (
        <>
            <div
                className="premium-modal-overlay"
                style={{
                    zIndex: 9999,
                    visibility: showConfirmCancel ? 'hidden' : 'visible'
                }}
            >
                <div
                    className="premium-modal-content"
                    style={{
                        maxWidth: '560px',
                        width: '90%',
                        padding: '1.8rem',
                        background: 'rgba(15, 23, 42, 0.95)',
                        backdropFilter: 'blur(16px)',
                        border: `1px solid ${cancelled ? 'rgba(245, 158, 11, 0.3)' : 'rgba(99, 102, 241, 0.3)'}`,
                        borderRadius: '16px',
                        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6), 0 0 30px rgba(99, 102, 241, 0.15)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1.2rem',
                        color: '#f8fafc',
                        position: 'relative'
                    }}
                    onClick={e => e.stopPropagation()}
                >
                    {/* Cabeçalho */}
                    <ImportChatHeader
                        error={error}
                        cancelled={cancelled}
                        done={done}
                    />

                    {/* Barra de Progresso */}
                    <ImportChatProgressBar
                        current={current}
                        total={total}
                        percentage={percentage}
                        error={error}
                        cancelled={cancelled}
                        done={done}
                    />

                    {/* Status Dinâmico */}
                    <ImportChatStatusBox
                        isRunning={isRunning}
                        error={error}
                        status={status}
                    />

                    {/* Contadores em Destaque */}
                    <ImportChatCounters
                        createdLeads={createdLeads}
                        importedMessages={importedMessages}
                        done={done}
                        cancelled={cancelled}
                        isRunning={isRunning}
                        timerSec={timerSec}
                    />

                    {/* Ações do Rodapé */}
                    <ImportChatActions
                        isRunning={isRunning}
                        onCancel={onCancel}
                        onRequestCancel={openConfirmCancel}
                        isCancelling={isCancelling}
                        onClose={onClose}
                        error={error}
                        done={done}
                    />
                </div>
            </div>

            {/* Popup de Confirmação de Cancelamento */}
            <ImportChatCancelModal
                isOpen={showConfirmCancel}
                onClose={closeConfirmCancel}
                onConfirm={onCancel}
                isCancelling={isCancelling}
            />
        </>
    );
};

export default ImportChatProgressModal;
