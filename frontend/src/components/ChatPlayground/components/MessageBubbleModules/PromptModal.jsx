import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import PreRouterDecisionView from './PreRouterDecisionView';
import ResolvedPromptView from './ResolvedPromptView';
import { estimateTokens, formatTokenCount } from '../../utils/tokenUtils';

const extractStaticPrompt = (fullContent) => {
    if (!fullContent) return '';
    const lines = fullContent.split('\n');
    const cleanLines = [];
    for (const line of lines) {
        if (line.includes('### DIRETRIZES DE SEGURANÇA E ESTILO') || 
            line.includes('# CONTEXTO RAG:') || 
            line.includes('# RESUMO DAS MEMÓRIAS')) {
            break;
        }
        cleanLines.push(line);
    }
    return cleanLines.join('\n').trim();
};

const extractDynamicBlocks = (fullContent) => {
    if (!fullContent) return '';
    const lines = fullContent.split('\n');
    const qualifLines = [];
    let isQualif = false;
    for (const line of lines) {
        if (line.includes('🎯 **QUALIFICAÇÃO DE LEAD')) {
            isQualif = true;
        }
        if (isQualif) {
            if (line.includes('### DIRETRIZES DE SEGURANÇA')) {
                break;
            }
            qualifLines.push(line);
        }
    }
    return qualifLines.join('\n').trim();
};

const extractInjectedPrompt = (fullContent) => {
    if (!fullContent) return '';
    const lines = fullContent.split('\n');
    const injectedLines = [];
    let isInjected = false;
    for (const line of lines) {
        if (line.includes('### DIRETRIZES DE SEGURANÇA') || line.includes('# CONTEXTO RAG:')) {
            isInjected = true;
        }
        if (isInjected) {
            injectedLines.push(line);
        }
    }
    return injectedLines.join('\n').trim();
};

const PromptModal = ({
    activeModal,
    onClose,
    activePreRouterTab,
    setActivePreRouterTab,
    activeResolvedPromptTab,
    setActiveResolvedPromptTab
}) => {
    const [copied, setCopied] = useState(false);

    if (!activeModal) return null;

    const handleCopy = () => {
        const textToCopy = activeModal.type === 'pre_router' && activePreRouterTab !== 'raw' && activeModal.rawData
            ? (activePreRouterTab === 'classifications' ? JSON.stringify(Object.fromEntries(Object.entries(activeModal.rawData).filter(([k]) => typeof activeModal.rawData[k] === 'boolean' || k === 'id_agente_alvo')), null, 2)
              : activePreRouterTab === 'questions' ? (activeModal.rawData.perguntas_extraidas || '')
              : (activeModal.rawData.resumo_memorias || ''))
            : activeModal.content;
        navigator.clipboard.writeText(textToCopy);
        setCopied(true);
        window.dispatchEvent(new CustomEvent('app:toast', {
            detail: { message: "Conteúdo copiado com sucesso!", type: "success" }
        }));
        setTimeout(() => setCopied(false), 2000);
    };

    const modalContent = activeModal.content || '';
    const totalTokens = estimateTokens(modalContent);
    const staticTokens = estimateTokens(extractStaticPrompt(modalContent));
    const dynamicTokens = estimateTokens(extractDynamicBlocks(modalContent));
    const injectedTokens = estimateTokens(extractInjectedPrompt(modalContent));

    return createPortal(
        <div className="modal-overlay fade-in" style={{ zIndex: 100000, background: 'rgba(7, 10, 19, 0.85)', backdropFilter: 'blur(16px)' }}>
            <div className="modal-content" style={{ 
                maxWidth: '920px', 
                width: '95%', 
                maxHeight: '85vh', 
                display: 'flex', 
                flexDirection: 'column',
                background: 'linear-gradient(145deg, #161d2f 0%, #0f172a 100%)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '24px',
                padding: '0',
                overflow: 'hidden',
                boxShadow: '0 50px 120px -30px rgba(0,0,0,0.9)'
            }}>
                <div className="modal-header" style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    flexDirection: 'row',
                    textAlign: 'left',
                    padding: '24px 32px',
                    background: 'rgba(15, 23, 42, 0.4)',
                    borderBottom: '1px solid rgba(255,255,255,0.08)',
                    position: 'relative'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', width: '100%', textAlign: 'left' }}>
                        <div className="icon-badge" style={{ 
                            background: activeModal.type === 'resolved_prompt' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(251, 191, 36, 0.15)',
                            color: activeModal.type === 'resolved_prompt' ? '#10b981' : '#fbbf24',
                            width: '48px',
                            height: '48px',
                            borderRadius: '14px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1.4rem',
                            flexShrink: 0
                        }}>
                            {activeModal.type === 'resolved_prompt' ? '📝' : activeModal.type === 'pre_router_prompt' ? '📄' : '🧠'}
                        </div>
                        <div className="header-text" style={{ textAlign: 'left', flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                                <h3 style={{ margin: '0', fontSize: '1.25rem', color: '#f8fafc', fontWeight: '700' }}>
                                    {activeModal.title}
                                </h3>
                                {totalTokens > 0 && (
                                    <span 
                                        data-testid="modal-token-badge"
                                        style={{
                                            fontSize: '0.72rem',
                                            fontWeight: '800',
                                            padding: '3px 10px',
                                            borderRadius: '20px',
                                            background: activeModal.type === 'resolved_prompt' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(251, 191, 36, 0.15)',
                                            border: `1px solid ${activeModal.type === 'resolved_prompt' ? 'rgba(16, 185, 129, 0.35)' : 'rgba(251, 191, 36, 0.35)'}`,
                                            color: activeModal.type === 'resolved_prompt' ? '#34d399' : '#fbbf24',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            letterSpacing: '0.3px',
                                            boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                                        }}
                                    >
                                        ⚡ ~{formatTokenCount(totalTokens)} tokens
                                    </span>
                                )}
                            </div>
                            <p className="subtitle" style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
                                {activeModal.type === 'resolved_prompt' ? 'Texto exato enviado ao modelo principal (GPT/Claude)' : activeModal.type === 'pre_router_prompt' ? 'Prompt do classificador inicial (Pre-Router)' : 'Resultado da decisão estruturada do classificador'}
                            </p>
                        </div>
                    </div>
                    <button className="close-btn-top-right" onClick={onClose} style={{
                        position: 'absolute',
                        top: '50%',
                        right: '24px',
                        transform: 'translateY(-50%)',
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        color: '#94a3b8',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                    }}>✕</button>
                </div>
                
                {/* Seletor de abas se for Pre-Router */}
                {activeModal.type === 'pre_router' && activeModal.rawData && (
                    <div className="modal-tabs" style={{
                        display: 'flex',
                        gap: '8px',
                        padding: '16px 32px',
                        background: 'rgba(15, 23, 42, 0.2)',
                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                        overflowX: 'auto',
                        overflowY: 'hidden',
                        flexShrink: 0,
                        alignItems: 'center'
                    }}>
                        <button 
                            onClick={() => setActivePreRouterTab('classifications')}
                            style={{
                                background: activePreRouterTab === 'classifications' ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                                border: '1px solid',
                                borderColor: activePreRouterTab === 'classifications' ? 'rgba(99, 102, 241, 0.4)' : 'rgba(255, 255, 255, 0.05)',
                                outline: 'none',
                                color: activePreRouterTab === 'classifications' ? '#818cf8' : '#94a3b8',
                                padding: '8px 16px',
                                borderRadius: '8px',
                                fontSize: '0.8rem',
                                cursor: 'pointer',
                                fontWeight: '600',
                                transition: 'all 0.2s',
                                boxShadow: activePreRouterTab === 'classifications' ? '0 0 12px rgba(99, 102, 241, 0.2)' : 'none'
                            }}
                        >
                            🔍 Classificação de Intenção
                        </button>
                        <button 
                            onClick={() => setActivePreRouterTab('questions')}
                            style={{
                                background: activePreRouterTab === 'questions' ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                                border: '1px solid',
                                borderColor: activePreRouterTab === 'questions' ? 'rgba(99, 102, 241, 0.4)' : 'rgba(255, 255, 255, 0.05)',
                                outline: 'none',
                                color: activePreRouterTab === 'questions' ? '#818cf8' : '#94a3b8',
                                padding: '8px 16px',
                                borderRadius: '8px',
                                fontSize: '0.8rem',
                                cursor: 'pointer',
                                fontWeight: '600',
                                transition: 'all 0.2s',
                                boxShadow: activePreRouterTab === 'questions' ? '0 0 12px rgba(99, 102, 241, 0.2)' : 'none'
                            }}
                        >
                            ❓ Perguntas Extraídas
                        </button>
                        <button 
                            onClick={() => setActivePreRouterTab('memory')}
                            style={{
                                background: activePreRouterTab === 'memory' ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                                border: '1px solid',
                                borderColor: activePreRouterTab === 'memory' ? 'rgba(99, 102, 241, 0.4)' : 'rgba(255, 255, 255, 0.05)',
                                outline: 'none',
                                color: activePreRouterTab === 'memory' ? '#818cf8' : '#94a3b8',
                                padding: '8px 16px',
                                borderRadius: '8px',
                                fontSize: '0.8rem',
                                cursor: 'pointer',
                                fontWeight: '600',
                                transition: 'all 0.2s',
                                boxShadow: activePreRouterTab === 'memory' ? '0 0 12px rgba(99, 102, 241, 0.2)' : 'none'
                            }}
                        >
                            💾 Resumo de Memória
                        </button>
                    </div>
                )}

                {/* Seletor de abas se for Resolved Prompt */}
                {activeModal.type === 'resolved_prompt' && (
                    <div className="modal-tabs" style={{
                        display: 'flex',
                        gap: '8px',
                        padding: '16px 32px',
                        background: 'rgba(15, 23, 42, 0.2)',
                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                        overflowX: 'auto',
                        overflowY: 'hidden',
                        flexShrink: 0,
                        alignItems: 'center'
                    }}>
                        <button 
                            onClick={() => setActiveResolvedPromptTab('static')}
                            style={{
                                background: activeResolvedPromptTab === 'static' ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                                border: '1px solid',
                                borderColor: activeResolvedPromptTab === 'static' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(255, 255, 255, 0.05)',
                                outline: 'none',
                                color: activeResolvedPromptTab === 'static' ? '#34d399' : '#94a3b8',
                                padding: '8px 16px',
                                borderRadius: '8px',
                                fontSize: '0.8rem',
                                cursor: 'pointer',
                                fontWeight: '600',
                                transition: 'all 0.2s',
                                boxShadow: activeResolvedPromptTab === 'static' ? '0 0 12px rgba(16, 185, 129, 0.2)' : 'none'
                            }}
                        >
                            📄 Prompt Estático (~{formatTokenCount(staticTokens)}t)
                        </button>
                        <button 
                            onClick={() => setActiveResolvedPromptTab('dynamic')}
                            style={{
                                background: activeResolvedPromptTab === 'dynamic' ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                                border: '1px solid',
                                borderColor: activeResolvedPromptTab === 'dynamic' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(255, 255, 255, 0.05)',
                                outline: 'none',
                                color: activeResolvedPromptTab === 'dynamic' ? '#34d399' : '#94a3b8',
                                padding: '8px 16px',
                                borderRadius: '8px',
                                fontSize: '0.8rem',
                                cursor: 'pointer',
                                fontWeight: '600',
                                transition: 'all 0.2s',
                                boxShadow: activeResolvedPromptTab === 'dynamic' ? '0 0 12px rgba(16, 185, 129, 0.2)' : 'none'
                            }}
                        >
                            ⚡ Blocos Dinâmicos (~{formatTokenCount(dynamicTokens)}t)
                        </button>
                        <button 
                            onClick={() => setActiveResolvedPromptTab('injected')}
                            style={{
                                background: activeResolvedPromptTab === 'injected' ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                                border: '1px solid',
                                borderColor: activeResolvedPromptTab === 'injected' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(255, 255, 255, 0.05)',
                                outline: 'none',
                                color: activeResolvedPromptTab === 'injected' ? '#34d399' : '#94a3b8',
                                padding: '8px 16px',
                                borderRadius: '8px',
                                fontSize: '0.8rem',
                                cursor: 'pointer',
                                fontWeight: '600',
                                transition: 'all 0.2s',
                                boxShadow: activeResolvedPromptTab === 'injected' ? '0 0 12px rgba(16, 185, 129, 0.2)' : 'none'
                            }}
                        >
                            🔌 Injetado pelo Código (~{formatTokenCount(injectedTokens)}t)
                        </button>
                        <button 
                            onClick={() => setActiveResolvedPromptTab('variables')}
                            style={{
                                background: activeResolvedPromptTab === 'variables' ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                                border: '1px solid',
                                borderColor: activeResolvedPromptTab === 'variables' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(255, 255, 255, 0.05)',
                                outline: 'none',
                                color: activeResolvedPromptTab === 'variables' ? '#34d399' : '#94a3b8',
                                padding: '8px 16px',
                                borderRadius: '8px',
                                fontSize: '0.8rem',
                                cursor: 'pointer',
                                fontWeight: '600',
                                transition: 'all 0.2s',
                                boxShadow: activeResolvedPromptTab === 'variables' ? '0 0 12px rgba(16, 185, 129, 0.2)' : 'none'
                            }}
                        >
                            📊 Variáveis Injetadas
                        </button>
                        <button 
                            onClick={() => setActiveResolvedPromptTab('full')}
                            style={{
                                background: activeResolvedPromptTab === 'full' ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                                border: '1px solid',
                                borderColor: activeResolvedPromptTab === 'full' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(255, 255, 255, 0.05)',
                                outline: 'none',
                                color: activeResolvedPromptTab === 'full' ? '#34d399' : '#94a3b8',
                                padding: '8px 16px',
                                borderRadius: '8px',
                                fontSize: '0.8rem',
                                cursor: 'pointer',
                                fontWeight: '600',
                                transition: 'all 0.2s',
                                boxShadow: activeResolvedPromptTab === 'full' ? '0 0 12px rgba(16, 185, 129, 0.2)' : 'none'
                            }}
                        >
                            📄 Prompt Completo (~{formatTokenCount(totalTokens)}t)
                        </button>
                    </div>
                )}

                <div className="modal-body-scroll" style={{ 
                    flex: 1, 
                    overflowY: 'auto', 
                    padding: '32px',
                    background: 'transparent'
                }}>
                    {activeModal.type === 'pre_router' && activePreRouterTab !== 'raw' && activeModal.rawData ? (
                        <PreRouterDecisionView 
                            activePreRouterTab={activePreRouterTab} 
                            rawData={activeModal.rawData} 
                        />
                    ) : activeModal.type === 'resolved_prompt' ? (
                        <ResolvedPromptView 
                            activeResolvedPromptTab={activeResolvedPromptTab} 
                            activeModal={activeModal} 
                        />
                    ) : (
                        <pre style={{ 
                            fontSize: '0.85rem', 
                            background: 'rgba(7, 10, 19, 0.4)', 
                            padding: '24px', 
                            borderRadius: '16px', 
                            border: '1px solid rgba(255,255,255,0.05)', 
                            whiteSpace: 'pre-wrap', 
                            wordBreak: 'break-word', 
                            fontFamily: "'Fira Code', 'Courier New', Courier, monospace", 
                            color: '#cbd5e1', 
                            margin: 0, 
                            textAlign: 'left', 
                            lineHeight: '1.6', 
                            overflowX: 'auto' 
                        }}>
                            {activeModal.type === 'pre_router' && activeModal.rawData
                                ? JSON.stringify(Object.fromEntries(Object.entries(activeModal.rawData).filter(([k]) => !k.startsWith('_'))), null, 2)
                                : activeModal.content
                            }
                        </pre>
                    )}
                </div>
                <div className="modal-footer" style={{ 
                    display: 'flex', 
                    justifyContent: 'flex-end', 
                    gap: '12px',
                    padding: '24px 32px',
                    background: 'rgba(15, 23, 42, 0.4)',
                    borderTop: '1px solid rgba(255,255,255,0.08)',
                    flexDirection: 'row',
                    alignItems: 'center'
                }}>
                    <button 
                        onClick={handleCopy} 
                        style={{
                            background: 'rgba(255, 255, 255, 0.04)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            color: '#e2e8f0',
                            padding: '10px 20px',
                            borderRadius: '10px',
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                            fontWeight: '600',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            transition: 'all 0.2s'
                        }}
                        className="modal-btn-cancel-custom"
                    >
                        {copied ? '✅ Copiado!' : '📋 Copiar Conteúdo'}
                    </button>
                    <button 
                        onClick={onClose}
                        style={{
                            background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                            border: 'none',
                            color: '#ffffff',
                            padding: '10px 24px',
                            borderRadius: '10px',
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                            fontWeight: '700',
                            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
                            transition: 'all 0.2s'
                        }}
                        className="modal-btn-primary-custom"
                    >
                        Fechar
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default PromptModal;
