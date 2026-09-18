import React, { useState, useEffect, useCallback } from 'react';
import { useConfig } from '../ConfigContext';
import { api } from '../../../api/client';
import QuestionFunnelCard from './QuestionFunnels/QuestionFunnelCard';
import QuestionFunnelModal from './QuestionFunnels/QuestionFunnelModal';
import DeleteQuestionFunnelModal from './QuestionFunnels/DeleteQuestionFunnelModal';
import TestFunnelModal from './QuestionFunnels/TestFunnelModal';
import Pagination from './QuestionFunnels/Pagination';

const TabQuestionFunnels = () => {
    const { id: agentId, isNew } = useConfig();
    const [funnels, setFunnels] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(1);
    const [pageSize] = useState(20);
    const [totalItems, setTotalItems] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [activeCount, setActiveCount] = useState(0);
    const [isServerPaginated, setIsServerPaginated] = useState(false);

    const [modalState, setModalState] = useState({ isOpen: false, funnel: null });
    const [deleteModalState, setDeleteModalState] = useState({ isOpen: false, funnel: null });
    const [testModalState, setTestModalState] = useState({ isOpen: false, funnel: null });
    const [actionLoading, setActionLoading] = useState(false);
    const [toastMessage, setToastMessage] = useState(null);

    const showToast = (msg, type = 'success') => {
        setToastMessage({ msg, type });
        setTimeout(() => setToastMessage(null), 4000);
    };

    const loadFunnels = useCallback(async (targetPage = page, query = searchTerm) => {
        if (!agentId || isNew) return;
        try {
            setLoading(true);
            const params = new URLSearchParams({
                page: String(targetPage),
                page_size: String(pageSize)
            });
            if (query && query.trim()) {
                params.append('search', query.trim());
            }
            const res = await api.get(`/agents/${agentId}/question-funnels?${params.toString()}`);
            if (res.ok) {
                const data = await res.json();
                if (data && typeof data === 'object' && Array.isArray(data.items)) {
                    setFunnels(data.items);
                    setTotalItems(data.total ?? 0);
                    setTotalPages(data.total_pages ?? 1);
                    setActiveCount(data.active_count ?? 0);
                    setIsServerPaginated(true);
                } else if (Array.isArray(data)) {
                    setFunnels(data);
                    setTotalItems(data.length);
                    setTotalPages(Math.ceil(data.length / pageSize) || 1);
                    setActiveCount(data.filter(f => f.is_active).length);
                    setIsServerPaginated(false);
                } else {
                    setFunnels([]);
                    setTotalItems(0);
                    setTotalPages(1);
                    setActiveCount(0);
                }
            }
        } catch (err) {
            console.error('Erro ao carregar funis por dúvida:', err);
            showToast('Falha ao carregar funis por dúvida.', 'error');
        } finally {
            setLoading(false);
        }
    }, [agentId, isNew, page, pageSize, searchTerm]);

    // Carregamento inicial imediato no mount
    useEffect(() => {
        loadFunnels(1, '');
    }, [loadFunnels]);

    // Busca com debounce de 300ms apenas após digitação do usuário
    const isFirstRender = React.useRef(true);
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }
        const timer = setTimeout(() => {
            loadFunnels(1, searchTerm);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchTerm, loadFunnels]);

    const handleSaveFunnel = async (funnelData) => {
        try {
            setActionLoading(true);
            if (modalState.funnel) {
                // Atualização
                const res = await api.put(`/question-funnels/${modalState.funnel.id}`, funnelData);
                if (res.ok) {
                    showToast('Funil atualizado com sucesso!', 'success');
                    setModalState({ isOpen: false, funnel: null });
                    loadFunnels();
                } else {
                    const err = await res.json();
                    showToast(err.detail || 'Erro ao atualizar funil.', 'error');
                }
            } else {
                // Criação
                const res = await api.post(`/agents/${agentId}/question-funnels`, funnelData);
                if (res.ok) {
                    showToast('Funil por dúvida criado com sucesso!', 'success');
                    setModalState({ isOpen: false, funnel: null });
                    loadFunnels();
                } else {
                    const err = await res.json();
                    showToast(err.detail || 'Erro ao criar funil.', 'error');
                }
            }
        } catch (err) {
            console.error('Erro ao salvar funil:', err);
            showToast(`Erro ao salvar: ${err.message}`, 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const handleToggleActive = async (funnel) => {
        try {
            const nextActive = !funnel.is_active;
            // Atualização otimista
            setFunnels(funnels.map(f => f.id === funnel.id ? { ...f, is_active: nextActive } : f));
            const res = await api.put(`/question-funnels/${funnel.id}`, { is_active: nextActive });
            if (!res.ok) {
                loadFunnels();
                showToast('Falha ao alternar status do funil.', 'error');
            } else {
                showToast(`Funil ${nextActive ? 'ativado' : 'pausado'} com sucesso!`, 'success');
            }
        } catch (err) {
            loadFunnels();
            showToast('Erro de conexão.', 'error');
        }
    };

    const handleDeleteFunnel = async (funnelId) => {
        try {
            setActionLoading(true);
            const res = await api.delete(`/question-funnels/${funnelId}`);
            if (res.ok) {
                showToast('Funil excluído com sucesso!', 'success');
                setDeleteModalState({ isOpen: false, funnel: null });
                loadFunnels();
            } else {
                showToast('Falha ao excluir funil.', 'error');
            }
        } catch (err) {
            showToast(`Erro ao excluir: ${err.message}`, 'error');
        } finally {
            setActionLoading(false);
        }
    };

    if (isNew) {
        return (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                <p>⚠️ Salve o agente primeiro para poder cadastrar Funis de Conversão por Dúvida.</p>
            </div>
        );
    }

    const displayedFunnels = isServerPaginated 
        ? funnels 
        : funnels
            .filter(f => {
                if (!searchTerm.trim()) return true;
                const s = searchTerm.toLowerCase();
                return (f.name && f.name.toLowerCase().includes(s)) ||
                       (f.trigger_question && f.trigger_question.toLowerCase().includes(s));
            })
            .slice((page - 1) * pageSize, page * pageSize);

    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
        setPage(1);
    };

    const handlePageChange = (newPage) => {
        setPage(newPage);
        loadFunnels(newPage, searchTerm);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Toast Notification */}
            {toastMessage && (
                <div style={{
                    position: 'fixed',
                    bottom: '24px',
                    right: '24px',
                    zIndex: 100,
                    padding: '0.75rem 1.25rem',
                    borderRadius: '8px',
                    background: toastMessage.type === 'error' ? '#ef4444' : '#10b981',
                    color: '#ffffff',
                    fontWeight: 600,
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    animation: 'fadeIn 0.2s ease-out'
                }}>
                    <span>{toastMessage.type === 'error' ? '❌' : '✅'}</span>
                    <span>{toastMessage.msg}</span>
                </div>
            )}

            {/* Header & Stats */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1rem',
                padding: '1.25rem',
                background: 'rgba(15, 23, 42, 0.6)',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.06)'
            }}>
                <div>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#f8fafc', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span>🎯</span> Funis de Conversão por Dúvida (Áudios & Sequências)
                    </h3>
                    <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.84rem', color: '#94a3b8' }}>
                        Dispare áudios humanizados PTT e mensagens pré-configuradas para dúvidas estratégicas na primeira vez que o cliente perguntar.
                    </p>
                </div>

                <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                    <div style={{ padding: '0.4rem 0.75rem', background: 'rgba(30, 41, 59, 0.6)', borderRadius: '8px', fontSize: '0.82rem', color: '#cbd5e1' }}>
                        Ativos: <strong style={{ color: '#4ade80' }}>{activeCount}</strong> de {totalItems}
                    </div>
                    <button
                        type="button"
                        onClick={() => setModalState({ isOpen: true, funnel: null })}
                        style={{
                            padding: '0.55rem 1.15rem',
                            background: '#2563eb',
                            border: 'none',
                            borderRadius: '8px',
                            color: '#ffffff',
                            fontWeight: 700,
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.4)'
                        }}
                    >
                        <span>+</span> Novo Funil por Dúvida
                    </button>
                </div>
            </div>

            {/* Search Bar */}
            {(totalItems > 0 || searchTerm.trim()) && (
                <div style={{ display: 'flex', gap: '0.75rem', position: 'relative' }}>
                    <input 
                        type="text" 
                        placeholder="Buscar por nome do funil ou pergunta gatilho..."
                        value={searchTerm}
                        onChange={handleSearchChange}
                        style={{
                            flex: 1,
                            padding: '0.55rem 2.5rem 0.55rem 0.85rem',
                            background: '#0f172a',
                            border: '1px solid #334155',
                            borderRadius: '8px',
                            color: '#f8fafc',
                            fontSize: '0.88rem'
                        }}
                    />
                    {searchTerm && (
                        <button
                            type="button"
                            onClick={() => { setSearchTerm(''); setPage(1); }}
                            title="Limpar busca"
                            style={{
                                position: 'absolute',
                                right: '12px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                background: 'transparent',
                                border: 'none',
                                color: '#94a3b8',
                                cursor: 'pointer',
                                fontSize: '1rem',
                                padding: '0.2rem 0.4rem'
                            }}
                        >
                            ✕
                        </button>
                    )}
                </div>
            )}

            {/* Funnels List */}
            {loading ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="tab-loading-spinner" style={{ marginBottom: '1rem' }}></div>
                    Carregando funis por dúvida...
                </div>
            ) : displayedFunnels.length > 0 ? (
                <div>
                    {displayedFunnels.map(funnel => (
                        <QuestionFunnelCard 
                            key={funnel.id}
                            funnel={funnel}
                            onToggleActive={handleToggleActive}
                            onEdit={(f) => setModalState({ isOpen: true, funnel: f })}
                            onDelete={(f) => setDeleteModalState({ isOpen: true, funnel: f })}
                            onTest={(f) => setTestModalState({ isOpen: true, funnel: f })}
                        />
                    ))}

                    {/* Paginação (20 por página) */}
                    <Pagination 
                        currentPage={page}
                        totalPages={totalPages}
                        totalItems={totalItems}
                        pageSize={pageSize}
                        onPageChange={handlePageChange}
                    />
                </div>
            ) : searchTerm.trim() ? (
                <div style={{
                    padding: '2.5rem 1.5rem',
                    textAlign: 'center',
                    background: 'rgba(15, 23, 42, 0.4)',
                    borderRadius: '12px',
                    border: '1px solid rgba(255, 255, 255, 0.06)'
                }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔍</div>
                    <h4 style={{ color: '#f8fafc', fontSize: '1.05rem', margin: '0 0 0.4rem 0' }}>
                        Nenhum funil encontrado para "{searchTerm}"
                    </h4>
                    <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '0 0 1.25rem 0' }}>
                        Tente buscar por termos mais genéricos ou limpe o filtro de busca.
                    </p>
                    <button
                        type="button"
                        onClick={() => { setSearchTerm(''); setPage(1); }}
                        style={{
                            padding: '0.45rem 1.15rem',
                            background: 'rgba(30, 41, 59, 0.8)',
                            border: '1px solid #334155',
                            borderRadius: '8px',
                            color: '#cbd5e1',
                            cursor: 'pointer',
                            fontSize: '0.85rem'
                        }}
                    >
                        Limpar busca
                    </button>
                </div>
            ) : (
                <div style={{
                    padding: '3rem 1.5rem',
                    textAlign: 'center',
                    background: 'rgba(15, 23, 42, 0.4)',
                    borderRadius: '12px',
                    border: '1px dashed rgba(255, 255, 255, 0.1)'
                }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🎯</div>
                    <h4 style={{ color: '#f8fafc', fontSize: '1.05rem', margin: '0 0 0.4rem 0' }}>
                        Nenhum funil por dúvida cadastrado ainda
                    </h4>
                    <p style={{ color: '#94a3b8', fontSize: '0.85rem', maxWidth: '460px', margin: '0 auto 1.25rem auto' }}>
                        Cadastre uma pergunta frequente estratégica (ex: "como funciona o curso?") e configure um áudio gravado em primeira pessoa para aumentar drasticamente sua conversão!
                    </p>
                    <button
                        type="button"
                        onClick={() => setModalState({ isOpen: true, funnel: null })}
                        style={{
                            padding: '0.55rem 1.25rem',
                            background: '#2563eb',
                            border: 'none',
                            borderRadius: '8px',
                            color: '#ffffff',
                            fontWeight: 700,
                            fontSize: '0.85rem',
                            cursor: 'pointer'
                        }}
                    >
                        + Criar Primeiro Funil por Dúvida
                    </button>
                </div>
            )}

            {/* Modals */}
            <QuestionFunnelModal 
                isOpen={modalState.isOpen}
                funnel={modalState.funnel}
                onSave={handleSaveFunnel}
                onClose={() => setModalState({ isOpen: false, funnel: null })}
                loading={actionLoading}
            />

            <DeleteQuestionFunnelModal 
                isOpen={deleteModalState.isOpen}
                funnel={deleteModalState.funnel}
                onConfirm={handleDeleteFunnel}
                onCancel={() => setDeleteModalState({ isOpen: false, funnel: null })}
                loading={actionLoading}
            />

            <TestFunnelModal 
                isOpen={testModalState.isOpen}
                agentId={agentId}
                initialFunnel={testModalState.funnel}
                onClose={() => setTestModalState({ isOpen: false, funnel: null })}
            />
        </div>
    );
};

export default TabQuestionFunnels;
