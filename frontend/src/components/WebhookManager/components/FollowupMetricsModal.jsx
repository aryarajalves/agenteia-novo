import React, { useState, useEffect } from 'react';
import { api } from '../../../api/client';
import { showToast } from '../utils/helpers';

const FollowupMetricsModal = ({ webhookId, onClose }) => {
    const [loading, setLoading] = useState(true);
    const [metrics, setMetrics] = useState(null);

    const fetchMetrics = async () => {
        if (!webhookId) return;
        setLoading(true);
        try {
            const res = await api.get(`/webhooks/${webhookId}/followup-metrics`);
            if (res.ok) {
                const data = await res.json();
                setMetrics(data);
            } else {
                showToast('Erro ao carregar métricas de follow-up', 'error');
            }
        } catch (err) {
            console.error('Falha ao buscar métricas de follow-up:', err);
            showToast('Não foi possível carregar as métricas', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMetrics();
    }, [webhookId]);

    const totalDispatches = metrics?.total_dispatches ?? 0;
    const totalReplies = metrics?.total_replies ?? 0;
    const overallRate = metrics?.overall_reply_rate ?? 0;
    const steps = metrics?.steps ?? [];
    const abTests = metrics?.ab_tests ?? [];

    return (
        <div
            data-testid="followup-metrics-backdrop"
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0, 0, 0, 0.85)',
                backdropFilter: 'blur(8px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 99999,
                padding: '1.5rem'
            }}
        >
            <div
                data-testid="followup-metrics-container"
                onClick={(e) => e.stopPropagation()}
                style={{
                    background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
                    border: '1px solid rgba(99, 102, 241, 0.3)',
                    borderRadius: '20px',
                    width: '100%',
                    maxWidth: '750px',
                    maxHeight: '90vh',
                    overflowY: 'auto',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 30px rgba(99, 102, 241, 0.15)',
                    display: 'flex',
                    flexDirection: 'column'
                }}
            >
                {/* CABEÇALHO */}
                <div style={{
                    padding: '1.25rem 1.5rem',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'rgba(255, 255, 255, 0.02)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '10px',
                            background: 'rgba(99, 102, 241, 0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1.2rem',
                            border: '1px solid rgba(99, 102, 241, 0.4)'
                        }}>
                            📊
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc' }}>
                                Métricas de Conversão do Follow-Up
                            </h3>
                            <p style={{ margin: 0, fontSize: '0.78rem', color: '#94a3b8' }}>
                                Acompanhe disparos, taxas de resposta dos leads e testes A/B em tempo real
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        data-testid="close-metrics-btn"
                        onClick={onClose}
                        style={{
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '8px',
                            color: '#94a3b8',
                            padding: '6px 12px',
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        Fechar ✕
                    </button>
                </div>

                {/* CORPO */}
                <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {loading ? (
                        <div style={{ padding: '3rem 0', textAlign: 'center', color: '#94a3b8' }}>
                            <div className="spinner" style={{ margin: '0 auto 12px auto' }} />
                            <p style={{ margin: 0, fontSize: '0.88rem' }}>Carregando dados estatísticos...</p>
                        </div>
                    ) : (
                        <>
                            {/* KPI CARDS */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                                <div style={{
                                    background: 'rgba(255, 255, 255, 0.03)',
                                    border: '1px solid rgba(255, 255, 255, 0.08)',
                                    borderRadius: '12px',
                                    padding: '1rem',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '6px'
                                }}>
                                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>Total de Disparos</span>
                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                                        <span style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f8fafc' }}>{totalDispatches}</span>
                                        <span style={{ fontSize: '0.8rem', color: '#6366f1' }}>🚀 envios</span>
                                    </div>
                                </div>

                                <div style={{
                                    background: 'rgba(255, 255, 255, 0.03)',
                                    border: '1px solid rgba(255, 255, 255, 0.08)',
                                    borderRadius: '12px',
                                    padding: '1rem',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '6px'
                                }}>
                                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>Leads Respondidos</span>
                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                                        <span style={{ fontSize: '1.6rem', fontWeight: 800, color: '#10b981' }}>{totalReplies}</span>
                                        <span style={{ fontSize: '0.8rem', color: '#10b981' }}>💬 respostas</span>
                                    </div>
                                </div>

                                <div style={{
                                    background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(168, 85, 247, 0.15) 100%)',
                                    border: '1px solid rgba(99, 102, 241, 0.3)',
                                    borderRadius: '12px',
                                    padding: '1rem',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '6px'
                                }}>
                                    <span style={{ fontSize: '0.75rem', color: '#a5b4fc', fontWeight: 600 }}>Taxa Média de Resposta</span>
                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                                        <span style={{ fontSize: '1.6rem', fontWeight: 800, color: '#a5b4fc' }}>{overallRate}%</span>
                                        <span style={{ fontSize: '0.8rem', color: '#c084fc' }}>📈 geral</span>
                                    </div>
                                </div>
                            </div>

                            {/* TAXA DE CONVERSÃO POR PASSO */}
                            <div style={{
                                background: 'rgba(15, 23, 42, 0.6)',
                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                borderRadius: '14px',
                                padding: '1.25rem'
                            }}>
                                <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.88rem', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span>🎯</span> Conversão por Passo da Esteira
                                </h4>

                                {steps.length === 0 ? (
                                    <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b', textAlign: 'center', padding: '1rem 0' }}>
                                        Nenhum disparo de follow-up registrado para este webhook ainda.
                                    </p>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        {steps.map((st) => (
                                            <div key={st.step_order} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                                                    <span style={{ color: '#e2e8f0', fontWeight: 600 }}>Passo #{st.step_order}</span>
                                                    <span style={{ color: '#94a3b8' }}>
                                                        {st.replies} de {st.dispatches} responderam ({st.reply_rate}%)
                                                    </span>
                                                </div>
                                                <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                                                    <div style={{
                                                        width: `${Math.min(st.reply_rate, 100)}%`,
                                                        height: '100%',
                                                        background: 'linear-gradient(90deg, #6366f1, #10b981)',
                                                        borderRadius: '4px',
                                                        transition: 'width 0.4s ease'
                                                    }} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* COMPARATIVO TESTE A/B */}
                            {abTests.length > 0 && (
                                <div style={{
                                    background: 'rgba(15, 23, 42, 0.6)',
                                    border: '1px solid rgba(255, 255, 255, 0.08)',
                                    borderRadius: '14px',
                                    padding: '1.25rem'
                                }}>
                                    <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.88rem', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span>🧪</span> Desempenho dos Testes A/B
                                    </h4>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                        {abTests.map((ab) => {
                                            const isAWinner = ab.variation_a.reply_rate > ab.variation_b.reply_rate;
                                            const isBWinner = ab.variation_b.reply_rate > ab.variation_a.reply_rate;
                                            return (
                                                <div key={ab.step_order} style={{
                                                    background: 'rgba(255, 255, 255, 0.02)',
                                                    border: '1px solid rgba(255, 255, 255, 0.05)',
                                                    borderRadius: '10px',
                                                    padding: '10px 14px'
                                                }}>
                                                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#e2e8f0', marginBottom: '8px' }}>
                                                        Passo #{ab.step_order}
                                                    </div>
                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                                        <div style={{
                                                            border: isAWinner ? '1px solid #10b981' : '1px solid rgba(255,255,255,0.06)',
                                                            borderRadius: '8px',
                                                            padding: '8px 10px',
                                                            background: isAWinner ? 'rgba(16, 185, 129, 0.08)' : 'transparent'
                                                        }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#38bdf8' }}>Variação A</span>
                                                                {isAWinner && <span style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 700 }}>🏆 Vencedora</span>}
                                                            </div>
                                                            <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#f8fafc', marginTop: '4px' }}>
                                                                {ab.variation_a.reply_rate}%
                                                            </div>
                                                            <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                                                                {ab.variation_a.replies} resp / {ab.variation_a.dispatches} envios
                                                            </div>
                                                        </div>

                                                        <div style={{
                                                            border: isBWinner ? '1px solid #10b981' : '1px solid rgba(255,255,255,0.06)',
                                                            borderRadius: '8px',
                                                            padding: '8px 10px',
                                                            background: isBWinner ? 'rgba(16, 185, 129, 0.08)' : 'transparent'
                                                        }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#ec4899' }}>Variação B</span>
                                                                {isBWinner && <span style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 700 }}>🏆 Vencedora</span>}
                                                            </div>
                                                            <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#f8fafc', marginTop: '4px' }}>
                                                                {ab.variation_b.reply_rate}%
                                                            </div>
                                                            <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                                                                {ab.variation_b.replies} resp / {ab.variation_b.dispatches} envios
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* RODAPÉ */}
                <div style={{
                    padding: '1rem 1.5rem',
                    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'rgba(255, 255, 255, 0.02)'
                }}>
                    <button
                        type="button"
                        onClick={fetchMetrics}
                        disabled={loading}
                        style={{
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '8px',
                            color: '#94a3b8',
                            padding: '6px 14px',
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}
                    >
                        🔄 Atualizar Dados
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        style={{
                            background: '#6366f1',
                            border: 'none',
                            borderRadius: '8px',
                            color: '#ffffff',
                            padding: '7px 20px',
                            fontSize: '0.84rem',
                            fontWeight: 700,
                            cursor: 'pointer'
                        }}
                    >
                        Concluído
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FollowupMetricsModal;
