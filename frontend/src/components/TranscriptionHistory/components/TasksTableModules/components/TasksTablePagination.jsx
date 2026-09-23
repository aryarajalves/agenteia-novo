import React from 'react';

const TasksTablePagination = ({
    itemsPerPage,
    setItemsPerPage,
    setCurrentPage,
    currentPage,
    totalPages
}) => {
    return (
        <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginTop: '1.5rem', 
            paddingTop: '1.5rem',
            borderTop: '1px solid rgba(255, 255, 255, 0.05)',
            flexWrap: 'wrap', 
            gap: '1rem' 
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#94a3b8', fontSize: '0.9rem' }}>
                <span>Exibir:</span>
                <select
                    value={itemsPerPage}
                    onChange={(e) => {
                        setItemsPerPage(Number(e.target.value));
                        setCurrentPage(1); // Reseta para a primeira página ao mudar o limite
                    }}
                    style={{
                        background: 'rgba(15, 23, 42, 0.8)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        borderRadius: '8px',
                        color: 'white',
                        padding: '6px 12px',
                        cursor: 'pointer',
                        outline: 'none',
                        fontSize: '0.85rem',
                        fontWeight: '500',
                        transition: 'all 0.2s ease',
                        boxShadow: '0 4px 10px rgba(0,0,0,0.3)'
                    }}
                    onMouseEnter={(e) => {
                        e.target.style.borderColor = '#6366f1';
                        e.target.style.background = 'rgba(15, 23, 42, 0.95)';
                    }}
                    onMouseLeave={(e) => {
                        e.target.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                        e.target.style.background = 'rgba(15, 23, 42, 0.8)';
                    }}
                >
                    <option value={20} style={{ background: '#0f172a' }}>20 arquivos</option>
                    <option value={50} style={{ background: '#0f172a' }}>50 arquivos</option>
                    <option value={100} style={{ background: '#0f172a' }}>100 arquivos</option>
                </select>
            </div>

            {totalPages > 1 && (
                <div className="pagination" style={{ display: 'flex', gap: '8px', alignItems: 'center', margin: 0 }}>
                    <button 
                        type="button"
                        disabled={currentPage === 1} 
                        onClick={() => setCurrentPage(p => p - 1)}
                        className="pagination-btn"
                        style={{
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            color: currentPage === 1 ? '#4b5563' : '#e2e8f0',
                            borderRadius: '8px',
                            padding: '6px 12px',
                            cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                            fontSize: '0.85rem',
                            transition: 'all 0.2s'
                        }}
                    >
                        Anterior
                    </button>
                    <span style={{ color: '#94a3b8', fontSize: '0.85rem', padding: '0 8px' }}>
                        Página {currentPage} de {totalPages}
                    </span>
                    <button 
                        type="button"
                        disabled={currentPage === totalPages} 
                        onClick={() => setCurrentPage(p => p + 1)}
                        className="pagination-btn"
                        style={{
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            color: currentPage === totalPages ? '#4b5563' : '#e2e8f0',
                            borderRadius: '8px',
                            padding: '6px 12px',
                            cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                            fontSize: '0.85rem',
                            transition: 'all 0.2s'
                        }}
                    >
                        Próxima
                    </button>
                </div>
            )}
        </div>
    );
};

export default TasksTablePagination;
