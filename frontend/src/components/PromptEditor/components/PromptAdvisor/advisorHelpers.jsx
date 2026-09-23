import React, { useState, useEffect } from 'react';

export const useModalDetection = () => {
    const [hasOpenModal, setHasOpenModal] = useState(false);

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

    return hasOpenModal;
};

export const calculateCost = (usage, model) => {
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

export const formatMessageContent = (content, scrollToLine) => {
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
