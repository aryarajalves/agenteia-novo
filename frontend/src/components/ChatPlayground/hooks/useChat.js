import { useState, useRef, useEffect, useCallback } from 'react';
import { api } from '../../../api/client';
import { splitMessageByLinks, isUrl } from '../utils/messageUtils';

export const useChat = ({
    selectedAgentId,
    sessionId,
    setSessionId,
    challengerAgentId,
    isBattleMode,
    mainModelOverride,
    challengerModelOverride,
    showHotfix,
    hotfixPrompt,
    showChallengerHotfix,
    challengerHotfixPrompt,
    contextVars,
    showToast,
    setTesterSentiment,
    setHasTesterReport,
    setTesterReport,
    onMessageSent
}) => {
    const [messages, setMessages] = useState([]);
    const [battleMessages, setBattleMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [sessionStats, setSessionStats] = useState({ totalCost: 0, responseCount: 0, totalTokens: 0 });
    const [analysisData, setAnalysisData] = useState(null); // { type, content, loading }
    
    const [selectedImage, setSelectedImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    
    const scrollRef = useRef(null);
    const battleScrollRef = useRef(null);
    const messagesRef = useRef(messages);
    const fileInputRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const speechRecognitionRef = useRef(null);
    const audioChunksRef = useRef([]);
    const isViewMode = false;
    useEffect(() => {
        messagesRef.current = messages;
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
                ? (showChallengerHotfix ? challengerHotfixPrompt : null)
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
                cost: data.cost_brl,
                tokens: data.input_tokens + data.output_tokens,
                input_tokens: data.input_tokens,
                cached_tokens: data.cached_tokens,
                output_tokens: data.output_tokens,
                model_used: data.model_used,
                model_role: data.model_role || 'main',
                response_time_ms: data.response_time_ms
            };
            const baseDebug = data.debug;
            const baseViolations = data.debug?.violations || false;

            let parts = splitMessageByLinks(rawContent);
            if (parts.length === 0) parts = ["(...)"];

            const lastIsLink = isUrl(parts[parts.length - 1]);
            const metricsIndex = lastIsLink && parts.length > 1 ? parts.length - 2 : parts.length - 1;
            
            const isErrorMsg = !!data.error || !!data.system_error;
            const systemErrorDetail = data.system_error || null;
            
            const newMsgs = parts.map((part, i) => ({
                role: 'assistant',
                content: part,
                isLink: isUrl(part),
                isSplit: i > 0,
                debug: i === metricsIndex ? baseDebug : undefined,
                metrics: i === metricsIndex ? baseMetrics : null,
                violations: i === 0 ? baseViolations : false,
                isError: isErrorMsg,
                systemError: i === metricsIndex ? systemErrorDetail : null,
                model_used: i === metricsIndex ? data.model_used : null,
                tool_calls: i === metricsIndex ? data.tool_calls : null,
                created_at: data.timestamp || new Date().toISOString()
            }));

            if (isChallenger) {
                setBattleMessages(prev => [...prev, ...newMsgs]);
            } else {
                setMessages(prev => [...prev, ...newMsgs]);
            }

            setSessionStats(prev => ({
                totalCost: prev.totalCost + data.cost_brl,
                responseCount: prev.responseCount + 1,
                totalTokens: prev.totalTokens + (data.input_tokens + data.output_tokens)
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

        // Limpa o preview e seleção da imagem local imediatamente ao iniciar o envio
        if (hasImage) {
            setSelectedImage(null);
            setImagePreview(null);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }

        // Se estiver gravando áudio, para a gravação na mesma hora e desativa handlers para evitar transcrição dupla
        if (isRecording) {
            if (mediaRecorderRef.current) {
                const stream = mediaRecorderRef.current.stream;
                if (stream) {
                    stream.getTracks().forEach(track => track.stop());
                }
                mediaRecorderRef.current.onstop = null;
                if (mediaRecorderRef.current.state !== 'inactive') {
                    mediaRecorderRef.current.stop();
                }
            }
            if (speechRecognitionRef.current) {
                speechRecognitionRef.current.stop();
                speechRecognitionRef.current = null;
            }
            setIsRecording(false);
        }

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

        // Sentiment analysis (silent) - Rodar em paralelo sem bloquear o loading visual
        const currentHistory = [...messagesRef.current, userMsgObj].map(m => ({ role: m.role, content: m.content }));
        api.post('/tester/sentiment', { history: currentHistory })
            .then(res => res.json())
            .then(data => {
                if (data.sentiment !== undefined) setTesterSentiment(data.sentiment);
            })
            .catch(e => console.log("Erro silencioso na analise de sentimento:", e));

        await Promise.all(agentPromises);
        
        // Atualiza histórico lateral se houver callback
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

            const historyMsgs = data.map(m => ({
                role: m.role,
                content: m.content,
                model_used: m.model,
                image_url: m.debug?.image_url,
                metrics: m.cost > 0 || m.tokens > 0 ? {
                    cost: m.cost,
                    tokens: m.tokens,
                    input_tokens: m.input_tokens,
                    cached_tokens: m.cached_tokens,
                    output_tokens: m.output_tokens
                } : null,
                debug: m.debug,
                created_at: m.timestamp || new Date().toISOString()
            }));

            const totalCostSum = data.reduce((sum, msg) => sum + (msg.cost || 0), 0);
            const totalTokensSum = data.reduce((sum, msg) => sum + (msg.tokens || 0), 0);

            setSessionId(sessId);
            setMessages(historyMsgs);
            setSessionStats({ totalCost: totalCostSum, responseCount: historyMsgs.length, totalTokens: totalTokensSum });

            if (historyMsgs.length > 0) {
                const currentHistoryForSentiment = historyMsgs.map(m => ({ role: m.role, content: m.content }));
                api.post('/tester/sentiment', { history: currentHistoryForSentiment })
                    .then(res => res.json())
                    .then(stData => {
                        if (stData.sentiment !== undefined) setTesterSentiment(stData.sentiment);
                    })
                    .catch(e => console.log("Erro ao carregar sentimento:", e));
            }

            api.get(`/sessions/${sessId}/test-report`)
                .then(res => res.json())
                .then(data => {
                    if (data && !data.error) setHasTesterReport(true);
                    else setHasTesterReport(false);
                })
                .catch(() => setHasTesterReport(false));

        } catch (e) {
            console.error("Erro ao carregar sessão", e);
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

    const handleVoiceRecord = async () => {
        if (isRecording) {
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                mediaRecorderRef.current.stop();
            }
            if (speechRecognitionRef.current) {
                speechRecognitionRef.current.stop();
                speechRecognitionRef.current = null;
            }
            setIsRecording(false);
        } else {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                audioChunksRef.current = [];
                
                let mimeType = 'audio/webm';
                if (!MediaRecorder.isTypeSupported(mimeType)) {
                     mimeType = 'audio/ogg';
                }
                if (!MediaRecorder.isTypeSupported(mimeType)) {
                     mimeType = 'audio/mp4';
                }
                if (!MediaRecorder.isTypeSupported(mimeType)) {
                     mimeType = '';
                }

                const options = mimeType ? { mimeType } : {};
                const mediaRecorder = new MediaRecorder(stream, options);
                mediaRecorderRef.current = mediaRecorder;

                mediaRecorder.ondataavailable = (event) => {
                    if (event.data && event.data.size > 0) {
                        audioChunksRef.current.push(event.data);
                    }
                };

                mediaRecorder.onstop = async () => {
                    stream.getTracks().forEach(track => track.stop());

                    const audioBlob = new Blob(audioChunksRef.current, { type: mimeType || 'audio/webm' });
                    audioChunksRef.current = [];

                    if (audioBlob.size < 1000) {
                        showToast("Áudio muito curto para ser processado.", "warning");
                        return;
                    }

                    setLoading(true);
                    showToast("Transcrevendo áudio...", "info");

                    try {
                        const formData = new FormData();
                        const fileExtension = mimeType.includes('webm') ? 'webm' : (mimeType.includes('ogg') ? 'ogg' : (mimeType.includes('mp4') ? 'mp4' : 'webm'));
                        formData.append('file', audioBlob, `recording.${fileExtension}`);

                        const response = await api.upload('/transcribe-audio', formData);
                        if (!response.ok) {
                            const errText = await response.text();
                            throw new Error(`Erro ${response.status}: ${errText}`);
                        }

                        const data = await response.json();
                        if (data.text && data.text.trim()) {
                            showToast("Áudio transcrito com sucesso!", "success");
                            setInput('');
                            await handleSendMessage(null, data.text);
                        } else {
                            showToast("Nenhuma fala detectada no áudio.", "warning");
                            setLoading(false);
                        }
                    } catch (err) {
                        console.error("Erro ao transcrever áudio:", err);
                        showToast(`Falha ao transcrever áudio: ${err.message}`, "error");
                        setLoading(false);
                    }
                };

                // Configura e inicia a transcrição em tempo real via Web Speech API
                setInput('');
                const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
                if (SpeechRecognition) {
                    const recognition = new SpeechRecognition();
                    recognition.continuous = true;
                    recognition.interimResults = true;
                    recognition.lang = 'pt-BR';

                    recognition.onresult = (event) => {
                        let interimTranscript = '';
                        let finalTranscript = '';

                        for (let i = event.resultIndex; i < event.results.length; ++i) {
                            if (event.results[i].isFinal) {
                                finalTranscript += event.results[i][0].transcript;
                            } else {
                                interimTranscript += event.results[i][0].transcript;
                            }
                        }

                        const transcript = finalTranscript + interimTranscript;
                        if (transcript.trim()) {
                            setInput(transcript);
                        }
                    };

                    recognition.onerror = (event) => {
                        console.warn("Speech recognition warning/error:", event.error);
                    };

                    speechRecognitionRef.current = recognition;
                    recognition.start();
                }

                mediaRecorder.start();
                setIsRecording(true);
                showToast("Gravando áudio...", "info");
            } catch (err) {
                console.error("Erro ao acessar microfone:", err);
                showToast("Não foi possível acessar o microfone. Verifique as permissões do seu navegador.", "error");
            }
        }
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
