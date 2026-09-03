import React, { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import ConfirmModal from '../ConfirmModal';
import UnansweredQuestions from '../UnansweredQuestions/index';
import TranscriptionHistory from '../TranscriptionHistory/index';

import { useKnowledgeBases } from './hooks/useKnowledgeBases';
import KnowledgeBaseHeader from './components/KnowledgeBaseHeader';
import KnowledgeBaseFilterBar from './components/KnowledgeBaseFilterBar';
import KnowledgeBaseGrid from './components/KnowledgeBaseGrid';
import KnowledgeBasePagination from './components/KnowledgeBasePagination';
import BulkActionBar from './components/BulkActionBar';
import ImportLoadingOverlay from '../ImportLoadingOverlay';

export default function KnowledgeBaseList() {
    const [searchParams, setSearchParams] = useSearchParams();
    const activeTab = searchParams.get('tab') || 'bases';

    const {
        loading,
        isDeleting,
        isImporting,
        modalConfig,
        setModalConfig,
        filterType,
        setFilterType,
        selectedBases,
        setSelectedBases,
        isBulkDeleteConfirmOpen,
        setIsBulkDeleteConfirmOpen,
        currentPage,
        setCurrentPage,
        totalPages,
        filteredBases,
        paginatedBases,
        fetchBases,
        handleExportJSON,
        handleImportNewJSON,
        handleDeleteClick,
        handleConfirmDelete,
        toggleSelectBase,
        toggleSelectAllBases,
        handleBulkDelete
    } = useKnowledgeBases();

    const handleTabChange = (tabKey) => {
        setSearchParams({ tab: tabKey });
    };

    return (
        <div className="dashboard-container">
            <KnowledgeBaseHeader
                activeTab={activeTab}
                onImportJSON={handleImportNewJSON}
            />

            <KnowledgeBaseFilterBar
                activeTab={activeTab}
                onTabChange={handleTabChange}
                filterType={filterType}
                onFilterChange={setFilterType}
                hasBases={filteredBases.length > 0}
                isAllSelected={selectedBases.size === filteredBases.length && filteredBases.length > 0}
                onToggleSelectAll={toggleSelectAllBases}
            />

            {selectedBases.size > 0 && activeTab === 'bases' && (
                <BulkActionBar
                    selectedCount={selectedBases.size}
                    onOpenConfirm={() => setIsBulkDeleteConfirmOpen(true)}
                    onClearSelection={() => setSelectedBases(new Set())}
                />
            )}

            {activeTab === 'bases' ? (
                loading ? (
                    <div className="loading">Carregando bases...</div>
                ) : (
                    <>
                        <KnowledgeBaseGrid
                            bases={paginatedBases}
                            filterType={filterType}
                            selectedBases={selectedBases}
                            onToggleSelectBase={toggleSelectBase}
                            onExportJSON={handleExportJSON}
                            onDeleteClick={handleDeleteClick}
                        />

                        {filteredBases.length > 0 && (
                            <KnowledgeBasePagination
                                currentPage={currentPage}
                                totalPages={totalPages}
                                onPageChange={setCurrentPage}
                            />
                        )}
                    </>
                )
            ) : activeTab === 'inbox' ? (
                <UnansweredQuestions />
            ) : (
                <TranscriptionHistory onKnowledgeBaseUpdate={fetchBases} />
            )}

            <ConfirmModal
                isOpen={modalConfig.isOpen}
                title="Excluir Base"
                message={`Deseja realmente excluir a base "${modalConfig.baseName}"? Todos os agentes vinculados a ela perderão este conhecimento.`}
                onConfirm={handleConfirmDelete}
                onCancel={() => setModalConfig({ isOpen: false, baseId: null, baseName: '' })}
                confirmText="Excluir"
                cancelText="Cancelar"
                type="danger"
                isLoading={isDeleting}
            />

            <ConfirmModal
                isOpen={isBulkDeleteConfirmOpen}
                title="Excluir em Massa"
                message={`Você está prestes a excluir ${selectedBases.size} bases de conhecimento. Esta ação é irreversível e afetará todos os agentes vinculados. Deseja continuar?`}
                onConfirm={handleBulkDelete}
                onCancel={() => setIsBulkDeleteConfirmOpen(false)}
                confirmText={`Excluir ${selectedBases.size} Bases`}
                cancelText="Cancelar"
                type="danger"
                isLoading={isDeleting}
            />

            <ImportLoadingOverlay
                isOpen={isImporting}
                title="Importando Base de Conhecimento..."
                message="Processando o arquivo JSON, gerando embeddings e salvando perguntas e respostas. Aguarde um momento..."
            />
        </div>
    );
}
