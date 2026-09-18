import React from 'react';

export default function PipelineStepMemoryAction({ step, onMaximize, variant = 'body' }) {
    if (!step) return null;

    const title = (step.title || '').toLowerCase();
    const isContextMemory = title.includes('memória de contexto') || title.includes('memoria de contexto') || (title.includes('memória') && !title.includes('erro'));

    if (!isContextMemory) return null;

    const messagesCount = step.metadata?.messages?.length || step.metadata?.total_messages || null;

    if (variant === 'header') {
        return (
            <button
                id={`btn-view-memory-header-${step.id}`}
                onClick={(e) => {
                    e.stopPropagation();
                    if (onMaximize) onMaximize(step);
                }}
                style={{
                    background: 'rgba(168, 85, 247, 0.15)',
                    border: '1px solid rgba(168, 85, 247, 0.35)',
                    color: '#c084fc',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    transition: 'all 0.2s',
                    whiteSpace: 'nowrap'
                }}
                title="Ver mensagens injetadas no contexto da IA"
            >
                <span>🧠</span>
                <span>Ver Mensagens {messagesCount ? `(${messagesCount})` : ''}</span>
            </button>
        );
    }

    // Variant === 'body'
    return (
        <div style={{ marginTop: '0.85rem' }}>
            <button
                id={`btn-view-memory-body-${step.id}`}
                onClick={(e) => {
                    e.stopPropagation();
                    if (onMaximize) onMaximize(step);
                }}
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.2) 0%, rgba(99, 102, 241, 0.2) 100%)',
                    border: '1px solid rgba(168, 85, 247, 0.45)',
                    color: '#e9d5ff',
                    padding: '0.55rem 1.1rem',
                    borderRadius: '10px',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(168, 85, 247, 0.15)',
                    transition: 'all 0.2s ease'
                }}
                onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.borderColor = 'rgba(168, 85, 247, 0.7)';
                }}
                onMouseLeave={e => {
                    e.currentTarget.style.transform = 'none';
                    e.currentTarget.style.borderColor = 'rgba(168, 85, 247, 0.45)';
                }}
            >
                <span style={{ fontSize: '1rem' }}>🧠</span>
                <span>
                    Ver Mensagens da Memória {messagesCount ? `(${messagesCount})` : ''} no Modal ↗
                </span>
            </button>
        </div>
    );
}
