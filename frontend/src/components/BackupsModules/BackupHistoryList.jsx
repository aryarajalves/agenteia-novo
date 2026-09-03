import React from 'react';

const BackupHistoryList = ({
    history,
    loadingHistory,
    fetchHistory,
    itemsPerPage,
    setItemsPerPage,
    currentPage,
    setCurrentPage,
    totalPages,
    paginatedHistory,
    selectedIds,
    handleSelectToggle,
    handleSelectAllToggle,
    isAllSelected,
    deletableHistoryItems,
    handleDeleteBatchClick,
    handlePin,
    handleRestoreClick,
    handleDownload,
    handleDeleteClick,
    formatDateTime,
    formatBytes
}) => {
    return (
        <div className="card-premium" style={{ background: 'rgba(30, 41, 59, 0.3)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', padding: '1.5rem' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>🗄️</span> Backups no S3 ({history.length})
                </h3>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    {/* Seletor de itens por página */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Mostrar:</span>
                        <select
                            value={itemsPerPage}
                            onChange={(e) => {
                                setItemsPerPage(parseInt(e.target.value));
                                setCurrentPage(1);
                            }}
                            style={{
                                padding: '0.35rem 0.75rem',
                                borderRadius: '6px',
                                backgroundColor: 'rgba(15, 23, 42, 0.6)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                color: '#fff',
                                outline: 'none',
                                fontSize: '0.85rem'
                            }}
                        >
                            <option value={5}>5</option>
                            <option value={10}>10</option>
                            <option value={20}>20</option>
                            <option value={50}>50</option>
                        </select>
                    </div>

                    <button
                        onClick={fetchHistory}
                        title="Atualizar lista"
                        style={{
                            background: 'rgba(255,255,255,0.05)',
                            border: 'none',
                            color: '#fff',
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1.1rem',
                            transition: 'background 0.2s'
                        }}
                    >
                        🔄
                    </button>
                </div>
            </header>

            {/* Barra de Ações em Lote */}
            {history.length > 0 && !loadingHistory && (
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'rgba(15, 23, 42, 0.4)',
                    padding: '0.75rem 1rem',
                    borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.05)',
                    marginBottom: '1rem'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <input
                            type="checkbox"
                            checked={isAllSelected}
                            onChange={handleSelectAllToggle}
                            disabled={deletableHistoryItems.length === 0}
                            style={{
                                width: '18px',
                                height: '18px',
                                cursor: deletableHistoryItems.length === 0 ? 'not-allowed' : 'pointer',
                                accentColor: '#8b5cf6'
                            }}
                        />
                        <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                            Selecionar Todos (não fixados nesta página)
                        </span>
                    </div>
                    {selectedIds.length > 0 && (
                        <button
                            onClick={handleDeleteBatchClick}
                            style={{
                                background: 'rgba(239, 68, 68, 0.2)',
                                color: '#f87171',
                                border: '1px solid rgba(239, 68, 68, 0.4)',
                                padding: '0.4rem 1.25rem',
                                borderRadius: '8px',
                                fontSize: '0.85rem',
                                fontWeight: '600',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                transition: 'background 0.2s'
                            }}
                        >
                            🗑️ Excluir Selecionados ({selectedIds.length})
                        </button>
                    )}
                </div>
            )}

            <div className="history-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {loadingHistory ? (
                    <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>Carregando histórico...</div>
                ) : history.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>Nenhum backup encontrado no S3.</div>
                ) : (
                    paginatedHistory.map((item) => (
                        <div
                            key={item.id}
                            className="history-item"
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '1rem',
                                borderRadius: '12px',
                                background: item.status === 'failure' ? 'rgba(239, 68, 68, 0.05)' : 'rgba(255, 255, 255, 0.02)',
                                border: `1px solid ${item.status === 'failure' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.05)'}`
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                {/* Checkbox de Seleção */}
                                {!item.is_pinned && item.status !== 'running' ? (
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.includes(item.id)}
                                        onChange={() => handleSelectToggle(item.id)}
                                        style={{
                                            width: '18px',
                                            height: '18px',
                                            cursor: 'pointer',
                                            marginRight: '0.5rem',
                                            accentColor: '#8b5cf6'
                                        }}
                                    />
                                ) : (
                                    <div style={{ width: '18px', marginRight: '0.5rem' }} />
                                )}

                                {/* Indicador de Status / Fixar */}
                                <button
                                    onClick={() => handlePin(item)}
                                    title={item.is_pinned ? "Liberar para auto-limpeza" : "Fixar backup"}
                                    style={{
                                        background: item.is_pinned ? 'rgba(217, 119, 6, 0.2)' : 'rgba(255,255,255,0.02)',
                                        border: item.is_pinned ? '1px solid rgba(217, 119, 6, 0.4)' : '1px solid rgba(255,255,255,0.05)',
                                        color: item.is_pinned ? '#f59e0b' : '#64748b',
                                        width: '32px',
                                        height: '32px',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '1rem'
                                    }}
                                >
                                    📌
                                </button>

                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <strong style={{ fontSize: '0.9rem', color: item.status === 'failure' ? '#f87171' : '#fff' }}>
                                            {item.filename}
                                        </strong>
                                        {item.is_pinned && (
                                            <span style={{ background: '#d97706', color: '#fff', fontSize: '0.65rem', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                                                FIXADO
                                            </span>
                                        )}
                                        {item.status === 'running' && (
                                            <span style={{ background: '#3b82f6', color: '#fff', fontSize: '0.65rem', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                <span style={{ display: 'inline-block', width: '8px', height: '8px', border: '1.5px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></span>
                                                EM ANDAMENTO
                                            </span>
                                        )}
                                    </div>
                                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                        {formatDateTime(item.created_at)} • {formatBytes(item.file_size_bytes)}
                                    </span>
                                    {item.status === 'failure' && (
                                        <p style={{ color: '#f87171', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                                            Erro: {item.error_message}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                {item.status === 'success' && (
                                    <>
                                        <button
                                            onClick={() => handleRestoreClick(item)}
                                            title="Restaurar este Backup (Substituir Banco)"
                                            style={{
                                                background: 'rgba(99, 102, 241, 0.1)',
                                                color: '#818cf8',
                                                border: '1px solid rgba(99, 102, 241, 0.2)',
                                                width: '32px',
                                                height: '32px',
                                                borderRadius: '8px',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '1rem'
                                            }}
                                        >
                                            🔄
                                        </button>
                                        <button
                                            onClick={() => handleDownload(item)}
                                            title="Download Backup"
                                            style={{
                                                background: 'rgba(16, 185, 129, 0.1)',
                                                color: '#10b981',
                                                border: '1px solid rgba(16, 185, 129, 0.2)',
                                                width: '32px',
                                                height: '32px',
                                                borderRadius: '8px',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}
                                        >
                                            📥
                                        </button>
                                    </>
                                )}

                                {!item.is_pinned && (
                                    <button
                                        onClick={() => handleDeleteClick(item)}
                                        title="Excluir Backup"
                                        style={{
                                            background: 'rgba(239, 68, 68, 0.1)',
                                            color: '#ef4444',
                                            border: '1px solid rgba(239, 68, 68, 0.2)',
                                            width: '32px',
                                            height: '32px',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}
                                    >
                                        🗑️
                                    </button>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Controles de Paginação */}
            {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1rem' }}>
                    <button
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(currentPage - 1)}
                        style={{
                            background: 'rgba(255,255,255,0.05)',
                            border: 'none',
                            color: '#fff',
                            padding: '0.4rem 1rem',
                            borderRadius: '6px',
                            cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                            opacity: currentPage === 1 ? 0.5 : 1,
                            fontSize: '0.85rem'
                        }}
                    >
                        Anterior
                    </button>
                    
                    <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                        Página {currentPage} de {totalPages}
                    </span>

                    <button
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage(currentPage + 1)}
                        style={{
                            background: 'rgba(255,255,255,0.05)',
                            border: 'none',
                            color: '#fff',
                            padding: '0.4rem 1rem',
                            borderRadius: '6px',
                            cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                            opacity: currentPage === totalPages ? 0.5 : 1,
                            fontSize: '0.85rem'
                        }}
                    >
                        Próxima
                    </button>
                </div>
            )}
        </div>
    );
};

export default BackupHistoryList;
