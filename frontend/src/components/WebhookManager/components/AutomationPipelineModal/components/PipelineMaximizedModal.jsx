import React from 'react';
import RaioXViewerModal from '../../RaioXViewerModal';
import PreRouterViewerModal from '../../PreRouterViewerModal';
import RagViewerModal from '../../RagViewerModal';
import ContextMemoryViewerModal from '../../ContextMemoryViewerModal';

export default function PipelineMaximizedModal({
    maximizedStep,
    onClose
}) {
    if (!maximizedStep) return null;

    if (maximizedStep.title.includes('Decisão da IA') || maximizedStep.title.includes('Pre-Router')) {
        return (
            <PreRouterViewerModal 
                data={maximizedStep.content} 
                onClose={onClose} 
            />
        );
    }

    if (maximizedStep.title.includes('Raio-X')) {
        return (
            <RaioXViewerModal
                data={maximizedStep.content}
                onClose={onClose}
            />
        );
    }

    if (maximizedStep.title.includes('RAG') || maximizedStep.title.includes('Base de Conhecimento')) {
        return (
            <RagViewerModal
                data={maximizedStep.content}
                onClose={onClose}
            />
        );
    }

    if (maximizedStep.title.includes('Memória') || maximizedStep.title.includes('Contexto')) {
        return (
            <ContextMemoryViewerModal
                step={maximizedStep}
                onClose={onClose}
            />
        );
    }

    return (
        <div 
            className="premium-modal-overlay" 
            style={{ zIndex: 1200, background: 'rgba(0,0,0,0.85)' }}
        >
            <div 
                className="premium-modal-content"
                style={{ maxWidth: '900px', width: '95%', height: '80vh', borderRadius: '24px', padding: '2.5rem', display: 'flex', flexDirection: 'column' }}
                onClick={e => e.stopPropagation()}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{ fontSize: '1.5rem' }}>{maximizedStep.icon}</span>
                        <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 900, color: '#fff' }}>{maximizedStep.title}</h2>
                    </div>
                    <button 
                        onClick={onClose}
                        className="modal-close-btn"
                        style={{ width: '36px', height: '36px' }}
                    >✕</button>
                </div>
                <div 
                    style={{ 
                        flex: 1, background: 'rgba(15, 23, 42, 0.8)', borderRadius: '16px', padding: '2rem',
                        color: '#cbd5e1', fontSize: '1rem', lineHeight: '1.6', fontFamily: 'monospace',
                        whiteSpace: 'pre-wrap', overflowY: 'auto'
                    }} 
                    className="custom-scrollbar"
                >
                    {maximizedStep.content}
                </div>
            </div>
        </div>
    );
}
