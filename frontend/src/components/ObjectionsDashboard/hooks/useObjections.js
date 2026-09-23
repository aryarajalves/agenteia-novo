import { useState, useEffect, useCallback } from 'react';
import { api } from '../../../api/client';

export const useObjections = () => {
    const [agents, setAgents] = useState([]);
    const [selectedAgentId, setSelectedAgentId] = useState('');
    const [knowledgeBases, setKnowledgeBases] = useState([]);
    const [clusters, setClusters] = useState([]);
    const [loading, setLoading] = useState(false);
    const [recalculating, setRecalculating] = useState(false);
    const [toast, setToast] = useState(null);

    // Feedback por toast
    const showToast = useCallback((message, type = 'success') => {
        setToast({ message, type, id: Date.now() });
    }, []);

    useEffect(() => {
        if (!toast) return;
        const timer = setTimeout(() => setToast(null), 5000);
        return () => clearTimeout(timer);
    }, [toast]);

    // Carregar agentes e bases de conhecimento iniciais
    useEffect(() => {
        const loadInitialData = async () => {
            try {
                setLoading(true);
                const agentsRes = await api.get('/agents');
                console.log('[ObjectionsDashboard] GET /agents status:', agentsRes.status);
                if (agentsRes.ok) {
                    const agentsData = await agentsRes.json();
                    console.log('[ObjectionsDashboard] Agentes carregados:', agentsData.length);
                    setAgents(agentsData);
                    if (agentsData.length > 0) {
                        setSelectedAgentId(agentsData[0].id.toString());
                    } else {
                        showToast("Nenhum agente encontrado. Crie um agente primeiro.", "error");
                    }
                } else {
                    const errText = await agentsRes.text();
                    console.error('[ObjectionsDashboard] Erro ao carregar agentes:', agentsRes.status, errText);
                    showToast(`Erro ${agentsRes.status} ao carregar agentes. Verifique sua sessão.`, "error");
                }

                const kbRes = await api.get('/knowledge-bases');
                if (kbRes.ok) {
                    const kbData = await kbRes.json();
                    setKnowledgeBases(kbData);
                }
            } catch (error) {
                console.error("Erro ao carregar dados iniciais:", error);
                showToast("Erro de conexão ao carregar dados.", "error");
            } finally {
                setLoading(false);
            }
        };

        loadInitialData();
    }, [showToast]);

    // Carregar ranking de dúvidas ao alternar agente selecionado
    useEffect(() => {
        if (!selectedAgentId) return;

        const loadObjections = async () => {
            try {
                setLoading(true);
                const res = await api.get(`/analytics/objections?agent_id=${selectedAgentId}`);
                if (res.ok) {
                    const data = await res.json();
                    setClusters(data.clusters || []);
                } else {
                    showToast("Erro ao carregar ranking de dúvidas.", "error");
                }
            } catch (error) {
                console.error("Erro ao buscar objeções:", error);
                showToast("Erro de rede ao buscar ranking.", "error");
            } finally {
                setLoading(false);
            }
        };

        loadObjections();
    }, [selectedAgentId, showToast]);

    // Recalcular dúvidas e objeções via IA
    const handleRecalculate = async () => {
        if (!selectedAgentId || recalculating) return;

        try {
            setRecalculating(true);
            showToast("Recalculando ranking de dúvidas via IA... Aguarde.", "info");

            const res = await api.post(`/analytics/objections/recalculate?agent_id=${selectedAgentId}`);
            if (res.ok) {
                const data = await res.json();
                setClusters(data.clusters || []);
                
                if (data.message && data.message.includes("recentemente")) {
                    showToast(data.message, "info");
                } else {
                    showToast("Ranking de dúvidas recalculado e atualizado! ✨", "success");
                }
            } else {
                const errData = await res.json();
                showToast(errData.detail || "Erro ao recalcular ranking.", "error");
            }
        } catch (error) {
            console.error("Erro ao recalcular dúvidas:", error);
            showToast("Erro de conexão com o servidor.", "error");
        } finally {
            setRecalculating(false);
        }
    };

    return {
        agents,
        selectedAgentId,
        setSelectedAgentId,
        knowledgeBases,
        clusters,
        setClusters,
        loading,
        recalculating,
        toast,
        showToast,
        handleRecalculate
    };
};
