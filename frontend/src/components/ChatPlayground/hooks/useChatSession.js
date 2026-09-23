import { useState, useCallback } from 'react';
import { api } from '../../../api/client';

export const useChatSession = ({
    selectedAgentId,
    sessionId,
    setSessionId,
    setMessages,
    setBattleMessages,
    setHasTesterReport,
    setTesterReport,
    setLoading,
    showToast
}) => {
    const [sessionStats, setSessionStats] = useState({ totalCost: 0, responseCount: 0, totalTokens: 0 });
    const [analysisData, setAnalysisData] = useState(null); // { type, content, loading }

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
    }, [selectedAgentId, setSessionId, setMessages, setBattleMessages, setHasTesterReport, setTesterReport, showToast]);

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
        sessionStats,
        setSessionStats,
        analysisData,
        setAnalysisData,
        handleReset,
        loadSession,
        fetchSummary,
        fetchQuestions
    };
};
