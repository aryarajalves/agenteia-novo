import React, { useState } from 'react';

const LeadQuestionCard = ({ question, onAddToCache, onIgnoreQuestion, formatDate }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div
            data-testid={`lead-question-card-${question.event_id}`}
            style={{
                background: 'rgba(15, 23, 42, 0.65)',
                border: question.from_cache ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid rgba(245, 158, 11, 0.25)',
                borderRadius: '12px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                transition: 'all 0.2s ease'
            }}
        >
            {/* Header: Contato, Data e Status */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: question.from_cache ? 'linear-gradient(135deg, #059669, #10b981)' : 'linear-gradient(135deg, #d97706, #f59e0b)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: '0.85rem'
                    }}>
                        {(question.contact_name || question.contact_phone || 'L')[0].toUpperCase()}
                    </div>
                    <div>
                        <div style={{ color: '#f1f5f9', fontWeight: 600, fontSize: '0.88rem' }}>
                            {question.contact_name || 'Contato Sem Nome'}
                        </div>
                        <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>
                            {question.contact_phone || 'Sem telefone'} • {formatDate(question.created_at)}
                        </div>
                    </div>
                </div>

                {/* Badge de Status do Cache */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {question.from_cache ? (
                        <span style={{
                            padding: '4px 10px',
                            borderRadius: '20px',
                            background: 'rgba(16, 185, 129, 0.15)',
                            border: '1px solid rgba(16, 185, 129, 0.35)',
                            color: '#34d399',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                        }}>
                            ⚡ No Cache {question.similarity_pct ? `(${question.similarity_pct})` : ''}
                        </span>
                    ) : (
                        <span style={{
                            padding: '4px 10px',
                            borderRadius: '20px',
                            background: 'rgba(245, 158, 11, 0.15)',
                            border: '1px solid rgba(245, 158, 11, 0.35)',
                            color: '#fbbf24',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                        }}>
                            💡 Sem Cache {question.similarity_pct ? `(Mais próxima: ${question.similarity_pct})` : ''}
                        </span>
                    )}
                </div>
            </div>

            {/* Pergunta do Lead */}
            <div style={{
                background: 'rgba(30, 41, 59, 0.5)',
                borderRadius: '8px',
                padding: '12px 14px',
                borderLeft: question.from_cache ? '3px solid #10b981' : '3px solid #f59e0b'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <div style={{ fontSize: '0.74rem', color: question.original_message ? '#60a5fa' : '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
                        {question.original_message ? '🎯 Dúvida Individual Identificada:' : 'Dúvida enviada pelo lead:'}
                    </div>
                </div>
                <div style={{ color: '#f8fafc', fontSize: '0.92rem', fontWeight: 600, lineHeight: 1.4 }}>
                    "{question.user_query}"
                </div>
                {question.original_message && question.original_message !== question.user_query && (
                    <div style={{
                        marginTop: '8px',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        background: 'rgba(15, 23, 42, 0.5)',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        fontSize: '0.76rem',
                        color: '#94a3b8'
                    }}>
                        💬 <span style={{ fontWeight: 600, color: '#cbd5e1' }}>Mensagem completa do lead:</span> "{question.original_message}"
                    </div>
                )}
            </div>

            {/* Resposta dada pela IA (Expansível) */}
            {question.agent_response && (
                <div style={{ background: 'rgba(15, 23, 42, 0.4)', borderRadius: '8px', padding: '10px 14px' }}>
                    <div
                        onClick={() => setIsExpanded(!isExpanded)}
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            cursor: 'pointer',
                            userSelect: 'none'
                        }}
                    >
                        <span style={{ fontSize: '0.74rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
                            🤖 Resposta enviada pelo robô {isExpanded ? '▲' : '▼'}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: '#60a5fa' }}>
                            {isExpanded ? 'Recolher' : 'Ver resposta'}
                        </span>
                    </div>

                    {isExpanded && (
                        <div style={{
                            marginTop: '8px',
                            paddingTop: '8px',
                            borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                            color: '#cbd5e1',
                            fontSize: '0.84rem',
                            lineHeight: 1.5,
                            whiteSpace: 'pre-wrap'
                        }}>
                            {question.agent_response}
                        </div>
                    )}
                </div>
            )}

            {/* Footer com Ações */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
                {onIgnoreQuestion && (
                    <button
                        type="button"
                        data-testid={`btn-ignore-question-${question.event_id}`}
                        onClick={() => onIgnoreQuestion(question)}
                        style={{
                            padding: '7px 12px',
                            borderRadius: '8px',
                            border: '1px solid rgba(239, 68, 68, 0.25)',
                            background: 'rgba(239, 68, 68, 0.08)',
                            color: '#f87171',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.18)';
                            e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.4)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)';
                            e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.25)';
                        }}
                    >
                        <span>🚫 Não Vale a Pena</span>
                    </button>
                )}

                <button
                    type="button"
                    data-testid={`btn-add-cache-${question.event_id}`}
                    onClick={() => onAddToCache({
                        event_id: question.event_id,
                        user_query: question.user_query,
                        approved_response: question.agent_response || ''
                    })}
                    style={{
                        padding: '7px 14px',
                        borderRadius: '8px',
                        border: 'none',
                        background: 'linear-gradient(135deg, #059669, #10b981)',
                        color: '#fff',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 2px 8px rgba(16, 185, 129, 0.25)',
                        transition: 'transform 0.15s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                    <span>⚡ Adicionar ao Cache</span>
                </button>
            </div>
        </div>
    );
};

export default LeadQuestionCard;
