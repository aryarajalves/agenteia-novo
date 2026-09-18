import { useState, useRef, useEffect, useCallback } from 'react';
import { api } from '../../../api/client';
import { splitMessageByLinks, isUrl } from '../utils/messageUtils';
import { dispatchFunnelStepsSequentially } from '../utils/funnelStepDispatcher';
import { useChatVoice } from './useChatVoice';

export const useChat = ({
    selectedAgentId, sessionId, setSessionId, challengerAgentId, isBattleMode,
    mainModelOverride, challengerModelOverride, showHotfix, hotfixPrompt,
    challengerHotfixPrompt, contextVars, showToast, setTesterSentiment,
    setHasTesterReport, setTesterReport, onMessageSent
}) => {
    const [messages, setMessages] = useState([]);
    const [battleMessages, setBattleMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [sessionStats, setSessionStats] = useState({ totalCost: 0, responseCount: 0, totalTokens: 0 });
    const [analysisData, setAnalysisData] = useState(null); // { type, content, loading }
    
    const [selectedImage, setSelectedImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const scrollRef = useRef(null);
    const battleScrollRef = useRef(null);
    const messagesRef = useRef(messages);
    const fileInputRef = useRef(null);
    const isViewMode = false;

    // Hook auxiliar de gravação de voz extraído para modularização
    const {
        isRecording,
        setIsRecording,
        handleVoiceRecord,
        stopRecordingCleanup,
        mediaRecorderRef,
        speechRecognitionRef,
        audioChunksRef
    } = useChatVoice({
        setInput,
        showToast,
        setLoading,
        onSendMessage: (e, text) => handleSendMessage(e, text)
    });

    useEffect(() => {
        messagesRef.current = messages;
        if (scrollRef.current) {
            setTimeout(() => {
                if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
            }, 50);
        }
    }, [messages]);

    const handleReset = useCallback(() => {
        const newSession = Math.random().toString(36).substring(7);
        setSessionId(newSession);
        setMessages([]);
        setBattleMessages([]);
        setSessionStats({ totalCost: 0, responseCount: 0, totalTokens: 0 });
        setHasTesterReport(false);
        setTesterReport(null);
        if (selectedAgentId) localStorage.removeItem(`lastSession_agent_${selectedAgentId}`);
        showToast("Sessão resetada com sucesso!", "success");
    }, [selectedAgentId, setSessionId, setHasTesterReport, setTesterReport, showToast]);

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

            // Se for resposta gerada por um Funil de Dúvida com passos sequenciais:
            // Despacha cada passo sequencialmente respeitando o delay configurado pelo usuário!
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
                // Fluxo padrão para mensagens normais ou de IA pura
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

    const handleSendMessage = async (e, directText = null) => {
        if (e) e.preventDefault();
        const userMsg = directText || input.trim();
        const imageFile = selectedImage;
        const hasImage = !!imageFile;

        if ((!userMsg && !hasImage) || !selectedAgentId || loading) return;
        if (!directText) setInput('');

        if (hasImage) {
            setSelectedImage(null);
            setImagePreview(null);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }

        stopRecordingCleanup();

        setLoading(true);
        let finalImageUrl = null;

        if (hasImage) {
            setIsUploading(true);
            try {
                const formData = new FormData();
                formData.append('file', imageFile);
                const uploadRes = await api.upload('/upload-image', formData);
                if (!uploadRes.ok) throw new Error("Falha no upload");
                const uploadData = await uploadRes.json();
                finalImageUrl = uploadData.image_url;
            } catch (err) {
                showToast(`Falha no upload: ${err.message}`, "error");
                setLoading(false);
                setIsUploading(false);
                return;
            } finally {
                setIsUploading(false);
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
            .catch(e => console.log("Erro silencioso na analise de sentimento:", e));

        await Promise.all(agentPromises);
        
        if (onMessageSent) {
            onMessageSent();
        }

        setLoading(false);
    };

    const loadSession = async (sessId) => {
        setLoading(true);
        setHasTesterReport(false);
        setTesterReport(null);
        try {
            const res = await api.get(`/sessions/${sessId}/messages`);
            const data = await res.json();

            let lastUserMsg = '';
            const historyMsgs = data.map(m => {
                if (m.role === 'user') {
                    lastUserMsg = m.content;
                }
                const isAssistant = m.role === 'assistant';
                const isFromCache = m.from_semantic_cache || m.model === 'semantic-cache' || !!m.debug?.from_semantic_cache;
                const isFunnel = m.from_question_funnel || m.model === 'question-funnel' || !!m.debug?.from_question_funnel;

                return {
                    role: m.role,
                    content: m.content,
                    userMessage: isAssistant ? lastUserMsg : undefined,
                    model_used: m.model,
                    image_url: m.debug?.image_url,
                    from_semantic_cache: isFromCache,
                    from_question_funnel: isFunnel,
                    funnel_steps: m.debug?.funnel_steps || null,
                    cached_similarity: m.cached_similarity,
                    cached_original_query: m.cached_original_query,
                    created_at: m.timestamp || new Date().toISOString(),
                    metrics: isAssistant ? {
                        cost: m.cost || 0,
                        tokens: m.tokens || 0,
                        input_tokens: m.input_tokens || 0,
                        cached_tokens: m.cached_tokens || 0,
                        output_tokens: m.output_tokens || 0,
                        model_used: m.model,
                        from_semantic_cache: isFromCache,
                        from_question_funnel: isFunnel,
                        cached_similarity: m.cached_similarity,
                        cached_original_query: m.cached_original_query,
                        response_time_ms: m.debug?.response_time_ms || 0
                    } : null,
                    debug: m.debug,
                    tool_calls: m.debug?.tool_calls
                };
            });

            setMessages(historyMsgs);
            const totalCost = historyMsgs.reduce((acc, m) => acc + (m.metrics?.cost || 0), 0);
            const totalTokens = historyMsgs.reduce((acc, m) => acc + (m.metrics?.tokens || 0), 0);
            setSessionStats({
                totalCost,
                totalTokens,
                responseCount: historyMsgs.filter(m => m.role === 'assistant').length
            });
            showToast("Sessão carregada com sucesso!", "success");
        } catch (err) {
            console.error("Erro ao carregar sessão:", err);
            showToast("Erro ao carregar histórico da sessão.", "error");
        } finally {
            setLoading(false);
        }
    };

    const fetchSummary = async () => {
        if (!sessionId) return;
        setAnalysisData({ type: 'summary', loading: true });
        try {
            const res = await api.get(`/sessions/${sessionId}/summarize`);
            const data = await res.json();
            setAnalysisData({ type: 'summary', content: data.summary, loading: false });
        } catch (e) {
            setAnalysisData({ type: 'error', content: "Erro ao gerar resumo.", loading: false });
        }
    };

    const handleImageSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            setSelectedImage(file);
            const reader = new FileReader();
            reader.onloadend = () => setImagePreview(reader.result);
            reader.readAsDataURL(file);
        }
    };

    const handleRemoveImage = () => {
        setSelectedImage(null);
        setImagePreview(null);
    };

    const fetchQuestions = async () => {
        if (!sessionId) return;
        setAnalysisData({ type: 'questions', loading: true });
        try {
            const res = await api.get(`/sessions/${sessionId}/questions`);
            const data = await res.json();
            setAnalysisData({ type: 'questions', content: data.questions, loading: false });
        } catch (e) {
            setAnalysisData({ type: 'error', content: "Erro ao extrair perguntas.", loading: false });
        }
    };

    return {
        messages, setMessages,
        battleMessages, setBattleMessages,
        messagesRef,
        input, setInput,
        loading, setLoading,
        isRecording, setIsRecording,
        sessionStats, setSessionStats,
        analysisData, setAnalysisData,
        selectedImage, setSelectedImage,
        imagePreview, setImagePreview,
        isUploading, setIsUploading,
        handleSendMessage,
        handleReset,
        loadSession,
        fetchSummary,
        fetchQuestions,
        scrollRef,
        battleScrollRef,
        fileInputRef,
        isViewMode,
        handleImageSelect,
        handleRemoveImage,
        handleVoiceRecord
    };
};
