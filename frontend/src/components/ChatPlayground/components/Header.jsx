import React from 'react';
import { estimateTokens, formatTokenCount } from '../utils/tokenUtils';

const Header = ({
    isSidebarOpen,
    setIsSidebarOpen,
    agents,
    selectedAgentId,
    isBattleMode,
    battleTab,
    setBattleTab,
    challengerHotfixPrompt,
    setShowResetChatConfirm,
    handleExportTraining,
    setIsNavigating
}) => {
    const currentAgent = agents.find(a => a.id == selectedAgentId);
    const agentName = currentAgent?.name || 'Agente';

    return (
        <div className="chat-premium-header fade-in">
            <div className="agent-brand">
                <button
                    type="button"
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    className="toggle-sidebar-btn"
                    title={isSidebarOpen ? "Ocultar Painel Lateral" : "Exibir Painel Lateral"}
                >
                    {isSidebarOpen ? '◀' : '⚙️ Painel'}
                </button>
                <div className="agent-avatar-status">
                    <div className="avatar-mini">🤖</div>
                    <span className="status-dot"></span>
                </div>
                <div className="agent-meta-title">
                    <h3>{agentName}</h3>
                </div>
            </div>

            {isBattleMode && (
                <div className="arena-tabs-header">
                    <button 
                        type="button"
                        className={`arena-tab-btn ${battleTab === 'chat' ? 'active' : ''}`}
                        onClick={() => setBattleTab('chat')}
                        data-testid="arena-tab-chat"
                    >
                        💬 Arena
                    </button>
                    <button 
                        type="button"
                        className={`arena-tab-btn challenger-tab ${battleTab === 'prompt' ? 'active' : ''}`}
                        onClick={() => setBattleTab('prompt')}
                        data-testid="arena-tab-prompt"
                    >
                        🥊 Desafiante
                        {challengerHotfixPrompt && (
                            <span className="arena-tab-badge">
                                ~{formatTokenCount(estimateTokens(challengerHotfixPrompt))}t
                            </span>
                        )}
                    </button>
                </div>
            )}

            <div className="header-actions-row">
                <button
                    onClick={() => setShowResetChatConfirm(true)}
                    className="reset-chat-btn"
                    title="Resetar conversa atual com o agente"
                    data-testid="reset-chat-header-btn"
                >
                    🔄 Resetar
                </button>
                <button
                    onClick={handleExportTraining}
                    className="export-training-btn"
                    title="Exportar conversa completa em formato HTML para estudar e melhorar o prompt"
                    data-testid="export-training-btn"
                >
                    📄 Exportar
                </button>
                {selectedAgentId && (
                    <button
                        onClick={() => {
                            if (setIsNavigating) setIsNavigating(true);
                            window.location.href = `/agent/${selectedAgentId}?tab=prompts`;
                        }}
                        className="edit-prompt-link"
                        data-testid="edit-prompt-header-btn"
                        title="Editar Prompt do Agente"
                    >
                        ✏️ Prompt
                    </button>
                )}
            </div>
        </div>
    );
};

export default Header;

