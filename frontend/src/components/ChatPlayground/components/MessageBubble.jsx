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

    if (msg.isLink) {
        return <LinkMessageBubble msg={msg} />;
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
