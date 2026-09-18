import { useState, useCallback } from 'react';
import { api } from '../../../api/client';
import { showToast, generateToken } from '../utils/helpers';
import { INITIAL_FORM_STATE } from '../constants';

const parseListSafe = (val) => {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    if (typeof val === 'string') {
        try {
            const parsed = JSON.parse(val);
            if (Array.isArray(parsed)) return parsed;
        } catch (_) {}
        return val.trim() ? [val.trim()] : [];
    }
    return [];
};

const extractErrorMessage = (errData, fallbackMsg) => {
    if (!errData) return fallbackMsg;
    if (typeof errData === 'string') return errData;
    if (typeof errData.detail === 'string') return errData.detail;
    if (Array.isArray(errData.detail)) {
        return errData.detail.map(d => (d.msg || d.message || JSON.stringify(d))).join(' | ');
    }
    if (errData.message && typeof errData.message === 'string') return errData.message;
    return fallbackMsg;
};

const sanitizeWebhookPayload = (form) => {
    const payload = { ...form };
    delete payload.created_at;
    delete payload.updated_at;
    delete payload.cw_webhooks;
    delete payload.stats;

    payload.delay_seconds = Number(form.delay_seconds) || 0;
    payload.response_delay_seconds = Number(form.response_delay_seconds) || 0;
    payload.agent_id = form.agent_id ? Number(form.agent_id) : null;
    
    if (form.secondary_agent_ids) {
        payload.secondary_agent_ids = parseListSafe(form.secondary_agent_ids)
            .map(id => Number(id))
            .filter(id => !isNaN(id) && id > 0);
    }
    
    payload.allowed_contacts = parseListSafe(form.allowed_contacts);
    payload.blocked_messages = parseListSafe(form.blocked_messages);
    payload.delete_keywords = parseListSafe(form.delete_keywords);
    payload.delete_labels = parseListSafe(form.delete_labels);
    payload.labels_on_message = parseListSafe(form.labels_on_message);
    payload.window_close_label = parseListSafe(form.window_close_label);
    payload.handoff_labels_to_add = parseListSafe(form.handoff_labels_to_add);
    payload.handoff_labels_to_remove = parseListSafe(form.handoff_labels_to_remove);
    payload.ai_handoff_labels_to_add = parseListSafe(form.ai_handoff_labels_to_add);
    payload.ai_handoff_labels_to_remove = parseListSafe(form.ai_handoff_labels_to_remove);
    payload.memory_mappings = parseListSafe(form.memory_mappings);
    payload.followup_steps = parseListSafe(form.followup_steps);
    payload.followup_funnels = parseListSafe(form.followup_funnels);

    return payload;
};

export const useWebhookOperations = (fetchWebhooks, setSelectedWebhook, fetchChatwootLabels) => {
    const [isCreating, setIsCreating] = useState(false);
    const [createForm, setCreateForm] = useState(INITIAL_FORM_STATE);
    const [createSaving, setCreateSaving] = useState(false);
    const [createError, setCreateError] = useState('');

    const [editingWebhook, setEditingWebhook] = useState(null);
    const [editForm, setEditForm] = useState(INITIAL_FORM_STATE);
    const [editSaving, setEditSaving] = useState(false);
    const [editError, setEditError] = useState('');
    const [editTab, setEditTab] = useState('geral');

    const [togglingId, setTogglingId] = useState(null);

    const handleCreate = async (e) => {
        if (e) e.preventDefault();
        setEditSaving(true);
        setEditError('');
        try {
            if (!editForm.name?.trim()) {
                showToast('O Nome da Integração é obrigatório.', 'error');
                setEditSaving(false);
                return;
            }

            if (!editForm.token?.trim()) {
                showToast('O Slug da URL não pode ficar em branco.', 'error');
                setEditSaving(false);
                return;
            }

            if (!editForm.memory_token?.trim()) {
                showToast('O Slug da URL de Memória não pode ficar em branco.', 'error');
                setEditSaving(false);
                return;
            }

            if (!editForm.agent_id) {
                showToast('Por favor, selecione um Agente Principal.', 'error');
                setEditSaving(false);
                return;
            }

            const payload = sanitizeWebhookPayload(editForm);
            const res = await api.post('/webhooks', payload);
            if (!res.ok) {
                let errData = {};
                try { errData = await res.json(); } catch (_) {}
                const errMsg = extractErrorMessage(errData, 'Erro ao criar integração.');
                setEditError(errMsg);
                showToast(errMsg, 'error');
                return;
            }
            setEditingWebhook(null);
            setEditForm(INITIAL_FORM_STATE);
            showToast('Integração criada com sucesso!');
            if (fetchWebhooks) fetchWebhooks();
            if (fetchChatwootLabels) {
                fetchChatwootLabels().catch(err => console.warn('Erro ao atualizar labels:', err));
            }
        } catch (e) {
            const msg = `Erro de conexão: ${e.message}`;
            setEditError(msg);
            showToast(msg, 'error');
        } finally {
            setEditSaving(false);
        }
    };

    const handleEdit = async (e) => {
        if (e) e.preventDefault();
        if (!editingWebhook || !editingWebhook.id) {
            showToast('Erro: integração não identificada. Feche e abra o modal novamente.', 'error');
            setEditSaving(false);
            return;
        }
        setEditSaving(true);
        setEditError('');
        try {
            const payload = sanitizeWebhookPayload(editForm);
            const res = await api.put(`/webhooks/${editingWebhook.id}`, payload);
            if (!res.ok) {
                let errData = {};
                try { errData = await res.json(); } catch (_) {}
                const errMsg = extractErrorMessage(errData, 'Erro ao salvar alterações.');
                setEditError(errMsg);
                showToast(errMsg, 'error');
                return;
            }
            setEditingWebhook(null);
            showToast('Alterações salvas com sucesso!');
            if (fetchWebhooks) fetchWebhooks();
            if (fetchChatwootLabels) {
                fetchChatwootLabels().catch(err => console.warn('Erro ao atualizar labels:', err));
            }
        } catch (e) {
            const msg = `Erro de conexão: ${e.message}`;
            setEditError(msg);
            showToast(msg, 'error');
        } finally {
            setEditSaving(false);
        }
    };

    const handleToggleActive = async (webhook) => {
        setTogglingId(webhook.id);
        try {
            const res = await api.patch(`/webhooks/${webhook.id}/toggle-active`);
            if (res.ok) {
                await fetchWebhooks();
            }
        } catch (e) {
            console.error('Erro ao alternar status:', e);
        } finally {
            setTogglingId(null);
        }
    };

    const [editAllowedInput, setEditAllowedInput] = useState('');
    const [editBlockedInput, setEditBlockedInput] = useState('');
    const [editDeleteInput, setEditDeleteInput] = useState('');

    const handleOpenEdit = useCallback((webhook) => {
        setEditingWebhook(webhook);
        if (fetchChatwootLabels && (webhook.zapvoice_url || webhook.zapvoice_api_token)) {
            fetchChatwootLabels({
                zapvoice_url: webhook.zapvoice_url,
                zapvoice_api_token: webhook.zapvoice_api_token,
                zapvoice_client_id: webhook.zapvoice_client_id
            }).catch(err => console.warn('Aviso ao carregar labels ao abrir edição:', err));
        }
        setEditForm({
            ...INITIAL_FORM_STATE,
            ...webhook,
            agent_id: webhook.agent_id ? String(webhook.agent_id) : '',
            secondary_agent_ids: webhook.secondary_agent_ids || [],
            delay_seconds: String(webhook.delay_seconds || 30),
            response_delay_seconds: String(webhook.response_delay_seconds || 0),
            allowed_contacts: webhook.allowed_contacts || [],
            blocked_messages: webhook.blocked_messages || [],
            delete_keywords: webhook.delete_keywords || [],
            delete_message: webhook.delete_message || '',
            delete_labels: parseListSafe(webhook.delete_labels),
            zapvoice_url: webhook.zapvoice_url || '',
            zapvoice_api_token: webhook.zapvoice_api_token || '',
            zapvoice_client_id: webhook.zapvoice_client_id || '',
            labels_on_message: webhook.labels_on_message || [],
            ignore_by_label: webhook.ignore_by_label || '',
            handoff_labels_to_remove: webhook.handoff_labels_to_remove || [],
            handoff_labels_to_add: webhook.handoff_labels_to_add || [],
            handoff_keyword: webhook.handoff_keyword || '',
            handoff_message: webhook.handoff_message || '',
            ai_handoff_labels_to_remove: webhook.ai_handoff_labels_to_remove || [],
            ai_handoff_labels_to_add: webhook.ai_handoff_labels_to_add || [],
            ai_handoff_keyword: webhook.ai_handoff_keyword || '',
            ai_handoff_message: webhook.ai_handoff_message || '',
            window_close_label: webhook.window_close_label || [],
            followup_enabled: webhook.followup_enabled || false,
            followup_steps: webhook.followup_steps || [],
            followup_funnels: webhook.followup_funnels || [],
            followup_business_hours: webhook.followup_business_hours || { enabled: false, start: '08:00', end: '18:00', weekdays: true, saturday: false, sunday: false },
            followup_cancel_label: webhook.followup_cancel_label || '',
            followup_required_label: webhook.followup_required_label || '',
            followup_add_label: webhook.followup_add_label || '',
            split_response_enabled: webhook.split_response_enabled !== undefined ? webhook.split_response_enabled : true,
        });
        setEditTab('geral');
        setEditError('');
        setEditAllowedInput('');
        setEditBlockedInput('');
        setEditDeleteInput('');
        if (fetchChatwootLabels) {
            fetchChatwootLabels({
                zapvoice_url: webhook.zapvoice_url,
                zapvoice_api_token: webhook.zapvoice_api_token,
                zapvoice_client_id: webhook.zapvoice_client_id
            });
        }
    }, [fetchChatwootLabels]);

    const handleOpenCreate = useCallback(() => {
        setEditingWebhook({ id: 'new', isNew: true });
        setEditForm({
            ...INITIAL_FORM_STATE,
            token: generateToken(),
            memory_token: generateToken()
        });
        setEditTab('geral');
        setEditError('');
        setEditAllowedInput('');
        setEditBlockedInput('');
        setEditDeleteInput('');
    }, []);


    return {
        isCreating, setIsCreating,
        createForm, setCreateForm,
        createSaving, createError,
        handleCreate,
        editingWebhook, setEditingWebhook,
        editForm, setEditForm,
        editSaving, editError,
        editTab, setEditTab,
        handleEdit,
        handleOpenEdit,
        handleOpenCreate,
        togglingId,
        handleToggleActive,
        editAllowedInput, setEditAllowedInput,
        editBlockedInput, setEditBlockedInput,
        editDeleteInput, setEditDeleteInput
    };

};
