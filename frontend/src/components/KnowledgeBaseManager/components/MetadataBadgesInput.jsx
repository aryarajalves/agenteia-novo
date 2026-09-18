import React, { useState, useRef } from 'react';

const MetadataBadgesInput = ({
    value = '',
    onChange,
    label = 'Metadado',
    placeholder = 'Ex: PAINEL INICIAL | Chat (Enter)',
    disabled = false
}) => {
    const [inputVal, setInputVal] = useState('');
    const inputRef = useRef(null);

    const parseBadges = (val) => {
        if (!val) return [];
        if (Array.isArray(val)) return val.map(s => String(s).trim()).filter(Boolean);
        if (typeof val === 'string') {
            if (val.includes('|')) {
                return val.split('|').map(s => s.trim()).filter(Boolean);
            }
            return [val.trim()].filter(Boolean);
        }
        return [];
    };

    const badges = parseBadges(value);

    const handleAdd = (textToAdd) => {
        const text = (textToAdd !== undefined ? textToAdd : inputVal).trim();
        if (!text || disabled) return;

        let newItems = [];
        if (text.includes('|')) {
            newItems = text.split('|').map(s => s.trim()).filter(Boolean);
        } else {
            newItems = [text];
        }

        const existingLower = badges.map(b => b.toLowerCase());
        const toAdd = newItems.filter(item => !existingLower.includes(item.toLowerCase()));

        if (toAdd.length === 0) {
            setInputVal('');
            return;
        }

        const updated = [...badges, ...toAdd];
        if (onChange) onChange(updated.join(' | '));
        setInputVal('');
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAdd();
        } else if (e.key === 'Backspace' && !inputVal && badges.length > 0) {
            e.preventDefault();
            handleRemove(badges.length - 1);
        }
    };

    const handleRemove = (indexToRemove) => {
        if (disabled) return;
        const updated = badges.filter((_, idx) => idx !== indexToRemove);
        if (onChange) onChange(updated.join(' | '));
    };

    return (
        <div className="kb-metadata-badges-wrapper">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                <label style={{ margin: 0, fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary, #94a3b8)' }}>
                    {label}
                    {badges.length > 0 && (
                        <span style={{ marginLeft: '6px', fontSize: '0.72rem', color: '#818cf8', fontWeight: 700 }}>
                            ({badges.length} {badges.length === 1 ? 'metadado' : 'metadados'})
                        </span>
                    )}
                </label>
            </div>

            <div 
                className="kb-metadata-badges-container"
                onClick={() => inputRef.current?.focus()}
                style={{
                    background: '#0f172a',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '10px',
                    padding: '6px 10px',
                    minHeight: '44px',
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'text',
                    transition: 'border-color 0.2s, box-shadow 0.2s'
                }}
            >
                {badges.map((badge, idx) => (
                    <span 
                        key={idx}
                        className="kb-metadata-badge-chip"
                        data-testid={`metadata-badge-${idx}`}
                        style={{
                            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(79, 70, 229, 0.15) 100%)',
                            border: '1px solid rgba(99, 102, 241, 0.4)',
                            color: '#c7d2fe',
                            borderRadius: '6px',
                            padding: '3px 8px',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            animation: 'modalFadeInKb 0.2s ease-out'
                        }}
                    >
                        <span style={{ fontSize: '0.72rem' }}>🏷️</span>
                        <span>{badge}</span>
                        {!disabled && (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemove(idx);
                                }}
                                data-testid={`remove-metadata-${idx}`}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: '#94a3b8',
                                    cursor: 'pointer',
                                    padding: '0 2px',
                                    fontSize: '0.75rem',
                                    lineHeight: 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                    transition: 'color 0.15s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.color = '#f87171'}
                                onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}
                                title="Remover metadado"
                            >
                                ✕
                            </button>
                        )}
                    </span>
                ))}

                <input
                    ref={inputRef}
                    type="text"
                    value={inputVal}
                    onChange={(e) => setInputVal(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    disabled={disabled}
                    data-testid="metadata-badges-input"
                    style={{
                        flex: 1,
                        minWidth: '160px',
                        background: 'transparent',
                        border: 'none',
                        outline: 'none',
                        color: '#f8fafc',
                        fontSize: '0.85rem',
                        padding: '4px 2px'
                    }}
                />
            </div>
        </div>
    );
};

export default MetadataBadgesInput;
