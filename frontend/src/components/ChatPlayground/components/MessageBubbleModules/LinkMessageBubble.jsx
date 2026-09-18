import React, { useState } from 'react';
import MessageMetaBar from './MessageMetaBar';
import DebugPanel from './DebugPanel';
import SourceAttributionView from './SourceAttributionView';

const getLinkDetails = (urlStr) => {
    try {
        const parsed = new URL(urlStr.startsWith('http') ? urlStr : `https://${urlStr}`);
        const host = parsed.hostname.toLowerCase();
        
        if (host.includes('kiwify')) {
            return {
                title: 'Checkout Oficial Kiwify',
                subtitle: 'Plataforma de Pagamento Seguro',
                domain: host,
                badge: 'Pagamento Seguro',
                badgeBg: 'rgba(16, 185, 129, 0.15)',
                badgeBorder: 'rgba(16, 185, 129, 0.35)',
                badgeColor: '#34d399',
                icon: '💳'
            };
        }
        if (host.includes('hotmart')) {
            return {
                title: 'Checkout Hotmart',
                subtitle: 'Plataforma de Cursos e Pagamentos',
                domain: host,
                badge: 'Pagamento Seguro',
                badgeBg: 'rgba(249, 115, 22, 0.15)',
                badgeBorder: 'rgba(249, 115, 22, 0.35)',
                badgeColor: '#fb923c',
                icon: '🔥'
            };
        }
        if (host.includes('whatsapp') || host.includes('wa.me')) {
            return {
                title: 'Contato via WhatsApp',
                subtitle: 'Atendimento Direto',
                domain: host,
                badge: 'WhatsApp',
                badgeBg: 'rgba(34, 197, 94, 0.15)',
                badgeBorder: 'rgba(34, 197, 94, 0.35)',
                badgeColor: '#4ade80',
                icon: '💬'
            };
        }
        if (host.includes('youtube') || host.includes('youtu.be')) {
            return {
                title: 'Vídeo no YouTube',
                subtitle: 'Conteúdo em Vídeo',
                domain: host,
                badge: 'YouTube',
                badgeBg: 'rgba(239, 68, 68, 0.15)',
                badgeBorder: 'rgba(239, 68, 68, 0.35)',
                badgeColor: '#f87171',
                icon: '▶️'
            };
        }
        return {
            title: host.replace(/^www\./, ''),
            subtitle: 'Link Compartilhado pelo Agente',
            domain: host,
            badge: 'Link Externo',
            badgeBg: 'rgba(99, 102, 241, 0.15)',
            badgeBorder: 'rgba(99, 102, 241, 0.35)',
            badgeColor: '#818cf8',
            icon: '🔗'
        };
    } catch {
        return {
            title: 'Link de Acesso',
            subtitle: 'Link Compartilhado pelo Agente',
            domain: urlStr,
            badge: 'Link',
            badgeBg: 'rgba(99, 102, 241, 0.15)',
            badgeBorder: 'rgba(99, 102, 241, 0.35)',
            badgeColor: '#818cf8',
            icon: '🔗'
        };
    }
};

const LinkMessageBubble = ({ 
    msg,
    msgIndex,
    isRegularUser,
    feedbackState,
    handleThumbsUp,
    handleThumbsDown,
    readFbFromStorage,
    selectedAgentId,
    showDebug,
    setShowDebug,
    showAttribution,
    setShowAttribution,
    handleFetchAttribution,
    explanationData,
    debateCostBrl,
    explainProps,
    setActiveModal,
    setActivePreRouterTab,
    setActiveResolvedPromptTab,
    attributionState,
    attributionData
}) => {
    const [copied, setCopied] = useState(false);
    const url = (msg.content || '').trim();
    const details = getLinkDetails(url);

    const handleCopy = (e) => {
        e.preventDefault();
        e.stopPropagation();
        navigator.clipboard.writeText(url);
        setCopied(true);
        window.dispatchEvent(new CustomEvent('app:toast', {
            detail: { message: "Link copiado para a área de transferência!", type: "success" }
        }));
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className={`message-row assistant-row ${msg.isSplit ? 'is-split' : ''}`} data-testid="link-message-bubble">
            <div className="avatar assistant-avatar" style={{ visibility: msg.isSplit ? 'hidden' : 'visible' }}>🤖</div>
            <div className="link-card-container">
                <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="link-card-link"
                >
                    <div className="link-card-header">
                        <div className="link-card-icon-wrap">
                            <span className="link-card-icon">{details.icon}</span>
                        </div>
                        <div className="link-card-meta">
                            <div className="link-card-title-row">
                                <span className="link-card-title">{details.title}</span>
                                <span 
                                    className="link-card-badge"
                                    style={{
                                        background: details.badgeBg,
                                        borderColor: details.badgeBorder,
                                        color: details.badgeColor
                                    }}
                                >
                                    {details.badge}
                                </span>
                            </div>
                            <span className="link-card-subtitle">{details.subtitle}</span>
                        </div>
                    </div>

                    <div className="link-card-url-box">
                        <span className="link-card-url-text" title={url}>{url}</span>
                    </div>

                    <div className="link-card-footer">
                        <span className="link-card-domain">
                            🌐 {details.domain}
                        </span>
                        <div className="link-card-actions">
                            <button
                                type="button"
                                onClick={handleCopy}
                                className="link-card-copy-btn"
                                title="Copiar URL"
                            >
                                {copied ? '✓ Copiado' : '📋 Copiar'}
                            </button>
                            <span className="link-card-cta-btn">
                                Acessar ↗
                            </span>
                        </div>
                    </div>
                </a>

                {msg.metrics && msg.created_at && (
                    <div className="message-timestamp" data-testid="assistant-timestamp" style={{ 
                        fontSize: '0.8rem', 
                        color: '#94a3b8', 
                        textAlign: 'left', 
                        marginTop: '8px',
                        fontWeight: '600',
                        letterSpacing: '0.5px'
                    }}>
                        {new Date(msg.created_at).toLocaleDateString('pt-BR')} {new Date(msg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                )}

                {msg.metrics && (
                    <MessageMetaBar
                        msg={msg}
                        msgIndex={msgIndex}
                        isRegularUser={isRegularUser}
                        feedbackState={feedbackState}
                        handleThumbsUp={handleThumbsUp}
                        handleThumbsDown={handleThumbsDown}
                        readFbFromStorage={readFbFromStorage}
                        selectedAgentId={selectedAgentId}
                        showDebug={showDebug}
                        setShowDebug={setShowDebug}
                        showAttribution={showAttribution}
                        setShowAttribution={setShowAttribution}
                        handleFetchAttribution={handleFetchAttribution}
                        explanationData={explanationData}
                        debateCostBrl={debateCostBrl}
                    />
                )}

                {showAttribution && (
                    <SourceAttributionView
                        attributionState={attributionState}
                        attributionData={attributionData}
                        handleFetchAttribution={handleFetchAttribution}
                        onClose={() => setShowAttribution && setShowAttribution(false)}
                        selectedAgentId={selectedAgentId}
                    />
                )}

                {msg.metrics && (
                    <DebugPanel
                        msg={msg}
                        showDebug={showDebug}
                        setActiveModal={setActiveModal}
                        setActivePreRouterTab={setActivePreRouterTab}
                        setActiveResolvedPromptTab={setActiveResolvedPromptTab}
                        explainProps={explainProps}
                    />
                )}
            </div>
        </div>
    );
};

export default LinkMessageBubble;
