import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { usePrompt } from '../PromptContext';
import {
    useModalDetection,
    AdvisorHeader,
    AdvisorMessageList,
    AdvisorInputArea,
    AdvisorFab
} from './PromptAdvisor/index';
import '../styles/PromptAdvisor.css';

const PromptAdvisor = () => {
    const { 
        advisorMessages, 
        isAdvisorLoading, 
        handleAdvisorMessage, 
        handleApplySuggestions,
        handleAdvisorSearch,
        handleResetAdvisorMemory,
        isApplyingSuggestion,
        showAdvisorChat,
        setShowAdvisorChat,
        scrollToLine,
        isExpanded
    } = usePrompt();
    
    const [inputValue, setInputValue] = useState('');
    const [isInputMaximized, setIsInputMaximized] = useState(false);
    const [isChatMaximized, setIsChatMaximized] = useState(false);
    const [selectedImage, setSelectedImage] = useState(null);
    const fileInputRef = useRef(null);
    const messagesEndRef = useRef(null);

    const hasOpenModal = useModalDetection();

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (showAdvisorChat && advisorMessages.length > 0) {
            scrollToBottom();
        }
    }, [advisorMessages, showAdvisorChat, isChatMaximized]);

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
                    <AdvisorHeader 
                        isChatMaximized={isChatMaximized}
                        setIsChatMaximized={setIsChatMaximized}
                        handleResetAdvisorMemory={handleResetAdvisorMemory}
                        handleCloseAdvisor={handleCloseAdvisor}
                        isAdvisorLoading={isAdvisorLoading}
                    />
                    
                    <AdvisorMessageList 
                        advisorMessages={advisorMessages}
                        isAdvisorLoading={isAdvisorLoading}
                        scrollToLine={scrollToLine}
                        messagesEndRef={messagesEndRef}
                    />
                    
                    <AdvisorInputArea 
                        inputValue={inputValue}
                        setInputValue={setInputValue}
                        selectedImage={selectedImage}
                        setSelectedImage={setSelectedImage}
                        isInputMaximized={isInputMaximized}
                        setIsInputMaximized={setIsInputMaximized}
                        isAdvisorLoading={isAdvisorLoading}
                        isApplyingSuggestion={isApplyingSuggestion}
                        fileInputRef={fileInputRef}
                        handleFileChange={handleFileChange}
                        handleKeyPress={handleKeyPress}
                        handlePaste={handlePaste}
                        onSearch={onSearch}
                        handleApplySuggestions={handleApplySuggestions}
                        onSend={onSend}
                    />
                </div>
            )}

            <AdvisorFab 
                showAdvisorChat={showAdvisorChat}
                isChatMaximized={isChatMaximized}
                setShowAdvisorChat={setShowAdvisorChat}
                handleCloseAdvisor={handleCloseAdvisor}
            />
        </div>
    );

    if (hasOpenModal || isExpanded) return null;

    return ReactDOM.createPortal(advisorContent, document.body);
};

export default PromptAdvisor;
