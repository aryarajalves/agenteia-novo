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

            {(() => {
                const sc = msg.debug?.semantic_cache || msg.metrics?.semantic_cache;
                const hasCacheInfo = !!sc || msg.debug?.cache_hit || msg.debug?.from_semantic_cache || msg.metrics?.from_semantic_cache;
                if (!hasCacheInfo) return null;

                const isHitQual = sc?.status === 'hit_qualification' || (sc?.funnel_active && (msg.debug?.cache_hit || (sc?.similarity && sc.similarity >= (sc.threshold || 0.85))));
                const isPartial = sc?.status === 'partial_hit';
                const isMiss = sc?.status === 'miss';
                const isHitDirect = !isHitQual && !isPartial && !isMiss;

                const borderColor = isHitQual ? '#06b6d4' : isPartial ? '#3b82f6' : isMiss ? '#64748b' : '#10b981';
                const bgColor = isHitQual ? 'rgba(6, 182, 212, 0.08)' : isPartial ? 'rgba(59, 130, 246, 0.08)' : isMiss ? 'rgba(100, 116, 139, 0.08)' : 'rgba(16, 185, 129, 0.08)';
                const titleColor = isHitQual ? '#22d3ee' : isPartial ? '#60a5fa' : isMiss ? '#94a3b8' : '#34d399';
                const simValue = sc?.similarity_pct || (msg.metrics?.cached_similarity ?? msg.debug?.cached_similarity ?? msg.debug?.similarity ? `${(((msg.metrics?.cached_similarity ?? msg.debug?.cached_similarity ?? msg.debug?.similarity)) * 100).toFixed(1)}%` : null);
                const queryText = sc?.matched_query || msg.metrics?.cached_original_query || msg.debug?.cached_original_query || msg.debug?.semantic_cache_hit?.original_query;

                return (
                    <div className="debug-section" data-testid="debug-semantic-cache-details" style={{
                        borderLeft: `3px solid ${borderColor}`,
                        background: bgColor,
                        borderRadius: '8px',
                        padding: '12px 14px',
                        marginBottom: '16px'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
                            <strong style={{ color: titleColor, fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                {isHitQual ? '⚡ Resposta Oficial do Cache + Funil de Qualificação Ativo' :
                                 isPartial ? '⚡ Cache Semântico Parcial (Multi-Perguntas)' :
                                 isMiss ? '⚡ Cache Semântico Consultado (Sem Match)' :
                                 '⚡ Resposta Servida via Cache Semântico (Custo R$ 0,00)'}
                            </strong>
                            {(simValue || sc?.closest_similarity_pct) && (
                                <span style={{
                                    background: isMiss ? 'rgba(148, 163, 184, 0.2)' : isHitQual ? 'rgba(6, 182, 212, 0.2)' : 'rgba(16, 185, 129, 0.25)',
                                    border: `1px solid ${isMiss ? 'rgba(148, 163, 184, 0.4)' : isHitQual ? 'rgba(6, 182, 212, 0.4)' : 'rgba(16, 185, 129, 0.4)'}`,
                                    color: titleColor,
                                    padding: '2px 8px',
                                    borderRadius: '12px',
                                    fontSize: '0.78rem',
                                    fontWeight: 700
                                }}>
                                    🎯 {simValue ? `${simValue} de Similaridade` : `${sc?.closest_similarity_pct} Maior Similaridade`}
                                </span>
                            )}
                        </div>

                        <div style={{ fontSize: '0.82rem', color: '#cbd5e1', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {queryText && (
                                <div>
                                    <span style={{ color: '#94a3b8' }}>{isHitQual ? 'Pergunta Homologada no Cache: ' : 'Pergunta Original no Cache: '}</span>
                                    <strong style={{ color: '#fff' }}>"{queryText}"</strong>
                                    {sc?.matched_id && <span style={{ color: '#64748b', marginLeft: '6px', fontSize: '0.75rem' }}>(Item #{sc.matched_id})</span>}
                                </div>
                            )}

                            {(sc?.matched_queries || msg.debug?.matched_queries || (sc?.matched_items && sc.matched_items.length > 0)) && (
                                <div style={{ marginTop: '4px', padding: '6px 8px', background: 'rgba(255, 255, 255, 0.04)', borderRadius: '6px', borderLeft: '2px solid #34d399' }}>
                                    <div style={{ color: '#86efac', fontWeight: 600, fontSize: '0.76rem', marginBottom: '2px' }}>
                                        🎯 {(sc?.matched_queries?.length || msg.debug?.matched_queries?.length || sc?.matched_items?.length) > 1 ? 'Perguntas Respondidas pelo Cache Semântico:' : 'Pergunta Respondida pelo Cache Semântico:'}
                                    </div>
                                    <ul style={{ margin: 0, paddingLeft: '16px', color: '#e2e8f0', fontSize: '0.76rem' }}>
                                        {(sc?.matched_queries || msg.debug?.matched_queries || sc?.matched_items?.map(it => it.query) || []).map((q, qIdx) => (
                                            <li key={qIdx} style={{ margin: '2px 0' }}>
                                                <strong>"{q}"</strong>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {(sc?.threshold_pct || msg.debug?.threshold) && (
                                <div style={{ color: '#94a3b8', fontSize: '0.76rem' }}>
                                    Limiar Exigido: {sc?.threshold_pct || `${((msg.debug?.threshold || 0) * 100).toFixed(1)}%`}
                                    {isMiss ? ' (Não atingido)' : ' (Atingido e Aprovado)'}
                                </div>
                            )}

                            {isHitQual && (
                                <div style={{ color: '#22d3ee', fontSize: '0.76rem', background: 'rgba(6, 182, 212, 0.1)', border: '1px solid rgba(6, 182, 212, 0.2)', padding: '6px 8px', borderRadius: '6px', marginTop: '4px' }}>
                                    💡 <strong>Condução Integrada:</strong> A Resposta Oficial homologada no cache foi utilizada com 100% de fidelidade para responder à dúvida. Como o lead possui perguntas pendentes no <strong>Funil de Qualificação</strong>, a IA formulou a resposta oficial e engatou a próxima pergunta de sondagem.
                                </div>
                            )}

                            {isHitDirect && (
                                <div style={{ color: '#34d399', fontSize: '0.76rem', marginTop: '2px' }}>
                                    💰 Custo desta resposta: <strong>R$ 0,00</strong> (0 Tokens consumidos do modelo LLM)
                                </div>
                            )}

                            {isPartial && (
                                <div style={{ color: '#60a5fa', fontSize: '0.76rem', marginTop: '2px' }}>
                                    🧩 {sc?.message || 'Múltiplas dúvidas identificadas. Respostas homologadas foram injetadas para responder aos tópicos correspondentes.'}
                                </div>
                            )}

                            {isMiss && (
                                <div style={{ color: '#94a3b8', fontSize: '0.76rem', marginTop: '2px' }}>
                                    {sc?.closest_candidate && (
                                        <div style={{ marginBottom: '2px' }}>
                                            Dúvida mais próxima no cache: <span style={{ color: '#cbd5e1' }}>"{sc.closest_candidate}"</span> ({sc.closest_similarity_pct})
                                        </div>
                                    )}
                                    A similaridade não atingiu o limiar de confiança configurado. A mensagem foi processada pela Base de Conhecimento (RAG) e modelo LLM.
                                </div>
                            )}
                        </div>
                    </div>
                );
            })()}

            {msg.debug.rag_items && msg.debug.rag_items.length > 0 ? (
                <div className="debug-section">
                    <strong>📚 Fontes Recuperadas (RAG):</strong>
                    {(() => {
                        const ragQueries = msg.debug.rag_queries || (msg.debug.rag_query ? [msg.debug.rag_query] : (msg.debug.pre_router?.lista_perguntas_extraidas || (msg.debug.pre_router?.perguntas_extraidas ? [msg.debug.pre_router.perguntas_extraidas] : [])));
                        if (ragQueries && ragQueries.length > 0) {
                            return (
                                <div style={{
                                    background: 'rgba(99, 102, 241, 0.12)',
                                    border: '1px solid rgba(99, 102, 241, 0.3)',
                                    borderRadius: '6px',
                                    padding: '8px 10px',
                                    marginTop: '8px',
                                    marginBottom: '6px',
                                    fontSize: '0.8rem'
                                }}>
                                    <span style={{ color: '#a5b4fc', fontWeight: 600 }}>
                                        🔍 {ragQueries.length > 1 ? 'Perguntas enviadas para o RAG:' : 'Pergunta enviada para o RAG:'}
                                    </span>
                                    <ul style={{ margin: '4px 0 0 0', paddingLeft: '18px', color: '#e2e8f0' }}>
                                        {ragQueries.map((rq, rqIdx) => (
                                            <li key={rqIdx} style={{ margin: '2px 0' }}>
                                                <strong>"{rq}"</strong>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            );
                        }
                        return null;
                    })()}
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
