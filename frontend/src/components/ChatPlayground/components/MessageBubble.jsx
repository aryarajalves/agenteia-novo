import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import TimelineView from './TimelineView';
import { api } from '../../../api/client';

const MessageBubble = ({ 
    msg, 
    msgIndex, 
    isRegularUser, 
    feedbackState, 
    handleThumbsUp, 
    handleThumbsDown, 
    readFbFromStorage, 
    selectedAgentId 
}) => {
    const [showDebug, setShowDebug] = useState(false);
    const [activeModal, setActiveModal] = useState(null); // { title: string, content: string, type: 'pre_router' | 'pre_router_prompt' | 'resolved_prompt', rawData?: any }
    const [activePreRouterTab, setActivePreRouterTab] = useState('classifications'); // 'classifications' | 'questions' | 'memory' | 'raw'
    const [activeResolvedPromptTab, setActiveResolvedPromptTab] = useState('static'); // 'static' | 'dynamic' | 'injected' | 'full'
    const [copied, setCopied] = useState(false);
    const [explanationState, setExplanationState] = useState(null); // null | 'loading' | 'done' | 'error'
    const [explanationData, setExplanationData] = useState(null); // { factors: [], summary: '', cost_brl: 0 }
    
    // Estados do debate explicativo
    const [debateQuestion, setDebateQuestion] = useState('');
    const [debateHistory, setDebateHistory] = useState([]); // Array de {role: 'user'|'assistant', content: string}
    const [debateCostBrl, setDebateCostBrl] = useState(0);
    const [debateLoading, setDebateLoading] = useState(false);
    const [debateError, setDebateError] = useState(null);

    const handleExplainResponse = async () => {
        if (explanationState === 'loading' || explanationState === 'done') return;
        setExplanationState('loading');
        try {
            const resp = await api.post('/explain-response', {
                user_message: msg.userMessage || '',
                agent_response: msg.content || '',
                resolved_prompt: msg.debug?.resolved_prompt || null,
                pre_router: msg.debug?.pre_router || null,
            });
            if (!resp.ok) throw new Error('Falha ao chamar endpoint');
            const data = await resp.json();
            setExplanationData(data);
            setExplanationState('done');
        } catch (err) {
            console.error('Erro ao explicar resposta:', err);
            setExplanationState('error');
        }
    };

    const handleSendDebateQuestion = async (e) => {
        if (e) e.preventDefault();
        if (!debateQuestion.trim() || debateLoading) return;
        
        const currentQuestion = debateQuestion;
        setDebateQuestion('');
        setDebateLoading(true);
        setDebateError(null);
        
        try {
            const resp = await api.post('/explain-debate', {
                user_message: msg.userMessage || '',
                agent_response: msg.content || '',
                resolved_prompt: msg.debug?.resolved_prompt || null,
                pre_router: msg.debug?.pre_router || null,
                question: currentQuestion,
                debate_history: debateHistory
            });
            if (!resp.ok) throw new Error('Falha ao processar debate');
            const data = await resp.json();
            
            setDebateHistory(data.debate_history);
            setDebateCostBrl(prev => prev + (data.cost_brl || 0));
        } catch (err) {
            console.error('Erro no debate explicativo:', err);
            setDebateError('Falha ao enviar pergunta para o debate.');
            setDebateQuestion(currentQuestion); // devolve a pergunta para tentar novamente
        } finally {
            setDebateLoading(false);
        }
    };

    const isUser = msg.role === 'user';
    
    if (isUser) {
        return (
            <div className="message-row user-row">
                <div className="message-bubble user-bubble">
                    {msg.image_url && (
                        <div className="message-image-container" style={{ marginBottom: '8px', borderRadius: '8px', overflow: 'hidden' }}>
                            <img
                                src={msg.image_url}
                                alt="Enviada pelo usuário"
                                style={{ maxWidth: '100%', maxHeight: '300px', display: 'block', cursor: 'zoom-in' }}
                                onClick={() => window.open(msg.image_url, '_blank')}
                            />
                        </div>
                    )}
                    <div className="message-content" style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>
                    {msg.created_at && (
                        <div className="message-timestamp" data-testid="msg-timestamp" style={{ 
                            fontSize: '0.85rem', 
                            color: '#ffffff', 
                            textAlign: 'right', 
                            marginTop: '8px',
                            fontWeight: '600',
                            opacity: '0.95',
                            letterSpacing: '0.5px'
                        }}>
                            {new Date(msg.created_at).toLocaleDateString('pt-BR')} {new Date(msg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                    )}
                </div>
                <div className="avatar user-avatar">👤</div>
            </div>
        );
    }
    
    const fbState = feedbackState?.[msgIndex] || (!isUser && msg.content && readFbFromStorage ? readFbFromStorage(selectedAgentId, msg.content) : null);
    const canFeedback = !isUser && msg.metrics && !msg.isError && handleThumbsUp && handleThumbsDown;

    if (msg.isLink) {
        const url = msg.content.trim();
        return (
            <div className={`message-row assistant-row ${msg.isSplit ? 'is-split' : ''}`}>
                <div className="avatar assistant-avatar" style={{ visibility: msg.isSplit ? 'hidden' : 'visible' }}>🤖</div>
                <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="link-bubble"
                >
                    <span style={{ fontSize: '1rem' }}>🔗</span>
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{url}</span>
                    <span style={{ fontSize: '0.7rem', opacity: 0.6, flexShrink: 0 }}>↗</span>
                </a>
            </div>
        );
    }

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

    return (
        <>
            <div className={`message-row assistant-row ${msg.isSplit ? 'is-split' : ''}`}>
                <div className="avatar assistant-avatar" style={{ visibility: msg.isSplit ? 'hidden' : 'visible' }}>🤖</div>
                <div className="message-bubble assistant-bubble">
                    <div className="message-content" style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>
                    {msg.created_at && (
                        <div className="message-timestamp" data-testid="assistant-timestamp" style={{ 
                            fontSize: '0.8rem', 
                            color: '#94a3b8', 
                            textAlign: 'left', 
                            marginTop: '8px',
                            fontWeight: '600',
                            letterSpacing: '0.5px'
                        }}>
                            {new Date(msg.created_at).toLocaleDateString('pt-BR')} {new Date(msg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                    )}
                    {msg.metrics && !isRegularUser && (
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
                                            💰 R$ {(msg.metrics.cost + (explanationData?.cost_brl || 0) + (debateCostBrl || 0)).toFixed(4)}
                                        </span>
                                    )}
                                </>
                            )}

                            {msg.model_used && (
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
                                        <span className="feedback-done positive" title="Feedback positivo salvo!">✅ Salvo</span>
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
                    )}
                    {showDebug && (
                        msg.debug ? (
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
                                         </button>
                                     </div>
                                 )}

                                 {/* ---- Seção: Por que essa resposta? ---- */}
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
                                                         setDebateError(null);
                                                     }}
                                                     style={{ ...buttonStyle, alignSelf: 'flex-start', fontSize: '0.7rem', color: '#64748b', marginTop: '10px' }}
                                                 >
                                                     🔄 Re-analisar
                                                 </button>
                                             </div>
                                         );
                                     })()}
                                 </div>

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
                        ) : (
                            <div className="debug-panel">
                                <p style={{ color: '#94a3b8', fontSize: '0.85rem', fontStyle: 'italic', margin: 0 }}>
                                    ⚠️ Dados de Raio-X não disponíveis para esta mensagem.
                                </p>
                            </div>
                        )
                    )}
                </div>
            </div>
            {/* Modal Premium de Visualização de Prompt e Decisão */}
            {activeModal && createPortal(
                <div className="modal-overlay fade-in" style={{ zIndex: 100000, background: 'rgba(7, 10, 19, 0.85)', backdropFilter: 'blur(16px)' }}>
                    <div className="modal-content" style={{ 
                        maxWidth: '900px', 
                        width: '95%', 
                        maxHeight: '85vh', 
                        display: 'flex', 
                        flexDirection: 'column',
                        background: 'linear-gradient(145deg, #161d2f 0%, #0f172a 100%)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '24px',
                        padding: '0',
                        overflow: 'hidden',
                        boxShadow: '0 50px 120px -30px rgba(0,0,0,0.9)'
                    }}>
                        <div className="modal-header" style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center',
                            flexDirection: 'row',
                            textAlign: 'left',
                            padding: '24px 32px',
                            background: 'rgba(15, 23, 42, 0.4)',
                            borderBottom: '1px solid rgba(255,255,255,0.08)',
                            position: 'relative'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', width: '100%', textAlign: 'left' }}>
                                <div className="icon-badge" style={{ 
                                    background: activeModal.type === 'resolved_prompt' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(251, 191, 36, 0.15)',
                                    color: activeModal.type === 'resolved_prompt' ? '#10b981' : '#fbbf24',
                                    width: '48px',
                                    height: '48px',
                                    borderRadius: '14px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '1.4rem'
                                }}>
                                    {activeModal.type === 'resolved_prompt' ? '📝' : activeModal.type === 'pre_router_prompt' ? '📄' : '🧠'}
                                </div>
                                <div className="header-text" style={{ textAlign: 'left' }}>
                                    <h3 style={{ margin: '0 0 4px 0', fontSize: '1.25rem', color: '#f8fafc', fontWeight: '700' }}>{activeModal.title}</h3>
                                    <p className="subtitle" style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8' }}>
                                        {activeModal.type === 'resolved_prompt' ? 'Texto exato enviado ao modelo principal (GPT/Claude)' : activeModal.type === 'pre_router_prompt' ? 'Prompt do classificador inicial (Pre-Router)' : 'Resultado da decisão estruturada do classificador'}
                                    </p>
                                </div>
                            </div>
                            <button className="close-btn-top-right" onClick={() => { setActiveModal(null); setCopied(false); }} style={{
                                position: 'absolute',
                                top: '50%',
                                right: '24px',
                                transform: 'translateY(-50%)',
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                background: 'rgba(255, 255, 255, 0.03)',
                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                color: '#94a3b8',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}>✕</button>
                        </div>
                        
                        {/* Seletor de abas se for Pre-Router */}
                        {activeModal.type === 'pre_router' && activeModal.rawData && (
                            <div className="modal-tabs" style={{
                                display: 'flex',
                                gap: '8px',
                                padding: '16px 32px',
                                background: 'rgba(15, 23, 42, 0.2)',
                                borderBottom: '1px solid rgba(255,255,255,0.05)',
                                overflowX: 'auto',
                                overflowY: 'hidden',
                                flexShrink: 0,
                                alignItems: 'center'
                            }}>
                                <button 
                                    onClick={() => setActivePreRouterTab('classifications')}
                                    style={{
                                        background: activePreRouterTab === 'classifications' ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                                        border: '1px solid',
                                        borderColor: activePreRouterTab === 'classifications' ? 'rgba(99, 102, 241, 0.4)' : 'rgba(255, 255, 255, 0.05)',
                                        outline: 'none',
                                        color: activePreRouterTab === 'classifications' ? '#818cf8' : '#94a3b8',
                                        padding: '8px 16px',
                                        borderRadius: '8px',
                                        fontSize: '0.8rem',
                                        cursor: 'pointer',
                                        fontWeight: '600',
                                        transition: 'all 0.2s',
                                        boxShadow: activePreRouterTab === 'classifications' ? '0 0 12px rgba(99, 102, 241, 0.2)' : 'none'
                                    }}
                                >
                                    🔍 Classificação de Intenção
                                </button>
                                <button 
                                    onClick={() => setActivePreRouterTab('questions')}
                                    style={{
                                        background: activePreRouterTab === 'questions' ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                                        border: '1px solid',
                                        borderColor: activePreRouterTab === 'questions' ? 'rgba(99, 102, 241, 0.4)' : 'rgba(255, 255, 255, 0.05)',
                                        outline: 'none',
                                        color: activePreRouterTab === 'questions' ? '#818cf8' : '#94a3b8',
                                        padding: '8px 16px',
                                        borderRadius: '8px',
                                        fontSize: '0.8rem',
                                        cursor: 'pointer',
                                        fontWeight: '600',
                                        transition: 'all 0.2s',
                                        boxShadow: activePreRouterTab === 'questions' ? '0 0 12px rgba(99, 102, 241, 0.2)' : 'none'
                                    }}
                                >
                                    ❓ Perguntas Extraídas
                                </button>
                                <button 
                                    onClick={() => setActivePreRouterTab('memory')}
                                    style={{
                                        background: activePreRouterTab === 'memory' ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                                        border: '1px solid',
                                        borderColor: activePreRouterTab === 'memory' ? 'rgba(99, 102, 241, 0.4)' : 'rgba(255, 255, 255, 0.05)',
                                        outline: 'none',
                                        color: activePreRouterTab === 'memory' ? '#818cf8' : '#94a3b8',
                                        padding: '8px 16px',
                                        borderRadius: '8px',
                                        fontSize: '0.8rem',
                                        cursor: 'pointer',
                                        fontWeight: '600',
                                        transition: 'all 0.2s',
                                        boxShadow: activePreRouterTab === 'memory' ? '0 0 12px rgba(99, 102, 241, 0.2)' : 'none'
                                    }}
                                >
                                    💾 Resumo de Memória
                                </button>
                            </div>
                        )}

                        {/* Seletor de abas se for Resolved Prompt */}
                        {activeModal.type === 'resolved_prompt' && (
                            <div className="modal-tabs" style={{
                                display: 'flex',
                                gap: '8px',
                                padding: '16px 32px',
                                background: 'rgba(15, 23, 42, 0.2)',
                                borderBottom: '1px solid rgba(255,255,255,0.05)',
                                overflowX: 'auto',
                                overflowY: 'hidden',
                                flexShrink: 0,
                                alignItems: 'center'
                            }}>
                                <button 
                                    onClick={() => setActiveResolvedPromptTab('static')}
                                    style={{
                                        background: activeResolvedPromptTab === 'static' ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                                        border: '1px solid',
                                        borderColor: activeResolvedPromptTab === 'static' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(255, 255, 255, 0.05)',
                                        outline: 'none',
                                        color: activeResolvedPromptTab === 'static' ? '#34d399' : '#94a3b8',
                                        padding: '8px 16px',
                                        borderRadius: '8px',
                                        fontSize: '0.8rem',
                                        cursor: 'pointer',
                                        fontWeight: '600',
                                        transition: 'all 0.2s',
                                        boxShadow: activeResolvedPromptTab === 'static' ? '0 0 12px rgba(16, 185, 129, 0.2)' : 'none'
                                    }}
                                >
                                    📄 Prompt Estático (Fixo)
                                </button>
                                <button 
                                    onClick={() => setActiveResolvedPromptTab('dynamic')}
                                    style={{
                                        background: activeResolvedPromptTab === 'dynamic' ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                                        border: '1px solid',
                                        borderColor: activeResolvedPromptTab === 'dynamic' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(255, 255, 255, 0.05)',
                                        outline: 'none',
                                        color: activeResolvedPromptTab === 'dynamic' ? '#34d399' : '#94a3b8',
                                        padding: '8px 16px',
                                        borderRadius: '8px',
                                        fontSize: '0.8rem',
                                        cursor: 'pointer',
                                        fontWeight: '600',
                                        transition: 'all 0.2s',
                                        boxShadow: activeResolvedPromptTab === 'dynamic' ? '0 0 12px rgba(16, 185, 129, 0.2)' : 'none'
                                    }}
                                >
                                    ⚡ Blocos Dinâmicos (Condicionais)
                                </button>
                                <button 
                                    onClick={() => setActiveResolvedPromptTab('injected')}
                                    style={{
                                        background: activeResolvedPromptTab === 'injected' ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                                        border: '1px solid',
                                        borderColor: activeResolvedPromptTab === 'injected' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(255, 255, 255, 0.05)',
                                        outline: 'none',
                                        color: activeResolvedPromptTab === 'injected' ? '#34d399' : '#94a3b8',
                                        padding: '8px 16px',
                                        borderRadius: '8px',
                                        fontSize: '0.8rem',
                                        cursor: 'pointer',
                                        fontWeight: '600',
                                        transition: 'all 0.2s',
                                        boxShadow: activeResolvedPromptTab === 'injected' ? '0 0 12px rgba(16, 185, 129, 0.2)' : 'none'
                                    }}
                                >
                                    🔌 Injetado pelo Código
                                </button>
                                <button 
                                    onClick={() => setActiveResolvedPromptTab('variables')}
                                    style={{
                                        background: activeResolvedPromptTab === 'variables' ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                                        border: '1px solid',
                                        borderColor: activeResolvedPromptTab === 'variables' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(255, 255, 255, 0.05)',
                                        outline: 'none',
                                        color: activeResolvedPromptTab === 'variables' ? '#34d399' : '#94a3b8',
                                        padding: '8px 16px',
                                        borderRadius: '8px',
                                        fontSize: '0.8rem',
                                        cursor: 'pointer',
                                        fontWeight: '600',
                                        transition: 'all 0.2s',
                                        boxShadow: activeResolvedPromptTab === 'variables' ? '0 0 12px rgba(16, 185, 129, 0.2)' : 'none'
                                    }}
                                >
                                    📊 Variáveis Injetadas
                                </button>
                                <button 
                                    onClick={() => setActiveResolvedPromptTab('full')}
                                    style={{
                                        background: activeResolvedPromptTab === 'full' ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                                        border: '1px solid',
                                        borderColor: activeResolvedPromptTab === 'full' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(255, 255, 255, 0.05)',
                                        outline: 'none',
                                        color: activeResolvedPromptTab === 'full' ? '#34d399' : '#94a3b8',
                                        padding: '8px 16px',
                                        borderRadius: '8px',
                                        fontSize: '0.8rem',
                                        cursor: 'pointer',
                                        fontWeight: '600',
                                        transition: 'all 0.2s',
                                        boxShadow: activeResolvedPromptTab === 'full' ? '0 0 12px rgba(16, 185, 129, 0.2)' : 'none'
                                    }}
                                >
                                    📄 Prompt Completo
                                </button>
                            </div>
                        )}

                        <div className="modal-body-scroll" style={{ 
                            flex: 1, 
                            overflowY: 'auto', 
                            padding: '32px',
                            background: 'transparent'
                        }}>
                            {activeModal.type === 'pre_router' && activePreRouterTab !== 'raw' && activeModal.rawData ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', color: '#e2e8f0', textAlign: 'left' }}>
                                    {activePreRouterTab === 'classifications' && (
                                        <div style={{ background: 'rgba(7, 10, 19, 0.4)', padding: '24px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                            <h4 style={{ margin: '0 0 16px 0', color: '#fbbf24', fontSize: '1rem' }}>Filtros e Intenções do Usuário</h4>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px' }}>
                                                {Object.entries(activeModal.rawData)
                                                    .filter(([key]) => typeof activeModal.rawData[key] === 'boolean' || key === 'id_agente_alvo')
                                                    .map(([key, val]) => (
                                                        <div key={key} style={{
                                                            background: 'rgba(255, 255, 255, 0.03)',
                                                            border: '1px solid rgba(255,255,255,0.05)',
                                                            borderRadius: '10px',
                                                            padding: '12px 16px',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'space-between'
                                                        }}>
                                                            <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: '500' }}>{key}</span>
                                                            <span style={{
                                                                fontSize: '0.8rem',
                                                                fontWeight: 'bold',
                                                                color: typeof val === 'boolean' ? (val ? '#4ade80' : '#f87171') : '#6366f1',
                                                                background: typeof val === 'boolean' ? (val ? 'rgba(74, 222, 128, 0.1)' : 'rgba(248, 113, 113, 0.1)') : 'rgba(99, 102, 241, 0.1)',
                                                                padding: '4px 10px',
                                                                borderRadius: '6px'
                                                            }}>
                                                                {typeof val === 'boolean' ? (val ? 'Sim (True)' : 'Não (False)') : val}
                                                            </span>
                                                        </div>
                                                    ))}
                                            </div>
                                        </div>
                                    )}

                                    {activePreRouterTab === 'questions' && (
                                        <div style={{ background: 'rgba(7, 10, 19, 0.4)', padding: '24px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                            <h4 style={{ margin: '0 0 12px 0', color: '#fbbf24', fontSize: '1rem' }}>Perguntas Extraídas</h4>
                                            <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '0 0 16px 0' }}>
                                                Perguntas e dúvidas extraídas pelo classificador para alimentar o RAG ou busca de conhecimento.
                                            </p>
                                            <div style={{
                                                background: 'rgba(255,255,255,0.02)',
                                                padding: '16px 20px',
                                                borderRadius: '12px',
                                                borderLeft: '4px solid #fbbf24',
                                                fontSize: '0.9rem',
                                                lineHeight: '1.6',
                                                color: activeModal.rawData.perguntas_extraidas ? '#f8fafc' : '#64748b',
                                                fontStyle: activeModal.rawData.perguntas_extraidas ? 'normal' : 'italic'
                                            }}>
                                                {activeModal.rawData.perguntas_extraidas || "Nenhuma pergunta foi extraída desta mensagem."}
                                            </div>
                                        </div>
                                    )}

                                    {activePreRouterTab === 'memory' && (
                                        <div style={{ background: 'rgba(7, 10, 19, 0.4)', padding: '24px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                            <h4 style={{ margin: '0 0 12px 0', color: '#fbbf24', fontSize: '1rem' }}>Resumo de Memórias</h4>
                                            <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '0 0 16px 0' }}>
                                                Resumo condensado das interações anteriores mantido no contexto do Pre-Router.
                                            </p>
                                            <div style={{
                                                background: 'rgba(255,255,255,0.02)',
                                                padding: '16px 20px',
                                                borderRadius: '12px',
                                                borderLeft: '4px solid #6366f1',
                                                fontSize: '0.9rem',
                                                lineHeight: '1.6',
                                                color: activeModal.rawData.resumo_memorias ? '#f8fafc' : '#64748b',
                                                fontStyle: activeModal.rawData.resumo_memorias ? 'normal' : 'italic',
                                                whiteSpace: 'pre-wrap'
                                            }}>
                                                {activeModal.rawData.resumo_memorias || "Nenhum histórico ou memória foi processado ainda."}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : activeModal.type === 'resolved_prompt' ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', color: '#e2e8f0', textAlign: 'left' }}>
                                    {activeResolvedPromptTab === 'static' && (
                                        <div style={{ background: 'rgba(7, 10, 19, 0.4)', padding: '24px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                            <h4 style={{ margin: '0 0 12px 0', color: '#34d399', fontSize: '1rem' }}>Prompt Estático (Instruções e Identidade)</h4>
                                            <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '0 0 16px 0' }}>
                                                Instruções permanentes e identidade base do assistente configuradas no painel.
                                            </p>
                                            <pre style={{ 
                                                fontSize: '0.85rem', 
                                                background: 'rgba(7, 10, 19, 0.2)', 
                                                padding: '16px', 
                                                borderRadius: '12px', 
                                                whiteSpace: 'pre-wrap', 
                                                wordBreak: 'break-word', 
                                                fontFamily: "monospace", 
                                                color: '#cbd5e1',
                                                margin: 0
                                            }}>
                                                {(() => {
                                                    // Extrai a parte estática removendo as diretrizes de segurança de código, memórias ou RAG injetados
                                                    const lines = activeModal.content.split('\n');
                                                    const cleanLines = [];
                                                    for (const line of lines) {
                                                        if (line.includes('### DIRETRIZES DE SEGURANÇA E ESTILO') || 
                                                            line.includes('# CONTEXTO RAG:') || 
                                                            line.includes('# RESUMO DAS MEMÓRIAS')) {
                                                            break;
                                                        }
                                                        cleanLines.push(line);
                                                    }
                                                    return cleanLines.join('\n').trim();
                                                })()}
                                            </pre>
                                        </div>
                                    )}

                                    {activeResolvedPromptTab === 'dynamic' && (
                                        <div style={{ background: 'rgba(7, 10, 19, 0.4)', padding: '24px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                            <h4 style={{ margin: '0 0 12px 0', color: '#34d399', fontSize: '1rem' }}>Blocos Dinâmicos e Qualificação</h4>
                                            <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '0 0 16px 0' }}>
                                                Protocolos de qualificação de leads dinâmicos ativos para esta sessão.
                                            </p>
                                            <pre style={{ 
                                                fontSize: '0.85rem', 
                                                background: 'rgba(7, 10, 19, 0.2)', 
                                                padding: '16px', 
                                                borderRadius: '12px', 
                                                whiteSpace: 'pre-wrap', 
                                                wordBreak: 'break-word', 
                                                fontFamily: "monospace", 
                                                color: '#cbd5e1',
                                                margin: 0
                                            }}>
                                                {(() => {
                                                    // Filtra as linhas de qualificação
                                                    const lines = activeModal.content.split('\n');
                                                    const qualifLines = [];
                                                    let isQualif = false;
                                                    for (const line of lines) {
                                                        if (line.includes('🎯 **QUALIFICAÇÃO DE LEAD')) {
                                                            isQualif = true;
                                                        }
                                                        if (isQualif) {
                                                            if (line.includes('### DIRETRIZES DE SEGURANÇA')) {
                                                                break;
                                                            }
                                                            qualifLines.push(line);
                                                        }
                                                    }
                                                    return qualifLines.join('\n').trim() || "Nenhum bloco de qualificação dinâmico ou condicional foi ativado para esta resposta.";
                                                })()}
                                            </pre>
                                        </div>
                                    )}

                                    {activeResolvedPromptTab === 'injected' && (
                                        <div style={{ background: 'rgba(7, 10, 19, 0.4)', padding: '24px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                            <h4 style={{ margin: '0 0 12px 0', color: '#34d399', fontSize: '1rem' }}>Injetado Automaticamente pelo Código</h4>
                                            <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '0 0 16px 0' }}>
                                                Conteúdos de segurança e regras injetados nos bastidores (Blacklist de concorrentes, Políticas de Desconto, jargões, RAG e histórico).
                                            </p>
                                            <pre style={{ 
                                                fontSize: '0.85rem', 
                                                background: 'rgba(7, 10, 19, 0.2)', 
                                                padding: '16px', 
                                                borderRadius: '12px', 
                                                whiteSpace: 'pre-wrap', 
                                                wordBreak: 'break-word', 
                                                fontFamily: "monospace", 
                                                color: '#cbd5e1',
                                                margin: 0
                                            }}>
                                                {(() => {
                                                    // Filtra as diretrizes de segurança
                                                    const lines = activeModal.content.split('\n');
                                                    const injectedLines = [];
                                                    let isInjected = false;
                                                    for (const line of lines) {
                                                        if (line.includes('### DIRETRIZES DE SEGURANÇA') || line.includes('# CONTEXTO RAG:')) {
                                                            isInjected = true;
                                                        }
                                                        if (isInjected) {
                                                            injectedLines.push(line);
                                                        }
                                                    }
                                                    return injectedLines.join('\n').trim() || "Nenhuma regra de segurança ou RAG externa foi injetada nesta resposta.";
                                                })()}
                                            </pre>
                                        </div>
                                    )}

                                    {activeResolvedPromptTab === 'variables' && (
                                        <div style={{ background: 'rgba(7, 10, 19, 0.4)', padding: '24px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                            <h4 style={{ margin: '0 0 12px 0', color: '#34d399', fontSize: '1rem' }}>Variáveis Ativas no Contexto</h4>
                                            <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '0 0 16px 0' }}>
                                                Valores das variáveis de contexto (incluindo temporais, memórias e integrações) injetadas para esta resposta específica.
                                            </p>
                                            {activeModal.rawData?.context_variables && Object.keys(activeModal.rawData.context_variables).length > 0 ? (
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px' }}>
                                                    {Object.entries(activeModal.rawData.context_variables).map(([key, val]) => (
                                                        <div key={key} style={{
                                                            background: 'rgba(255, 255, 255, 0.03)',
                                                            border: '1px solid rgba(255,255,255,0.05)',
                                                            borderRadius: '10px',
                                                            padding: '12px 16px',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'space-between'
                                                        }}>
                                                            <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: '500' }}>{key}</span>
                                                            <span style={{
                                                                fontSize: '0.8rem',
                                                                fontWeight: 'bold',
                                                                color: '#6366f1',
                                                                background: 'rgba(99, 102, 241, 0.1)',
                                                                padding: '4px 10px',
                                                                borderRadius: '6px'
                                                            }}>
                                                                {val === null || val === undefined ? 'null' : String(val)}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p style={{ fontSize: '0.85rem', color: '#64748b', fontStyle: 'italic', margin: 0 }}>
                                                    Nenhuma variável ativa ou injetada no contexto para esta resposta.
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    {activeResolvedPromptTab === 'full' && (
                                        <pre style={{ 
                                            fontSize: '0.85rem', 
                                            background: 'rgba(7, 10, 19, 0.4)', 
                                            padding: '24px', 
                                            borderRadius: '16px', 
                                            border: '1px solid rgba(255,255,255,0.05)',
                                            whiteSpace: 'pre-wrap',
                                            wordBreak: 'break-word',
                                            fontFamily: "'Fira Code', 'Courier New', Courier, monospace",
                                            color: '#cbd5e1',
                                            margin: 0,
                                            textAlign: 'left',
                                            lineHeight: '1.6',
                                            overflowX: 'auto'
                                        }}>
                                            {activeModal.content}
                                        </pre>
                                    )}
                                </div>
                            ) : (
                                <pre style={{ 
                                    fontSize: '0.85rem', 
                                    background: 'rgba(7, 10, 19, 0.4)', 
                                    padding: '24px', 
                                    borderRadius: '16px', 
                                    border: '1px solid rgba(255,255,255,0.05)',
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-word',
                                    fontFamily: "'Fira Code', 'Courier New', Courier, monospace",
                                    color: '#cbd5e1',
                                    margin: 0,
                                    textAlign: 'left',
                                    lineHeight: '1.6',
                                    overflowX: 'auto'
                                }}>
                                    {activeModal.type === 'pre_router' && activeModal.rawData
                                        ? JSON.stringify(Object.fromEntries(Object.entries(activeModal.rawData).filter(([k]) => !k.startsWith('_'))), null, 2)
                                        : activeModal.content
                                    }
                                </pre>
                            )}
                        </div>
                        <div className="modal-footer" style={{ 
                            display: 'flex', 
                            justifyContent: 'flex-end', 
                            gap: '12px',
                            padding: '24px 32px',
                            background: 'rgba(15, 23, 42, 0.4)',
                            borderTop: '1px solid rgba(255,255,255,0.08)',
                            flexDirection: 'row',
                            alignItems: 'center'
                        }}>
                            <button 
                                onClick={() => {
                                    const textToCopy = activeModal.type === 'pre_router' && activePreRouterTab !== 'raw' && activeModal.rawData
                                        ? (activePreRouterTab === 'classifications' ? JSON.stringify(Object.fromEntries(Object.entries(activeModal.rawData).filter(([k]) => typeof activeModal.rawData[k] === 'boolean' || k === 'id_agente_alvo')), null, 2)
                                          : activePreRouterTab === 'questions' ? (activeModal.rawData.perguntas_extraidas || '')
                                          : (activeModal.rawData.resumo_memorias || ''))
                                        : activeModal.content;
                                    navigator.clipboard.writeText(textToCopy);
                                    setCopied(true);
                                    window.dispatchEvent(new CustomEvent('app:toast', {
                                        detail: { message: "Conteúdo copiado com sucesso!", type: "success" }
                                    }));
                                    setTimeout(() => setCopied(false), 2000);
                                }} 
                                style={{
                                    background: 'rgba(255, 255, 255, 0.04)',
                                    border: '1px solid rgba(255, 255, 255, 0.08)',
                                    color: '#e2e8f0',
                                    padding: '10px 20px',
                                    borderRadius: '10px',
                                    fontSize: '0.85rem',
                                    cursor: 'pointer',
                                    fontWeight: '600',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    transition: 'all 0.2s'
                                }}
                                className="modal-btn-cancel-custom"
                            >
                                {copied ? '✅ Copiado!' : '📋 Copiar Conteúdo'}
                            </button>
                            <button 
                                onClick={() => { setActiveModal(null); setCopied(false); }}
                                style={{
                                    background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                                    border: 'none',
                                    color: '#ffffff',
                                    padding: '10px 24px',
                                    borderRadius: '10px',
                                    fontSize: '0.85rem',
                                    cursor: 'pointer',
                                    fontWeight: '700',
                                    boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
                                    transition: 'all 0.2s'
                                }}
                                className="modal-btn-primary-custom"
                            >
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
};

export default MessageBubble;


