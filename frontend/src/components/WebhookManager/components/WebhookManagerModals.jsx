import React from 'react';
import { createPortal } from 'react-dom';
import { api } from '../../../api/client';
import { showToast } from '../utils/helpers';

import HistoryModal from './HistoryModal/index';
import LeadsModal from './LeadsModal';
import EditWebhookModal from './EditWebhookModal';
import LeadHistoryModal from './LeadHistoryModal';
import ConfirmModal from './ConfirmModal';
import LoadSimulatorModal from './LoadSimulatorModal';

const WebhookManagerModals = ({
    selectedWebhook,
    setSelectedWebhook,
    leadHistoryModal,
    setLeadHistoryModal,
    historyTab,
    setHistoryTab,
    events,
    eventsLoading,
    historyFilters,
    setHistoryFilters,
    fetchEvents,
    clearHistoryFilters,
    historyTotal,
    historyPage,
    setHistoryPage,
    historyLimit,
    setHistoryLimit,
    selectedEvents,
    setSelectedEvents,
    setConfirmEventDelete,
    leadsModal,
    setLeadsModal,
    setSelectedLeads,
    selectedLeads,
    toggleSelectLead,
    toggleSelectAllLeads,
    handleSelectAllTotalLeads,
    handleClearAllSelectedLeads,
    isSelectingAllTotal,
    setConfirmLeadDelete,
    handleSyncAll,
    isSyncing,
    handleImportChat,
    cancelImport,
    isCancellingImport,
    importProgress,
    closeImportProgress,
    openImportProgress,
    isStartingImport,
    fetchLeads,
    deletingLeads,
    editingWebhook,
    setEditingWebhook,
    editTab,
    setEditTab,
    editForm,
    setEditForm,
    handleEdit,
    editSaving,
    editError,
    agents,
    handleGenerateDescription,
    syncingAgentId,
    editAllowedInput,
    setEditAllowedInput,
    editBlockedInput,
    setEditBlockedInput,
    editDeleteInput,
    setEditDeleteInput,
    chatwootGlobal,
    chatwootLabels,
    labelsLoading,
    fetchChatwootLabels,
    setConfirmRemoveFU,
    handleCreate,
    confirmModal,
    setConfirmModal,
    handleDeleteWebhook,
    confirmRemoveFU,
    removeFollowupStep,
    confirmLeadDelete,
    isDeletingLead,
    setIsDeletingLead,
    confirmEventDelete,
    loadSimulatorWebhook,
    setLoadSimulatorWebhook
}) => {
    return createPortal(
        <div className="modals-portal">
            {selectedWebhook && !leadHistoryModal && (
                <HistoryModal
                    selectedWebhook={selectedWebhook}
                    onClose={() => setSelectedWebhook(null)}
                    historyTab={historyTab}
                    setHistoryTab={setHistoryTab}
                    events={events}
                    eventsLoading={eventsLoading}
                    historyFilters={historyFilters}
                    setHistoryFilters={setHistoryFilters}
                    onFetchEvents={fetchEvents}
                    onClearFilters={clearHistoryFilters}
                    historyTotal={historyTotal}
                    historyPage={historyPage}
                    setHistoryPage={setHistoryPage}
                    historyLimit={historyLimit}
                    setHistoryLimit={setHistoryLimit}
                    selectedEvents={selectedEvents}
                    setSelectedEvents={setSelectedEvents}
                    handleBulkDelete={() => setConfirmEventDelete({ isOpen: true, event: null, isBulk: true })}
                    onDeleteEvent={(event) => setConfirmEventDelete({ isOpen: true, event, isBulk: false })}
                />
            )}

            {leadsModal && (
                <LeadsModal
                    leadsModal={leadsModal}
                    setLeadsModal={setLeadsModal}
                    onClose={() => { setSelectedLeads(new Set()); setLeadsModal(null); }}
                    selectedLeads={selectedLeads}
                    setSelectedLeads={setSelectedLeads}
                    toggleSelectLead={toggleSelectLead}
                    toggleSelectAllLeads={toggleSelectAllLeads}
                    onSelectAllTotal={handleSelectAllTotalLeads}
                    onClearSelection={handleClearAllSelectedLeads}
                    isSelectingAllTotal={isSelectingAllTotal}
                    onBulkDelete={() => setConfirmLeadDelete({ isOpen: true, lead: null, isBulk: true })}
                    onDeleteLead={(lead) => setConfirmLeadDelete({ isOpen: true, lead, isBulk: false })}
                    onSyncAll={() => handleSyncAll(leadsModal.webhook)}
                    isSyncing={isSyncing}
                    onImportChat={() => handleImportChat(leadsModal.webhook)}
                    onCancelImport={cancelImport}
                    isCancellingImport={isCancellingImport}
                    importProgress={importProgress}
                    onCloseImportProgress={closeImportProgress}
                    onOpenImportProgress={openImportProgress}
                    isStartingImport={isStartingImport}
                    onSearch={(q) => fetchLeads(leadsModal.webhook, 1, leadsModal.pageSize, q, leadsModal.podeEnviar, leadsModal.dateStart, leadsModal.dateEnd, leadsModal.janelaAberta, leadsModal.semMensagens)}
                    onFilterChange={(f) => fetchLeads(leadsModal.webhook, 1, f.pageSize ?? leadsModal.pageSize, f.search ?? leadsModal.search, f.podeEnviar ?? leadsModal.podeEnviar, f.dateStart ?? leadsModal.dateStart, f.dateEnd ?? leadsModal.dateEnd, f.janelaAberta ?? leadsModal.janelaAberta, f.semMensagens ?? leadsModal.semMensagens)}
                    onPageChange={(p) => fetchLeads(leadsModal.webhook, p, leadsModal.pageSize, leadsModal.search, leadsModal.podeEnviar, leadsModal.dateStart, leadsModal.dateEnd, leadsModal.janelaAberta, leadsModal.semMensagens)}
                    onViewHistory={(lead) => {
                        setLeadHistoryModal({ lead, webhook: leadsModal.webhook, savedLeadsModalState: leadsModal });
                        setLeadsModal(null); 
                    }}
                    deletingLeads={deletingLeads}
                />
            )}

            {leadHistoryModal && (
                <LeadHistoryModal
                    lead={leadHistoryModal.lead}
                    webhook={leadHistoryModal.webhook}
                    onClose={() => {
                        const wh = leadHistoryModal.webhook;
                        const savedState = leadHistoryModal.savedLeadsModalState;
                        setLeadHistoryModal(null);
                        if (wh) {
                            if (savedState) {
                                fetchLeads(
                                    wh,
                                    savedState.page || 1,
                                    savedState.pageSize || 20,
                                    savedState.search || '',
                                    savedState.podeEnviar || 'all',
                                    savedState.dateStart || '',
                                    savedState.dateEnd || '',
                                    savedState.janelaAberta || 'all',
                                    savedState.semMensagens || 'all'
                                );
                            } else {
                                fetchLeads(wh);
                            }
                        }
                    }}
                />
            )}

            {editingWebhook && (
                <EditWebhookModal
                    editingWebhook={editingWebhook}
                    onClose={() => setEditingWebhook(null)}
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
                />
            )}

            {/* Modais de Confirmação Modularizados */}
            <ConfirmModal
                type="webhook"
                isOpen={confirmModal.isOpen}
                isBulk={confirmModal.isBulk}
                name={confirmModal.webhookName}
                onClose={() => setConfirmModal({ ...confirmModal, isOpen: false, isBulk: false })}
                onConfirm={handleDeleteWebhook}
            />

            <ConfirmModal
                type="followup"
                isOpen={!!confirmRemoveFU}
                onClose={() => setConfirmRemoveFU(null)}
                onConfirm={() => removeFollowupStep(confirmRemoveFU.index, confirmRemoveFU.modal)}
            />

            <ConfirmModal
                type="lead"
                isOpen={confirmLeadDelete.isOpen}
                isBulk={confirmLeadDelete.isBulk}
                name={selectedLeads.size}
                phone={confirmLeadDelete.lead?.telefone}
                isDeleting={isDeletingLead}
                onClose={() => setConfirmLeadDelete({ isOpen: false, lead: null, isBulk: false })}
                onConfirm={async () => {
                    setIsDeletingLead(true);
                    try {
                        const ids = confirmLeadDelete.isBulk ? Array.from(selectedLeads) : [confirmLeadDelete.lead.id];
                        const res = await api.post(`/webhooks/${leadsModal.webhook.id}/leads/delete-batch`, { lead_ids: ids });
                        
                        if (res.ok) {
                            fetchLeads(leadsModal.webhook, leadsModal.page, leadsModal.pageSize, leadsModal.search);
                            if (confirmLeadDelete.isBulk) setSelectedLeads(new Set());
                            setConfirmLeadDelete({ isOpen: false, lead: null, isBulk: false });
                            showToast(confirmLeadDelete.isBulk ? 'Contatos excluídos!' : 'Lead excluído com sucesso!');
                        } else {
                            showToast('Erro ao excluir contato(s)', 'error');
                        }
                    } catch (err) {
                        console.error("Erro ao excluir leads:", err);
                        showToast('Erro de conexão ao excluir contatos', 'error');
                    } finally {
                        setIsDeletingLead(false);
                    }
                }}
            />

            <ConfirmModal
                type="event"
                isOpen={confirmEventDelete.isOpen}
                isBulk={confirmEventDelete.isBulk}
                name={selectedEvents.size}
                id={confirmEventDelete.event?.id}
                onClose={() => setConfirmEventDelete({ isOpen: false, event: null, isBulk: false })}
                onConfirm={() => {
                    const ids = confirmEventDelete.isBulk ? Array.from(selectedEvents) : [confirmEventDelete.event.id];
                    api.post(`/webhooks/${selectedWebhook.id}/events/bulk-delete`, { event_ids: ids })
                    .then((res) => {
                        if (res.ok) {
                            fetchEvents(selectedWebhook);
                            if (confirmEventDelete.isBulk) setSelectedEvents(new Set());
                            setConfirmEventDelete({ isOpen: false, event: null, isBulk: false });
                            showToast(confirmEventDelete.isBulk ? 'Eventos excluídos!' : 'Mensagem excluída!');
                        } else {
                            showToast('Erro ao excluir evento(s)', 'error');
                        }
                    })
                    .catch(() => {
                        setConfirmEventDelete({ isOpen: false, event: null, isBulk: false });
                        showToast('Erro de conexão ao excluir eventos', 'error');
                    });
                }}
            />

            {loadSimulatorWebhook && (
                <LoadSimulatorModal
                    webhook={loadSimulatorWebhook}
                    onClose={() => setLoadSimulatorWebhook(null)}
                    onFinish={() => showToast('Simulação de carga concluída com sucesso!')}
                    onViewLeads={() => {
                        const wh = loadSimulatorWebhook;
                        setLoadSimulatorWebhook(null);
                        fetchLeads(wh);
                    }}
                />
            )}
        </div>,
        document.body
    );
};

export default WebhookManagerModals;
