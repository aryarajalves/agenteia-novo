import React from 'react';
import CreateSemanticCacheModal from '../Modals/CreateSemanticCacheModal';
import EditSemanticCacheModal from '../Modals/EditSemanticCacheModal';
import DeleteCacheModal from './DeleteCacheModal';

const SemanticCacheModals = ({
    createModal,
    createModalInitialData,
    agentId,
    cacheItems,
    onCloseCreateModal,
    onSaveCreate,
    onLinkVariation,
    actionLoading,
    semanticCacheThreshold,
    editModal,
    onCloseEditModal,
    onSaveEdit,
    deleteModal,
    onCloseDeleteModal,
    onConfirmDelete
}) => {
    return (
        <>
            <CreateSemanticCacheModal
                isOpen={createModal}
                initialData={createModalInitialData}
                agentId={agentId}
                existingItems={cacheItems}
                onClose={onCloseCreateModal}
                onSave={onSaveCreate}
                onLinkExisting={onLinkVariation}
                isSaving={actionLoading}
                defaultThreshold={semanticCacheThreshold}
            />

            <EditSemanticCacheModal
                isOpen={editModal.isOpen}
                item={editModal.item}
                onClose={onCloseEditModal}
                onSave={onSaveEdit}
                isSaving={actionLoading}
                defaultThreshold={semanticCacheThreshold}
            />

            <DeleteCacheModal
                isOpen={deleteModal.isOpen}
                item={deleteModal.item}
                onClose={onCloseDeleteModal}
                onConfirm={onConfirmDelete}
                isDeleting={actionLoading}
            />
        </>
    );
};

export default SemanticCacheModals;
