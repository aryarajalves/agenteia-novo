import React from 'react';

export default function TrainingLoadingOverlay({
    isGenerating,
    isSaving,
    isQaMode
}) {
    if (!isGenerating && !isSaving) return null;

    return (
        <div className="training-loading-overlay">
            <div className="training-loading-box">
                <div className="training-loading-ring">
                    <div /><div /><div /><div />
                </div>
                <h3 className="training-loading-title">
                    {isSaving 
                        ? '💾 Gravando na Base de Conhecimento...'
                        : (isQaMode ? '🧠 Analisando com IA...' : '📑 Quebrando em Trechos...')
                    }
                </h3>
                <p className="training-loading-desc">
                    {isSaving
                        ? 'Integrando as novas perguntas e respostas à sua base de conhecimento. Por favor, aguarde...'
                        : (isQaMode
                            ? 'A IA está lendo a transcrição e formulando as perguntas e respostas. Aguarde...'
                            : 'Dividindo o texto em trechos sequenciais para a base de conhecimento...'
                          )
                    }
                </p>
                <div className="training-loading-dots">
                    <span /><span /><span />
                </div>
            </div>
        </div>
    );
}
