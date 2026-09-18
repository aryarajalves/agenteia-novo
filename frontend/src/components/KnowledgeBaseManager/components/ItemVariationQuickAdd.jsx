import React, { useState, useEffect } from 'react';
import { api } from '../../../api/client';
import { useKB } from '../KBContext';

const MAX_VARIATIONS = 8;

const ItemVariationQuickAdd = ({ item, defaultQuery = '', onVariationAdded }) => {
    const { reloadKnowledgeBase } = useKB();
    const [isExpanded, setIsExpanded] = useState(false);
    const [variationInput, setVariationInput] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isDeletingVar, setIsDeletingVar] = useState(false);
    const [feedback, setFeedback] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    
    // Normaliza variações iniciais do item
    const getInitialVariations = () => {
        if (!item?.question_variations) return [];
        if (Array.isArray(item.question_variations)) return item.question_variations;
        if (typeof item.question_variations === 'string') {
            try {
                const parsed = JSON.parse(item.question_variations);
                return Array.isArray(parsed) ? parsed : [];
            } catch {
                return [];
            }
        }
        return [];
    };

    const [variations, setVariations] = useState(getInitialVariations());

    useEffect(() => {
        setVariations(getInitialVariations());
    }, [item?.question_variations]);

    const isMaxReached = (variations || []).length >= MAX_VARIATIONS;

    const handleOpen = () => {
        if (isMaxReached) {
            setErrorMsg(`Limite máximo de ${MAX_VARIATIONS} variações atingido. Exclua uma existente no ✕ para liberar espaço.`);
            return;
        }
        setIsExpanded(true);
        setVariationInput(defaultQuery || '');
        setErrorMsg('');
    };

    const handleSave = async () => {
        const text = variationInput.trim();
        if (!text || isSaving) return;

        if (isMaxReached) {
            setErrorMsg(`Limite de ${MAX_VARIATIONS} variações atingido. Exclua uma variação existente antes de adicionar outra.`);
            return;
        }

        if (!item?.id) {
            setErrorMsg('Item sem ID identificável para salvar.');
            return;
        }

        setIsSaving(true);
        setErrorMsg('');
        try {
            const res = await api.post(`/knowledge-items/${item.id}/variations`, {
                variation: text
            });
            const data = await res.json().catch(() => ({}));

            if (res.ok) {
                const updatedList = data.question_variations || [...variations, text];
                setVariations(updatedList);
                setFeedback('Variação adicionada com sucesso!');
                setTimeout(() => setFeedback(''), 4000);
                setIsExpanded(false);
                setVariationInput('');
                if (onVariationAdded) onVariationAdded(updatedList);
                if (reloadKnowledgeBase) reloadKnowledgeBase();
            } else {
                setErrorMsg(data.detail || 'Erro ao adicionar variação.');
            }
        } catch (err) {
            console.error('Erro ao adicionar variação:', err);
            setErrorMsg('Erro de conexão ao salvar variação.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteVariation = async (varText) => {
        if (!item?.id || isDeletingVar) return;
        setIsDeletingVar(true);
        setErrorMsg('');
        try {
            const res = await api.delete(`/knowledge-items/${item.id}/variations?variation=${encodeURIComponent(varText)}`);
            const data = await res.json().catch(() => ({}));

            if (res.ok) {
                const updatedList = data.question_variations || variations.filter(v => v !== varText);
                setVariations(updatedList);
                setFeedback('Variação removida com sucesso!');
                setTimeout(() => setFeedback(''), 4000);
                if (onVariationAdded) onVariationAdded(updatedList);
                if (reloadKnowledgeBase) reloadKnowledgeBase();
            } else {
                setErrorMsg(data.detail || 'Erro ao remover variação.');
            }
        } catch (err) {
            console.error('Erro ao remover variação:', err);
            setErrorMsg('Erro de conexão ao remover variação.');
        } finally {
            setIsDeletingVar(false);
        }
    };

    return (
        <div style={{ marginTop: '0.75rem', borderTop: '1px dashed rgba(255,255,255,0.08)', paddingTop: '0.6rem' }}>
            {/* Linha de resumo: chips de variações existentes + botão de adicionar / trava */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                {variations && variations.length > 0 && variations.map((v, i) => (
                    <span 
                        key={i} 
                        className="kb-meta-chip" 
                        style={{ 
                            background: 'rgba(99, 102, 241, 0.15)', 
                            color: '#c7d2fe', 
                            border: '1px solid rgba(99, 102, 241, 0.3)',
                            textTransform: 'none',
                            fontWeight: 500,
                            fontSize: '0.75rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}
                        title={`Variação de pergunta #${i + 1}`}
                    >
                        <span>🔀 {v}</span>
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleDeleteVariation(v); }}
                            disabled={isSaving || isDeletingVar}
                            data-testid={`delete-var-btn-${item?.id ?? 'card'}-${i}`}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#f87171',
                                cursor: 'pointer',
                                fontSize: '0.72rem',
                                padding: '0 2px',
                                lineHeight: 1
                            }}
                            title="Remover esta variação"
                        >
                            ✕
                        </button>
                    </span>
                ))}

                {!isExpanded && !isMaxReached && (
                    <button
                        type="button"
                        onClick={handleOpen}
                        data-testid={`add-var-btn-${item?.id ?? 'card'}`}
                        style={{
                            background: 'rgba(99, 102, 241, 0.12)',
                            border: '1px solid rgba(99, 102, 241, 0.35)',
                            color: '#818cf8',
                            borderRadius: '8px',
                            padding: '3px 10px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            transition: 'all 0.2s ease'
                        }}
                        title="Adicionar uma forma alternativa de fazer essa pergunta"
                    >
                        <span>+</span> Adicionar Variação ({variations.length}/{MAX_VARIATIONS})
                    </button>
                )}

                {!isExpanded && isMaxReached && (
                    <span 
                        style={{ 
                            background: 'rgba(245, 158, 11, 0.15)', 
                            border: '1px solid rgba(245, 158, 11, 0.35)', 
                            color: '#fbbf24', 
                            borderRadius: '8px', 
                            padding: '3px 10px', 
                            fontSize: '0.75rem', 
                            fontWeight: 600,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                        }}
                        data-testid={`limit-reached-badge-${item?.id ?? 'card'}`}
                        title="Limite máximo de 8 variações atingido para manter a alta precisão semântica da busca."
                    >
                        🔒 Limite de {MAX_VARIATIONS}/{MAX_VARIATIONS} variações atingido
                    </span>
                )}

                {feedback && (
                    <span 
                        style={{ color: '#34d399', fontSize: '0.78rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        data-testid={`feedback-success-${item?.id ?? 'card'}`}
                    >
                        ✓ {feedback}
                    </span>
                )}
            </div>

            {/* Explicação pedagógica quando o limite é atingido */}
            {isMaxReached && (
                <div 
                    style={{ 
                        fontSize: '0.75rem', 
                        color: '#f59e0b', 
                        marginTop: '0.4rem', 
                        fontStyle: 'italic',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                    }}
                    data-testid={`limit-explanation-${item?.id ?? 'card'}`}
                >
                    <span>💡</span>
                    <span>Para manter a alta precisão da busca (evitar diluição do vetor), cada item aceita no máximo {MAX_VARIATIONS} variações. Remova uma existente no ✕ acima para liberar espaço.</span>
                </div>
            )}

            {/* Formulário inline para adicionar variação */}
            {isExpanded && (
                <div 
                    style={{ 
                        marginTop: '0.6rem', 
                        padding: '0.75rem', 
                        background: 'rgba(0, 0, 0, 0.25)', 
                        border: '1px solid rgba(99, 102, 241, 0.25)', 
                        borderRadius: '8px' 
                    }}
                    data-testid={`var-form-${item?.id ?? 'card'}`}
                >
                    <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: '0.4rem', fontWeight: 500 }}>
                        Adicionar variação de pergunta ({variations.length}/{MAX_VARIATIONS}):
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <input
                            type="text"
                            value={variationInput}
                            onChange={(e) => setVariationInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                            placeholder="Digite a variação da pergunta..."
                            disabled={isSaving}
                            data-testid={`var-input-${item?.id ?? 'card'}`}
                            style={{
                                flex: 1,
                                background: '#090d16',
                                border: '1px solid rgba(255,255,255,0.15)',
                                borderRadius: '6px',
                                padding: '6px 10px',
                                color: '#f1f5f9',
                                fontSize: '0.82rem',
                                outline: 'none'
                            }}
                            autoFocus
                        />
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={isSaving || !variationInput.trim()}
                            data-testid={`var-save-btn-${item?.id ?? 'card'}`}
                            style={{
                                background: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                padding: '6px 14px',
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                cursor: isSaving || !variationInput.trim() ? 'not-allowed' : 'pointer',
                                opacity: isSaving || !variationInput.trim() ? 0.6 : 1,
                                whiteSpace: 'nowrap'
                            }}
                        >
                            {isSaving ? 'Salvando...' : 'Salvar'}
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsExpanded(false)}
                            disabled={isSaving}
                            data-testid={`var-cancel-btn-${item?.id ?? 'card'}`}
                            style={{
                                background: 'transparent',
                                color: '#94a3b8',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '6px',
                                padding: '6px 10px',
                                fontSize: '0.8rem',
                                cursor: 'pointer'
                            }}
                        >
                            Cancelar
                        </button>
                    </div>
                    {errorMsg && (
                        <div 
                            style={{ color: '#f87171', fontSize: '0.78rem', marginTop: '0.4rem' }}
                            data-testid={`var-error-${item?.id ?? 'card'}`}
                        >
                            ⚠️ {errorMsg}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ItemVariationQuickAdd;
