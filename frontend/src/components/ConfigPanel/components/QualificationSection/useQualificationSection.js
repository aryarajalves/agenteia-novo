import { useState, useEffect } from 'react';
import { useConfig } from '../../ConfigContext';
import { api } from '../../../../api/client';

export const useQualificationSection = () => {
    const {
        id, isNew,
        qualificationQuestions, setQualificationQuestions,
        qualificationLabels, setQualificationLabels,
        qualificationCriteria, setQualificationCriteria,
        qualificationFinalAction, setQualificationFinalAction,
        qualificationFinalActionTrigger, setQualificationFinalActionTrigger,
        toolsList, selectedTools
    } = useConfig();

    const [activeSubTab, setActiveSubTab] = useState('stages');
    const [isCriteriaModalOpen, setIsCriteriaModalOpen] = useState(false);
    const [stageModal, setStageModal] = useState({ isOpen: false, stage: null, stageIndex: null });
    const [deleteQModal, setDeleteQModal] = useState({ isOpen: false, index: null, text: '' });
    const [availableLabels, setAvailableLabels] = useState([]);
    const [isLoadingLabels, setIsLoadingLabels] = useState(false);

    const isLeadQualificadoActive = toolsList.some(
        t => (selectedTools.includes(t.id) || selectedTools.includes(String(t.id)) || selectedTools.includes(Number(t.id))) && t.name === 'lead_qualificado'
    );

    useEffect(() => {
        const fetchLabels = async () => {
            if (isNew || !id) {
                setAvailableLabels([]);
                return;
            }
            setIsLoadingLabels(true);
            try {
                const res = await api.get(`/agents/${id}/chatwoot-labels`);
                if (res.ok) {
                    const data = await res.json();
                    setAvailableLabels(Array.isArray(data) ? data : []);
                }
            } catch (err) {
                console.error("Erro ao buscar labels do Chatwoot:", err);
            } finally {
                setIsLoadingLabels(false);
            }
        };

        if (isLeadQualificadoActive) {
            fetchLabels();
        }
    }, [id, isNew, isLeadQualificadoActive]);

    const handleOpenStageModal = (index, stage) => {
        setStageModal({ isOpen: true, stage, stageIndex: index });
    };

    const handleOpenNewStage = () => {
        setStageModal({ isOpen: true, stage: null, stageIndex: null });
    };

    const handleCloseStageModal = () => {
        setStageModal({ isOpen: false, stage: null, stageIndex: null });
    };

    const handleSaveStageModal = (stageData, index) => {
        if (index !== null && index !== undefined) {
            const next = [...qualificationQuestions];
            next[index] = stageData;
            setQualificationQuestions(next);
        } else {
            setQualificationQuestions([...qualificationQuestions, stageData]);
        }
    };

    const handleRemoveStageClick = (index, text) => {
        setDeleteQModal({ isOpen: true, index, text });
    };

    const confirmDeleteStage = () => {
        if (deleteQModal.index !== null) {
            setQualificationQuestions(qualificationQuestions.filter((_, i) => i !== deleteQModal.index));
            setDeleteQModal({ isOpen: false, index: null, text: '' });
        }
    };

    const handleMoveStage = (index, direction) => {
        const next = [...qualificationQuestions];
        const target = index + direction;
        if (target < 0 || target >= next.length) return;
        [next[index], next[target]] = [next[target], next[index]];
        setQualificationQuestions(next);
    };

    return {
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
    };
};

export default useQualificationSection;

