import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { usePrompt } from '../PromptContext';
import '../styles/PromptAdvisor.css';

const PromptAdvisor = () => {
    const { 
        advisorMessages, 
        isAdvisorLoading, 
        handleAdvisorMessage, 
        handleApplySuggestions,
        handleAdvisorSearch,
        handlePublishPrompt,
        handleResetAdvisorMemory,
        isApplyingSuggestion,
        showAdvisorChat,
        setShowAdvisorChat,
        scrollToLine
    } = usePrompt();
    
    const [inputValue, setInputValue] = useState('');
    const [isInputMaximized, setIsInputMaximized] = useState(false);
    const [isChatMaximized, setIsChatMaximized] = useState(false);
    const [selectedImage, setSelectedImage] = useState(null);
    const [hasOpenModal, setHasOpenModal] = useState(false);
    const fileInputRef = useRef(null);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        const checkModals = () => {
            const modalSelectors = [
                '.modal-overlay',
                '.guide-modal-overlay',
                '.premium-modal-overlay',
                '.confirm-modal-overlay',
                '.kb-edit-modal-overlay',
                '.training-modal-overlay',
                '.uq-modal-overlay',
                '.draft-modal-overlay',
                '.cond-modal-overlay',
                '.rag-modal-overlay',
                '[class*="modal-overlay"]',
                '[class*="modal-backdrop"]'
            ];
            const modalExists = modalSelectors.some(sel => {
                const el = document.querySelector(sel);
                return el && !el.closest('.prompt-advisor-wrapper');
            });
            setHasOpenModal(modalExists);
        };

        checkModals();
        const observer = new MutationObserver(checkModals);
        observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style'] });
        return () => observer.disconnect();
    }, []);

    const calculateCost = (usage, model) => {
        if (!usage) return null;
        
        // Preços em USD por 1M tokens (Aproximados)
        const prices = {
            'gpt-4o': { input: 2.50, output: 10.00 },
            'gpt-4o-mini': { input: 0.15, output: 0.60 },
            'default': { input: 2.50, output: 10.00 }
        };
        
        // Normalizar nome do modelo
        const modelName = model?.toLowerCase() || '';
        const modelKey = modelName.includes('mini') ? 'gpt-4o-mini' : 'gpt-4o';
        const price = prices[modelKey] || prices['default'];
        
        const inputCost = (usage.prompt_tokens / 1000000) * price.input;
        const outputCost = (usage.completion_tokens / 1000000) * price.output;
        const totalUSD = inputCost + outputCost;
        
        // Converter para BRL (Câmbio ~R$ 6.00)
        const totalBRL = totalUSD * 6.00;
        
        return {
            formatted: totalBRL.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 4 }),
            model: modelKey
        };
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (showAdvisorChat && advisorMessages.length > 0) {
            scrollToBottom();
        }
    }, [advisorMessages, showAdvisorChat, isChatMaximized]);

    const formatMessageContent = (content) => {
        if (!content) return null;
        
        return content.split('\n').map((line, i) => {
            // Regex que captura simultaneamente menções de linha (com/sem bold) e negritos normais
            const combinedRegex = /(\b(?:linha|linhas|Linha|Linhas)\s*(?:\*\*)?(?:\[)?(\d+)(?:\])?(?:\*\*)?|\*\*.*?\*\*)/gi;
            const parts = [];
            let lastIndex = 0;
            let match;

            while ((match = combinedRegex.exec(line)) !== null) {
                if (match.index > lastIndex) {
                    parts.push(line.substring(lastIndex, match.index));
                }

                const fullMatch = match[0];
                const lineNumberStr = match[2];

                if (lineNumberStr) {
                    const lineNumber = parseInt(lineNumberStr, 10);
                    parts.push(
                        <button
                            key={`line-link-${i}-${match.index}`}
                            type="button"
                            className="advisor-line-link"
                            onClick={(e) => {
                                e.stopPropagation();
                                if (scrollToLine) {
                                    scrollToLine(lineNumber);
                                }
                            }}
                            title={`Clique para rolar o editor de prompt até a Linha ${lineNumber}`}
                        >
                            📍 Linha {lineNumber}
                        </button>
                    );
                } else if (fullMatch.startsWith('**') && fullMatch.endsWith('**')) {
                    parts.push(
                        <strong key={`bold-${i}-${match.index}`}>
                            {fullMatch.slice(2, -2)}
                        </strong>
                    );
                }

                lastIndex = combinedRegex.lastIndex;
            }

            if (lastIndex < line.length) {
                parts.push(line.substring(lastIndex));
            }

            return (
                <div key={i} className="msg-line">
                    {parts.length > 0 ? parts : (line || <br />)}
                </div>
            );
        });
    };

    const onSend = () => {
        if ((!inputValue.trim() && !selectedImage) || isAdvisorLoading) return;
        handleAdvisorMessage(inputValue, selectedImage);
        setInputValue('');
        setSelectedImage(null);
        if (isInputMaximized) setIsInputMaximized(false);
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setSelectedImage(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const onSearch = () => {
        if (isAdvisorLoading) return;
        const query = inputValue.trim();
        if (query) {
            handleAdvisorSearch(query);
            setInputValue('');
            if (isInputMaximized) setIsInputMaximized(false);
        } else {
            handleAdvisorMessage("Como posso buscar informações no meu prompt?");
        }
    };

    const handlePaste = (e) => {
        const items = e.clipboardData?.items;
        if (items) {
            for (let i = 0; i < items.length; i++) {
                if (items[i].type.indexOf('image') !== -1) {
                    const file = items[i].getAsFile();
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        setSelectedImage(reader.result);
                    };
                    reader.readAsDataURL(file);
                    break;
                }
            }
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onSend();
        }
    };

    const handleCloseAdvisor = () => {
        setShowAdvisorChat(false);
        setIsChatMaximized(false);
        setIsInputMaximized(false);
    };

    const advisorContent = (
        <div className="prompt-advisor-wrapper">
            {showAdvisorChat && (
                <div className={`advisor-chat-container ${isInputMaximized ? 'input-maximized' : ''} ${isChatMaximized ? 'chat-maximized' : ''}`}>
                    <header className="advisor-header">
                        <div className="advisor-header-info">
                            <div className="advisor-status-dot"></div>
                            <span className="advisor-header-title">Assistente de Prompt</span>
                            {isChatMaximized && <span className="advisor-fullscreen-badge">Tela Cheia</span>}
                        </div>
                        <div className="advisor-header-actions">
                            <button 
                                className="advisor-header-btn advisor-btn-reset"
                                onClick={handleResetAdvisorMemory}
                                disabled={isAdvisorLoading}
                                title="Reiniciar Memória"
                            >
                                🔄
                            </button>
                            <button 
                                className="advisor-header-btn advisor-btn-maximize"
                                onClick={() => setIsChatMaximized(!isChatMaximized)}
                                title={isChatMaximized ? "Restaurar Janela" : "Maximizar Janela (Tela Cheia)"}
                            >
                                {isChatMaximized ? '🗗' : '🗖'}
                            </button>
                            <button 
                                className="advisor-header-btn advisor-btn-close"
                                onClick={handleCloseAdvisor}
                                title="Fechar Assistente"
                            >
                                ✕
                            </button>
                        </div>
                    </header>
                    
                    <div className="advisor-messages custom-scrollbar">
                        {advisorMessages.map((msg, i) => (
                            <div key={i} className={`advisor-msg-container ${msg.role}`}>
                                <div className={`advisor-msg ${msg.role}`}>
                                    {msg.imageUrl && (
                                        <div className="advisor-msg-image">
                                            <img src={msg.imageUrl} alt="Anexo" />
                                        </div>
                                    )}
                                    {formatMessageContent(msg.content)}
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
                    
                    <footer className="advisor-input-area">
                        {selectedImage && (
                            <div className="advisor-image-preview-container">
                                <img src={selectedImage} alt="Preview" className="advisor-image-preview" />
                                <button className="remove-image-btn" onClick={() => setSelectedImage(null)}>✕</button>
                            </div>
                        )}
                        <div className="advisor-actions">
                            <button 
                                className="advisor-action-chip"
                                onClick={onSearch}
                                disabled={isAdvisorLoading}
                                title="Buscar no conteúdo do prompt"
                            >
                                🔍 Buscar Info
                            </button>
                            <button 
                                className="advisor-action-chip primary"
                                onClick={handleApplySuggestions}
                                disabled={isAdvisorLoading}
                                title="Aplicar sugestões ao editor"
                            >
                                ✨ Aplicar ao Editor
                            </button>
                        </div>
                        <div className="advisor-input-row">
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                style={{ display: 'none' }} 
                                accept="image/*"
                                onChange={handleFileChange}
                            />
                            <textarea 
                                className="advisor-input-textarea custom-scrollbar"
                                placeholder={isApplyingSuggestion ? "Aplicando alterações..." : "Peça para buscar ou alterar algo..."}
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyDown={handleKeyPress}
                                onPaste={handlePaste}
                                disabled={isAdvisorLoading}
                                rows={isInputMaximized ? 6 : 1}
                            />
                            <div className="advisor-input-buttons">
                                <button 
                                    className="advisor-input-tool-btn"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isAdvisorLoading}
                                    title="Anexar Imagem"
                                >
                                    🖼️
                                </button>
                                <button 
                                    className={`advisor-input-tool-btn ${isInputMaximized ? 'active' : ''}`}
                                    onClick={() => setIsInputMaximized(!isInputMaximized)}
                                    title={isInputMaximized ? "Minimizar caixa" : "Maximizar caixa"}
                                >
                                    {isInputMaximized ? '🔽' : '🔼'}
                                </button>
                                <button 
                                    className="advisor-send-btn"
                                    onClick={onSend}
                                    disabled={isAdvisorLoading}
                                >
                                    ✈️
                                </button>
                            </div>
                        </div>
                    </footer>
                </div>
            )}

            {(!showAdvisorChat || !isChatMaximized) && (
                <button 
                    className={`advisor-fab ${showAdvisorChat ? 'active' : ''}`}
                    onClick={() => {
                        if (showAdvisorChat) {
                            handleCloseAdvisor();
                        } else {
                            setShowAdvisorChat(true);
                        }
                    }}
                    title="Assistente de Prompt"
                >
                    {showAdvisorChat ? '✖' : '🤖'}
                </button>
            )}
        </div>
    );

    if (hasOpenModal) return null;

    return ReactDOM.createPortal(advisorContent, document.body);
};

export default PromptAdvisor;
