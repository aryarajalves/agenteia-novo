import { useState, useRef, useEffect } from 'react';
import { api } from '../../../api/client';
import { showToast } from '../../WebhookManager/utils/helpers';

export const usePromptDraftAndPreRouter = ({
    agentId,
    value,
    activePromptTab,
    preRouterValue,
    onChangePreRouter,
    setAdvisorMessages
}) => {
    const [isSavingDraft, setIsSavingDraft] = useState(false);
    const [isLoadingPreRouterDefault, setIsLoadingPreRouterDefault] = useState(false);
    const hasAutoLoadedPreRouterDefault = useRef(false);

    const saveDraft = async (name, description) => {
        if (!agentId || agentId === 'new') return false;
        setIsSavingDraft(true);
        try {
            const res = await api.post(`/agents/${agentId}/drafts`, {
                prompt_text: value,
                version_name: name,
                description: description
            });
            if (res.ok) {
                showToast(`Rascunho "${name}" salvo com sucesso!`);
                if (setAdvisorMessages) {
                    setAdvisorMessages(prev => [...prev, { 
                        role: 'assistant', 
                        content: `💾 **Rascunho Salvo!**\n\nA versão "${name}" foi registrada com sucesso e pode ser acessada na aba "Versões".` 
                    }]);
                }
                return true;
            }
        } catch (e) {
            console.error("Erro ao salvar rascunho:", e);
            if (setAdvisorMessages) {
                setAdvisorMessages(prev => [...prev, { role: 'assistant', content: '❌ Erro ao salvar rascunho. Tente novamente.' }]);
            }
        } finally {
            setIsSavingDraft(false);
        }
        return false;
    };

    const loadPreRouterDefaultTemplate = async (silent = false) => {
        if (!onChangePreRouter) return;
        setIsLoadingPreRouterDefault(true);
        try {
            const res = await api.get('/agents/pre-router-default-prompt');
            if (res.ok) {
                const data = await res.json();
                onChangePreRouter({ target: { value: data.prompt || '' } });
                if (!silent) {
                    showToast('Prompt padrão do Pre-Router carregado. Lembre-se de salvar para aplicar.');
                }
            }
        } catch (error) {
            console.error('Erro ao carregar template padrão do Pre-Router:', error);
            if (!silent) {
                showToast('❌ Erro ao carregar o template padrão do Pre-Router.');
            }
        } finally {
            setIsLoadingPreRouterDefault(false);
        }
    };

    useEffect(() => {
        if (
            activePromptTab === 'prerouter' &&
            !preRouterValue &&
            !hasAutoLoadedPreRouterDefault.current &&
            onChangePreRouter
        ) {
            hasAutoLoadedPreRouterDefault.current = true;
            loadPreRouterDefaultTemplate(true);
        }
    }, [activePromptTab, preRouterValue, onChangePreRouter]);

    return {
        isSavingDraft,
        saveDraft,
        isLoadingPreRouterDefault,
        loadPreRouterDefaultTemplate
    };
};
