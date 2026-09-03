import React from 'react';
import { estimateTokens, formatTokenCount } from '../utils/tokenUtils';

const ChallengerPromptEditor = ({
    value,
    onChange,
    onBackToChat,
    mainAgentPrompt,
    agentName
}) => {
    const tokenCount = estimateTokens(value || '');
    const charCount = (value || '').length;

    const handleCopyMainPrompt = () => {
        if (mainAgentPrompt) {
            onChange(mainAgentPrompt);
        }
    };

    const handleClearPrompt = () => {
        onChange('');
    };

    return (
        <div className="challenger-prompt-fullscreen fade-in">
            {/* Header do Editor */}
            <div className="challenger-prompt-header">
                <div className="challenger-prompt-title-group">
                    <div className="challenger-badge-icon">🥊</div>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <h3 style={{ margin: 0, color: '#fda4af', fontSize: '1.1rem', fontWeight: '800' }}>
                                Prompt do Desafiante (Arena A/B)
                            </h3>
                            <span className="token-badge-rose">
                                ⚡ ~{formatTokenCount(tokenCount)} tokens · {charCount} caracteres
                            </span>
                        </div>
                        <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
                            Personalize as instruções que serão testadas pelo modelo desafiante nesta rodada.
                        </p>
                    </div>
                </div>

                <div className="challenger-prompt-actions">
                    {mainAgentPrompt && (
                        <button
                            type="button"
                            onClick={handleCopyMainPrompt}
                            className="challenger-btn-secondary"
                            title="Clonar o prompt original para fazer alterações"
                        >
                            📋 Copiar Prompt de {agentName}
                        </button>
                    )}
                    {value && (
                        <button
                            type="button"
                            onClick={handleClearPrompt}
                            className="challenger-btn-secondary danger"
                            title="Limpar texto do prompt"
                        >
                            🗑️ Limpar
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={onBackToChat}
                        className="challenger-btn-primary"
                    >
                        💬 Ir para o Chat da Arena
                    </button>
                </div>
            </div>

            {/* Dica Rápida */}
            <div className="challenger-prompt-tip">
                <span>💡</span>
                <p>
                    <strong>Dica de Stress Test:</strong> Altere a postura, adicione restrições ou reformule instruções para comparar lado a lado com a versão estável do agente no chat.
                </p>
            </div>

            {/* Textarea em tela cheia */}
            <div className="challenger-prompt-body">
                <textarea
                    value={value || ''}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder="Digite ou cole aqui o prompt alternativo que você deseja testar no modelo desafiante..."
                    className="challenger-prompt-textarea"
                    autoFocus
                    spellCheck="false"
                />
            </div>
        </div>
    );
};

export default ChallengerPromptEditor;
