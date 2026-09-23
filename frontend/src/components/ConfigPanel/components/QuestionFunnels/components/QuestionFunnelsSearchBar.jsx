import React from 'react';

const QuestionFunnelsSearchBar = ({ totalItems, searchTerm, onSearchChange, onClearSearch }) => {
    if (totalItems <= 0 && !searchTerm.trim()) return null;

    return (
        <div style={{ display: 'flex', gap: '0.75rem', position: 'relative' }}>
            <input 
                type="text" 
                placeholder="Buscar por nome do funil ou pergunta gatilho..."
                value={searchTerm}
                onChange={onSearchChange}
                style={{
                    flex: 1,
                    padding: '0.55rem 2.5rem 0.55rem 0.85rem',
                    background: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    color: '#f8fafc',
                    fontSize: '0.88rem'
                }}
            />
            {searchTerm && (
                <button
                    type="button"
                    onClick={onClearSearch}
                    title="Limpar busca"
                    style={{
                        position: 'absolute',
                        right: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'transparent',
                        border: 'none',
                        color: '#94a3b8',
                        cursor: 'pointer',
                        fontSize: '1rem',
                        padding: '0.2rem 0.4rem'
                    }}
                >
                    ✕
                </button>
            )}
        </div>
    );
};

export default QuestionFunnelsSearchBar;
