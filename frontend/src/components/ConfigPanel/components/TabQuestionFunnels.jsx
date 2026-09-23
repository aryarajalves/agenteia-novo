import React from 'react';
import { useConfig } from '../ConfigContext';
import {
    useQuestionFunnels,
    QuestionFunnelsToast,
    QuestionFunnelsHeader,
    QuestionFunnelsSearchBar,
    QuestionFunnelsList,
    QuestionFunnelsModals
} from './QuestionFunnels';

const TabQuestionFunnels = () => {
    const { id: agentId, isNew } = useConfig();
    const {
        loading,
        searchTerm,
        page,
        pageSize,
        totalItems,
        totalPages,
        activeCount,
        modalState,
        deleteModalState,
        testModalState,
        actionLoading,
        toastMessage,
        displayedFunnels,
        handleSaveFunnel,
        handleToggleActive,
        handleDeleteFunnel,
        handleSearchChange,
        handleClearSearch,
        handlePageChange,
        openCreateModal,
        openEditModal,
        closeFunnelModal,
        openDeleteModal,
        closeDeleteModal,
        openTestModal,
        closeTestModal
    } = useQuestionFunnels({ agentId, isNew });

    if (isNew) {
        return (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                <p>⚠️ Salve o agente primeiro para poder cadastrar Funis de Conversão por Dúvida.</p>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Toast Notification */}
            <QuestionFunnelsToast toastMessage={toastMessage} />

            {/* Header & Stats */}
            <QuestionFunnelsHeader 
                activeCount={activeCount}
                totalItems={totalItems}
                onNewFunnel={openCreateModal}
            />

            {/* Search Bar */}
            <QuestionFunnelsSearchBar 
                totalItems={totalItems}
                searchTerm={searchTerm}
                onSearchChange={handleSearchChange}
                onClearSearch={handleClearSearch}
            />

            {/* Funnels List */}
            <QuestionFunnelsList 
                loading={loading}
                displayedFunnels={displayedFunnels}
                searchTerm={searchTerm}
                page={page}
                totalPages={totalPages}
                totalItems={totalItems}
                pageSize={pageSize}
                onPageChange={handlePageChange}
                onToggleActive={handleToggleActive}
                onEdit={openEditModal}
                onDelete={openDeleteModal}
                onTest={openTestModal}
                onClearSearch={handleClearSearch}
                onCreateNew={openCreateModal}
            />

            {/* Modals */}
            <QuestionFunnelsModals 
                modalState={modalState}
                deleteModalState={deleteModalState}
                testModalState={testModalState}
                agentId={agentId}
                actionLoading={actionLoading}
                onSaveFunnel={handleSaveFunnel}
                onCloseFunnelModal={closeFunnelModal}
                onConfirmDelete={handleDeleteFunnel}
                onCancelDelete={closeDeleteModal}
                onCloseTestModal={closeTestModal}
            />
        </div>
    );
};

export default TabQuestionFunnels;
