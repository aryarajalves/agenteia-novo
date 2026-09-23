import { useState, useEffect, useCallback } from 'react';
import { api } from '../../../../../api/client';

export const useSemanticCacheOperations = (agentId, isNew) => {
    const [cacheItems, setCacheItems] = useState([]);
    const [totalCount, setTotalCount] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize] = useState(20);

    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [availableTags, setAvailableTags] = useState([]);
    const [selectedTagFilter, setSelectedTagFilter] = useState('');
    const [actionLoading, setActionLoading] = useState(false);
    const [toastMessage, setToastMessage] = useState(null);

    const showToast = useCallback((msg, type = 'success') => {
        setToastMessage({ msg, type });
        setTimeout(() => setToastMessage(null), 3500);
    }, []);

    const loadCacheItems = useCallback(async (page = currentPage, search = searchTerm, tagFilter = selectedTagFilter) => {
        if (isNew || !agentId) return;
        try {
            setLoading(true);
            const querySearch = search.trim() ? `&search=${encodeURIComponent(search.trim())}` : '';
            const queryTag = tagFilter ? `&category_tag=${encodeURIComponent(tagFilter)}` : '';
            const res = await api.get(`/semantic-cache?agent_id=${agentId}&page=${page}&page_size=${pageSize}${querySearch}${queryTag}`);
            if (res.ok) {
                const data = await res.json();
                if (data && Array.isArray(data.items)) {
                    setCacheItems(data.items);
                    setTotalCount(data.total || 0);
                    setTotalPages(data.total_pages || 1);
                    setCurrentPage(data.page || 1);
                } else if (Array.isArray(data)) {
                    setCacheItems(data);
                    setTotalCount(data.length);
                    setTotalPages(1);
                }
            }

            // Atualizar lista de tags/produtos disponíveis
            api.get(`/semantic-cache/tags?agent_id=${agentId}`)
                .then(async (r) => {
                    if (r.ok) {
                        const tData = await r.json();
                        if (Array.isArray(tData)) setAvailableTags(tData);
                    }
                })
                .catch(() => {});
        } catch (err) {
            console.error("Erro ao carregar cache semântico:", err);
        } finally {
            setLoading(false);
        }
    }, [agentId, isNew, currentPage, pageSize, searchTerm, selectedTagFilter]);

    useEffect(() => {
        loadCacheItems(currentPage, searchTerm, selectedTagFilter);
    }, [loadCacheItems, currentPage, searchTerm, selectedTagFilter]);

    const handleSearchChange = useCallback((e) => {
        setSearchTerm(e.target.value);
        setCurrentPage(1);
    }, []);

    const handleToggleItem = useCallback(async (itemId) => {
        try {
            setActionLoading(true);
            const res = await api.patch(`/semantic-cache/${itemId}/toggle`);
            if (res.ok) {
                const updated = await res.json();
                setCacheItems(prev => prev.map(it => it.id === itemId ? updated : it));
                showToast("Status da resposta atualizado com sucesso!");
            }
        } catch (err) {
            console.error("Erro ao alternar item do cache:", err);
        } finally {
            setActionLoading(false);
        }
    }, [showToast]);

    const handleDeleteItem = useCallback(async (itemToDelete, onSuccess) => {
        if (!itemToDelete) return;
        try {
            setActionLoading(true);
            const res = await api.delete(`/semantic-cache/${itemToDelete.id}`);
            if (res.ok) {
                if (onSuccess) onSuccess();
                showToast("Resposta excluída do cache com sucesso!");
                loadCacheItems(currentPage, searchTerm, selectedTagFilter);
            }
        } catch (err) {
            console.error("Erro ao excluir item do cache:", err);
        } finally {
            setActionLoading(false);
        }
    }, [currentPage, searchTerm, selectedTagFilter, loadCacheItems, showToast]);

    const handleSaveCreate = useCallback(async ({ user_query, approved_response, alternate_queries = [], similarity_threshold = null, category_tag = null }, initialData, onSuccess) => {
        try {
            setActionLoading(true);
            const res = await api.post('/semantic-cache', {
                agent_id: Number(agentId),
                user_query,
                approved_response,
                alternate_queries,
                similarity_threshold,
                category_tag
            });
            if (res.ok) {
                if (onSuccess) onSuccess();
                showToast("⚡ Nova resposta salva com sucesso no Cache!");
                loadCacheItems(1, searchTerm, selectedTagFilter);
            }
        } catch (err) {
            console.error("Erro ao cadastrar resposta no cache:", err);
            showToast("Erro ao cadastrar resposta no cache.", "error");
        } finally {
            setActionLoading(false);
        }
    }, [agentId, searchTerm, selectedTagFilter, loadCacheItems, showToast]);

    const handleLinkVariation = useCallback(async ({ cacheId, newVariation, existingAlternateQueries = [] }, initialData, onSuccess) => {
        try {
            setActionLoading(true);
            const targetItem = cacheItems.find(it => it.id === cacheId);
            const baseAlts = existingAlternateQueries && existingAlternateQueries.length > 0
                ? existingAlternateQueries
                : (targetItem?.alternate_queries || []);

            if (!baseAlts.includes(newVariation)) {
                const updatedAlts = [...baseAlts, newVariation];
                const res = await api.put(`/semantic-cache/${cacheId}`, {
                    alternate_queries: updatedAlts
                });
                if (res.ok) {
                    if (onSuccess) onSuccess();
                    showToast("⚡ Pergunta vinculada como nova variação com sucesso!");
                    loadCacheItems(currentPage, searchTerm, selectedTagFilter);
                }
            } else {
                if (onSuccess) onSuccess();
                showToast("Esta variação já está vinculada a esta resposta!", "info");
            }
        } catch (err) {
            console.error("Erro ao vincular variação:", err);
            showToast("Erro ao vincular variação.", "error");
        } finally {
            setActionLoading(false);
        }
    }, [cacheItems, currentPage, searchTerm, selectedTagFilter, loadCacheItems, showToast]);

    const handleSaveEdit = useCallback(async ({
        id: cacheId,
        user_query,
        approved_response,
        alternate_queries,
        similarity_threshold = null,
        clear_similarity_threshold = false,
        category_tag = null,
        clear_category_tag = false
    }, onSuccess) => {
        try {
            setActionLoading(true);
            const res = await api.put(`/semantic-cache/${cacheId}`, {
                user_query,
                approved_response,
                alternate_queries,
                similarity_threshold,
                clear_similarity_threshold,
                category_tag,
                clear_category_tag
            });
            if (res.ok) {
                const updated = await res.json();
                setCacheItems(prev => prev.map(it => it.id === cacheId ? updated : it));
                if (onSuccess) onSuccess();
                showToast("⚡ Resposta e inteligência vetorial atualizadas no Cache!");
            }
        } catch (err) {
            console.error("Erro ao salvar edição do cache:", err);
        } finally {
            setActionLoading(false);
        }
    }, [showToast]);

    return {
        cacheItems,
        totalCount,
        totalPages,
        currentPage,
        setCurrentPage,
        pageSize,
        loading,
        searchTerm,
        availableTags,
        selectedTagFilter,
        setSelectedTagFilter,
        actionLoading,
        toastMessage,
        showToast,
        loadCacheItems,
        handleSearchChange,
        handleToggleItem,
        handleDeleteItem,
        handleSaveCreate,
        handleLinkVariation,
        handleSaveEdit
    };
};
