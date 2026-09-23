import { useState } from 'react';
import { api } from '../../../api/client';
import { showToast } from '../utils/backupFormatters';

export const useBackupItemActions = ({ history, setHistory, setSelectedIds, fetchHistory, fetchConfig }) => {
    const [uploadingBackup, setUploadingBackup] = useState(false);
    const [restoringBackup, setRestoringBackup] = useState(false);

    // Modais de Confirmação
    const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, id: null, filename: '' });
    const [confirmRestore, setConfirmRestore] = useState({ isOpen: false, id: null, filename: '' });

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            setUploadingBackup(true);
            showToast("Enviando arquivo de backup para o S3...", "success");

            const formData = new FormData();
            formData.append("file", file);

            const token = localStorage.getItem('admin_token');
            const apiKey = localStorage.getItem('agent_api_key') || '';
            const headers = {};
            if (token) headers['Authorization'] = `Bearer ${token}`;
            if (apiKey) headers['X-API-Key'] = apiKey;

            const response = await fetch(`${window.location.origin.replace('5300', '8002')}/api/backups/upload`, {
                method: 'POST',
                headers,
                body: formData
            });

            if (response.ok) {
                showToast("Backup enviado e registrado com sucesso!", "success");
                if (fetchHistory) fetchHistory();
                if (fetchConfig) fetchConfig();
            } else {
                const err = await response.json();
                showToast(err.detail || "Erro ao fazer upload do backup.", "error");
            }
        } catch (error) {
            console.error("Erro no upload de backup:", error);
            showToast("Erro de rede no upload de backup.", "error");
        } finally {
            setUploadingBackup(false);
            e.target.value = null;
        }
    };

    const handlePin = async (item) => {
        try {
            const response = await api.post(`/backups/history/${item.id}/pin`);
            if (response.ok) {
                setHistory(history.map(h => h.id === item.id ? { ...h, is_pinned: !h.is_pinned } : h));
                showToast(item.is_pinned ? "Backup liberado para auto-limpeza" : "Backup fixado! Não será apagado pela retenção.", "success");
            }
        } catch (error) {
            console.error("Erro ao fixar backup:", error);
        }
    };

    const handleDownload = async (item) => {
        try {
            const response = await api.get(`/backups/history/${item.id}/download`);
            if (response.ok) {
                const data = await response.json();
                window.open(data.url, '_blank');
            } else {
                showToast("Erro ao obter link de download.", "error");
            }
        } catch (error) {
            console.error("Erro ao baixar backup:", error);
        }
    };

    const handleDeleteClick = (item) => {
        setConfirmDelete({
            isOpen: true,
            id: item.id,
            filename: item.filename
        });
    };

    const handleConfirmDelete = async () => {
        try {
            const response = await api.delete(`/backups/history/${confirmDelete.id}`);
            if (response.ok) {
                showToast("Backup excluído permanentemente.", "success");
                setHistory(history.filter(h => h.id !== confirmDelete.id));
                if (setSelectedIds) {
                    setSelectedIds(prev => prev.filter(id => id !== confirmDelete.id));
                }
            } else {
                showToast("Erro ao deletar backup.", "error");
            }
        } catch (error) {
            console.error("Erro ao deletar backup:", error);
        } finally {
            setConfirmDelete({ isOpen: false, id: null, filename: '' });
        }
    };

    const handleRestoreClick = (item) => {
        setConfirmRestore({
            isOpen: true,
            id: item.id,
            filename: item.filename
        });
    };

    const handleConfirmRestore = async () => {
        try {
            setRestoringBackup(true);
            showToast("Restaurando banco de dados a partir do backup selecionado. Aguarde...", "success");
            const response = await api.post(`/backups/history/${confirmRestore.id}/restore`);
            if (response.ok) {
                showToast("Banco de dados restaurado com sucesso! Recarregando sistema...", "success");
                setTimeout(() => {
                    window.location.reload();
                }, 3000);
            } else {
                const err = await response.json();
                showToast(err.detail || "Erro ao restaurar o banco de dados.", "error");
            }
        } catch (error) {
            console.error("Erro ao restaurar backup:", error);
            showToast("Erro de conexão ao restaurar banco.", "error");
        } finally {
            setRestoringBackup(false);
            setConfirmRestore({ isOpen: false, id: null, filename: '' });
        }
    };

    return {
        uploadingBackup,
        restoringBackup,
        confirmDelete,
        setConfirmDelete,
        confirmRestore,
        setConfirmRestore,
        handleFileUpload,
        handlePin,
        handleDownload,
        handleDeleteClick,
        handleConfirmDelete,
        handleRestoreClick,
        handleConfirmRestore
    };
};

export default useBackupItemActions;
