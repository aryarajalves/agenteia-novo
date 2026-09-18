import React from 'react';
import { useFinance } from '../FinanceContext';
import { useFinanceMetrics } from '../hooks/useFinanceMetrics';

const formatTotalCost = (val) => {
    if (!val || val === 0) return 'R$ 0.00';
    if (val > 0 && val < 0.01) return '< R$ 0.01';
    return `R$ ${val.toFixed(2)}`;
};

const getBadgeInfo = (item) => {
    if (item.isFtJob) return { label: 'FT', className: 'type-ft' };
    if (item.agent_name?.includes('Simulador RAG')) return { label: 'RAG', className: 'type-rag' };
    return { label: 'AG', className: 'type-agent' };
};

const TransactionTable = () => {
    const { activeRowsData } = useFinanceMetrics();
    const { currentPage, setCurrentPage, rowsPerPage, setRowsPerPage } = useFinance();

    const totalPages = Math.ceil(activeRowsData.length / rowsPerPage);
    const paginated = activeRowsData.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

    return (
        <div className="transaction-table-card" id="transaction-table">
            {/* Título da tabela */}
            <div className="table-title-bar">
                <h3>📋 Histórico de Transações</h3>
                <span className="table-count-badge">{activeRowsData.length} registros</span>
            </div>

            {/* Cabeçalho das colunas */}
            <div className="table-header-grid">
                <span>Data</span>
                <span>Agente / Job</span>
                <span style={{ textAlign: 'center' }}>Chats</span>
                <span style={{ textAlign: 'center' }}>Mensagens</span>
                <span style={{ textAlign: 'center' }}>Tokens</span>
                <span style={{ textAlign: 'right' }}>Média/Msg</span>
                <span style={{ textAlign: 'right' }}>Total BRL</span>
            </div>

            {/* Corpo da tabela */}
            <div className="table-body">
                {paginated.length === 0 ? (
                    <div className="table-empty">
                        <span>📭</span>
                        Nenhuma transação encontrada para o período selecionado.
                    </div>
                ) : (
                    paginated.map((item, idx) => {
                        const badge = getBadgeInfo(item);
                        return (
                            <div
                                key={idx}
                                id={`row-${idx}`}
                                className={`table-row-grid ${item.isFtJob ? 'ft-row' : ''}`}
                            >
                                <span>{new Date(item.date + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                                <div className="agent-name-cell">
                                    <span className={`agent-badge ${badge.className}`}>
                                        {badge.label}
                                    </span>
                                    <span className="truncate" title={item.agent_name}>{item.agent_name}</span>
                                </div>
                                <span style={{ textAlign: 'center' }}>{item.unique_sessions || '—'}</span>
                                <span style={{ textAlign: 'center' }}>{item.total_messages || '—'}</span>
                                <span style={{ textAlign: 'center' }}>{item.total_tokens?.toLocaleString('pt-BR') || '—'}</span>
                                <span style={{ textAlign: 'right' }}>
                                    {item.avg_cost_per_message ? `R$ ${item.avg_cost_per_message.toFixed(2)}` : '—'}
                                </span>
                                <span className="cost-cell">{formatTotalCost(item.total_cost)}</span>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Paginação */}
            <div className="table-pagination">
                <div className="rows-select">
                    <span>Mostrar:</span>
                    <select
                        id="select-rows-per-page"
                        value={rowsPerPage}
                        onChange={e => { setRowsPerPage(parseInt(e.target.value)); setCurrentPage(1); }}
                    >
                        {[20, 50, 100].map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                    <span>por página</span>
                </div>
                <div className="page-controls">
                    <button
                        id="btn-prev-page"
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(p => p - 1)}
                    >
                        ← Anterior
                    </button>
                    <span id="page-indicator">{currentPage} / {totalPages || 1}</span>
                    <button
                        id="btn-next-page"
                        disabled={currentPage >= totalPages}
                        onClick={() => setCurrentPage(p => p + 1)}
                    >
                        Próxima →
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TransactionTable;
