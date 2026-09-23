import { useState, useEffect } from 'react';
import { api } from '../../../../../api/client';

export const useCreateSemanticCacheModal = ({
    isOpen,
    initialData,
    agentId,
    existingItems: propExistingItems,
    onSave,
    onLinkExisting
}) => {
    const [mode, setMode] = useState('new'); // 'new' | 'link'
    const [userQuery, setUserQuery] = useState('');
    const [approvedResponse, setApprovedResponse] = useState('');
    const [alternateQueries, setAlternateQueries] = useState([]);
    const [similarityThreshold, setSimilarityThreshold] = useState(null);
    const [categoryTag, setCategoryTag] = useState('');
    const [isFullscreenOpen, setIsFullscreenOpen] = useState(false);

    // Estados para o modo 'link'
    const [existingItems, setExistingItems] = useState([]);
    const [selectedCacheId, setSelectedCacheId] = useState('');
    const [searchLink, setSearchLink] = useState('');
    const [loadingExisting, setLoadingExisting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setUserQuery(initialData?.user_query || '');
            setApprovedResponse(initialData?.approved_response || '');
            setAlternateQueries(initialData?.alternate_queries || []);
            setSimilarityThreshold(initialData?.similarity_threshold ?? null);
            setCategoryTag(initialData?.category_tag || '');
            setIsFullscreenOpen(false);
            setMode('new');

            // Carregar itens existentes para vincular como variação
            if (propExistingItems && Array.isArray(propExistingItems) && propExistingItems.length > 0) {
                setExistingItems(propExistingItems);
                setSelectedCacheId(String(propExistingItems[0].id));
            } else if (agentId) {
                setLoadingExisting(true);
                api.get(`/semantic-cache?agent_id=${agentId}&page_size=100`)
                    .then(async (res) => {
                        if (res.ok) {
                            const data = await res.json();
                            const items = data.items || data || [];
                            setExistingItems(items);
                            if (items.length > 0) {
                                setSelectedCacheId(String(items[0].id));
                            }
                        }
                    })
                    .catch(err => console.error("Erro ao carregar respostas do cache:", err))
                    .finally(() => setLoadingExisting(false));
            }
        }
    }, [isOpen, initialData, agentId, propExistingItems]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!userQuery.trim() || !approvedResponse.trim()) return;
        onSave({
            user_query: userQuery.trim(),
            approved_response: approvedResponse.trim(),
            alternate_queries: alternateQueries,
            similarity_threshold: similarityThreshold,
            category_tag: categoryTag.trim() || null
        });
    };

    const handleLinkSubmit = (e) => {
        if (e) e.preventDefault();
        if (!userQuery.trim() || !selectedCacheId) return;
        const targetItem = existingItems.find(it => String(it.id) === String(selectedCacheId));
        if (onLinkExisting) {
            onLinkExisting({
                cacheId: Number(selectedCacheId),
                newVariation: userQuery.trim(),
                existingAlternateQueries: targetItem?.alternate_queries || []
            });
        }
    };

    return {
        mode,
        setMode,
        userQuery,
        setUserQuery,
        approvedResponse,
        setApprovedResponse,
        alternateQueries,
        setAlternateQueries,
        similarityThreshold,
        setSimilarityThreshold,
        categoryTag,
        setCategoryTag,
        isFullscreenOpen,
        setIsFullscreenOpen,
        existingItems,
        selectedCacheId,
        setSelectedCacheId,
        searchLink,
        setSearchLink,
        loadingExisting,
        handleSubmit,
        handleLinkSubmit
    };
};
