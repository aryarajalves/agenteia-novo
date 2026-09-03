import React from 'react';

/**
 * Preview de mídia de imagem exclusivo com opção de ampliação
 */
export default function PipelineStepMediaPreview({ mediaUrl, onOpenImage }) {
    if (!mediaUrl) return null;

    return (
        <div style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '16px',
            padding: '0.85rem',
            marginBottom: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.65rem',
            alignItems: 'flex-start'
        }}>
            <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>🖼️</span> Imagem Original Recebida
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                        onClick={() => onOpenImage && onOpenImage(mediaUrl)}
                        style={{
                            background: 'rgba(99, 102, 241, 0.15)',
                            border: '1px solid rgba(99, 102, 241, 0.25)',
                            color: '#a5b4fc',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                        }}
                        title="Ver imagem ampliada em tela cheia"
                    >
                        🔍 Ampliar
                    </button>
                    <a 
                        href={mediaUrl} 
                        target="_blank" 
                        rel="noreferrer"
                        style={{ fontSize: '0.72rem', color: '#818cf8', textDecoration: 'none', fontWeight: 700 }}
                    >
                        Abrir Original ↗
                    </a>
                </div>
            </div>
            <img 
                src={mediaUrl} 
                alt="Imagem recebida" 
                onClick={() => onOpenImage && onOpenImage(mediaUrl)}
                style={{ 
                    maxWidth: '100%', 
                    maxHeight: '280px', 
                    borderRadius: '12px', 
                    objectFit: 'contain', 
                    border: '1px solid rgba(255,255,255,0.1)',
                    cursor: 'pointer',
                    transition: 'transform 0.2s'
                }} 
                title="Clique para ampliar"
            />
        </div>
    );
}
