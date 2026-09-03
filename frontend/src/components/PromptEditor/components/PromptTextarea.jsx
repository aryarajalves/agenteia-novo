import React, { useRef } from 'react';
import { usePrompt } from '../PromptContext';

const LINE_HEIGHT_PX = 26; // sincronizado com CSS do editor

const PromptTextarea = () => {
    const {
        promptValue, onChangePrompt, validVarKeys, textareaRef,
        searchResults, currentResultIdx, setCurrentResultIdx,
        conditionalBlocks, setOpenCondEdit,
    } = usePrompt();

    const backdropRef = useRef(null);
    const overlayRef = useRef(null);
    const [indicator, setIndicator] = React.useState(null); // 'up' | 'down' | null

    const syncScroll = (e) => {
        if (backdropRef.current) {
            backdropRef.current.scrollTop = e.target.scrollTop;
            backdropRef.current.scrollLeft = e.target.scrollLeft;
        }
        if (overlayRef.current) {
            overlayRef.current.scrollTop = e.target.scrollTop;
            overlayRef.current.scrollLeft = e.target.scrollLeft;
        }
        checkVisibility();
    };

    const checkVisibility = React.useCallback(() => {
        if (!textareaRef.current || currentResultIdx === -1 || !searchResults[currentResultIdx]) {
            setIndicator(null);
            return;
        }

        const targetLine = searchResults[currentResultIdx].line - 1;
        const lineStyles = window.getComputedStyle(textareaRef.current);
        const lineHeight = parseInt(lineStyles.lineHeight) || LINE_HEIGHT_PX;

        const scrollPos = textareaRef.current.scrollTop;
        const viewportHeight = textareaRef.current.clientHeight;
        const targetPos = targetLine * lineHeight;

        if (targetPos < scrollPos - 20) {
            setIndicator('up');
        } else if (targetPos > scrollPos + viewportHeight - 40) {
            setIndicator('down');
        } else {
            setIndicator(null);
        }
    }, [currentResultIdx, searchResults, textareaRef]);

    React.useEffect(() => {
        checkVisibility();
    }, [currentResultIdx, checkVisibility]);

    const handleTextareaClickOrSelect = (e) => {
        if (!textareaRef.current || !conditionalBlocks || conditionalBlocks.length === 0) return;
        
        const textarea = textareaRef.current;
        const text = textarea.value;
        const selStart = textarea.selectionStart;
        
        // Determina em qual linha o cursor está
        const textBeforeCursor = text.substring(0, selStart);
        const currentLineIdx = textBeforeCursor.split('\n').length - 1;
        
        // Verifica se há alguma condicional nesta linha
        const matchingBlock = conditionalBlocks.find(b => b.ifLineIdx === currentLineIdx);
        
        if (matchingBlock) {
            // Abre o modal de edição
            setOpenCondEdit(matchingBlock);
            
            // Move o cursor para fora da linha da condicional
            setTimeout(() => {
                const lines = text.split('\n');
                let startOfLine = 0;
                for (let i = 0; i < currentLineIdx; i++) {
                    startOfLine += lines[i].length + 1;
                }
                const endOfLine = startOfLine + lines[currentLineIdx].length;
                textarea.setSelectionRange(endOfLine, endOfLine);
                textarea.blur(); // Remove o foco temporariamente para evitar digitação indesejada
            }, 50);
        }
    };

    const buildHighlightedHtml = (text) => {
        if (!text) return '';

        const lines = text.split('\n');
        const currentSearchLine =
            currentResultIdx !== -1 && searchResults[currentResultIdx]
                ? searchResults[currentResultIdx].line - 1
                : -1;

        const htmlLines = lines.map((line, idx) => {
            // Verifica se a linha é uma condicional colapsada (permite com ou sem espaços)
            const collapsedMatch = line.match(/^\[IF:(.+)\] \{\s*\.\.\.\s*\} \[\/IF\]$/);
            if (collapsedMatch) {
                // Encontra o índice deste bloco na lista de blocos
                const blockIdx = conditionalBlocks ? conditionalBlocks.findIndex(b => b.ifLineIdx === idx) : -1;
                const safeBlockIdx = blockIdx !== -1 ? blockIdx : 0;
                
                const isSearchHighlight = idx === currentSearchLine;
                const lineClass = `collapsed-cond-line ${isSearchHighlight ? 'search-highlight-active' : ''}`;
                
                // Retorna o card premium inline completo que rola junto com o texto naturalmente
                return `<div class="${lineClass}" data-line-number="${idx + 1}" id="prompt-line-${idx + 1}">
                    <span class="editor-ln">${idx + 1}</span>
                    <div class="premium-cond-card">
                        <span style="opacity: 0.25; margin-right: 8px; font-size: 12px; pointer-events: none;">🔀</span>
                        <span class="cond-badge-premium">CONDICIONAL</span>
                        <span class="cond-expr-premium">${collapsedMatch[1]}</span>
                        <span class="cond-edit-hint-premium" data-testid="cond-edit-btn-${safeBlockIdx}" title="Editar condicional para {${collapsedMatch[1].split(' ')[0]}}">✏️ Editar</span>
                    </div>
                </div>`;
            }

            let processed = line
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');

            processed = processed.replace(/\{([^}]+)\}/g, (match, varName) => {
                const isValid = validVarKeys.includes(varName);
                return `<mark class="${isValid ? 'var-valid' : 'var-unknown'}">{${varName}}</mark>`;
            });

            let headerAttr = '';
            if (line.trim().startsWith('#')) {
                headerAttr = `class="prompt-header-mark"`;
            }

            const isSearchHighlight = idx === currentSearchLine;
            const lineClass = `editor-line ${isSearchHighlight ? 'search-highlight-active' : ''}`;

            return `<div class="${lineClass}" data-line-number="${idx + 1}" id="prompt-line-${idx + 1}" ${headerAttr}><span class="editor-ln">${idx + 1}</span>${processed || ' '}</div>`;
        });

        return htmlLines.join('');
    };

    // Efeito para tratar cliques nos botões de edição inline dentro do backdrop
    React.useEffect(() => {
        const backdrop = backdropRef.current;
        if (!backdrop) return;

        const handleBackdropClick = (e) => {
            const card = e.target.closest('.premium-cond-card');
            if (card) {
                const editBtn = card.querySelector('[data-testid^="cond-edit-btn-"]');
                if (editBtn) {
                    const blockIdxAttr = editBtn.getAttribute('data-testid');
                    const blockIdx = parseInt(blockIdxAttr.replace('cond-edit-btn-', ''), 10);
                    const block = conditionalBlocks ? conditionalBlocks[blockIdx] : null;
                    if (block) {
                        setOpenCondEdit(block);
                    }
                }
            }
        };

        backdrop.addEventListener('click', handleBackdropClick);
        return () => {
            backdrop.removeEventListener('click', handleBackdropClick);
        };
    }, [conditionalBlocks, setOpenCondEdit]);

    const clearSelection = () => {
        setCurrentResultIdx(-1);
    };

    const scrollToTarget = () => {
        if (!textareaRef.current || currentResultIdx === -1 || !searchResults[currentResultIdx]) return;
        const targetLine = searchResults[currentResultIdx].line - 1;
        const lineStyles = window.getComputedStyle(textareaRef.current);
        const lineHeight = parseInt(lineStyles.lineHeight) || LINE_HEIGHT_PX;
        textareaRef.current.scrollTop = targetLine * lineHeight - textareaRef.current.clientHeight / 2;
    };

    return (
        <div className="prompt-editor-container">
            <div className="editor-relative-container">
                {indicator && (
                    <div className={`selection-indicator ${indicator}`} onClick={scrollToTarget}>
                        <span className="indicator-arrow">{indicator === 'up' ? '▲' : '▼'}</span>
                        <span className="indicator-text">Seleção {indicator === 'up' ? 'acima' : 'abaixo'}</span>
                    </div>
                )}

                {currentResultIdx !== -1 && (
                    <button className="clear-selection-btn" onClick={clearSelection} title="Limpar Destaque">
                        ✕
                    </button>
                )}

                <div
                    ref={backdropRef}
                    className="editor-backdrop"
                    dangerouslySetInnerHTML={{ __html: buildHighlightedHtml(promptValue) }}
                />



                <textarea
                    ref={textareaRef}
                    value={promptValue}
                    onChange={onChangePrompt}
                    onScroll={syncScroll}
                    onClick={handleTextareaClickOrSelect}
                    onKeyUp={handleTextareaClickOrSelect}
                    onSelect={handleTextareaClickOrSelect}
                    className="prompt-textarea"
                    placeholder="Escreva as instruções do agente..."
                    spellCheck="false"
                />
            </div>
        </div>
    );
};

export default PromptTextarea;
