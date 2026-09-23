import React from 'react';
import QuestionFunnelModal from '../QuestionFunnelModal';
import DeleteQuestionFunnelModal from '../DeleteQuestionFunnelModal';
import TestFunnelModal from '../TestFunnelModal';

const QuestionFunnelsModals = ({
    modalState,
    deleteModalState,
    testModalState,
    agentId,
    actionLoading,
    onSaveFunnel,
    onCloseFunnelModal,
    onConfirmDelete,
    onCancelDelete,
    onCloseTestModal
}) => {
    return (
        <>
            <QuestionFunnelModal 
                isOpen={modalState.isOpen}
                funnel={modalState.funnel}
                onSave={onSaveFunnel}
                onClose={onCloseFunnelModal}
                loading={actionLoading}
            />

            <DeleteQuestionFunnelModal 
                isOpen={deleteModalState.isOpen}
                funnel={deleteModalState.funnel}
                onConfirm={onConfirmDelete}
                onCancel={onCancelDelete}
                loading={actionLoading}
            />

            <TestFunnelModal 
                isOpen={testModalState.isOpen}
                agentId={agentId}
                initialFunnel={testModalState.funnel}
                onClose={onCloseTestModal}
            />
        </>
    );
};

export default QuestionFunnelsModals;
