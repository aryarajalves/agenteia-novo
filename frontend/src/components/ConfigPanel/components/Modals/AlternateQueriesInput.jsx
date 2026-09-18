import React, { useState, useRef, useEffect } from 'react';

const AlternateQueriesInput = ({
    queries = [],
    onChange,
    disabled = false,
    label = "➕ Outras Perguntas / Variações que ativam esta resposta (Opcional):",
    placeholder = "Ex: qual o valor do investimento?",
    testIdInput = "alternate-queries-input",
    testIdAddBtn = "alternate-queries-add-btn"
}) => {
    const [newQueryInput, setNewQueryInput] = useState('');
    const [editingIndex, setEditingIndex] = useState(null);
    const [editingText, setEditingText] = useState('');
    const editInputRef = useRef(null);

    const safeQueries = Array.isArray(queries) ? queries : [];

    useEffect(() => {
        if (editingIndex !== null && editInputRef.current) {
            editInputRef.current.focus();
            editInputRef.current.select();
        }
    }, [editingIndex]);

    const handleAdd = () => {
        const trimmed = newQueryInput.trim();
        if (!trimmed || disabled) return;

        // Evita duplicatas (case insensitive)
        if (safeQueries.some(q => q.toLowerCase() === trimmed.toLowerCase())) {
            setNewQueryInput('');
            return;
        }

        const next = [...safeQueries, trimmed];
        onChange(next);
        setNewQueryInput('');
    };

    const handleKeyDownAdd = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAdd();
        }
    };

    const handleStartEdit = (index) => {
        if (disabled) return;
        setEditingIndex(index);
        setEditingText(safeQueries[index]);
    };

    const handleSaveEdit = (index) => {
        const trimmed = editingText.trim();
        if (!trimmed) {
            // Se o usuário apagar todo o texto e salvar, remove a variação
            handleRemove(index);
            setEditingIndex(null);
            return;
        }

        // Verifica se já existe outra variação igual
        const isDuplicate = safeQueries.some((q, idx) => idx !== index && q.toLowerCase() === trimmed.toLowerCase());
        if (isDuplicate) {
            setEditingIndex(null);
            return;
        }

        const next = [...safeQueries];
        next[index] = trimmed;
        onChange(next);
        setEditingIndex(null);
    };

    const handleCancelEdit = () => {
        setEditingIndex(null);
        setEditingText('');
    };

    const handleKeyDownEdit = (e, index) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSaveEdit(index);
        } else if (e.key === 'Escape') {
            e.preventDefault();
            handleCancelEdit();
        }
    };

    const handleRemove = (indexToRemove) => {
        if (disabled) return;
        const next = safeQueries.filter((_, i) => i !== indexToRemove);
        onChange(next);
        if (editingIndex === indexToRemove) {
            setEditingIndex(null);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
            {label && (
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#c7d2fe', marginBottom: '6px' }}>
                    {label}
                </label>
            )}

            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <input
                    type="text"
                    value={newQueryInput}
                    onChange={(e) => setNewQueryInput(e.target.value)}
                    onKeyDown={handleKeyDownAdd}
                    disabled={disabled}
                    data-testid={testIdInput}
                    style={{
                        flex: 1,
                        background: 'rgba(15, 23, 42, 0.8)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '8px',
                        padding: '8px 12px',
                        color: '#fff',
                        fontSize: '0.85rem',
                        outline: 'none',
                        transition: 'border-color 0.2s'
                    }}
                    placeholder={placeholder}
                />
                <button
                    type="button"
                    onClick={handleAdd}
                    disabled={disabled || !newQueryInput.trim()}
                    data-testid={testIdAddBtn}
                    style={{
                        background: newQueryInput.trim() ? 'rgba(99, 102, 241, 0.25)' : 'rgba(99, 102, 241, 0.1)',
                        border: '1px solid rgba(99, 102, 241, 0.4)',
                        borderRadius: '8px',
                        padding: '8px 14px',
                        color: newQueryInput.trim() ? '#c7d2fe' : '#64748b',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        cursor: disabled || !newQueryInput.trim() ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s ease'
                    }}
                >
                    ＋ Adicionar
                </button>
            </div>

            {safeQueries.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }} data-testid="alternate-queries-list">
                    {safeQueries.map((alt, idx) => {
                        const isEditing = editingIndex === idx;

                        if (isEditing) {
                            return (
                                <div
                                    key={idx}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '5px',
                                        background: 'rgba(30, 27, 75, 0.95)',
                                        border: '1px solid #818cf8',
                                        borderRadius: '6px',
                                        padding: '2px 6px',
                                        boxShadow: '0 0 8px rgba(99, 102, 241, 0.4)'
                                    }}
                                >
                                    <input
                                        ref={editInputRef}
                                        type="text"
                                        value={editingText}
                                        onChange={(e) => setEditingText(e.target.value)}
                                        onKeyDown={(e) => handleKeyDownEdit(e, idx)}
                                        disabled={disabled}
                                        data-testid={`alt-query-edit-input-${idx}`}
                                        style={{
                                            background: 'rgba(15, 23, 42, 0.9)',
                                            border: '1px solid rgba(99, 102, 241, 0.4)',
                                            borderRadius: '4px',
                                            padding: '2px 6px',
                                            color: '#fff',
                                            fontSize: '0.8rem',
                                            minWidth: '160px',
                                            outline: 'none'
                                        }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => handleSaveEdit(idx)}
                                        title="Salvar alteração (Enter)"
                                        data-testid={`alt-query-save-btn-${idx}`}
                                        style={{
                                            background: 'rgba(16, 185, 129, 0.2)',
                                            border: '1px solid rgba(16, 185, 129, 0.4)',
                                            color: '#34d399',
                                            cursor: 'pointer',
                                            borderRadius: '4px',
                                            padding: '2px 6px',
                                            fontSize: '0.75rem',
                                            fontWeight: 700
                                        }}
                                    >
                                        ✓
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleCancelEdit}
                                        title="Cancelar (Esc)"
                                        data-testid={`alt-query-cancel-btn-${idx}`}
                                        style={{
                                            background: 'rgba(239, 68, 68, 0.15)',
                                            border: '1px solid rgba(239, 68, 68, 0.3)',
                                            color: '#f87171',
                                            cursor: 'pointer',
                                            borderRadius: '4px',
                                            padding: '2px 6px',
                                            fontSize: '0.75rem'
                                        }}
                                    >
                                        ✕
                                    </button>
                                </div>
                            );
                        }

                        return (
                            <span
                                key={idx}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    background: 'rgba(99, 102, 241, 0.15)',
                                    border: '1px solid rgba(99, 102, 241, 0.3)',
                                    borderRadius: '6px',
                                    padding: '3px 8px',
                                    fontSize: '0.8rem',
                                    color: '#e0e7ff',
                                    transition: 'border-color 0.2s'
                                }}
                            >
                                <span
                                    onClick={() => handleStartEdit(idx)}
                                    title="Clique para editar esta variação"
                                    data-testid={`alt-query-text-${idx}`}
                                    style={{
                                        cursor: 'pointer',
                                        textDecoration: 'none'
                                    }}
                                >
                                    {alt}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => handleStartEdit(idx)}
                                    title="Editar variação"
                                    aria-label="Editar variação"
                                    disabled={disabled}
                                    data-testid={`alt-query-edit-btn-${idx}`}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: '#a5b4fc',
                                        cursor: 'pointer',
                                        padding: 0,
                                        fontSize: '0.75rem',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        opacity: 0.75,
                                        transition: 'opacity 0.2s'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                                    onMouseLeave={(e) => e.currentTarget.style.opacity = '0.75'}
                                >
                                    ✏️
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleRemove(idx)}
                                    title="Remover variação"
                                    aria-label="Remover variação"
                                    disabled={disabled}
                                    data-testid={`alt-query-remove-btn-${idx}`}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: '#f87171',
                                        cursor: 'pointer',
                                        padding: 0,
                                        fontSize: '0.85rem',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        marginLeft: '2px'
                                    }}
                                >
                                    ✕
                                </button>
                            </span>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default AlternateQueriesInput;
