import React from 'react';
import CacheItemCard from './CacheItemCard';
import CachePagination from './CachePagination';

const SemanticCacheResponsesTab = ({
    cacheItems = [],
    totalCount = 0,
    totalPages = 1,
    currentPage = 1,
    pageSize = 20,
    loading = false,
    searchTerm = '',
    availableTags = [],
    selectedTagFilter = '',
    onTagFilterChange,
    onSearchChange,
    onOpenCreate,
    onEdit,
    onToggle,
    onDelete,
    onPageChange,
    defaultThreshold = 92
}) => {
    return (
        <div className="cache-items-section fade-in">
            {/* Barra de Ações: Título, Busca e Botão Nova Resposta */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                    <h4 style={{ margin: 0, fontSize: '1.05rem', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        📋 Respostas Cadastradas no Cache ({totalCount})
                    </h4>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
                        Perguntas e respostas aprovadas respondidas instantaneamente com 0 tokens e custo zero.
                    </p>
                </div>

                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <input
                        type="text"
                        placeholder="🔍 Buscar pergunta, variação ou resposta..."
                        value={searchTerm}
                        onChange={onSearchChange}
                        data-testid="semantic-cache-search-input"
                        style={{
                            background: 'rgba(15, 23, 42, 0.7)',
                            border: '1px solid rgba(255, 255, 255, 0.12)',
                            borderRadius: '8px',
                            padding: '8px 14px',
                            color: '#fff',
                            fontSize: '0.85rem',
                            width: '280px',
                            outline: 'none'
                        }}
                    />

                    <button
                        onClick={onOpenCreate}
                        data-testid="create-new-cache-btn"
                        style={{
                            background: 'linear-gradient(135deg, #10b981, #059669)',
                            border: 'none',
                            color: '#fff',
                            padding: '8px 16px',
                            borderRadius: '8px',
                            fontWeight: 700,
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                        }}
                    >
                        ➕ Nova Resposta
                    </button>
                </div>
            </div>

            {/* Barra de Filtros por Produto/Tag */}
            {availableTags && availableTags.length > 0 && (
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600 }}>Filtrar por Produto:</span>
                    <button
                        type="button"
                        data-testid="filter-tag-all"
                        onClick={() => onTagFilterChange && onTagFilterChange('')}
                        style={{
                            background: selectedTagFilter === '' ? 'linear-gradient(135deg, #3b82f6, #2563eb)' : 'rgba(30, 41, 59, 0.6)',
                            border: selectedTagFilter === '' ? 'none' : '1px solid rgba(148, 163, 184, 0.2)',
                            color: '#fff',
                            borderRadius: '20px',
                            padding: '4px 12px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            cursor: 'pointer'
                        }}
                    >
                        Todos os Produtos ({totalCount})
                    </button>
                    {availableTags.map(tag => (
                        <button
                            key={tag}
                            type="button"
                            data-testid={`filter-tag-${tag}`}
                            onClick={() => onTagFilterChange && onTagFilterChange(selectedTagFilter === tag ? '' : tag)}
                            style={{
                                background: selectedTagFilter === tag ? 'linear-gradient(135deg, #059669, #10b981)' : 'rgba(30, 41, 59, 0.6)',
                                border: selectedTagFilter === tag ? 'none' : '1px solid rgba(148, 163, 184, 0.2)',
                                color: selectedTagFilter === tag ? '#fff' : '#94a3b8',
                                borderRadius: '20px',
                                padding: '4px 12px',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                cursor: 'pointer'
                            }}
                        >
                            🏷️ {tag}
                        </button>
                    ))}
                </div>
            )}

            {loading ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="tab-loading-spinner" style={{ marginBottom: '12px' }} />
                    <p>Carregando respostas do cache...</p>
                </div>
            ) : cacheItems.length === 0 ? (
                <div style={{
                    textAlign: 'center',
                    padding: '48px 20px',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px dashed rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    color: '#94a3b8'
                }}>
                    <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '12px' }}>💡</span>
                    <h4 style={{ color: '#e2e8f0', margin: '0 0 6px 0' }}>
                        {searchTerm ? 'Nenhuma resposta encontrada para esta busca' : 'Nenhuma resposta aprovada cadastrada'}
                    </h4>
                    <p style={{ fontSize: '0.85rem', maxWidth: '480px', margin: '0 auto 16px' }}>
                        {searchTerm 
                            ? `Não encontramos nenhuma pergunta ou resposta contendo "${searchTerm}". Tente outro termo.`
                            : 'Converse com o agente no Chat Playground e aprove respostas no 👍 ou clique no botão abaixo para cadastrar manualmente.'}
                    </p>
                    <button
                        onClick={onOpenCreate}
                        style={{
                            background: 'linear-gradient(135deg, #10b981, #059669)',
                            border: 'none',
                            color: '#fff',
                            padding: '9px 18px',
                            borderRadius: '8px',
                            fontWeight: 700,
                            fontSize: '0.88rem',
                            cursor: 'pointer'
                        }}
                    >
                        ➕ Cadastrar Resposta Manualmente
                    </button>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {cacheItems.map((item) => (
                        <CacheItemCard
                            key={item.id}
                            item={item}
                            onEdit={onEdit}
                            onToggle={onToggle}
                            onDelete={onDelete}
                            defaultThreshold={defaultThreshold}
                        />
                    ))}

                    <CachePagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        totalCount={totalCount}
                        pageSize={pageSize}
                        onPageChange={onPageChange}
                        loading={loading}
                    />
                </div>
            )}
        </div>
    );
};

export default SemanticCacheResponsesTab;
