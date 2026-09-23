import React from 'react';
import QuestionFunnelStepItem from '../QuestionFunnelStepItem';

const QuestionFunnelStepsSection = ({
    steps,
    uploadingIndex,
    onAddStep,
    onUpdateStep,
    onMoveStep,
    onRemoveStep,
    onUploadAudio,
    onMaximize
}) => {
    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                <label style={{ fontSize: '0.88rem', fontWeight: 700, color: '#38bdf8' }}>
                    📋 Sequência de Passos do Disparo:
                </label>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <button
                        type="button"
                        onClick={() => onAddStep('audio')}
                        style={{ padding: '0.3rem 0.65rem', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10b981', color: '#34d399', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                    >
                        + 🎙️ Passo de Áudio
                    </button>
                    <button
                        type="button"
                        onClick={() => onAddStep('text')}
                        style={{ padding: '0.3rem 0.65rem', background: 'rgba(59, 130, 246, 0.15)', border: '1px solid #3b82f6', color: '#60a5fa', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                    >
                        + 💬 Passo de Texto
                    </button>
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {steps.map((st, idx) => (
                    <QuestionFunnelStepItem
                        key={idx}
                        step={st}
                        idx={idx}
                        stepsCount={steps.length}
                        uploadingIndex={uploadingIndex}
                        onUpdateStep={onUpdateStep}
                        onMoveStep={onMoveStep}
                        onRemoveStep={onRemoveStep}
                        onUploadAudio={onUploadAudio}
                        onMaximize={onMaximize}
                    />
                ))}
            </div>
        </div>
    );
};

export default QuestionFunnelStepsSection;
