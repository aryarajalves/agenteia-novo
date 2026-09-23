import React from 'react';
import FullscreenTextareaModal from '../../../WebhookManager/components/FullscreenTextareaModal';
import useQuestionFunnelForm from './hooks/useQuestionFunnelForm';
import QuestionFunnelModalHeader from './components/QuestionFunnelModalHeader';
import QuestionFunnelBasicFields from './components/QuestionFunnelBasicFields';
import QuestionFunnelSettingsFields from './components/QuestionFunnelSettingsFields';
import QuestionFunnelStepsSection from './components/QuestionFunnelStepsSection';
import QuestionFunnelModalFooter from './components/QuestionFunnelModalFooter';

const QuestionFunnelModal = ({
    isOpen,
    funnel,
    onSave,
    onClose,
    loading
}) => {
    const {
        name,
        setName,
        triggerQuestion,
        setTriggerQuestion,
        variations,
        newVariation,
        setNewVariation,
        similarityThreshold,
        setSimilarityThreshold,
        frequencyMode,
        setFrequencyMode,
        steps,
        uploadingIndex,
        formError,
        fullscreenStep,
        setFullscreenStep,
        handleAddVariation,
        handleRemoveVariation,
        handleAddStep,
        handleUpdateStep,
        handleRemoveStep,
        handleMoveStep,
        handleUploadAudio,
        handleSubmit
    } = useQuestionFunnelForm({ funnel, isOpen, onSave });

    if (!isOpen) return null;

    return (
        <div 
            style={{ 
                backgroundColor: 'rgba(0, 0, 0, 0.75)', 
                backdropFilter: 'blur(5px)',
                position: 'fixed',
                top: 0, left: 0, right: 0, bottom: 0,
                zIndex: 60,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '1rem'
            }}
        >
            <div 
                style={{
                    background: '#0b132b',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    borderRadius: '16px',
                    width: '100%',
                    maxWidth: '680px',
                    maxHeight: '90vh',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
                    overflow: 'hidden'
                }}
            >
                {/* Header */}
                <QuestionFunnelModalHeader 
                    funnel={funnel} 
                    onClose={onClose} 
                />

                {/* Form Body (Scrollable) */}
                <form 
                    onSubmit={handleSubmit} 
                    style={{ padding: '1.5rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
                >
                    {formError && (
                        <div style={{ padding: '0.6rem 0.9rem', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', borderRadius: '8px', color: '#fca5a5', fontSize: '0.85rem' }}>
                            ⚠️ {formError}
                        </div>
                    )}

                    {/* Funnel Name, Trigger Question and Variations */}
                    <QuestionFunnelBasicFields
                        name={name}
                        setName={setName}
                        triggerQuestion={triggerQuestion}
                        setTriggerQuestion={setTriggerQuestion}
                        variations={variations}
                        newVariation={newVariation}
                        setNewVariation={setNewVariation}
                        onAddVariation={handleAddVariation}
                        onRemoveVariation={handleRemoveVariation}
                    />

                    {/* Sensitivity & Frequency Row */}
                    <QuestionFunnelSettingsFields
                        similarityThreshold={similarityThreshold}
                        onSimilarityChange={setSimilarityThreshold}
                        frequencyMode={frequencyMode}
                        onFrequencyChange={setFrequencyMode}
                    />

                    {/* Steps Builder */}
                    <QuestionFunnelStepsSection
                        steps={steps}
                        uploadingIndex={uploadingIndex}
                        onAddStep={handleAddStep}
                        onUpdateStep={handleUpdateStep}
                        onMoveStep={handleMoveStep}
                        onRemoveStep={handleRemoveStep}
                        onUploadAudio={handleUploadAudio}
                        onMaximize={(stepIdx, field, title) => setFullscreenStep({ idx: stepIdx, field, title })}
                    />
                </form>

                {/* Footer Actions */}
                <QuestionFunnelModalFooter
                    loading={loading}
                    funnel={funnel}
                    onClose={onClose}
                    onSubmit={handleSubmit}
                />
            </div>

            {/* Popup de Edição de Texto em Tela Cheia */}
            <FullscreenTextareaModal
                isOpen={!!fullscreenStep}
                title={fullscreenStep?.title || 'Editor de Texto'}
                subtitle="Edição expandida e confortável do texto da mensagem do funil."
                value={fullscreenStep ? (steps[fullscreenStep.idx]?.[fullscreenStep.field] || '') : ''}
                onChange={(newVal) => {
                    if (fullscreenStep) {
                        handleUpdateStep(fullscreenStep.idx, fullscreenStep.field, newVal);
                    }
                }}
                onClose={() => setFullscreenStep(null)}
                placeholder="Digite o texto aqui..."
                accentColor="#3b82f6"
            />
        </div>
    );
};

export default QuestionFunnelModal;
