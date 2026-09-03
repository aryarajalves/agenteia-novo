import React, { useState, useMemo, useRef, useEffect } from 'react';

const LinkExistingCacheSection = ({
    query,
    setQuery,
    existingItems,
    loadingExisting,
    selectedCacheId,
    setSelectedCacheId,
    onLinkSubmit,
    onCancel,
    isSaving
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Fechar dropdown ao clicar fora
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Filtra as perguntas e respostas do cache em tempo real
    const filteredItems = useMemo(() => {
        if (!Array.isArray(existingItems)) return [];
        if (!searchTerm.trim()) return existingItems;
        const term = searchTerm.toLowerCase().trim();
        return existingItems.filter(item => {
            const matchQuery = item.user_query?.toLowerCase().includes(term);
            const matchResponse = item.approved_response?.toLowerCase().includes(term);
            const matchAlt = Array.isArray(item.alternate_queries) && item.alternate_queries.some(alt => alt.toLowerCase().includes(term));
            return matchQuery || matchResponse || matchAlt;
        });
    }, [existingItems, searchTerm]);

    const selectedTargetItem = useMemo(() => {
        return existingItems?.find(it => String(it.id) === String(selectedCacheId)) || existingItems?.[0] || null;
    }, [existingItems, selectedCacheId]);

    const handleSearchChange = (e) => {
        const val = e.target.value;
        setSearchTerm(val);
        if (val.trim()) {
            const term = val.toLowerCase().trim();
            const firstMatch = existingItems?.find(item => 
                item.user_query?.toLowerCase().includes(term) ||
                item.approved_response?.toLowerCase().includes(term) ||
                (Array.isArray(item.alternate_queries) && item.alternate_queries.some(alt => alt.toLowerCase().includes(term)))
            );
            if (firstMatch) {
                setSelectedCacheId(String(firstMatch.id));
            }
        }
    };

    const handleSelectItem = (item) => {
        setSelectedCacheId(String(item.id));
        setIsDropdownOpen(false);
    };

    return (
        <form onSubmit={onLinkSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '18px', flex: 1, overflowY: 'auto' }}>
                {/* Pergunta a vincular */}
                <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                        ❓ Pergunta / Intenção a Vincular como Nova Variação:
                    </label>
                    <input
                        type="text"
                        data-testid="link-variation-query-input"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Digite a pergunta que ativará a resposta selecionada..."
                        style={{
                            width: '100%',
                            background: 'rgba(15, 23, 42, 0.9)',
                            border: '1px solid rgba(56, 189, 248, 0.35)',
                            borderRadius: '8px',
                            padding: '9px 13px',
                            fontSize: '0.9rem',
                            color: '#fff',
                            outline: 'none',
                            boxSizing: 'border-box'
                        }}
                    />
                </div>

                {/* Seleção com Searchable Dropdown */}
                <div ref={dropdownRef} style={{ position: 'relative' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#a5b4fc', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            🎯 Escolha a Pergunta e Resposta Existente no Cache:
                        </label>
                        {existingItems && existingItems.length > 0 && (
                            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                                {existingItems.length} {existingItems.length === 1 ? 'cadastrada' : 'cadastradas'}
                            </span>
                        )}
                    </div>

                    {loadingExisting ? (
                        <div style={{ padding: '12px', color: '#94a3b8', fontSize: '0.85rem' }}>Carregando respostas cadastradas...</div>
                    ) : (!existingItems || existingItems.length === 0) ? (
                        <div style={{ padding: '14px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '8px', color: '#fca5a5', fontSize: '0.85rem' }}>
                            Nenhuma resposta cadastrada no cache ainda para este agente. Crie uma nova na aba ao lado.
                        </div>
                    ) : (
                        <>
                            {/* Gatilho do Dropdown */}
                            <div
                                data-testid="select-existing-cache-item"
                                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                style={{
                                    width: '100%',
                                    background: 'rgba(15, 23, 42, 0.95)',
                                    border: isDropdownOpen ? '1px solid #6366f1' : '1px solid rgba(99, 102, 241, 0.4)',
                                    borderRadius: '8px',
                                    padding: '10px 14px',
                                    color: '#f8fafc',
                                    fontSize: '0.88rem',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    cursor: 'pointer',
                                    boxSizing: 'border-box',
                                    boxShadow: isDropdownOpen ? '0 0 0 2px rgba(99, 102, 241, 0.2)' : 'none',
                                    transition: 'all 0.15s ease'
                                }}
                            >
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: '8px' }}>
                                    {selectedTargetItem ? `❓ ${selectedTargetItem.user_query}` : 'Selecione uma pergunta...'}
                                </span>
                                <span style={{ color: '#818cf8', fontSize: '0.75rem', transform: isDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }}>
                                    ▼
                                </span>
                            </div>

                            {/* Menu Dropdown com Campo de Busca no Topo */}
                            {isDropdownOpen && (
                                <div
                                    style={{
                                        position: 'absolute',
                                        top: '100%',
                                        left: 0,
                                        right: 0,
                                        marginTop: '6px',
                                        background: '#0f172a',
                                        border: '1px solid rgba(99, 102, 241, 0.45)',
                                        borderRadius: '10px',
                                        padding: '10px',
                                        zIndex: 100,
                                        boxShadow: '0 12px 30px rgba(0, 0, 0, 0.7)',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '8px'
                                    }}
                                >
                                    {/* Campo de Filtro de Busca */}
                                    <div style={{ position: 'relative' }}>
                                        <input
                                            type="text"
                                            data-testid="filter-existing-cache-input"
                                            autoFocus
                                            value={searchTerm}
                                            onChange={handleSearchChange}
                                            placeholder="🔍 Digite para filtrar perguntas ou respostas..."
                                            style={{
                                                width: '100%',
                                                background: 'rgba(30, 41, 59, 0.8)',
                                                border: '1px solid rgba(99, 102, 241, 0.4)',
                                                borderRadius: '6px',
                                                padding: '8px 30px 8px 10px',
                                                color: '#fff',
                                                fontSize: '0.84rem',
                                                outline: 'none',
                                                boxSizing: 'border-box'
                                            }}
                                        />
                                        {searchTerm && (
                                            <button
                                                type="button"
                                                onClick={() => setSearchTerm('')}
                                                style={{
                                                    position: 'absolute',
                                                    right: '8px',
                                                    top: '50%',
                                                    transform: 'translateY(-50%)',
                                                    background: 'transparent',
                                                    border: 'none',
                                                    color: '#94a3b8',
                                                    cursor: 'pointer',
                                                    fontSize: '0.85rem'
                                                }}
                                            >
                                                ✕
                                            </button>
                                        )}
                                    </div>

                                    {/* Lista de Itens Filtrados */}
                                    <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        {filteredItems.length === 0 ? (
                                            <div style={{ padding: '10px', color: '#fde047', fontSize: '0.82rem', textAlign: 'center' }}>
                                                Nenhuma resposta encontrada para "{searchTerm}".
                                            </div>
                                        ) : (
                                            filteredItems.map((item) => {
                                                const isSelected = String(item.id) === String(selectedCacheId);
                                                return (
                                                    <div
                                                        key={item.id}
                                                        onClick={() => handleSelectItem(item)}
                                                        style={{
                                                            padding: '8px 10px',
                                                            borderRadius: '6px',
                                                            background: isSelected ? 'rgba(99, 102, 241, 0.25)' : 'transparent',
                                                            border: isSelected ? '1px solid rgba(99, 102, 241, 0.4)' : '1px solid transparent',
                                                            color: isSelected ? '#a5b4fc' : '#e2e8f0',
                                                            fontSize: '0.85rem',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            justifyContent: 'space-between',
                                                            alignItems: 'center',
                                                            transition: 'background 0.15s ease'
                                                        }}
                                                        onMouseEnter={(e) => {
                                                            if (!isSelected) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            if (!isSelected) e.currentTarget.style.background = 'transparent';
                                                        }}
                                                    >
                                                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                            ❓ {item.user_query}
                                                        </span>
                                                        {isSelected && <span style={{ color: '#34d399', fontSize: '0.85rem', marginLeft: '6px' }}>✓</span>}
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Preview do Item Selecionado */}
                {selectedTargetItem && (
                    <div style={{
                        background: 'rgba(30, 27, 75, 0.35)',
                        border: '1px solid rgba(99, 102, 241, 0.35)',
                        borderRadius: '12px',
                        padding: '14px 16px',
                        marginTop: '2px'
                    }}>
                        <div style={{ fontSize: '0.78rem', color: '#a5b4fc', fontWeight: 700, marginBottom: '6px', textTransform: 'uppercase' }}>
                            🔍 Prévia da Resposta que responderá a esta pergunta:
                        </div>
                        <p style={{ margin: '0 0 8px 0', fontSize: '0.88rem', color: '#f8fafc', lineHeight: '1.4' }}>
                            {selectedTargetItem.approved_response}
                        </p>

                        {selectedTargetItem.alternate_queries && selectedTargetItem.alternate_queries.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
                                <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Outras variações já ativas:</span>
                                {selectedTargetItem.alternate_queries.map((v, i) => (
                                    <span key={i} style={{ background: 'rgba(255, 255, 255, 0.06)', borderRadius: '10px', padding: '1px 6px', fontSize: '0.72rem', color: '#cbd5e1' }}>
                                        {v}
                                    </span>
                                ))}
                            </div>
                        )}

                        <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px dashed rgba(255, 255, 255, 0.1)', fontSize: '0.8rem', color: '#34d399' }}>
                            ✨ A pergunta <strong>"{query}"</strong> passará a disparar esta mesma resposta a custo zero!
                        </div>
                    </div>
                )}
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', paddingTop: '4px' }}>
                <button
                    type="button"
                    onClick={onCancel}
                    disabled={isSaving}
                    style={{
                        padding: '9px 18px',
                        borderRadius: '8px',
                        background: 'rgba(255, 255, 255, 0.08)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        color: '#fff',
                        fontWeight: 600,
                        cursor: 'pointer'
                    }}
                >
                    Cancelar
                </button>
                <button
                    type="submit"
                    disabled={isSaving || !selectedCacheId || !query.trim()}
                    data-testid="confirm-link-cache-btn"
                    style={{
                        padding: '9px 22px',
                        borderRadius: '8px',
                        background: (!selectedCacheId || !query.trim()) ? 'rgba(99, 102, 241, 0.3)' : 'linear-gradient(135deg, #6366f1, #4f46e5)',
                        border: 'none',
                        color: '#fff',
                        fontWeight: 700,
                        cursor: isSaving ? 'wait' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)'
                    }}
                >
                    {isSaving ? '⏳ Vinculando...' : '🔗 Vincular como Variação'}
                </button>
            </div>
        </form>
    );
};

export default LinkExistingCacheSection;
