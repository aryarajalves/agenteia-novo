import React from 'react';
import IgnoreLeadQuestionModal from '../Modals/IgnoreLeadQuestionModal';
import {
    useSemanticCacheLeadQuestions,
    LeadQuestionsFilterBar,
    LeadQuestionsTipsBanner,
    LeadQuestionsPagination,
    LeadQuestionsList
} from './LeadQuestions';

const SemanticCacheLeadQuestionsTab = ({ agentId, onAddToCache, lastAddedQuestion = null }) => {
    const {
        questions,
        totalCount,
        noCacheCount,
        hasCacheCount,
        totalPages,
        currentPage,
        pageSize,
        loading,
        searchTerm,
        filterStatus,
        ignoreModal,
        isIgnoring,
        loadQuestions,
        handleSearchChange,
        handleClearSearch,
        handleFilterChange,
        handleOpenIgnore,
        handleCloseIgnore,
        handleConfirmIgnore,
        setCurrentPage,
        formatDate
    } = useSemanticCacheLeadQuestions({ agentId, lastAddedQuestion });

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }} data-testid="semantic-cache-lead-questions-tab">
            {/* Top Bar: Filtros e Busca */}
            <LeadQuestionsFilterBar
                filterStatus={filterStatus}
                noCacheCount={noCacheCount}
                hasCacheCount={hasCacheCount}
                searchTerm={searchTerm}
                onFilterChange={handleFilterChange}
                onSearchChange={handleSearchChange}
                onClearSearch={handleClearSearch}
                onRefresh={() => loadQuestions(currentPage, searchTerm, filterStatus)}
            />

            {/* Dica de Economia */}
            <LeadQuestionsTipsBanner />

            {/* Lista de Dúvidas */}
            <LeadQuestionsList
                loading={loading}
                questions={questions}
                searchTerm={searchTerm}
                onAddToCache={onAddToCache}
                onIgnoreQuestion={handleOpenIgnore}
                formatDate={formatDate}
            />

            {/* Paginação */}
            <LeadQuestionsPagination
                questionsCount={questions?.length}
                pageSize={pageSize}
                currentPage={currentPage}
                totalPages={totalPages}
                totalCount={totalCount}
                loading={loading}
                onPageChange={setCurrentPage}
            />

            {/* Modal de Confirmação para Ignorar Dúvida */}
            <IgnoreLeadQuestionModal
                isOpen={ignoreModal.isOpen}
                item={ignoreModal.item}
                onClose={handleCloseIgnore}
                onConfirm={handleConfirmIgnore}
                isIgnoring={isIgnoring}
            />
        </div>
    );
};

export default SemanticCacheLeadQuestionsTab;
