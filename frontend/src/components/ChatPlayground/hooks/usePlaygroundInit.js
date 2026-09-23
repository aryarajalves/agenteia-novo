import { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { api } from '../../../api/client';

export const usePlaygroundInit = () => {
    const location = useLocation();
    const queryParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
    const agentIdFromQuery = queryParams.get('agentId');
    const initialSessionId = queryParams.get('session_id');

    const [agents, setAgents] = useState([]);
    const [globalVars, setGlobalVars] = useState([]);
    const [availableModels, setAvailableModels] = useState([]);
    const [loadingAgents, setLoadingAgents] = useState(true);

    const [selectedAgentId, setSelectedAgentId] = useState(agentIdFromQuery || '');
    const [sessionId, setSessionId] = useState(initialSessionId || Math.random().toString(36).substring(7));
    const [toast, setToast] = useState({ show: false, message: '', type: 'info' });
    const [isNavigating, setIsNavigating] = useState(false);

    const showToast = useCallback((message, type = 'info') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast({ show: false, message: '', type: 'info' }), 5000);
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [agentsRes, globalsRes, modelsRes] = await Promise.all([
                    api.get('/agents'),
                    api.get('/global-variables'),
                    api.get('/models')
                ]);
                
                const agentsData = await agentsRes.json();
                const globalsData = await globalsRes.json();
                const modelsData = await modelsRes.json();
                
                setAgents(agentsData);
                setGlobalVars(globalsData);

                const modelsList = (modelsData?.models || []).map(m => m.id);
                setAvailableModels(modelsList.length > 0 ? modelsList : ['gpt-5', 'gpt-5-mini', 'gpt-5.2', 'gpt-4o', 'gpt-4o-mini', 'o3-mini', 'o1-mini']);
                
                if (!selectedAgentId && agentsData.length > 0) {
                    setSelectedAgentId(agentsData[0].id);
                }
            } catch (err) {
                console.error("Erro ao buscar dados iniciais:", err);
                showToast("Erro ao carregar dados", "error");
            } finally {
                setLoadingAgents(false);
            }
        };
        fetchData();
    }, [selectedAgentId, showToast]);


 return {
 agents,
 setAgents,
 globalVars,
 setGlobalVars,
 availableModels,
 loadingAgents,
 selectedAgentId,
 setSelectedAgentId,
 sessionId,
 setSessionId,
 toast,
 showToast,
 isNavigating,
 setIsNavigating
 };
};
