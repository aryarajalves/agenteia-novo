import React, { useState, useMemo } from 'react';
import { showToast } from '../utils/helpers';

export default function ContextMemoryViewerModal({ step, onClose }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('all'); // 'all', 'user', 'assistant'
    const [copiedAll, setCopiedAll] = useState(false);
    const [copiedIdx, setCopiedIdx] = useState(null);

    if (!step) return null;

    const messages = useMemo(() => {
        if (Array.isArray(step.metadata?.messages)) {
            return step.metadata.messages;
        }
        return [];
    }, [step]);

    const totalMessages = step.metadata?.total_messages || messages.length;
    const numInteractions = step.metadata?.num_interactions || Math.ceil(totalMessages / 2);
    const contextWindow = step.metadata?.context_window || 5;

    const filteredMessages = useMemo(() => {
        return messages.filter((msg, idx) => {
            const role = (msg.role || '').toLowerCase();
            const content = (msg.content || '').toLowerCase();
            
            if (roleFilter === 'user' && role !== 'user') return false;
            if (roleFilter === 'assistant' && role !== 'assistant') return false;
            
            if (searchTerm.trim()) {
                const term = searchTerm.toLowerCase();
                return content.includes(term) || role.includes(term) || String(idx + 1).includes(term);
            }
            return true;
        });
    }, [messages, roleFilter, searchTerm]);

    const userCount = useMemo(() => messages.filter(m => (m.role || '').toLowerCase() === 'user').length, [messages]);
    const assistantCount = useMemo(() => messages.filter(m => (m.role || '').toLowerCase() === 'assistant').length, [messages]);

    const handleCopyAll = () => {
        if (!messages.length) return;
        const text = messages.map((m, i) => {
            const roleLabel = m.role === 'user' ? 'Lead / Usuário' : 'Agente / Assistente';
            return `[#${i + 1} - ${roleLabel}]\n${m.content || ''}\n`;
        }).join('\n---\n\n');

        if (navigator?.clipboard?.writeText) {
            Promise.resolve(navigator.clipboard.writeText(text)).then(() => {
                setCopiedAll(true);
                setTimeout(() => setCopiedAll(false), 2000);
                showToast('Mensagens copiadas para a área de transferência!', 'success');
            }).catch(() => {
                showToast('Erro ao copiar mensagens.', 'error');
            });
        }
    };

    const handleCopyMessage = (content, idx) => {
        if (content && navigator?.clipboard?.writeText) {
            Promise.resolve(navigator.clipboard.writeText(content)).then(() => {
                setCopiedIdx(idx);
                setTimeout(() => setCopiedIdx(null), 2000);
                showToast('Mensagem copiada para a área de transferência!', 'success');
            }).catch(() => {
                showToast('Erro ao copiar mensagem.', 'error');
            });
        }
    };

    return (
        <div 
            id="context-memory-viewer-modal"
            className="fade-in"
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 1200,
                background: 'rgba(2, 6, 23, 0.95)',
                backdropFilter: 'blur(20px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '1.5rem',
                transition: 'all 0.3s'
            }}
        >
            <div 
                onClick={e => e.stopPropagation()}
                style={{
                    background: 'linear-gradient(145deg, #0f172a 0%, #1e293b 100%)',
                    border: '1px solid rgba(168, 85, 247, 0.25)',
                    borderRadius: '24px',
                    width: '100%',
                    maxWidth: '850px',
                    height: '85vh',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '0 50px 100px rgba(0, 0, 0, 0.9), 0 0 40px rgba(168, 85, 247, 0.12)',
                    overflow: 'hidden'
                }}
            >
                {/* Header */}
                <div style={{
                    padding: '1.5rem 2rem',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'rgba(255, 255, 255, 0.02)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{
                            width: '42px',
                            height: '42px',
                            borderRadius: '12px',
                            background: 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1.3rem',
                            boxShadow: '0 0 20px rgba(168, 85, 247, 0.3)'
                        }}>
                            🧠
                        </div>
                        <div>
                            <div style={{ fontWeight: 800, color: '#fff', fontSize: '1.15rem' }}>
                                Memória de Contexto Injetada
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
                                <span style={{
                                    fontSize: '0.72rem',
                                    background: 'rgba(168, 85, 247, 0.15)',
                                    color: '#c084fc',
                                    border: '1px solid rgba(168, 85, 247, 0.3)',
                                    padding: '2px 8px',
                                    borderRadius: '6px',
                                    fontWeight: 700
                                }}>
                                    💬 {totalMessages} {totalMessages === 1 ? 'mensagem' : 'mensagens'}
                                </span>
                                {numInteractions > 0 && (
                                    <span style={{
                                        fontSize: '0.72rem',
                                        background: 'rgba(99, 102, 241, 0.15)',
                                        color: '#a5b4fc',
                                        border: '1px solid rgba(99, 102, 241, 0.3)',
                                        padding: '2px 8px',
                                        borderRadius: '6px',
                                        fontWeight: 700
                                    }}>
                                        🔄 {numInteractions} {numInteractions === 1 ? 'interação' : 'interações'}
                                    </span>
                                )}
                                <span style={{
                                    fontSize: '0.72rem',
                                    background: 'rgba(148, 163, 184, 0.1)',
                                    color: '#94a3b8',
                                    border: '1px solid rgba(148, 163, 184, 0.2)',
                                    padding: '2px 8px',
                                    borderRadius: '6px',
                                    fontWeight: 700
                                }}>
                                    🎯 Janela Máx: {contextWindow * 2} msgs ({contextWindow} pares)
                                </span>
                            </div>
                        </div>
                    </div>
                    <button 
                        id="context-memory-modal-close"
                        onClick={onClose}
                        style={{
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            color: '#94a3b8',
                            borderRadius: '12px',
                            width: '36px',
                            height: '36px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            fontSize: '1rem',
                            transition: 'all 0.2s'
                        }}
                    >
                        ✕
                    </button>
                </div>

                {/* Toolbar: Filtros, Busca e Copiar Tudo */}
                <div style={{
                    padding: '0.85rem 2rem',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '1rem',
                    flexWrap: 'wrap',
                    background: 'rgba(255, 255, 255, 0.01)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <button
                            onClick={() => setRoleFilter('all')}
                            style={{
                                padding: '5px 12px',
                                borderRadius: '8px',
                                fontSize: '0.76rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                border: roleFilter === 'all' ? '1px solid rgba(168, 85, 247, 0.4)' : '1px solid rgba(255, 255, 255, 0.06)',
                                background: roleFilter === 'all' ? 'rgba(168, 85, 247, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                                color: roleFilter === 'all' ? '#e9d5ff' : '#94a3b8'
                            }}
                        >
                            Todas ({messages.length})
                        </button>
                        <button
                            onClick={() => setRoleFilter('user')}
                            style={{
                                padding: '5px 12px',
                                borderRadius: '8px',
                                fontSize: '0.76rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                border: roleFilter === 'user' ? '1px solid rgba(59, 130, 246, 0.4)' : '1px solid rgba(255, 255, 255, 0.06)',
                                background: roleFilter === 'user' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                                color: roleFilter === 'user' ? '#93c5fd' : '#94a3b8'
                            }}
                        >
                            👤 Lead ({userCount})
                        </button>
                        <button
                            onClick={() => setRoleFilter('assistant')}
                            style={{
                                padding: '5px 12px',
                                borderRadius: '8px',
                                fontSize: '0.76rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                border: roleFilter === 'assistant' ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(255, 255, 255, 0.06)',
                                background: roleFilter === 'assistant' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                                color: roleFilter === 'assistant' ? '#6ee7b7' : '#94a3b8'
                            }}
                        >
                            🤖 Agente ({assistantCount})
                        </button>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, maxWidth: '400px', justifyContent: 'flex-end' }}>
                        <input
                            type="text"
                            placeholder="Buscar no histórico..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            style={{
                                background: 'rgba(15, 23, 42, 0.6)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '8px',
                                padding: '5px 10px',
                                fontSize: '0.78rem',
                                color: '#fff',
                                width: '100%',
                                maxWidth: '220px',
                                outline: 'none'
                            }}
                        />
                        {messages.length > 0 && (
                            <button
                                onClick={handleCopyAll}
                                style={{
                                    background: copiedAll ? 'rgba(16, 185, 129, 0.2)' : 'rgba(168, 85, 247, 0.15)',
                                    border: copiedAll ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(168, 85, 247, 0.3)',
                                    color: copiedAll ? '#34d399' : '#c084fc',
                                    padding: '5px 12px',
                                    borderRadius: '8px',
                                    fontSize: '0.76rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                <span>{copiedAll ? '✓' : '📋'}</span>
                                <span>{copiedAll ? 'Copiado!' : 'Copiar Tudo'}</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Body / Chat Stream */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '1.75rem 2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }} className="custom-scrollbar">
                    {messages.length === 0 ? (
                        <div style={{
                            background: 'rgba(168, 85, 247, 0.05)',
                            border: '1px dashed rgba(168, 85, 247, 0.25)',
                            borderRadius: '16px',
                            padding: '2rem',
                            textAlign: 'center',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '0.75rem'
                        }}>
                            <span style={{ fontSize: '2rem' }}>🧠</span>
                            <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.95rem' }}>
                                Detalhes de Mensagens Não Disponíveis no Evento Legado
                            </div>
                            <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.82rem', maxWidth: '520px', lineHeight: 1.6 }}>
                                Este evento foi processado antes da atualização do gravador de metadados da memória. 
                                As próximas automações deste contato registrarão o histórico completo de mensagens injetadas aqui.
                            </p>
                            {step.content && (
                                <div style={{
                                    marginTop: '0.5rem',
                                    background: 'rgba(15, 23, 42, 0.6)',
                                    border: '1px solid rgba(255, 255, 255, 0.06)',
                                    borderRadius: '10px',
                                    padding: '0.75rem 1rem',
                                    color: '#cbd5e1',
                                    fontSize: '0.85rem',
                                    fontFamily: 'monospace'
                                }}>
                                    {step.content}
                                </div>
                            )}
                        </div>
                    ) : filteredMessages.length === 0 ? (
                        <div style={{
                            padding: '3rem',
                            textAlign: 'center',
                            color: '#64748b',
                            fontSize: '0.85rem'
                        }}>
                            Nenhuma mensagem encontrada para o filtro ou busca informada.
                        </div>
                    ) : (
                        filteredMessages.map((msg, index) => {
                            const isUser = (msg.role || '').toLowerCase() === 'user';
                            const isCopied = copiedIdx === index;

                            return (
                                <div 
                                    key={index}
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignSelf: isUser ? 'flex-start' : 'flex-end',
                                        maxWidth: '85%',
                                        width: '100%'
                                    }}
                                >
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        marginBottom: '5px',
                                        padding: '0 4px'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <span style={{ fontSize: '0.9rem' }}>{isUser ? '👤' : '🤖'}</span>
                                            <span style={{
                                                fontSize: '0.74rem',
                                                fontWeight: 800,
                                                color: isUser ? '#60a5fa' : '#34d399',
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.04em'
                                            }}>
                                                {isUser ? 'Lead / Usuário' : 'Agente de IA'}
                                            </span>
                                            <span style={{
                                                fontSize: '0.68rem',
                                                color: '#64748b',
                                                fontWeight: 700
                                            }}>
                                                #{index + 1}
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => handleCopyMessage(msg.content, index)}
                                            style={{
                                                background: 'transparent',
                                                border: 'none',
                                                color: isCopied ? '#34d399' : '#64748b',
                                                fontSize: '0.7rem',
                                                fontWeight: 600,
                                                cursor: 'pointer',
                                                padding: '2px 6px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '3px'
                                            }}
                                            title="Copiar texto desta mensagem"
                                        >
                                            <span>{isCopied ? '✓' : '📋'}</span>
                                            <span>{isCopied ? 'Copiado' : 'Copiar'}</span>
                                        </button>
                                    </div>
                                    <div style={{
                                        background: isUser 
                                            ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(51, 65, 85, 0.5) 100%)' 
                                            : 'linear-gradient(135deg, rgba(15, 23, 42, 0.85) 0%, rgba(16, 185, 129, 0.08) 100%)',
                                        border: isUser 
                                            ? '1px solid rgba(96, 165, 250, 0.25)' 
                                            : '1px solid rgba(16, 185, 129, 0.25)',
                                        borderRadius: '16px',
                                        padding: '1rem 1.25rem',
                                        color: '#e2e8f0',
                                        fontSize: '0.88rem',
                                        lineHeight: 1.6,
                                        whiteSpace: 'pre-wrap',
                                        wordBreak: 'break-word',
                                        boxShadow: isUser 
                                            ? '0 4px 15px rgba(0, 0, 0, 0.2)' 
                                            : '0 4px 15px rgba(16, 185, 129, 0.05)'
                                    }}>
                                        {msg.content || '(Mensagem vazia)'}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Footer Explicativo */}
                <div style={{
                    padding: '0.85rem 2rem',
                    borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                    background: 'rgba(15, 23, 42, 0.8)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '0.74rem',
                    color: '#64748b'
                }}>
                    <span>
                        💡 Estas mensagens foram carregadas do banco de dados e injetadas no prompt da IA como memória de curto prazo.
                    </span>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            color: '#cbd5e1',
                            padding: '4px 14px',
                            borderRadius: '8px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            cursor: 'pointer'
                        }}
                    >
                        Fechar
                    </button>
                </div>
            </div>
        </div>
    );
}
