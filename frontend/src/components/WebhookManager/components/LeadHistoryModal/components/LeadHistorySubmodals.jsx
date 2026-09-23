import React from 'react';
import AutomationPipelineModal from '../../AutomationPipelineModal';
import ConfirmDeleteModal from './ConfirmDeleteModal';
import ConfirmRetryModal from './ConfirmRetryModal';
import MaximizedTextModal from './MaximizedTextModal';
import ApproveCacheModal from '../../../../ChatPlayground/components/ApproveCacheModal';

const LeadHistorySubmodals = ({
    approveCacheModal,
    setApproveCacheModal,
    handleConfirmSaveCache,
    handleLinkExistingCache,
    isSavingCache,
    selectedPipelineEvent,
    setSelectedPipelineEvent,
    events,
    webhook,
    confirmDelete,
    setConfirmDelete,
    confirmDeleteEvent,
    confirmRetry,
    setConfirmRetry,
    confirmRetryEvent,
    maximizedText,
    setMaximizedText
}) => {
    return (
        <>
            {approveCacheModal && (
                <ApproveCacheModal
                    modal={approveCacheModal}
                    agentId={approveCacheModal.agentId}
                    onConfirm={handleConfirmSaveCache}
                    onLinkExisting={handleLinkExistingCache}
                    onCancel={() => setApproveCacheModal(null)}
                    isSaving={isSavingCache}
                />
            )}

            {selectedPipelineEvent && (
                <AutomationPipelineModal
                    event={selectedPipelineEvent}
                    events={events}
                    webhookId={webhook?.id}
                    onClose={() => setSelectedPipelineEvent(null)}
                    onNavigateEvent={setSelectedPipelineEvent}
                />
            )}

            <ConfirmDeleteModal
                isOpen={confirmDelete.isOpen}
                eventId={confirmDelete.eventId}
                onCancel={() => setConfirmDelete({ isOpen: false, eventId: null })}
                onConfirm={confirmDeleteEvent}
            />

            <ConfirmRetryModal
                isOpen={confirmRetry.isOpen}
                eventId={confirmRetry.eventId}
                onCancel={() => setConfirmRetry({ isOpen: false, eventId: null })}
                onConfirm={confirmRetryEvent}
            />

            <MaximizedTextModal
                text={maximizedText}
                onClose={() => setMaximizedText(null)}
            />
        </>
    );
};

export default LeadHistorySubmodals;
