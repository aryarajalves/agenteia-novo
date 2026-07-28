import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../../api/client';

// Styles
import './styles/WebhookManager.css';

// Hooks
import { useWebhooks } from './hooks/useWebhooks';
import { useEvents } from './hooks/useEvents';
import { useWebhookOperations } from './hooks/useWebhookOperations';
import { useLeads } from './hooks/useLeads';

// Components
import WebhookList from './components/WebhookList';
import BulkActionToolbar from './components/BulkActionToolbar';
import HistoryModal from './components/HistoryModal/index';
import LeadsModal from './components/LeadsModal';
import EditWebhookModal from './components/EditWebhookModal';
import LeadHistoryModal from './components/LeadHistoryModal';
import ConfirmModal from './components/ConfirmModal';
import LoadSimulatorModal from './components/LoadSimulatorModal';

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
        isCreating, setIsCreating,
        createForm, setCreateForm,
        createSaving, createError,
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
        handleSyncAll,
        handleDeleteSelectedLeads,
        handleDeleteAllLeads,
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
            setEditForm({ ...editForm, followup_steps: s });
        }
        setConfirmRemoveFU(null);
    };

    return (
        <>
            <div className="webhook-manager-container">
                <header className="webhook-manager-header">
                    <div className="header-title-group">
                        <h1 id="page-title">Integrações Webhook</h1>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                        <div style={{ position: 'relative' }}>
                            <input
                                type="text"
                                placeholder="Buscar integração..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                style={{
                                    background: 'rgba(255,255,255,0.03)',
                                    border: '1px solid var(--wh-border)',
                                    borderRadius: '12px',
                                    padding: '0.6rem 1rem 0.6rem 2.5rem',
                                    color: '#fff',
                                    fontSize: '0.85rem',
                                    width: '200px',
                                    outline: 'none'
                                }}
                            />
                            <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>🔍</span>
                        </div>
                        <button
                            id="btn-new-webhook"
                            className="btn-new-webhook"
                            onClick={handleOpenCreate}
                        >
                            <span>+</span> Novo Webhook
                        </button>
                    </div>
                </header>

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
                    onViewLeads={(wh) => fetchLeads(wh)}
                    onSimulateLoad={(wh) => setLoadSimulatorWebhook(wh)}
                    onEdit={handleOpenEdit}
                    onDelete={(wh) => setConfirmModal({ isOpen: true, webhookId: wh.id, webhookName: wh.name })}
                />
            </div>

            {/* PORTAL DE MODAIS — RENDERIZADO NO BODY PARA OVERLAY REALMENTE GLOBAL */}
            {createPortal(
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
                        onClose={() => setLeadsModal(null)}
                        selectedLeads={selectedLeads}
                        setSelectedLeads={setSelectedLeads}
                        toggleSelectLead={toggleSelectLead}
                        toggleSelectAllLeads={toggleSelectAllLeads}
                        onBulkDelete={() => setConfirmLeadDelete({ isOpen: true, lead: null, isBulk: true })}
                        onDeleteLead={(lead) => setConfirmLeadDelete({ isOpen: true, lead, isBulk: false })}
                        onSyncAll={() => handleSyncAll(leadsModal.webhook)}
                        onSearch={(q) => fetchLeads(leadsModal.webhook, 1, leadsModal.pageSize, q, leadsModal.podeEnviar, leadsModal.dateStart, leadsModal.dateEnd, leadsModal.janelaAberta, leadsModal.semMensagens)}
                        onFilterChange={(f) => fetchLeads(leadsModal.webhook, 1, f.pageSize ?? leadsModal.pageSize, f.search ?? leadsModal.search, f.podeEnviar ?? leadsModal.podeEnviar, f.dateStart ?? leadsModal.dateStart, f.dateEnd ?? leadsModal.dateEnd, f.janelaAberta ?? leadsModal.janelaAberta, f.semMensagens ?? leadsModal.semMensagens)}
                        onPageChange={(p) => fetchLeads(leadsModal.webhook, p, leadsModal.pageSize, leadsModal.search, leadsModal.podeEnviar, leadsModal.dateStart, leadsModal.dateEnd, leadsModal.janelaAberta, leadsModal.semMensagens)}
                        onViewHistory={(lead) => {
                            setLeadHistoryModal({ lead, webhook: leadsModal.webhook });
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
                            setLeadHistoryModal(null);
                            if (wh) fetchLeads(wh);
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
        )}
        </>
    );
};

export default WebhookManager;
