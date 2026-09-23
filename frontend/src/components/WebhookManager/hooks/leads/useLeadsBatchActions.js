import { useState } from 'react';
import { api } from '../../../../api/client';
import { showToast } from '../../utils/helpers';

export const useLeadsBatchActions = ({
    leadsModal,
    selectedLeads,
    setSelectedLeads,
    fetchLeads
}) => {
    const [bulkDeleteModal, setBulkDeleteModal] = useState(null);
    const [isSyncing, setIsSyncing] = useState(false);
    const [deletingLeads, setDeletingLeads] = useState(false);

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

    return {
        bulkDeleteModal,
        setBulkDeleteModal,
        isSyncing,
        deletingLeads,
        handleSyncAll,
        handleDeleteSelectedLeads,
        handleDeleteAllLeads
    };
};
