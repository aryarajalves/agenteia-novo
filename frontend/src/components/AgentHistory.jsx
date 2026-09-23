import React from 'react';
import ConfirmModal from './ConfirmModal';
import AnalysisModal from './AnalysisModal';
import { useAgentHistory } from './AgentHistory/useAgentHistory';
import AgentHistoryHeader from './AgentHistory/AgentHistoryHeader';
import SessionCard from './AgentHistory/SessionCard';

const AgentHistory = ({ agentId }) => {
    const {
        history,
        loading,
        sortedSessions,
        expandedSessions,
        toggleSession,
        summaries,
        loadingSummary,
        handleSummarize,
        selectedSessions,
        toggleSelection,
        handleSelectAll,
        showDeleteModal,
        setShowDeleteModal,
        isDeleting,
        handleConfirmDelete,
        analysisData,
        setAnalysisData,
        extractBatchQuestions
    } = useAgentHistory(agentId);

    if (loading) {
        return <div style={{ color: 'var(--text-secondary)', padding: '2rem' }}>Carregando histórico...</div>;
    }
    if (!agentId || agentId === 'new') {
        return <div style={{ color: 'var(--text-secondary)', padding: '2rem', textAlign: 'center' }}>Salve o agente primeiro para começar a registrar o histórico.</div>;
    }
    if (history.length === 0) {
        return <div style={{ color: 'var(--text-secondary)', padding: '2rem', textAlign: 'center' }}>Nenhuma interação registrada para este agente ainda.</div>;
    }

    return (
        <div className="history-list" style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            <AgentHistoryHeader
                selectedSessions={selectedSessions}
                sortedSessions={sortedSessions}
                handleSelectAll={handleSelectAll}
                extractBatchQuestions={extractBatchQuestions}
                onOpenDeleteModal={() => setShowDeleteModal(true)}
            />

            {sortedSessions.map((session) => (
                <SessionCard
                    key={session.id}
                    session={session}
                    isExpanded={!!expandedSessions[session.id]}
                    onToggleExpand={() => toggleSession(session.id)}
                    isSelected={selectedSessions.has(session.id)}
                    onToggleSelect={(e) => toggleSelection(e, session.id)}
                    summary={summaries[session.id]}
                    isLoadingSummary={!!loadingSummary[session.id]}
                    onSummarize={() => handleSummarize(session.id)}
                />
            ))}

            {/* Modal de Confirmação de Exclusão */}
            <ConfirmModal
                isOpen={showDeleteModal}
                title="Excluir Sessões"
                message={`Tem certeza que deseja excluir ${selectedSessions.size} sessões selecionadas? Esta ação não pode ser desfeita.`}
                onConfirm={handleConfirmDelete}
                onCancel={() => setShowDeleteModal(false)}
                confirmText={isDeleting ? "Excluindo..." : "Excluir"}
                cancelText="Cancelar"
                type="danger"
            />

            <AnalysisModal
                isOpen={!!analysisData}
                onClose={() => setAnalysisData(null)}
                analysisData={analysisData}
                agentId={agentId}
            />
        </div>
    );
};

export default AgentHistory;

