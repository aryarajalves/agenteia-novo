import React, { useEffect, useState } from 'react';
import LeadHistoryModalHeader from './components/LeadHistoryModalHeader';
import LeadHistoryTable from './components/LeadHistoryTable';
import LeadHistoryPagination from './components/LeadHistoryPagination';
import LeadHistorySubmodals from './components/LeadHistorySubmodals';
import { useSaveToCache } from './hooks/useSaveToCache';
import { useLeadHistoryEvents } from './hooks/useLeadHistoryEvents';

const LeadHistoryModal = ({
    lead,
    webhook,
    onClose
}) => {
    const [selectedPipelineEvent, setSelectedPipelineEvent] = useState(null);
    const [maximizedText, setMaximizedText] = useState(null);

    const {
        events,
        displayEvents,
        loading,
        total,
        page,
        setPage,
        limit,
        setLimit,
        fetchLeadHistory,
        confirmDelete,
        setConfirmDelete,
        confirmRetry,
        setConfirmRetry,
        retryingEvents,
        handleDeleteEvent,
        confirmDeleteEvent,
        handleRetryEvent,
        confirmRetryEvent,
        getMessageTypeLabel
    } = useLeadHistoryEvents(lead, webhook);

    const {
        approveCacheModal,
        setApproveCacheModal,
        isSavingCache,
        handleOpenSaveCache,
        handleConfirmSaveCache,
        handleLinkExistingCache
    } = useSaveToCache(webhook);

    // Bloquear scroll do body ao montar modal
    useEffect(() => {
        const originalStyle = window.getComputedStyle(document.body).overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = originalStyle; };
    }, []);

    if (!webhook) return null;

    return (
        <div className="premium-modal-overlay" style={{ zIndex: 1050 }}>
            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes spin-reload {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                .loading-spin {
                    animation: spin-reload 0.8s linear infinite;
                    display: inline-block;
                }
            ` }} />
            <div
                onClick={e => e.stopPropagation()}
                className="premium-modal-content modal-wide"
                style={{ maxWidth: '1120px', height: '90vh', maxHeight: '900px', display: 'flex', flexDirection: 'column' }}
            >
                {/* Cabeçalho Premium */}
                <LeadHistoryModalHeader
                    lead={lead}
                    total={total}
                    loading={loading}
                    onReload={fetchLeadHistory}
                    onClose={onClose}
                />

                {/* Tabela de Disparos */}
                <LeadHistoryTable
                    events={displayEvents}
                    loading={loading}
                    getMessageTypeLabel={getMessageTypeLabel}
                    setMaximizedText={setMaximizedText}
                    setSelectedPipelineEvent={setSelectedPipelineEvent}
                    handleDeleteEvent={handleDeleteEvent}
                    handleRetryEvent={handleRetryEvent}
                    onSaveToCache={handleOpenSaveCache}
                    retryingEvents={retryingEvents}
                />

                {/* Rodapé - Paginação */}
                <LeadHistoryPagination
                    limit={limit}
                    setLimit={setLimit}
                    page={page}
                    setPage={setPage}
                    eventsCount={events.length}
                    total={total}
                />

                {/* Submodais Dinâmicos */}
                <LeadHistorySubmodals
                    approveCacheModal={approveCacheModal}
                    setApproveCacheModal={setApproveCacheModal}
                    handleConfirmSaveCache={handleConfirmSaveCache}
                    handleLinkExistingCache={handleLinkExistingCache}
                    isSavingCache={isSavingCache}
                    selectedPipelineEvent={selectedPipelineEvent}
                    setSelectedPipelineEvent={setSelectedPipelineEvent}
                    events={events}
                    webhook={webhook}
                    confirmDelete={confirmDelete}
                    setConfirmDelete={setConfirmDelete}
                    confirmDeleteEvent={confirmDeleteEvent}
                    confirmRetry={confirmRetry}
                    setConfirmRetry={setConfirmRetry}
                    confirmRetryEvent={confirmRetryEvent}
                    maximizedText={maximizedText}
                    setMaximizedText={setMaximizedText}
                />
            </div>
        </div>
    );
};

export default LeadHistoryModal;
