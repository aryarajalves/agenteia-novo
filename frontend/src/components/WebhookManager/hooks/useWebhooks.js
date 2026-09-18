import { useState, useCallback, useEffect } from 'react';
import { api } from '../../../api/client';

export const useWebhooks = (showToast) => {
    const [webhooks, setWebhooks] = useState([]);
    const [agents, setAgents] = useState([]);
    const [chatwootGlobal, setChatwootGlobal] = useState({ configured: false });
    const [loading, setLoading] = useState(true);
    const [togglingId, setTogglingId] = useState(null);
    const [syncingAgentId, setSyncingAgentId] = useState(null);

    const [chatwootLabels, setChatwootLabels] = useState([]);
    const [labelsLoading, setLabelsLoading] = useState(false);

    const fetchWebhooks = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/webhooks');
            const data = await res.json();
            setWebhooks(Array.isArray(data) ? data : []);
        } catch (e) {
            console.error('Erro ao buscar webhooks:', e);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchAgents = useCallback(async () => {
        try {
            const res = await api.get('/agents');
            const data = await res.json();
            setAgents(Array.isArray(data) ? data : []);
        } catch (e) {
            console.error('Erro ao buscar agentes:', e);
        }
    }, []);

    const fetchChatwootLabels = useCallback(async (params = {}) => {
        setLabelsLoading(true);
        try {
            const queryParams = new URLSearchParams();
            if (params?.zapvoice_url) queryParams.append('zapvoice_url', params.zapvoice_url);
            if (params?.zapvoice_api_token) queryParams.append('zapvoice_api_token', params.zapvoice_api_token);
            if (params?.zapvoice_client_id) queryParams.append('zapvoice_client_id', params.zapvoice_client_id);
            const queryStr = queryParams.toString() ? `?${queryParams.toString()}` : '';
            const res = await api.get(`/chatwoot/labels${queryStr}`);
            if (res.ok) {
                const data = await res.json();
                setChatwootLabels(Array.isArray(data) ? data : []);
            }
        } catch (e) {
            console.error('Erro ao buscar labels do chatwoot:', e);
        } finally {
            setLabelsLoading(false);
        }
    }, []);

    const fetchChatwootConfig = useCallback(async () => {
        try {
            const res = await api.get('/webhooks/chatwoot-config');
            const data = await res.json();
            setChatwootGlobal(data);
            if (data.configured) {
                fetchChatwootLabels();
            }
        } catch (e) {
            console.error('Erro ao buscar config do chatwoot:', e);
        }
    }, [fetchChatwootLabels]);

    const handleGenerateDescription = async (agentId) => {
        if (!agentId || syncingAgentId) return;
        setSyncingAgentId(agentId);
        try {
            showToast('✨ Gerando descrição...', 'info');
            const res = await api.post(`/agents/${agentId}/generate-description`);
            if (res.ok) {
                await fetchAgents(); // Atualiza a lista com a nova descrição
                showToast('✅ Descrição gerada com sucesso!');
            } else {
                const err = await res.json().catch(() => ({}));
                showToast(err.detail || '❌ Erro ao gerar descrição.', 'error');
            }
        } catch (e) {
            showToast('❌ Erro ao gerar descrição.', 'error');
        } finally {
            setSyncingAgentId(null);
        }
    };

    const handleToggleActive = async (webhook) => {
        if (togglingId) return;
        setTogglingId(webhook.id);
        const newStatus = !webhook.is_active;
        
        try {
            const res = await api.patch(`/webhooks/${webhook.id}/toggle-active`);
            if (res.ok) {
                const updated = await res.json();
                setWebhooks(prev => prev.map(w => w.id === webhook.id ? updated : w));
                if (showToast) showToast(`✅ Integração ${newStatus ? 'ativada' : 'desativada'} com sucesso`);
            } else {
                const err = await res.json();
                if (showToast) showToast(err.detail || '❌ Erro ao atualizar status', 'error');
            }
        } catch (e) {
            console.error(e);
            if (showToast) showToast('❌ Erro de conexão ao atualizar status', 'error');
        } finally {
            setTogglingId(null);
        }
    };

    const deleteWebhook = async (webhookId) => {
        try {
            const res = await api.delete(`/webhooks/${webhookId}`);
            if (res.ok) {
                setWebhooks(prev => prev.filter(w => w.id !== webhookId));
                if (showToast) showToast('Webhook excluído com sucesso');
                return true;
            }
        } catch (e) {
            console.error('Erro ao deletar webhook:', e);
            if (showToast) showToast('Erro ao excluir webhook', 'error');
        }
        return false;
    };

    useEffect(() => {
        fetchWebhooks();
        fetchAgents();
        fetchChatwootConfig();
        // Buscar labels sempre (ZapVoice independe do chatwoot-config)
        fetchChatwootLabels();
    }, [fetchWebhooks, fetchAgents, fetchChatwootConfig, fetchChatwootLabels]);

    return {
        webhooks,
        agents,
        chatwootGlobal,
        chatwootLabels,
        labelsLoading,
        loading,
        togglingId,
        fetchWebhooks,
        handleToggleActive,
        deleteWebhook,
        handleGenerateDescription,
        syncingAgentId,
        fetchChatwootLabels
    };

};
