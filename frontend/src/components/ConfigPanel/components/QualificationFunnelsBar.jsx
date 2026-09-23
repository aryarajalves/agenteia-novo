import React from 'react';
import CreateQualificationFunnelModal from './Modals/CreateQualificationFunnelModal';
import DeleteMessageModal from './Modals/DeleteMessageModal';
import {
    useQualificationFunnelsBar,
    FunnelsSelectControls,
    FunnelsInfoFooter
} from './QualificationFunnelsBar/index';

const QualificationFunnelsBar = () => {
    const {
        funnels,
        currentFunnel,
        activeFunnelId,
        qualificationQuestions,
        isCreateModalOpen,
        setIsCreateModalOpen,
        isRenameModalOpen,
        setIsRenameModalOpen,
        isDeleteModalOpen,
        setIsDeleteModalOpen,
        handleSelectFunnel,
        handleCreateFunnel,
        handleRenameFunnel,
        handleConfirmDelete
    } = useQualificationFunnelsBar();

    return (
        <div
            data-testid="qualification-funnels-bar"
            style={{
                marginBottom: '1.5rem',
                padding: '1.1rem 1.25rem',
                borderRadius: '12px',
                background: 'rgba(15, 23, 42, 0.7)',
                border: '1px solid rgba(99, 102, 241, 0.35)',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.45)',
                backdropFilter: 'blur(8px)'
            }}
        >
            {/* Modais */}
            <CreateQualificationFunnelModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSave={handleCreateFunnel}
                existingFunnels={funnels}
            />

            <CreateQualificationFunnelModal
                isOpen={isRenameModalOpen}
                onClose={() => setIsRenameModalOpen(false)}
                onSave={handleRenameFunnel}
                editingFunnel={currentFunnel}
                existingFunnels={funnels}
            />

            <DeleteMessageModal
                isOpen={isDeleteModalOpen}
                messageText={`o funil de qualificação "${currentFunnel.name}" (ID: ${currentFunnel.id})`}
                onConfirm={handleConfirmDelete}
                onCancel={() => setIsDeleteModalOpen(false)}
            />

            {/* Barra Superior: Dropdown + Ações */}
            <FunnelsSelectControls
                funnels={funnels}
                currentFunnel={currentFunnel}
                activeFunnelId={activeFunnelId}
                onSelectFunnel={handleSelectFunnel}
                onOpenCreate={() => setIsCreateModalOpen(true)}
                onOpenRename={() => setIsRenameModalOpen(true)}
                onOpenDelete={() => setIsDeleteModalOpen(true)}
            />

            {/* Rodapé Informativo da Barra */}
            <FunnelsInfoFooter
                currentFunnelId={currentFunnel.id}
                questionsCount={(qualificationQuestions || []).length}
            />
        </div>
    );
};

export default QualificationFunnelsBar;
