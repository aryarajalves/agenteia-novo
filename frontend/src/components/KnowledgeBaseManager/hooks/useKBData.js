import { useMemo } from 'react';
import { useKB } from '../KBContext';

export const useKBData = () => {
    const { knowledgeBase, kbFilterTerm, typeFilter, currentPage, itemsPerPage } = useKB();

    const filteredItems = useMemo(() => {
        const safeKb = Array.isArray(knowledgeBase) ? knowledgeBase : [];
        return safeKb
            .map((item, index) => (item ? { ...item, originalIndex: index } : null))
            .filter(item => !!item)
            .filter(item => {
                // Filtro por tipo (QA vs Chunks)
                if (typeFilter === 'chunks' && item.category !== 'Transcrição') return false;
                if (typeFilter === 'qa' && item.category === 'Transcrição') return false;

                if (!kbFilterTerm || !kbFilterTerm.trim()) return true;
                const t = kbFilterTerm.toLowerCase().trim();
                const cleanT = t.startsWith('#') ? t.substring(1) : t;
                const itemIdStr = String(item.id ?? '');
                const indexStr = String((item.originalIndex ?? 0) + 1);

                const matchesId = itemIdStr === cleanT || 
                                  `#${itemIdStr}` === t || 
                                  itemIdStr.toLowerCase().includes(cleanT) ||
                                  indexStr === cleanT ||
                                  `#${indexStr}` === t;

                const matchesVariations = Array.isArray(item?.question_variations) &&
                    item.question_variations.some(v => (v || '').toLowerCase().includes(t));

                return (
                    matchesId ||
                    (item?.question || '').toLowerCase().includes(t) ||
                    (item?.answer || '').toLowerCase().includes(t) ||
                    (item?.category || '').toLowerCase().includes(t) ||
                    (item?.metadata_val || '').toLowerCase().includes(t) ||
                    matchesVariations
                );
            });
    }, [knowledgeBase, kbFilterTerm, typeFilter]);

    const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
    
    const paginatedItems = useMemo(() => {
        return filteredItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    }, [filteredItems, currentPage, itemsPerPage]);

    return {
        filteredItems,
        paginatedItems,
        totalPages,
        hasItems: filteredItems.length > 0,
        totalCount: filteredItems.length
    };
};
