import React from 'react';
import { useKB } from '../KBContext';
import { useKBData } from '../hooks/useKBData';
import { useKBOperations } from '../hooks/useKBOperations';

const KBTable = () => {
    const {
        kbFilterTerm, setKbFilterTerm,
        selectedItems,
        kbLabels, setItemToDelete, setIsConfirmOpen,
        itemsPerPage, setItemsPerPage,
        typeFilter, setTypeFilter,
        currentPage, setCurrentPage,
        setItemToEdit, setIsEditOpen
    } = useKB();
    
    const { paginatedItems, totalPages, totalCount } = useKBData();
    const { toggleSelect, toggleSelectAll } = useKBOperations();

    return (
        <div className="kb-table-container fade-in">
            <div className="kb-table-header">
                <input
                    type="text"
                    placeholder="Filtrar por ID (#12), pergunta ou resposta..."
                    value={kbFilterTerm}
                    onChange={e => setKbFilterTerm(e.target.value)}
                    className="kb-search-input"
                    data-testid="kb-search-input"
                />
                <div className="kb-stats">
                    <select
                        value={typeFilter}
                        onChange={e => { setTypeFilter(e.target.value); setCurrentPage(1); }}
                        className="kb-select"
                    >
                        <option value="all">Todos os Tipos</option>
                        <option value="qa">Apenas P&R</option>
                        <option value="chunks">Apenas Chunks</option>
                    </select>

                    <select
                        value={itemsPerPage}
                        onChange={e => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                        className="kb-select"
                    >
                        <option value={20}>20 por página</option>
                        <option value={50}>50 por página</option>
                        <option value={100}>100 por página</option>
                    </select>

                    <span className="kb-total-badge">Total: <strong>{totalCount}</strong> itens</span>

                    {selectedItems.size > 0 && (
                        <button
                            onClick={() => {
                                setIsConfirmOpen(true);
                            }}
                            className="kb-bulk-delete-btn"
                        >
                            🗑️ Excluir Selecionados ({selectedItems.size})
                        </button>
                    )}
                </div>
            </div>

            <table className="kb-table">
                <thead>
                    <tr>
                        <th style={{ width: '40px' }}>
                            <input 
                                type="checkbox" 
                                checked={selectedItems.size > 0 && selectedItems.size === paginatedItems.length}
                                onChange={() => toggleSelectAll(paginatedItems)}
                            />
                        </th>
                        <th style={{ width: '80px' }}>ID</th>
                        <th>{kbLabels.question}</th>
                        <th>{kbLabels.answer}</th>
                        <th style={{ width: '100px', textAlign: 'center' }}>Ações</th>
                    </tr>
                </thead>
                <tbody>
                    {paginatedItems.map((item) => (
                        <tr key={item.id || item.originalIndex}>
                            <td>
                                <input 
                                    type="checkbox" 
                                    checked={selectedItems.has(item.id)}
                                    onChange={() => toggleSelect(item.id)}
                                />
                            </td>
                            <td>
                                <span className="kb-id-badge" title={`ID do Conhecimento: #${item.id || item.originalIndex + 1}`}>
                                    #{item.id || item.originalIndex + 1}
                                </span>
                            </td>
                            <td>
                                <div style={{ fontWeight: 600, color: '#f1f5f9' }}>{item.question}</div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px', alignItems: 'center' }}>
                                    {Array.isArray(item.question_variations) && item.question_variations.length > 0 && (
                                        <span 
                                            className="kb-variation-badge" 
                                            title={`Variações:\n${item.question_variations.map((v, i) => `${i + 1}. ${v}`).join('\n')}`}
                                            data-testid={`variation-badge-${item.id || item.originalIndex}`}
                                        >
                                            🔀 +{item.question_variations.length} {item.question_variations.length === 1 ? 'variação' : 'variações'}
                                        </span>
                                    )}
                                    {item.metadata_val && item.metadata_val.split('|').map(m => m.trim()).filter(Boolean).map((meta, mIdx) => (
                                        <span 
                                            key={mIdx}
                                            className="kb-metadata-table-badge" 
                                            title={`Metadado: ${meta}`}
                                            data-testid={`metadata-badge-${item.id || item.originalIndex}-${mIdx}`}
                                        >
                                            🏷️ {meta}
                                        </span>
                                    ))}
                                </div>
                            </td>
                            <td>{item.answer}</td>
                            <td>
                                <div className="kb-row-actions">
                                    <button
                                        className="kb-row-action-btn"
                                        title="Editar item"
                                        onClick={() => {
                                            setItemToEdit(item);
                                            setIsEditOpen(true);
                                        }}
                                    >
                                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                        </svg>
                                    </button>
                                    <button
                                        className="kb-row-action-btn danger"
                                        title="Excluir item"
                                        onClick={() => {
                                            setItemToDelete({ id: item.id, index: item.originalIndex });
                                            setIsConfirmOpen(true);
                                        }}
                                    >
                                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="3 6 5 6 21 6"></polyline>
                                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
                                            <path d="M10 11v6"></path>
                                            <path d="M14 11v6"></path>
                                            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path>
                                        </svg>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {totalPages >= 1 && (
                <div className="kb-pagination">
                    <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>Anterior</button>
                    <span>Página {currentPage} de {totalPages}</span>
                    <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>Próxima</button>
                </div>
            )}
        </div>
    );
};

export default KBTable;
