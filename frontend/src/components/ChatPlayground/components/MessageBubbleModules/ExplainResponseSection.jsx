import React from 'react';

const buttonStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    color: '#e2e8f0',
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '0.75rem',
    cursor: 'pointer',
    marginTop: '6px',
    marginRight: '8px',
    transition: 'all 0.2s',
};

const ExplainResponseSection = ({
    explanationState,
    setExplanationState,
    explanationData,
    setExplanationData,
    handleExplainResponse,
    debateQuestion,
    setDebateQuestion,
    debateHistory,
    setDebateHistory,
    debateCostBrl,
    setDebateCostBrl,
    debateLoading,
    debateError,
    setDebateError,
    handleSendDebateQuestion
}) => {
    return (
        <div data-testid="explain-response-section" style={{
            borderLeft: '3px solid #a78bfa',
            paddingLeft: '14px',
            marginTop: '20px',
            paddingBottom: '4px'
        }}>
            <strong style={{ color: '#a78bfa', fontSize: '0.9rem' }}>🔬 Por que essa resposta?</strong>
            <p style={{ fontSize: '0.72rem', color: '#64748b', marginBottom: '10px', marginTop: '4px' }}>
                Analisa quais partes do prompt influenciaram a resposta da IA.
            </p>

            {explanationState === null && (
                <button
                    data-testid="explain-response-btn"
                    onClick={handleExplainResponse}
                    style={{
                        ...buttonStyle,
                        background: 'rgba(167, 139, 250, 0.1)',
                        border: '1px solid rgba(167, 139, 250, 0.3)',
                        color: '#c4b5fd',
                        fontWeight: '600'
                    }}
                >
                    🔬 Explicar Raciocínio
                </button>
            )}

            {explanationState === 'loading' && (
                <div data-testid="explain-loading" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '8px' }}>
                    <div style={{
                        width: '18px', height: '18px',
                        border: '2px solid rgba(167, 139, 250, 0.3)',
                        borderTop: '2px solid #a78bfa',
                        borderRadius: '50%',
                        animation: 'spin 0.8s linear infinite',
                        flexShrink: 0
                    }} />
                    <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Analisando o raciocínio da IA...</span>
                </div>
            )}

            {explanationState === 'error' && (
                <div style={{ marginTop: '8px', fontSize: '0.78rem', color: '#f87171' }}>
                    ❌ Erro ao gerar explicação. Tente novamente.
                    <button
                        onClick={() => setExplanationState(null)}
                        style={{ ...buttonStyle, marginLeft: '8px', marginTop: '0', color: '#f87171', border: '1px solid rgba(248,113,113,0.3)' }}
                    >Tentar novamente</button>
                </div>
            )}

            {explanationState === 'done' && explanationData && (() => {
                const sectionMeta = {
                    static:   { icon: '📄', label: 'Estático',  color: '#34d399', bg: 'rgba(52, 211, 153, 0.08)',  border: 'rgba(52, 211, 153, 0.2)' },
                    dynamic:  { icon: '⚡', label: 'Dinâmico', color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.08)',  border: 'rgba(251, 191, 36, 0.2)' },
                    injected: { icon: '🔌', label: 'Injetado',  color: '#818cf8', bg: 'rgba(129, 140, 248, 0.08)', border: 'rgba(129, 140, 248, 0.2)' },
                    rag:      { icon: '📚', label: 'Base RAG',  color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.08)',  border: 'rgba(56, 189, 248, 0.2)' },
                    general:  { icon: '🧠', label: 'Geral',     color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.08)', border: 'rgba(148, 163, 184, 0.2)' },
                };
                const relevanceMeta = {
                    high:   { icon: '🔴', label: 'Alto' },
                    medium: { icon: '🟡', label: 'Médio' },
                    low:    { icon: '🟢', label: 'Baixo' },
                };

                return (
                    <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {explanationData.factors.map((factor, idx) => {
                            const sm = sectionMeta[factor.section] || sectionMeta.general;
                            const rm = relevanceMeta[factor.relevance] || relevanceMeta.medium;
                            return (
                                <div key={idx} data-testid={`explain-factor-${idx}`} style={{
                                    background: sm.bg,
                                    border: `1px solid ${sm.border}`,
                                    borderRadius: '10px',
                                    padding: '12px 14px',
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                        <span style={{ color: sm.color, fontWeight: '700', fontSize: '0.82rem' }}>
                                            {sm.icon} {factor.title}
                                        </span>
                                        <div style={{ display: 'flex', gap: '6px' }}>
                                            <span style={{
                                                fontSize: '0.68rem',
                                                background: 'rgba(255,255,255,0.05)',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                color: '#94a3b8',
                                                padding: '2px 7px',
                                                borderRadius: '10px'
                                            }}>{sm.icon} {sm.label}</span>
                                            <span style={{
                                                fontSize: '0.68rem',
                                                background: 'rgba(255,255,255,0.05)',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                color: '#94a3b8',
                                                padding: '2px 7px',
                                                borderRadius: '10px'
                                            }}>{rm.icon} {rm.label}</span>
                                        </div>
                                    </div>
                                    <p style={{ margin: 0, fontSize: '0.78rem', color: '#cbd5e1', lineHeight: '1.5' }}>
                                        {factor.explanation}
                                    </p>
                                </div>
                            );
                        })}

                        {/* Resumo geral */}
                        <div data-testid="explain-summary" style={{
                            background: 'rgba(167, 139, 250, 0.06)',
                            border: '1px solid rgba(167, 139, 250, 0.2)',
                            borderRadius: '10px',
                            padding: '12px 14px',
                            marginTop: '4px'
                        }}>
                            <strong style={{ color: '#a78bfa', fontSize: '0.78rem' }}>💡 Conclusão</strong>
                            <p style={{ margin: '6px 0 0 0', fontSize: '0.78rem', color: '#c4b5fd', lineHeight: '1.5' }}>
                                {explanationData.summary}
                            </p>
                        </div>

                        {/* Custos da Análise */}
                        <div style={{
                            fontSize: '0.72rem',
                            color: '#94a3b8',
                            background: 'rgba(255, 255, 255, 0.02)',
                            border: '1px solid rgba(255,255,255,0.05)',
                            padding: '8px 12px',
                            borderRadius: '8px',
                            marginTop: '4px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '2px'
                        }}>
                            <div>⚙️ <strong>Gasto da análise da resposta:</strong> R$ {((explanationData.cost_brl || 0)).toFixed(4)}</div>
                            {debateCostBrl > 0 && (
                                <div style={{ color: '#a78bfa' }}>💬 <strong>Gasto do debate explicativo:</strong> R$ {debateCostBrl.toFixed(4)}</div>
                            )}
                        </div>

                        {/* ---- DEBATE CHAT PLAYGROUND ---- */}
                        <div style={{
                            marginTop: '15px',
                            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                            paddingTop: '15px'
                        }}>
                            <strong style={{ color: '#c4b5fd', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                                💬 Debater resposta com IA Auditora
                            </strong>
                            
                            {/* Histórico do Debate */}
                            <div style={{
                                maxHeight: '250px',
                                overflowY: 'auto',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px',
                                marginBottom: '10px',
                                paddingRight: '4px'
                            }}>
                                {debateHistory.map((chat, cIdx) => (
                                    <div key={cIdx} style={{
                                        alignSelf: chat.role === 'user' ? 'flex-end' : 'flex-start',
                                        background: chat.role === 'user' ? 'rgba(167, 139, 250, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                                        border: chat.role === 'user' ? '1px solid rgba(167, 139, 250, 0.3)' : '1px solid rgba(255, 255, 255, 0.08)',
                                        color: chat.role === 'user' ? '#f5f3ff' : '#cbd5e1',
                                        borderRadius: '12px',
                                        padding: '8px 12px',
                                        maxWidth: '85%',
                                        fontSize: '0.78rem',
                                        textAlign: 'left',
                                        lineHeight: '1.4'
                                    }}>
                                        {chat.content}
                                    </div>
                                ))}
                                {debateLoading && (
                                    <div style={{
                                        alignSelf: 'flex-start',
                                        background: 'rgba(255, 255, 255, 0.02)',
                                        border: '1px solid rgba(255, 255, 255, 0.05)',
                                        borderRadius: '12px',
                                        padding: '8px 12px',
                                        fontSize: '0.78rem',
                                        color: '#94a3b8',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px'
                                    }}>
                                        <div style={{
                                            width: '10px', height: '10px',
                                            border: '2px solid rgba(167, 139, 250, 0.3)',
                                            borderTop: '2px solid #a78bfa',
                                            borderRadius: '50%',
                                            animation: 'spin 0.8s linear infinite'
                                        }} />
                                        Pensando...
                                    </div>
                                )}
                                {debateError && (
                                    <div style={{ color: '#f87171', fontSize: '0.74rem', marginTop: '4px' }}>
                                        ❌ {debateError}
                                    </div>
                                )}
                            </div>

                            {/* Campo de Input do Debate */}
                            <form onSubmit={handleSendDebateQuestion} style={{ display: 'flex', gap: '8px' }}>
                                <input
                                    type="text"
                                    value={debateQuestion}
                                    onChange={(e) => setDebateQuestion(e.target.value)}
                                    placeholder="Pergunte sobre esta resposta... (ex: Por que citou Sofia?)"
                                    disabled={debateLoading}
                                    style={{
                                        flex: 1,
                                        background: 'rgba(0, 0, 0, 0.25)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        borderRadius: '8px',
                                        padding: '8px 12px',
                                        color: '#f8fafc',
                                        fontSize: '0.78rem',
                                        outline: 'none'
                                    }}
                                />
                                <button
                                    type="submit"
                                    disabled={debateLoading || !debateQuestion.trim()}
                                    style={{
                                        background: '#a78bfa',
                                        color: '#0f172a',
                                        border: 'none',
                                        borderRadius: '8px',
                                        padding: '8px 14px',
                                        fontSize: '0.78rem',
                                        fontWeight: '700',
                                        cursor: debateLoading || !debateQuestion.trim() ? 'not-allowed' : 'pointer',
                                        opacity: debateLoading || !debateQuestion.trim() ? 0.5 : 1,
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    Enviar
                                </button>
                            </form>
                        </div>

                        {/* Botão re-analisar */}
                        <button
                            onClick={() => {
                                setExplanationState(null);
                                setExplanationData(null);
                                setDebateHistory([]);
                                setDebateQuestion('');
                                setDebateCostBrl(0);
                                if (setDebateError) setDebateError(null);
                            }}
                            style={{ ...buttonStyle, alignSelf: 'flex-start', fontSize: '0.7rem', color: '#64748b', marginTop: '10px' }}
                        >
                            🔄 Re-analisar
                        </button>
                    </div>
                );
            })()}
        </div>
    );
};

export default ExplainResponseSection;
