import React, { useState } from 'react';
import { useConfig } from '../ConfigContext';
import SemanticCacheNavTabs from './SemanticCache/SemanticCacheNavTabs';
import SemanticCacheModals from './SemanticCache/SemanticCacheModals';
import SemanticCacheResponsesTab from './SemanticCache/SemanticCacheResponsesTab';
import SemanticCacheSettingsTab from './SemanticCache/SemanticCacheSettingsTab';
import SemanticCacheLeadQuestionsTab from './SemanticCache/SemanticCacheLeadQuestionsTab';
import { useSemanticCacheOperations } from './SemanticCache/hooks/useSemanticCacheOperations';

const TabSemanticCache = () => {
    const {
        id, isNew,
        semanticCacheEnabled, setSemanticCacheEnabled,
        semanticCacheThreshold, setSemanticCacheThreshold
    } = useConfig();

    const [activeSubTab, setActiveSubTab] = useState('responses'); // 'responses' | 'lead_questions' | 'settings'
    const [lastAddedLeadQuestion, setLastAddedLeadQuestion] = useState(null);
    const [createModal, setCreateModal] = useState(false);
    const [createModalInitialData, setCreateModalInitialData] = useState(null);
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, item: null });
    const [editModal, setEditModal] = useState({ isOpen: false, item: null });

    const {
        cacheItems,
        totalCount,
        totalPages,
        currentPage,
        setCurrentPage,
        pageSize,
        loading,
        searchTerm,
        availableTags,
        selectedTagFilter,
        setSelectedTagFilter,
        actionLoading,
        toastMessage,
        handleSearchChange,
        handleToggleItem,
        handleDeleteItem,
        handleSaveCreate,
        handleLinkVariation,
        handleSaveEdit
    } = useSemanticCacheOperations(id, isNew);

    const handleOpenCreateNew = () => {
        setCreateModalInitialData(null);
        setCreateModal(true);
    };

    const handleOpenCreateFromQuestion = ({ event_id, user_query, approved_response }) => {
        setCreateModalInitialData({
            event_id,
            user_query,
            approved_response,
            alternate_queries: []
        });
        setCreateModal(true);
    };

    const handleCloseCreateModal = () => {
        setCreateModal(false);
        setCreateModalInitialData(null);
    };

    const onSaveCreateWrapper = (payload) => {
        const initialQ = createModalInitialData?.user_query;
        const initialEventId = createModalInitialData?.event_id;
        handleSaveCreate(payload, createModalInitialData, () => {
            handleCloseCreateModal();
            if (initialQ || initialEventId) {
                setLastAddedLeadQuestion({
                    eventId: initialEventId,
                    userQuery: initialQ || payload.user_query,
                    ts: Date.now()
                });
            }
        });
    };

    const onLinkVariationWrapper = (payload) => {
        const initialQ = createModalInitialData?.user_query;
        const initialEventId = createModalInitialData?.event_id;
        handleLinkVariation(payload, createModalInitialData, () => {
            handleCloseCreateModal();
            if (initialQ || initialEventId) {
                setLastAddedLeadQuestion({
                    eventId: initialEventId,
                    userQuery: initialQ || payload.newVariation,
                    ts: Date.now()
                });
            }
        });
    };

    return (
        <div className="tab-content semantic-cache-tab">
            {/* Toast Feedback */}
            {toastMessage && (
                <div style={{
                    position: 'fixed',
                    top: '24px',
                    right: '24px',
                    background: toastMessage.type === 'success' ? '#10b981' : '#ef4444',
                    color: '#fff',
                    padding: '12px 20px',
                    borderRadius: '8px',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                    fontWeight: 600,
                    zIndex: 100000,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                }}>
                    <span>{toastMessage.msg}</span>
                </div>
            )}

            {/* Navegação Superior por Abas Internas */}
            <SemanticCacheNavTabs
                activeSubTab={activeSubTab}
                setActiveSubTab={setActiveSubTab}
                totalCount={totalCount}
                semanticCacheEnabled={semanticCacheEnabled}
            />

            {/* Conteúdo da Aba Ativa */}
            {activeSubTab === 'responses' && (
                <SemanticCacheResponsesTab
                    cacheItems={cacheItems}
                    totalCount={totalCount}
                    totalPages={totalPages}
                    currentPage={currentPage}
                    pageSize={pageSize}
                    loading={loading}
                    searchTerm={searchTerm}
                    availableTags={availableTags}
                    selectedTagFilter={selectedTagFilter}
                    onTagFilterChange={(tag) => {
                        setSelectedTagFilter(tag);
                        setCurrentPage(1);
                    }}
                    onSearchChange={handleSearchChange}
                    onOpenCreate={handleOpenCreateNew}
                    onEdit={(it) => setEditModal({ isOpen: true, item: it })}
                    onToggle={handleToggleItem}
                    onDelete={(it) => setDeleteModal({ isOpen: true, item: it })}
                    onPageChange={setCurrentPage}
                    defaultThreshold={semanticCacheThreshold}
                />
            )}

            {activeSubTab === 'lead_questions' && (
                <SemanticCacheLeadQuestionsTab
                    agentId={Number(id)}
                    onAddToCache={handleOpenCreateFromQuestion}
                    lastAddedQuestion={lastAddedLeadQuestion}
                />
            )}

            {activeSubTab === 'settings' && (
                <SemanticCacheSettingsTab
                    semanticCacheEnabled={semanticCacheEnabled}
                    setSemanticCacheEnabled={setSemanticCacheEnabled}
                    semanticCacheThreshold={semanticCacheThreshold}
                    setSemanticCacheThreshold={setSemanticCacheThreshold}
                    totalCount={totalCount}
                />
            )}

            {/* Modais */}
            <SemanticCacheModals
                createModal={createModal}
                createModalInitialData={createModalInitialData}
                agentId={Number(id)}
                cacheItems={cacheItems}
                onCloseCreateModal={handleCloseCreateModal}
                onSaveCreate={onSaveCreateWrapper}
                onLinkVariation={onLinkVariationWrapper}
                actionLoading={actionLoading}
                semanticCacheThreshold={semanticCacheThreshold}
                editModal={editModal}
                onCloseEditModal={() => setEditModal({ isOpen: false, item: null })}
                onSaveEdit={(payload) => handleSaveEdit(payload, () => setEditModal({ isOpen: false, item: null }))}
                deleteModal={deleteModal}
                onCloseDeleteModal={() => setDeleteModal({ isOpen: false, item: null })}
                onConfirmDelete={() => handleDeleteItem(deleteModal.item, () => setDeleteModal({ isOpen: false, item: null }))}
            />
        </div>
    );
};

export default TabSemanticCache;
