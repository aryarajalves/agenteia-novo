import React, { useState } from 'react';
import { api } from '../../../../../api/client';
import { showToast } from '../../../utils/helpers';

export default function PipelineStepReasoning({ step, eventId }) {
    const initialReasoning = step?.metadata?.reasoning || null;
    const [reasoningData, setReasoningData] = useState(initialReasoning);
    const [isExpanded, setIsExpanded] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleFetchReasoning = async (e) => {
        if (e) e.stopPropagation();
        if (!eventId) {
            showToast('ID do evento não disponível para análise.', 'error');
            return;
        }

        setLoading(true);
        try {
            const res = await api.post(`/webhooks/events/${eventId}/explain-response`);
            const data = await res.json();
            setReasoningData(data);
            setIsExpanded(true);
            showToast('Diagnóstico da resposta gerado com sucesso!', 'success');
        } catch (err) {
            console.error('Erro ao buscar raciocínio da resposta:', err);
            showToast('Não foi possível gerar a explicação desta resposta.', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div data-testid="pipeline-step-reasoning" style={{ marginTop: '1rem' }}>
            {/* Botão de Ação / Toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <button
                    type="button"
                    data-testid="explain-response-btn"
                    onClick={reasoningData ? () => setIsExpanded(!isExpanded) : handleFetchReasoning}
                    disabled={loading}
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: isExpanded ? 'rgba(99, 102, 241, 0.2)' : 'rgba(99, 102, 241, 0.1)',
                        border: '1px solid rgba(99, 102, 241, 0.35)',
                        color: '#c7d2fe',
                        padding: '6px 14px',
                        borderRadius: '8px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: loading ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s ease',
                        boxShadow: '0 2px 8px rgba(99, 102, 241, 0.15)'
                    }}
                >
                    <span>{loading ? '⏳' : '🔬'}</span>
                    <span>
                        {loading 
                            ? 'Analisando Raciocínio da IA...' 
                            : reasoningData 
                                ? (isExpanded ? 'Ocultar Motivo & Passo a Passo' : '🔬 Ver Motivo & Passo a Passo da Resposta') 
                                : '🔬 Por que essa resposta? (Ver Motivo & Passo a Passo)'
                        }
                    </span>
                    {reasoningData && (
                        <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                            {isExpanded ? '▲' : '▼'}
                        </span>
                    )}
                </button>

                {reasoningData && (
                    <span style={{
                        fontSize: '0.7rem',
                        color: '#34d399',
                        background: 'rgba(16, 185, 129, 0.1)',
                        border: '1px solid rgba(16, 185, 129, 0.25)',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontWeight: 700
                    }}>
                        ✓ Diagnóstico Disponível
                    </span>
                )}
            </div>

            {/* Painel de Diagnóstico Expandido */}
            {isExpanded && reasoningData && (
                <div style={{
                    marginTop: '0.85rem',
                    background: 'rgba(15, 23, 42, 0.75)',
                    border: '1px solid rgba(99, 102, 241, 0.25)',
                    borderRadius: '14px',
                    padding: '1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem',
                    boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.05)'
                }}>
                    {/* Resumo Geral */}
                    {reasoningData.summary && (
                        <div style={{
                            background: 'rgba(99, 102, 241, 0.08)',
                            borderLeft: '4px solid #6366f1',
                            borderRadius: '0 8px 8px 0',
                            padding: '0.75rem 1rem',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4px'
                        }}>
                            <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                💡 Raciocínio Central da IA
                            </div>
                            <div style={{ fontSize: '0.84rem', color: '#f1f5f9', lineHeight: '1.5' }}>
                                {reasoningData.summary}
                            </div>
                        </div>
                    )}

                    {/* Blocos Lado a Lado: 1ª Parte e Própria Pergunta */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                        gap: '0.85rem'
                    }}>
                        {/* Card: 1ª Parte da Resposta */}
                        <div style={{
                            background: 'rgba(30, 41, 59, 0.5)',
                            border: '1px solid rgba(168, 85, 247, 0.25)',
                            borderRadius: '10px',
                            padding: '0.85rem 1rem',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '6px'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ fontSize: '0.9rem' }}>🧩</span>
                                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#c084fc', textTransform: 'uppercase' }}>
                                    1ª Parte (Acolhimento / Reação)
                                </span>
                            </div>

                            {reasoningData.primeira_parte?.texto && (
                                <div style={{
                                    background: 'rgba(0, 0, 0, 0.25)',
                                    border: '1px solid rgba(255, 255, 255, 0.06)',
                                    padding: '5px 8px',
                                    borderRadius: '6px',
                                    fontSize: '0.82rem',
                                    fontWeight: 700,
                                    color: '#e2e8f0',
                                    fontFamily: 'monospace'
                                }}>
                                    "{reasoningData.primeira_parte.texto}"
                                </div>
                            )}

                            <div style={{ fontSize: '0.8rem', color: '#cbd5e1', lineHeight: '1.45', marginTop: '2px' }}>
                                <strong style={{ color: '#e9d5ff' }}>Motivo da Decisão: </strong>
                                {reasoningData.primeira_parte?.motivo || 'Motivo não especificado.'}
                            </div>
                        </div>

                        {/* Card: Própria Pergunta / Condução */}
                        <div style={{
                            background: 'rgba(30, 41, 59, 0.5)',
                            border: '1px solid rgba(16, 185, 129, 0.25)',
                            borderRadius: '10px',
                            padding: '0.85rem 1rem',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '6px'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ fontSize: '0.9rem' }}>❓</span>
                                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#34d399', textTransform: 'uppercase' }}>
                                    Própria Pergunta / Condução
                                </span>
                            </div>

                            {reasoningData.pergunta_conducao?.texto && (
                                <div style={{
                                    background: 'rgba(0, 0, 0, 0.25)',
                                    border: '1px solid rgba(255, 255, 255, 0.06)',
                                    padding: '5px 8px',
                                    borderRadius: '6px',
                                    fontSize: '0.82rem',
                                    fontWeight: 700,
                                    color: '#e2e8f0',
                                    fontFamily: 'monospace'
                                }}>
                                    "{reasoningData.pergunta_conducao.texto}"
                                </div>
                            )}

                            <div style={{ fontSize: '0.8rem', color: '#cbd5e1', lineHeight: '1.45', marginTop: '2px' }}>
                                <strong style={{ color: '#a7f3d0' }}>Motivo da Decisão: </strong>
                                {reasoningData.pergunta_conducao?.motivo || 'Motivo não especificado.'}
                            </div>
                        </div>
                    </div>

                    {/* Linha de Raciocínio Passo a Passo */}
                    {Array.isArray(reasoningData.passo_a_passo) && reasoningData.passo_a_passo.length > 0 && (
                        <div style={{
                            background: 'rgba(30, 41, 59, 0.35)',
                            border: '1px solid rgba(255, 255, 255, 0.06)',
                            borderRadius: '10px',
                            padding: '0.85rem 1rem'
                        }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#93c5fd', textTransform: 'uppercase', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span>🪜</span> Linha de Raciocínio da IA (Passo a Passo)
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {reasoningData.passo_a_passo.map((passo, pIdx) => (
                                    <div key={pIdx} style={{
                                        display: 'flex',
                                        alignItems: 'flex-start',
                                        gap: '8px',
                                        fontSize: '0.8rem',
                                        color: '#cbd5e1',
                                        lineHeight: '1.4'
                                    }}>
                                        <span style={{
                                            fontSize: '0.68rem',
                                            fontWeight: 800,
                                            background: 'rgba(99, 102, 241, 0.25)',
                                            color: '#a5b4fc',
                                            borderRadius: '50%',
                                            width: '18px',
                                            height: '18px',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexShrink: 0,
                                            marginTop: '1px'
                                        }}>
                                            {pIdx + 1}
                                        </span>
                                        <span>{passo}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Fatores Determinantes do Prompt */}
                    {Array.isArray(reasoningData.fatores) && reasoningData.fatores.length > 0 && (
                        <div>
                            <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.03em' }}>
                                📜 Regras e Fatores do Prompt Aplicados
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                {reasoningData.fatores.map((fat, fIdx) => (
                                    <div key={fIdx} style={{
                                        background: 'rgba(255, 255, 255, 0.03)',
                                        border: '1px solid rgba(255, 255, 255, 0.08)',
                                        borderRadius: '8px',
                                        padding: '5px 10px',
                                        fontSize: '0.75rem'
                                    }}>
                                        <span style={{ fontWeight: 700, color: '#f8fafc' }}>{fat.titulo || fat.title}</span>
                                        {fat.explicacao && (
                                            <span style={{ color: '#94a3b8', marginLeft: '5px' }}>— {fat.explicacao}</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
