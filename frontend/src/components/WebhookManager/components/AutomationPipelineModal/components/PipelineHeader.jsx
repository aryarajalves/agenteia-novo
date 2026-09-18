import React from 'react';
import { parseDate } from '../utils/pipelineHelpers';

export default function PipelineHeader({
    createdAt,
    event = {},
    loading,
    onRefresh,
    onClose,
    hasPrevious = false,
    hasNext = false,
    isLastMessage = true,
    currentIndex = 0,
    totalMessages = 1,
    onPrevious,
    onNext,
    loadingMessages = false
}) {
    const createdDate = parseDate(createdAt || event?.created_at);

    const contactName = event?.contato_nome || event?.name || '';
    const phoneRaw = event?.telefone || event?.phone || '';
    
    // Formatação de telefone amigável
    let formattedPhone = phoneRaw;
    if (phoneRaw) {
        const clean = phoneRaw.replace(/\D/g, '');
        if (clean.length === 13 && clean.startsWith('55')) {
            formattedPhone = `+55 (${clean.slice(2, 4)}) ${clean.slice(4, 9)}-${clean.slice(9)}`;
        } else if (clean.length === 12 && clean.startsWith('55')) {
            formattedPhone = `+55 (${clean.slice(2, 4)}) ${clean.slice(4, 8)}-${clean.slice(8)}`;
        } else if (clean.length === 11) {
            formattedPhone = `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`;
        }
    }

    // Tratamento de etiquetas
    let labelsList = [];
    if (event?.labels) {
        if (Array.isArray(event.labels)) {
            labelsList = event.labels;
        } else if (typeof event.labels === 'string') {
            try {
                labelsList = event.labels.startsWith('[') ? JSON.parse(event.labels) : event.labels.split(',').map(l => l.trim()).filter(Boolean);
            } catch {
                labelsList = [event.labels];
            }
        }
    }

    const hasContact = Boolean(contactName || formattedPhone);

    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
                <div style={{ 
                    width: '52px', height: '52px', borderRadius: '16px', 
                    background: 'linear-gradient(135deg, #6366f1, #4f46e5)', 
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.7rem',
                    boxShadow: '0 8px 24px rgba(99, 102, 241, 0.4)',
                    flexShrink: 0
                }}>⚡</div>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                        <h2 style={{ margin: 0, fontWeight: 900, color: '#f8fafc', fontSize: '1.4rem', letterSpacing: '-0.02em' }}>
                            Pipeline
                        </h2>
                        {hasContact && (
                            <span style={{ 
                                fontSize: '0.8rem', 
                                fontWeight: 700, 
                                color: '#a5b4fc', 
                                background: 'rgba(99, 102, 241, 0.15)', 
                                border: '1px solid rgba(99, 102, 241, 0.3)', 
                                padding: '2px 10px', 
                                borderRadius: '100px', 
                                display: 'inline-flex', 
                                alignItems: 'center', 
                                gap: '6px' 
                            }}>
                                <span>👤</span>
                                <span>{contactName || 'Lead'}</span>
                                {formattedPhone && <span style={{ color: '#818cf8', fontWeight: 500 }}>• 📱 {formattedPhone}</span>}
                            </span>
                        )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginTop: '4px', flexWrap: 'wrap' }}>
                        <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b', fontWeight: 600 }}>
                            📅 {createdDate.toLocaleDateString()} · {createdDate.toLocaleTimeString()}
                        </p>
                        {labelsList.length > 0 && (
                            <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexWrap: 'wrap' }}>
                                {labelsList.slice(0, 3).map((lbl, idx) => (
                                    <span key={idx} style={{ 
                                        fontSize: '0.7rem', 
                                        padding: '1px 7px', 
                                        borderRadius: '6px', 
                                        background: 'rgba(168, 85, 247, 0.15)', 
                                        border: '1px solid rgba(168, 85, 247, 0.3)', 
                                        color: '#c084fc', 
                                        fontWeight: 700 
                                    }}>
                                        🏷️ {lbl}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Controles de Navegação entre Mensagens do Usuário */}
            <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '10px', 
                background: 'rgba(15, 23, 42, 0.75)', 
                border: '1px solid rgba(255, 255, 255, 0.09)', 
                borderRadius: '16px', 
                padding: '6px 12px',
                boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
                backdropFilter: 'blur(10px)',
                flexWrap: 'wrap'
            }}>
                {/* Indicador de Última Mensagem */}
                {isLastMessage ? (
                    <span 
                        data-testid="last-message-badge"
                        style={{
                            fontSize: '0.75rem',
                            fontWeight: 800,
                            color: '#4ade80',
                            background: 'rgba(34, 197, 94, 0.15)',
                            border: '1px solid rgba(34, 197, 94, 0.35)',
                            padding: '4px 10px',
                            borderRadius: '100px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            letterSpacing: '0.01em',
                            boxShadow: '0 0 12px rgba(34, 197, 94, 0.2)'
                        }}
                        title="Esta é a mensagem mais recente enviada pelo usuário na conversa"
                    >
                        <span style={{ 
                            width: '7px', 
                            height: '7px', 
                            borderRadius: '50%', 
                            background: '#4ade80', 
                            boxShadow: '0 0 8px #4ade80',
                            display: 'inline-block' 
                        }} />
                        Última mensagem do usuário
                    </span>
                ) : (
                    <span 
                        data-testid="previous-message-badge"
                        style={{
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            color: '#fbbf24',
                            background: 'rgba(245, 158, 11, 0.12)',
                            border: '1px solid rgba(245, 158, 11, 0.3)',
                            padding: '4px 10px',
                            borderRadius: '100px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            letterSpacing: '0.01em'
                        }}
                        title="Você está visualizando uma mensagem anterior do histórico do usuário"
                    >
                        <span>⏱️</span>
                        Mensagem anterior ({currentIndex + 1} de {totalMessages})
                    </span>
                )}

                {/* Divisor vertical */}
                <div style={{ width: '1px', height: '20px', background: 'rgba(255, 255, 255, 0.1)' }} />

                {/* Botões de Navegação */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button
                        onClick={onPrevious}
                        disabled={!hasPrevious}
                        data-testid="pipeline-prev-msg-btn"
                        style={{
                            background: hasPrevious ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                            border: hasPrevious ? '1px solid rgba(99, 102, 241, 0.35)' : '1px solid rgba(255, 255, 255, 0.05)',
                            color: hasPrevious ? '#c7d2fe' : '#475569',
                            borderRadius: '10px',
                            padding: '5px 11px',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            cursor: hasPrevious ? 'pointer' : 'not-allowed',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            transition: 'all 0.2s',
                            opacity: hasPrevious ? 1 : 0.4
                        }}
                        title={hasPrevious ? "Ver mensagem anterior enviada pelo contato" : "Primeira mensagem registrada do contato"}
                    >
                        <span>◀</span>
                        <span>Anterior</span>
                    </button>

                    <span style={{ 
                        fontSize: '0.8rem', 
                        fontWeight: 800, 
                        color: '#94a3b8', 
                        padding: '0 4px', 
                        fontFamily: 'JetBrains Mono, monospace',
                        minWidth: '40px',
                        textAlign: 'center'
                    }}>
                        {totalMessages > 0 ? `${currentIndex + 1}/${totalMessages}` : '1/1'}
                    </span>

                    <button
                        onClick={onNext}
                        disabled={!hasNext}
                        data-testid="pipeline-next-msg-btn"
                        style={{
                            background: hasNext ? 'rgba(99, 102, 241, 0.25)' : 'rgba(255, 255, 255, 0.02)',
                            border: hasNext ? '1px solid rgba(99, 102, 241, 0.45)' : '1px solid rgba(255, 255, 255, 0.05)',
                            color: hasNext ? '#ffffff' : '#475569',
                            borderRadius: '10px',
                            padding: '5px 11px',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            cursor: hasNext ? 'pointer' : 'not-allowed',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            transition: 'all 0.2s',
                            opacity: hasNext ? 1 : 0.4,
                            boxShadow: hasNext ? '0 0 12px rgba(99, 102, 241, 0.3)' : 'none'
                        }}
                        title={hasNext ? "Ver próxima mensagem enviada pelo contato" : "Esta já é a última mensagem do contato"}
                    >
                        <span>Próxima</span>
                        <span>▶</span>
                    </button>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
                <button
                    onClick={onRefresh}
                    disabled={loading}
                    className="modal-close-btn"
                    style={{
                        width: '40px',
                        height: '40px',
                        background: 'rgba(255,255,255,0.05)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.1rem',
                        color: '#94a3b8',
                        transition: 'all 0.2s',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        opacity: loading ? 0.7 : 1
                    }}
                    title="Atualizar pipeline"
                >
                    <svg
                        width="18" height="18" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
                        style={{ animation: loading ? 'spin 0.8s linear infinite' : 'none' }}
                    >
                        <path d="M3 12a9 9 0 0 1 15.3-6.3L21 8" />
                        <path d="M21 3v5h-5" />
                        <path d="M21 12a9 9 0 0 1-15.3 6.3L3 16" />
                        <path d="M3 21v-5h5" />
                    </svg>
                </button>
                <button onClick={onClose} className="modal-close-btn" style={{ width: '40px', height: '40px', background: 'rgba(255,255,255,0.05)' }}>✕</button>
            </div>
        </div>
    );
}
