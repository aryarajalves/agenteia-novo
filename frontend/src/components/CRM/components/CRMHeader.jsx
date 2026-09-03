import React from 'react';
import { useNavigate } from 'react-router-dom';

const CRMHeader = ({
    stats = {},
    products = [],
    selectedProduct = 'all',
    onProductChange,
    search = '',
    onSearchChange,
    temperatureFilter = 'all',
    onTemperatureChange,
    dateFilter = 'all',
    onDateFilterChange,
    selectedMonth = '',
    onMonthChange,
    onRefresh,
    loading = false,
    onClose
}) => {
    const navigate = useNavigate();

    const handleClose = () => {
        if (onClose) {
            onClose();
        } else {
            navigate(-1);
        }
    };

    // Gerar lista dos últimos 12 meses para o seletor
    const getMonthOptions = () => {
        const options = [];
        const now = new Date();
        for (let i = 0; i < 12; i++) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            const label = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
            options.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) });
        }
        return options;
    };

    const monthOptions = getMonthOptions();

    return (
        <div className="crm-header-wrapper">
            <div className="crm-title-row">
                <div className="crm-title-content">
                    <h1><span>📊</span> CRM de Leads & Pipeline</h1>
                    <p>Acompanhe a jornada do lead em tempo real: desde o disparo de template até o fechamento da venda.</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                    {/* Seletor de Funil / Produto */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(99, 102, 241, 0.12)', border: '1px solid rgba(99, 102, 241, 0.3)', borderRadius: '10px', padding: '5px 12px' }}>
                        <span style={{ fontSize: '0.78rem', color: '#a5b4fc', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                            📂 Funil:
                        </span>
                        <select
                            value={selectedProduct}
                            onChange={(e) => onProductChange && onProductChange(e.target.value)}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#f8fafc',
                                fontSize: '0.82rem',
                                fontWeight: 700,
                                outline: 'none',
                                cursor: 'pointer'
                            }}
                        >
                            {products.length > 0 ? (
                                products.map(p => (
                                    <option key={p.id} value={p.id} style={{ background: '#0f172a', color: '#f8fafc' }}>
                                        {p.name}
                                    </option>
                                ))
                            ) : (
                                <option value="all" style={{ background: '#0f172a', color: '#f8fafc' }}>Todos os Produtos</option>
                            )}
                        </select>
                    </div>

                    <button
                        onClick={onRefresh}
                        disabled={loading}
                        className="btn-new-webhook"
                        style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', padding: '0.55rem 1rem' }}
                    >
                        <span>{loading ? '⏳' : '🔄'}</span>
                        <span>{loading ? 'Atualizando...' : 'Atualizar Pipeline'}</span>
                    </button>
                    <button
                        type="button"
                        onClick={handleClose}
                        className="crm-btn-close-fullscreen"
                        title="Fechar CRM e voltar para a tela anterior (ESC)"
                    >
                        <span>✕</span>
                        <span>Voltar</span>
                    </button>
                </div>
            </div>

            {/* Métricas do Funil (Filtradas Dinamicamente) */}
            <div className="crm-stats-grid">
                <div className="crm-stat-card">
                    <div className="crm-stat-icon" style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', border: '1px solid rgba(168, 85, 247, 0.3)' }}>
                        👥
                    </div>
                    <div>
                        <div className="crm-stat-value">{stats.total_leads || 0}</div>
                        <div className="crm-stat-label">Total de Leads</div>
                    </div>
                </div>

                <div className="crm-stat-card">
                    <div className="crm-stat-icon" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
                        💬
                    </div>
                    <div>
                        <div className="crm-stat-value">{stats.total_em_atendimento || 0}</div>
                        <div className="crm-stat-label">Em Conversa IA</div>
                    </div>
                </div>

                <div className="crm-stat-card">
                    <div className="crm-stat-icon" style={{ background: 'rgba(234, 179, 8, 0.15)', color: '#facc15', border: '1px solid rgba(234, 179, 8, 0.3)' }}>
                        🎧
                    </div>
                    <div>
                        <div className="crm-stat-value">{stats.total_remarketing || 0}</div>
                        <div className="crm-stat-label">Em Remarketing D+1</div>
                    </div>
                </div>

                <div className="crm-stat-card">
                    <div className="crm-stat-icon" style={{ background: 'rgba(52, 211, 153, 0.15)', color: '#34d399', border: '1px solid rgba(52, 211, 153, 0.3)' }}>
                        🎉
                    </div>
                    <div>
                        <div className="crm-stat-value">{stats.total_comprou || 0}</div>
                        <div className="crm-stat-label">Comprou (Alunos)</div>
                    </div>
                </div>

                <div className="crm-stat-card">
                    <div className="crm-stat-icon" style={{ background: 'rgba(236, 72, 153, 0.15)', color: '#f472b6', border: '1px solid rgba(236, 72, 153, 0.3)' }}>
                        📈
                    </div>
                    <div>
                        <div className="crm-stat-value">{stats.conversion_rate || 0}%</div>
                        <div className="crm-stat-label">Taxa de Conversão</div>
                    </div>
                </div>
            </div>

            {/* Barra de Filtros e Busca */}
            <div className="crm-controls-bar" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <div className="crm-search-box">
                        <span className="crm-search-icon">🔍</span>
                        <input
                            type="text"
                            placeholder="Buscar por nome, telefone ou mensagem..."
                            value={search}
                            onChange={(e) => onSearchChange(e.target.value)}
                        />
                    </div>

                    <div className="crm-filter-group">
                        <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, marginRight: '0.3rem' }}>TEMPERATURA:</span>
                        <button
                            className={`crm-filter-btn ${temperatureFilter === 'all' ? 'active' : ''}`}
                            onClick={() => onTemperatureChange('all')}
                        >
                            Todos
                        </button>
                        <button
                            className={`crm-filter-btn ${temperatureFilter === 'quente' ? 'active' : ''}`}
                            onClick={() => onTemperatureChange('quente')}
                        >
                            🔥 Quente
                        </button>
                        <button
                            className={`crm-filter-btn ${temperatureFilter === 'morno' ? 'active' : ''}`}
                            onClick={() => onTemperatureChange('morno')}
                        >
                            🟡 Morno
                        </button>
                        <button
                            className={`crm-filter-btn ${temperatureFilter === 'frio' ? 'active' : ''}`}
                            onClick={() => onTemperatureChange('frio')}
                        >
                            ❄️ Frio
                        </button>
                    </div>
                </div>

                {/* Filtros de Data e Período */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '0.75rem', width: '100%' }}>
                    <div className="crm-filter-group">
                        <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, marginRight: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <span>📅</span> PERÍODO:
                        </span>
                        <button
                            className={`crm-filter-btn ${dateFilter === 'all' ? 'active' : ''}`}
                            onClick={() => { onDateFilterChange('all'); onMonthChange(''); }}
                        >
                            Todos
                        </button>
                        <button
                            className={`crm-filter-btn ${dateFilter === 'today' ? 'active' : ''}`}
                            onClick={() => { onDateFilterChange('today'); onMonthChange(''); }}
                        >
                            ⚡ Hoje
                        </button>
                        <button
                            className={`crm-filter-btn ${dateFilter === '7d' ? 'active' : ''}`}
                            onClick={() => { onDateFilterChange('7d'); onMonthChange(''); }}
                        >
                            7 Dias
                        </button>
                        <button
                            className={`crm-filter-btn ${dateFilter === '14d' ? 'active' : ''}`}
                            onClick={() => { onDateFilterChange('14d'); onMonthChange(''); }}
                        >
                            14 Dias
                        </button>
                        <button
                            className={`crm-filter-btn ${dateFilter === '30d' ? 'active' : ''}`}
                            onClick={() => { onDateFilterChange('30d'); onMonthChange(''); }}
                        >
                            30 Dias
                        </button>
                        <button
                            className={`crm-filter-btn ${dateFilter === 'this_month' ? 'active' : ''}`}
                            onClick={() => { onDateFilterChange('this_month'); onMonthChange(''); }}
                        >
                            Este Mês
                        </button>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>Filtrar por Mês:</span>
                        <select
                            value={selectedMonth}
                            onChange={(e) => {
                                onMonthChange(e.target.value);
                                if (e.target.value) onDateFilterChange('custom_month');
                                else onDateFilterChange('all');
                            }}
                            className="crm-select-month"
                            style={{
                                background: 'rgba(0, 0, 0, 0.4)',
                                border: '1px solid rgba(255, 255, 255, 0.12)',
                                borderRadius: '8px',
                                color: '#e2e8f0',
                                padding: '0.35rem 0.65rem',
                                fontSize: '0.78rem',
                                outline: 'none',
                                cursor: 'pointer'
                            }}
                        >
                            <option value="">Selecione um mês...</option>
                            {monthOptions.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CRMHeader;
