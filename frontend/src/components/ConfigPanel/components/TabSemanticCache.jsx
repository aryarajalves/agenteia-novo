import React, { useState, useEffect, useCallback } from 'react';
import { useConfig } from '../ConfigContext';
import { api } from '../../../api/client';
import EditSemanticCacheModal from './Modals/EditSemanticCacheModal';
import CreateSemanticCacheModal from './Modals/CreateSemanticCacheModal';
import DeleteCacheModal from './SemanticCache/DeleteCacheModal';
import SemanticCacheResponsesTab from './SemanticCache/SemanticCacheResponsesTab';
import SemanticCacheSettingsTab from './SemanticCache/SemanticCacheSettingsTab';
import SemanticCacheLeadQuestionsTab from './SemanticCache/SemanticCacheLeadQuestionsTab';

const TabSemanticCache = () => {
    const {
        id, isNew,
        semanticCacheEnabled, setSemanticCacheEnabled,
        semanticCacheThreshold, setSemanticCacheThreshold
    } = useConfig();

    const [activeSubTab, setActiveSubTab] = useState('responses'); // 'responses' | 'lead_questions' | 'settings'
    const [cacheItems, setCacheItems] = useState([]);
    const [totalCount, setTotalCount] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize] = useState(20);

    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [availableTags, setAvailableTags] = useState([]);
    const [selectedTagFilter, setSelectedTagFilter] = useState('');
    const [lastAddedLeadQuestion, setLastAddedLeadQuestion] = useState(null);
    const [createModal, setCreateModal] = useState(false);
    const [createModalInitialData, setCreateModalInitialData] = useState(null);
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, item: null });
    const [editModal, setEditModal] = useState({ isOpen: false, item: null });
    const [actionLoading, setActionLoading] = useState(false);
    const [toastMessage, setToastMessage] = useState(null);

    const showToast = (msg, type = 'success') => {
        setToastMessage({ msg, type });
        setTimeout(() => setToastMessage(null), 3500);
    };

    const loadCacheItems = useCallback(async (page = currentPage, search = searchTerm, tagFilter = selectedTagFilter) => {
        if (isNew || !id) return;
        try {
            setLoading(true);
            const querySearch = search.trim() ? `&search=${encodeURIComponent(search.trim())}` : '';
            const queryTag = tagFilter ? `&category_tag=${encodeURIComponent(tagFilter)}` : '';
            const res = await api.get(`/semantic-cache?agent_id=${id}&page=${page}&page_size=${pageSize}${querySearch}${queryTag}`);
            if (res.ok) {
                const data = await res.json();
                if (data && Array.isArray(data.items)) {
                    setCacheItems(data.items);
                    setTotalCount(data.total || 0);
                    setTotalPages(data.total_pages || 1);
                    setCurrentPage(data.page || 1);
                } else if (Array.isArray(data)) {
                    setCacheItems(data);
                    setTotalCount(data.length);
                    setTotalPages(1);
                }
            }

            // Atualizar lista de tags/produtos disponíveis
            api.get(`/semantic-cache/tags?agent_id=${id}`)
                .then(async (r) => {
                    if (r.ok) {
                        const tData = await r.json();
                        if (Array.isArray(tData)) setAvailableTags(tData);
                    }
                })
                .catch(() => {});
        } catch (err) {
            console.error("Erro ao carregar cache semântico:", err);
        } finally {
            setLoading(false);
        }
    }, [id, isNew, currentPage, pageSize, searchTerm, selectedTagFilter]);

    useEffect(() => {
        loadCacheItems(currentPage, searchTerm, selectedTagFilter);
    }, [loadCacheItems, currentPage, searchTerm, selectedTagFilter]);

    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
        setCurrentPage(1);
    };

    const handleToggleItem = async (itemId) => {
        try {
            setActionLoading(true);
            const res = await api.patch(`/semantic-cache/${itemId}/toggle`);
            if (res.ok) {
                const updated = await res.json();
                setCacheItems(prev => prev.map(it => it.id === itemId ? updated : it));
                showToast("Status da resposta atualizado com sucesso!");
            }
        } catch (err) {
            console.error("Erro ao alternar item do cache:", err);
        } finally {
            setActionLoading(false);
        }
    };

    const handleDeleteItem = async () => {
        if (!deleteModal.item) return;
        try {
            setActionLoading(true);
            const res = await api.delete(`/semantic-cache/${deleteModal.item.id}`);
            if (res.ok) {
                setDeleteModal({ isOpen: false, item: null });
                showToast("Resposta excluída do cache com sucesso!");
                loadCacheItems(currentPage, searchTerm, selectedTagFilter);
            }
        } catch (err) {
            console.error("Erro ao excluir item do cache:", err);
        } finally {
            setActionLoading(false);
        }
    };

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

    const handleSaveCreate = async ({ user_query, approved_response, alternate_queries = [], similarity_threshold = null, category_tag = null }) => {
        try {
            setActionLoading(true);
            const initialQ = createModalInitialData?.user_query;
            const initialEventId = createModalInitialData?.event_id;
            const res = await api.post('/semantic-cache', {
                agent_id: Number(id),
                user_query,
                approved_response,
                alternate_queries,
                similarity_threshold,
                category_tag
            });
            if (res.ok) {
                handleCloseCreateModal();
                showToast("⚡ Nova resposta salva com sucesso no Cache!");
                loadCacheItems(1, searchTerm, selectedTagFilter);
                if (initialQ || initialEventId) {
                    setLastAddedLeadQuestion({
                        eventId: initialEventId,
                        userQuery: initialQ || user_query,
                        ts: Date.now()
                    });
                }
            }
        } catch (err) {
            console.error("Erro ao cadastrar resposta no cache:", err);
            showToast("Erro ao cadastrar resposta no cache.", "error");
        } finally {
            setActionLoading(false);
        }
    };

    const handleLinkVariation = async ({ cacheId, newVariation, existingAlternateQueries = [] }) => {
        try {
            setActionLoading(true);
            const initialQ = createModalInitialData?.user_query;
            const initialEventId = createModalInitialData?.event_id;
            const targetItem = cacheItems.find(it => it.id === cacheId);
            const baseAlts = existingAlternateQueries && existingAlternateQueries.length > 0
                ? existingAlternateQueries
                : (targetItem?.alternate_queries || []);

            if (!baseAlts.includes(newVariation)) {
                const updatedAlts = [...baseAlts, newVariation];
                const res = await api.put(`/semantic-cache/${cacheId}`, {
                    alternate_queries: updatedAlts
                });
                if (res.ok) {
                    handleCloseCreateModal();
                    showToast("⚡ Pergunta vinculada como nova variação com sucesso!");
                    loadCacheItems(currentPage, searchTerm, selectedTagFilter);
                    if (initialQ || initialEventId) {
                        setLastAddedLeadQuestion({
                            eventId: initialEventId,
                            userQuery: initialQ || newVariation,
                            ts: Date.now()
                        });
                    }
                }
            } else {
                handleCloseCreateModal();
                showToast("Esta variação já está vinculada a esta resposta!", "info");
            }
        } catch (err) {
            console.error("Erro ao vincular variação:", err);
            showToast("Erro ao vincular variação.", "error");
        } finally {
            setActionLoading(false);
        }
    };

    const handleSaveEdit = async ({
        id: cacheId,
        user_query,
        approved_response,
        alternate_queries,
        similarity_threshold = null,
        clear_similarity_threshold = false,
        category_tag = null,
        clear_category_tag = false
    }) => {
        try {
            setActionLoading(true);
            const res = await api.put(`/semantic-cache/${cacheId}`, {
                user_query,
                approved_response,
                alternate_queries,
                similarity_threshold,
                clear_similarity_threshold,
                category_tag,
                clear_category_tag
            });
            if (res.ok) {
                const updated = await res.json();
                setCacheItems(prev => prev.map(it => it.id === cacheId ? updated : it));
                setEditModal({ isOpen: false, item: null });
                showToast("⚡ Resposta e inteligência vetorial atualizadas no Cache!");
            }
        } catch (err) {
            console.error("Erro ao salvar edição do cache:", err);
        } finally {
            setActionLoading(false);
        }
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
            <div style={{
                display: 'flex',
                gap: '10px',
                background: 'rgba(15, 23, 42, 0.7)',
                padding: '6px',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                marginBottom: '20px'
            }}>
                <button
                    type="button"
                    data-testid="subtab-cache-responses"
                    onClick={() => setActiveSubTab('responses')}
                    style={{
                        flex: 1,
                        padding: '10px 16px',
                        borderRadius: '8px',
                        border: 'none',
                        background: activeSubTab === 'responses' ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                        color: activeSubTab === 'responses' ? '#34d399' : '#94a3b8',
                        fontWeight: 700,
                        fontSize: '0.9rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        transition: 'all 0.2s ease',
                        boxShadow: activeSubTab === 'responses' ? '0 4px 12px rgba(16, 185, 129, 0.15)' : 'none'
                    }}
                >
                    <span>📋 Respostas no Cache</span>
                    <span style={{
                        background: activeSubTab === 'responses' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255, 255, 255, 0.08)',
                        padding: '1px 8px',
                        borderRadius: '10px',
                        fontSize: '0.78rem',
                        color: activeSubTab === 'responses' ? '#fff' : '#cbd5e1'
                    }}>
                        {totalCount}
                    </span>
                </button>

                <button
                    type="button"
                    data-testid="subtab-lead-questions"
                    onClick={() => setActiveSubTab('lead_questions')}
                    style={{
                        flex: 1,
                        padding: '10px 16px',
                        borderRadius: '8px',
                        border: 'none',
                        background: activeSubTab === 'lead_questions' ? 'rgba(245, 158, 11, 0.25)' : 'transparent',
                        color: activeSubTab === 'lead_questions' ? '#fbbf24' : '#94a3b8',
                        fontWeight: 700,
                        fontSize: '0.9rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        transition: 'all 0.2s ease',
                        boxShadow: activeSubTab === 'lead_questions' ? '0 4px 12px rgba(245, 158, 11, 0.15)' : 'none'
                    }}
                >
                    <span>📥 Dúvidas dos Leads</span>
                    <span style={{
                        background: activeSubTab === 'lead_questions' ? 'rgba(245, 158, 11, 0.3)' : 'rgba(255, 255, 255, 0.08)',
                        padding: '1px 8px',
                        borderRadius: '10px',
                        fontSize: '0.78rem',
                        color: activeSubTab === 'lead_questions' ? '#fff' : '#cbd5e1'
                    }}>
                        Mineração
                    </span>
                </button>

                <button
                    type="button"
                    data-testid="subtab-cache-settings"
                    onClick={() => setActiveSubTab('settings')}
                    style={{
                        flex: 1,
                        padding: '10px 16px',
                        borderRadius: '8px',
                        border: 'none',
                        background: activeSubTab === 'settings' ? 'rgba(99, 102, 241, 0.25)' : 'transparent',
                        color: activeSubTab === 'settings' ? '#a5b4fc' : '#94a3b8',
                        fontWeight: 700,
                        fontSize: '0.9rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        transition: 'all 0.2s ease',
                        boxShadow: activeSubTab === 'settings' ? '0 4px 12px rgba(99, 102, 241, 0.15)' : 'none'
                    }}
                >
                    <span>⚙️ Configurações & Limiares</span>
                    <span style={{
                        background: semanticCacheEnabled ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                        color: semanticCacheEnabled ? '#34d399' : '#f87171',
                        padding: '1px 8px',
                        borderRadius: '10px',
                        fontSize: '0.75rem',
                        fontWeight: 700
                    }}>
                        {semanticCacheEnabled ? 'Ativo' : 'Pausado'}
                    </span>
                </button>
            </div>

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
            <CreateSemanticCacheModal
                isOpen={createModal}
                initialData={createModalInitialData}
                agentId={Number(id)}
                existingItems={cacheItems}
                onClose={handleCloseCreateModal}
                onSave={handleSaveCreate}
                onLinkExisting={handleLinkVariation}
                isSaving={actionLoading}
                defaultThreshold={semanticCacheThreshold}
            />

            <EditSemanticCacheModal
                isOpen={editModal.isOpen}
                item={editModal.item}
                onClose={() => setEditModal({ isOpen: false, item: null })}
                onSave={handleSaveEdit}
                isSaving={actionLoading}
                defaultThreshold={semanticCacheThreshold}
            />

            <DeleteCacheModal
                isOpen={deleteModal.isOpen}
                item={deleteModal.item}
                onClose={() => setDeleteModal({ isOpen: false, item: null })}
                onConfirm={handleDeleteItem}
                isDeleting={actionLoading}
            />
        </div>
    );
};

export default TabSemanticCache;
