import { useState, useCallback, useRef, useEffect } from 'react';
import { api } from '../../../api/client';
import { API_URL } from '../../../config';
import { showToast } from '../utils/helpers';
import { useImportChat } from './useImportChat';

export const useLeads = () => {
    const [leadsModal, setLeadsModal] = useState(null);
    const [selectedLeads, setSelectedLeads] = useState(new Set());
    const [bulkDeleteModal, setBulkDeleteModal] = useState(null);
    const [isSyncing, setIsSyncing] = useState(false);
    const [isSelectingAllTotal, setIsSelectingAllTotal] = useState(false);
    const [deletingLeads, setDeletingLeads] = useState(false);
    const leadsModalRef = useRef(leadsModal);

    useEffect(() => {
        leadsModalRef.current = leadsModal;
    }, [leadsModal]);

    const fetchLeads = useCallback(async (targetWebhook, page = 1, pageSize = 20, search = '', podeEnviar = 'all', ds = '', de = '', janelaAberta = 'all', semMensagens = 'all', silent = false) => {
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
                loading: silent ? (prev?.loading ?? false) : true, 
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

        const MAX_RETRIES = 2;
        const RETRY_DELAY_MS = 2000;

        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                const res = await api.get(url);
                const data = await res.json();
                
                if (!res.ok) {
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
                return;
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

    // Hook modularizado para Importação de Conversas do ZapJords
    const {
        importProgress,
        setImportProgress,
        isStartingImport,
        isCancellingImport,
        handleImportChat,
        cancelImport,
        openImportProgress,
        closeImportProgress,
        handleImportWsMessage
    } = useImportChat({
        webhook: leadsModal?.webhook,
        onImportFinished: () => {
            const current = leadsModalRef.current;
            if (current && current.webhook) {
                fetchLeads(
                    current.webhook,
                    current.page || 1,
                    current.pageSize || 20,
                    current.search || '',
                    current.podeEnviar || 'all',
                    current.dateStart || '',
                    current.dateEnd || '',
                    current.janelaAberta || 'all',
                    current.semMensagens || 'all',
                    true
                );
            }
        }
    });

    // WebSocket com reconexão automática para sincronização em tempo real
    useEffect(() => {
        const webhookId = leadsModal?.webhook?.id;
        if (!webhookId) return;

        let ws = null;
        let debounceTimer = null;
        let reconnectTimer = null;
        let isComponentMounted = true;

        const connectWs = () => {
            if (!isComponentMounted) return;
            try {
                const wsUrl = API_URL.replace('http', 'ws') + '/ws/events';
                ws = new WebSocket(wsUrl);

                ws.onopen = () => {
                    if (isComponentMounted) {
                        setLeadsModal(prev => prev ? ({ ...prev, liveConnected: true }) : prev);
                    }
                };

                ws.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data);

                        // Delegado para o gerenciador de importação
                        const handledByImport = handleImportWsMessage(data);
                        if (handledByImport) return;

                        const isRelevant = (
                            (data.type === 'lead_created' || data.type === 'new_lead' || data.type === 'lead_updated' || data.type === 'lead_deleted' || data.type === 'leads_synced' || data.type === 'new_event') &&
                            (data.webhook_id === webhookId || !data.webhook_id)
                        );

                        if (isRelevant) {
                            if (debounceTimer) clearTimeout(debounceTimer);
                            debounceTimer = setTimeout(() => {
                                const current = leadsModalRef.current;
                                if (current && current.webhook && current.webhook.id === webhookId) {
                                    fetchLeads(
                                        current.webhook,
                                        current.page || 1,
                                        current.pageSize || 20,
                                        current.search || '',
                                        current.podeEnviar || 'all',
                                        current.dateStart || '',
                                        current.dateEnd || '',
                                        current.janelaAberta || 'all',
                                        current.semMensagens || 'all',
                                        true
                                    );
                                }
                            }, 300);
                        }
                    } catch (err) {
                        console.error('Erro ao processar mensagem WS no useLeads:', err);
                    }
                };

                ws.onclose = () => {
                    if (isComponentMounted) {
                        setLeadsModal(prev => prev ? ({ ...prev, liveConnected: false }) : prev);
                        if (reconnectTimer) clearTimeout(reconnectTimer);
                        reconnectTimer = setTimeout(connectWs, 3000);
                    }
                };

                ws.onerror = (err) => {
                    console.warn('Aviso de conexão WebSocket em useLeads:', err);
                };
            } catch (err) {
                console.warn('Falha ao conectar WebSocket em useLeads:', err);
                if (isComponentMounted) {
                    if (reconnectTimer) clearTimeout(reconnectTimer);
                    reconnectTimer = setTimeout(connectWs, 3000);
                }
            }
        };

        connectWs();

        return () => {
            isComponentMounted = false;
            if (debounceTimer) clearTimeout(debounceTimer);
            if (reconnectTimer) clearTimeout(reconnectTimer);
            if (ws) {
                try { ws.close(); } catch (_) {}
            }
        };
    }, [leadsModal?.webhook?.id, fetchLeads, handleImportWsMessage]);

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
        if (isSyncing) return;
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
                const reason = data.message || data.detail || 'Nenhum contato foi sincronizado. Verifique se os campos inbox_id e conversa_id estão preenchidos.';
                showToast(`⚠️ ${reason}`, 'error');
            }
        } catch (e) {
            showToast('Erro de conexão ao iniciar sincronização.', 'error');
        } finally {
            setIsSyncing(false);
        }
    };

    const handleDeleteSelectedLeads = async () => {
        const webhook = leadsModal?.webhook;
        if (!webhook || selectedLeads.size === 0) return;
        setDeletingLeads(true);
        try {
            const res = await api.delete(`/webhooks/${webhook.id}/leads/batch`, {
                lead_ids: Array.from(selectedLeads)
            });
            if (res.ok) {
                showToast(`🗑️ ${selectedLeads.size} contatos apagados com sucesso.`);
                setSelectedLeads(new Set());
                fetchLeads(webhook, leadsModal.page, leadsModal.pageSize, leadsModal.search, leadsModal.podeEnviar, leadsModal.dateStart, leadsModal.dateEnd, leadsModal.janelaAberta, leadsModal.semMensagens);
            } else {
                showToast('Erro ao apagar contatos selecionados', 'error');
            }
        } catch (e) {
            console.error('Erro ao apagar contatos:', e);
            showToast('Erro ao apagar contatos', 'error');
        } finally {
            setDeletingLeads(false);
            setBulkDeleteModal(null);
        }
    };

    const handleDeleteAllLeads = async () => {
        const webhook = leadsModal?.webhook;
        if (!webhook) return;
        setDeletingLeads(true);
        try {
            const res = await api.delete(`/webhooks/${webhook.id}/leads/all`, {
                q: leadsModal?.search || '',
                pode_enviar: leadsModal?.podeEnviar || 'all',
                date_start: leadsModal?.dateStart || '',
                date_end: leadsModal?.dateEnd || '',
                janela_aberta: leadsModal?.janelaAberta || 'all',
                sem_mensagem: leadsModal?.semMensagens || 'all'
            });
            if (res.ok) {
                showToast('🗑️ Todos os contatos filtrados foram apagados.');
                setSelectedLeads(new Set());
                fetchLeads(webhook, 1, leadsModal.pageSize, leadsModal.search, leadsModal.podeEnviar, leadsModal.dateStart, leadsModal.dateEnd, leadsModal.janelaAberta, leadsModal.semMensagens);
            } else {
                showToast('Erro ao apagar todos os contatos', 'error');
            }
        } catch (e) {
            console.error('Erro ao apagar todos os contatos:', e);
            showToast('Erro ao apagar contatos', 'error');
        } finally {
            setDeletingLeads(false);
            setBulkDeleteModal(null);
        }
    };

    const handleSelectAllTotalLeads = async () => {
        const webhook = leadsModal?.webhook;
        if (!webhook) return;
        setIsSelectingAllTotal(true);
        try {
            let url = `/webhooks/${webhook.id}/leads/ids?`;
            if (leadsModal?.search) url += `&q=${encodeURIComponent(leadsModal.search)}`;
            if (leadsModal?.podeEnviar && leadsModal.podeEnviar !== 'all') url += `&pode_enviar=${leadsModal.podeEnviar === 'true'}`;
            if (leadsModal?.janelaAberta && leadsModal.janelaAberta !== 'all') url += `&janela_aberta=${leadsModal.janelaAberta === 'true'}`;
            if (leadsModal?.semMensagens && leadsModal.semMensagens !== 'all') url += `&sem_mensagem=${leadsModal.semMensagens === 'true'}`;
            if (leadsModal?.dateStart) url += `&date_start=${leadsModal.dateStart}`;
            if (leadsModal?.dateEnd) url += `&date_end=${leadsModal.dateEnd}`;

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
        handleImportChat,
        importProgress,
        openImportProgress,
        closeImportProgress,
        isStartingImport,
        cancelImport,
        isCancellingImport,
        handleDeleteSelectedLeads,
        handleDeleteAllLeads,
        deletingLeads
    };
};
