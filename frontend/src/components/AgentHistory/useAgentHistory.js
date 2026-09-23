import { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { groupAndSortSessions } from './agentHistoryHelpers';

export const useAgentHistory = (agentId) => {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedSessions, setExpandedSessions] = useState({});
    const [summaries, setSummaries] = useState({});
    const [loadingSummary, setLoadingSummary] = useState({});

    // Bulk Delete & Selection Logic
    const [selectedSessions, setSelectedSessions] = useState(new Set());
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [analysisData, setAnalysisData] = useState(null);

    useEffect(() => {
        if (!agentId || agentId === 'new') {
            setLoading(false);
            return;
        }

        api.get(`/agents/${agentId}/history`)
            .then(res => res.json())
            .then(data => {
                setHistory(Array.isArray(data) ? data : []);
                setLoading(false);
            })
            .catch(err => {
                console.error('Erro ao carregar histórico:', err);
                setLoading(false);
            });
    }, [agentId]);

    const handleSummarize = async (sessionId) => {
        if (loadingSummary[sessionId]) return;

        setLoadingSummary(prev => ({ ...prev, [sessionId]: true }));
        try {
            const res = await api.get(`/sessions/${sessionId}/summarize`);
            const data = await res.json();
            setSummaries(prev => ({ ...prev, [sessionId]: data }));
        } catch (err) {
            console.error('Erro ao gerar resumo:', err);
        } finally {
            setLoadingSummary(prev => ({ ...prev, [sessionId]: false }));
        }
    };

    const toggleSession = (sessionId) => {
        setExpandedSessions(prev => ({
            ...prev,
            [sessionId]: !prev[sessionId]
        }));
    };

    const toggleSelection = (e, sessionId) => {
        e.stopPropagation();
        const newSet = new Set(selectedSessions);
        if (newSet.has(sessionId)) newSet.delete(sessionId);
        else newSet.add(sessionId);
        setSelectedSessions(newSet);
    };

    const handleSelectAll = (e, sessionsList) => {
        if (e.target.checked) {
            setSelectedSessions(new Set(sessionsList.map(s => s.id)));
        } else {
            setSelectedSessions(new Set());
        }
    };

    const handleConfirmDelete = async () => {
        if (selectedSessions.size === 0) return;
        setIsDeleting(true);
        try {
            const res = await api.post(`/sessions/delete`, {
                session_ids: Array.from(selectedSessions)
            });

            if (res.ok) {
                // Update local state by removing deleted logs
                setHistory(prev => prev.filter(log => !selectedSessions.has(log.session_id)));
                setSelectedSessions(new Set());
                setShowDeleteModal(false);
            } else {
                alert('Erro ao deletar sessões.');
            }
        } catch (err) {
            console.error('Erro ao deletar:', err);
            alert('Erro de conexão.');
        } finally {
            setIsDeleting(false);
        }
    };

    const extractBatchQuestions = async () => {
        if (selectedSessions.size === 0) return;
        setAnalysisData({ type: 'questions', loading: true });

        try {
            const res = await api.post(`/sessions/questions/batch`, {
                session_ids: Array.from(selectedSessions)
            });
            const data = await res.json();
            setAnalysisData({ type: 'questions', content: data.questions, loading: false });
        } catch (e) {
            console.error(e);
            setAnalysisData({ type: 'error', content: 'Erro ao extrair perguntas em lote.', loading: false });
        }
    };

    const sortedSessions = groupAndSortSessions(history);

    return {
        history,
        loading,
        sortedSessions,
        expandedSessions,
        toggleSession,
        summaries,
        loadingSummary,
        handleSummarize,
        selectedSessions,
        toggleSelection,
        handleSelectAll,
        showDeleteModal,
        setShowDeleteModal,
        isDeleting,
        handleConfirmDelete,
        analysisData,
        setAnalysisData,
        extractBatchQuestions
    };
};

