import React, { useState, useEffect } from 'react';
import { api } from '../../../../api/client';

const ProductCategoryTagSelector = ({ value = '', onChange, agentId, disabled = false }) => {
    const [availableTags, setAvailableTags] = useState([]);
    const [isLoadingTags, setIsLoadingTags] = useState(false);

    useEffect(() => {
        if (!agentId) return;
        let isMounted = true;
        const fetchTags = async () => {
            setIsLoadingTags(true);
            try {
                const res = await api.get(`/semantic-cache/tags?agent_id=${agentId}`);
                if (res.ok && isMounted) {
                    const data = await res.json();
                    if (Array.isArray(data)) {
                        setAvailableTags(data);
                    }
                }
            } catch (err) {
                console.debug("Nenhuma tag prévia encontrada ou erro de rede:", err);
            } finally {
                if (isMounted) setIsLoadingTags(false);
            }
        };
        fetchTags();
        return () => { isMounted = false; };
    }, [agentId]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>🏷️ Produto / Categoria (Opcional)</span>
                </label>
                {value && (
                    <button
                        type="button"
                        onClick={() => onChange('')}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#94a3b8',
                            fontSize: '0.72rem',
                            cursor: 'pointer',
                            textDecoration: 'underline'
                        }}
                    >
                        Limpar (Tornar Geral)
                    </button>
                )}
            </div>

            <input
                type="text"
                data-testid="input-category-tag"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder="Ex: Método Laser Day, Master Sobrancelhas (ou deixe vazio para Geral)"
                disabled={disabled}
                style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: 'rgba(15, 23, 42, 0.6)',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    color: '#f8fafc',
                    fontSize: '0.85rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                }}
            />

            {/* Chips de Sugestão de Produtos Existentes */}
            {availableTags.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '2px', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Sugestões rápidas:</span>
                    {availableTags.map((tag) => {
                        const isSelected = value.trim().toLowerCase() === tag.toLowerCase();
                        return (
                            <button
                                key={tag}
                                type="button"
                                data-testid={`chip-tag-${tag}`}
                                onClick={() => onChange(isSelected ? '' : tag)}
                                style={{
                                    background: isSelected ? 'rgba(59, 130, 246, 0.3)' : 'rgba(30, 41, 59, 0.6)',
                                    border: isSelected ? '1px solid #3b82f6' : '1px solid rgba(148, 163, 184, 0.2)',
                                    color: isSelected ? '#60a5fa' : '#94a3b8',
                                    borderRadius: '12px',
                                    padding: '2px 8px',
                                    fontSize: '0.72rem',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease'
                                }}
                            >
                                {tag}
                            </button>
                        );
                    })}
                </div>
            )}
            <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                {value ? `🎯 Resposta vinculada ao produto "${value}". A IA usará apenas quando o lead estiver falando deste curso.` : '🌐 Resposta Geral: elegível para responder qualquer dúvida correspondente em qualquer contexto.'}
            </span>
        </div>
    );
};

export default ProductCategoryTagSelector;
