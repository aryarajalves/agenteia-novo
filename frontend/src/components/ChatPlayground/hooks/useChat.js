import { useState, useRef, useEffect } from 'react';
import { useChatVoice } from './useChatVoice';
import { useChatMedia } from './useChatMedia';
import { useChatSession } from './useChatSession';
import { useChatExecution } from './useChatExecution';

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
    
    const scrollRef = useRef(null);
    const battleScrollRef = useRef(null);
    const messagesRef = useRef(messages);
    const isViewMode = false;

    // 1. Submódulo de Sessão (Histórico, Estatísticas e Análise)
    const {
        sessionStats,
        setSessionStats,
        analysisData,
        setAnalysisData,
        handleReset,
        loadSession,
        fetchSummary,
        fetchQuestions
    } = useChatSession({
        selectedAgentId,
        sessionId,
        setSessionId,
        setMessages,
        setBattleMessages,
        setHasTesterReport,
        setTesterReport,
        setLoading,
        showToast
    });

    // 2. Submódulo de Mídia (Imagens e Upload)
    const {
        selectedImage,
        setSelectedImage,
        imagePreview,
        setImagePreview,
        isUploading,
        setIsUploading,
        fileInputRef,
        handleImageSelect,
        handleRemoveImage,
        uploadImage
    } = useChatMedia({ showToast });

    // 3. Submódulo de Execução do Agente (Envio e Execução)
    const {
        executeAgent,
        handleSendMessageFlow
    } = useChatExecution({
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
    });

    // Função pública de envio de mensagens
    const handleSendMessage = async (e, directText = null) => {
        if (loading) return;
        return handleSendMessageFlow({
            e,
            directText,
            input,
            setInput,
            selectedImage,
            handleRemoveImage,
            uploadImage,
            stopRecordingCleanup,
            messagesRef
        });
    };

    // 4. Submódulo de Gravação de Voz
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

    // Auto-scroll ao receber mensagens
    useEffect(() => {
        messagesRef.current = messages;
        if (scrollRef.current) {
            setTimeout(() => {
                if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
            }, 50);
        }
    }, [messages]);

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
