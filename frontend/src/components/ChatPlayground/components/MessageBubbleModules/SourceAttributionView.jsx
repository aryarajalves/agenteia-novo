import React from 'react';
import { useNavigate } from 'react-router-dom';

const SourceAttributionView = ({
    attributionState,
    attributionData,
    handleFetchAttribution,
    onClose,
    selectedAgentId
}) => {
    const navigate = useNavigate();

    if (attributionState === 'idle' || !attributionState) {
        return null;
    }

    const sourceMeta = {
        knowledge_base: {
            badgeClass: 'kb',
            icon: '📚',
            label: 'Base de Conhecimento',
            cardClass: 'source-kb'
        },
        system_prompt: {
            badgeClass: 'prompt',
            icon: '📝',
            label: 'Prompt do Agente',
            cardClass: 'source-prompt'
        },
        dynamic_prompt: {
            badgeClass: 'dynamic',
            icon: '⚡',
            label: 'Diretriz Dinâmica',
            cardClass: 'source-dynamic'
        },
        context_variable: {
            badgeClass: 'variable',
            icon: '🏷️',
            label: 'Variável de Contexto',
            cardClass: 'source-variable'
        },
        general_reasoning: {
            badgeClass: 'general',
            icon: '🧠',
            label: 'Raciocínio Geral',
            cardClass: 'source-general'
        }
    };

    return (
        <div className="source-attribution-panel" data-testid="source-attribution-panel">
            <div className="source-attribution-header">
                <div className="source-attribution-title">
                    <span>🏷️</span>
                    <span>Mapeamento de Fontes & Citações</span>
                </div>
                {onClose && (
                    <button
                        onClick={onClose}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#94a3b8',
                            cursor: 'pointer',
                            fontSize: '0.85rem'
                        }}
                        title="Fechar Mapeamento"
                    >
                        ✖️
                    </button>
                )}
            </div>

            {attributionState === 'loading' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 0' }} data-testid="attribution-loading">
                    <div style={{
                        width: '18px',
                        height: '18px',
                        border: '2px solid rgba(129, 140, 248, 0.3)',
                        borderTop: '2px solid #818cf8',
                        borderRadius: '50%',
                        animation: 'spin 0.8s linear infinite',
                        flexShrink: 0
                    }} />
                    <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                        Analisando origem e citações de cada trecho da resposta...
                    </span>
                </div>
            )}

            {attributionState === 'error' && (
                <div style={{ padding: '8px 0', fontSize: '0.8rem', color: '#f87171', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>❌ Não foi possível carregar o mapeamento de fontes.</span>
                    <button
                        onClick={handleFetchAttribution}
                        style={{
                            background: 'rgba(239, 68, 68, 0.15)',
                            border: '1px solid rgba(239, 68, 68, 0.4)',
                            color: '#f87171',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '0.72rem',
                            cursor: 'pointer'
                        }}
                    >
                        Tentar novamente
                    </button>
                </div>
            )}

            {attributionState === 'done' && attributionData && (
                <>
                    {attributionData.summary && (
                        <div className="source-attribution-summary" data-testid="attribution-summary">
                            💡 <strong>Visão Geral:</strong> {attributionData.summary}
                        </div>
                    )}

                    <div className="source-segments-list">
                        {attributionData.segments?.map((seg, idx) => {
                            const meta = sourceMeta[seg.source_type] || sourceMeta.general_reasoning;
                            return (
                                <div 
                                    key={idx} 
                                    className={`source-segment-card ${meta.cardClass}`}
                                    data-testid={`source-segment-${idx}`}
                                >
                                    <div className="source-segment-meta">
                                        <span className={`source-badge ${meta.badgeClass}`}>
                                            {meta.icon} {meta.label}
                                        </span>
                                        <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>
                                            Parte #{seg.segment_index || idx + 1}
                                        </span>
                                    </div>

                                    {/* Trecho gerado pela IA */}
                                    <div className="source-segment-text">
                                        "{seg.text}"
                                    </div>

                                    {/* Snippet da Fonte Original */}
                                    {seg.source_snippet && (
                                        <div className="source-snippet-box">
                                            <span className="source-snippet-label">
                                                <span>📌</span> {seg.source_title || 'Trecho da Fonte Original'}
                                            </span>
                                            <div className="source-snippet-content">
                                                {seg.source_snippet}
                                            </div>
                                        </div>
                                    )}

                                    {/* Explicação da IA */}
                                    {seg.explanation && (
                                        <div className="source-explanation-note">
                                            ℹ️ {seg.explanation}
                                        </div>
                                    )}

                                    {/* Botões de Ação com Links */}
                                    {seg.link && seg.link.url && (
                                        <div className="source-action-links">
                                            <button
                                                className={`source-link-btn ${seg.source_type === 'knowledge_base' ? 'kb-btn' : ''}`}
                                                onClick={() => {
                                                    if (seg.link.url.startsWith('/')) {
                                                        navigate(seg.link.url);
                                                    } else {
                                                        window.open(seg.link.url, '_blank');
                                                    }
                                                }}
                                                title={`Navegar para ${seg.link.label}`}
                                            >
                                                <span>🔗</span>
                                                <span>{seg.link.label}</span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
};

export default SourceAttributionView;
