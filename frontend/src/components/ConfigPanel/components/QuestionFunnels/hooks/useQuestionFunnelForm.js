import { useState, useEffect } from 'react';
import { api } from '../../../../../api/client';

export const useQuestionFunnelForm = ({ funnel, isOpen, onSave }) => {
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
        if (e) e.preventDefault();
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

        setFormError('');
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

    return {
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
        isActive,
        setIsActive,
        steps,
        uploadingIndex,
        formError,
        setFormError,
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
    };
};

export default useQuestionFunnelForm;
