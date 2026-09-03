import React from 'react';
import { useTrainingModal } from './hooks/useTrainingModal';
import TrainingLoadingOverlay from './components/TrainingLoadingOverlay';
import TrainingModalHeader from './components/TrainingModalHeader';
import TrainingSetupForm from './components/TrainingSetupForm';
import TrainingCardsList from './components/TrainingCardsList';
import TrainingModalFooter from './components/TrainingModalFooter';

const TrainingModal = () => {
    const {
        isTrainingModalOpen,
        taskForTraining,
        knowledgeBases,
        selectedKbId,
        setSelectedKbId,
        numQuestions,
        setNumQuestions,
        selectedModel,
        setSelectedModel,
        models,
        isGenerating,
        isSaving,
        method,
        setMethod,
        chunkSize,
        setChunkSize,
        overlapSize,
        setOverlapSize,
        showMetadata,
        setShowMetadata,
        metaVideoName,
        setMetaVideoName,
        metaModule,
        setMetaModule,
        metaChapter,
        setMetaChapter,
        qaList,
        usedLlmModel,
        generationCostUsd,
        generationCostBrl,
        hasDuplicates,
        buildMetadataVal,
        handleGenerate,
        handleRemoveDuplicates,
        handleSave,
        handleFieldChange,
        handleRemoveCard,
        handleAddManualCard,
        handleClose
    } = useTrainingModal();

    if (!isTrainingModalOpen || !taskForTraining) return null;

    const isQaMode = method === 'qa';
    const metadataVal = buildMetadataVal();

    return (
        <div className="training-modal-overlay">
            <div className="training-modal-content" style={{ position: 'relative' }}>
                {/* Overlay de Loading Bloqueante */}
                <TrainingLoadingOverlay
                    isGenerating={isGenerating}
                    isSaving={isSaving}
                    isQaMode={isQaMode}
                />

                {/* Header */}
                <TrainingModalHeader filename={taskForTraining.filename} />

                {/* Body */}
                <div className="training-modal-body">
                    {qaList.length === 0 ? (
                        <TrainingSetupForm
                            method={method}
                            setMethod={setMethod}
                            showMetadata={showMetadata}
                            setShowMetadata={setShowMetadata}
                            metaVideoName={metaVideoName}
                            setMetaVideoName={setMetaVideoName}
                            metaModule={metaModule}
                            setMetaModule={setMetaModule}
                            metaChapter={metaChapter}
                            setMetaChapter={setMetaChapter}
                            metadataVal={metadataVal}
                            knowledgeBases={knowledgeBases}
                            selectedKbId={selectedKbId}
                            setSelectedKbId={setSelectedKbId}
                            numQuestions={numQuestions}
                            setNumQuestions={setNumQuestions}
                            selectedModel={selectedModel}
                            setSelectedModel={setSelectedModel}
                            models={models}
                            chunkSize={chunkSize}
                            setChunkSize={setChunkSize}
                            overlapSize={overlapSize}
                            setOverlapSize={setOverlapSize}
                            isGenerating={isGenerating}
                            onGenerate={handleGenerate}
                        />
                    ) : (
                        <TrainingCardsList
                            qaList={qaList}
                            isQaMode={isQaMode}
                            metaModule={metaModule}
                            metaChapter={metaChapter}
                            metadataVal={metadataVal}
                            hasDuplicates={hasDuplicates}
                            onRemoveDuplicates={handleRemoveDuplicates}
                            onAddManualCard={handleAddManualCard}
                            onFieldChange={handleFieldChange}
                            onRemoveCard={handleRemoveCard}
                        />
                    )}
                </div>

                {/* Footer */}
                <TrainingModalFooter
                    usedLlmModel={usedLlmModel}
                    generationCostBrl={generationCostBrl}
                    generationCostUsd={generationCostUsd}
                    isGenerating={isGenerating}
                    isSaving={isSaving}
                    qaListLength={qaList.length}
                    hasDuplicates={hasDuplicates}
                    onClose={handleClose}
                    onSave={handleSave}
                />
            </div>
        </div>
    );
};

export default TrainingModal;
