import React from 'react';
import TimelineView from '../TimelineView';
import ExplainResponseSection from './ExplainResponseSection';
import { estimateTokens, formatTokenCount } from '../../utils/tokenUtils';

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

const DebugPanel = ({
    msg,
    showDebug,
    setActiveModal,
    setActivePreRouterTab,
    setActiveResolvedPromptTab,
    explainProps
}) => {
    if (!showDebug) return null;

    if (!msg.debug) {
        return (
            <div className="debug-panel">
                <p style={{ color: '#94a3b8', fontSize: '0.85rem', fontStyle: 'italic', margin: 0 }}>
                    ⚠️ Dados de Raio-X não disponíveis para esta mensagem.
                </p>
            </div>
        );
    }

    return (
        <div className="debug-panel">
            <h5 style={{ margin: '0 0 10px 0', color: '#fbbf24' }}>🧠 Raio-X do Pensamento</h5>
            <TimelineView 
                debug={msg.debug} 
                onOpenPreRouterDecision={msg.debug?.pre_router ? () => {
                    setActivePreRouterTab('classifications');
                    setActiveModal({
                        title: "Decisão do Pre-Router",
                        content: JSON.stringify(
                            Object.fromEntries(Object.entries(msg.debug.pre_router).filter(([k]) => !k.startsWith('_'))), 
                            null, 2
                        ),
                        type: "pre_router",
                        rawData: msg.debug.pre_router
                    });
                } : null}
                onOpenPreRouterPrompt={msg.debug?.pre_router?._debug_prompt ? () => {
                    setActiveModal({
                        title: "Prompt do Pre-Router",
                        content: msg.debug.pre_router._debug_prompt,
                        type: "pre_router_prompt"
                    });
                } : null}
            />

            {(msg.debug?.cache_hit || msg.debug?.from_semantic_cache || msg.metrics?.from_semantic_cache) && (
                <div className="debug-section" data-testid="debug-semantic-cache-details" style={{
                    borderLeft: '3px solid #10b981',
                    background: 'rgba(16, 185, 129, 0.08)',
                    borderRadius: '8px',
                    padding: '12px 14px',
                    marginBottom: '16px'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <strong style={{ color: '#34d399', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            ⚡ Resposta Servida via Cache Semântico
                        </strong>
                        <span style={{
                            background: 'rgba(16, 185, 129, 0.25)',
                            border: '1px solid rgba(16, 185, 129, 0.4)',
                            color: '#34d399',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontSize: '0.78rem',
                            fontWeight: 700
                        }}>
                            🎯 {(msg.metrics?.cached_similarity ?? msg.debug?.cached_similarity ?? msg.debug?.similarity) ? `${((msg.metrics?.cached_similarity ?? msg.debug?.cached_similarity ?? msg.debug?.similarity) * 100).toFixed(1)}% de Similaridade` : 'Alta Precisão'}
                        </span>
                    </div>

                    <div style={{ fontSize: '0.82rem', color: '#cbd5e1', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div>
                            <span style={{ color: '#94a3b8' }}>Pergunta Original no Cache: </span>
                            <strong style={{ color: '#fff' }}>"{msg.metrics?.cached_original_query || msg.debug?.cached_original_query || msg.debug?.semantic_cache_hit?.original_query || 'Pergunta correspondente'}"</strong>
                        </div>
                        {msg.debug?.threshold && (
                            <div style={{ color: '#94a3b8', fontSize: '0.76rem' }}>
                                Limiar de Confiança Exigido: {(msg.debug.threshold * 100).toFixed(1)}% (Atingido e Aprovado)
                            </div>
                        )}
                        <div style={{ color: '#34d399', fontSize: '0.76rem', marginTop: '2px' }}>
                            💰 Custo desta resposta: <strong>R$ 0,00</strong> (0 Tokens consumidos do modelo LLM)
                        </div>
                    </div>
                </div>
            )}

            {msg.debug.rag_items && msg.debug.rag_items.length > 0 ? (
                <div className="debug-section">
                    <strong>📚 Fontes Recuperadas (RAG):</strong>
                    <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {msg.debug.rag_items.map((item, i) => (
                            <div key={i} style={{
                                background: 'rgba(255,255,255,0.05)',
                                padding: '8px',
                                borderRadius: '6px',
                                fontSize: '0.8rem',
                                borderLeft: '3px solid #6366f1'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                    <span style={{ color: '#818cf8', fontWeight: 'bold' }}>#{i + 1} {item.category}</span>
                                    {item.metadata?.page && (
                                        <span style={{
                                            background: '#6366f1',
                                            color: 'white',
                                            padding: '1px 6px',
                                            borderRadius: '4px',
                                            fontSize: '0.7rem'
                                        }}>Pág. {item.metadata.page}</span>
                                    )}
                                    {item.relevance_score !== undefined && (
                                        <span style={{
                                            background: 'rgba(16, 185, 129, 0.2)',
                                            color: '#4ade80',
                                            border: '1px solid rgba(16, 185, 129, 0.2)',
                                            padding: '1px 6px',
                                            borderRadius: '4px',
                                            fontSize: '0.7rem',
                                            fontWeight: 'bold'
                                        }}>🎯 Relevância: {item.relevance_score.toFixed(3)}</span>
                                    )}
                                </div>
                                <div style={{ color: '#e2e8f0', marginBottom: '2px' }}><strong>P:</strong> {item.question}</div>
                                <div style={{ color: '#94a3b8' }}><strong>R:</strong> {item.answer.substring(0, 150)}...</div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : msg.debug.rag_context && (
                <div className="debug-section">
                    <strong>📚 RAG Context (Legado):</strong>
                    <pre>{msg.debug.rag_context}</pre>
                </div>
            )}

            {msg.debug.resolved_prompt && (
                <div className="debug-section" style={{ borderLeft: '3px solid #4ade80', paddingLeft: '10px', marginTop: '20px' }}>
                    <strong style={{ color: '#4ade80' }}>📝 Prompt Final do Sistema</strong>
                    <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '8px' }}>
                        Texto exato enviado à IA (incluindo Regras, Contexto RAG e Memória).
                    </p>
                    <button
                        onClick={() => {
                            setActiveResolvedPromptTab('static');
                            setActiveModal({
                                title: "Prompt Final do Sistema",
                                content: msg.debug.resolved_prompt,
                                type: "resolved_prompt",
                                rawData: msg.debug
                            });
                        }}
                        style={{ ...buttonStyle, background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)' }}
                        className="playground-action-btn"
                    >
                        📝 Visualizar Prompt Final do Sistema
                        <span style={{
                            background: 'rgba(16, 185, 129, 0.2)',
                            border: '1px solid rgba(16, 185, 129, 0.35)',
                            color: '#34d399',
                            padding: '1px 7px',
                            borderRadius: '10px',
                            fontSize: '0.7rem',
                            fontWeight: 'bold'
                        }}>
                            ~{formatTokenCount(estimateTokens(msg.debug.resolved_prompt))} tokens
                        </span>
                    </button>
                </div>
            )}

            {/* Seção Explicar Resposta */}
            <ExplainResponseSection {...explainProps} />

            {msg.debug.translation && (
                <div className="debug-section" style={{ borderLeft: '3px solid #6366f1', paddingLeft: '10px' }}>
                    <strong style={{ color: '#a5b4fc' }}>🌐 Tradução Automática</strong>
                    <div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.8rem' }}>
                        <span>
                            {msg.debug.translation.used_fallback
                                ? <span style={{ color: '#f59e0b' }}>⚠️ Idioma não detectado — usou idioma de fallback: <strong>{msg.debug.translation.target_lang}</strong></span>
                                : <span style={{ color: '#4ade80' }}>✅ Idioma detectado: <strong>{msg.debug.translation.detected_lang}</strong> → traduzido para <strong>{msg.debug.translation.target_lang}</strong></span>
                            }
                        </span>
                        <span style={{ color: '#64748b' }}>Modelo de tradução: {msg.debug.translation.model}</span>
                    </div>
                </div>
            )}
            {msg.debug.error && (
                <div className="debug-section" style={{ color: '#f87171' }}>
                    <strong>❌ Erro Interno:</strong>
                    <pre>{msg.debug.error}</pre>
                </div>
            )}
        </div>
    );
};

export default DebugPanel;
