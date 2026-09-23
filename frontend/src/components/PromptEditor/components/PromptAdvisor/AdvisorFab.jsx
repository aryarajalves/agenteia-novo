import React from 'react';

const AdvisorFab = ({
    showAdvisorChat,
    isChatMaximized,
    setShowAdvisorChat,
    handleCloseAdvisor
}) => {
    if (showAdvisorChat && isChatMaximized) return null;

    return (
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
    );
};

export default AdvisorFab;
