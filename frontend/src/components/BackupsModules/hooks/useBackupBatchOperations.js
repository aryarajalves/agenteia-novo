import { useState } from 'react';
import { api } from '../../../api/client';
import { showToast } from '../utils/backupFormatters';

export const useBackupBatchOperations = ({ paginatedHistory, fetchHistory }) => {
    const [selectedIds, setSelectedIds] = useState([]);
    const [confirmDeleteBatch, setConfirmDeleteBatch] = useState({ isOpen: false, ids: [] });
    const [deletingBatch, setDeletingBatch] = useState(false);

    const handleSelectToggle = (id) => {
        setSelectedIds(prev => 
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    const deletableHistoryItems = paginatedHistory.filter(item => !item.is_pinned && item.status !== 'running');
    const isAllSelected = deletableHistoryItems.length > 0 && deletableHistoryItems.every(item => selectedIds.includes(item.id));

    const handleSelectAllToggle = () => {
        const pageIds = deletableHistoryItems.map(item => item.id);
        if (isAllSelected) {
            setSelectedIds(prev => prev.filter(id => !pageIds.includes(id)));
        } else {
            setSelectedIds(prev => [...new Set([...prev, ...pageIds])]);
        }
    };

    const handleDeleteBatchClick = () => {
        if (selectedIds.length === 0) return;
        setConfirmDeleteBatch({ isOpen: true, ids: selectedIds });
    };

    const handleConfirmDeleteBatch = async () => {
        try {
            setDeletingBatch(true);
            const response = await api.post('/backups/delete-batch', { ids: confirmDeleteBatch.ids });
            if (response.ok) {
                showToast(`${confirmDeleteBatch.ids.length} backups excluídos com sucesso!`, "success");
                setSelectedIds([]);
                setConfirmDeleteBatch({ isOpen: false, ids: [] });
                if (fetchHistory) fetchHistory();
            } else {
                const data = await response.json();
                showToast(data.detail || "Erro ao excluir backups em lote.", "error");
            }
        } catch (error) {
            console.error("Erro ao excluir backups em lote:", error);
            showToast("Erro de rede ao excluir backups em lote.", "error");
        } finally {
            setDeletingBatch(false);
        }
    };

    return {
        selectedIds,
        setSelectedIds,
        confirmDeleteBatch,
        setConfirmDeleteBatch,
        deletingBatch,
        handleSelectToggle,
        handleSelectAllToggle,
        handleDeleteBatchClick,
        handleConfirmDeleteBatch,
        deletableHistoryItems,
        isAllSelected
    };
};

export default useBackupBatchOperations;
