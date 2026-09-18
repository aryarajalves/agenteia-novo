import { useKB } from '../KBContext';
import { api } from '../../../api/client';

export const useKBOperations = () => {
    const {
        kbId,
        knowledgeBase, setKnowledgeBase,
        selectedItems, setSelectedItems,
        setItemToDelete, setIsConfirmOpen,
        setIsDeleting,
        onDelete, onAdd, onUpdate, onChange
    } = useKB();

    const toggleSelect = (id) => {
        const newSelected = new Set(selectedItems);
        if (newSelected.has(id)) newSelected.delete(id);
        else newSelected.add(id);
        setSelectedItems(newSelected);
    };

    const toggleSelectAll = (items) => {
        if (selectedItems.size === items.length) {
            setSelectedItems(new Set());
        } else {
            setSelectedItems(new Set(items.map(i => i.id)));
        }
    };

    const confirmDeletion = async (itemToDelete) => {
        if (!itemToDelete) return;
        setIsDeleting(true);

        try {
            if (onDelete && itemToDelete.id) {
                await onDelete(itemToDelete.id);
            } else if (onChange) {
                const updated = knowledgeBase.filter((_, i) => i !== itemToDelete.index);
                onChange(updated);
            }
        } catch (e) {
            console.error("Delete failed", e);
            alert("Erro ao excluir item");
        } finally {
            setIsDeleting(false);
            setIsConfirmOpen(false);
            setItemToDelete(null);
        }
    };

    const confirmBulkDelete = async () => {
        const idsToDelete = Array.from(selectedItems);
        setIsDeleting(true);

        try {
            const response = await api.delete(`/knowledge-bases/${kbId}/items/batch-delete`, {
                item_ids: idsToDelete
            });
            if (response.ok) {
                setSelectedItems(new Set());
                setIsConfirmOpen(false);
                setKnowledgeBase(prev => prev.filter(i => !idsToDelete.includes(i.id)));
            } else {
                const err = await response.json();
                alert(`Erro ao excluir: ${err.detail || 'Falha desconhecida'}`);
            }
        } catch (e) {
            console.error("Bulk delete failed", e);
            alert("Erro de conexão ao excluir");
        } finally {
            setIsDeleting(false);
            setIsConfirmOpen(false);
        }
    };

    const handleAddItem = async (newPair) => {
        if (!newPair.question.trim() || !newPair.answer.trim()) return false;

        try {
            if (onAdd) {
                const result = await onAdd(
                    newPair.question, 
                    newPair.answer, 
                    newPair.category, 
                    newPair.metadata_val,
                    newPair.question_variations || []
                );
                return result !== false;
            } else if (onChange) {
                const updated = [...knowledgeBase, newPair];
                onChange(updated);
                return true;
            }
            return false;
        } catch (e) {
            console.error("Add failed", e);
            alert("Erro ao adicionar item");
            return false;
        }
    };

    const handleUpdateItem = async (itemId, updatedFields) => {
        if (!updatedFields.question?.trim() || !updatedFields.answer?.trim()) return false;

        try {
            if (onUpdate) {
                const result = await onUpdate(
                    itemId,
                    updatedFields.question,
                    updatedFields.answer,
                    updatedFields.category,
                    updatedFields.metadata_val,
                    updatedFields.question_variations || []
                );
                return result !== false;
            } else if (onChange) {
                const updated = knowledgeBase.map(item =>
                    item.id === itemId ? { ...item, ...updatedFields } : item
                );
                onChange(updated);
                return true;
            } else if (kbId) {
                const res = await api.put(`/knowledge-items/${itemId}`, {
                    question: updatedFields.question,
                    answer: updatedFields.answer,
                    category: updatedFields.category,
                    metadata_val: updatedFields.metadata_val,
                    question_variations: updatedFields.question_variations || []
                });
                if (res.ok) {
                    const data = await res.json().catch(() => ({}));
                    setKnowledgeBase(prev => (prev || []).map(item => item.id === itemId ? { ...item, ...updatedFields, ...data } : item));
                    return true;
                }
                const err = await res.json().catch(() => ({}));
                alert(err.detail || 'Erro ao atualizar item');
                return false;
            }
            return false;
        } catch (e) {
            console.error("Update failed", e);
            alert("Erro ao atualizar item");
            return false;
        }
    };

    const handleBulkUpdate = async (bulkEditForm, setIsBulkUpdating) => {
        if (!selectedItems.size || !kbId) return;
        setIsBulkUpdating(true);
        
        const updatePayload = {
            item_ids: Array.from(selectedItems)
        };
        
        if (bulkEditForm.useQuestion) updatePayload.question = bulkEditForm.question;
        if (bulkEditForm.useAnswer) updatePayload.answer = bulkEditForm.answer;
        if (bulkEditForm.useMetadata) updatePayload.metadata_val = bulkEditForm.metadata_val;
        if (bulkEditForm.useCategory) updatePayload.category = bulkEditForm.category;

        try {
            const res = await api.put(`/knowledge-bases/${kbId}/items/batch-update`, updatePayload);
            if (res.ok) {
                setSelectedItems(new Set());
                return true;
            } else {
                const err = await res.json();
                alert(`Erro ao atualizar itens: ${err.detail || 'Falha desconhecida'}`);
                return false;
            }
        } catch (e) {
            console.error(e);
            alert("Erro na conexão ao atualizar itens.");
            return false;
        } finally {
            setIsBulkUpdating(false);
        }
    };

    const handleBulkSummarize = async (bulkSummarizeForm, setIsSummarizing, setShowSuccessModal) => {
        if (!selectedItems.size || !kbId) return;
        setIsSummarizing(true);
        try {
            const res = await api.post(`/knowledge-bases/${kbId}/items/bulk-summarize`, {
                item_ids: Array.from(selectedItems),
                question: bulkSummarizeForm.question,
                metadata_val: bulkSummarizeForm.metadata_val,
                category: bulkSummarizeForm.category
            });
            if (res.ok) {
                setSelectedItems(new Set());
                setShowSuccessModal(true);
                return true;
            } else {
                const err = await res.json();
                alert(`Erro ao gerar resumo: ${err.detail || 'Falha desconhecida'}`);
                return false;
            }
        } catch (e) {
            console.error(e);
            alert("Erro na conexão ao gerar resumo.");
            return false;
        } finally {
            setIsSummarizing(false);
        }
    };

    return {
        toggleSelect,
        toggleSelectAll,
        confirmDeletion,
        confirmBulkDelete,
        handleAddItem,
        handleUpdateItem,
        handleBulkUpdate,
        handleBulkSummarize
    };
};
