import React, { useState } from 'react';

const MAX_VARIATIONS = 8;

const QuestionVariationsInput = ({ variations = [], onChange, disabled = false, label = "Variações da Pergunta" }) => {
    const [inputVal, setInputVal] = useState('');

    const safeVariations = Array.isArray(variations) ? variations : [];
    const isMaxReached = safeVariations.length >= MAX_VARIATIONS;

    const handleAdd = () => {
        const trimmed = inputVal.trim();
        if (!trimmed || disabled || isMaxReached) return;

        // Evita duplicatas exatas
        if (safeVariations.some(v => v.toLowerCase() === trimmed.toLowerCase())) {
            setInputVal('');
            return;
        }

        const next = [...safeVariations, trimmed];
        onChange(next);
        setInputVal('');
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAdd();
        }
    };

    const handleRemove = (indexToRemove) => {
        if (disabled) return;
        const next = safeVariations.filter((_, i) => i !== indexToRemove);
        onChange(next);
    };

    return (
        <div className="kb-variations-section">
            <div className="kb-variations-header">
                <div className="kb-variations-title-row">
                    <span className="kb-variations-label">🔀 {label}</span>
                    <span 
                        className="kb-variations-count-badge"
                        style={isMaxReached ? { background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.4)' } : {}}
                    >
                        {safeVariations.length}/{MAX_VARIATIONS} {safeVariations.length === 1 ? 'variação' : 'variações'} {isMaxReached && '(Máximo)'}
                    </span>
                </div>
                <p className="kb-variations-tip">
                    💡 Formas alternativas que o usuário pode usar para fazer a mesma pergunta (ex: <em>&quot;Quem dá o curso?&quot;</em>, <em>&quot;Qual o professor?&quot;</em>). Isso melhora o acerto da IA na busca.
                </p>
            </div>

            <div className="kb-variations-input-row">
                <input
                    type="text"
                    className="kb-variations-input"
                    placeholder={isMaxReached ? "Limite de 8 variações atingido. Exclua uma existente no ✕ abaixo..." : "Digite uma variação da pergunta e tecle Enter..."}
                    value={inputVal}
                    onChange={(e) => setInputVal(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={disabled || isMaxReached}
                    data-testid="kb-variation-input"
                />
                <button
                    type="button"
                    className="kb-variations-add-btn"
                    onClick={handleAdd}
                    disabled={disabled || isMaxReached || !inputVal.trim()}
                    data-testid="kb-variation-add-btn"
                >
                    {isMaxReached ? `Limite Atingido (${MAX_VARIATIONS}/${MAX_VARIATIONS})` : '+ Adicionar'}
                </button>
            </div>

            {isMaxReached && (
                <div 
                    className="kb-variations-limit-warning"
                    data-testid="kb-variations-limit-msg"
                    style={{
                        background: 'rgba(245, 158, 11, 0.12)',
                        border: '1px solid rgba(245, 158, 11, 0.3)',
                        color: '#fbbf24',
                        borderRadius: '8px',
                        padding: '0.65rem 0.85rem',
                        fontSize: '0.8rem',
                        marginTop: '0.6rem',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '8px'
                    }}
                >
                    <span>⚠️</span>
                    <div>
                        <strong>Limite máximo de 8 variações atingido:</strong> Para evitar a diluição semântica do vetor e manter a alta assertividade da IA na busca, cada item permite no máximo 8 variações. Para adicionar uma nova pergunta equivalente, exclua uma existente clicando no <strong>✕</strong> abaixo.
                    </div>
                </div>
            )}

            {safeVariations.length > 0 ? (
                <div className="kb-variations-list" data-testid="kb-variations-list">
                    {safeVariations.map((item, idx) => (
                        <div key={idx} className="kb-variation-chip">
                            <span className="kb-variation-chip-idx">#{idx + 1}</span>
                            <span className="kb-variation-chip-text" title={item}>{item}</span>
                            <button
                                type="button"
                                className="kb-variation-chip-remove"
                                onClick={() => handleRemove(idx)}
                                disabled={disabled}
                                title="Remover variação"
                                data-testid={`remove-variation-${idx}`}
                            >
                                ✕
                            </button>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="kb-variations-empty">
                    Nenhuma variação adicionada. Adicione perguntas alternativas para aumentar o alcance da IA.
                </div>
            )}
        </div>
    );
};

export default QuestionVariationsInput;
