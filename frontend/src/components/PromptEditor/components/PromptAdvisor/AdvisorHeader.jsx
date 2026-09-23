import React from 'react';

const AdvisorHeader = ({
    isChatMaximized,
    setIsChatMaximized,
    handleResetAdvisorMemory,
    handleCloseAdvisor,
    isAdvisorLoading
}) => {
    return (
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
    );
};

export default AdvisorHeader;
