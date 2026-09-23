import React, { useState, useEffect } from 'react';
import PipelineStepAudioPlayer from './PipelineStepAudioPlayer';
import PipelineStepMediaPreview from './PipelineStepMediaPreview';
import PipelineStepExtractedVars from './PipelineStepExtractedVars';
import PipelineStepCacheDiagnostics from './PipelineStepCacheDiagnostics';
import PipelineStepMemoryAction from './PipelineStepMemoryAction';
import PipelineStepReasoning from './PipelineStepReasoning';
import PipelineStepCardHeader from './PipelineStepCardHeader';
import PipelineStepDiagnostic from './PipelineStepDiagnostic';
import PipelineStepQualificationInfo from './PipelineStepQualificationInfo';
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
                <PipelineStepCardHeader
                    step={step}
                    isCollapsed={isCollapsed}
                    setIsCollapsed={setIsCollapsed}
                    isError={isError}
                    isCacheHit={isCacheHit}
                    isCachePartial={isCachePartial}
                    isCacheMiss={isCacheMiss}
                    isQualifiedStep={isQualifiedStep}
                    copied={copied}
                    handleCopyStep={handleCopyStep}
                    onMaximize={onMaximize}
                />

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
                        <PipelineStepDiagnostic diagnostic={step.diagnostic} />

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
                        {isQualifiedStep && (
                            <PipelineStepQualificationInfo metadata={step.metadata} />
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

