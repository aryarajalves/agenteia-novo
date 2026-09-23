import React from 'react';

const TEMPERATURE_OPTIONS = ['Todos', 'Quente 🔥', 'Morno ⚡', 'Frio ❄️'];

const LeadScoringFilters = ({
    searchQuery,
    setSearchQuery,
    filterClass,
    setFilterClass,
    sortBy,
    setSortBy
}) => {
    return (
        <div className="filters-panel">
            <div className="search-box">
                <span className="search-icon">🔍</span>
                <input
                    type="text"
                    placeholder="Buscar por nome ou telefone..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="search-input"
                />
            </div>

            <div className="filter-groups">
                <div className="filter-group">
                    <span className="filter-label">Temperatura:</span>
                    <div className="filter-badges">
                        {TEMPERATURE_OPTIONS.map(type => (
                            <button
                                key={type}
                                className={`filter-badge ${filterClass === type ? 'active' : ''}`}
                                onClick={() => setFilterClass(type)}
                            >
                                {type.replace(/🔥|⚡|❄️/g, '').trim()}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="filter-group">
                    <span className="filter-label">Ordenar:</span>
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="sort-select"
                    >
                        <option value="hot">Mais Quentes (Score)</option>
                        <option value="recent">Mais Recentes</option>
                    </select>
                </div>
            </div>
        </div>
    );
};

export default LeadScoringFilters;
