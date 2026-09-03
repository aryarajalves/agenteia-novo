import React from 'react';

const MessageMetaBar = ({
    msg,
    msgIndex,
    isRegularUser,
    feedbackState,
    handleThumbsUp,
    handleThumbsDown,
    readFbFromStorage,
    selectedAgentId,
    showDebug,
    setShowDebug,
    showAttribution,
    setShowAttribution,
    handleFetchAttribution,
    explanationData,
    debateCostBrl
}) => {
    const isUser = msg.role === 'user';
    const isFromCache = !!(msg.metrics?.from_semantic_cache || msg.model_used === 'semantic-cache');
    const fbState = feedbackState?.[msgIndex] || null;
    const canFeedback = !isUser && msg.metrics && !msg.isError && !isFromCache && handleThumbsUp && handleThumbsDown;

    if (!msg.metrics || isRegularUser) return null;

    return (
        <div className="message-meta">
            {msg.metrics.input_tokens !== undefined ? (
                <>
                    <span className="meta-pill input-tokens-pill" title="Tokens de Entrada Cobrados">
                        📥 {((msg.metrics.input_tokens || 0) - (msg.metrics.cached_tokens || 0)).toLocaleString()} IN
                    </span>
                    {msg.metrics.cached_tokens ? (
                        <span className="meta-pill cached-tokens-pill" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.3)' }} title="Tokens vindos do cache (Prompt Caching)">
                            💾 {(msg.metrics.cached_tokens || 0).toLocaleString()} CACHED
                        </span>
                    ) : null}
                    <span className="meta-pill output-tokens-pill" title="Tokens de Saída (Resposta da IA)">
                        📤 {(msg.metrics.output_tokens || 0).toLocaleString()} OUT
                    </span>
                    <span className="meta-pill tokens-pill total" title="Total de Tokens consumidos">
                        ⚡ {(msg.metrics.tokens || 0).toLocaleString()} TOTAL
                    </span>
                    {msg.metrics.cost !== undefined && (
                        <span className="meta-pill cost-pill" style={{ background: 'rgba(234, 179, 8, 0.15)', color: '#eab308' }} title="Custo estimado desta resposta em BRL">
                            💰 R$ {((msg.metrics.cost || 0) + (explanationData?.cost_brl || 0) + (debateCostBrl || 0)).toFixed(4)}
                        </span>
                    )}
                    {msg.metrics.response_time_ms !== undefined && (
                        <span className="meta-pill time-pill" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }} title="Tempo total de processamento">
                            ⏱️ {((msg.metrics.response_time_ms || 0) / 1000).toFixed(2)}s
                        </span>
                    )}
                </>
            ) : (
                <>
                    <span className="meta-pill tokens-pill">⚡ {(msg.metrics.tokens || 0).toLocaleString()} toks</span>
                    {msg.metrics.cost !== undefined && (
                        <span className="meta-pill cost-pill" style={{ background: 'rgba(234, 179, 8, 0.15)', color: '#eab308' }}>
                            💰 R$ {((msg.metrics.cost || 0) + (explanationData?.cost_brl || 0) + (debateCostBrl || 0)).toFixed(4)}
                        </span>
                    )}
                </>
            )}

            {msg.metrics?.from_semantic_cache || msg.model_used === 'semantic-cache' ? (
                <span 
                    className="meta-pill semantic-cache-pill" 
                    data-testid="semantic-cache-pill"
                    style={{
                        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.25), rgba(6, 182, 212, 0.25))',
                        color: '#34d399',
                        border: '1px solid rgba(16, 185, 129, 0.5)',
                        boxShadow: '0 0 10px rgba(16, 185, 129, 0.2)',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                    }}
                    title={`Resposta instantânea de Custo Zero (Similaridade Semântica: ${(msg.metrics?.cached_similarity ?? msg.debug?.cached_similarity ?? msg.debug?.similarity) ? `${((msg.metrics?.cached_similarity ?? msg.debug?.cached_similarity ?? msg.debug?.similarity) * 100).toFixed(1)}%` : 'Alta'})`}
                >
                    ⚡ CACHE SEMÂNTICO ({(msg.metrics?.cached_similarity ?? msg.debug?.cached_similarity ?? msg.debug?.similarity) ? `${((msg.metrics?.cached_similarity ?? msg.debug?.cached_similarity ?? msg.debug?.similarity) * 100).toFixed(1)}% SIMILARIDADE` : '0 TOKENS'} · R$ 0,00)
                </span>
            ) : null}

            {msg.model_used && msg.model_used !== 'semantic-cache' && (
                <span className="meta-pill model-pill" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    ✨ {msg.model_used}
                </span>
            )}
            {msg.metrics?.model_role && (
                <span className="meta-pill" style={{
                    background: msg.metrics.model_role === 'main' ? 'rgba(16, 185, 129, 0.15)' :
                        msg.metrics.model_role === 'fallback' ? 'rgba(234, 179, 8, 0.15)' :
                            'rgba(239, 68, 68, 0.15)',
                    color: msg.metrics.model_role === 'main' ? '#10b981' :
                        msg.metrics.model_role === 'fallback' ? '#eab308' :
                            '#ef4444',
                    display: 'flex', alignItems: 'center', gap: '4px',
                    fontWeight: 600
                }}>
                    {msg.metrics.model_role === 'main' ? '🟢 Principal' :
                        msg.metrics.model_role === 'fallback' ? '🟡 Fallback' :
                            '🔴 Emergência'}
                </span>
            )}
            {msg.tool_calls && msg.tool_calls.length > 0 && (
                <span className="meta-pill tool-pill" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }} title="Ferramentas externas foram utilizadas">
                    🛠️ Tools
                </span>
            )}

            {msg.isError && msg.systemError && (
                <span 
                    className="meta-pill error-admin-pill" 
                    style={{ 
                        background: 'rgba(239, 68, 68, 0.2)', 
                        color: '#f87171', 
                        border: '1px solid rgba(239, 68, 68, 0.5)',
                        fontWeight: 700,
                        cursor: 'help'
                    }} 
                    title={`⚠️ [PRIVADO ADMIN] Detalhes do Erro da IA:\n${msg.systemError}`}
                >
                    ⚠️ Erro Técnico (Admin)
                </span>
            )}
            {msg.debug?.guardrails_active && (
                <span className="meta-pill guardrail-pill active" title="Políticas de segurança aplicadas">🛡️ Seguro</span>
            )}
            {msg.violations && (
                <span className="meta-pill guardrail-pill danger">🚫 Filtrado</span>
            )}
            {msg.debug && (
                <button
                    data-testid="raio-x-toggle-btn"
                    onClick={() => {
                        setShowDebug(!showDebug);
                    }} className={`debug-toggle-btn ${showDebug ? 'active' : ''}`}>
                    {showDebug ? 'Ocultar Detalhes' : '🔍 Raio-X'}
                </button>
            )}

            {!isUser && msg.content && handleFetchAttribution && (
                <button
                    data-testid="attribution-toggle-btn"
                    onClick={() => {
                        const next = !showAttribution;
                        setShowAttribution(next);
                        if (next) {
                            handleFetchAttribution();
                        }
                    }}
                    className={`debug-toggle-btn ${showAttribution ? 'active' : ''}`}
                    style={{
                        background: showAttribution ? 'rgba(129, 140, 248, 0.25)' : 'rgba(129, 140, 248, 0.1)',
                        borderColor: showAttribution ? '#818cf8' : 'rgba(129, 140, 248, 0.3)',
                        color: showAttribution ? '#ffffff' : '#c7d2fe',
                        fontWeight: 600
                    }}
                    title="Visualizar o que foi usado para criar cada parte desta resposta (RAG vs Prompt)"
                >
                    {showAttribution ? '🏷️ Ocultar Fontes' : '🏷️ Origem das Informações'}
                </button>
            )}

            {/* ---- Botões de Feedback ---- */}
            {canFeedback && (
                <div className="feedback-btns">
                    {!fbState && (
                        <>
                            <button
                                className="feedback-btn thumbs-up"
                                onClick={() => handleThumbsUp(msg, msgIndex)}
                                title="Resposta correta — adicionar ao dataset"
                            >👍</button>
                            <button
                                className="feedback-btn thumbs-down"
                                onClick={() => handleThumbsDown(msg, msgIndex)}
                                title="Resposta ruim — corrigir para treinar"
                            >👎</button>
                        </>
                    )}
                    {fbState === 'positive' && (
                        <span className="feedback-done positive" style={{ color: '#34d399', fontWeight: 600 }} title="Resposta salva no Cache Semântico!">⚡ Salvo no Cache</span>
                    )}
                    {(fbState === 'negative') && (
                        <span className="feedback-done negative" title="Correção salva no dataset">🎯 Corrigido</span>
                    )}
                    {fbState === 'correcting' && (
                        <span className="feedback-done correcting">✏️ Corrigindo...</span>
                    )}
                </div>
            )}
        </div>
    );
};

export default MessageMetaBar;
