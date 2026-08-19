import React, { useState, useEffect } from 'react';
import { api } from '../../../api/client';
import { showToast } from '../utils/helpers';
import '../styles/WebhookManager.css';

const FollowupPipelineModal = ({ lead, webhook, onClose }) => {
    const [pipelineData, setPipelineData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchPipeline = async () => {
        if (!webhook?.id || !lead?.id) return;
        setLoading(true);
        setError(null);
        try {
            const res = await api.get(`/webhooks/${webhook.id}/leads/${lead.id}/followup-pipeline`);
            if (!res.ok) {
                throw new Error(`Erro ao carregar dados da pipeline (${res.status})`);
            }
            const data = await res.json();
            setPipelineData(data);
        } catch (e) {
            console.error('Erro ao buscar pipeline de follow-up:', e);
            setError(e.message || 'Erro ao carregar pipeline de follow-up');
            showToast('Erro ao carregar pipeline de follow-up', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPipeline();
    }, [webhook?.id, lead?.id]);

    // Bloquear scroll ao abrir o modal
    useEffect(() => {
        const originalStyle = window.getComputedStyle(document.body).overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = originalStyle;
        };
    }, []);

    const formatDelay = (minutes) => {
        if (!minutes || minutes <= 0) return 'Imediato';
        if (minutes < 60) return `${minutes} min`;
        if (minutes % 1440 === 0) {
            const days = minutes / 1440;
            return `${days} ${days === 1 ? 'dia' : 'dias'}`;
        }
        const hours = (minutes / 60).toFixed(1).replace('.0', '');
        return `${hours} ${hours === '1' ? 'hora' : 'horas'}`;
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'completed':
                return { label: '✓ Disparado', bg: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '#10b981' };
            case 'active':
                return { label: '⏳ Aguardando Envio', bg: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', border: '#3b82f6' };
            case 'cancelled':
                return { label: '🛑 Cancelado / Pausado', bg: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '#ef4444' };
            case 'disabled':
                return { label: '⚪ Desativado', bg: 'rgba(148, 163, 184, 0.15)', color: '#94a3b8', border: '#64748b' };
            default:
                return { label: '⏸️ Pendente', bg: 'rgba(255, 255, 255, 0.05)', color: '#94a3b8', border: 'rgba(255, 255, 255, 0.1)' };
        }
    };

    const overallStatus = pipelineData?.overall_status || 'pending';
    const steps = pipelineData?.steps || [];
    const leadInfo = pipelineData?.lead || lead;
    const webhookInfo = pipelineData?.webhook || webhook;

    return (
        <div className="premium-modal-overlay animate-fade-in" style={{ zIndex: 10000 }}>
            <div 
                className="premium-modal-content"
                style={{
                    maxWidth: '850px',
                    maxHeight: '90vh',
                    display: 'flex',
                    flexDirection: 'column',
                    background: '#0d1117',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
                    borderRadius: '16px'
                }}
            >
                {/* Header */}
                <div className="modal-header-premium" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.75rem', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                        <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(99, 102, 241, 0.15)', border: '1px solid rgba(99, 102, 241, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem' }}>
                            ⏱️
                        </div>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                <span style={{ fontWeight: 800, fontSize: '1.15rem', color: '#f8fafc' }}>
                                    Pipeline de Follow-Up
                                </span>
                                <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.06)', color: '#94a3b8' }}>
                                    {webhookInfo?.name || 'Webhook'}
                                </span>
                            </div>
                            <div style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: '0.15rem' }}>
                                Contato: <strong style={{ color: '#e2e8f0' }}>{leadInfo?.contato_nome || 'Sem Nome'}</strong> ({leadInfo?.telefone})
                            </div>
                        </div>
                    </div>
                    <button 
                        type="button" 
                        onClick={onClose} 
                        className="modal-close-btn-premium"
                        style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer', padding: '0.5rem' }}
                        title="Fechar"
                    >
                        ✕
                    </button>
                </div>

                {/* Status Bar */}
                <div style={{ padding: '0.85rem 1.75rem', background: 'rgba(255, 255, 255, 0.02)', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Status no Funil:</span>
                        <span style={{
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            padding: '0.25rem 0.7rem',
                            borderRadius: '8px',
                            background: (overallStatus === 'completed' || overallStatus === 'responded') ? 'rgba(16, 185, 129, 0.2)' : overallStatus === 'cancelled' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                            color: (overallStatus === 'completed' || overallStatus === 'responded') ? '#34d399' : overallStatus === 'cancelled' ? '#f87171' : '#60a5fa',
                            border: `1px solid ${(overallStatus === 'completed' || overallStatus === 'responded') ? '#10b981' : overallStatus === 'cancelled' ? '#ef4444' : '#3b82f6'}`
                        }}>
                            {pipelineData?.status_message || 'Carregando status...'}
                        </span>
                    </div>

                    <button
                        type="button"
                        onClick={fetchPipeline}
                        disabled={loading}
                        style={{
                            background: 'rgba(255, 255, 255, 0.04)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            color: '#94a3b8',
                            padding: '0.35rem 0.75rem',
                            borderRadius: '8px',
                            fontSize: '0.78rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem'
                        }}
                    >
                        🔄 Atualizar
                    </button>
                </div>

                {/* Body Content */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '1.75rem' }}>
                    {loading && (
                        <div style={{ textAlign: 'center', padding: '3rem 0', color: '#94a3b8' }}>
                            <div className="spinner" style={{ margin: '0 auto 1rem', width: '32px', height: '32px' }}></div>
                            <p>Carregando linha do tempo de follow-up...</p>
                        </div>
                    )}

                    {error && !loading && (
                        <div style={{ padding: '1.25rem', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#f87171', textAlign: 'center' }}>
                            ⚠️ {error}
                        </div>
                    )}

                    {!loading && !error && steps.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#94a3b8' }}>
                            <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '0.75rem' }}>📭</span>
                            <h4 style={{ color: '#f1f5f9', margin: '0 0 0.5rem' }}>Nenhum Passo de Follow-Up Configurado</h4>
                            <p style={{ fontSize: '0.85rem', maxWidth: '400px', margin: '0 auto' }}>
                                Para ativar disparos automáticos, configure os passos na aba "Follow-Up" ao editar esta integração.
                            </p>
                        </div>
                    )}

                    {!loading && !error && steps.length > 0 && (
                        <div className="pipeline-timeline" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'relative' }}>
                            {steps.map((step, index) => {
                                const badge = getStatusBadge(step.status);
                                const isCurrent = step.status === 'active';
                                const isDone = step.status === 'completed';

                                return (
                                    <div 
                                        key={index}
                                        style={{
                                            display: 'flex',
                                            gap: '1.25rem',
                                            position: 'relative'
                                        }}
                                    >
                                        {/* Linha vertical conectora */}
                                        {index < steps.length - 1 && (
                                            <div 
                                                style={{
                                                    position: 'absolute',
                                                    left: '19px',
                                                    top: '40px',
                                                    bottom: '-25px',
                                                    width: '2px',
                                                    background: isDone ? '#10b981' : 'rgba(255, 255, 255, 0.1)',
                                                    zIndex: 1
                                                }}
                                            />
                                        )}

                                        {/* Node Icon */}
                                        <div 
                                            style={{
                                                width: '40px',
                                                height: '40px',
                                                borderRadius: '50%',
                                                background: isDone ? '#10b981' : isCurrent ? '#3b82f6' : 'rgba(255, 255, 255, 0.05)',
                                                border: `2px solid ${isDone ? '#34d399' : isCurrent ? '#60a5fa' : 'rgba(255, 255, 255, 0.1)'}`,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '1rem',
                                                fontWeight: 800,
                                                color: '#fff',
                                                zIndex: 2,
                                                boxShadow: isCurrent ? '0 0 15px rgba(59, 130, 246, 0.5)' : isDone ? '0 0 10px rgba(16, 185, 129, 0.3)' : 'none',
                                                flexShrink: 0
                                            }}
                                        >
                                            {isDone ? '✓' : step.step_number}
                                        </div>

                                        {/* Card do Step */}
                                        <div 
                                            style={{
                                                flex: 1,
                                                background: isCurrent ? 'rgba(59, 130, 246, 0.06)' : 'rgba(255, 255, 255, 0.02)',
                                                border: isCurrent ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid rgba(255, 255, 255, 0.06)',
                                                borderRadius: '12px',
                                                padding: '1.25rem',
                                                boxShadow: isCurrent ? '0 4px 20px rgba(59, 130, 246, 0.08)' : 'none'
                                            }}
                                        >
                                            {/* Cabeçalho do Card */}
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                                    <span style={{ fontWeight: 700, color: '#f8fafc', fontSize: '0.95rem' }}>
                                                        Passo {step.step_number}: {formatDelay(step.delay_minutes)}
                                                    </span>
                                                    <span style={{
                                                        fontSize: '0.7rem',
                                                        padding: '0.15rem 0.5rem',
                                                        borderRadius: '6px',
                                                        background: 'rgba(255, 255, 255, 0.06)',
                                                        color: '#cbd5e1'
                                                    }}>
                                                        {step.type === 'ai' ? '🤖 IA Contextual' : step.type === 'fixed' ? '📝 Mensagem Fixa' : step.type === 'whatsapp_template' ? '📱 Template WhatsApp' : '🎙️ Áudio/Mídia'}
                                                    </span>
                                                </div>

                                                <span style={{
                                                    fontSize: '0.75rem',
                                                    fontWeight: 700,
                                                    padding: '0.2rem 0.6rem',
                                                    borderRadius: '6px',
                                                    background: badge.bg,
                                                    color: badge.color,
                                                    border: `1px solid ${badge.border}`
                                                }}>
                                                    {badge.label}
                                                </span>
                                            </div>

                                            {/* Conteúdo / Instrução do Step */}
                                            <div style={{ fontSize: '0.82rem', color: '#94a3b8', marginBottom: '0.75rem' }}>
                                                {step.type === 'ai' && (
                                                    <div>
                                                        <span style={{ color: '#64748b' }}>Prompt: </span>
                                                        <span style={{ color: '#cbd5e1' }}>{step.custom_prompt || 'Gerar continuação inteligente de conversa.'}</span>
                                                    </div>
                                                )}
                                                {step.type === 'fixed' && (
                                                    <div>
                                                        <span style={{ color: '#64748b' }}>Texto: </span>
                                                        <span style={{ color: '#cbd5e1' }}>{step.fixed_message || '(Mensagem fixa em branco)'}</span>
                                                    </div>
                                                )}
                                                {step.type === 'whatsapp_template' && (
                                                    <div>
                                                        <span style={{ color: '#64748b' }}>Template Oficial: </span>
                                                        <span style={{ color: '#34d399', fontWeight: 600 }}>{step.template_name || '(Não selecionado)'}</span>
                                                        {step.language && <span style={{ color: '#94a3b8', fontSize: '0.75rem', marginLeft: '0.4rem' }}>({step.language})</span>}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Evento disparado (se houver) */}
                                            {step.dispatched_event && (
                                                <div style={{
                                                    marginTop: '0.75rem',
                                                    padding: '0.75rem 1rem',
                                                    background: 'rgba(16, 185, 129, 0.08)',
                                                    border: '1px solid rgba(16, 185, 129, 0.2)',
                                                    borderRadius: '8px'
                                                }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#34d399', marginBottom: '0.35rem' }}>
                                                        <span>🚀 Disparado com Sucesso</span>
                                                        <span>{new Date(step.dispatched_event.created_at).toLocaleString('pt-BR')}</span>
                                                    </div>
                                                    {step.dispatched_event.agent_response && (
                                                        <div style={{ fontSize: '0.82rem', color: '#e2e8f0', background: 'rgba(0, 0, 0, 0.2)', padding: '0.5rem 0.75rem', borderRadius: '6px' }}>
                                                            "{step.dispatched_event.agent_response}"
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Informação se este é o passo atual ativo */}
                                            {isCurrent && (
                                                <div style={{
                                                    marginTop: '0.75rem',
                                                    padding: '0.6rem 0.85rem',
                                                    background: 'rgba(59, 130, 246, 0.1)',
                                                    border: '1px solid rgba(59, 130, 246, 0.25)',
                                                    borderRadius: '8px',
                                                    fontSize: '0.78rem',
                                                    color: '#93c5fd',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.5rem'
                                                }}>
                                                    <span>⏳</span>
                                                    <span>Este contato está atualmente nesta etapa. O sistema efetuará o disparo quando o tempo de inatividade ({formatDelay(step.delay_minutes)}) for atingido dentro do horário permitido.</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div style={{ padding: '1.25rem 1.75rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', justifyContent: 'flex-end', background: '#0a0d14' }}>
                    <button 
                        type="button" 
                        onClick={onClose} 
                        className="btn-action-edit"
                        style={{ padding: '0.6rem 1.5rem', borderRadius: '8px', cursor: 'pointer' }}
                    >
                        Fechar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FollowupPipelineModal;
