import { api } from '../../../api/client';
import { splitMessageByLinks, isUrl } from '../utils/messageUtils';
import { dispatchFunnelStepsSequentially } from '../utils/funnelStepDispatcher';

export const useChatExecution = ({
    selectedAgentId,
    challengerAgentId,
    sessionId,
    isBattleMode,
    mainModelOverride,
    challengerModelOverride,
    showHotfix,
    hotfixPrompt,
    challengerHotfixPrompt,
    contextVars,
    setMessages,
    setBattleMessages,
    setSessionStats,
    setLoading,
    setTesterSentiment,
    onMessageSent
}) => {
    const executeAgent = async (agentId, userMsg, isChallenger = false, imageUrl = null) => {
        try {
            const modelOverride = isChallenger ? challengerModelOverride : mainModelOverride;
            const promptOverride = isChallenger
                ? (challengerHotfixPrompt || null)
                : (showHotfix ? hotfixPrompt : null);

            const res = await api.post('/execute', {
                message: userMsg,
                agent_id: agentId,
                session_id: sessionId + (isChallenger ? '_challenger' : ''),
                model_override: modelOverride || null,
                system_prompt_override: promptOverride || null,
                image_url: imageUrl,
                context_variables: {
                    ...contextVars,
                    thread_id: sessionId
                }
            });

            if (!res.ok) {
                const errorText = await res.text();
                throw new Error(`Servidor respondeu ${res.status}: ${errorText}`);
            }

            const data = await res.json();
            const rawContent = data.response;
            const baseMetrics = {
                cost: data.cost_brl, tokens: data.input_tokens + data.output_tokens,
                input_tokens: data.input_tokens,
                cached_tokens: data.cached_tokens,
                output_tokens: data.output_tokens,
                model_used: data.model_used,
                model_role: data.model_role || 'main',
                response_time_ms: data.response_time_ms,
                from_semantic_cache: data.from_semantic_cache || false,
                cached_similarity: data.cached_similarity || null,
                cached_original_query: data.cached_original_query || null,
                semantic_cache: data.semantic_cache || data.debug?.semantic_cache || null
            };
            const baseDebug = data.debug;
            const baseViolations = data.debug?.violations || false;
            const isErrorMsg = !!data.error || !!data.system_error;
            const systemErrorDetail = data.system_error || null;
            const isQuestionFunnel = !!data.from_question_funnel || !!data.debug?.from_question_funnel;
            const funnelSteps = data.funnel_steps || data.debug?.funnel_steps || null;

            if (isQuestionFunnel && Array.isArray(funnelSteps) && funnelSteps.length > 0) {
                await dispatchFunnelStepsSequentially({
                    funnelSteps,
                    rawContent,
                    baseMetrics,
                    baseDebug,
                    baseViolations,
                    isErrorMsg,
                    systemErrorDetail,
                    data,
                    appendMessage: (stepMsg) => {
                        if (isChallenger) {
                            setBattleMessages(prev => [...prev, stepMsg]);
                        } else {
                            setMessages(prev => [...prev, stepMsg]);
                        }
                    },
                    setLoadingState: setLoading
                });
            } else {
                let parts = splitMessageByLinks(rawContent);
                if (parts.length === 0) parts = ["(...)"];

                const lastIsLink = isUrl(parts[parts.length - 1]);
                const metricsIndex = lastIsLink && parts.length > 1 ? parts.length - 2 : parts.length - 1;
                
                const newMsgs = parts.map((part, i) => ({
                    role: 'assistant',
                    content: part,
                    fullContent: rawContent,
                    isLink: isUrl(part),
                    isSplit: i > 0,
                    debug: i === metricsIndex ? baseDebug : undefined,
                    metrics: i === metricsIndex ? baseMetrics : null,
                    violations: i === 0 ? baseViolations : false,
                    isError: isErrorMsg,
                    systemError: i === metricsIndex ? systemErrorDetail : null,
                    model_used: i === metricsIndex ? data.model_used : null,
                    tool_calls: i === metricsIndex ? data.tool_calls : null,
                    funnel_steps: i === 0 ? funnelSteps : null,
                    from_question_funnel: i === 0 ? isQuestionFunnel : false,
                    created_at: data.timestamp || new Date().toISOString()
                }));

                if (isChallenger) {
                    setBattleMessages(prev => [...prev, ...newMsgs]);
                } else {
                    setMessages(prev => [...prev, ...newMsgs]);
                }
            }

            setSessionStats(prev => ({
                totalCost: prev.totalCost + (data.cost_brl || 0),
                responseCount: prev.responseCount + 1,
                totalTokens: prev.totalTokens + ((data.input_tokens || 0) + (data.output_tokens || 0))
            }));
        } catch (error) {
            console.error("Erro ao executar agente:", error);
            const errorMsg = {
                role: 'assistant',
                content: `❌ Erro de conexão: ${error.message}.`,
                isError: true,
                created_at: new Date().toISOString()
            };
            if (isChallenger) setBattleMessages(prev => [...prev, errorMsg]);
            else setMessages(prev => [...prev, errorMsg]);
        }
    };

    const handleSendMessageFlow = async ({
        e,
        directText,
        input,
        setInput,
        selectedImage,
        handleRemoveImage,
        uploadImage,
        stopRecordingCleanup,
        messagesRef
    }) => {
        if (e) e.preventDefault();
        const userMsg = directText || input.trim();
        const imageFile = selectedImage;
        const hasImage = !!imageFile;

        if ((!userMsg && !hasImage) || !selectedAgentId) return;
        if (!directText) setInput('');

        if (hasImage) {
            handleRemoveImage();
        }

        stopRecordingCleanup();
        setLoading(true);
        let finalImageUrl = null;

        if (hasImage) {
            try {
                finalImageUrl = await uploadImage(imageFile);
            } catch (err) {
                setLoading(false);
                return;
            }
        }

        const timestampNow = new Date().toISOString();
        const userMsgObj = { 
            role: 'user', 
            content: userMsg || (hasImage ? "Enviou uma imagem" : ""), 
            image_url: finalImageUrl,
            created_at: timestampNow 
        };
        
        setMessages(prev => [...prev, userMsgObj]);
        if (isBattleMode) setBattleMessages(prev => [...prev, userMsgObj]);

        const agentPromises = [executeAgent(selectedAgentId, userMsg, false, finalImageUrl)];
        if (isBattleMode && challengerAgentId) {
            agentPromises.push(executeAgent(challengerAgentId, userMsg, true, finalImageUrl));
        }

        // Sentiment analysis (silent)
        const currentHistory = [...messagesRef.current, userMsgObj].map(m => ({ role: m.role, content: m.content }));
        api.post('/tester/sentiment', { history: currentHistory })
            .then(res => res.json())
            .then(data => {
                if (data.sentiment !== undefined) setTesterSentiment(data.sentiment);
            })
            .catch(err => console.log("Erro silencioso na analise de sentimento:", err));

        await Promise.all(agentPromises);
        
        if (onMessageSent) {
            onMessageSent();
        }

        setLoading(false);
    };

    return {
        executeAgent,
        handleSendMessageFlow
    };
};
