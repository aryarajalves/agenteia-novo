import React from 'react';
import { LEVELS, LEVEL_COLORS, inputStyle, chipStyle } from './constants';

const LogsFilterBar = ({
    containers,
    selectedContainers,
    toggleContainer,
    quickFilters,
    activeTags,
    toggleTag,
    selectedDay,
    timeFrom,
    setTimeFrom,
    timeTo,
    setTimeTo,
    search,
    setSearch,
    handleSearchKeyDown,
    searchTerms,
    setSearchTerms,
    removeSearchTerm,
    activeLevels,
    toggleLevel,
    levelCounts,
    errors
}) => {
    return (
        <>
            {/* Seletor de containers */}
            {containers.length > 0 && (
                <div style={{ marginBottom: '1.25rem' }}>
                    <label style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>
                        Containers ({selectedContainers.length === 0 ? 'todos' : selectedContainers.length} selecionado{selectedContainers.length === 1 ? '' : 's'})
                    </label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {containers.map((c) => (
                            <span
                                key={c.name}
                                onClick={() => toggleContainer(c.name)}
                                style={chipStyle(selectedContainers.includes(c.name))}
                                title={`${c.image} — ${c.status}`}
                            >
                                {c.status === 'running' ? '🟢' : '⚪'} {c.name}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Filtros rápidos por tag */}
            {quickFilters.length > 0 && (
                <div style={{ marginBottom: '1rem' }}>
                    <label style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>Filtros Rápidos</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {quickFilters.map((f) => (
                            <span key={f.key} onClick={() => toggleTag(f.key)} style={chipStyle(activeTags.includes(f.key))}>
                                {f.label}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Horário + busca */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: '1rem', marginBottom: '1.25rem' }}>
                <div>
                    <label style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>Horário De</label>
                    <input type="time" step="1" value={timeFrom} onChange={(e) => setTimeFrom(e.target.value)} style={inputStyle} disabled={!selectedDay} title={!selectedDay ? 'Selecione um dia específico para filtrar por horário' : ''} />
                </div>
                <div>
                    <label style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>Horário Até</label>
                    <input type="time" step="1" value={timeTo} onChange={(e) => setTimeTo(e.target.value)} style={inputStyle} disabled={!selectedDay} title={!selectedDay ? 'Selecione um dia específico para filtrar por horário' : ''} />
                </div>
                <div>
                    <label style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>Busca no texto</label>
                    <input type="text" placeholder="Buscar e pressionar Enter para fixar..." value={search} onChange={(e) => setSearch(e.target.value)}
                        onKeyDown={handleSearchKeyDown} style={inputStyle} />
                </div>
            </div>

            {/* Badges dos termos de busca fixados (Enter) */}
            {searchTerms.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', marginTop: '-0.75rem' }}>
                    <span style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>Contém:</span>
                    {searchTerms.map((term) => (
                        <span key={term} style={{
                            display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                            padding: '0.3rem 0.7rem', borderRadius: '999px', fontSize: '0.78rem', fontWeight: 600,
                            background: 'rgba(139, 92, 246, 0.18)', border: '1px solid rgba(139, 92, 246, 0.4)', color: '#c4b5fd'
                        }}>
                            {term}
                            <span onClick={() => removeSearchTerm(term)} style={{ cursor: 'pointer', opacity: 0.8, fontWeight: 700 }}>✕</span>
                        </span>
                    ))}
                    <span
                        onClick={() => setSearchTerms([])}
                        style={{ fontSize: '0.75rem', color: '#64748b', cursor: 'pointer', textDecoration: 'underline', marginLeft: '0.25rem' }}
                    >
                        limpar todos
                    </span>
                </div>
            )}

            {/* Níveis */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>Nível:</span>
                {LEVELS.map((lvl) => (
                    <span key={lvl} onClick={() => toggleLevel(lvl)} style={chipStyle(activeLevels.includes(lvl), LEVEL_COLORS[lvl])}>
                        {lvl} {levelCounts[lvl] !== undefined ? `(${levelCounts[lvl]})` : ''}
                    </span>
                ))}
            </div>

            {errors.length > 0 && (
                <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px', padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.8rem', color: '#f87171' }}>
                    Não foi possível ler os logs de: {errors.map((e) => e.container).join(', ')}
                </div>
            )}
        </>
    );
};

export default LogsFilterBar;
