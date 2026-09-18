import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { api } from '../../../api/client';
import '../styles/LeadVariablesModal.css';

export default function LeadVariablesModal({
    isOpen,
    lead,
    webhookId,
    onClose
}) {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterTab, setFilterTab] = useState('all'); // 'all', 'captured', 'pending'

    useEffect(() => {
        if (!isOpen || !lead || !webhookId) return;

        let isMounted = true;
        setLoading(true);
        setData(null);
        setSearchQuery('');
        setFilterTab('all');

        const fetchVariables = async () => {
            try {
                const res = await api.get(`/webhooks/${webhookId}/leads/${lead.id}/variables`);
                const json = await res.json();
                if (isMounted) {
                    setData(json);
                }
            } catch (err) {
                console.error('Erro ao carregar variáveis do lead:', err);
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        fetchVariables();

        return () => {
            isMounted = false;
        };
    }, [isOpen, lead, webhookId]);

    if (!isOpen || !lead) return null;

    const variables = data?.variables || [];
    const filteredVariables = variables.filter(v => {
        // Filtro por aba
        if (filterTab === 'captured' && !v.has_value) return false;
        if (filterTab === 'pending' && v.has_value) return false;

        // Filtro por busca
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        const keyMatch = (v.key || '').toLowerCase().includes(q);
        const valMatch = String(v.value || '').toLowerCase().includes(q);
        const descMatch = (v.description || '').toLowerCase().includes(q);
        return keyMatch || valMatch || descMatch;
    });

    const totalCaptured = data?.total_captured ?? 0;
    const totalPending = data?.total_pending ?? 0;

    return ReactDOM.createPortal(
        <div className="lead-vars-overlay fade-in" data-testid="lead-vars-overlay">
            <div className="lead-vars-modal" data-testid="lead-vars-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header-accent" style={{ background: 'linear-gradient(90deg, #6366f1, #38bdf8, #10b981)' }}></div>

                {/* Cabeçalho do Modal */}
                <div className="lead-vars-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div className="lead-vars-avatar">
                            🌍
                        </div>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#f8fafc' }}>
                                    Variáveis do Contato
                                </h3>
                                <span className="lead-vars-badge-phone">
                                    {lead.telefone}
                                </span>
                            </div>
                            <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#94a3b8' }}>
                                Contato: <strong style={{ color: '#e2e8f0' }}>{lead.contato_nome || 'Lead sem nome'}</strong>
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="btn-lead-vars-close"
                        title="Fechar (ESC)"
                    >
                        ✕
                    </button>
                </div>

                {/* Barra de Filtros e Busca */}
                <div className="lead-vars-filters-bar">
                    <div className="lead-vars-search-box">
                        <span style={{ opacity: 0.6 }}>🔍</span>
                        <input
                            type="text"
                            placeholder="Buscar por chave, valor ou descrição..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery('')}
                                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0 }}
                            >
                                ✕
                            </button>
                        )}
                    </div>

                    <div className="lead-vars-tabs">
                        <button
                            type="button"
                            className={`lead-vars-tab ${filterTab === 'all' ? 'active' : ''}`}
                            onClick={() => setFilterTab('all')}
                        >
                            Todas ({variables.length})
                        </button>
                        <button
                            type="button"
                            className={`lead-vars-tab ${filterTab === 'captured' ? 'active' : ''}`}
                            onClick={() => setFilterTab('captured')}
                        >
                            <span style={{ color: '#10b981' }}>●</span> Capturadas ({totalCaptured})
                        </button>
                        <button
                            type="button"
                            className={`lead-vars-tab ${filterTab === 'pending' ? 'active' : ''}`}
                            onClick={() => setFilterTab('pending')}
                        >
                            <span style={{ color: '#f59e0b' }}>●</span> Pendentes ({totalPending})
                        </button>
                    </div>
                </div>

                {/* Conteúdo Principal */}
                <div className="lead-vars-body custom-scrollbar">
                    {loading ? (
                        <div className="lead-vars-loading">
                            <div className="lead-vars-spinner"></div>
                            <p>Consultando variáveis e memórias do contato...</p>
                        </div>
                    ) : variables.length === 0 ? (
                        <div className="lead-vars-empty-state">
                            <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>📭</div>
                            <h4>Nenhuma Variável Global Cadastrada</h4>
                            <p>
                                Não há variáveis configuradas no sistema ainda. Cadastre variáveis na aba <strong>🌍 Variáveis Globais</strong> para que o agente possa extrair informações deste contato.
                            </p>
                        </div>
                    ) : filteredVariables.length === 0 ? (
                        <div className="lead-vars-empty-state">
                            <div style={{ fontSize: '2rem', marginBottom: '10px' }}>🔍</div>
                            <h4>Nenhuma variável encontrada</h4>
                            <p>Nenhuma variável corresponde aos filtros de busca atuais.</p>
                        </div>
                    ) : (
                        <div className="lead-vars-grid">
                            {filteredVariables.map(v => (
                                <div
                                    key={v.id || v.key}
                                    className={`lead-var-card ${v.has_value ? 'has-value' : 'is-pending'}`}
                                    data-testid={`lead-var-card-${v.key}`}
                                >
                                    <div className="lead-var-card-header">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <code className="lead-var-key">
                                                {`{${v.key}}`}
                                            </code>
                                            <span className="lead-var-type-badge">
                                                {v.type}
                                            </span>
                                        </div>

                                        {/* Badge de Origem Clara: Padrão Inicial vs Extraído da Conversa */}
                                        {(v.value_origin === 'initial_default' || v.is_default_value) ? (
                                            <span className="lead-var-origin-badge default-value" data-testid={`lead-var-origin-${v.key}`}>
                                                ⚙️ Valor Padrão Inicial
                                            </span>
                                        ) : (v.value_origin === 'conversation_extracted' || v.is_extracted_from_conversation || v.source_message) ? (
                                            <span className="lead-var-origin-badge conversation-extracted" data-testid={`lead-var-origin-${v.key}`}>
                                                💬 Extraído da Conversa
                                            </span>
                                        ) : (v.value_origin === 'contact_profile' || v.origin === 'contact_profile') ? (
                                            <span className="lead-var-origin-badge contact_profile" data-testid={`lead-var-origin-${v.key}`}>
                                                👤 Perfil do Contato
                                            </span>
                                        ) : (v.value_origin === 'system' || v.origin === 'system') ? (
                                            <span className="lead-var-origin-badge system" data-testid={`lead-var-origin-${v.key}`}>
                                                ⚙️ Sistema
                                            </span>
                                        ) : v.origin === 'ai' ? (
                                            <span className="lead-var-origin-badge ai" data-testid={`lead-var-origin-${v.key}`}>
                                                🤖 Extraído por IA
                                            </span>
                                        ) : !v.has_value ? (
                                            <span className="lead-var-origin-badge pending" data-testid={`lead-var-origin-${v.key}`}>
                                                ⏳ Pendente
                                            </span>
                                        ) : (
                                            <span className="lead-var-origin-badge integration" data-testid={`lead-var-origin-${v.key}`}>
                                                📡 Integração
                                            </span>
                                        )}
                                    </div>

                                    {v.description && (
                                        <p className="lead-var-desc">
                                            💡 {v.description}
                                        </p>
                                    )}

                                    {/* Valor ou Status Vazio */}
                                    <div className="lead-var-value-container">
                                        {v.has_value ? (
                                            <div className="lead-var-value-box">
                                                <div className="lead-var-value-label">Valor Armazenado:</div>
                                                <div className="lead-var-value-text">{String(v.value)}</div>

                                                {/* Destaque Explicativo de Origem */}
                                                {(v.value_origin === 'initial_default' || v.is_default_value) ? (
                                                    <div className="lead-var-origin-banner default-banner">
                                                        <span className="banner-icon">⚙️</span>
                                                        <div className="banner-text">
                                                            <strong>Valor Padrão Inicial:</strong> Este valor é o padrão configurado no cadastro da variável. Nenhuma alteração foi extraída da conversa ainda.
                                                        </div>
                                                    </div>
                                                ) : (v.value_origin === 'conversation_extracted' || v.is_extracted_from_conversation || v.source_message) ? (
                                                    <div className="lead-var-origin-banner extracted-banner">
                                                        <span className="banner-icon">💬</span>
                                                        <div className="banner-text">
                                                            <strong>Extraído da Conversa com o Usuário</strong>
                                                            {v.matches_default && (
                                                                <span className="matches-note"> (Coincide com o valor padrão inicial configurado)</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                ) : null}

                                                {v.source_message && (
                                                    <div className="lead-var-source-quote">
                                                        <span className="quote-icon">💬</span>
                                                        <span>Trecho da conversa: &ldquo;<em>{v.source_message}</em>&rdquo;</span>
                                                    </div>
                                                )}

                                                {v.updated_at && (
                                                    <div className="lead-var-time">
                                                        🕒 Registrado em {new Date(v.updated_at).toLocaleString('pt-BR')}
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="lead-var-empty-box">
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#f59e0b', fontWeight: 600, fontSize: '0.85rem' }}>
                                                    <span>⏳</span> Nenhum valor capturado ainda
                                                </div>
                                                <p className="lead-var-empty-hint">
                                                    {v.extraction_method === 'ai'
                                                        ? 'O agente de IA aguarda a menção desta informação na conversa com o cliente para extrair e armazenar.'
                                                        : 'Valor pendente de recebimento através da integração.'}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Rodapé */}
                <div className="lead-vars-footer">
                    <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
                        <span>Status: <strong style={{ color: '#10b981' }}>{totalCaptured} capturadas</strong> • <strong style={{ color: '#f59e0b' }}>{totalPending} pendentes</strong></span>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="btn-lead-vars-done"
                        data-testid="lead-vars-close-btn"
                    >
                        Fechar
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
