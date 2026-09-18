import React, { useState } from 'react';
import MessageBubble from './MessageBubble';

const TypingIndicator = () => (
    <div className="typing-indicator"><span></span><span></span><span></span></div>
);

const MessageList = ({
    messages,
    battleMessages,
    isBattleMode,
    loading,
    agents,
    selectedAgentId,
    challengerAgentId,
    mainModelOverride,
    challengerModelOverride,
    scrollRef,
    battleScrollRef,
    isRegularUser,
    feedbackState,
    handleThumbsUp,
    handleThumbsDown,
    readFbFromStorage
}) => {
    const [activeDebugKey, setActiveDebugKey] = useState(null);
    const mainAgent = agents.find(a => a.id == selectedAgentId);
    const challengerAgent = agents.find(a => a.id == challengerAgentId);

    return (
        <main className={`chat-area ${isBattleMode ? 'split-view' : ''}`}>
            {/* Left Chat (Main) */}
            <div className="chat-column">
                {isBattleMode && (
                    <div className="column-header main-header">
                        🤖 {mainAgent?.name || 'Principal'}
                        <span className="model-tag">({mainModelOverride || mainAgent?.model})</span>
                    </div>
                )}
                <div className="messages-container" ref={scrollRef}>
                    {messages.map((msg, idx) => {
                        const debugKey = `main_${idx}`;
                        return (
                            <MessageBubble 
                                key={idx} 
                                msg={msg} 
                                msgIndex={idx} 
                                isRegularUser={isRegularUser}
                                feedbackState={feedbackState}
                                handleThumbsUp={handleThumbsUp}
                                handleThumbsDown={handleThumbsDown}
                                readFbFromStorage={readFbFromStorage}
                                selectedAgentId={selectedAgentId}
                                showDebug={activeDebugKey === debugKey}
                                setShowDebug={(nextVal) => {
                                    setActiveDebugKey(prev => {
                                        const isCurrentlyOpen = prev === debugKey;
                                        const shouldOpen = typeof nextVal === 'function' ? nextVal(isCurrentlyOpen) : nextVal;
                                        return shouldOpen ? debugKey : null;
                                    });
                                }}
                            />
                        );
                    })}
                    {loading && (
                        <div className="message-row assistant-row">
                            <div className="avatar assistant-avatar">🤖</div>
                            <div className="message-bubble assistant-bubble">
                                <TypingIndicator />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Right Chat (Challenger) */}
            {isBattleMode && (
                <div className="chat-column challenger-column">
                    <div className="column-header">
                        🥊 {challengerAgent?.name || 'Desafiante'}
                        <span className="model-tag">({challengerModelOverride || challengerAgent?.model})</span>
                    </div>
                    <div className="messages-container" ref={battleScrollRef}>
                        {battleMessages.map((msg, idx) => {
                            const debugKey = `challenger_${idx}`;
                            return (
                                <MessageBubble 
                                    key={idx} 
                                    msg={msg} 
                                    msgIndex={idx} 
                                    isRegularUser={isRegularUser}
                                    feedbackState={feedbackState}
                                    handleThumbsUp={handleThumbsUp}
                                    handleThumbsDown={handleThumbsDown}
                                    readFbFromStorage={readFbFromStorage}
                                    selectedAgentId={challengerAgentId}
                                    showDebug={activeDebugKey === debugKey}
                                    setShowDebug={(nextVal) => {
                                        setActiveDebugKey(prev => {
                                            const isCurrentlyOpen = prev === debugKey;
                                            const shouldOpen = typeof nextVal === 'function' ? nextVal(isCurrentlyOpen) : nextVal;
                                            return shouldOpen ? debugKey : null;
                                        });
                                    }}
                                />
                            );
                        })}
                        {loading && (
                            <div className="message-row assistant-row">
                                <div className="avatar assistant-avatar">🥊</div>
                                <div className="message-bubble assistant-bubble">
                                    <TypingIndicator />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </main>
    );
};

export default MessageList;
