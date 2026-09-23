import React, { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../../../../../api/client';

export const useQuestionFunnels = ({ agentId, isNew }) => {
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
    const isFirstRender = useRef(true);
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

    const handleClearSearch = () => {
        setSearchTerm('');
        setPage(1);
    };

    const handlePageChange = (newPage) => {
        setPage(newPage);
        loadFunnels(newPage, searchTerm);
    };

    const openCreateModal = () => setModalState({ isOpen: true, funnel: null });
    const openEditModal = (funnel) => setModalState({ isOpen: true, funnel });
    const closeFunnelModal = () => setModalState({ isOpen: false, funnel: null });

    const openDeleteModal = (funnel) => setDeleteModalState({ isOpen: true, funnel });
    const closeDeleteModal = () => setDeleteModalState({ isOpen: false, funnel: null });

    const openTestModal = (funnel) => setTestModalState({ isOpen: true, funnel });
    const closeTestModal = () => setTestModalState({ isOpen: false, funnel: null });

    return {
        funnels,
        loading,
        searchTerm,
        page,
        pageSize,
        totalItems,
        totalPages,
        activeCount,
        modalState,
        deleteModalState,
        testModalState,
        actionLoading,
        toastMessage,
        displayedFunnels,
        showToast,
        loadFunnels,
        handleSaveFunnel,
        handleToggleActive,
        handleDeleteFunnel,
        handleSearchChange,
        handleClearSearch,
        handlePageChange,
        openCreateModal,
        openEditModal,
        closeFunnelModal,
        openDeleteModal,
        closeDeleteModal,
        openTestModal,
        closeTestModal
    };
};

export default useQuestionFunnels;
