import { useState } from 'react';
import { useConfig } from '../../ConfigContext';

export const useQualificationFunnelsBar = () => {
    const {
        qualificationFunnels = [],
        setQualificationFunnels,
        activeFunnelId = 'funnel_default',
        setActiveFunnelId,
        qualificationQuestions = [],
        setQualificationQuestions,
        qualificationLabels = [],
        setQualificationLabels,
        qualificationCriteria = '',
        setQualificationCriteria,
        qualificationFinalAction = '',
        setQualificationFinalAction,
        qualificationFinalActionTrigger = 'all',
        setQualificationFinalActionTrigger
    } = useConfig();

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    const funnels = qualificationFunnels && qualificationFunnels.length > 0 
        ? qualificationFunnels 
        : [{ id: 'funnel_default', name: 'Padrão / Principal', is_default: true, questions: qualificationQuestions || [] }];

    // Identificar funil atual
    const currentFunnel = funnels.find(f => f.id === activeFunnelId) || funnels[0] || {
        id: 'funnel_default',
        name: 'Padrão / Principal',
        is_default: true,
        questions: qualificationQuestions || []
    };

    const handleSelectFunnel = (targetId) => {
        if (targetId === activeFunnelId) return;

        // Salvar dados do funil que está sendo desativado
        const updatedFunnels = funnels.map(f => {
            if (f.id === activeFunnelId) {
                return {
                    ...f,
                    questions: qualificationQuestions || [],
                    labels: qualificationLabels || [],
                    criteria: qualificationCriteria || '',
                    final_action: qualificationFinalAction || '',
                    final_action_trigger: qualificationFinalActionTrigger || 'all'
                };
            }
            return f;
        });

        // Localizar novo funil selecionado
        const targetFunnel = updatedFunnels.find(f => f.id === targetId);
        if (targetFunnel) {
            setQualificationFunnels(updatedFunnels);
            setActiveFunnelId(targetId);

            // Carregar dados do novo funil
            setQualificationQuestions(targetFunnel.questions || []);
            setQualificationLabels(targetFunnel.labels || []);
            setQualificationCriteria(targetFunnel.criteria || '');
            setQualificationFinalAction(targetFunnel.final_action || '');
            setQualificationFinalActionTrigger(targetFunnel.final_action_trigger || 'all');
        }
    };

    const handleCreateFunnel = ({ id, name }) => {
        // Salvar estado atual do funil ativo
        const currentSavedFunnels = funnels.map(f => {
            if (f.id === activeFunnelId) {
                return {
                    ...f,
                    questions: qualificationQuestions || [],
                    labels: qualificationLabels || [],
                    criteria: qualificationCriteria || '',
                    final_action: qualificationFinalAction || '',
                    final_action_trigger: qualificationFinalActionTrigger || 'all'
                };
            }
            return f;
        });

        const newFunnel = {
            id,
            name,
            is_default: false,
            questions: [],
            labels: [],
            criteria: '',
            final_action: '',
            final_action_trigger: 'all'
        };

        const updated = [...currentSavedFunnels, newFunnel];
        setQualificationFunnels(updated);
        setActiveFunnelId(id);

        // Limpar os campos para o novo funil vazio
        setQualificationQuestions([]);
        setQualificationLabels([]);
        setQualificationCriteria('');
        setQualificationFinalAction('');
        setQualificationFinalActionTrigger('all');
    };

    const handleRenameFunnel = ({ name }) => {
        const updated = funnels.map(f => {
            if (f.id === currentFunnel.id) {
                return { ...f, name };
            }
            return f;
        });
        setQualificationFunnels(updated);
    };

    const handleConfirmDelete = () => {
        if (currentFunnel.is_default) return;

        const filtered = funnels.filter(f => f.id !== currentFunnel.id);
        const fallback = filtered.find(f => f.is_default) || filtered[0] || {
            id: 'funnel_default',
            name: 'Padrão / Principal',
            is_default: true,
            questions: []
        };

        setQualificationFunnels(filtered);
        setActiveFunnelId(fallback.id);

        if (fallback) {
            setQualificationQuestions(fallback.questions || []);
            setQualificationLabels(fallback.labels || []);
            setQualificationCriteria(fallback.criteria || '');
            setQualificationFinalAction(fallback.final_action || '');
            setQualificationFinalActionTrigger(fallback.final_action_trigger || 'all');
        }
        setIsDeleteModalOpen(false);
    };

    return {
        funnels,
        currentFunnel,
        activeFunnelId,
        qualificationQuestions,
        isCreateModalOpen,
        setIsCreateModalOpen,
        isRenameModalOpen,
        setIsRenameModalOpen,
        isDeleteModalOpen,
        setIsDeleteModalOpen,
        handleSelectFunnel,
        handleCreateFunnel,
        handleRenameFunnel,
        handleConfirmDelete
    };
};
