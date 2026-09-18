import React, { useState, useEffect } from 'react';

const formatDuration = (totalSec) => {
    const s = Math.max(0, Math.floor(totalSec || 0));
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    if (mins >= 60) {
        const hrs = Math.floor(mins / 60);
        const remMins = mins % 60;
        return `${String(hrs).padStart(2, '0')}:${String(remMins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

const ImportChatProgressModal = ({
    isOpen,
    onClose,
    onCancel,
    isCancelling = false,
    progress = {}
}) => {
    const [showConfirmCancel, setShowConfirmCancel] = useState(false);
    const [timerSec, setTimerSec] = useState(progress?.elapsedSeconds || 0);

    const {
        current = 0,
        total = 0,
        percentage = 0,
        status = 'Iniciando importação...',
        createdLeads = 0,
        importedMessages = 0,
        currentContact = '',
        startedAt = null,
        elapsedSeconds = 0,
        done = false,
        cancelled = false,
        error = null
    } = progress || {};

    const isRunning = !done && !cancelled && !error;

    useEffect(() => {
        if (elapsedSeconds !== undefined && elapsedSeconds !== null) {
            setTimerSec(elapsedSeconds);
        }
    }, [elapsedSeconds]);

    useEffect(() => {
        if (!isRunning) return;
        const interval = setInterval(() => {
            if (startedAt) {
                const now = Date.now() / 1000;
                setTimerSec(Math.max(0, Math.floor(now - startedAt)));
            } else {
                setTimerSec(prev => prev + 1);
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [isRunning, startedAt]);

    if (!isOpen) return null;

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
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '12px',
                        background: error
                            ? 'rgba(239, 68, 68, 0.15)'
                            : cancelled
                                ? 'rgba(245, 158, 11, 0.15)'
                                : done
                                    ? 'rgba(16, 185, 129, 0.15)'
                                    : 'rgba(99, 102, 241, 0.15)',
                        border: `1px solid ${error ? 'rgba(239, 68, 68, 0.3)' : cancelled ? 'rgba(245, 158, 11, 0.3)' : done ? 'rgba(16, 185, 129, 0.3)' : 'rgba(99, 102, 241, 0.3)'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.4rem'
                    }}>
                        {error ? '⚠️' : cancelled ? '🛑' : done ? '✅' : '📥'}
                    </div>
                    <div style={{ flex: 1 }}>
                        <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#fff' }}>
                            {error ? 'Erro na Importação' : cancelled ? 'Importação Cancelada' : done ? 'Importação Concluída!' : 'Importando do ZapJords'}
                        </h3>
                        <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: error ? '#fca5a5' : cancelled ? '#fcd34d' : '#94a3b8' }}>
                            {error
                                ? 'Ocorreu uma falha durante o processo'
                                : cancelled
                                    ? 'Processo interrompido. Contatos já importados foram preservados.'
                                    : done
                                        ? 'Todos os contatos e memórias foram ingeridos'
                                        : 'Sincronizando conversas e mensagens sem custo de IA'}
                        </p>
                    </div>
                </div>

                {/* Barra de Progresso */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem' }}>
                        <span style={{ color: '#cbd5e1', fontWeight: 600 }}>
                            {total > 0 ? `Conversa ${current} de ${total}` : 'Carregando...'}
                        </span>
                        <span style={{
                            color: cancelled ? '#fbbf24' : done ? '#34d399' : '#818cf8',
                            fontWeight: 800,
                            fontSize: '0.9rem'
                        }}>
                            {percentage}%
                        </span>
                    </div>
                    <div style={{
                        width: '100%',
                        height: '10px',
                        backgroundColor: 'rgba(255, 255, 255, 0.08)',
                        borderRadius: '6px',
                        overflow: 'hidden',
                        position: 'relative'
                    }}>
                        <div style={{
                            width: `${Math.min(Math.max(percentage, 0), 100)}%`,
                            height: '100%',
                            background: error
                                ? 'linear-gradient(90deg, #ef4444, #f87171)'
                                : cancelled
                                    ? 'linear-gradient(90deg, #f59e0b, #fbbf24)'
                                    : done
                                        ? 'linear-gradient(90deg, #10b981, #34d399)'
                                        : 'linear-gradient(90deg, #6366f1, #818cf8)',
                            borderRadius: '6px',
                            transition: 'width 0.3s ease',
                            boxShadow: error
                                ? '0 0 10px rgba(239, 68, 68, 0.5)'
                                : cancelled
                                    ? '0 0 10px rgba(245, 158, 11, 0.5)'
                                    : done
                                        ? '0 0 10px rgba(16, 185, 129, 0.5)'
                                        : '0 0 10px rgba(99, 102, 241, 0.5)'
                        }} />
                    </div>
                </div>

                {/* Status Dinâmico */}
                <div style={{
                    padding: '0.75rem 1rem',
                    background: 'rgba(0, 0, 0, 0.25)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    borderRadius: '8px',
                    fontSize: '0.82rem',
                    color: error ? '#fca5a5' : '#cbd5e1',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                }}>
                    {isRunning && (
                        <span style={{
                            display: 'inline-block',
                            animation: 'spin 1.2s linear infinite',
                            fontSize: '0.9rem'
                        }}>
                            ⚡
                        </span>
                    )}
                    <span style={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        flex: 1
                    }}>
                        {error || status}
                    </span>
                </div>

                {/* Contadores em Destaque */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.65rem' }}>
                    <div style={{
                        background: 'rgba(99, 102, 241, 0.08)',
                        border: '1px solid rgba(99, 102, 241, 0.2)',
                        borderRadius: '10px',
                        padding: '0.65rem 0.4rem',
                        textAlign: 'center'
                    }}>
                        <div style={{ fontSize: '0.68rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.03em', fontWeight: 600 }}>
                            Contatos Criados
                        </div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#a5b4fc', marginTop: '2px' }}>
                            +{createdLeads}
                        </div>
                    </div>
                    <div style={{
                        background: 'rgba(16, 185, 129, 0.08)',
                        border: '1px solid rgba(16, 185, 129, 0.2)',
                        borderRadius: '10px',
                        padding: '0.65rem 0.4rem',
                        textAlign: 'center'
                    }}>
                        <div style={{ fontSize: '0.68rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.03em', fontWeight: 600 }}>
                            Mensagens Ingeridas
                        </div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#6ee7b7', marginTop: '2px' }}>
                            +{importedMessages}
                        </div>
                    </div>
                    <div style={{
                        background: done
                            ? 'rgba(16, 185, 129, 0.08)'
                            : cancelled
                                ? 'rgba(245, 158, 11, 0.08)'
                                : 'rgba(59, 130, 246, 0.08)',
                        border: `1px solid ${done ? 'rgba(16, 185, 129, 0.25)' : cancelled ? 'rgba(245, 158, 11, 0.25)' : 'rgba(59, 130, 246, 0.25)'}`,
                        borderRadius: '10px',
                        padding: '0.65rem 0.4rem',
                        textAlign: 'center'
                    }}>
                        <div style={{ fontSize: '0.68rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.03em', fontWeight: 600 }}>
                            {isRunning ? 'Tempo Decorrido' : 'Tempo Total'}
                        </div>
                        <div style={{
                            fontSize: '1.2rem',
                            fontWeight: 800,
                            color: done ? '#6ee7b7' : cancelled ? '#fcd34d' : '#93c5fd',
                            marginTop: '2px',
                            fontVariantNumeric: 'tabular-nums'
                        }}>
                            ⏱️ {formatDuration(timerSec)}
                        </div>
                    </div>
                </div>

                {/* Ações do Rodapé */}
                <div style={{ display: 'flex', justifyContent: isRunning ? 'space-between' : 'flex-end', alignItems: 'center', marginTop: '0.5rem', gap: '10px' }}>
                    {isRunning && onCancel && (
                        <button
                            type="button"
                            onClick={() => setShowConfirmCancel(true)}
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
                            background: error
                                ? 'rgba(239, 68, 68, 0.2)'
                                : done
                                    ? 'linear-gradient(135deg, #10b981, #059669)'
                                    : 'rgba(255, 255, 255, 0.08)',
                            border: `1px solid ${error ? 'rgba(239, 68, 68, 0.4)' : done ? 'rgba(16, 185, 129, 0.4)' : 'rgba(255, 255, 255, 0.15)'}`,
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
                        {error ? 'Fechar' : done ? '✅ Concluir' : isRunning ? 'Ocultar em Segundo Plano' : 'Fechar'}
                    </button>
                </div>
            </div>
        </div>

            {/* Popup de Confirmação de Cancelamento com Fundo 100% Preto Sólido */}
            {showConfirmCancel && (
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
                                onClick={() => setShowConfirmCancel(false)}
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
                                onClick={async () => {
                                    setShowConfirmCancel(false);
                                    if (onCancel) await onCancel();
                                }}
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
            )}
        </>
    );
};

export default ImportChatProgressModal;
