import { useState, useCallback } from 'react';
import { api } from '../../../api/client';
import { showToast } from '../utils/helpers';

export const useLeads = () => {
    const [leadsModal, setLeadsModal] = useState(null);
    const [selectedLeads, setSelectedLeads] = useState(new Set());
    const [bulkDeleteModal, setBulkDeleteModal] = useState(null);
    const [isSyncing, setIsSyncing] = useState(false);

    const fetchLeads = useCallback(async (targetWebhook, page = 1, pageSize = 20, search = '', podeEnviar = 'all', ds = '', de = '', janelaAberta = 'all', semMensagens = 'all') => {
        const webhook = (targetWebhook && targetWebhook.id) ? targetWebhook : leadsModal?.webhook;
        if (!webhook || !webhook.id) {
            console.error('⚠️ fetchLeads chamado sem um webhook válido:', targetWebhook);
            return;
        }

        setLeadsModal(prev => {
            if (!prev) {
                setSelectedLeads(new Set());
            }
            return {
                ...(prev || { webhook }), 
                webhook,
                loading: true, 
                leads: prev?.leads || [],
                page, pageSize, search, podeEnviar, 
                dateStart: ds, dateEnd: de,
                janelaAberta,
                semMensagens
            };
        });
        
        let url = `/webhooks/${webhook.id}/leads?page=${page}&page_size=${pageSize}`;
        if (search) url += `&q=${encodeURIComponent(search)}`;
        if (podeEnviar !== 'all') url += `&pode_enviar=${podeEnviar === 'true'}`;
        if (janelaAberta !== 'all') url += `&janela_aberta=${janelaAberta === 'true'}`;
        if (semMensagens !== 'all') url += `&sem_mensagem=${semMensagens === 'true'}`;
        if (ds) url += `&date_start=${ds}`;
        if (de) url += `&date_end=${de}`;

        // Retry automático: até 2 tentativas com 2s de intervalo (para quando o pool do banco estiver sob carga)
        const MAX_RETRIES = 2;
        const RETRY_DELAY_MS = 2000;

        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                const res = await api.get(url);
                const data = await res.json();
                
                if (!res.ok) {
                    // Em caso de erro de servidor (500/503) e ainda houver tentativas, aguardar e tentar novamente
                    if ((res.status === 500 || res.status === 503) && attempt < MAX_RETRIES) {
                        console.warn(`⚠️ Erro ${res.status} ao buscar contatos. Tentativa ${attempt}/${MAX_RETRIES}. Retentando em ${RETRY_DELAY_MS}ms...`);
                        await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
                        continue;
                    }
                    console.error('❌ Erro da API ao buscar contatos:', res.status, data);
                    setLeadsModal(prev => ({ ...prev, loading: false }));
                    showToast(`Erro ao carregar contatos (${res.status})`, 'error');
                    return;
                }

                setLeadsModal(prev => ({
                    ...prev,
                    webhook,
                    leads: data.leads || [],
                    total: data.total || 0,
                    loading: false
                }));
                return; // Sucesso: sair do loop
            } catch (e) {
                if (attempt < MAX_RETRIES) {
                    console.warn(`⚠️ Falha de rede ao buscar contatos. Tentativa ${attempt}/${MAX_RETRIES}. Retentando em ${RETRY_DELAY_MS}ms...`);
                    await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
                } else {
                    console.error('Erro ao buscar leads:', e);
                    setLeadsModal(prev => ({ ...prev, loading: false }));
                    showToast('Erro ao carregar contatos. Tente novamente.', 'error');
                }
            }
        }
    }, [leadsModal?.webhook]);


    const toggleSelectLead = (id) => {
        setSelectedLeads(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleSelectAllLeads = (force) => {
        if (!leadsModal?.leads) return;
        const allIdsOnPage = leadsModal.leads.map(l => l.id);
        const allSelected = typeof force === 'boolean' ? !force : allIdsOnPage.every(id => selectedLeads.has(id));
        
        setSelectedLeads(prev => {
            const next = new Set(prev);
            if (allSelected) {
                allIdsOnPage.forEach(id => next.delete(id));
            } else {
                allIdsOnPage.forEach(id => next.add(id));
            }
            return next;
        });
    };

    const handleSyncAll = async (webhook) => {
        if (isSyncing) return; // Evita duplo clique
        setIsSyncing(true);
        try {
            const res = await api.post(`/webhooks/${webhook.id}/leads/sync-all`);
            let data = {};
            try { data = await res.json(); } catch (_) {}

            if (res.ok && data.ok !== false) {
                const msg = data.message || 'Sincronização concluída com sucesso!';
                showToast(`✅ ${msg}`);
                fetchLeads(webhook);
            } else {
                // Backend retornou HTTP 200 mas com ok: false no corpo
                const reason = data.message || data.detail || 'Nenhum contato foi sincronizado. Verifique se os campos inbox_id e conversa_id estão preenchidos.';
                showToast(`⚠️ ${reason}`, 'error');
            }
        } catch (e) {
            showToast('Erro de conexão ao iniciar sincronização.', 'error');
        } finally {
            setIsSyncing(false);
        }
    };

    const [deletingLeads, setDeletingLeads] = useState(false);

    const handleDeleteSelectedLeads = async () => {
        if (selectedLeads.size === 0 || !leadsModal?.webhook) return;
        setDeletingLeads(true);
        try {
            const res = await api.post(`/webhooks/${leadsModal.webhook.id}/leads/delete-batch`, {
                lead_ids: Array.from(selectedLeads)
            });
            if (res.ok) {
                showToast(`✅ ${selectedLeads.size} leads removidos.`);
                setSelectedLeads(new Set());
                fetchLeads(leadsModal.webhook, leadsModal.page, leadsModal.pageSize, leadsModal.search);
            }
        } catch (e) {
            showToast('Erro ao remover leads', 'error');
        } finally {
            setDeletingLeads(false);
        }
    };

    const handleDeleteAllLeads = async () => {
        if (!leadsModal?.webhook) return;
        setDeletingLeads(true);
        try {
            const res = await api.delete(`/webhooks/${leadsModal.webhook.id}/leads/all`);
            if (res.ok) {
                showToast('✅ Todos os leads foram removidos.');
                setSelectedLeads(new Set());
                fetchLeads(leadsModal.webhook);
            }
        } catch (e) {
            showToast('Erro ao remover todos os leads', 'error');
        } finally {
            setDeletingLeads(false);
        }
    };

    const [isSelectingAllTotal, setIsSelectingAllTotal] = useState(false);

    const handleSelectAllTotalLeads = async () => {
        const webhook = leadsModal?.webhook;
        if (!webhook || !webhook.id) return;
        
        setIsSelectingAllTotal(true);
        try {
            let url = `/webhooks/${webhook.id}/leads/ids?`;
            const params = [];
            if (leadsModal.search) params.push(`q=${encodeURIComponent(leadsModal.search)}`);
            if (leadsModal.podeEnviar !== 'all') params.push(`pode_enviar=${leadsModal.podeEnviar === 'true'}`);
            if (leadsModal.janelaAberta !== 'all') params.push(`janela_aberta=${leadsModal.janelaAberta === 'true'}`);
            if (leadsModal.semMensagens !== 'all') params.push(`sem_mensagem=${leadsModal.semMensagens === 'true'}`);
            if (leadsModal.dateStart) params.push(`date_start=${leadsModal.dateStart}`);
            if (leadsModal.dateEnd) params.push(`date_end=${leadsModal.dateEnd}`);
            
            url += params.join('&');
            const res = await api.get(url);
            const data = await res.json();
            
            if (res.ok && Array.isArray(data.ids)) {
                setSelectedLeads(new Set(data.ids));
                showToast(`✨ ${data.ids.length} contatos selecionados.`);
            } else {
                showToast('Erro ao selecionar todos os contatos', 'error');
            }
        } catch (e) {
            console.error('Erro ao buscar todos os IDs:', e);
            showToast('Erro ao selecionar todos os contatos', 'error');
        } finally {
            setIsSelectingAllTotal(false);
        }
    };

    const handleClearAllSelectedLeads = () => {
        setSelectedLeads(new Set());
    };

    return {
        leadsModal, setLeadsModal,
        fetchLeads,
        selectedLeads, setSelectedLeads,
        toggleSelectLead,
        toggleSelectAllLeads,
        handleSelectAllTotalLeads,
        handleClearAllSelectedLeads,
        isSelectingAllTotal,
        bulkDeleteModal, setBulkDeleteModal,
        handleSyncAll,
        isSyncing,
        handleDeleteSelectedLeads,
        handleDeleteAllLeads,
        deletingLeads
    };

};
