import React, { useState, useMemo, useEffect } from 'react';
import SessionItem from './SessionItem';

const PAGE_SIZE = 20;

const HistoryList = ({
    sessions = [],
    historyFilter,
    setHistoryFilter,
    isSelectionMode,
    toggleSelectionMode,
    selectedSessions,
    toggleSelectAll,
    setShowDeleteConfirm,
    extractBatchQuestions,
    toggleSessionSelection,
    loadSession,
    currentSessionId
}) => {
    const [currentPage, setCurrentPage] = useState(1);

    // Filtra as conversas de acordo com a aba (Tudo vs Testes)
    const filteredSessions = useMemo(() => {
        return (sessions || []).filter(s => historyFilter === 'all' || s.is_test_session);
    }, [sessions, historyFilter]);

    // Reseta para a página 1 ao mudar de filtro ou se a lista for alterada
    useEffect(() => {
        setCurrentPage(1);
    }, [historyFilter]);

    const totalPages = Math.max(1, Math.ceil(filteredSessions.length / PAGE_SIZE));
    
    // Garante que a página atual nunca fique acima do limite
    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [currentPage, totalPages]);

    const startIndex = (currentPage - 1) * PAGE_SIZE;
    const currentSessions = filteredSessions.slice(startIndex, startIndex + PAGE_SIZE);

    return (
        <div className="history-list fade-in">
            <div className="history-header-actions">
                <div className="title-row">
                    <h4 style={{ color: 'white', margin: 0 }}>Conversas Anteriores</h4>
                    <button
                        className={`manage-btn ${isSelectionMode ? 'active' : ''}`}
                        onClick={toggleSelectionMode}
                        title={isSelectionMode ? "Cancelar Seleção" : "Gerenciar Conversas"}
                        data-testid="history-manage-btn"
                    >
                        {isSelectionMode ? '✖' : '⚙️'}
                    </button>
                </div>

                <div className="history-filters">
                    <button
                        onClick={() => setHistoryFilter('all')}
                        className={historyFilter === 'all' ? 'active' : ''}
                        data-testid="filter-all-btn"
                    >
                        Tudo ({sessions.length})
                    </button>
                    <button
                        onClick={() => setHistoryFilter('test')}
                        className={historyFilter === 'test' ? 'active test' : 'test'}
                        data-testid="filter-test-btn"
                    >
                        🤖 Testes ({sessions.filter(s => s.is_test_session).length})
                    </button>
                </div>
            </div>

            {isSelectionMode && (
                <div className="selection-toolbar fade-in">
                    <label className="select-all-label">
                        <input
                            type="checkbox"
                            checked={filteredSessions.length > 0 && selectedSessions.size === filteredSessions.length}
                            onChange={toggleSelectAll}
                        />
                        <span>Todos ({filteredSessions.length})</span>
                    </label>
                    <button
                        className="delete-selected-btn"
                        disabled={selectedSessions.size === 0}
                        onClick={() => setShowDeleteConfirm(true)}
                    >
                        🗑️ ({selectedSessions.size})
                    </button>
                </div>
            )}

            {isSelectionMode && selectedSessions.size > 0 && (
                <button
                    className="batch-extract-premium fade-in"
                    onClick={extractBatchQuestions}
                >
                    💎 Extrair Perguntas de ({selectedSessions.size})
                </button>
            )}

            <div className="history-items-container custom-scrollbar">
                {filteredSessions.length === 0 ? (
                    <p className="empty-msg">
                        {historyFilter === 'test' ? 'Nenhum teste de IA encontrado.' : 'Nenhuma conversa encontrada.'}
                    </p>
                ) : (
                    currentSessions.map(session => (
                        <SessionItem
                            key={session.session_id}
                            session={session}
                            currentSessionId={currentSessionId}
                            isSelectionMode={isSelectionMode}
                            isSelected={selectedSessions.has(session.session_id)}
                            onToggleSelection={toggleSessionSelection}
                            onLoadSession={loadSession}
                        />
                    ))
                )}
            </div>

            {/* Paginação de Conversas (Máximo 20 por página) */}
            {filteredSessions.length > 0 && (
                <div className="history-pagination">
                    <div className="pagination-info">
                        <span>
                            Exibindo {startIndex + 1}–{Math.min(startIndex + PAGE_SIZE, filteredSessions.length)} de {filteredSessions.length}
                        </span>
                        <span>
                            Pág. {currentPage} / {totalPages}
                        </span>
                    </div>

                    {totalPages > 1 && (
                        <div className="pagination-controls">
                            <button
                                type="button"
                                className="pagination-btn"
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                disabled={currentPage === 1}
                                data-testid="history-page-prev"
                            >
                                ◀ Anterior
                            </button>
                            <span className="pagination-pages-indicator">
                                {currentPage} / {totalPages}
                            </span>
                            <button
                                type="button"
                                className="pagination-btn"
                                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                disabled={currentPage === totalPages}
                                data-testid="history-page-next"
                            >
                                Próxima ▶
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default HistoryList;
