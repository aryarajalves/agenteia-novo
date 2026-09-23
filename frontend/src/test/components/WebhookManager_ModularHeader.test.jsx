import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import WebhookManagerHeader from '../../components/WebhookManager/components/WebhookManagerHeader';
import WebhookManagerModals from '../../components/WebhookManager/components/WebhookManagerModals';

describe('WebhookManager Modular Components', () => {
    describe('WebhookManagerHeader', () => {
        it('deve renderizar o título, campo de busca e acionar criação de webhook', () => {
            const setSearchQuery = vi.fn();
            const onOpenCreate = vi.fn();

            render(
                <WebhookManagerHeader
                    searchQuery="Lead Qualificado"
                    setSearchQuery={setSearchQuery}
                    onOpenCreate={onOpenCreate}
                />
            );

            expect(screen.getByText('Integrações Webhook')).toBeInTheDocument();

            const input = screen.getByPlaceholderText(/Buscar integração/i);
            expect(input).toHaveValue('Lead Qualificado');

            fireEvent.change(input, { target: { value: 'Novo Lead' } });
            expect(setSearchQuery).toHaveBeenCalledWith('Novo Lead');

            const btnNew = screen.getByRole('button', { name: /\+ Novo Webhook/i });
            fireEvent.click(btnNew);
            expect(onOpenCreate).toHaveBeenCalled();
        });
    });

    describe('WebhookManagerModals', () => {
        it('deve renderizar modais de confirmação no portal quando ativados', () => {
            render(
                <WebhookManagerModals
                    selectedWebhook={null}
                    setSelectedWebhook={vi.fn()}
                    leadHistoryModal={null}
                    setLeadHistoryModal={vi.fn()}
                    historyTab="pipeline"
                    setHistoryTab={vi.fn()}
                    events={[]}
                    eventsLoading={false}
                    historyFilters={{}}
                    setHistoryFilters={vi.fn()}
                    fetchEvents={vi.fn()}
                    clearHistoryFilters={vi.fn()}
                    historyTotal={0}
                    historyPage={1}
                    setHistoryPage={vi.fn()}
                    historyLimit={20}
                    setHistoryLimit={vi.fn()}
                    selectedEvents={new Set()}
                    setSelectedEvents={vi.fn()}
                    setConfirmEventDelete={vi.fn()}
                    leadsModal={null}
                    setLeadsModal={vi.fn()}
                    setSelectedLeads={vi.fn()}
                    selectedLeads={new Set()}
                    toggleSelectLead={vi.fn()}
                    toggleSelectAllLeads={vi.fn()}
                    handleSelectAllTotalLeads={vi.fn()}
                    handleClearAllSelectedLeads={vi.fn()}
                    isSelectingAllTotal={false}
                    setConfirmLeadDelete={vi.fn()}
                    handleSyncAll={vi.fn()}
                    isSyncing={false}
                    handleImportChat={vi.fn()}
                    cancelImport={vi.fn()}
                    isCancellingImport={false}
                    importProgress={{}}
                    closeImportProgress={vi.fn()}
                    openImportProgress={vi.fn()}
                    isStartingImport={false}
                    fetchLeads={vi.fn()}
                    deletingLeads={false}
                    editingWebhook={null}
                    setEditingWebhook={vi.fn()}
                    editTab="general"
                    setEditTab={vi.fn()}
                    editForm={{}}
                    setEditForm={vi.fn()}
                    handleEdit={vi.fn()}
                    editSaving={false}
                    editError={null}
                    agents={[]}
                    handleGenerateDescription={vi.fn()}
                    syncingAgentId={null}
                    editAllowedInput=""
                    setEditAllowedInput={vi.fn()}
                    editBlockedInput=""
                    setEditBlockedInput={vi.fn()}
                    editDeleteInput=""
                    setEditDeleteInput={vi.fn()}
                    chatwootGlobal={{}}
                    chatwootLabels={[]}
                    labelsLoading={false}
                    fetchChatwootLabels={vi.fn()}
                    setConfirmRemoveFU={vi.fn()}
                    handleCreate={vi.fn()}
                    confirmModal={{ isOpen: true, webhookId: 10, webhookName: 'Webhook Hotmart', isBulk: false }}
                    setConfirmModal={vi.fn()}
                    handleDeleteWebhook={vi.fn()}
                    confirmRemoveFU={null}
                    removeFollowupStep={vi.fn()}
                    confirmLeadDelete={{ isOpen: false, lead: null, isBulk: false }}
                    isDeletingLead={false}
                    setIsDeletingLead={vi.fn()}
                    confirmEventDelete={{ isOpen: false, event: null, isBulk: false }}
                    loadSimulatorWebhook={null}
                    setLoadSimulatorWebhook={vi.fn()}
                />
            );

            // Verifica que o ConfirmModal de webhook foi renderizado no portal
            expect(screen.getByText('Confirmar Exclusão')).toBeInTheDocument();
            expect(screen.getByText(/Webhook Hotmart/i)).toBeInTheDocument();
        });
    });
});
