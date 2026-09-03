import React, { useState } from 'react';
import { API_URL } from '../../../../../config';

export default function PipelineActionToolbar({
    event,
    webhookId,
    steps,
    metrics,
    onRefresh,
    isAllCollapsed = false,
    onToggleCollapseAll
}) {
    const [retrying, setRetrying] = useState(false);
    const [copied, setCopied] = useState(false);
    const [retryMessage, setRetryMessage] = useState('');
    const [showConfirmModal, setShowConfirmModal] = useState(false);

    const webhookConfigId = event?.webhook_config_id ?? webhookId;

    const handleRetry = async () => {
        if (!event?.id || retrying) return;
        setRetrying(true);
        setRetryMessage('');

        try {
            const baseUrl = API_URL.replace(/\/$/, '');
            const url = webhookConfigId
                ? `${baseUrl}/webhooks/${webhookConfigId}/events/${event.id}/retry`
                : `${baseUrl}/webhooks/events/${event.id}/retry`;

            const res = await fetch(url, { method: 'POST' });
            if (res.ok) {
                setRetryMessage('Reprocessamento iniciado!');
                setShowConfirmModal(false);
                if (onRefresh) onRefresh();
            } else {
                const errData = await res.json().catch(() => ({}));
                setRetryMessage(errData.detail || 'Erro ao reiniciar automação');
            }
        } catch (err) {
            console.error('Erro ao acionar retry:', err);
            setRetryMessage('Erro de conexão ao solicitar reprocessamento');
        } finally {
            setRetrying(false);
            setTimeout(() => setRetryMessage(''), 4000);
        }
    };

    const handleCopyJson = () => {
        const payload = {
            eventId: event?.id,
            status: event?.status,
            createdAt: event?.created_at,
            updatedAt: event?.updated_at,
            metrics: metrics || {},
            agentResponse: event?.agent_response,
            steps: steps.map(s => ({
                id: s.id,
                title: s.title,
                time: s.time,
                duration: s.durationFormatted,
                category: s.category,
                content: s.content,
                metadata: s.metadata,
                diagnostic: s.diagnostic
            }))
        };

        const jsonStr = JSON.stringify(payload, null, 2);
        navigator.clipboard.writeText(jsonStr).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        }).catch(err => {
            console.error('Erro ao copiar JSON:', err);
        });
    };

    const isFailedOrCompleted = ['error', 'completed', 'canceled', 'ignored'].includes(event?.status) || (metrics?.errorCount > 0);

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
            marginBottom: '1rem',
            flexWrap: 'wrap'
        }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {/* Botão de Reprocessar/Reenviar - Abre o popup de confirmação */}
                {isFailedOrCompleted && (
                    <button
                        onClick={() => setShowConfirmModal(true)}
                        disabled={retrying}
                        style={{
                            background: 'rgba(99, 102, 241, 0.12)',
                            border: '1px solid rgba(99, 102, 241, 0.25)',
                            color: '#a5b4fc',
                            padding: '6px 14px',
                            borderRadius: '10px',
                            fontSize: '0.78rem',
                            fontWeight: 800,
                            cursor: retrying ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            transition: 'all 0.2s ease',
                            opacity: retrying ? 0.6 : 1
                        }}
                        title="Executar novamente todo o pipeline da mensagem"
                    >
                        <span style={{ animation: retrying ? 'spin 1s linear infinite' : 'none' }}>
                            🔄
                        </span>
                        <span>{retrying ? 'Reprocessando...' : 'Reenviar / Reprocessar'}</span>
                    </button>
                )}

                {/* Botão de Copiar JSON */}
                <button
                    onClick={handleCopyJson}
                    style={{
                        background: copied ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                        border: `1px solid ${copied ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255, 255, 255, 0.08)'}`,
                        color: copied ? '#34d399' : '#cbd5e1',
                        padding: '6px 14px',
                        borderRadius: '10px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.2s ease'
                    }}
                    title="Copiar rastro completo do pipeline formatado em JSON"
                >
                    <span>{copied ? '✓' : '📋'}</span>
                    <span>{copied ? 'Copiado para Clipboard!' : 'Copiar Pipeline (JSON)'}</span>
                </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {retryMessage && (
                    <span style={{
                        fontSize: '0.75rem',
                        color: retryMessage.includes('Erro') ? '#f87171' : '#34d399',
                        fontWeight: 700
                    }}>
                        {retryMessage}
                    </span>
                )}

                {onToggleCollapseAll && (
                    <button
                        type="button"
                        onClick={onToggleCollapseAll}
                        style={{
                            background: isAllCollapsed ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                            border: isAllCollapsed ? '1px solid rgba(99, 102, 241, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)',
                            color: isAllCollapsed ? '#a5b4fc' : '#94a3b8',
                            padding: '6px 14px',
                            borderRadius: '10px',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            transition: 'all 0.2s ease',
                            whiteSpace: 'nowrap'
                        }}
                        title={isAllCollapsed ? "Expandir todos os cards" : "Recolher todos os cards para visualização compacta"}
                    >
                        <span>{isAllCollapsed ? '↔️' : '↕️'}</span>
                        <span>{isAllCollapsed ? 'Expandir Todos' : 'Recolher Todos'}</span>
                    </button>
                )}
            </div>

            {/* Popup de Confirmação Centralizado com Backdrop */}
            {showConfirmModal && (
                <div 
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.78)',
                        backdropFilter: 'blur(8px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 10000,
                        padding: '1rem'
                    }}
                >
                    <div 
                        style={{
                            background: 'linear-gradient(145deg, #1e293b, #0f172a)',
                            border: '1px solid rgba(99, 102, 241, 0.3)',
                            borderRadius: '20px',
                            padding: '1.75rem',
                            maxWidth: '440px',
                            width: '100%',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 30px rgba(99, 102, 241, 0.15)',
                            position: 'relative'
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
                            <div style={{
                                width: '46px',
                                height: '46px',
                                borderRadius: '14px',
                                background: 'rgba(99, 102, 241, 0.15)',
                                border: '1px solid rgba(99, 102, 241, 0.3)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '1.4rem',
                                color: '#818cf8',
                                flexShrink: 0
                            }}>
                                🔄
                            </div>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#f8fafc' }}>
                                    Confirmar Reprocessamento
                                </h3>
                                <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 500 }}>
                                    Ação do Pipeline da IA
                                </span>
                            </div>
                        </div>

                        <p style={{
                            margin: '0 0 1.5rem 0',
                            fontSize: '0.88rem',
                            color: '#cbd5e1',
                            lineHeight: '1.6'
                        }}>
                            Tem certeza de que deseja <strong>reenviar e reprocessar</strong> esta mensagem? O fluxo completo (Pre-Router, RAG, Ferramentas e IA) será executado novamente do início.
                        </p>

                        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                            <button
                                type="button"
                                onClick={() => !retrying && setShowConfirmModal(false)}
                                disabled={retrying}
                                style={{
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    color: '#94a3b8',
                                    padding: '0.65rem 1.25rem',
                                    borderRadius: '12px',
                                    fontSize: '0.85rem',
                                    fontWeight: 700,
                                    cursor: retrying ? 'not-allowed' : 'pointer',
                                    transition: 'all 0.2s'
                                }}
                            >
                                Cancelar
                            </button>
                            
                            <button
                                type="button"
                                onClick={handleRetry}
                                disabled={retrying}
                                style={{
                                    background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
                                    border: '1px solid rgba(99, 102, 241, 0.4)',
                                    color: '#ffffff',
                                    padding: '0.65rem 1.4rem',
                                    borderRadius: '12px',
                                    fontSize: '0.85rem',
                                    fontWeight: 800,
                                    cursor: retrying ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)',
                                    transition: 'all 0.2s',
                                    opacity: retrying ? 0.7 : 1
                                }}
                            >
                                {retrying ? (
                                    <>
                                        <span style={{ animation: 'spin 1s linear infinite' }}>⚙️</span>
                                        <span>Iniciando...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>🚀</span>
                                        <span>Sim, Reprocessar</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
