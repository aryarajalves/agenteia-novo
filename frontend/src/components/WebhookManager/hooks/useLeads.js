import { useState, useCallback, useRef, useEffect } from 'react';
import { api } from '../../../api/client';
import { showToast } from '../utils/helpers';
import { useImportChat } from './useImportChat';
import {
    useLeadsSelection,
    useLeadsWebSocket,
    useLeadsBatchActions
} from './leads';

export const useLeads = () => {
    const [leadsModal, setLeadsModal] = useState(null);
    const leadsModalRef = useRef(leadsModal);

    useEffect(() => {
        leadsModalRef.current = leadsModal;
    }, [leadsModal]);

    // Sub-hook de seleção de contatos
    const {
        selectedLeads,
        setSelectedLeads,
        isSelectingAllTotal,
        toggleSelectLead,
        toggleSelectAllLeads,
        handleSelectAllTotalLeads,
        handleClearAllSelectedLeads
    } = useLeadsSelection(leadsModal);

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

    // Sub-hook de ações em lote e sincronização
    const {
        bulkDeleteModal,
        setBulkDeleteModal,
        isSyncing,
        deletingLeads,
        handleSyncAll,
        handleDeleteSelectedLeads,
        handleDeleteAllLeads
    } = useLeadsBatchActions({
        leadsModal,
        selectedLeads,
        setSelectedLeads,
        fetchLeads
    });

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

    // Sub-hook de conexão WebSocket e atualizações em tempo real
    useLeadsWebSocket({
        webhookId: leadsModal?.webhook?.id,
        leadsModalRef,
        setLeadsModal,
        fetchLeads,
        handleImportWsMessage
    });

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
