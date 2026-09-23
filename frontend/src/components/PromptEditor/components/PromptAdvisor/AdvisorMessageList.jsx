import React from 'react';
import { formatMessageContent, calculateCost } from './advisorHelpers';

const AdvisorMessageList = ({
    advisorMessages,
    isAdvisorLoading,
    scrollToLine,
    messagesEndRef
}) => {
    return (
        <div className="advisor-messages custom-scrollbar">
            {advisorMessages.map((msg, i) => (
                <div key={i} className={`advisor-msg-container ${msg.role}`}>
                    <div className={`advisor-msg ${msg.role}`}>
                        {msg.imageUrl && (
                            <div className="advisor-msg-image">
                                <img src={msg.imageUrl} alt="Anexo" />
                            </div>
                        )}
                        {formatMessageContent(msg.content, scrollToLine)}
                    </div>
                    {msg.role === 'assistant' && msg.usage && (
                        <div className="advisor-msg-meta">
                            <div className="meta-info-item">
                                <span className="meta-model">{msg.model || 'GPT-4o'}</span>
                            </div>
                            <span className="meta-divider">•</span>
                            <div className="meta-info-item">
                                <span className="meta-tokens">
                                    {msg.usage?.total_tokens?.toLocaleString('pt-BR')} tokens
                                </span>
                            </div>
                            <span className="meta-divider">•</span>
                            <div className="meta-info-item">
                                <span className="meta-cost">
                                    {calculateCost(msg.usage, msg.model)?.formatted}
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            ))}
            {isAdvisorLoading && (
                <div className="advisor-loading">
                    <div className="dot"></div>
                    <div className="dot"></div>
                    <div className="dot"></div>
                </div>
            )}
            <div ref={messagesEndRef} />
        </div>
    );
};

export default AdvisorMessageList;
