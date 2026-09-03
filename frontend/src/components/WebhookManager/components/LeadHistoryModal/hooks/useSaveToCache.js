import { useState } from 'react';
import { api } from '../../../../../api/client';
import { showToast } from '../../../utils/helpers';

export const useSaveToCache = (webhook) => {
    const [approveCacheModal, setApproveCacheModal] = useState(null);
    const [isSavingCache, setIsSavingCache] = useState(false);

    const handleOpenSaveCache = (event) => {
        const isFollowUp = Boolean(
            event.event_type === 'followup' || 
            event.is_followup || 
            (typeof event.mensagem === 'string' && event.mensagem.toLowerCase().includes('follow-up')) ||
            (typeof event.message_type === 'string' && event.message_type.toLowerCase() === 'followup')
        );
        if (isFollowUp) {
            showToast('Mensagens de Follow-Up não podem ser salvas no Cache Semântico.', 'warning');
            return;
        }

        const userMsg = event.mensagem || event.conteudo || '';
        const agentResp = event.agent_response || (event.dono === 'agente' || event.dono === 'bot' ? (event.conteudo || event.mensagem) : '');
        const agentId = webhook?.agent_id || webhook?.agente_id || event.agent_id;

        setApproveCacheModal({
            userMsg,
            msg: { content: agentResp },
            agentId
        });
    };

    const handleConfirmSaveCache = async (query, response, alternateQueries, similarityThreshold = null) => {
        const agentId = approveCacheModal?.agentId;
        if (!agentId) {
            showToast('ID do agente não identificado para este webhook.', 'error');
            return;
        }
        try {
            setIsSavingCache(true);
            const res = await api.post('/semantic-cache', {
                agent_id: Number(agentId),
                user_query: query,
                approved_response: response,
                alternate_queries: alternateQueries || [],
                similarity_threshold: similarityThreshold
            });
            if (res.ok) {
                showToast('⚡ Resposta salva no Cache Semântico com sucesso!', 'success');
                setApproveCacheModal(null);
            } else {
                const errData = await res.json().catch(() => ({}));
                showToast(errData.detail || 'Erro ao salvar no cache.', 'error');
            }
        } catch (e) {
            console.error('Erro ao salvar no cache semântico:', e);
            showToast('Erro ao salvar no cache.', 'error');
        } finally {
            setIsSavingCache(false);
        }
    };

    const handleLinkExistingCache = async ({ cacheId, newVariation, existingAlternateQueries }) => {
        try {
            setIsSavingCache(true);
            const updatedAlt = [...new Set([...(existingAlternateQueries || []), newVariation])];
            const res = await api.put(`/semantic-cache/${cacheId}`, {
                alternate_queries: updatedAlt
            });
            if (res.ok) {
                showToast('⚡ Nova variação vinculada à resposta do Cache!', 'success');
                setApproveCacheModal(null);
            } else {
                const errData = await res.json().catch(() => ({}));
                showToast(errData.detail || 'Erro ao vincular ao cache.', 'error');
            }
        } catch (e) {
            console.error('Erro ao vincular ao cache semântico:', e);
            showToast('Erro ao vincular ao cache.', 'error');
        } finally {
            setIsSavingCache(false);
        }
    };

    return {
        approveCacheModal,
        setApproveCacheModal,
        isSavingCache,
        handleOpenSaveCache,
        handleConfirmSaveCache,
        handleLinkExistingCache
    };
};
