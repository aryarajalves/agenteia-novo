import { useState } from 'react';
import { api } from '../../../api/client';

export const useFeedback = ({ selectedAgentId, agents, messages, setMessages, showToast }) => {
    const [feedbackState, setFeedbackState] = useState({}); // { [msgIndex]: 'positive'|'negative'|'correcting'|'done' }
    const [correctionModal, setCorrectionModal] = useState(null); // { msg, userMsg, msgIndex }
    const [cacheConfirmModal, setCacheConfirmModal] = useState(null); // { msg, userMsg, msgIndex }
    const [correctionText, setCorrectionText] = useState('');
    const [correctionNote, setCorrectionNote] = useState('');
    const [savingFeedback, setSavingFeedback] = useState(false);

    // Encontra a pergunta real do usuário antes deste índice
    const getUserMessageBefore = (msgIndex) => {
        if (!messages || messages.length === 0) return '';
        for (let i = msgIndex - 1; i >= 0; i--) {
            if (messages[i]?.role === 'user') {
                return messages[i].content || '';
            }
        }
        return '';
    };

    // Obtém a resposta completa do assistente mesmo se tiver sido dividida em múltiplos balões/links
    const getFullAssistantResponse = (msg, msgIndex) => {
        if (msg?.fullContent) return msg.fullContent;
        if (!messages || messages.length === 0) return msg?.content || '';

        let startIndex = msgIndex;
        while (startIndex > 0 && messages[startIndex - 1]?.role === 'assistant') {
            startIndex--;
        }
        let endIndex = msgIndex;
        while (endIndex < messages.length - 1 && messages[endIndex + 1]?.role === 'assistant') {
            endIndex++;
        }

        const parts = [];
        for (let i = startIndex; i <= endIndex; i++) {
            if (messages[i]?.content) {
                parts.push(messages[i].content);
            }
        }
        return parts.join('\n\n') || msg?.content || '';
    };

    const sendFeedback = async ({ msg, userMsg, rating, correctedResponse, note }) => {
        const agent = agents?.find(a => String(a.id) === String(selectedAgentId));
        const agentSlug = agent?.slug || `agent-${selectedAgentId}`;
        const feedbackUrl = `/api/chat/feedback`;

        try {
            await api.post(feedbackUrl, {
                agent_id: Number(selectedAgentId),
                agent_slug: agentSlug,
                user_message: userMsg || '',
                agent_response: msg.content || '',
                rating,
                corrected_response: correctedResponse || null,
                correction_note: note || null,
                model_used: msg.model_used || null,
                usage: msg.usage || null,
                created_at: new Date().toISOString()
            });
        } catch (err) {
            console.error('[Feedback] Erro ao enviar:', err);
        }
    };

    const handleThumbsUp = (msg, msgIndex) => {
        if (feedbackState[msgIndex]) return;
        const userMsg = getUserMessageBefore(msgIndex);
        const fullAssistantMsg = getFullAssistantResponse(msg, msgIndex);
        
        // Abre o popup de confirmação permitindo criar nova resposta ou vincular a uma existente
        setCacheConfirmModal({
            msg: { ...msg, content: fullAssistantMsg },
            userMsg,
            msgIndex
        });
    };

    const confirmSaveToCache = async (customQuery, customResponse, customAlternateQueries = [], customSimilarityThreshold = null, customCategoryTag = null) => {
        if (!cacheConfirmModal) return;
        const { msg, userMsg, msgIndex } = cacheConfirmModal;
        const finalQuery = customQuery !== undefined && customQuery !== null ? customQuery : userMsg;
        const finalResponse = customResponse !== undefined && customResponse !== null ? customResponse : msg.content;
        const finalAlternate = Array.isArray(customAlternateQueries) ? customAlternateQueries : [];

        setSavingFeedback(true);
        try {
            setFeedbackState(prev => ({ ...prev, [msgIndex]: 'positive' }));
            await sendFeedback({ msg, userMsg: finalQuery, rating: 'positive', correctedResponse: finalResponse });

            if (finalQuery && finalResponse && selectedAgentId) {
                await api.post('/semantic-cache', {
                    agent_id: Number(selectedAgentId),
                    user_query: finalQuery,
                    approved_response: finalResponse,
                    alternate_queries: finalAlternate,
                    similarity_threshold: customSimilarityThreshold,
                    category_tag: customCategoryTag
                });
                if (showToast) {
                    showToast("⚡ Resposta salva com sucesso no Cache Semântico!", "success");
                }
            }
        } catch (err) {
            console.error("Erro ao salvar no cache semântico:", err);
            if (showToast) {
                showToast("Erro ao salvar resposta no cache.", "error");
            }
        } finally {
            setSavingFeedback(false);
            setCacheConfirmModal(null);
        }
    };

    const linkToExistingCache = async ({ cacheId, newVariation, existingAlternateQueries = [] }) => {
        if (!cacheId || !newVariation?.trim()) return;
        setSavingFeedback(true);
        try {
            if (cacheConfirmModal) {
                setFeedbackState(prev => ({ ...prev, [cacheConfirmModal.msgIndex]: 'positive' }));
                await sendFeedback({
                    msg: cacheConfirmModal.msg,
                    userMsg: newVariation.trim(),
                    rating: 'positive',
                    correctedResponse: null
                });
            }

            const cleanVar = newVariation.trim();
            const updatedAlt = existingAlternateQueries.includes(cleanVar) 
                ? existingAlternateQueries 
                : [...existingAlternateQueries, cleanVar];

            await api.put(`/semantic-cache/${cacheId}`, {
                alternate_queries: updatedAlt
            });

            if (showToast) {
                showToast("⚡ Pergunta vinculada com sucesso à resposta existente no Cache!", "success");
            }
        } catch (err) {
            console.error("Erro ao vincular pergunta ao cache existente:", err);
            if (showToast) {
                showToast("Erro ao vincular pergunta ao cache.", "error");
            }
        } finally {
            setSavingFeedback(false);
            setCacheConfirmModal(null);
        }
    };

    const cancelSaveToCache = () => {
        setCacheConfirmModal(null);
    };

    const handleThumbsDown = (msg, msgIndex) => {
        if (feedbackState[msgIndex]) return;
        const userMsg = getUserMessageBefore(msgIndex);
        const fullAssistantMsg = getFullAssistantResponse(msg, msgIndex);
        setFeedbackState(prev => ({ ...prev, [msgIndex]: 'correcting' }));
        setCorrectionModal({
            msg: { ...msg, content: fullAssistantMsg },
            userMsg,
            msgIndex
        });
        setCorrectionText('');
        setCorrectionNote('');
    };

    const saveCorrection = async () => {
        if (!correctionModal) return;
        const { msg, userMsg, msgIndex } = correctionModal;
        setSavingFeedback(true);
        try {
            await sendFeedback({
                msg,
                userMsg,
                rating: 'negative',
                correctedResponse: correctionText,
                note: correctionNote
            });
            setFeedbackState(prev => ({ ...prev, [msgIndex]: 'negative' }));
        } finally {
            setCorrectionModal(null);
            setSavingFeedback(false);
        }
    };

    return {
        feedbackState,
        setFeedbackState,
        correctionModal,
        setCorrectionModal,
        cacheConfirmModal,
        setCacheConfirmModal,
        confirmSaveToCache,
        linkToExistingCache,
        cancelSaveToCache,
        correctionText,
        setCorrectionText,
        correctionNote,
        setCorrectionNote,
        savingFeedback,
        handleThumbsUp,
        handleThumbsDown,
        saveCorrection,
        readFbFromStorage: () => null
    };
};
