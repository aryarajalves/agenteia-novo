import React, { useState, useEffect } from 'react';
import { api } from '../../../../api/client';
import { resolveMediaUrl } from './utils/mediaUtils';
import QuestionFunnelStepItem from './QuestionFunnelStepItem';
import FullscreenTextareaModal from '../../../WebhookManager/components/FullscreenTextareaModal';

const QuestionFunnelModal = ({
    isOpen,
    funnel,
    onSave,
    onClose,
    loading
}) => {
    const [name, setName] = useState('');
    const [triggerQuestion, setTriggerQuestion] = useState('');
    const [variations, setVariations] = useState([]);
    const [newVariation, setNewVariation] = useState('');
    const [similarityThreshold, setSimilarityThreshold] = useState(0.82);
    const [frequencyMode, setFrequencyMode] = useState('once_per_lead');
    const [isActive, setIsActive] = useState(true);
    const [steps, setSteps] = useState([
        { step_number: 1, type: 'audio', media_url: '', transcription: '', delay_seconds: 0 },
        { step_number: 2, type: 'text', content: '', delay_seconds: 3 }
    ]);
    const [uploadingIndex, setUploadingIndex] = useState(null);
    const [formError, setFormError] = useState('');
    const [fullscreenStep, setFullscreenStep] = useState(null);

    useEffect(() => {
        if (funnel) {
            setName(funnel.name || '');
            setTriggerQuestion(funnel.trigger_question || '');
            setVariations(funnel.trigger_variations || []);
            setSimilarityThreshold(funnel.similarity_threshold || 0.82);
            setFrequencyMode(funnel.frequency_mode || 'once_per_lead');
            setIsActive(funnel.is_active !== undefined ? funnel.is_active : true);
            setSteps(funnel.steps && funnel.steps.length > 0 ? funnel.steps : [
                { step_number: 1, type: 'audio', media_url: '', transcription: '', delay_seconds: 0 },
                { step_number: 2, type: 'text', content: '', delay_seconds: 3 }
            ]);
        } else {
            setName('');
            setTriggerQuestion('');
            setVariations([]);
            setNewVariation('');
            setSimilarityThreshold(0.82);
            setFrequencyMode('once_per_lead');
            setIsActive(true);
            setSteps([
                { step_number: 1, type: 'audio', media_url: '', transcription: '', delay_seconds: 0 },
                { step_number: 2, type: 'text', content: '', delay_seconds: 3 }
            ]);
        }
        setFormError('');
    }, [funnel, isOpen]);

    if (!isOpen) return null;

    const handleAddVariation = (e) => {
        if (e) e.preventDefault();
        const clean = newVariation.trim();
        if (clean && !variations.includes(clean)) {
            setVariations([...variations, clean]);
            setNewVariation('');
        }
    };

    const handleRemoveVariation = (idx) => {
        setVariations(variations.filter((_, i) => i !== idx));
    };

    const handleAddStep = (type = 'text') => {
        setSteps([
            ...steps,
            {
                step_number: steps.length + 1,
                type,
                content: '',
                media_url: '',
                transcription: '',
                delay_seconds: 3
            }
        ]);
    };

    const handleUpdateStep = (idx, field, value) => {
        const updated = [...steps];
        updated[idx] = { ...updated[idx], [field]: value };
        setSteps(updated);
    };

    const handleRemoveStep = (idx) => {
        if (steps.length <= 1) return;
        const filtered = steps.filter((_, i) => i !== idx).map((s, i) => ({ ...s, step_number: i + 1 }));
        setSteps(filtered);
    };

    const handleMoveStep = (idx, direction) => {
        const targetIdx = idx + direction;
        if (targetIdx < 0 || targetIdx >= steps.length) return;
        const reordered = [...steps];
        const [moved] = reordered.splice(idx, 1);
        reordered.splice(targetIdx, 0, moved);
        setSteps(reordered.map((s, i) => ({ ...s, step_number: i + 1 })));
    };

    const handleUploadAudio = async (idx, file) => {
        if (!file) return;
        try {
            setUploadingIndex(idx);
            const formData = new FormData();
            formData.append('file', file);
            const res = await api.post('/question-funnels/upload-media', formData);
            if (res.ok) {
                const data = await res.json();
                if (data.media_url) {
                    handleUpdateStep(idx, 'media_url', data.media_url);
                }
            } else {
                setFormError('Falha ao fazer upload do arquivo de áudio.');
            }
        } catch (err) {
            setFormError(`Erro no upload: ${err.message}`);
        } finally {
            setUploadingIndex(null);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!name.trim()) {
            setFormError('Informe um nome de identificação para o funil.');
            return;
        }
        if (!triggerQuestion.trim()) {
            setFormError('Informe a pergunta principal que ativará este funil.');
            return;
        }
        if (!steps || steps.length === 0) {
            setFormError('Adicione pelo menos um passo ao funil.');
            return;
        }

        onSave({
            name: name.trim(),
            trigger_question: triggerQuestion.trim(),
            trigger_variations: variations,
            similarity_threshold: parseFloat(similarityThreshold),
            frequency_mode: frequencyMode,
            is_active: isActive,
            steps
        });
    };

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
                <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <span style={{ fontSize: '1.4rem' }}>🎯</span>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#f8fafc', fontWeight: 700 }}>
                                {funnel ? 'Editar Funil por Dúvida' : 'Novo Funil por Dúvida'}
                            </h3>
                            <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8' }}>
                                Dispare áudio humanizado e mensagens fixas em vez de textão da IA
                            </p>
                        </div>
                    </div>
                    <button 
                        type="button" 
                        onClick={onClose}
                        style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer' }}
                    >
                        ✕
                    </button>
                </div>

                {/* Form Body (Scrollable) */}
                <form onSubmit={handleSubmit} style={{ padding: '1.5rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {formError && (
                        <div style={{ padding: '0.6rem 0.9rem', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', borderRadius: '8px', color: '#fca5a5', fontSize: '0.85rem' }}>
                            ⚠️ {formError}
                        </div>
                    )}

                    {/* Funnel Name */}
                    <div>
                        <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '0.35rem' }}>
                            Nome do Funil:
                        </label>
                        <input 
                            type="text" 
                            className="premium-input"
                            placeholder="Ex: Como Funciona o Curso (Apresentação Principal)"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            style={{ width: '100%', padding: '0.55rem 0.75rem', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#f8fafc', fontSize: '0.9rem' }}
                        />
                    </div>

                    {/* Trigger Question */}
                    <div>
                        <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '0.35rem' }}>
                            💬 Pergunta Principal que Ativa este Funil:
                        </label>
                        <input 
                            type="text" 
                            className="premium-input"
                            placeholder="Ex: como funciona o curso de vcs?"
                            value={triggerQuestion}
                            onChange={(e) => setTriggerQuestion(e.target.value)}
                            style={{ width: '100%', padding: '0.55rem 0.75rem', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#f8fafc', fontSize: '0.9rem' }}
                        />
                    </div>

                    {/* Variations */}
                    <div>
                        <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '0.35rem' }}>
                            🔄 Variações e Sinônimos da Pergunta (Opcional):
                        </label>
                        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                            <input 
                                type="text" 
                                className="premium-input"
                                placeholder="Ex: me explica como é as aulas"
                                value={newVariation}
                                onChange={(e) => setNewVariation(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddVariation(); } }}
                                style={{ flex: 1, padding: '0.45rem 0.65rem', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#f8fafc', fontSize: '0.82rem' }}
                            />
                            <button
                                type="button"
                                onClick={handleAddVariation}
                                style={{ padding: '0.45rem 0.85rem', background: 'rgba(59, 130, 246, 0.2)', border: '1px solid #3b82f6', color: '#60a5fa', borderRadius: '6px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600 }}
                            >
                                + Adicionar
                            </button>
                        </div>
                        {variations.length > 0 && (
                            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                                {variations.map((v, i) => (
                                    <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.2rem 0.55rem', background: 'rgba(51, 65, 85, 0.5)', border: '1px solid #475569', borderRadius: '6px', fontSize: '0.78rem', color: '#cbd5e1' }}>
                                        "{v}"
                                        <button type="button" onClick={() => handleRemoveVariation(i)} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '0.75rem' }}>✕</button>
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Sensitivity & Frequency Row */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        {/* Sensitivity Slider */}
                        <div style={{ padding: '0.75rem', background: 'rgba(15, 23, 42, 0.6)', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#cbd5e1' }}>🎯 Sensibilidade Semântica:</label>
                                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#60a5fa' }}>
                                    {Math.round(similarityThreshold * 100)}%
                                </span>
                            </div>
                            <input 
                                type="range" 
                                min="0.70" 
                                max="0.95" 
                                step="0.01" 
                                value={similarityThreshold}
                                onChange={(e) => setSimilarityThreshold(parseFloat(e.target.value))}
                                style={{ width: '100%', accentColor: '#3b82f6', cursor: 'pointer' }}
                            />
                            <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.2rem' }}>
                                Padrão: 82% (Ideal para reconhecer sinônimos sem falsos positivos)
                            </div>
                        </div>

                        {/* Frequency Mode */}
                        <div style={{ padding: '0.75rem', background: 'rgba(15, 23, 42, 0.6)', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '0.45rem' }}>
                                🔁 Frequência de Disparo:
                            </label>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', color: frequencyMode === 'once_per_lead' ? '#c084fc' : '#94a3b8', cursor: 'pointer' }}>
                                    <input 
                                        type="radio" 
                                        name="freq_mode" 
                                        checked={frequencyMode === 'once_per_lead'} 
                                        onChange={() => setFrequencyMode('once_per_lead')} 
                                    />
                                    <strong>👤 1x por lead</strong> (IA responde se perguntar de novo)
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', color: frequencyMode === 'always' ? '#4ade80' : '#94a3b8', cursor: 'pointer' }}>
                                    <input 
                                        type="radio" 
                                        name="freq_mode" 
                                        checked={frequencyMode === 'always'} 
                                        onChange={() => setFrequencyMode('always')} 
                                    />
                                    <strong>♾️ Sempre que o lead perguntar</strong>
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Steps Builder */}
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                            <label style={{ fontSize: '0.88rem', fontWeight: 700, color: '#38bdf8' }}>
                                📋 Sequência de Passos do Disparo:
                            </label>
                            <div style={{ display: 'flex', gap: '0.4rem' }}>
                                <button
                                    type="button"
                                    onClick={() => handleAddStep('audio')}
                                    style={{ padding: '0.3rem 0.65rem', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10b981', color: '#34d399', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                                >
                                    + 🎙️ Passo de Áudio
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleAddStep('text')}
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
                                    onUpdateStep={handleUpdateStep}
                                    onMoveStep={handleMoveStep}
                                    onRemoveStep={handleRemoveStep}
                                    onUploadAudio={handleUploadAudio}
                                    onMaximize={(stepIdx, field, title) => setFullscreenStep({ idx: stepIdx, field, title })}
                                />
                            ))}
                        </div>
                    </div>
                </form>

                {/* Footer Actions */}
                <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', background: 'rgba(15, 23, 42, 0.5)' }}>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={loading}
                        style={{ padding: '0.55rem 1.1rem', background: '#1e293b', border: '1px solid #334155', color: '#cbd5e1', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem' }}
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={loading}
                        style={{ padding: '0.55rem 1.3rem', background: '#3b82f6', border: 'none', color: '#ffffff', borderRadius: '8px', fontWeight: 600, cursor: loading ? 'wait' : 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                    >
                        {loading ? '⏳ Salvando...' : funnel ? '💾 Salvar Alterações' : '✨ Criar Funil'}
                    </button>
                </div>
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
