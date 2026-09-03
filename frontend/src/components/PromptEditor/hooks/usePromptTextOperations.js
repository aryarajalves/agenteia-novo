import { useState, useRef, useCallback } from 'react';
import { parseConditionalBlocks, collapsePrompt, reconstructPrompt } from '../utils/conditionalParser';

export const usePromptTextOperations = ({ value, promptValue, onChange, activeSection, promptOutline }) => {
    const textareaRef = useRef(null);
    const [isExpanded, setIsExpanded] = useState(false);

    const toggleExpanded = () => {
        if (textareaRef.current) {
            const { selectionStart, selectionEnd, scrollTop } = textareaRef.current;
            const currentActiveIdx = activeSection;
            
            setIsExpanded(prev => !prev);
            
            setTimeout(() => {
                if (textareaRef.current) {
                    textareaRef.current.focus();
                    
                    if (currentActiveIdx !== null && promptOutline[currentActiveIdx]) {
                        const item = promptOutline[currentActiveIdx];
                        const lineIndex = item.lineIndex;
                        const lines = value.split('\n');
                        
                        let startPos = 0;
                        for (let i = 0; i < lineIndex; i++) {
                            startPos += lines[i].length + 1;
                        }
                        const endPos = startPos + lines[lineIndex].length;
                        
                        textareaRef.current.setSelectionRange(startPos, endPos);
                        
                        const backdropEl = textareaRef.current.parentNode.querySelector('.editor-backdrop');
                        const headerEl = backdropEl?.querySelector(`#prompt-header-${lineIndex}`);
                        
                        if (headerEl) {
                            textareaRef.current.scrollTop = headerEl.offsetTop - 60;
                        } else {
                            textareaRef.current.scrollTop = (lineIndex * 26) - 60;
                        }
                    } else {
                        textareaRef.current.setSelectionRange(selectionStart, selectionEnd);
                        textareaRef.current.scrollTop = scrollTop;
                    }
                }
            }, 100);
        } else {
            setIsExpanded(prev => !prev);
        }
    };

    const insertTextAtCursor = (textToInsert) => {
        if (!textareaRef.current) return;
        const textarea = textareaRef.current;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const currentValue = promptValue || '';
        
        const newValue = currentValue.substring(0, start) + textToInsert + currentValue.substring(end);
        const originalBlocks = parseConditionalBlocks(value);
        const reconstructedFullValue = reconstructPrompt(newValue, originalBlocks);
        
        onChange({ target: { value: reconstructedFullValue } });
        
        setTimeout(() => {
            textarea.focus();
            const newCursorPos = start + textToInsert.length;
            textarea.setSelectionRange(newCursorPos, newCursorPos);
            
            const event = { target: textarea };
            if (textarea.onScroll) {
                textarea.onScroll(event);
            }
        }, 50);
    };

    const insertTextAtEnd = (textToInsert) => {
        const currentValue = promptValue || '';
        const newValue = currentValue ? `${currentValue}\n\n${textToInsert}` : textToInsert;
        const originalBlocks = parseConditionalBlocks(value);
        const reconstructedFullValue = reconstructPrompt(newValue, originalBlocks);

        onChange({ target: { value: reconstructedFullValue } });

        setTimeout(() => {
            if (textareaRef.current) {
                textareaRef.current.focus();
                const len = collapsePrompt(reconstructedFullValue).length;
                textareaRef.current.setSelectionRange(len, len);
                textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
            }
        }, 50);
    };

    const replaceTextRange = useCallback((startLine, endLine, newText) => {
        const lines = (value || '').split('\n');
        const before = lines.slice(0, startLine);
        const after = lines.slice(endLine + 1);
        const newLines = [...before, ...newText.split('\n'), ...after];
        const newValue = newLines.join('\n');
        onChange({ target: { value: newValue } });

        setTimeout(() => {
            if (textareaRef.current) {
                textareaRef.current.focus();
                let cursorPos = 0;
                for (let i = 0; i < startLine; i++) {
                    cursorPos += newLines[i].length + 1;
                }
                textareaRef.current.setSelectionRange(cursorPos, cursorPos);
            }
        }, 50);
    }, [value, onChange]);

    const scrollToLine = useCallback((targetLineNumber) => {
        if (!textareaRef.current) return;
        const targetLineIdx = Math.max(0, targetLineNumber - 1);
        
        const lineEl = document.querySelector(`[data-line-number="${targetLineNumber}"]`) 
            || document.getElementById(`prompt-line-${targetLineNumber}`);
        
        let targetScrollTop = 0;
        
        if (lineEl) {
            targetScrollTop = Math.max(0, lineEl.offsetTop - 32);
        } else {
            const lineStyles = window.getComputedStyle ? window.getComputedStyle(textareaRef.current) : {};
            const lineHeight = parseInt(lineStyles.lineHeight, 10) || 26;
            targetScrollTop = Math.max(0, targetLineIdx * lineHeight - 32);
        }
        
        if (typeof textareaRef.current.scrollTo === 'function') {
            textareaRef.current.scrollTo({
                top: targetScrollTop,
                behavior: 'smooth'
            });
        } else {
            textareaRef.current.scrollTop = targetScrollTop;
        }

        const backdrop = document.querySelector('.editor-backdrop');
        if (backdrop) {
            if (typeof backdrop.scrollTo === 'function') {
                backdrop.scrollTo({
                    top: targetScrollTop,
                    behavior: 'smooth'
                });
            } else {
                backdrop.scrollTop = targetScrollTop;
            }
        }

        if (lineEl) {
            lineEl.classList.remove('line-scroll-highlight');
            void lineEl.offsetWidth;
            lineEl.classList.add('line-scroll-highlight');
            setTimeout(() => {
                lineEl.classList.remove('line-scroll-highlight');
            }, 3000);
        }

        const lines = (textareaRef.current.value || '').split('\n');
        if (targetLineIdx < lines.length) {
            let startPos = 0;
            for (let i = 0; i < targetLineIdx; i++) {
                startPos += lines[i].length + 1;
            }
            const endPos = startPos + lines[targetLineIdx].length;
            try {
                if (typeof textareaRef.current.focus === 'function') textareaRef.current.focus();
                if (typeof textareaRef.current.setSelectionRange === 'function') textareaRef.current.setSelectionRange(startPos, endPos);
            } catch (e) {
                // Ignora se não puder focar
            }
        }
    }, [textareaRef]);

    return {
        textareaRef,
        isExpanded,
        setIsExpanded,
        toggleExpanded,
        insertTextAtCursor,
        insertTextAtEnd,
        replaceTextRange,
        scrollToLine
    };
};
