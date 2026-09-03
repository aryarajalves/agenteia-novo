import React from 'react';

const CacheItemCard = ({ item, onEdit, onToggle, onDelete, defaultThreshold = 92 }) => {
    const hasCustomThreshold = item.similarity_threshold !== null && item.similarity_threshold !== undefined;
    const customPct = hasCustomThreshold
        ? Math.round(item.similarity_threshold > 1 ? item.similarity_threshold : item.similarity_threshold * 100)
        : null;
    const normDefault = Math.round(defaultThreshold > 1 ? defaultThreshold : defaultThreshold * 100);

    return (
        <div
            style={{
                background: item.is_active ? 'rgba(30, 41, 59, 0.4)' : 'rgba(15, 23, 42, 0.3)',
                border: `1px solid ${item.is_active ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.05)'}`,
                borderRadius: '12px',
                padding: '16px 20px',
                transition: 'all 0.2s ease',
                opacity: item.is_active ? 1 : 0.6
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{
                        background: 'rgba(99, 102, 241, 0.2)',
                        color: '#a5b4fc',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: 700
                    }}>
                        ❓ Pergunta Principal
                    </span>
                    {item.category_tag && (
                        <span
                            data-testid={`cache-tag-badge-${item.id}`}
                            style={{
                                background: 'rgba(59, 130, 246, 0.2)',
                                border: '1px solid rgba(59, 130, 246, 0.4)',
                                color: '#60a5fa',
                                padding: '3px 8px',
                                borderRadius: '6px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                            }}
                            title={`Resposta vinculada ao produto "${item.category_tag}"`}
                        >
                            🏷️ {item.category_tag}
                        </span>
                    )}
                    <strong style={{ color: '#f1f5f9', fontSize: '0.95rem' }}>{item.user_query}</strong>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {/* Badge de Similaridade (Individual vs Padrão) */}
                    {hasCustomThreshold ? (
                        <span
                            data-testid={`cache-similarity-badge-${item.id}`}
                            style={{
                                background: 'rgba(99, 102, 241, 0.2)',
                                border: '1px solid rgba(99, 102, 241, 0.4)',
                                color: '#a5b4fc',
                                padding: '4px 10px',
                                borderRadius: '20px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                            }}
                            title={`Limiar de similaridade de ${customPct}% configurado especificamente para esta pergunta`}
                        >
                            🎯 {customPct}% (Personalizado)
                        </span>
                    ) : (
                        <span
                            data-testid={`cache-similarity-badge-${item.id}`}
                            style={{
                                background: 'rgba(255, 255, 255, 0.04)',
                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                color: '#94a3b8',
                                padding: '4px 8px',
                                borderRadius: '20px',
                                fontSize: '0.72rem',
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                            }}
                            title="Esta pergunta utiliza o limiar de similaridade padrão do agente"
                        >
                            🎯 Padrão ({normDefault}%)
                        </span>
                    )}

                    <span style={{
                        background: 'rgba(16, 185, 129, 0.15)',
                        color: '#34d399',
                        padding: '4px 10px',
                        borderRadius: '20px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                    }} title="Quantidade de vezes que esta resposta foi entregue com custo zero">
                        ⚡ {item.usage_count || 0} economia{item.usage_count === 1 ? '' : 's'}
                    </span>

                    <button
                        onClick={() => onEdit(item)}
                        data-testid={`edit-cache-btn-${item.id}`}
                        style={{
                            background: 'rgba(99, 102, 241, 0.15)',
                            border: '1px solid rgba(99, 102, 241, 0.3)',
                            color: '#a5b4fc',
                            padding: '5px 10px',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            cursor: 'pointer'
                        }}
                        title="Editar pergunta ou resposta do cache"
                    >
                        ✏️ Editar
                    </button>

                    <button
                        onClick={() => onToggle(item.id)}
                        style={{
                            background: item.is_active ? 'rgba(234, 179, 8, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                            border: `1px solid ${item.is_active ? 'rgba(234, 179, 8, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
                            color: item.is_active ? '#fbbf24' : '#34d399',
                            padding: '5px 10px',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            cursor: 'pointer'
                        }}
                    >
                        {item.is_active ? '⏸️ Pausar' : '▶️ Ativar'}
                    </button>

                    <button
                        onClick={() => onDelete(item)}
                        style={{
                            background: 'rgba(239, 68, 68, 0.15)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            color: '#f87171',
                            padding: '5px 10px',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            cursor: 'pointer'
                        }}
                        title="Excluir resposta do cache"
                    >
                        🗑️ Excluir
                    </button>
                </div>
            </div>

            {/* Tags das perguntas alternativas */}
            {item.alternate_queries && Array.isArray(item.alternate_queries) && item.alternate_queries.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px', marginRight: '4px' }}>
                        🏷️ Variações:
                    </span>
                    {item.alternate_queries.map((alt, idx) => (
                        <span
                            key={idx}
                            style={{
                                background: 'rgba(56, 189, 248, 0.1)',
                                border: '1px solid rgba(56, 189, 248, 0.25)',
                                borderRadius: '12px',
                                padding: '2px 8px',
                                fontSize: '0.75rem',
                                color: '#7dd3fc'
                            }}
                        >
                            💬 {alt}
                        </span>
                    ))}
                </div>
            )}

            <div style={{
                background: 'rgba(15, 23, 42, 0.6)',
                borderRadius: '8px',
                padding: '12px 14px',
                fontSize: '0.85rem',
                color: '#cbd5e1',
                lineHeight: '1.5',
                whiteSpace: 'pre-wrap',
                border: '1px solid rgba(255, 255, 255, 0.04)'
            }}>
                <span style={{ color: '#34d399', fontWeight: 700, marginRight: '6px' }}>💬 Resposta Aprovada:</span>
                {item.approved_response}
            </div>
        </div>
    );
};

export default CacheItemCard;
