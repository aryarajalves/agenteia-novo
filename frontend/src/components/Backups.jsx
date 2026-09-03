import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import {
    BackupStatsCards,
    BackupActionCards,
    BackupScheduleForm,
    BackupHistoryList,
    BackupModals
} from './BackupsModules';

const Backups = () => {
    const [config, setConfig] = useState({
        enabled: false,
        frequency_type: 'hours',
        interval_value: 6,
        retention_count: 30,
        backup_folder: 'Backup_AgenteFlow',
        last_run: null,
        next_run: null,
        last_success_filename: null,
        last_success_created_at: null
    });
    const [history, setHistory] = useState([]);
    const [loadingConfig, setLoadingConfig] = useState(true);
    const [loadingHistory, setLoadingHistory] = useState(true);
    const [savingConfig, setSavingConfig] = useState(false);
    const [runningBackup, setRunningBackup] = useState(false);
    const [uploadingBackup, setUploadingBackup] = useState(false);
    const [restoringBackup, setRestoringBackup] = useState(false);
    
    // Paginação
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(5);

    // Modais de Confirmação
    const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, id: null, filename: '' });
    const [confirmRestore, setConfirmRestore] = useState({ isOpen: false, id: null, filename: '' });

    // Seleção em lote
    const [selectedIds, setSelectedIds] = useState([]);
    const [confirmDeleteBatch, setConfirmDeleteBatch] = useState({ isOpen: false, ids: [] });
    const [deletingBatch, setDeletingBatch] = useState(false);

    useEffect(() => {
        fetchConfig();
        fetchHistory();
    }, []);

    useEffect(() => {
        const hasRunning = history.some(item => item.status === 'running');
        if (hasRunning) {
            const interval = setInterval(() => {
                fetchHistory();
            }, 3000);
            return () => clearInterval(interval);
        }
    }, [history]);

    const isAnyBackupRunning = history.some(item => item.status === 'running');

    const showToast = (message, type = 'success') => {
        window.dispatchEvent(new CustomEvent('app:toast', {
            detail: { message, type }
        }));
    };

    const fetchConfig = async () => {
        try {
            setLoadingConfig(true);
            const response = await api.get('/backups/config');
            if (response.ok) {
                const data = await response.json();
                setConfig(data);
            }
        } catch (error) {
            console.error("Erro ao buscar configurações de backup:", error);
            showToast("Erro ao buscar configurações de backup.", "error");
        } finally {
            setLoadingConfig(false);
        }
    };

    const fetchHistory = async () => {
        try {
            setLoadingHistory(true);
            const response = await api.get('/backups/history');
            if (response.ok) {
                const data = await response.json();
                setHistory(data);
                setCurrentPage(1);
            }
        } catch (error) {
            console.error("Erro ao buscar histórico de backups:", error);
            showToast("Erro ao buscar histórico de backups.", "error");
        } finally {
            setLoadingHistory(false);
        }
    };

    const handleSaveConfig = async (e) => {
        e.preventDefault();
        try {
            setSavingConfig(true);
            const response = await api.put('/backups/config', {
                enabled: config.enabled,
                frequency_type: config.frequency_type,
                interval_value: config.interval_value,
                retention_count: config.retention_count,
                backup_folder: config.backup_folder
            });
            if (response.ok) {
                showToast("Configurações salvas com sucesso!", "success");
                fetchConfig();
            } else {
                showToast("Erro ao salvar configurações.", "error");
            }
        } catch (error) {
            console.error("Erro ao salvar configurações de backup:", error);
            showToast("Erro de rede ao salvar configurações.", "error");
        } finally {
            setSavingConfig(false);
        }
    };

    const handleRunBackup = async () => {
        try {
            setRunningBackup(true);
            showToast("Iniciando backup em segundo plano...", "success");
            const response = await api.post('/backups/run');
            if (response.ok) {
                fetchHistory();
            } else {
                showToast("Erro ao disparar backup.", "error");
            }
        } catch (error) {
            console.error("Erro ao rodar backup manual:", error);
            showToast("Erro de conexão ao rodar backup.", "error");
        } finally {
            setRunningBackup(false);
        }
    };

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
                fetchHistory();
                fetchConfig();
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
                setSelectedIds(prev => prev.filter(id => id !== confirmDelete.id));
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

    const formatBytes = (bytes, decimals = 2) => {
        if (!bytes) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    };

    const formatDateTime = (dateString) => {
        if (!dateString) return 'Nunca';
        const date = new Date(dateString);
        return date.toLocaleString('pt-BR');
    };

    // Lógica da Paginação
    const totalPages = Math.ceil(history.length / itemsPerPage);
    const paginatedHistory = history.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    // Funções de Seleção e Deleção em Lote
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
                fetchHistory();
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

    return (
        <div className="backups-page" style={{ padding: '1.5rem', color: '#fff' }}>
            <style>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>
            <header className="page-header" style={{ marginBottom: '2rem' }}>
                <div className="title-group">
                    <h1>Gerenciamento de Backups</h1>
                    <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '0.25rem' }}>
                        Configure rotinas automáticas de backup completo do PostgreSQL e envie diretamente para o S3 da Backblaze.
                    </p>
                </div>
            </header>

            {/* Grid de Métricas no topo */}
            <BackupStatsCards
                config={config}
                formatDateTime={formatDateTime}
            />

            {/* Painéis de Ação (Backup Manual e Upload) */}
            <BackupActionCards
                handleRunBackup={handleRunBackup}
                runningBackup={runningBackup}
                isAnyBackupRunning={isAnyBackupRunning}
                handleFileUpload={handleFileUpload}
                uploadingBackup={uploadingBackup}
            />

            {/* Configurações de Agendamento */}
            <BackupScheduleForm
                config={config}
                setConfig={setConfig}
                handleSaveConfig={handleSaveConfig}
                savingConfig={savingConfig}
            />

            {/* Lista de Backups com Ações em Lote e Paginação */}
            <BackupHistoryList
                history={history}
                loadingHistory={loadingHistory}
                fetchHistory={fetchHistory}
                itemsPerPage={itemsPerPage}
                setItemsPerPage={setItemsPerPage}
                currentPage={currentPage}
                setCurrentPage={setCurrentPage}
                totalPages={totalPages}
                paginatedHistory={paginatedHistory}
                selectedIds={selectedIds}
                handleSelectToggle={handleSelectToggle}
                handleSelectAllToggle={handleSelectAllToggle}
                isAllSelected={isAllSelected}
                deletableHistoryItems={deletableHistoryItems}
                handleDeleteBatchClick={handleDeleteBatchClick}
                handlePin={handlePin}
                handleRestoreClick={handleRestoreClick}
                handleDownload={handleDownload}
                handleDeleteClick={handleDeleteClick}
                formatDateTime={formatDateTime}
                formatBytes={formatBytes}
            />

            {/* Modais de Confirmação */}
            <BackupModals
                confirmDelete={confirmDelete}
                setConfirmDelete={setConfirmDelete}
                handleConfirmDelete={handleConfirmDelete}
                confirmRestore={confirmRestore}
                setConfirmRestore={setConfirmRestore}
                handleConfirmRestore={handleConfirmRestore}
                restoringBackup={restoringBackup}
                confirmDeleteBatch={confirmDeleteBatch}
                setConfirmDeleteBatch={setConfirmDeleteBatch}
                handleConfirmDeleteBatch={handleConfirmDeleteBatch}
                deletingBatch={deletingBatch}
            />
        </div>
    );
};

export default Backups;
