import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';
import { parseConditionalBlocks, collapsePrompt, reconstructPrompt } from './utils/conditionalParser';
import { usePromptAdvisor } from './hooks/usePromptAdvisor';
import { usePromptTextOperations } from './hooks/usePromptTextOperations';
import { usePromptDraftAndPreRouter } from './hooks/usePromptDraftAndPreRouter';
import { usePromptGlobalVariables } from './hooks/usePromptGlobalVariables';

const PromptContext = createContext();

export const PromptProvider = ({ children, initialProps }) => {
    const { 
        value, 
        onChange, 
        dynamicValue, 
        onChangeDynamic, 
        preRouterValue, 
        onChangePreRouter, 
        agentId, 
        mainModel 
    } = initialProps;

    const [activePromptTab, setActivePromptTab] = useState('static'); // 'static' | 'dynamic' | 'prerouter'

    // Search State
    const [showSearch, setShowSearch] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [currentResultIdx, setCurrentResultIdx] = useState(-1);

    // Playground State
    const [showPlayground, setShowPlayground] = useState(false);
    const [playgroundChat, setPlaygroundChat] = useState([]);

    const [activeSection, setActiveSection] = useState(null);
    const [openCondEdit, setOpenCondEdit] = useState(null);
    const [collapsedSections, setCollapsedSections] = useState({});

    // Carrega variáveis globais dinamicamente
    const {
        validVarKeys,
        setValidVarKeys,
        globalVarsList,
        setGlobalVarsList
    } = usePromptGlobalVariables();

    // Blocos condicionais com índices de linha mapeados para a versão colapsada
    const conditionalBlocks = useMemo(() => {
        const originalBlocks = parseConditionalBlocks(value);
        let totalShrunkLines = 0;
        return originalBlocks.map(block => {
            const shrunk = block.blockEndLine - block.ifLineIdx;
            const collapsedIfLineIdx = block.ifLineIdx - totalShrunkLines;
            const collapsedStartLine = block.blockStartLine - totalShrunkLines;
            const collapsedEndLine = collapsedIfLineIdx;
            
            totalShrunkLines += shrunk;
            
            return {
                ...block,
                originalBlockStartLine: block.blockStartLine,
                originalBlockEndLine: block.blockEndLine,
                originalIfLineIdx: block.ifLineIdx,
                blockStartLine: collapsedStartLine,
                blockEndLine: collapsedEndLine,
                ifLineIdx: collapsedIfLineIdx,
            };
        });
    }, [value]);

    // O valor do prompt exibido no editor (colapsado)
    const promptValue = useMemo(() => {
        return collapsePrompt(value);
    }, [value]);

    const toggleCollapse = useCallback((headerKey) => {
        setCollapsedSections(prev => ({
            ...prev,
            [headerKey]: !prev[headerKey]
        }));
    }, []);

    // Handler customizado que reconstrói o prompt com blocos completos antes de salvar
    const onChangePrompt = useCallback((e) => {
        const newDisplayedValue = e.target.value;
        const originalBlocks = parseConditionalBlocks(value);
        const reconstructedFullValue = reconstructPrompt(newDisplayedValue, originalBlocks);
        onChange({ target: { value: reconstructedFullValue } });
    }, [onChange, value]);

    const promptOutline = useMemo(() => {
        if (!value) return [];
        return value.split('\n')
            .map((line, idx) => ({ line, idx }))
            .filter(item => item.line.trim().startsWith('#'))
            .map(item => ({
                text: item.line.replace(/^#+\s+/, ''),
                level: (item.line.match(/^#+/) || [''])[0].length,
                lineIndex: item.idx
            }));
    }, [value]);

    // Hook do Consultor de Prompt (Advisor)
    const {
        advisorMessages,
        setAdvisorMessages,
        advisorInput,
        setAdvisorInput,
        isAdvisorLoading,
        setIsAdvisorLoading,
        isApplyingSuggestion,
        showAdvisorChat,
        setShowAdvisorChat,
        handleAdvisorMessage,
        handleApplySuggestions,
        handleAdvisorSearch,
        handlePublishPrompt,
        handleResetAdvisorMemory
    } = usePromptAdvisor({
        agentId,
        mainModel,
        value,
        onChange,
        setSearchResults
    });

    // Hook de Rascunhos e Pre-Router
    const {
        isSavingDraft,
        saveDraft,
        isLoadingPreRouterDefault,
        loadPreRouterDefaultTemplate
    } = usePromptDraftAndPreRouter({
        agentId,
        value,
        activePromptTab,
        preRouterValue,
        onChangePreRouter,
        setAdvisorMessages
    });

    // Hook de Operações de Texto, Scroll e Expansão
    const {
        textareaRef,
        isExpanded,
        setIsExpanded,
        toggleExpanded,
        insertTextAtCursor,
        insertTextAtEnd,
        replaceTextRange,
        scrollToLine
    } = usePromptTextOperations({
        value,
        promptValue,
        onChange,
        activeSection,
        promptOutline
    });

    const activePromptValue = activePromptTab === 'static'
        ? promptValue
        : activePromptTab === 'dynamic'
            ? (dynamicValue || '')
            : (preRouterValue || '');

    const activeOnChangePrompt = activePromptTab === 'static'
        ? onChangePrompt
        : activePromptTab === 'dynamic'
            ? onChangeDynamic
            : onChangePreRouter;

    const valueContext = {
        textareaRef,
        promptValue: activePromptValue,
        onChangePrompt: activeOnChangePrompt,
        scrollToLine,
        activePromptTab,
        setActivePromptTab,
        loadPreRouterDefaultTemplate,
        isLoadingPreRouterDefault,
        agentId,
        advisorMessages, setAdvisorMessages,
        advisorInput, setAdvisorInput,
        isAdvisorLoading, setIsAdvisorLoading,
        showAdvisorChat, setShowAdvisorChat,
        isExpanded, setIsExpanded,
        toggleExpanded,
        showSearch, setShowSearch,
        searchQuery, setSearchQuery,
        searchResults, setSearchResults,
        currentResultIdx, setCurrentResultIdx,
        showPlayground, setShowPlayground,
        playgroundChat, setPlaygroundChat,
        validVarKeys, setValidVarKeys,
        globalVarsList, setGlobalVarsList,
        activeSection, setActiveSection,
        promptOutline,
        conditionalBlocks,
        openCondEdit, setOpenCondEdit,
        handleAdvisorMessage,
        handleApplySuggestions,
        handleAdvisorSearch,
        handlePublishPrompt,
        handleResetAdvisorMemory,
        isApplyingSuggestion,
        saveDraft,
        isSavingDraft,
        insertTextAtCursor,
        insertTextAtEnd,
        replaceTextRange,
    };

    return <PromptContext.Provider value={valueContext}>{children}</PromptContext.Provider>;
};

export const usePrompt = () => {
    const context = useContext(PromptContext);
    if (!context) throw new Error('usePrompt must be used within a PromptProvider');
    return context;
};
