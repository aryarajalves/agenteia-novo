import React from 'react';

export default function ContextMemoryMessageList({
    messages,
    filteredMessages,
    stepContent,
    copiedIdx,
    onCopyMessage
}) {
    return (
        <div 
            style={{ 
                flex: 1, 
                overflowY: 'auto', 
                padding: '1.75rem 2rem', 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '1rem' 
            }} 
            className="custom-scrollbar"
        >
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
                    {stepContent && (
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
                            {stepContent}
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
                                    onClick={() => onCopyMessage(msg.content, index)}
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
    );
}
