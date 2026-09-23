import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';

// Styles
import './styles/WebhookManager.css';

// Hooks
import { useWebhooks } from './hooks/useWebhooks';
import { useEvents } from './hooks/useEvents';
import { useWebhookOperations } from './hooks/useWebhookOperations';
import { useLeads } from './hooks/useLeads';

// Components
import WebhookManagerHeader from './components/WebhookManagerHeader';
import WebhookManagerModals from './components/WebhookManagerModals';
import WebhookList from './components/WebhookList';
import BulkActionToolbar from './components/BulkActionToolbar';

// Utils & Constants
import { showToast, getReceiveUrl } from './utils/helpers';

const WebhookManager = () => {
    // Estado Local
    const [selectedWebhooks, setSelectedWebhooks] = useState(new Set());
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, webhookId: null, webhookName: '', isBulk: false });
    const [confirmLeadDelete, setConfirmLeadDelete] = useState({ isOpen: false, lead: null, isBulk: false });
    const [isDeletingLead, setIsDeletingLead] = useState(false);
    const [confirmEventDelete, setConfirmEventDelete] = useState({ isOpen: false, event: null, isBulk: false });
    const [confirmRemoveFU, setConfirmRemoveFU] = useState(null);
    const [copiedToken, setCopiedToken] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [leadHistoryModal, setLeadHistoryModal] = useState(null);
    const [loadSimulatorWebhook, setLoadSimulatorWebhook] = useState(null);

    // Hooks de Dados e Operações
    const { 
        webhooks, 
        loading: webhooksLoading, 
        fetchWebhooks, 
        agents, 
        chatwootGlobal,
        chatwootLabels,
        labelsLoading,
        handleGenerateDescription,
        syncingAgentId,
        fetchChatwootLabels
    } = useWebhooks(showToast);

    const {
        selectedWebhook, setSelectedWebhook,
        events,
        eventsLoading,
        historyFilters, setHistoryFilters,
        historyTotal, historyPage, setHistoryPage,
        historyLimit, setHistoryLimit,
        historyTab, setHistoryTab,
        fetchEvents, clearHistoryFilters,
        selectedEvents, setSelectedEvents
    } = useEvents();

    const {
        isCreating,
        createForm, setCreateForm,
        handleCreate,
        editingWebhook, setEditingWebhook,
        editForm, setEditForm,
        editSaving, editError,
        editTab, setEditTab,
        handleEdit,
        handleOpenEdit,
        handleOpenCreate,
        togglingId,
        handleToggleActive,
        editAllowedInput, setEditAllowedInput,
        editBlockedInput, setEditBlockedInput,
        editDeleteInput, setEditDeleteInput
    } = useWebhookOperations(fetchWebhooks, setSelectedWebhook, fetchChatwootLabels);

    const {
        leadsModal, setLeadsModal,
        fetchLeads,
        selectedLeads,
        setSelectedLeads,
        toggleSelectLead,
        toggleSelectAllLeads,
        handleSelectAllTotalLeads,
        handleClearAllSelectedLeads,
        isSelectingAllTotal,
        handleSyncAll,
        isSyncing,
        handleImportChat,
        importProgress,
        openImportProgress,
        closeImportProgress,
        isStartingImport,
        cancelImport,
        isCancellingImport,
        deletingLeads
    } = useLeads();

    // Bloquear scroll do body quando qualquer modal estiver aberto
    useEffect(() => {
        const isAnyModalOpen = isCreating || confirmModal.isOpen || !!confirmRemoveFU || !!leadsModal || !!selectedWebhook || !!editingWebhook || !!leadHistoryModal || confirmLeadDelete.isOpen || confirmEventDelete.isOpen;
        
        if (isAnyModalOpen) {
            document.body.classList.add('global-modal-open');
            const originalStyle = window.getComputedStyle(document.body).overflow;
            document.body.style.overflow = 'hidden';
            return () => { 
                document.body.classList.remove('global-modal-open');
                document.body.style.overflow = originalStyle; 
            };
        } else {
            document.body.classList.remove('global-modal-open');
        }
    }, [isCreating, confirmModal.isOpen, confirmRemoveFU, leadsModal, selectedWebhook, editingWebhook, leadHistoryModal, confirmLeadDelete.isOpen, confirmEventDelete.isOpen]);

    // Helpers
    const copyToClipboard = (token, id) => {
        const url = getReceiveUrl(token);
        navigator.clipboard.writeText(url);
        setCopiedToken(id || token);
        showToast('URL copiada para a área de transferência!');
        setTimeout(() => setCopiedToken(null), 2000);
    };

    const handleDeleteWebhook = async () => {
        if (!confirmModal.webhookId && !confirmModal.isBulk) return;
        
        try {
            if (confirmModal.isBulk) {
                const ids = Array.from(selectedWebhooks);
                let successCount = 0;
                for (const id of ids) {
                    const res = await api.delete(`/webhooks/${id}`);
                    if (res.ok) successCount++;
                }
                setSelectedWebhooks(new Set());
                showToast(`${successCount} integrações removidas!`);
            } else {
                const res = await api.delete(`/webhooks/${confirmModal.webhookId}`);
                if (res.ok) {
                    showToast('Integração removida com sucesso!');
                } else {
                    showToast('Erro ao remover integração.', 'error');
                }
            }
            setConfirmModal({ isOpen: false, webhookId: null, webhookName: '', isBulk: false });
            await fetchWebhooks();
        } catch (e) {
            showToast('Erro de conexão ao remover integração(ões).', 'error');
        }
    };

    const removeFollowupStep = (index, modalType = 'create') => {
        if (modalType === 'create') {
            const s = [...createForm.followup_steps];
            s.splice(index, 1);
            setCreateForm({ ...createForm, followup_steps: s });
        } else {
            const s = [...editForm.followup_steps];
            s.splice(index, 1);
            const rawF = editForm.followup_funnels;
            let updatedFunnels = rawF;
            if (Array.isArray(rawF) && rawF.length > 0) {
                updatedFunnels = rawF.map(f => (f.id === 'followup_default' || f.is_default) ? { ...f, steps: s } : f);
            }
            setEditForm({ ...editForm, followup_steps: s, followup_funnels: updatedFunnels });
        }
        setConfirmRemoveFU(null);
    };

    return (
        <>
            <div className="webhook-manager-container">
                <WebhookManagerHeader
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    onOpenCreate={handleOpenCreate}
                />

                <BulkActionToolbar
                    selectedWebhooks={selectedWebhooks}
                    webhooks={webhooks}
                    toggleSelectAllWebhooks={() => {
                        if (selectedWebhooks.size === webhooks.length) setSelectedWebhooks(new Set());
                        else setSelectedWebhooks(new Set(webhooks.map(w => w.id)));
                    }}
                    onBulkDelete={() => setConfirmModal({
                        isOpen: true,
                        webhookId: null,
                        webhookName: `${selectedWebhooks.size} integrações`,
                        isBulk: true
                    })}
                    onClearSelection={() => setSelectedWebhooks(new Set())}
                />

                <WebhookList
                    webhooks={webhooks.filter(w => {
                        const matchesSearch = w.name.toLowerCase().includes(searchQuery.toLowerCase()) || (w.description || '').toLowerCase().includes(searchQuery.toLowerCase());
                        return matchesSearch;
                    })}
                    loading={webhooksLoading}
                    selectedWebhooks={selectedWebhooks}
                    toggleSelectWebhook={(id) => setSelectedWebhooks(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; })}
                    handleToggleActive={handleToggleActive}
                    togglingId={togglingId}
                    copyToClipboard={copyToClipboard}
                    copiedToken={copiedToken}
                    onViewErrors={(wh) => { setSelectedWebhook(wh); setHistoryTab('pipeline'); setHistoryFilters(f => ({ ...f, status: 'error' })); fetchEvents(wh, { ...historyFilters, status: 'error' }); }}
                    onViewHistory={(wh) => { setSelectedWebhook(wh); setHistoryTab('pipeline'); fetchEvents(wh); }}
                    onViewLeads={(wh) => { setSelectedLeads(new Set()); fetchLeads(wh); }}
                    onSimulateLoad={(wh) => setLoadSimulatorWebhook(wh)}
                    onEdit={handleOpenEdit}
                    onDelete={(wh) => setConfirmModal({ isOpen: true, webhookId: wh.id, webhookName: wh.name })}
                />
            </div>

            <WebhookManagerModals
                selectedWebhook={selectedWebhook}
                setSelectedWebhook={setSelectedWebhook}
                leadHistoryModal={leadHistoryModal}
                setLeadHistoryModal={setLeadHistoryModal}
                historyTab={historyTab}
                setHistoryTab={setHistoryTab}
                events={events}
                eventsLoading={eventsLoading}
                historyFilters={historyFilters}
                setHistoryFilters={setHistoryFilters}
                fetchEvents={fetchEvents}
                clearHistoryFilters={clearHistoryFilters}
                historyTotal={historyTotal}
                historyPage={historyPage}
                setHistoryPage={setHistoryPage}
                historyLimit={historyLimit}
                setHistoryLimit={setHistoryLimit}
                selectedEvents={selectedEvents}
                setSelectedEvents={setSelectedEvents}
                setConfirmEventDelete={setConfirmEventDelete}
                leadsModal={leadsModal}
                setLeadsModal={setLeadsModal}
                setSelectedLeads={setSelectedLeads}
                selectedLeads={selectedLeads}
                toggleSelectLead={toggleSelectLead}
                toggleSelectAllLeads={toggleSelectAllLeads}
                handleSelectAllTotalLeads={handleSelectAllTotalLeads}
                handleClearAllSelectedLeads={handleClearAllSelectedLeads}
                isSelectingAllTotal={isSelectingAllTotal}
                setConfirmLeadDelete={setConfirmLeadDelete}
                handleSyncAll={handleSyncAll}
                isSyncing={isSyncing}
                handleImportChat={handleImportChat}
                cancelImport={cancelImport}
                isCancellingImport={isCancellingImport}
                importProgress={importProgress}
                closeImportProgress={closeImportProgress}
                openImportProgress={openImportProgress}
                isStartingImport={isStartingImport}
                fetchLeads={fetchLeads}
                deletingLeads={deletingLeads}
                editingWebhook={editingWebhook}
                setEditingWebhook={setEditingWebhook}
                editTab={editTab}
                setEditTab={setEditTab}
                editForm={editForm}
                setEditForm={setEditForm}
                handleEdit={handleEdit}
                editSaving={editSaving}
                editError={editError}
                agents={agents}
                handleGenerateDescription={handleGenerateDescription}
                syncingAgentId={syncingAgentId}
                editAllowedInput={editAllowedInput}
                setEditAllowedInput={setEditAllowedInput}
                editBlockedInput={editBlockedInput}
                setEditBlockedInput={setEditBlockedInput}
                editDeleteInput={editDeleteInput}
                setEditDeleteInput={setEditDeleteInput}
                chatwootGlobal={chatwootGlobal}
                chatwootLabels={chatwootLabels}
                labelsLoading={labelsLoading}
                fetchChatwootLabels={fetchChatwootLabels}
                setConfirmRemoveFU={setConfirmRemoveFU}
                handleCreate={handleCreate}
                confirmModal={confirmModal}
                setConfirmModal={setConfirmModal}
                handleDeleteWebhook={handleDeleteWebhook}
                confirmRemoveFU={confirmRemoveFU}
                removeFollowupStep={removeFollowupStep}
                confirmLeadDelete={confirmLeadDelete}
                isDeletingLead={isDeletingLead}
                setIsDeletingLead={setIsDeletingLead}
                confirmEventDelete={confirmEventDelete}
                loadSimulatorWebhook={loadSimulatorWebhook}
                setLoadSimulatorWebhook={setLoadSimulatorWebhook}
            />
        </>
    );
};

export default WebhookManager;
