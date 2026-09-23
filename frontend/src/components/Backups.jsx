import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import {
    BackupStatsCards,
    BackupActionCards,
    BackupScheduleForm,
    BackupHistoryList,
    BackupModals,
    useBackupBatchOperations,
    useBackupItemActions,
    showToast,
    formatBytes,
    formatDateTime
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
    
    // Paginação
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(5);

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

    // Lógica da Paginação
    const totalPages = Math.ceil(history.length / itemsPerPage);
    const paginatedHistory = history.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    // Hooks Especializados para Deleção/Upload e Operações em Lote
    const {
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
    } = useBackupItemActions({
        history,
        setHistory,
        setSelectedIds: (cb) => batchOps.setSelectedIds(cb),
        fetchHistory,
        fetchConfig
    });

    const batchOps = useBackupBatchOperations({
        paginatedHistory,
        fetchHistory
    });

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
                selectedIds={batchOps.selectedIds}
                handleSelectToggle={batchOps.handleSelectToggle}
                handleSelectAllToggle={batchOps.handleSelectAllToggle}
                isAllSelected={batchOps.isAllSelected}
                deletableHistoryItems={batchOps.deletableHistoryItems}
                handleDeleteBatchClick={batchOps.handleDeleteBatchClick}
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
                confirmDeleteBatch={batchOps.confirmDeleteBatch}
                setConfirmDeleteBatch={batchOps.setConfirmDeleteBatch}
                handleConfirmDeleteBatch={batchOps.handleConfirmDeleteBatch}
                deletingBatch={batchOps.deletingBatch}
            />
        </div>
    );
};

export default Backups;
