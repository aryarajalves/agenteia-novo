import React from 'react';
import DeleteMessageModal from './Modals/DeleteMessageModal';
import LeadScoringCriteriaModal from './Modals/LeadScoringCriteriaModal';
import QualificationStageModal from './Modals/QualificationStageModal';
import QualificationFinalActionSection from './QualificationFinalActionSection';
import QualificationFunnelsBar from './QualificationFunnelsBar';
import QualificationStagesTab from './QualificationStagesTab';
import { useQualificationSection } from './QualificationSection/useQualificationSection';
import QualificationSubTabsNav from './QualificationSection/QualificationSubTabsNav';
import QualificationLabelsTab from './QualificationSection/QualificationLabelsTab';
import QualificationScoringTab from './QualificationSection/QualificationScoringTab';

const QualificationSection = () => {
    const {
        qualificationQuestions,
        qualificationLabels,
        setQualificationLabels,
        qualificationCriteria,
        setQualificationCriteria,
        qualificationFinalAction,
        setQualificationFinalAction,
        qualificationFinalActionTrigger,
        setQualificationFinalActionTrigger,
        isLeadQualificadoActive,
        activeSubTab,
        setActiveSubTab,
        isCriteriaModalOpen,
        setIsCriteriaModalOpen,
        stageModal,
        deleteQModal,
        setDeleteQModal,
        availableLabels,
        isLoadingLabels,
        handleOpenStageModal,
        handleOpenNewStage,
        handleCloseStageModal,
        handleSaveStageModal,
        handleRemoveStageClick,
        confirmDeleteStage,
        handleMoveStage
    } = useQualificationSection();

    if (!isLeadQualificadoActive) return null;

    const labelsCount = Array.isArray(qualificationLabels)
        ? qualificationLabels.length
        : (qualificationLabels ? 1 : 0);

    return (
        <div className="form-section" style={{ marginTop: '1.5rem' }}>
            <DeleteMessageModal 
                isOpen={deleteQModal.isOpen} 
                messageText={deleteQModal.text}
                descriptionText="Você tem certeza que deseja apagar esta etapa de qualificação?"
                onConfirm={confirmDeleteStage}
                onCancel={() => setDeleteQModal({ isOpen: false, index: null, text: '' })}
            />
            <LeadScoringCriteriaModal
                isOpen={isCriteriaModalOpen}
                onClose={() => setIsCriteriaModalOpen(false)}
                value={qualificationCriteria}
                onChange={(val) => setQualificationCriteria(val)}
            />
            <QualificationStageModal
                isOpen={stageModal.isOpen}
                stage={stageModal.stage}
                stageIndex={stageModal.stageIndex}
                totalStages={qualificationQuestions.length}
                onSave={handleSaveStageModal}
                onClose={handleCloseStageModal}
            />

            <QualificationFunnelsBar />

            {/* Sub-abas internas do Funil de Qualificação Ativo */}
            <QualificationSubTabsNav
                activeSubTab={activeSubTab}
                setActiveSubTab={setActiveSubTab}
                stagesCount={qualificationQuestions.length}
                labelsCount={labelsCount}
                hasFinalAction={!!qualificationFinalAction}
                hasCriteria={!!qualificationCriteria}
            />

            {/* Conteúdo da Aba 1: Etapas de Sondagem */}
            {activeSubTab === 'stages' && (
                <QualificationStagesTab
                    qualificationQuestions={qualificationQuestions}
                    onOpenNewStage={handleOpenNewStage}
                    onOpenStageModal={handleOpenStageModal}
                    onMoveStage={handleMoveStage}
                    onRemoveStageClick={handleRemoveStageClick}
                />
            )}

            {/* Conteúdo da Aba 2: Etiquetas do ZapVoice */}
            {activeSubTab === 'labels' && (
                <QualificationLabelsTab
                    qualificationLabels={qualificationLabels}
                    setQualificationLabels={setQualificationLabels}
                    availableLabels={availableLabels}
                    isLoadingLabels={isLoadingLabels}
                />
            )}

            {/* Conteúdo da Aba 3: Pergunta / Ação Final Pós-Qualificação */}
            {activeSubTab === 'final_action' && (
                <div style={{ position: 'relative', zIndex: 20 }}>
                    <QualificationFinalActionSection
                        value={qualificationFinalAction}
                        onChange={setQualificationFinalAction}
                        triggerValue={qualificationFinalActionTrigger}
                        onTriggerChange={setQualificationFinalActionTrigger}
                    />
                </div>
            )}

            {/* Conteúdo da Aba 4: Lead Scoring & Critérios */}
            {activeSubTab === 'scoring' && (
                <QualificationScoringTab
                    qualificationCriteria={qualificationCriteria}
                    setQualificationCriteria={setQualificationCriteria}
                    onOpenCriteriaModal={() => setIsCriteriaModalOpen(true)}
                />
            )}
        </div>
    );
};

export default QualificationSection;
