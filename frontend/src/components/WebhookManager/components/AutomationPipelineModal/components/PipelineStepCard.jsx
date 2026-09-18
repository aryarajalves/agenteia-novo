import React, { useState, useEffect } from 'react';
import PipelineStepAudioPlayer from './PipelineStepAudioPlayer';
import PipelineStepMediaPreview from './PipelineStepMediaPreview';
import PipelineStepExtractedVars from './PipelineStepExtractedVars';
import PipelineStepCacheDiagnostics from './PipelineStepCacheDiagnostics';
import PipelineStepMemoryAction from './PipelineStepMemoryAction';
import PipelineStepReasoning from './PipelineStepReasoning';
import { showToast } from '../../../utils/helpers';

export default function PipelineStepCard({
    step,
    eventId,
    isAllCollapsed = false,
    onMaximize,
    onOpenImage
}) {
    const [copied, setCopied] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(isAllCollapsed);

    useEffect(() => {
        setIsCollapsed(isAllCollapsed);
    }, [isAllCollapsed]);

    const handleCopyStep = (e) => {
        e.stopPropagation();
        const textToCopy = step.content || (typeof step.detail === 'string' ? step.detail : JSON.stringify(step.detail || step, null, 2));
        if (textToCopy && navigator?.clipboard?.writeText) {
            Promise.resolve(navigator.clipboard.writeText(textToCopy)).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
                showToast('Copiado para a área de transferência!', 'success');
            }).catch(() => {
                showToast('Erro ao copiar conteúdo.', 'error');
            });
        }
    };

    const content = step.content || '';
    const isLarge = content.length > 500;
    const displayedContent = isLarge ? content.slice(0, 500) + '...' : content;
    const isExtractedVars = step.title?.includes("Variáveis Extraídas") && step.metadata;
    const isExtractContent = step.title?.includes("Conteúdo Extraído");
    const isError = step.category === 'errors' || step.title?.includes('❌');
    const isQualifiedStep = Boolean(step.title?.includes('Lead Qualificado'));
    const isAgentResponse = Boolean(step.title?.includes('Resposta gerada') || step.title?.includes('Resposta da IA') || step.title?.includes('Resposta direta'));
    
    const isCacheHit = Boolean(
        step.metadata?.from_semantic_cache === true || 
        step.title?.includes('⚡ Resposta do Cache') ||
        (step.title?.includes('⚡ Cache Semântico') && !step.title?.includes('Parcial'))
    );
    const isCachePartial = Boolean(
        step.metadata?.from_semantic_cache === 'partial' ||
        step.title?.includes('Cache Semântico Parcial')
    );
    const isCacheMiss = Boolean(
        step.metadata?.from_semantic_cache === false ||
        step.title?.includes('Verificação de Cache Semântico')
    );

    const mediaUrl = step.metadata?.media_url || '';
    const mediaType = (step.metadata?.media_type || '').toLowerCase();

    // Detecção estrita de imagem:
    const isImageMedia = Boolean(
        mediaType === 'image' ||
        mediaType.includes('image') ||
        /\.(jpg|jpeg|png|webp|gif|bmp|svg)($|\?)/i.test(mediaUrl) ||
        (content && (content.includes('TIPO DE IMAGEM:') || content.includes('Imagem recebida') || content.includes('Visão Computacional') || content.includes('GPT-4o-Vision') || content.includes('gpt-4o')))
    );

    // Detecção estrita de áudio (nunca true se for imagem):
    const isAudioMedia = !isImageMedia && Boolean(
        mediaType === 'audio' ||
        mediaType.includes('audio') ||
        /\.(ogg|mp3|wav|m4a|aac|oga|opus)($|\?)/i.test(mediaUrl) ||
        (content && (content.includes('whisper') || content.includes('Áudio') || content.includes('audio')))
    );

    const previewSnippet = content || (typeof step.detail === 'string' ? step.detail : '');
    const queriesEvaluated = step.metadata?.queries_evaluated;

    return (
        <div style={{ position: 'relative' }}>
            {/* Ponto da Timeline */}
            <div style={{ 
                position: 'absolute', left: '-36px', top: '10px', width: '12px', height: '12px', 
                borderRadius: '50%', 
                background: isError ? '#ef4444' : (isCacheHit || isQualifiedStep ? '#10b981' : (isCachePartial ? '#f59e0b' : '#6366f1')), 
                border: '4px solid #0f172a',
                boxShadow: isError ? '0 0 12px #ef4444' : (isCacheHit || isQualifiedStep ? '0 0 14px rgba(16, 185, 129, 0.8)' : '0 0 12px #6366f1'), 
                zIndex: 1
            }} />

            {/* Card do Passo */}
            <div style={{ 
                background: isError ? 'rgba(239, 68, 68, 0.05)' : (isCacheHit || isQualifiedStep ? 'rgba(16, 185, 129, 0.08)' : (isCachePartial ? 'rgba(245, 158, 11, 0.06)' : 'rgba(30, 41, 59, 0.5)')), 
                border: isError ? '1px solid rgba(239, 68, 68, 0.2)' : (isCacheHit || isQualifiedStep ? '1px solid rgba(16, 185, 129, 0.35)' : (isCachePartial ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid rgba(255,255,255,0.05)')), 
                borderRadius: '20px', 
                padding: isCollapsed ? '1rem 1.25rem' : '1.5rem',
                transition: 'all 0.2s ease'
            }}>
                <div 
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        marginBottom: isCollapsed ? 0 : '1rem',
                        cursor: 'pointer',
                        userSelect: 'none'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '1.2rem' }}>{step.icon}</span>
                        <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: isError ? '#fca5a5' : (isCacheHit ? '#34d399' : (isCachePartial ? '#fbbf24' : '#f1f5f9')) }}>
                            {step.title}
                        </h3>
                        {isCacheHit ? (
                            <span style={{
                                fontSize: '0.68rem',
                                background: 'rgba(16, 185, 129, 0.2)',
                                color: '#34d399',
                                border: '1px solid rgba(16, 185, 129, 0.4)',
                                padding: '2px 8px',
                                borderRadius: '6px',
                                fontWeight: 800,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px'
                            }}>
                                <span>⚡</span> CUSTO ZERO
                            </span>
                        ) : isCachePartial ? (
                            <span style={{
                                fontSize: '0.68rem',
                                background: 'rgba(245, 158, 11, 0.15)',
                                color: '#fbbf24',
                                border: '1px solid rgba(245, 158, 11, 0.3)',
                                padding: '2px 8px',
                                borderRadius: '6px',
                                fontWeight: 800,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px'
                            }}>
                                <span>⚡</span> CACHE PARCIAL
                            </span>
                        ) : isCacheMiss ? (
                            <span style={{
                                fontSize: '0.68rem',
                                background: 'rgba(148, 163, 184, 0.1)',
                                color: '#94a3b8',
                                border: '1px solid rgba(148, 163, 184, 0.25)',
                                padding: '2px 8px',
                                borderRadius: '6px',
                                fontWeight: 800,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px'
                            }}>
                                <span>🔍</span> SIMILARIDADE INSUFICIENTE
                            </span>
                        ) : null}

                        {step.metadata?.similarity_pct && (
                            <span style={{
                                fontSize: '0.68rem',
                                background: isCacheHit ? 'rgba(16, 185, 129, 0.15)' : 'rgba(148, 163, 184, 0.1)',
                                color: isCacheHit ? '#6ee7b7' : '#cbd5e1',
                                border: `1px solid ${isCacheHit ? 'rgba(16, 185, 129, 0.3)' : 'rgba(148, 163, 184, 0.2)'}`,
                                padding: '2px 8px',
                                borderRadius: '6px',
                                fontWeight: 800
                            }}>
                                🎯 {step.metadata.similarity_pct}
                            </span>
                        )}

                        {step.metadata?.model && (
                            <span style={{
                                fontSize: '0.68rem',
                                background: 'rgba(99, 102, 241, 0.15)',
                                color: '#a5b4fc',
                                border: '1px solid rgba(99, 102, 241, 0.3)',
                                padding: '2px 8px',
                                borderRadius: '6px',
                                fontWeight: 800
                            }}>
                                🤖 {step.metadata.model}
                            </span>
                        )}

                        {step.metadata?.usage?.total_tokens > 0 && (
                            <span style={{
                                fontSize: '0.68rem',
                                background: 'rgba(168, 85, 247, 0.15)',
                                color: '#d8b4fe',
                                border: '1px solid rgba(168, 85, 247, 0.3)',
                                padding: '2px 8px',
                                borderRadius: '6px',
                                fontWeight: 800
                            }}>
                                🎟️ {step.metadata.usage.total_tokens.toLocaleString()} tok
                            </span>
                        )}

                        {step.metadata?.cost > 0 && (
                            <span style={{
                                fontSize: '0.68rem',
                                background: 'rgba(234, 179, 8, 0.15)',
                                color: '#fde047',
                                border: '1px solid rgba(234, 179, 8, 0.3)',
                                padding: '2px 8px',
                                borderRadius: '6px',
                                fontWeight: 800
                            }}>
                                💰 R$ {Number(step.metadata.cost).toFixed(4)}
                            </span>
                        )}

                        {isQualifiedStep && step.metadata?.funnel_name && (
                            <span style={{
                                fontSize: '0.68rem',
                                background: 'rgba(59, 130, 246, 0.15)',
                                color: '#60a5fa',
                                border: '1px solid rgba(59, 130, 246, 0.3)',
                                padding: '2px 8px',
                                borderRadius: '6px',
                                fontWeight: 800
                            }}>
                                🎯 {step.metadata.funnel_name}
                            </span>
                        )}

                        {isQualifiedStep && step.metadata?.lead_classification && (
                            <span style={{
                                fontSize: '0.68rem',
                                background: String(step.metadata.lead_classification).toLowerCase().includes('quente') 
                                    ? 'rgba(239, 68, 68, 0.15)' 
                                    : String(step.metadata.lead_classification).toLowerCase().includes('morno') 
                                        ? 'rgba(245, 158, 11, 0.15)' 
                                        : 'rgba(148, 163, 184, 0.15)',
                                color: String(step.metadata.lead_classification).toLowerCase().includes('quente')
                                    ? '#f87171'
                                    : String(step.metadata.lead_classification).toLowerCase().includes('morno')
                                        ? '#fbbf24'
                                        : '#94a3b8',
                                border: `1px solid ${
                                    String(step.metadata.lead_classification).toLowerCase().includes('quente') 
                                        ? 'rgba(239, 68, 68, 0.3)' 
                                        : String(step.metadata.lead_classification).toLowerCase().includes('morno')
                                            ? 'rgba(245, 158, 11, 0.3)'
                                            : 'rgba(148, 163, 184, 0.3)'
                                }`,
                                padding: '2px 8px',
                                borderRadius: '6px',
                                fontWeight: 800
                            }}>
                                🌡️ {step.metadata.lead_classification} {step.metadata.lead_score ? `(${step.metadata.lead_score}/100)` : ''}
                            </span>
                        )}

                        {isQualifiedStep && step.metadata?.labels_applied?.length > 0 && (
                            <span style={{
                                fontSize: '0.68rem',
                                background: 'rgba(16, 185, 129, 0.2)',
                                color: '#34d399',
                                border: '1px solid rgba(16, 185, 129, 0.4)',
                                padding: '2px 8px',
                                borderRadius: '6px',
                                fontWeight: 800,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                            }}>
                                🏷️ {step.metadata.labels_applied.join(', ')}
                            </span>
                        )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {/* Botão de Ver Mensagens da Memória (se for etapa de memória) */}
                        <PipelineStepMemoryAction step={step} onMaximize={onMaximize} variant="header" />

                        {/* Botão de Copiar Conteúdo do Passo */}
                        <button
                            onClick={handleCopyStep}
                            style={{
                                background: copied ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                                border: copied ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(255, 255, 255, 0.1)',
                                color: copied ? '#34d399' : '#94a3b8',
                                padding: '3px 8px',
                                borderRadius: '6px',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                transition: 'all 0.2s'
                            }}
                            title="Copiar texto desta etapa"
                        >
                            <span>{copied ? '✓' : '📋'}</span>
                            <span>{copied ? 'Copiado!' : 'Copiar'}</span>
                        </button>

                        {step.durationFormatted && (
                            <span style={{
                                fontSize: '0.75rem',
                                color: '#818cf8',
                                background: 'rgba(99, 102, 241, 0.1)',
                                border: '1px solid rgba(99, 102, 241, 0.2)',
                                padding: '2px 6px',
                                borderRadius: '6px',
                                fontWeight: 700
                            }}>
                                ⚡ {step.durationFormatted}
                            </span>
                        )}
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            {step.timestampFormatted}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            {isCollapsed ? '▼' : '▲'}
                        </span>
                    </div>
                </div>

                {isCollapsed && previewSnippet && (
                    <p style={{
                        margin: 0,
                        fontSize: '0.82rem',
                        color: '#94a3b8',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        fontFamily: 'monospace'
                    }}>
                        {previewSnippet}
                    </p>
                )}

                {!isCollapsed && (
                    <>
                        {/* Diagnóstico de Erro (se houver) */}
                        {step.diagnostic && (
                            <div style={{
                                background: 'rgba(239, 68, 68, 0.08)',
                                border: '1px solid rgba(239, 68, 68, 0.25)',
                                borderRadius: '14px',
                                padding: '1rem 1.25rem',
                                marginBottom: '1rem',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '6px'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ fontSize: '1.1rem' }}>💡</span>
                                    <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#fca5a5' }}>
                                        {step.diagnostic.title}
                                    </span>
                                </div>
                                <p style={{ margin: 0, fontSize: '0.82rem', color: '#cbd5e1', lineHeight: '1.5' }}>
                                    {step.diagnostic.tip}
                                </p>
                                {step.diagnostic.action && (
                                    <div style={{ marginTop: '4px' }}>
                                        <span style={{
                                            fontSize: '0.72rem',
                                            background: 'rgba(239, 68, 68, 0.2)',
                                            color: '#fca5a5',
                                            padding: '2px 8px',
                                            borderRadius: '6px',
                                            fontWeight: 700
                                        }}>
                                            Ação Sugerida: {step.diagnostic.action}
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Player de Áudio exclusivo com controles de velocidade */}
                        {isExtractContent && mediaUrl && isAudioMedia && (
                            <PipelineStepAudioPlayer mediaUrl={mediaUrl} />
                        )}

                        {/* Preview de Imagem exclusivo com visualização ampliada */}
                        {isExtractContent && mediaUrl && isImageMedia && (
                            <PipelineStepMediaPreview mediaUrl={mediaUrl} onOpenImage={onOpenImage} />
                        )}

                        {/* Diagnóstico detalhado de Perguntas e Similaridades do Cache Semântico */}
                        {queriesEvaluated && queriesEvaluated.length > 0 && (
                            <PipelineStepCacheDiagnostics 
                                queriesEvaluated={queriesEvaluated}
                                maxSimilarity={step.metadata?.max_similarity}
                                threshold={step.metadata?.threshold}
                            />
                        )}

                        {/* Bloco visual de etiquetas e classificação para a etapa de qualificação */}
                        {isQualifiedStep && step.metadata && (
                            <div style={{
                                background: 'rgba(15, 23, 42, 0.6)',
                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                borderRadius: '12px',
                                padding: '0.85rem 1rem',
                                marginBottom: '1rem',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8' }}>
                                        Etiquetas no Contato:
                                    </span>
                                    {step.metadata.labels_applied?.length > 0 ? (
                                        step.metadata.labels_applied.map((lbl, idx) => (
                                            <span key={idx} style={{
                                                fontSize: '0.78rem',
                                                background: 'rgba(16, 185, 129, 0.2)',
                                                color: '#34d399',
                                                border: '1px solid rgba(16, 185, 129, 0.4)',
                                                padding: '2px 8px',
                                                borderRadius: '6px',
                                                fontWeight: 700
                                            }}>
                                                🏷️ {lbl}
                                            </span>
                                        ))
                                    ) : (
                                        <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontStyle: 'italic' }}>
                                            {step.metadata.lead_classification ? `Nenhuma etiqueta aplicada (Lead ${step.metadata.lead_classification})` : 'Nenhuma etiqueta aplicada'}
                                        </span>
                                    )}
                                    
                                    {step.metadata.labels_removed?.length > 0 && (
                                        <span style={{
                                            fontSize: '0.72rem',
                                            color: '#64748b',
                                            marginLeft: 'auto'
                                        }}>
                                            (Removidas: {step.metadata.labels_removed.join(', ')})
                                        </span>
                                    )}
                                </div>
                            </div>
                        )}

                        <div style={{ 
                            background: 'rgba(15, 23, 42, 0.4)', borderRadius: '16px', padding: '1.25rem',
                            color: '#cbd5e1', fontSize: '0.85rem', lineHeight: '1.6', fontFamily: 'monospace',
                            whiteSpace: 'pre-wrap', position: 'relative', border: '1px solid rgba(255,255,255,0.02)',
                            wordBreak: 'break-all', overflowWrap: 'break-word'
                        }}>
                            {isExtractedVars ? (
                                <PipelineStepExtractedVars metadata={step.metadata} />
                            ) : (
                                <>
                                    {displayedContent}
                                    <PipelineStepMemoryAction step={step} onMaximize={onMaximize} variant="body" />
                                    {isLarge && (
                                        <button 
                                            onClick={() => onMaximize && onMaximize(step)}
                                            style={{
                                                display: 'block', marginTop: '0.75rem', background: 'none',
                                                border: 'none', color: '#818cf8', cursor: 'pointer',
                                                padding: 0, fontSize: '0.8rem', fontWeight: 600
                                            }}
                                        >
                                            Ver texto completo no modal expandido ↗
                                        </button>
                                    )}
                                </>
                            )}
                        </div>

                        {isAgentResponse && (
                            <PipelineStepReasoning step={step} eventId={eventId || step.eventId || step.metadata?.event_id} />
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
