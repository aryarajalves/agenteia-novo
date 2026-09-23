import { useState, useEffect, useCallback } from 'react';
import { api } from '../../../../../api/client';

export const useSemanticCacheLeadQuestions = ({ agentId, lastAddedQuestion = null }) => {
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

    const handleClearSearch = () => {
        setSearchTerm('');
        setCurrentPage(1);
    };

    const handleFilterChange = (status) => {
        setFilterStatus(status);
        setCurrentPage(1);
    };

    const handleOpenIgnore = (item) => {
        setIgnoreModal({ isOpen: true, item });
    };

    const handleCloseIgnore = () => {
        setIgnoreModal({ isOpen: false, item: null });
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

    return {
        questions,
        totalCount,
        noCacheCount,
        hasCacheCount,
        totalPages,
        currentPage,
        pageSize,
        loading,
        searchTerm,
        filterStatus,
        ignoreModal,
        isIgnoring,
        loadQuestions,
        handleSearchChange,
        handleClearSearch,
        handleFilterChange,
        handleOpenIgnore,
        handleCloseIgnore,
        handleConfirmIgnore,
        setCurrentPage,
        formatDate
    };
};

export default useSemanticCacheLeadQuestions;
