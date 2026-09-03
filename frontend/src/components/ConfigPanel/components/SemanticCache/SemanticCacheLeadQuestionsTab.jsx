import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../../../api/client';
import LeadQuestionCard from './LeadQuestionCard';
import IgnoreLeadQuestionModal from '../Modals/IgnoreLeadQuestionModal';

const SemanticCacheLeadQuestionsTab = ({ agentId, onAddToCache, lastAddedQuestion = null }) => {
    const [questions, setQuestions] = useState([]);
    const [totalCount, setTotalCount] = useState(0);
    const [noCacheCount, setNoCacheCount] = useState(0);
    const [hasCacheCount, setHasCacheCount] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize] = useState(20);

    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('no_cache');

    // Estado do Modal de Ignorar Dúvida
    const [ignoreModal, setIgnoreModal] = useState({ isOpen: false, item: null });
    const [isIgnoring, setIsIgnoring] = useState(false);

    const loadQuestions = useCallback(async (page = currentPage, search = searchTerm, status = filterStatus) => {
        if (!agentId) return;
        try {
            setLoading(true);
            const queryParams = new URLSearchParams({
                agent_id: agentId,
                page: page,
                page_size: pageSize,
                filter_status: status
            });
            if (search.trim()) {
                queryParams.set('search', search.trim());
            }

            const res = await api.get(`/semantic-cache/lead-questions?${queryParams.toString()}`);
            if (res.ok) {
                const data = await res.json();
                setQuestions(data.items || []);
                setTotalCount(data.total || 0);
                setNoCacheCount(data.no_cache_count || 0);
                setHasCacheCount(data.has_cache_count || 0);
                setTotalPages(data.total_pages || 1);
                setCurrentPage(data.page || 1);
            }
        } catch (err) {
            console.error("Erro ao carregar dúvidas dos leads:", err);
        } finally {
            setLoading(false);
        }
    }, [agentId, currentPage, pageSize, searchTerm, filterStatus]);

    useEffect(() => {
        loadQuestions(currentPage, searchTerm, filterStatus);
    }, [loadQuestions, currentPage, searchTerm, filterStatus]);

    // Quando uma dúvida for adicionada ou vinculada como variação no cache, remove imediatamente da visualização
    useEffect(() => {
        if (lastAddedQuestion && (lastAddedQuestion.eventId || lastAddedQuestion.userQuery)) {
            const cleanTarget = (lastAddedQuestion.userQuery || '').toLowerCase().trim();
            setQuestions(prev => prev.filter(q => {
                if (lastAddedQuestion.eventId && q.event_id === lastAddedQuestion.eventId) return false;
                if (cleanTarget && (q.user_query || '').toLowerCase().trim() === cleanTarget) return false;
                return true;
            }));
            setTotalCount(prev => Math.max(0, prev - 1));
            setNoCacheCount(prev => Math.max(0, prev - 1));
            setHasCacheCount(prev => prev + 1);

            // Sincroniza em background
            loadQuestions(currentPage, searchTerm, filterStatus);
        }
    }, [lastAddedQuestion, loadQuestions, currentPage, searchTerm, filterStatus]);

    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
        setCurrentPage(1);
    };

    const handleFilterChange = (status) => {
        setFilterStatus(status);
        setCurrentPage(1);
    };

    const handleOpenIgnore = (item) => {
        setIgnoreModal({ isOpen: true, item });
    };

    const handleConfirmIgnore = async (item) => {
        if (!item || !item.event_id) return;
        try {
            setIsIgnoring(true);
            const res = await api.post(`/semantic-cache/lead-questions/${item.event_id}/ignore`);
            if (res.ok) {
                setQuestions(prev => prev.filter(q => q.event_id !== item.event_id));
                setTotalCount(prev => Math.max(0, prev - 1));
                if (!item.from_cache) {
                    setNoCacheCount(prev => Math.max(0, prev - 1));
                } else {
                    setHasCacheCount(prev => Math.max(0, prev - 1));
                }
                setIgnoreModal({ isOpen: false, item: null });
                window.dispatchEvent(new CustomEvent('app:toast', {
                    detail: { message: "🚫 Dúvida ignorada e removida das sugestões!", type: "success" }
                }));
            }
        } catch (err) {
            console.error("Erro ao ignorar dúvida:", err);
            window.dispatchEvent(new CustomEvent('app:toast', {
                detail: { message: "Erro ao ignorar dúvida.", type: "error" }
            }));
        } finally {
            setIsIgnoring(false);
        }
    };

    const formatDate = (isoStr) => {
        if (!isoStr) return '';
        try {
            const d = new Date(isoStr);
            return d.toLocaleString('pt-BR', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });
        } catch {
            return isoStr;
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }} data-testid="semantic-cache-lead-questions-tab">
            {/* Top Bar: Filtros e Busca */}
            <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '12px',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'rgba(30, 41, 59, 0.4)',
                padding: '16px',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.05)'
            }}>
                {/* Status Pills */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                        type="button"
                        data-testid="filter-no-cache"
                        onClick={() => handleFilterChange('no_cache')}
                        style={{
                            padding: '6px 14px',
                            borderRadius: '8px',
                            border: filterStatus === 'no_cache' ? '1px solid #f59e0b' : '1px solid rgba(255, 255, 255, 0.1)',
                            background: filterStatus === 'no_cache' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(15, 23, 42, 0.6)',
                            color: filterStatus === 'no_cache' ? '#fbbf24' : '#94a3b8',
                            fontSize: '0.82rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}
                    >
                        <span>💡 Sem Cache (Candidatas)</span>
                        <span style={{
                            background: 'rgba(245, 158, 11, 0.3)',
                            padding: '1px 6px',
                            borderRadius: '10px',
                            fontSize: '0.75rem',
                            color: '#fff'
                        }}>
                            {noCacheCount}
                        </span>
                    </button>

                    <button
                        type="button"
                        data-testid="filter-has-cache"
                        onClick={() => handleFilterChange('has_cache')}
                        style={{
                            padding: '6px 14px',
                            borderRadius: '8px',
                            border: filterStatus === 'has_cache' ? '1px solid #10b981' : '1px solid rgba(255, 255, 255, 0.1)',
                            background: filterStatus === 'has_cache' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(15, 23, 42, 0.6)',
                            color: filterStatus === 'has_cache' ? '#34d399' : '#94a3b8',
                            fontSize: '0.82rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}
                    >
                        <span>⚡ No Cache</span>
                        <span style={{
                            background: 'rgba(16, 185, 129, 0.3)',
                            padding: '1px 6px',
                            borderRadius: '10px',
                            fontSize: '0.75rem',
                            color: '#fff'
                        }}>
                            {hasCacheCount}
                        </span>
                    </button>

                    <button
                        type="button"
                        data-testid="filter-all"
                        onClick={() => handleFilterChange('all')}
                        style={{
                            padding: '6px 14px',
                            borderRadius: '8px',
                            border: filterStatus === 'all' ? '1px solid #6366f1' : '1px solid rgba(255, 255, 255, 0.1)',
                            background: filterStatus === 'all' ? 'rgba(99, 102, 241, 0.2)' : 'rgba(15, 23, 42, 0.6)',
                            color: filterStatus === 'all' ? '#a5b4fc' : '#94a3b8',
                            fontSize: '0.82rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}
                    >
                        <span>Todas as Dúvidas</span>
                        <span style={{
                            background: 'rgba(255, 255, 255, 0.1)',
                            padding: '1px 6px',
                            borderRadius: '10px',
                            fontSize: '0.75rem',
                            color: '#cbd5e1'
                        }}>
                            {noCacheCount + hasCacheCount}
                        </span>
                    </button>
                </div>

                {/* Campo de Busca e Botão Atualizar */}
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flex: '1 1 300px', maxWidth: '420px' }}>
                    <div style={{ position: 'relative', width: '100%' }}>
                        <input
                            type="text"
                            data-testid="search-lead-questions"
                            placeholder="Buscar dúvida, nome ou telefone..."
                            value={searchTerm}
                            onChange={handleSearchChange}
                            style={{
                                width: '100%',
                                padding: '8px 32px 8px 12px',
                                borderRadius: '8px',
                                background: 'rgba(15, 23, 42, 0.8)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                color: '#f8fafc',
                                fontSize: '0.85rem'
                            }}
                        />
                        {searchTerm && (
                            <button
                                type="button"
                                onClick={() => { setSearchTerm(''); setCurrentPage(1); }}
                                style={{
                                    position: 'absolute', right: '8px', top: '50%',
                                    transform: 'translateY(-50%)', background: 'none', border: 'none',
                                    color: '#94a3b8', cursor: 'pointer', fontSize: '0.85rem'
                                }}
                            >
                                ✕
                            </button>
                        )}
                    </div>

                    <button
                        type="button"
                        onClick={() => loadQuestions(currentPage, searchTerm, filterStatus)}
                        title="Atualizar lista"
                        style={{
                            padding: '8px 12px',
                            borderRadius: '8px',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            background: 'rgba(30, 41, 59, 0.8)',
                            color: '#cbd5e1',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            whiteSpace: 'nowrap'
                        }}
                    >
                        🔄
                    </button>
                </div>
            </div>

            {/* Dica de Uso */}
            <div style={{
                background: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.2)',
                borderRadius: '8px',
                padding: '10px 14px',
                fontSize: '0.82rem',
                color: '#6ee7b7',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
            }}>
                <span>💡</span>
                <span>
                    <strong>Dica de Economia:</strong> Dúvidas marcadas como <em>"Sem Cache"</em> custaram dinheiro ao chamar o modelo LLM. Ao clicar em <strong>"⚡ Adicionar ao Cache"</strong>, as próximas perguntas idênticas ou parecidas sairão com <strong>custo zero</strong> e resposta instantânea!
                </span>
            </div>

            {/* Lista de Dúvidas */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                    <div style={{ display: 'inline-block', width: '28px', height: '28px', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#34d399', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                    <p style={{ marginTop: '10px', fontSize: '0.88rem' }}>Carregando dúvidas dos leads...</p>
                </div>
            ) : questions.length === 0 ? (
                <div style={{
                    textAlign: 'center',
                    padding: '50px 20px',
                    background: 'rgba(15, 23, 42, 0.4)',
                    borderRadius: '12px',
                    border: '1px dashed rgba(255, 255, 255, 0.1)'
                }}>
                    <span style={{ fontSize: '2rem' }}>🔍</span>
                    <h4 style={{ color: '#cbd5e1', margin: '10px 0 6px 0' }}>Nenhuma dúvida encontrada</h4>
                    <p style={{ color: '#64748b', fontSize: '0.85rem', maxWidth: '400px', margin: '0 auto' }}>
                        {searchTerm ? 'Nenhuma mensagem corresponde aos critérios de busca.' : 'Ainda não há mensagens de leads registradas nos webhooks deste agente.'}
                    </p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {questions.map((q, idx) => (
                        <LeadQuestionCard
                            key={`${q.event_id}-${q.sub_index || 0}-${idx}`}
                            question={q}
                            onAddToCache={onAddToCache}
                            onIgnoreQuestion={handleOpenIgnore}
                            formatDate={formatDate}
                        />
                    ))}
                </div>
            )}

            {/* Paginação (Máximo 20 itens por página - Sempre visível com dados) */}
            {questions && questions.length > 0 && (
                <div 
                    data-testid="lead-questions-pagination"
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '12px 18px',
                        background: 'rgba(15, 23, 42, 0.6)',
                        borderRadius: '10px',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        fontSize: '0.85rem',
                        color: '#94a3b8',
                        flexWrap: 'wrap',
                        gap: '12px',
                        marginTop: '1rem'
                    }}
                >
                    <div>
                        Mostrando até <strong style={{ color: '#38bdf8' }}>{pageSize}</strong> por página • Página <strong style={{ color: '#fff' }}>{currentPage}</strong> de <strong style={{ color: '#fff' }}>{totalPages}</strong> ({totalCount} dúvidas no total)
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <button
                            type="button"
                            data-testid="lead-questions-prev-page"
                            disabled={currentPage <= 1 || loading}
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            style={{
                                padding: '6px 14px',
                                borderRadius: '6px',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                background: (currentPage <= 1 || loading) ? 'rgba(15, 23, 42, 0.4)' : 'rgba(99, 102, 241, 0.2)',
                                color: (currentPage <= 1 || loading) ? '#64748b' : '#fff',
                                fontWeight: 600,
                                fontSize: '0.82rem',
                                cursor: (currentPage <= 1 || loading) ? 'not-allowed' : 'pointer',
                                transition: 'all 0.2s ease',
                                opacity: (currentPage <= 1 || loading) ? 0.6 : 1
                            }}
                        >
                            ◀ Anterior
                        </button>
                        <span style={{ fontSize: '0.8rem', color: '#cbd5e1', padding: '0 4px', fontWeight: 600 }}>
                            {currentPage} / {totalPages}
                        </span>
                        <button
                            type="button"
                            data-testid="lead-questions-next-page"
                            disabled={currentPage >= totalPages || loading}
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            style={{
                                padding: '6px 14px',
                                borderRadius: '6px',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                background: (currentPage >= totalPages || loading) ? 'rgba(15, 23, 42, 0.4)' : 'rgba(99, 102, 241, 0.2)',
                                color: (currentPage >= totalPages || loading) ? '#64748b' : '#fff',
                                fontWeight: 600,
                                fontSize: '0.82rem',
                                cursor: (currentPage >= totalPages || loading) ? 'not-allowed' : 'pointer',
                                transition: 'all 0.2s ease',
                                opacity: (currentPage >= totalPages || loading) ? 0.6 : 1
                            }}
                        >
                            Próxima ▶
                        </button>
                    </div>
                </div>
            )}

            {/* Modal de Confirmação para Ignorar Dúvida */}
            <IgnoreLeadQuestionModal
                isOpen={ignoreModal.isOpen}
                item={ignoreModal.item}
                onClose={() => setIgnoreModal({ isOpen: false, item: null })}
                onConfirm={handleConfirmIgnore}
                isIgnoring={isIgnoring}
            />
        </div>
    );
};

export default SemanticCacheLeadQuestionsTab;
