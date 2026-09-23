import React from 'react';
import { formatTokenCount } from '../../utils/tokenUtils';

const PromptModalHeader = ({ activeModal, totalTokens, onClose }) => {
    const isResolvedPrompt = activeModal.type === 'resolved_prompt';
    const isPreRouterPrompt = activeModal.type === 'pre_router_prompt';

    const iconBadge = isResolvedPrompt ? '📝' : isPreRouterPrompt ? '📄' : '🧠';
    const badgeBg = isResolvedPrompt ? 'rgba(16, 185, 129, 0.15)' : 'rgba(251, 191, 36, 0.15)';
    const badgeColor = isResolvedPrompt ? '#10b981' : '#fbbf24';
    const badgeBorder = isResolvedPrompt ? 'rgba(16, 185, 129, 0.35)' : 'rgba(251, 191, 36, 0.35)';
    const badgeTextColor = isResolvedPrompt ? '#34d399' : '#fbbf24';

    const subtitleText = isResolvedPrompt
        ? 'Texto exato enviado ao modelo principal (GPT/Claude)'
        : isPreRouterPrompt
        ? 'Prompt do classificador inicial (Pre-Router)'
        : 'Resultado da decisão estruturada do classificador';

    return (
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
                    background: badgeBg, 
                    color: badgeColor, 
                    width: '48px', 
                    height: '48px', 
                    borderRadius: '14px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    fontSize: '1.4rem', 
                    flexShrink: 0 
                }}>
                    {iconBadge}
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
                                    background: badgeBg,
                                    border: `1px solid ${badgeBorder}`,
                                    color: badgeTextColor,
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
                        {subtitleText}
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
    );
};

export default PromptModalHeader;
