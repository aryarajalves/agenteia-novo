import React, { useState } from 'react';
import { api } from '../../../api/client';
import {
    UserMessageBubble,
    LinkMessageBubble,
    MessageMetaBar,
    PromptModal,
    DebugPanel,
    SourceAttributionView
} from './MessageBubbleModules';
import { resolveMediaUrl } from '../../ConfigPanel/components/QuestionFunnels/utils/mediaUtils';

const MessageBubble = ({ 
    msg, 
    msgIndex, 
    isRegularUser, 
    feedbackState, 
    handleThumbsUp, 
    handleThumbsDown, 
    readFbFromStorage, 
    selectedAgentId,
    showDebug: propShowDebug,
    setShowDebug: propSetShowDebug
}) => {
    const [localShowDebug, setLocalShowDebug] = useState(false);
    const showDebug = propShowDebug !== undefined ? propShowDebug : localShowDebug;
    const setShowDebug = propSetShowDebug || setLocalShowDebug;
    const [showAttribution, setShowAttribution] = useState(false);
    const [attributionState, setAttributionState] = useState(null);
    const [attributionData, setAttributionData] = useState(null);
    const [activeModal, setActiveModal] = useState(null);
    const [activePreRouterTab, setActivePreRouterTab] = useState('classifications');
    const [activeResolvedPromptTab, setActiveResolvedPromptTab] = useState('static');
    const [explanationState, setExplanationState] = useState(null);
    const [explanationData, setExplanationData] = useState(null);
    
    // Estados do debate explicativo
    const [debateQuestion, setDebateQuestion] = useState('');
    const [debateHistory, setDebateHistory] = useState([]);
    const [debateCostBrl, setDebateCostBrl] = useState(0);
    const [debateLoading, setDebateLoading] = useState(false);
    const [debateError, setDebateError] = useState(null);

    const handleFetchAttribution = async () => {
        if (attributionState === 'loading' || attributionState === 'done') return;
        setAttributionState('loading');
        try {
            const resp = await api.post('/attribute-sources', {
                user_message: msg.userMessage || '',
                agent_response: msg.content || '',
                agent_id: selectedAgentId || msg.agent_id || null,
                resolved_prompt: msg.debug?.resolved_prompt || null,
                rag_items: msg.debug?.rag_items || [],
                context_variables: msg.debug?.context_variables || {},
                pre_router: msg.debug?.pre_router || null,
            });
            if (!resp.ok) throw new Error('Falha ao obter atribuição de fontes');
            const data = await resp.json();
            setAttributionData(data);
            setAttributionState('done');
        } catch (err) {
            console.error('Erro ao mapear fontes:', err);
            setAttributionState('error');
        }
    };

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
            setDebateQuestion(currentQuestion);
        } finally {
            setDebateLoading(false);
        }
    };

    if (msg.role === 'user') {
        return <UserMessageBubble msg={msg} />;
    }

    const explainProps = {
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
    };

    if (msg.isLink) {
        return (
            <>
                <LinkMessageBubble
                    msg={msg}
                    msgIndex={msgIndex}
                    isRegularUser={isRegularUser}
                    feedbackState={feedbackState}
                    handleThumbsUp={handleThumbsUp}
                    handleThumbsDown={handleThumbsDown}
                    readFbFromStorage={readFbFromStorage}
                    selectedAgentId={selectedAgentId}
                    showDebug={showDebug}
                    setShowDebug={setShowDebug}
                    showAttribution={showAttribution}
                    setShowAttribution={setShowAttribution}
                    handleFetchAttribution={handleFetchAttribution}
                    explanationData={explanationData}
                    debateCostBrl={debateCostBrl}
                    explainProps={explainProps}
                    setActiveModal={setActiveModal}
                    setActivePreRouterTab={setActivePreRouterTab}
                    setActiveResolvedPromptTab={setActiveResolvedPromptTab}
                    attributionState={attributionState}
                    attributionData={attributionData}
                />
                <PromptModal
                    activeModal={activeModal}
                    onClose={() => setActiveModal(null)}
                    activePreRouterTab={activePreRouterTab}
                    setActivePreRouterTab={setActivePreRouterTab}
                    activeResolvedPromptTab={activeResolvedPromptTab}
                    setActiveResolvedPromptTab={setActiveResolvedPromptTab}
                />
            </>
        );
    }


    return (
        <>
            <div className={`message-row assistant-row ${msg.isSplit ? 'is-split' : ''}`}>
                <div className="avatar assistant-avatar" style={{ visibility: msg.isSplit ? 'hidden' : 'visible' }}>🤖</div>
                <div className="message-bubble assistant-bubble">
                    {(() => {
                        const renderStepBody = (st, idx) => (
                            <div key={idx ?? 0} className="funnel-step-bubble" style={{ background: 'rgba(15, 23, 42, 0.65)', borderRadius: '10px', padding: '0.65rem 0.85rem', border: '1px solid rgba(255,255,255,0.07)' }}>
                                {st.type === 'audio' && (
                                    <div>
                                        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#34d399', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                            <span>🎙️</span> Mensagem de Áudio Gravado (PTT) {st.delay_seconds > 0 ? `· +${st.delay_seconds}s` : ''}
                                        </div>
                                        {st.media_url ? (
                                            <audio controls src={resolveMediaUrl(st.media_url)} style={{ width: '100%', height: '38px', borderRadius: '8px' }} />
                                        ) : (
                                            <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>[Áudio configurado sem URL]</div>
                                        )}
                                        {st.transcription && (
                                            <div style={{ fontSize: '0.76rem', color: '#cbd5e1', marginTop: '0.4rem', background: 'rgba(0,0,0,0.25)', padding: '0.4rem 0.6rem', borderRadius: '6px', borderLeft: '3px solid #10b981' }}>
                                                <span style={{ fontWeight: 600, color: '#34d399' }}>🧠 Transcrição / Memória: </span>
                                                "{st.transcription}"
                                            </div>
                                        )}
                                    </div>
                                )}
                                {st.type === 'text' && (
                                    <div style={{ whiteSpace: 'pre-wrap', fontSize: '0.92rem', color: '#f8fafc', lineHeight: '1.45' }}>
                                        {st.content}
                                    </div>
                                )}
                                {['image', 'video', 'document'].includes(st.type) && (
                                    <div>
                                        <div style={{ fontSize: '0.8rem', color: '#93c5fd', marginBottom: '0.2rem' }}>
                                            📁 {st.type.toUpperCase()}: <a href={st.media_url} target="_blank" rel="noreferrer" style={{ color: '#60a5fa' }}>Ver Anexo</a>
                                        </div>
                                        {st.content && <div style={{ fontSize: '0.88rem', color: '#f8fafc' }}>{st.content}</div>}
                                    </div>
                                )}
                            </div>
                        );

                        if (msg.funnel_step) {
                            return renderStepBody(msg.funnel_step, 0);
                        }

                        if (msg.funnel_steps && Array.isArray(msg.funnel_steps) && msg.funnel_steps.length > 0) {
                            return (
                                <div className="funnel-steps-container" style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                                    {msg.funnel_steps.map((st, idx) => renderStepBody(st, idx))}
                                </div>
                            );
                        }

                        return <div className="message-content" style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>;
                    })()}
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
                    <MessageMetaBar
                        msg={msg}
                        msgIndex={msgIndex}
                        isRegularUser={isRegularUser}
                        feedbackState={feedbackState}
                        handleThumbsUp={handleThumbsUp}
                        handleThumbsDown={handleThumbsDown}
                        readFbFromStorage={readFbFromStorage}
                        selectedAgentId={selectedAgentId}
                        showDebug={showDebug}
                        setShowDebug={setShowDebug}
                        showAttribution={showAttribution}
                        setShowAttribution={setShowAttribution}
                        handleFetchAttribution={handleFetchAttribution}
                        explanationData={explanationData}
                        debateCostBrl={debateCostBrl}
                    />
                    
                    {showAttribution && (
                        <SourceAttributionView
                            attributionState={attributionState}
                            attributionData={attributionData}
                            handleFetchAttribution={handleFetchAttribution}
                            onClose={() => setShowAttribution(false)}
                            selectedAgentId={selectedAgentId}
                        />
                    )}

                    <DebugPanel
                        msg={msg}
                        showDebug={showDebug}
                        setActiveModal={setActiveModal}
                        setActivePreRouterTab={setActivePreRouterTab}
                        setActiveResolvedPromptTab={setActiveResolvedPromptTab}
                        explainProps={explainProps}
                    />
                </div>
            </div>
            
            <PromptModal
                activeModal={activeModal}
                onClose={() => setActiveModal(null)}
                activePreRouterTab={activePreRouterTab}
                setActivePreRouterTab={setActivePreRouterTab}
                activeResolvedPromptTab={activeResolvedPromptTab}
                setActiveResolvedPromptTab={setActiveResolvedPromptTab}
            />
        </>
    );
};

export default MessageBubble;
