import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import PreRouterDecisionView from './PreRouterDecisionView';
import ResolvedPromptView from './ResolvedPromptView';
import PromptModalHeader from './PromptModalHeader';
import PreRouterTabs from './PreRouterTabs';
import ResolvedPromptTabs from './ResolvedPromptTabs';
import PromptModalFooter from './PromptModalFooter';
import {
    extractStaticPrompt,
    extractDynamicBlocks,
    extractInjectedPrompt,
    getTextToCopy
} from './promptModalUtils';
import { estimateTokens } from '../../utils/tokenUtils';

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
        const textToCopy = getTextToCopy(activeModal, activePreRouterTab);
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
                <PromptModalHeader 
                    activeModal={activeModal} 
                    totalTokens={totalTokens} 
                    onClose={onClose} 
                />

                {activeModal.type === 'pre_router' && activeModal.rawData && (
                    <PreRouterTabs 
                        activePreRouterTab={activePreRouterTab} 
                        setActivePreRouterTab={setActivePreRouterTab} 
                    />
                )}

                {activeModal.type === 'resolved_prompt' && (
                    <ResolvedPromptTabs 
                        activeResolvedPromptTab={activeResolvedPromptTab} 
                        setActiveResolvedPromptTab={setActiveResolvedPromptTab} 
                        staticTokens={staticTokens} 
                        dynamicTokens={dynamicTokens} 
                        injectedTokens={injectedTokens} 
                        totalTokens={totalTokens} 
                    />
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

                <PromptModalFooter 
                    copied={copied} 
                    onCopy={handleCopy} 
                    onClose={onClose} 
                />
            </div>
        </div>,
        document.body
    );
};

export default PromptModal;
