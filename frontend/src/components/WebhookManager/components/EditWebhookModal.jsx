import React, { useEffect, useState, useCallback } from 'react';
import { 
    LabelMultiSelect, 
    LabelSingleSelect 
} from './Common/LabelSelect';
import { 
    AllowedContactsSection, 
    BlockedMessagesSection 
} from './Common/ContactSections';
import MemorySection from './Common/MemorySection';
import DeleteKeywordsSection from './Common/DeleteKeywordsSection';
import AgentTabSection from './Common/AgentTabSection';
import { normalizeContact, showToast } from '../utils/helpers';
import { api } from '../../../api/client';
import ConfirmModal from './ConfirmModal';
import FullscreenTextareaModal from './FullscreenTextareaModal';

const EditWebhookModal = ({
    editingWebhook,
    onClose,
    editTab,
    setEditTab,
    editForm,
    setEditForm,
    handleEdit,
    editSaving,
    editError,
    agents = [],
    handleGenerateDescription,
    editAllowedInput,
    setEditAllowedInput,
    editBlockedInput,
    setEditBlockedInput,
    editDeleteInput,
    setEditDeleteInput,
    chatwootGlobal,
    chatwootLabels = [],
    labelsLoading,
    fetchChatwootLabels,
    setConfirmRemoveFU,
    handleCreate
}) => {
    const [geralSubTab, setGeralSubTab] = useState('dados');
    const [segurancaSubTab, setSegurancaSubTab] = useState('permitidos');
    const [zapvoiceSubTab, setZapvoiceSubTab] = useState('credenciais');
    const isCreateMode = editingWebhook?.id === 'new';

    const [cwWebhooks, setCwWebhooks] = useState([]);
    const [cwWebhooksLoading, setCwWebhooksLoading] = useState(false);
    const [cwWebhooksError, setCwWebhooksError] = useState('');
    const [creatingCwWebhook, setCreatingCwWebhook] = useState(false);
    const [cwWebhookToDelete, setCwWebhookToDelete] = useState(null);
    const [showToken, setShowToken] = useState(false);

    const [activeFollowupStepTab, setActiveFollowupStepTab] = useState(0);
    const [smartTriggerTab, setSmartTriggerTab] = useState('cancel');
    const [uploadingMediaIndex, setUploadingMediaIndex] = useState(null);
    const [fullscreenModal, setFullscreenModal] = useState({ isOpen: false });
    const [zapvoiceTemplates, setZapvoiceTemplates] = useState([]);
    const [loadingTemplates, setLoadingTemplates] = useState(false);
    const [templateSearchTerm, setTemplateSearchTerm] = useState('');
    const [uploadingHeaderMedia, setUploadingHeaderMedia] = useState(false);

    // Safety checks for editForm fields
    const safeEditForm = {
        name: '',
        token: '',
        leads_table: '',
        description: '',
        delay_seconds: 30,
        response_delay_seconds: 0,
        split_response_enabled: true,
        disable_ai_responses: false,
        process_audio: false,
        process_image: false,
        followup_enabled: false,
        followup_steps: [],
        followup_business_hours: { enabled: false, start: '08:00', end: '18:00', weekdays: true, saturday: false, sunday: false },
        agent_id: '',
        secondary_agent_ids: [],
        allowed_contacts: [],
        blocked_messages: [],
        delete_keywords: [],
        delete_message: '',
        delete_labels: [],
        zapvoice_url: '',
        zapvoice_api_token: '',
        zapvoice_client_id: '',
        labels_on_message: [],
        ignore_by_label: '',
        negative_feedback_label: '',
        window_close_label: [],
        handoff_labels_to_remove: [],
        handoff_labels_to_add: [],
        handoff_keyword: '',
        handoff_message: '',
        ai_handoff_labels_to_remove: [],
        ai_handoff_labels_to_add: [],
        ai_handoff_keyword: '',
        ai_handoff_message: '',
        project_assistant_label: '',
        project_assistant_keyword: '',
        project_assistant_deactivate_keyword: '',
        project_assistant_entry_message: '',
        project_assistant_exit_message: '',
        ...editForm
    };

    // Parse string fields that should be arrays/objects
    const parseList = (val) => {
        if (Array.isArray(val)) return val;
        if (typeof val === 'string' && val.trim()) {
            try { return JSON.parse(val); } catch (e) { return []; }
        }
        return [];
    };

    safeEditForm.secondary_agent_ids = parseList(safeEditForm.secondary_agent_ids);
    safeEditForm.allowed_contacts = parseList(safeEditForm.allowed_contacts);
    safeEditForm.blocked_messages = parseList(safeEditForm.blocked_messages);
    safeEditForm.delete_keywords = parseList(safeEditForm.delete_keywords);
    safeEditForm.delete_labels = parseList(safeEditForm.delete_labels);
    safeEditForm.followup_steps = parseList(safeEditForm.followup_steps);
    safeEditForm.labels_on_message = parseList(safeEditForm.labels_on_message);
    safeEditForm.window_close_label = parseList(safeEditForm.window_close_label);
    safeEditForm.handoff_labels_to_add = parseList(safeEditForm.handoff_labels_to_add);
    safeEditForm.handoff_labels_to_remove = parseList(safeEditForm.handoff_labels_to_remove);
    safeEditForm.ai_handoff_labels_to_add = parseList(safeEditForm.ai_handoff_labels_to_add);
    safeEditForm.ai_handoff_labels_to_remove = parseList(safeEditForm.ai_handoff_labels_to_remove);

    const handleUploadStepMedia = async (stepIndex, file) => {
        if (!file) return;
        try {
            setUploadingMediaIndex(stepIndex);
            const formData = new FormData();
            formData.append('file', file);
            
            const response = await api.post('/webhooks/upload-media', formData);
            
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.detail || 'Falha no upload do arquivo');
            }
            const data = await response.json();
            
            if (data.url) {
                const s = [...safeEditForm.followup_steps];
                s[stepIndex] = { ...s[stepIndex], media_url: data.url };
                setEditForm({ ...safeEditForm, followup_steps: s });
                showToast('✅ Mídia enviada com sucesso!', 'success');
            }
        } catch (err) {
            console.error('Erro no upload de mídia:', err);
            showToast(err.message || '❌ Erro ao enviar mídia. Tente novamente.', 'error');
        } finally {
            setUploadingMediaIndex(null);
        }
    };

    const handleUploadHeaderMedia = async (stepIndex, file, headerFormat) => {
        if (!file) return;
        try {
            setUploadingHeaderMedia(true);
            const formData = new FormData();
            formData.append('file', file);
            
            const response = await api.post('/webhooks/upload-media', formData);
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.detail || 'Falha no upload do arquivo');
            }
            const data = await response.json();
            if (data.url) {
                const s = [...safeEditForm.followup_steps];
                s[stepIndex] = { 
                    ...s[stepIndex], 
                    template_header_media: data.url,
                    template_header_type: headerFormat || 'IMAGE'
                };
                setEditForm({ ...safeEditForm, followup_steps: s });
                showToast('✅ Mídia do cabeçalho enviada com sucesso!', 'success');
            }
        } catch (err) {
            console.error('Erro no upload de mídia do cabeçalho:', err);
            showToast(err.message || '❌ Erro ao enviar mídia. Tente novamente.', 'error');
        } finally {
            setUploadingHeaderMedia(false);
        }
    };

    const fetchZapvoiceTemplates = useCallback(async () => {
        setLoadingTemplates(true);
        try {
            let res;
            if (!isCreateMode && editingWebhook?.id) {
                res = await api.get(`/webhooks/${editingWebhook.id}/whatsapp-templates`);
            } else {
                const params = new URLSearchParams();
                if (safeEditForm.zapvoice_url) params.append('zapvoice_url', safeEditForm.zapvoice_url);
                if (safeEditForm.zapvoice_api_token) params.append('zapvoice_api_token', safeEditForm.zapvoice_api_token);
                if (safeEditForm.zapvoice_client_id) params.append('zapvoice_client_id', safeEditForm.zapvoice_client_id);
                res = await api.get(`/webhooks/zapvoice/templates?${params.toString()}`);
            }
            if (res.ok) {
                const data = await res.json();
                setZapvoiceTemplates(Array.isArray(data) ? data : []);
            }
        } catch (e) {
            console.error('Erro ao buscar templates do ZapVoice:', e);
        } finally {
            setLoadingTemplates(false);
        }
    }, [editingWebhook?.id, isCreateMode, safeEditForm.zapvoice_url, safeEditForm.zapvoice_api_token, safeEditForm.zapvoice_client_id]);

    useEffect(() => {
        if (editTab === 'geral' && geralSubTab === 'followup') {
            fetchZapvoiceTemplates();
        }
    }, [editTab, geralSubTab, fetchZapvoiceTemplates]);

    const fetchCwWebhooks = useCallback(async () => {
        if (isCreateMode || !editingWebhook?.id) return;
        setCwWebhooksLoading(true);
        setCwWebhooksError('');
        try {
            const res = await api.get(`/webhooks/${editingWebhook.id}/chatwoot-webhooks`);
            if (res.ok) {
                const data = await res.json();
                setCwWebhooks(data);
            } else {
                const errData = await res.json();
                setCwWebhooksError(errData.detail || 'Erro ao carregar webhooks');
            }
        } catch (err) {
            setCwWebhooksError('Erro ao conectar ao servidor');
        } finally {
            setCwWebhooksLoading(false);
        }
    }, [editingWebhook?.id, isCreateMode]);

    const handleCreateCwWebhook = async () => {
        if (isCreateMode || !editingWebhook?.id) return;
        setCreatingCwWebhook(true);
        try {
            const inboxId = safeEditForm.chatwoot_inbox_id ? parseInt(safeEditForm.chatwoot_inbox_id, 10) : null;
            const res = await api.post(`/webhooks/${editingWebhook.id}/chatwoot-webhooks`, {
                inbox_id: isNaN(inboxId) ? null : inboxId
            });
            if (res.ok) {
                showToast('Webhook criado no Chatwoot com sucesso!', 'success');
                fetchCwWebhooks();
            } else {
                const errData = await res.json();
                showToast(errData.detail || 'Erro ao criar webhook', 'error');
            }
        } catch (err) {
            showToast('Erro ao conectar ao servidor', 'error');
        } finally {
            setCreatingCwWebhook(false);
        }
    };

    const handleDeleteCwWebhook = async (cwWebhookId) => {
        try {
            const res = await api.delete(`/webhooks/${editingWebhook.id}/chatwoot-webhooks/${cwWebhookId}`);
            if (res.ok) {
                showToast('Webhook excluído do Chatwoot com sucesso!', 'success');
                fetchCwWebhooks();
            } else {
                const errData = await res.json();
                showToast(errData.detail || 'Erro ao excluir webhook', 'error');
            }
        } catch (err) {
            showToast('Erro ao conectar ao servidor', 'error');
        }
    };

    useEffect(() => {
        if (editTab === 'chatwoot' && !isCreateMode && editingWebhook?.id) {
            fetchCwWebhooks();
        }
    }, [editTab, editingWebhook?.id, isCreateMode, fetchCwWebhooks]);

    // Bloquear scroll ao montar o modal
    useEffect(() => {
        const originalStyle = window.getComputedStyle(document.body).overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = originalStyle; };
    }, []);

    let safeCwWebhooks = [];
    if (Array.isArray(cwWebhooks)) {
        safeCwWebhooks = cwWebhooks;
    } else if (cwWebhooks && typeof cwWebhooks === 'object') {
        if (cwWebhooks.payload) {
            if (Array.isArray(cwWebhooks.payload)) {
                safeCwWebhooks = cwWebhooks.payload;
            } else if (cwWebhooks.payload.webhooks && Array.isArray(cwWebhooks.payload.webhooks)) {
                safeCwWebhooks = cwWebhooks.payload.webhooks;
            }
        } else if (cwWebhooks.webhooks && Array.isArray(cwWebhooks.webhooks)) {
            safeCwWebhooks = cwWebhooks.webhooks;
        }
    }

    const targetPath = `/webhooks/receive/${safeEditForm.token || editingWebhook?.token}`;
    const platformCwWebhooks = safeCwWebhooks.filter(wh => wh && wh.url && wh.url.toLowerCase().includes(targetPath.toLowerCase()));

    const agentsList = agents || [];
    const labelsList = chatwootLabels || [];

    return (
        <div className="premium-modal-overlay">
            <div className="premium-modal-content">
                <div className="modal-header-premium">
                    <div className="header-info">
                        <span className="header-icon">{isCreateMode ? '✨' : '✏️'}</span>
                        <span className="header-title">{isCreateMode ? 'Nova Integração' : 'Editar Integração'}</span>
                    </div>
                </div>

                <div className="modal-body-wrapper">
                    <div className="modal-sidebar-premium">
                        <div className="tab-switcher-premium">
                            {[
                                { id: 'geral', label: 'Geral', icon: '⚙️' },
                                { id: 'agente', label: 'Agente IA', icon: '🤖' },
                                { id: 'memoria', label: 'Memória', icon: '🧠' },
                                { id: 'filtros', label: 'Segurança', icon: '🛡️' },
                                { id: 'zapvoice', label: 'ZapVoice', icon: '💬' }
                            ].map((t) => (
                                <button
                                    key={t.id}
                                    type="button"
                                    onClick={() => setEditTab(t.id)}
                                    className={`tab-btn ${editTab === t.id ? 'active' : ''}`}
                                >
                                    <span className="tab-icon">{t.icon}</span>
                                    {t.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="modal-main-content">
                        <form id="edit-webhook-form" onSubmit={isCreateMode ? handleCreate : handleEdit} className="modal-form-premium">
                            {editTab === 'geral' && (
                                <div className="tab-pane animate-fade-in">
                                    {/* Sub-Abas Superiores da Aba Geral */}
                                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '0.75rem' }}>
                                        <button
                                            type="button"
                                            onClick={() => setGeralSubTab('dados')}
                                            style={{
                                                background: geralSubTab === 'dados' ? 'rgba(99, 102, 241, 0.25)' : 'rgba(255, 255, 255, 0.03)',
                                                color: geralSubTab === 'dados' ? '#a5b4fc' : '#94a3b8',
                                                border: geralSubTab === 'dados' ? '1px solid #6366f1' : '1px solid rgba(255, 255, 255, 0.08)',
                                                padding: '0.45rem 0.9rem',
                                                borderRadius: '10px',
                                                fontSize: '0.78rem',
                                                fontWeight: 700,
                                                cursor: 'pointer',
                                                transition: 'all 0.2s',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.4rem'
                                            }}
                                        >
                                            ⚙️ Identificação
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setGeralSubTab('comportamento')}
                                            style={{
                                                background: geralSubTab === 'comportamento' ? 'rgba(99, 102, 241, 0.25)' : 'rgba(255, 255, 255, 0.03)',
                                                color: geralSubTab === 'comportamento' ? '#a5b4fc' : '#94a3b8',
                                                border: geralSubTab === 'comportamento' ? '1px solid #6366f1' : '1px solid rgba(255, 255, 255, 0.08)',
                                                padding: '0.45rem 0.9rem',
                                                borderRadius: '10px',
                                                fontSize: '0.78rem',
                                                fontWeight: 700,
                                                cursor: 'pointer',
                                                transition: 'all 0.2s',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.4rem'
                                            }}
                                        >
                                            ⚡ Comportamento & Envio
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setGeralSubTab('followup')}
                                            style={{
                                                background: geralSubTab === 'followup' ? 'rgba(99, 102, 241, 0.25)' : 'rgba(255, 255, 255, 0.03)',
                                                color: geralSubTab === 'followup' ? '#a5b4fc' : '#94a3b8',
                                                border: geralSubTab === 'followup' ? '1px solid #6366f1' : '1px solid rgba(255, 255, 255, 0.08)',
                                                padding: '0.45rem 0.9rem',
                                                borderRadius: '10px',
                                                fontSize: '0.78rem',
                                                fontWeight: 700,
                                                cursor: 'pointer',
                                                transition: 'all 0.2s',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.4rem'
                                            }}
                                        >
                                            🔄 Follow-Up Automático
                                        </button>
                                    </div>

                                    {/* SUB-ABA 1: IDENTIFICAÇÃO BÁSICA */}
                                    {geralSubTab === 'dados' && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                            <div className="form-group-premium">
                                                <label className="premium-label">Nome da Integração *</label>
                                                <input
                                                    type="text"
                                                    value={safeEditForm.name}
                                                    onChange={e => setEditForm({ ...safeEditForm, name: e.target.value })}
                                                    required
                                                    className="premium-input"
                                                    placeholder="Ex: WhatsApp Vendas"
                                                />
                                            </div>

                                            <div className="form-group-premium">
                                                <label className="premium-label">🔗 Slug da URL / Token *</label>
                                                <p className="premium-help-text">Personalize o final da URL de integração.</p>
                                                <input type="text" value={safeEditForm.token}
                                                    onChange={e => setEditForm({ ...safeEditForm, token: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '') })}
                                                    className="premium-input"
                                                    placeholder="whatsapp"
                                                />
                                            </div>

                                            <div className="form-group-premium">
                                                <label className="premium-label">Tabela de Leads *</label>
                                                <div className="input-group-addon">
                                                    <span className="addon-text">postgres /</span>
                                                    <input
                                                        type="text"
                                                        value={safeEditForm.leads_table}
                                                        onChange={e => setEditForm({ ...safeEditForm, leads_table: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') })}
                                                        required
                                                        className="premium-input-transparent"
                                                        placeholder="leads"
                                                    />
                                                </div>
                                            </div>

                                            <div className="form-group-premium">
                                                <label className="premium-label">Descrição</label>
                                                <input
                                                    type="text"
                                                    value={safeEditForm.description}
                                                    onChange={e => setEditForm({ ...safeEditForm, description: e.target.value })}
                                                    placeholder="Opcional"
                                                    className="premium-input"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* SUB-ABA 2: COMPORTAMENTO & ENVIO */}
                                    {geralSubTab === 'comportamento' && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                            <div className="media-controls-premium">
                                                <div className="control-item">
                                                    <div className="control-info">
                                                        <div className="control-title">🎙️ Áudios</div>
                                                        <div className="control-desc">Transcrição automática</div>
                                                    </div>
                                                    <button type="button"
                                                        onClick={() => setEditForm({ ...safeEditForm, process_audio: !safeEditForm.process_audio })}
                                                        className={`premium-switch ${safeEditForm.process_audio ? 'active' : ''}`}
                                                    >
                                                        <div className="switch-knob" />
                                                    </button>
                                                </div>

                                                <div className="control-item">
                                                    <div className="control-info">
                                                        <div className="control-title">🖼️ Imagens</div>
                                                        <div className="control-desc">Análise de visão</div>
                                                    </div>
                                                    <button type="button"
                                                        onClick={() => setEditForm({ ...safeEditForm, process_image: !safeEditForm.process_image })}
                                                        className={`premium-switch ${safeEditForm.process_image ? 'active' : ''}`}
                                                    >
                                                        <div className="switch-knob" />
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="control-item" style={{ padding: '1rem', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                                                <div className="control-info">
                                                    <div className="control-title">🤐 Modo Silencioso (Desativar IA)</div>
                                                    <div className="control-desc">Salva contatos e histórico na memória, mas bloqueia o envio de respostas da IA</div>
                                                </div>
                                                <button type="button"
                                                    onClick={() => setEditForm({ ...safeEditForm, disable_ai_responses: !safeEditForm.disable_ai_responses })}
                                                    className={`premium-switch ${safeEditForm.disable_ai_responses ? 'active' : ''}`}
                                                >
                                                    <div className="switch-knob" />
                                                </button>
                                            </div>

                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                                <div className="form-group-premium">
                                                    <label className="premium-label">⏳ Debounce (s)</label>
                                                    <input type="number" min="0" max="3600" value={safeEditForm.delay_seconds}
                                                        onChange={e => setEditForm({ ...safeEditForm, delay_seconds: e.target.value })}
                                                        className="premium-input"
                                                    />
                                                </div>
                                                <div className="form-group-premium">
                                                    <label className="premium-label">⏱️ Resposta (s)</label>
                                                    <input type="number" min="0" max="120" value={safeEditForm.response_delay_seconds ?? 0}
                                                        onChange={e => setEditForm({ ...safeEditForm, response_delay_seconds: e.target.value })}
                                                        className="premium-input"
                                                    />
                                                </div>
                                            </div>

                                            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--wh-border)', borderRadius: '16px', padding: '1.25rem' }}>
                                                <div className="control-item">
                                                    <div className="control-info">
                                                        <div className="control-title">✂️ Quebrar Resposta em Mensagens</div>
                                                        <div className="control-desc">
                                                            {safeEditForm.split_response_enabled
                                                                ? 'Ativado: a resposta é dividida por quebras de linha e enviada em várias mensagens.'
                                                                : 'Desativado: a resposta é enviada completa em uma única mensagem.'}
                                                        </div>
                                                    </div>
                                                    <button type="button"
                                                        onClick={() => setEditForm({ ...safeEditForm, split_response_enabled: !safeEditForm.split_response_enabled })}
                                                        className={`premium-switch ${safeEditForm.split_response_enabled ? 'active' : ''}`}
                                                    >
                                                        <div className="switch-knob" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* SUB-ABA 3: FOLLOW-UP AUTOMÁTICO */}
                                    {geralSubTab === 'followup' && (
                                        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--wh-border)', borderRadius: '16px', padding: '1.25rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: safeEditForm.followup_enabled ? '1rem' : 0 }}>
                                                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>🔁 Follow-Up Automático</div>
                                                <button type="button"
                                                    onClick={() => setEditForm({ ...safeEditForm, followup_enabled: !safeEditForm.followup_enabled })}
                                                    className={`premium-switch ${safeEditForm.followup_enabled ? 'active' : ''}`}
                                                >
                                                    <div className="switch-knob" />
                                                </button>
                                            </div>

                                            {safeEditForm.followup_enabled && (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                                                    {/* NAVEGAÇÃO DE ABAS DOS PASSOS DE FOLLOW-UP */}
                                                    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.65rem' }}>
                                                        {safeEditForm.followup_steps.map((stepItem, idx) => {
                                                            const isActive = activeFollowupStepTab === idx;
                                                            const unitLabel = stepItem.unit === 'days' ? 'd' : stepItem.unit === 'hours' ? 'h' : 'min';
                                                            const valStr = stepItem.value || stepItem.delay_minutes || 30;

                                                            return (
                                                                <button
                                                                    key={idx}
                                                                    type="button"
                                                                    onClick={() => setActiveFollowupStepTab(idx)}
                                                                    style={{
                                                                        padding: '0.45rem 0.85rem',
                                                                        borderRadius: '8px',
                                                                        fontSize: '0.78rem',
                                                                        fontWeight: 700,
                                                                        cursor: 'pointer',
                                                                        border: isActive ? '1px solid #6366f1' : '1px solid rgba(255,255,255,0.08)',
                                                                        background: isActive ? 'rgba(99, 102, 241, 0.22)' : 'rgba(15, 23, 42, 0.4)',
                                                                        color: isActive ? '#a5b4fc' : '#94a3b8',
                                                                        boxShadow: isActive ? '0 0 12px rgba(99,102,241,0.2)' : 'none',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        gap: '0.4rem',
                                                                        transition: 'all 0.15s'
                                                                    }}
                                                                >
                                                                    <span>Passo #{idx + 1} ({valStr}{unitLabel})</span>
                                                                </button>
                                                            );
                                                        })}

                                                        {/* BOTÃO NOVO PASSO */}
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const newSteps = [...safeEditForm.followup_steps, { delay_minutes: 30, unit: 'minutes', value: 30, type: 'ai', custom_prompt: '', fixed_message: '', media_type: 'none', media_url: '' }];
                                                                setEditForm({ ...safeEditForm, followup_steps: newSteps });
                                                                setActiveFollowupStepTab(newSteps.length - 1);
                                                            }}
                                                            style={{
                                                                padding: '0.45rem 0.75rem',
                                                                borderRadius: '8px',
                                                                fontSize: '0.78rem',
                                                                fontWeight: 700,
                                                                cursor: 'pointer',
                                                                border: '1px dashed #6366f1',
                                                                background: 'rgba(99, 102, 241, 0.08)',
                                                                color: '#818cf8',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '0.3rem',
                                                                transition: 'all 0.15s'
                                                            }}
                                                        >
                                                            ➕ Novo Passo
                                                        </button>
                                                    </div>

                                                    {/* CARD DO PASSO SELECIONADO NA ABA */}
                                                    {safeEditForm.followup_steps.length > 0 && (() => {
                                                        const i = Math.min(activeFollowupStepTab, safeEditForm.followup_steps.length - 1);
                                                        const st = safeEditForm.followup_steps[i];
                                                        if (!st) return null;

                                                        let totalMinutes = st.delay_minutes !== undefined 
                                                            ? parseInt(st.delay_minutes) 
                                                            : (parseFloat(st.delay_hours || 0) * 60);

                                                        if (isNaN(totalMinutes) || totalMinutes < 0) totalMinutes = 30;

                                                        let stepUnit = st.unit || 'minutes';
                                                        let stepVal = st.value || 30;

                                                        const updateFollowupStep = (newValue, newUnit) => {
                                                            const val = Math.max(1, parseInt(newValue) || 1);
                                                            let mins = val;
                                                            if (newUnit === 'hours') mins = val * 60;
                                                            else if (newUnit === 'days') mins = val * 1440;

                                                            const s = [...safeEditForm.followup_steps];
                                                            s[i] = {
                                                                ...s[i],
                                                                delay_minutes: mins,
                                                                unit: newUnit,
                                                                value: val
                                                            };
                                                            setEditForm({ ...safeEditForm, followup_steps: s });
                                                        };

                                                        const stepType = st.type || 'ai';
                                                        const updateStepProperty = (prop, val) => {
                                                            const s = [...safeEditForm.followup_steps];
                                                            s[i] = { ...s[i], [prop]: val };
                                                            setEditForm({ ...safeEditForm, followup_steps: s });
                                                        };

                                                        return (
                                                            <div key={i} style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '1rem 1.1rem', borderRadius: '12px', border: '1px solid var(--wh-border)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem' }}>
                                                                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                                                        <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#6366f1', background: 'rgba(99, 102, 241, 0.15)', padding: '4px 10px', borderRadius: '6px' }}>Passo #{i+1}</span>
                                                                        <input 
                                                                            type="number" 
                                                                            min="1" 
                                                                            value={stepVal} 
                                                                            onChange={e => updateFollowupStep(e.target.value, stepUnit)} 
                                                                            className="premium-input" 
                                                                            style={{ width: '75px', padding: '0.4rem 0.5rem', textAlign: 'center', fontWeight: 600, fontSize: '0.85rem' }} 
                                                                        />
                                                                        <select 
                                                                            value={stepUnit} 
                                                                            onChange={e => updateFollowupStep(stepVal, e.target.value)} 
                                                                            className="premium-input" 
                                                                            style={{ width: '110px', padding: '0.4rem 0.5rem', fontSize: '0.8rem', background: '#0f172a', color: '#f8fafc', border: '1px solid #334155', borderRadius: '8px', cursor: 'pointer' }}
                                                                        >
                                                                            <option value="minutes">Minutos</option>
                                                                            <option value="hours">Horas</option>
                                                                            <option value="days">Dias</option>
                                                                        </select>
                                                                        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>de atraso</span>
                                                                    </div>
                                                                    {safeEditForm.followup_steps.length > 1 && (
                                                                        <button 
                                                                            type="button" 
                                                                            onClick={() => {
                                                                                setConfirmRemoveFU({ modal: 'edit', index: i });
                                                                                setActiveFollowupStepTab(Math.max(0, i - 1));
                                                                            }} 
                                                                            style={{ color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', border: 'none', borderRadius: '6px', fontSize: '0.78rem', cursor: 'pointer', padding: '5px 10px', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                                                                        >
                                                                            ✕ Excluir Passo
                                                                        </button>
                                                                    )}
                                                                </div>

                                                                {/* Seletor de Modo: IA Contextual vs Mensagem Fixa */}
                                                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.2rem' }}>
                                                                    <button 
                                                                        type="button" 
                                                                        onClick={() => updateStepProperty('type', 'ai')}
                                                                        style={{
                                                                            padding: '0.4rem 0.85rem',
                                                                            borderRadius: '6px',
                                                                            fontSize: '0.75rem',
                                                                            fontWeight: 600,
                                                                            cursor: 'pointer',
                                                                            border: stepType === 'ai' ? '1px solid #6366f1' : '1px solid rgba(255,255,255,0.08)',
                                                                            background: stepType === 'ai' ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                                                                            color: stepType === 'ai' ? '#818cf8' : '#94a3b8',
                                                                            transition: 'all 0.15s'
                                                                        }}
                                                                    >
                                                                        🤖 IA Contextual
                                                                    </button>
                                                                    <button 
                                                                        type="button" 
                                                                        onClick={() => updateStepProperty('type', 'fixed')}
                                                                        style={{
                                                                            padding: '0.4rem 0.85rem',
                                                                            borderRadius: '6px',
                                                                            fontSize: '0.75rem',
                                                                            fontWeight: 600,
                                                                            cursor: 'pointer',
                                                                            border: stepType === 'fixed' ? '1px solid #a855f7' : '1px solid rgba(255,255,255,0.08)',
                                                                            background: stepType === 'fixed' ? 'rgba(168, 85, 247, 0.2)' : 'transparent',
                                                                            color: stepType === 'fixed' ? '#c084fc' : '#94a3b8',
                                                                            transition: 'all 0.15s'
                                                                        }}
                                                                    >
                                                                        📝 Mensagem Fixa
                                                                    </button>
                                                                    <button 
                                                                        type="button" 
                                                                        onClick={() => {
                                                                            updateStepProperty('type', 'whatsapp_template');
                                                                            if (zapvoiceTemplates.length === 0) fetchZapvoiceTemplates();
                                                                        }}
                                                                        style={{
                                                                            padding: '0.4rem 0.85rem',
                                                                            borderRadius: '6px',
                                                                            fontSize: '0.75rem',
                                                                            fontWeight: 600,
                                                                            cursor: 'pointer',
                                                                            border: stepType === 'whatsapp_template' ? '1px solid #10b981' : '1px solid rgba(255,255,255,0.08)',
                                                                            background: stepType === 'whatsapp_template' ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                                                                            color: stepType === 'whatsapp_template' ? '#34d399' : '#94a3b8',
                                                                            transition: 'all 0.15s'
                                                                        }}
                                                                    >
                                                                        📱 Template WhatsApp (API Oficial)
                                                                    </button>
                                                                </div>

                                                                {/* Conteúdo do Passo */}
                                                                {stepType === 'ai' && (
                                                                    <div style={{ marginTop: '0.2rem' }}>
                                                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                                                                            <label className="premium-label" style={{ fontSize: '0.7rem', color: '#818cf8', margin: 0 }}>
                                                                                🧠 Diretriz Específica do Passo (Prompt da IA)
                                                                            </label>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => setFullscreenModal({
                                                                                    isOpen: true,
                                                                                    title: `🧠 Prompt de IA - Passo #${i + 1}`,
                                                                                    subtitle: 'Edite as instruções detalhadas que a IA usará para gerar a mensagem deste follow-up',
                                                                                    value: st.custom_prompt || '',
                                                                                    onChange: (v) => updateStepProperty('custom_prompt', v),
                                                                                    placeholder: 'Ex: Retome o assunto focando em tirar dúvidas sobre o checkout...',
                                                                                    accentColor: '#6366f1'
                                                                                })}
                                                                                style={{
                                                                                    background: 'rgba(99, 102, 241, 0.12)',
                                                                                    border: '1px solid rgba(99, 102, 241, 0.3)',
                                                                                    color: '#a5b4fc',
                                                                                    padding: '0.2rem 0.55rem',
                                                                                    borderRadius: '6px',
                                                                                    fontSize: '0.68rem',
                                                                                    fontWeight: 600,
                                                                                    cursor: 'pointer',
                                                                                    display: 'flex',
                                                                                    alignItems: 'center',
                                                                                    gap: '0.3rem',
                                                                                    transition: 'all 0.15s'
                                                                                }}
                                                                            >
                                                                                ⛶ Tela Cheia
                                                                            </button>
                                                                        </div>
                                                                        <textarea 
                                                                            placeholder="Ex: Retome o assunto focando em tirar dúvidas sobre o checkout..." 
                                                                            value={st.custom_prompt || ''} 
                                                                            onChange={e => updateStepProperty('custom_prompt', e.target.value)} 
                                                                            className="premium-input" 
                                                                            style={{ minHeight: '60px', fontSize: '0.8rem', resize: 'vertical' }}
                                                                        />
                                                                    </div>
                                                                )}

                                                                {stepType === 'fixed' && (
                                                                    <div style={{ marginTop: '0.2rem' }}>
                                                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                                                                            <label className="premium-label" style={{ fontSize: '0.7rem', color: '#c084fc', margin: 0 }}>
                                                                                📝 Template de Mensagem Fixa
                                                                            </label>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => setFullscreenModal({
                                                                                    isOpen: true,
                                                                                    title: `📝 Mensagem Fixa - Passo #${i + 1}`,
                                                                                    subtitle: 'Edite o texto pré-definido enviado neste passo de follow-up',
                                                                                    value: st.fixed_message || '',
                                                                                    onChange: (v) => updateStepProperty('fixed_message', v),
                                                                                    variables: ['{nome}', '{primeiro_nome}', '{telefone}'],
                                                                                    placeholder: 'Ex: Olá {nome}! Vi que você não finalizou o pedido. Caso precise de ajuda, é só me chamar!',
                                                                                    accentColor: '#a855f7'
                                                                                })}
                                                                                style={{
                                                                                    background: 'rgba(168, 85, 247, 0.12)',
                                                                                    border: '1px solid rgba(168, 85, 247, 0.3)',
                                                                                    color: '#d8b4fe',
                                                                                    padding: '0.2rem 0.55rem',
                                                                                    borderRadius: '6px',
                                                                                    fontSize: '0.68rem',
                                                                                    fontWeight: 600,
                                                                                    cursor: 'pointer',
                                                                                    display: 'flex',
                                                                                    alignItems: 'center',
                                                                                    gap: '0.3rem',
                                                                                    transition: 'all 0.15s'
                                                                                }}
                                                                            >
                                                                                ⛶ Tela Cheia
                                                                            </button>
                                                                        </div>
                                                                        <textarea 
                                                                            placeholder="Ex: Olá {nome}! Vi que você não finalizou o pedido. Caso precise de ajuda, é só me chamar!" 
                                                                            value={st.fixed_message || ''} 
                                                                            onChange={e => updateStepProperty('fixed_message', e.target.value)} 
                                                                            className="premium-input" 
                                                                            style={{ minHeight: '65px', fontSize: '0.8rem', resize: 'vertical' }}
                                                                        />
                                                                        <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.35rem', flexWrap: 'wrap', alignItems: 'center' }}>
                                                                            <span style={{ fontSize: '0.65rem', color: '#64748b' }}>Variáveis:</span>
                                                                            <code onClick={() => updateStepProperty('fixed_message', (st.fixed_message || '') + ' {nome}')} style={{ fontSize: '0.65rem', color: '#c084fc', background: 'rgba(168,85,247,0.1)', padding: '1px 5px', borderRadius: '4px', cursor: 'pointer' }}>{`{nome}`}</code>
                                                                            <code onClick={() => updateStepProperty('fixed_message', (st.fixed_message || '') + ' {primeiro_nome}')} style={{ fontSize: '0.65rem', color: '#c084fc', background: 'rgba(168,85,247,0.1)', padding: '1px 5px', borderRadius: '4px', cursor: 'pointer' }}>{`{primeiro_nome}`}</code>
                                                                            <code onClick={() => updateStepProperty('fixed_message', (st.fixed_message || '') + ' {telefone}')} style={{ fontSize: '0.65rem', color: '#c084fc', background: 'rgba(168,85,247,0.1)', padding: '1px 5px', borderRadius: '4px', cursor: 'pointer' }}>{`{telefone}`}</code>
                                                                        </div>
                                                                    </div>
                                                                )}

                                                                {stepType === 'whatsapp_template' && (() => {
                                                                    const filteredTemplates = zapvoiceTemplates.filter(t => 
                                                                        !templateSearchTerm || t.name.toLowerCase().includes(templateSearchTerm.toLowerCase())
                                                                    );
                                                                    const selectedTpl = zapvoiceTemplates.find(t => t.name === st.template_name);
                                                                    const bodyComp = selectedTpl?.components?.find(c => c.type === 'BODY');
                                                                    const headerComp = selectedTpl?.components?.find(c => c.type === 'HEADER');
                                                                    
                                                                    // Extração de variáveis {{1}}, {{2}}
                                                                    const bodyMatches = Array.from(new Set(Array.from((bodyComp?.text || '').matchAll(/\{\{(\d+)\}\}/g)).map(m => m[1]))).sort((a,b) => Number(a)-Number(b));
                                                                    const headerMatches = headerComp?.format === 'TEXT' ? Array.from(new Set(Array.from((headerComp?.text || '').matchAll(/\{\{(\d+)\}\}/g)).map(m => m[1]))).sort((a,b) => Number(a)-Number(b)) : [];
                                                                    const isHeaderMedia = headerComp && ['IMAGE', 'VIDEO', 'DOCUMENT'].includes(headerComp.format);

                                                                    const updateVariable = (key, value) => {
                                                                        const currentVars = st.template_variables || {};
                                                                        const nextVars = { ...currentVars, [key]: value };
                                                                        updateStepProperty('template_variables', nextVars);
                                                                    };

                                                                    // Gerar texto simulado para pré-visualização
                                                                    let previewText = bodyComp?.text || 'Template oficial selecionado';
                                                                    bodyMatches.forEach(varNum => {
                                                                        const val = st.template_variables?.[`body_${varNum}`] || `{{${varNum}}}`;
                                                                        previewText = previewText.replaceAll(`{{${varNum}}}`, `[${val}]`);
                                                                    });

                                                                    return (
                                                                        <div style={{ marginTop: '0.2rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                                                            {/* Cabeçalho com Sincronizar e Contagem */}
                                                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                                                <label className="premium-label" style={{ fontSize: '0.7rem', color: '#34d399', margin: 0 }}>
                                                                                    📱 Template Oficial Meta/WhatsApp (ZapVoice)
                                                                                </label>
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={fetchZapvoiceTemplates}
                                                                                    disabled={loadingTemplates}
                                                                                    style={{
                                                                                        background: 'rgba(52, 211, 153, 0.12)',
                                                                                        border: '1px solid rgba(52, 211, 153, 0.3)',
                                                                                        color: '#34d399',
                                                                                        padding: '0.2rem 0.55rem',
                                                                                        borderRadius: '6px',
                                                                                        fontSize: '0.68rem',
                                                                                        fontWeight: 600,
                                                                                        cursor: 'pointer',
                                                                                        display: 'flex',
                                                                                        alignItems: 'center',
                                                                                        gap: '0.3rem',
                                                                                        transition: 'all 0.15s'
                                                                                    }}
                                                                                >
                                                                                    {loadingTemplates ? '⏳ Atualizando...' : '🔄 Sincronizar Templates'}
                                                                                </button>
                                                                            </div>

                                                                            {/* Campo de Busca / Filtro de Templates */}
                                                                            <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                                                                                <div style={{ position: 'relative', flex: 1 }}>
                                                                                    <input
                                                                                        type="text"
                                                                                        placeholder="🔍 Filtrar templates pelo nome..."
                                                                                        value={templateSearchTerm}
                                                                                        onChange={e => setTemplateSearchTerm(e.target.value)}
                                                                                        className="premium-input"
                                                                                        style={{ fontSize: '0.78rem', padding: '0.35rem 0.6rem', paddingLeft: '1.8rem' }}
                                                                                    />
                                                                                    <span style={{ position: 'absolute', left: '0.55rem', top: '50%', transform: 'translateY(-50%)', fontSize: '0.75rem', opacity: 0.5 }}>
                                                                                        🔍
                                                                                    </span>
                                                                                </div>
                                                                                {templateSearchTerm && (
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => setTemplateSearchTerm('')}
                                                                                        style={{
                                                                                            background: 'rgba(255,255,255,0.06)',
                                                                                            border: '1px solid rgba(255,255,255,0.1)',
                                                                                            color: '#94a3b8',
                                                                                            padding: '0.35rem 0.6rem',
                                                                                            borderRadius: '6px',
                                                                                            fontSize: '0.72rem',
                                                                                            cursor: 'pointer'
                                                                                        }}
                                                                                    >
                                                                                        Limpar
                                                                                    </button>
                                                                                )}
                                                                            </div>

                                                                            {/* Select de Templates Filtrados */}
                                                                            <select
                                                                                value={st.template_name || ''}
                                                                                onChange={(e) => {
                                                                                    const selected = zapvoiceTemplates.find(t => t.name === e.target.value);
                                                                                    const nextStep = { 
                                                                                        ...st, 
                                                                                        template_name: e.target.value,
                                                                                        language: selected?.language || 'pt_BR',
                                                                                        template_components: selected?.components || [],
                                                                                        template_header_type: selected?.components?.find(c => c.type === 'HEADER')?.format || 'TEXT',
                                                                                        template_variables: st.template_variables || {},
                                                                                        template_header_media: st.template_header_media || ''
                                                                                    };
                                                                                    const newSteps = [...safeEditForm.followup_steps];
                                                                                    newSteps[i] = nextStep;
                                                                                    setEditForm({ ...safeEditForm, followup_steps: newSteps });
                                                                                }}
                                                                                className="premium-input"
                                                                                style={{ fontSize: '0.8rem', padding: '0.4rem 0.6rem' }}
                                                                            >
                                                                                <option value="">-- Selecione um Template Aprovado ({filteredTemplates.length} disponíveis) --</option>
                                                                                {filteredTemplates.map((tpl, tIdx) => (
                                                                                    <option key={tIdx} value={tpl.name}>
                                                                                        {tpl.name} ({tpl.language || 'pt_BR'}) {tpl.status ? `• ${tpl.status}` : ''}
                                                                                    </option>
                                                                                ))}
                                                                            </select>

                                                                            {/* Configuração de Mídia do Cabeçalho (se o template exigir) */}
                                                                            {isHeaderMedia && (
                                                                                <div style={{ padding: '0.75rem', background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.25)', borderRadius: '10px' }}>
                                                                                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#60a5fa', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                                                        <span>🖼️ Mídia do Cabeçalho (Header: {headerComp.format})</span>
                                                                                    </div>
                                                                                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                                                                        <input
                                                                                            type="text"
                                                                                            placeholder={`URL da ${headerComp.format.toLowerCase()} (ex: https://...)`}
                                                                                            value={st.template_header_media || ''}
                                                                                            onChange={e => updateStepProperty('template_header_media', e.target.value)}
                                                                                            className="premium-input"
                                                                                            style={{ flex: 1, fontSize: '0.78rem' }}
                                                                                        />
                                                                                        <label style={{
                                                                                            background: uploadingHeaderMedia ? '#64748b' : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                                                                                            color: '#fff',
                                                                                            padding: '0.4rem 0.75rem',
                                                                                            borderRadius: '6px',
                                                                                            fontSize: '0.75rem',
                                                                                            fontWeight: 600,
                                                                                            cursor: uploadingHeaderMedia ? 'not-allowed' : 'pointer',
                                                                                            display: 'flex',
                                                                                            alignItems: 'center',
                                                                                            gap: '0.3rem',
                                                                                            whiteSpace: 'nowrap'
                                                                                        }}>
                                                                                            {uploadingHeaderMedia ? '⏳ Enviando...' : '📁 Upload'}
                                                                                            <input
                                                                                                type="file"
                                                                                                accept={headerComp.format === 'VIDEO' ? 'video/*' : headerComp.format === 'DOCUMENT' ? '.pdf,.doc,.docx' : 'image/*'}
                                                                                                style={{ display: 'none' }}
                                                                                                disabled={uploadingHeaderMedia}
                                                                                                onChange={e => e.target.files?.[0] && handleUploadHeaderMedia(i, e.target.files[0], headerComp.format)}
                                                                                            />
                                                                                        </label>
                                                                                    </div>
                                                                                </div>
                                                                            )}

                                                                            {/* Configuração de Variáveis do Cabeçalho de Texto */}
                                                                            {headerMatches.length > 0 && (
                                                                                <div style={{ padding: '0.75rem', background: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.25)', borderRadius: '10px' }}>
                                                                                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#a5b4fc', marginBottom: '0.4rem' }}>
                                                                                        🏷️ Variáveis do Cabeçalho (Header)
                                                                                    </div>
                                                                                    {headerMatches.map((varNum) => (
                                                                                        <div key={varNum} style={{ marginBottom: '0.4rem' }}>
                                                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                                                                                                <span style={{ fontSize: '0.7rem', color: '#cbd5e1' }}>Variável {`{{${varNum}}}`}:</span>
                                                                                                <div style={{ display: 'flex', gap: '0.3rem' }}>
                                                                                                    <code onClick={() => updateVariable(`header_${varNum}`, '{primeiro_nome}')} style={{ fontSize: '0.62rem', color: '#a5b4fc', background: 'rgba(99,102,241,0.15)', padding: '1px 4px', borderRadius: '4px', cursor: 'pointer' }}>+ {'{primeiro_nome}'}</code>
                                                                                                    <code onClick={() => updateVariable(`header_${varNum}`, '{nome}')} style={{ fontSize: '0.62rem', color: '#a5b4fc', background: 'rgba(99,102,241,0.15)', padding: '1px 4px', borderRadius: '4px', cursor: 'pointer' }}>+ {'{nome}'}</code>
                                                                                                </div>
                                                                                            </div>
                                                                                            <input
                                                                                                type="text"
                                                                                                placeholder="Digite o valor ou selecione uma tag..."
                                                                                                value={st.template_variables?.[`header_${varNum}`] || ''}
                                                                                                onChange={e => updateVariable(`header_${varNum}`, e.target.value)}
                                                                                                className="premium-input"
                                                                                                style={{ fontSize: '0.78rem', padding: '0.35rem 0.55rem' }}
                                                                                            />
                                                                                        </div>
                                                                                    ))}
                                                                                </div>
                                                                            )}

                                                                            {/* Configuração de Variáveis do Corpo (Body) */}
                                                                            {bodyMatches.length > 0 && (
                                                                                <div style={{ padding: '0.75rem', background: 'rgba(168, 85, 247, 0.08)', border: '1px solid rgba(168, 85, 247, 0.25)', borderRadius: '10px' }}>
                                                                                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#d8b4fe', marginBottom: '0.4rem' }}>
                                                                                        🏷️ Variáveis do Corpo (Body)
                                                                                    </div>
                                                                                    {bodyMatches.map((varNum) => (
                                                                                        <div key={varNum} style={{ marginBottom: '0.45rem' }}>
                                                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                                                                                                <span style={{ fontSize: '0.7rem', color: '#cbd5e1' }}>Variável {`{{${varNum}}}`}:</span>
                                                                                                <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                                                                                                    <code onClick={() => updateVariable(`body_${varNum}`, '{primeiro_nome}')} style={{ fontSize: '0.62rem', color: '#c084fc', background: 'rgba(168,85,247,0.15)', padding: '1px 4px', borderRadius: '4px', cursor: 'pointer' }}>+ {'{primeiro_nome}'}</code>
                                                                                                    <code onClick={() => updateVariable(`body_${varNum}`, '{nome}')} style={{ fontSize: '0.62rem', color: '#c084fc', background: 'rgba(168,85,247,0.15)', padding: '1px 4px', borderRadius: '4px', cursor: 'pointer' }}>+ {'{nome}'}</code>
                                                                                                    <code onClick={() => updateVariable(`body_${varNum}`, '{telefone}')} style={{ fontSize: '0.62rem', color: '#c084fc', background: 'rgba(168,85,247,0.15)', padding: '1px 4px', borderRadius: '4px', cursor: 'pointer' }}>+ {'{telefone}'}</code>
                                                                                                </div>
                                                                                            </div>
                                                                                            <input
                                                                                                type="text"
                                                                                                placeholder="Digite o valor ou selecione uma tag..."
                                                                                                value={st.template_variables?.[`body_${varNum}`] || ''}
                                                                                                onChange={e => updateVariable(`body_${varNum}`, e.target.value)}
                                                                                                className="premium-input"
                                                                                                style={{ fontSize: '0.78rem', padding: '0.35rem 0.55rem' }}
                                                                                            />
                                                                                        </div>
                                                                                    ))}
                                                                                </div>
                                                                            )}

                                                                            {/* Pré-visualização do Template com Variáveis Substituídas */}
                                                                            {st.template_name && (
                                                                                <div style={{ padding: '0.75rem', background: 'rgba(16, 185, 129, 0.06)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '10px' }}>
                                                                                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#34d399', marginBottom: '0.35rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                                        <span>👁️ Prévia em Tempo Real: <strong>{st.template_name}</strong></span>
                                                                                        <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>Idioma: {st.language || 'pt_BR'}</span>
                                                                                    </div>
                                                                                    <div style={{ fontSize: '0.78rem', color: '#f1f5f9', whiteSpace: 'pre-wrap', lineHeight: '1.45', background: '#070a10', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                                                                                        {previewText}
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    );
                                                                })()}
                                                                
                                                                {/* Seção de Mídia e Áudio Humanizado */}
                                                                <div style={{ marginTop: '0.5rem', borderTop: '1px dashed rgba(255,255,255,0.08)', paddingTop: '0.6rem' }}>
                                                                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#34d399', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                                                        🎙️ Anexo de Mídia / Áudio Humanizado (Opcional)
                                                                    </div>
                                                                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
                                                                        <select 
                                                                            value={st.media_type || 'none'} 
                                                                            onChange={e => updateStepProperty('media_type', e.target.value)} 
                                                                            className="premium-input" 
                                                                            style={{ width: '170px', padding: '0.4rem 0.5rem', fontSize: '0.78rem', background: '#0f172a', color: '#f8fafc', border: '1px solid #334155', borderRadius: '6px' }}
                                                                        >
                                                                            <option value="none">🚫 Sem Mídia</option>
                                                                            <option value="audio">🎙️ Áudio Humanizado (PTT)</option>
                                                                            <option value="image">🖼️ Imagem / Prova Social</option>
                                                                            <option value="document">📄 Documento / PDF</option>
                                                                        </select>
                                                                        
                                                                        {st.media_type && st.media_type !== 'none' && (
                                                                            <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flex: 1, minWidth: '220px' }}>
                                                                                <input 
                                                                                    type="text" 
                                                                                    placeholder="https://servidor.com/audio-passo.mp3" 
                                                                                    value={st.media_url || ''} 
                                                                                    onChange={e => updateStepProperty('media_url', e.target.value)} 
                                                                                    className="premium-input" 
                                                                                    style={{ flex: 1, padding: '0.4rem 0.5rem', fontSize: '0.78rem' }} 
                                                                                />
                                                                                <label 
                                                                                    style={{
                                                                                        padding: '0.4rem 0.75rem',
                                                                                        borderRadius: '6px',
                                                                                        background: 'rgba(52, 211, 153, 0.15)',
                                                                                        border: '1px solid #34d399',
                                                                                        color: '#34d399',
                                                                                        fontSize: '0.75rem',
                                                                                        fontWeight: 600,
                                                                                        cursor: uploadingMediaIndex === i ? 'wait' : 'pointer',
                                                                                        whiteSpace: 'nowrap',
                                                                                        display: 'flex',
                                                                                        alignItems: 'center',
                                                                                        gap: '0.3rem',
                                                                                        transition: 'all 0.15s'
                                                                                    }}
                                                                                >
                                                                                    {uploadingMediaIndex === i ? '⏳ Enviando...' : '📁 Upload Mídia'}
                                                                                    <input 
                                                                                        type="file" 
                                                                                        onChange={e => e.target.files && e.target.files[0] && handleUploadStepMedia(i, e.target.files[0])} 
                                                                                        accept={st.media_type === 'audio' ? 'audio/*' : st.media_type === 'image' ? 'image/*' : '*/*'}
                                                                                        style={{ display: 'none' }}
                                                                                        disabled={uploadingMediaIndex === i}
                                                                                    />
                                                                                </label>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    {st.media_type && st.media_type !== 'none' && st.media_url && (
                                                                        <div style={{ marginTop: '0.6rem', padding: '0.6rem', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                                                                            <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginBottom: '0.35rem', fontWeight: 600 }}>
                                                                                👁️ Pré-visualização da Mídia:
                                                                            </div>
                                                                            {st.media_type === 'audio' && (
                                                                                <audio controls src={st.media_url} style={{ width: '100%', height: '36px' }} />
                                                                            )}
                                                                            {st.media_type === 'image' && (
                                                                                <div style={{ display: 'flex', justifyContent: 'center' }}>
                                                                                    <img 
                                                                                        src={st.media_url} 
                                                                                        alt="Preview da Mídia" 
                                                                                        style={{ maxWidth: '100%', maxHeight: '160px', borderRadius: '6px', objectFit: 'contain', border: '1px solid rgba(255,255,255,0.1)' }} 
                                                                                        onError={(e) => { e.target.style.display = 'none'; }}
                                                                                    />
                                                                                </div>
                                                                            )}
                                                                            {st.media_type === 'document' && (
                                                                                <a href={st.media_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.75rem', color: '#38bdf8', textDecoration: 'underline', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                                                                                    📄 Abrir Documento em nova aba 🔗
                                                                                </a>
                                                                            )}
                                                                        </div>
                                                                    )}

                                                                    {st.media_type && st.media_type !== 'none' && (
                                                                        <p style={{ margin: '0.4rem 0 0 0', fontSize: '0.68rem', color: '#64748b' }}>
                                                                            No WhatsApp, áudios serão reproduzidos como voz gravada na hora (PTT). Você pode colar uma URL pública ou fazer upload direto do arquivo.
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })()}
                                                </div>
                                            )}

                                            {/* Janela de Envio & Proteção Não Perturbe */}
                                            <div style={{ marginTop: '1.25rem', background: 'rgba(15, 23, 42, 0.4)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', padding: '1rem' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: (safeEditForm.followup_business_hours?.enabled ?? false) ? '1rem' : 0 }}>
                                                    <div>
                                                        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                            🌙 Proteção "Não Perturbe" & Janela Comercial
                                                        </div>
                                                        <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.72rem', color: '#64748b' }}>
                                                            Reagenda disparos noturnos para o primeiro minuto da janela comercial seguinte (ex: 08:00 AM).
                                                        </p>
                                                    </div>
                                                    <button type="button"
                                                        onClick={() => {
                                                            const currentBh = safeEditForm.followup_business_hours || { enabled: false, start: '08:00', end: '20:00', weekdays: true, saturday: false, sunday: false };
                                                            setEditForm({ ...safeEditForm, followup_business_hours: { ...currentBh, enabled: !currentBh.enabled } });
                                                        }}
                                                        className={`premium-switch ${(safeEditForm.followup_business_hours?.enabled ?? false) ? 'active' : ''}`}
                                                    >
                                                        <div className="switch-knob" />
                                                    </button>
                                                </div>

                                                {(safeEditForm.followup_business_hours?.enabled ?? false) && (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                                            <div className="form-group-premium">
                                                                <label className="premium-label" style={{ fontSize: '0.7rem' }}>Início da Janela (Permitido)</label>
                                                                <input 
                                                                    type="time" 
                                                                    value={safeEditForm.followup_business_hours?.start || '08:00'} 
                                                                    onChange={e => {
                                                                        const currentBh = safeEditForm.followup_business_hours || {};
                                                                        setEditForm({ ...safeEditForm, followup_business_hours: { ...currentBh, start: e.target.value } });
                                                                    }}
                                                                    className="premium-input"
                                                                />
                                                            </div>
                                                            <div className="form-group-premium">
                                                                <label className="premium-label" style={{ fontSize: '0.7rem' }}>Fim da Janela (Bloqueia Noturno)</label>
                                                                <input 
                                                                    type="time" 
                                                                    value={safeEditForm.followup_business_hours?.end || '20:00'} 
                                                                    onChange={e => {
                                                                        const currentBh = safeEditForm.followup_business_hours || {};
                                                                        setEditForm({ ...safeEditForm, followup_business_hours: { ...currentBh, end: e.target.value } });
                                                                    }}
                                                                    className="premium-input"
                                                                />
                                                            </div>
                                                        </div>

                                                        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                                                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: '#cbd5e1', cursor: 'pointer' }}>
                                                                <input 
                                                                    type="checkbox" 
                                                                    checked={safeEditForm.followup_business_hours?.weekdays ?? true} 
                                                                    onChange={e => {
                                                                        const currentBh = safeEditForm.followup_business_hours || {};
                                                                        setEditForm({ ...safeEditForm, followup_business_hours: { ...currentBh, weekdays: e.target.checked } });
                                                                    }}
                                                                />
                                                                Seg a Sex
                                                            </label>

                                                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: '#cbd5e1', cursor: 'pointer' }}>
                                                                <input 
                                                                    type="checkbox" 
                                                                    checked={safeEditForm.followup_business_hours?.saturday ?? false} 
                                                                    onChange={e => {
                                                                        const currentBh = safeEditForm.followup_business_hours || {};
                                                                        setEditForm({ ...safeEditForm, followup_business_hours: { ...currentBh, saturday: e.target.checked } });
                                                                    }}
                                                                />
                                                                Sáb
                                                            </label>

                                                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: '#cbd5e1', cursor: 'pointer' }}>
                                                                <input 
                                                                    type="checkbox" 
                                                                    checked={safeEditForm.followup_business_hours?.sunday ?? false} 
                                                                    onChange={e => {
                                                                        const currentBh = safeEditForm.followup_business_hours || {};
                                                                        setEditForm({ ...safeEditForm, followup_business_hours: { ...currentBh, sunday: e.target.checked } });
                                                                    }}
                                                                />
                                                                Dom
                                                            </label>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Gatilhos Inteligentes & Cancelamento Automático */}
                                            <div style={{ marginTop: '1rem', background: 'rgba(15, 23, 42, 0.4)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', padding: '1rem' }}>
                                                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#a855f7', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.35rem' }}>
                                                    🎯 Gatilhos Inteligentes & Regras de Etiquetas (Smart Triggers)
                                                </div>
                                                <p style={{ margin: '0 0 0.85rem 0', fontSize: '0.72rem', color: '#94a3b8' }}>
                                                    Organize as regras de etiquetas do ZapVoice em abas para desativar, filtrar ou marcar conversas durante o ciclo de follow-up.
                                                </p>

                                                {/* Sub-abas de Etiquetas */}
                                                <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1rem', background: 'rgba(0, 0, 0, 0.25)', padding: '4px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                                                    <button
                                                        type="button"
                                                        onClick={() => setSmartTriggerTab('cancel')}
                                                        style={{
                                                            flex: 1,
                                                            padding: '0.45rem 0.6rem',
                                                            borderRadius: '6px',
                                                            fontSize: '0.72rem',
                                                            fontWeight: 600,
                                                            cursor: 'pointer',
                                                            transition: 'all 0.2s ease',
                                                            border: smartTriggerTab === 'cancel' ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid transparent',
                                                            background: smartTriggerTab === 'cancel' ? 'rgba(239, 68, 68, 0.15)' : 'transparent',
                                                            color: smartTriggerTab === 'cancel' ? '#f87171' : '#94a3b8',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            gap: '0.35rem'
                                                        }}
                                                    >
                                                        <span>🚫</span> Desativar / Cancelar
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() => setSmartTriggerTab('required')}
                                                        style={{
                                                            flex: 1,
                                                            padding: '0.45rem 0.6rem',
                                                            borderRadius: '6px',
                                                            fontSize: '0.72rem',
                                                            fontWeight: 600,
                                                            cursor: 'pointer',
                                                            transition: 'all 0.2s ease',
                                                            border: smartTriggerTab === 'required' ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid transparent',
                                                            background: smartTriggerTab === 'required' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                                                            color: smartTriggerTab === 'required' ? '#38bdf8' : '#94a3b8',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            gap: '0.35rem'
                                                        }}
                                                    >
                                                        <span>📌</span> Ativar (Requisito)
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() => setSmartTriggerTab('add')}
                                                        style={{
                                                            flex: 1,
                                                            padding: '0.45rem 0.6rem',
                                                            borderRadius: '6px',
                                                            fontSize: '0.72rem',
                                                            fontWeight: 600,
                                                            cursor: 'pointer',
                                                            transition: 'all 0.2s ease',
                                                            border: smartTriggerTab === 'add' ? '1px solid rgba(168, 85, 247, 0.4)' : '1px solid transparent',
                                                            background: smartTriggerTab === 'add' ? 'rgba(168, 85, 247, 0.15)' : 'transparent',
                                                            color: smartTriggerTab === 'add' ? '#c084fc' : '#94a3b8',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            gap: '0.35rem'
                                                        }}
                                                    >
                                                        <span>🏷️</span> Pós-Envio (Aplicar)
                                                    </button>
                                                </div>

                                                {/* Conteúdo da Aba 1: Cancelamento */}
                                                {smartTriggerTab === 'cancel' && (
                                                    <div className="form-group-premium" style={{ animation: 'fadeIn 0.2s ease' }}>
                                                        <label className="premium-label" style={{ fontSize: '0.7rem', color: '#ef4444' }}>
                                                            🚫 Etiqueta(s) para Desativar 100% o Follow-up
                                                        </label>
                                                        <LabelMultiSelect 
                                                            selected={
                                                                Array.isArray(safeEditForm.followup_cancel_label) 
                                                                    ? safeEditForm.followup_cancel_label 
                                                                    : (safeEditForm.followup_cancel_label || '').split(',').map(s => s.trim()).filter(Boolean)
                                                            } 
                                                            options={labelsList} 
                                                            onChange={selectedArr => setEditForm({ ...safeEditForm, followup_cancel_label: selectedArr.join(', ') })} 
                                                            accentColor="#ef4444" 
                                                            placeholder="Selecione ou busque etiquetas no ZapVoice..."
                                                        />
                                                        <p className="premium-help-text" style={{ marginTop: '0.35rem', fontSize: '0.68rem' }}>
                                                            Clique no campo para abrir o dropdown de etiquetas sincronizadas do ZapVoice. Se a conversa tiver qualquer uma dessas etiquetas, o ciclo de follow-up é cancelado imediatamente.
                                                        </p>
                                                    </div>
                                                )}

                                                {/* Conteúdo da Aba 2: Requisito Obrigatório */}
                                                {smartTriggerTab === 'required' && (
                                                    <div className="form-group-premium" style={{ animation: 'fadeIn 0.2s ease' }}>
                                                        <label className="premium-label" style={{ fontSize: '0.7rem', color: '#38bdf8' }}>
                                                            📌 Etiqueta Obrigatória para Ativar Follow-up (Opcional)
                                                        </label>
                                                        <LabelSingleSelect 
                                                            selected={safeEditForm.followup_required_label || ''} 
                                                            options={labelsList} 
                                                            onChange={selectedVal => setEditForm({ ...safeEditForm, followup_required_label: selectedVal })} 
                                                            accentColor="#38bdf8" 
                                                            placeholder="Selecione a etiqueta no ZapVoice..."
                                                        />
                                                        <p className="premium-help-text" style={{ marginTop: '0.35rem', fontSize: '0.68rem' }}>
                                                            Se preenchido, apenas contatos que tiverem esta etiqueta ativa no ZapVoice receberão os disparos de follow-up.
                                                        </p>
                                                    </div>
                                                )}

                                                {/* Conteúdo da Aba 3: Adicionar Pós-Envio */}
                                                {smartTriggerTab === 'add' && (
                                                    <div className="form-group-premium" style={{ animation: 'fadeIn 0.2s ease' }}>
                                                        <label className="premium-label" style={{ fontSize: '0.7rem', color: '#a855f7' }}>
                                                            🏷️ Etiqueta a Adicionar ao Enviar o Follow-up (ZapVoice)
                                                        </label>
                                                        <LabelSingleSelect 
                                                            selected={safeEditForm.followup_add_label || ''} 
                                                            options={labelsList} 
                                                            onChange={selectedVal => setEditForm({ ...safeEditForm, followup_add_label: selectedVal })} 
                                                            accentColor="#a855f7" 
                                                            placeholder="Selecione a etiqueta no ZapVoice..."
                                                        />
                                                        <p className="premium-help-text" style={{ marginTop: '0.35rem', fontSize: '0.68rem' }}>
                                                            Esta etiqueta será aplicada automaticamente na conversa do cliente no chat do ZapVoice no momento em que a mensagem de follow-up for enviada.
                                                        </p>
                                                    </div>
                                                )}

                                                {/* Comportamento ao Receber Resposta do Cliente */}
                                                <div style={{ marginTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.85rem' }}>
                                                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#38bdf8', marginBottom: '0.45rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                                        <span>⚡</span> Comportamento ao Receber Resposta do Lead:
                                                    </div>
                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                                                        <div 
                                                            onClick={() => setEditForm({ ...safeEditForm, followup_on_reply: 'stop' })}
                                                            style={{
                                                                padding: '0.65rem 0.75rem',
                                                                borderRadius: '8px',
                                                                border: (safeEditForm.followup_on_reply || 'stop') === 'stop' ? '1px solid #10b981' : '1px solid rgba(255,255,255,0.08)',
                                                                background: (safeEditForm.followup_on_reply || 'stop') === 'stop' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(0,0,0,0.2)',
                                                                cursor: 'pointer',
                                                                transition: 'all 0.15s'
                                                            }}
                                                        >
                                                            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: (safeEditForm.followup_on_reply || 'stop') === 'stop' ? '#34d399' : '#e2e8f0' }}>
                                                                🛑 Encerrar Follow-Up
                                                            </div>
                                                            <div style={{ fontSize: '0.66rem', color: '#94a3b8', marginTop: '3px', lineHeight: '1.2' }}>
                                                                (Recomendado) Meta atingida! O lead engajou e não recebe mais mensagens da régua.
                                                            </div>
                                                        </div>

                                                        <div 
                                                            onClick={() => setEditForm({ ...safeEditForm, followup_on_reply: 'continue_next' })}
                                                            style={{
                                                                padding: '0.65rem 0.75rem',
                                                                borderRadius: '8px',
                                                                border: safeEditForm.followup_on_reply === 'continue_next' ? '1px solid #3b82f6' : '1px solid rgba(255,255,255,0.08)',
                                                                background: safeEditForm.followup_on_reply === 'continue_next' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(0,0,0,0.2)',
                                                                cursor: 'pointer',
                                                                transition: 'all 0.15s'
                                                            }}
                                                        >
                                                            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: safeEditForm.followup_on_reply === 'continue_next' ? '#60a5fa' : '#e2e8f0' }}>
                                                                ⏭️ Avançar sem Repetir
                                                            </div>
                                                            <div style={{ fontSize: '0.66rem', color: '#94a3b8', marginTop: '3px', lineHeight: '1.2' }}>
                                                                Se o lead silenciar de novo, avança para a próxima etapa sem nunca repetir a anterior.
                                                            </div>
                                                        </div>

                                                        <div 
                                                            onClick={() => setEditForm({ ...safeEditForm, followup_on_reply: 'restart' })}
                                                            style={{
                                                                padding: '0.65rem 0.75rem',
                                                                borderRadius: '8px',
                                                                border: safeEditForm.followup_on_reply === 'restart' ? '1px solid #a855f7' : '1px solid rgba(255,255,255,0.08)',
                                                                background: safeEditForm.followup_on_reply === 'restart' ? 'rgba(168, 85, 247, 0.15)' : 'rgba(0,0,0,0.2)',
                                                                cursor: 'pointer',
                                                                transition: 'all 0.15s'
                                                            }}
                                                        >
                                                            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: safeEditForm.followup_on_reply === 'restart' ? '#c084fc' : '#e2e8f0' }}>
                                                                🔄 Reiniciar Régua
                                                            </div>
                                                            <div style={{ fontSize: '0.66rem', color: '#94a3b8', marginTop: '3px', lineHeight: '1.2' }}>
                                                                Reinicia todos os passos do início a cada novo silêncio.
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem', marginTop: '0.85rem' }}>
                                                    <div style={{ background: 'rgba(34, 197, 94, 0.08)', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
                                                        <div style={{ fontSize: '0.73rem', fontWeight: 700, color: '#4ade80' }}>🛒 Confirmação de Venda</div>
                                                        <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '2px' }}>Quando o pagamento for confirmado via webhook, os follow-ups são encerrados imediatamente.</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {editTab === 'agente' && (
                                <AgentTabSection
                                    safeEditForm={safeEditForm}
                                    setEditForm={setEditForm}
                                    agentsList={agentsList}
                                    handleGenerateDescription={handleGenerateDescription}
                                />
                            )}

                            {editTab === 'filtros' && (
                                <div className="tab-pane animate-fade-in">
                                    {/* Sub-Abas Superiores da Aba Segurança */}
                                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '0.75rem' }}>
                                        <button
                                            type="button"
                                            onClick={() => setSegurancaSubTab('permitidos')}
                                            style={{
                                                background: segurancaSubTab === 'permitidos' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                                                color: segurancaSubTab === 'permitidos' ? '#4ade80' : '#94a3b8',
                                                border: segurancaSubTab === 'permitidos' ? '1px solid #22c55e' : '1px solid rgba(255, 255, 255, 0.08)',
                                                padding: '0.45rem 0.9rem',
                                                borderRadius: '10px',
                                                fontSize: '0.78rem',
                                                fontWeight: 700,
                                                cursor: 'pointer',
                                                transition: 'all 0.2s',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.4rem'
                                            }}
                                        >
                                            ✅ Contatos Permitidos
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setSegurancaSubTab('bloqueadas')}
                                            style={{
                                                background: segurancaSubTab === 'bloqueadas' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                                                color: segurancaSubTab === 'bloqueadas' ? '#f87171' : '#94a3b8',
                                                border: segurancaSubTab === 'bloqueadas' ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.08)',
                                                padding: '0.45rem 0.9rem',
                                                borderRadius: '10px',
                                                fontSize: '0.78rem',
                                                fontWeight: 700,
                                                cursor: 'pointer',
                                                transition: 'all 0.2s',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.4rem'
                                            }}
                                        >
                                            🚫 Mensagens Bloqueadas
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setSegurancaSubTab('exclusao')}
                                            style={{
                                                background: segurancaSubTab === 'exclusao' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                                                color: segurancaSubTab === 'exclusao' ? '#fbbf24' : '#94a3b8',
                                                border: segurancaSubTab === 'exclusao' ? '1px solid #f59e0b' : '1px solid rgba(255, 255, 255, 0.08)',
                                                padding: '0.45rem 0.9rem',
                                                borderRadius: '10px',
                                                fontSize: '0.78rem',
                                                fontWeight: 700,
                                                cursor: 'pointer',
                                                transition: 'all 0.2s',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.4rem'
                                            }}
                                        >
                                            🗑️ Exclusão de Contatos
                                        </button>
                                    </div>

                                    {/* SUB-ABA 1: CONTATOS PERMITIDOS */}
                                    {segurancaSubTab === 'permitidos' && (
                                        <AllowedContactsSection
                                            contacts={safeEditForm.allowed_contacts || []}
                                            inputValue={editAllowedInput || ''}
                                            onInputChange={setEditAllowedInput}
                                            onAdd={() => {
                                                const v = normalizeContact(editAllowedInput);
                                                if (v && !(safeEditForm.allowed_contacts || []).includes(v)) {
                                                    setEditForm({ ...safeEditForm, allowed_contacts: [...(safeEditForm.allowed_contacts || []), v] });
                                                }
                                                setEditAllowedInput('');
                                            }}
                                            onRemove={(c) => setEditForm({ ...safeEditForm, allowed_contacts: (safeEditForm.allowed_contacts || []).filter(x => x !== c) })}
                                        />
                                    )}

                                    {/* SUB-ABA 2: MENSAGENS BLOQUEADAS */}
                                    {segurancaSubTab === 'bloqueadas' && (
                                        <BlockedMessagesSection
                                            messages={safeEditForm.blocked_messages || []}
                                            inputValue={editBlockedInput || ''}
                                            onInputChange={setEditBlockedInput}
                                            onAdd={() => {
                                                const v = editBlockedInput.trim();
                                                if (v && !(safeEditForm.blocked_messages || []).includes(v)) {
                                                    setEditForm({ ...safeEditForm, blocked_messages: [...(safeEditForm.blocked_messages || []), v] });
                                                }
                                                setEditBlockedInput('');
                                            }}
                                            onRemove={(msg) => setEditForm({ ...safeEditForm, blocked_messages: (safeEditForm.blocked_messages || []).filter(m => m !== msg) })}
                                        />
                                    )}

                                    {/* SUB-ABA 3: EXCLUSÃO DE CONTATOS */}
                                    {segurancaSubTab === 'exclusao' && (
                                        <DeleteKeywordsSection
                                            keywords={safeEditForm.delete_keywords || []}
                                            farewellMessage={safeEditForm.delete_message || ''}
                                            onMessageChange={(v) => setEditForm({ ...safeEditForm, delete_message: v })}
                                            inputValue={editDeleteInput || ''}
                                            onInputChange={setEditDeleteInput}
                                            onAdd={() => {
                                                const v = editDeleteInput.trim();
                                                if (v && !(safeEditForm.delete_keywords || []).includes(v)) {
                                                    setEditForm({ ...safeEditForm, delete_keywords: [...(safeEditForm.delete_keywords || []), v] });
                                                }
                                                setEditDeleteInput('');
                                            }}
                                            onRemove={(kw) => setEditForm({ ...safeEditForm, delete_keywords: (safeEditForm.delete_keywords || []).filter(k => k !== kw) })}
                                            deleteLabels={safeEditForm.delete_labels || []}
                                            onLabelsChange={v => setEditForm({ ...safeEditForm, delete_labels: v })}
                                            labelsList={labelsList}
                                        />
                                    )}
                                </div>
                            )}

                            {editTab === 'memoria' && (
                                <div className="tab-pane animate-fade-in">
                                    <MemorySection config={safeEditForm} setConfig={setEditForm} accentColor="#0ea5e9" />
                                </div>
                            )}

                            {editTab === 'zapvoice' && (
                                <div className="tab-pane animate-fade-in" style={{ display: 'flex', flexDirection: 'column' }}>
                                    {/* Sub-Abas Superiores da Aba ZapVoice */}
                                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '0.75rem', flexWrap: 'wrap' }}>
                                        <button
                                            type="button"
                                            onClick={() => setZapvoiceSubTab('credenciais')}
                                            style={{
                                                background: zapvoiceSubTab === 'credenciais' ? 'rgba(14, 165, 233, 0.25)' : 'rgba(255, 255, 255, 0.03)',
                                                color: zapvoiceSubTab === 'credenciais' ? '#38bdf8' : '#94a3b8',
                                                border: zapvoiceSubTab === 'credenciais' ? '1px solid #0ea5e9' : '1px solid rgba(255, 255, 255, 0.08)',
                                                padding: '0.45rem 0.9rem',
                                                borderRadius: '10px',
                                                fontSize: '0.78rem',
                                                fontWeight: 700,
                                                cursor: 'pointer',
                                                transition: 'all 0.2s',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.4rem'
                                            }}
                                        >
                                            🔑 Credenciais & Conexão
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setZapvoiceSubTab('etiquetas')}
                                            style={{
                                                background: zapvoiceSubTab === 'etiquetas' ? 'rgba(52, 211, 153, 0.25)' : 'rgba(255, 255, 255, 0.03)',
                                                color: zapvoiceSubTab === 'etiquetas' ? '#34d399' : '#94a3b8',
                                                border: zapvoiceSubTab === 'etiquetas' ? '1px solid #34d399' : '1px solid rgba(255, 255, 255, 0.08)',
                                                padding: '0.45rem 0.9rem',
                                                borderRadius: '10px',
                                                fontSize: '0.78rem',
                                                fontWeight: 700,
                                                cursor: 'pointer',
                                                transition: 'all 0.2s',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.4rem'
                                            }}
                                        >
                                            🏷️ Etiquetas Automáticas
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setZapvoiceSubTab('handoff')}
                                            style={{
                                                background: zapvoiceSubTab === 'handoff' ? 'rgba(236, 72, 153, 0.25)' : 'rgba(255, 255, 255, 0.03)',
                                                color: zapvoiceSubTab === 'handoff' ? '#f472b6' : '#94a3b8',
                                                border: zapvoiceSubTab === 'handoff' ? '1px solid #ec4899' : '1px solid rgba(255, 255, 255, 0.08)',
                                                padding: '0.45rem 0.9rem',
                                                borderRadius: '10px',
                                                fontSize: '0.78rem',
                                                fontWeight: 700,
                                                cursor: 'pointer',
                                                transition: 'all 0.2s',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.4rem'
                                            }}
                                        >
                                            🆘 Suporte & Handoff
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setZapvoiceSubTab('projeto')}
                                            style={{
                                                background: zapvoiceSubTab === 'projeto' ? 'rgba(168, 85, 247, 0.25)' : 'rgba(255, 255, 255, 0.03)',
                                                color: zapvoiceSubTab === 'projeto' ? '#c084fc' : '#94a3b8',
                                                border: zapvoiceSubTab === 'projeto' ? '1px solid #a855f7' : '1px solid rgba(255, 255, 255, 0.08)',
                                                padding: '0.45rem 0.9rem',
                                                borderRadius: '10px',
                                                fontSize: '0.78rem',
                                                fontWeight: 700,
                                                cursor: 'pointer',
                                                transition: 'all 0.2s',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.4rem'
                                            }}
                                        >
                                            📊 Assistente de Projeto
                                        </button>
                                    </div>

                                    {/* SUB-ABA 1: CREDENCIAIS & CONEXÃO */}
                                    {zapvoiceSubTab === 'credenciais' && (
                                        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--wh-border)', borderRadius: '16px', padding: '1.25rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                                                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#0ea5e922', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>🔑</div>
                                                <h4 style={{ margin: 0, fontSize: '0.9rem', color: '#fff' }}>Integração ZapVoice</h4>
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                                <div className="form-group-premium">
                                                    <label className="premium-label">URL do ZapVoice</label>
                                                    <input 
                                                        type="text" 
                                                        placeholder="Ex: https://api.zapvoice.com" 
                                                        value={safeEditForm.zapvoice_url || ''} 
                                                        onChange={e => setEditForm({ ...safeEditForm, zapvoice_url: e.target.value })} 
                                                        className="premium-input" 
                                                    />
                                                    <p className="premium-help-text" style={{ marginTop: '0.25rem', fontSize: '0.7rem' }}>
                                                        URL da API da sua instância do ZapVoice.
                                                    </p>
                                                </div>
                                                <div className="form-group-premium">
                                                    <label className="premium-label">API Token / Token de Acesso</label>
                                                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                                        <input 
                                                            type={showToken ? "text" : "password"} 
                                                            placeholder="Token do ZapVoice" 
                                                            value={safeEditForm.zapvoice_api_token || ''} 
                                                            onChange={e => setEditForm({ ...safeEditForm, zapvoice_api_token: e.target.value })} 
                                                            className="premium-input" 
                                                            style={{ paddingRight: '2.5rem', width: '100%' }}
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowToken(!showToken)}
                                                            style={{
                                                                position: 'absolute',
                                                                right: '0.75rem',
                                                                background: 'none',
                                                                border: 'none',
                                                                color: '#64748b',
                                                                cursor: 'pointer',
                                                                fontSize: '1rem',
                                                                padding: 0,
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center'
                                                            }}
                                                            title={showToken ? "Ocultar Token" : "Mostrar Token"}
                                                        >
                                                            {showToken ? "👁️" : "🙈"}
                                                        </button>
                                                    </div>
                                                    <p className="premium-help-text" style={{ marginTop: '0.25rem', fontSize: '0.7rem' }}>
                                                        Token secreto de autenticação da API.
                                                    </p>
                                                </div>
                                                <div className="form-group-premium">
                                                    <label className="premium-label">ID do Cliente (Client ID)</label>
                                                    <input 
                                                        type="text" 
                                                        placeholder="Ex: client_123" 
                                                        value={safeEditForm.zapvoice_client_id || ''} 
                                                        onChange={e => setEditForm({ ...safeEditForm, zapvoice_client_id: e.target.value })} 
                                                        className="premium-input" 
                                                    />
                                                    <p className="premium-help-text" style={{ marginTop: '0.25rem', fontSize: '0.7rem' }}>
                                                        Esse ID é usado para saber qual é o ID do cliente do ZapVoice que estamos utilizando neste exato momento.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* SUB-ABA 2: ETIQUETAS AUTOMÁTICAS */}
                                    {zapvoiceSubTab === 'etiquetas' && (
                                        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--wh-border)', borderRadius: '16px', padding: '1.25rem' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                                <label className="premium-label" style={{ margin: 0 }}>🏷️ Etiquetas Automáticas</label>
                                                {fetchChatwootLabels && (
                                                    <button
                                                        type="button"
                                                        onClick={() => fetchChatwootLabels({
                                                            zapvoice_url: safeEditForm.zapvoice_url,
                                                            zapvoice_api_token: safeEditForm.zapvoice_api_token,
                                                            zapvoice_client_id: safeEditForm.zapvoice_client_id
                                                        })}
                                                        className="btn-new-webhook"
                                                        style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem', background: 'rgba(52, 211, 153, 0.1)', border: '1px solid #34d399', color: '#34d399' }}
                                                    >
                                                        🔄 Sincronizar Etiquetas
                                                    </button>
                                                )}
                                            </div>
                                            {labelsLoading ? (
                                                <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '1rem' }}>⏳ Carregando etiquetas do ZapVoice...</p>
                                            ) : labelsList.length > 0 ? (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                                                    <div className="form-group-premium">
                                                        <label className="premium-label" style={{ color: '#34d399', fontSize: '0.65rem' }}>💬 Em cada mensagem</label>
                                                        <LabelMultiSelect
                                                            selected={safeEditForm.labels_on_message || []}
                                                            options={labelsList}
                                                            onChange={v => setEditForm({ ...safeEditForm, labels_on_message: v })}
                                                            accentColor="#34d399"
                                                        />
                                                    </div>
                                                    <div className="form-group-premium">
                                                        <label className="premium-label" style={{ color: '#ef4444', fontSize: '0.65rem' }}>🚫 Pausar se tiver etiqueta</label>
                                                        <LabelSingleSelect
                                                            selected={safeEditForm.ignore_by_label || ''}
                                                            options={labelsList}
                                                            onChange={v => setEditForm({ ...safeEditForm, ignore_by_label: v })}
                                                            accentColor="#ef4444"
                                                        />
                                                    </div>
                                                    <div className="form-group-premium">
                                                        <label className="premium-label" style={{ color: '#f59e0b', fontSize: '0.65rem' }}>👎 Feedback Negativo (1º emoji)</label>
                                                        <LabelSingleSelect
                                                            selected={safeEditForm.negative_feedback_label || ''}
                                                            options={labelsList}
                                                            onChange={v => setEditForm({ ...safeEditForm, negative_feedback_label: v })}
                                                            accentColor="#f59e0b"
                                                        />
                                                        <p className="premium-help-text" style={{ marginTop: '0.25rem', fontSize: '0.7rem' }}>
                                                            Esta etiqueta será aplicada ao contato no primeiro emoji negativo que ele enviar.
                                                        </p>
                                                    </div>
                                                    <div className="form-group-premium">
                                                        <label className="premium-label" style={{ color: '#f59e0b', fontSize: '0.65rem' }}>⏳ Remover após janela 24h expirar</label>
                                                        <LabelMultiSelect
                                                            selected={safeEditForm.window_close_label || []}
                                                            options={labelsList}
                                                            onChange={v => setEditForm({ ...safeEditForm, window_close_label: v })}
                                                            accentColor="#f59e0b"
                                                        />
                                                        <p className="premium-help-text" style={{ marginTop: '0.25rem', fontSize: '0.7rem' }}>
                                                            Esta etiqueta será removida automaticamente do contato no ZapVoice quando as 24 horas sem interação do cliente expirarem.
                                                        </p>
                                                    </div>
                                                </div>
                                            ) : safeEditForm.zapvoice_client_id ? (
                                                <p style={{ fontSize: '0.8rem', color: '#f59e0b', marginTop: '1rem' }}>
                                                    ⚠️ Nenhuma etiqueta encontrada nas conversas do ZapVoice (ID: {safeEditForm.zapvoice_client_id}). Adicione etiquetas nas suas conversas do ZapVoice ou clique em "Sincronizar Etiquetas" após preencher a URL e o Token acima.
                                                </p>
                                            ) : (
                                                <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '1rem' }}>
                                                    ℹ️ ZapVoice/Client ID não configurado.
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    {/* SUB-ABA 3: SUPORTE & HANDOFF */}
                                    {zapvoiceSubTab === 'handoff' && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                            {/* Suporte Humano */}
                                            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--wh-border)', borderRadius: '16px', padding: '1.25rem' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                                                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#ec489922', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>🆘</div>
                                                    <h4 style={{ margin: 0, fontSize: '0.9rem', color: '#fff' }}>Suporte Humano</h4>
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                                        <div className="form-group-premium">
                                                            <label className="premium-label" style={{ fontSize: '0.65rem' }}>Remover</label>
                                                            <LabelMultiSelect selected={safeEditForm.handoff_labels_to_remove || []} options={labelsList} onChange={v => setEditForm({ ...safeEditForm, handoff_labels_to_remove: v })} accentColor="#ef4444" />
                                                        </div>
                                                        <div className="form-group-premium">
                                                            <label className="premium-label" style={{ fontSize: '0.65rem' }}>Adicionar</label>
                                                            <LabelMultiSelect selected={safeEditForm.handoff_labels_to_add || []} options={labelsList} onChange={v => setEditForm({ ...safeEditForm, handoff_labels_to_add: v })} accentColor="#34d399" />
                                                        </div>
                                                    </div>
                                                    <div className="form-group-premium">
                                                        <label className="premium-label">Palavra-chave</label>
                                                        <input type="text" placeholder="#atendimento" value={safeEditForm.handoff_keyword || ''} onChange={e => setEditForm({ ...safeEditForm, handoff_keyword: e.target.value })} className="premium-input" />
                                                    </div>
                                                    <div className="form-group-premium">
                                                        <label className="premium-label">Mensagem</label>
                                                        <textarea placeholder="Mensagem de transição..." value={safeEditForm.handoff_message || ''} onChange={e => setEditForm({ ...safeEditForm, handoff_message: e.target.value })} className="premium-input" style={{ minHeight: '60px', resize: 'vertical' }} />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Retorno ao Robô */}
                                            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--wh-border)', borderRadius: '16px', padding: '1.25rem' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                                                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#34d39922', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>🤖</div>
                                                    <h4 style={{ margin: 0, fontSize: '0.9rem', color: '#fff' }}>Retorno ao Robô</h4>
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                                        <div className="form-group-premium">
                                                            <label className="premium-label" style={{ fontSize: '0.65rem' }}>Remover</label>
                                                            <LabelMultiSelect selected={safeEditForm.ai_handoff_labels_to_remove || []} options={labelsList} onChange={v => setEditForm({ ...safeEditForm, ai_handoff_labels_to_remove: v })} accentColor="#ef4444" />
                                                        </div>
                                                        <div className="form-group-premium">
                                                            <label className="premium-label" style={{ fontSize: '0.65rem' }}>Adicionar</label>
                                                            <LabelMultiSelect selected={safeEditForm.ai_handoff_labels_to_add || []} options={labelsList} onChange={v => setEditForm({ ...safeEditForm, ai_handoff_labels_to_add: v })} accentColor="#34d399" />
                                                        </div>
                                                    </div>
                                                    <div className="form-group-premium">
                                                        <label className="premium-label">Palavra-chave (Botão Finalizar)</label>
                                                        <input type="text" placeholder="#voltar" value={safeEditForm.ai_handoff_keyword || ''} onChange={e => setEditForm({ ...safeEditForm, ai_handoff_keyword: e.target.value })} className="premium-input" />
                                                    </div>
                                                    <div className="form-group-premium">
                                                        <label className="premium-label">Mensagem de Boas-vindas (Retorno)</label>
                                                        <textarea placeholder="Mensagem ao retomar atendimento..." value={safeEditForm.ai_handoff_message || ''} onChange={e => setEditForm({ ...safeEditForm, ai_handoff_message: e.target.value })} className="premium-input" style={{ minHeight: '60px', resize: 'vertical' }} />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* SUB-ABA 4: ASSISTENTE DE PROJETO */}
                                    {zapvoiceSubTab === 'projeto' && (
                                        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--wh-border)', borderRadius: '16px', padding: '1.25rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                                                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#a855f722', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>📊</div>
                                                <h4 style={{ margin: 0, fontSize: '0.9rem', color: '#fff' }}>Assistente de Projeto</h4>
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                                <div className="form-group-premium">
                                                    <label className="premium-label" style={{ color: '#a855f7', fontSize: '0.65rem' }}>Etiqueta do Assistente</label>
                                                    <LabelSingleSelect 
                                                        selected={safeEditForm.project_assistant_label || ''} 
                                                        options={labelsList} 
                                                        onChange={v => setEditForm({ ...safeEditForm, project_assistant_label: v })} 
                                                        accentColor="#a855f7" 
                                                    />
                                                    <p className="premium-help-text" style={{ marginTop: '0.25rem', fontSize: '0.7rem' }}>
                                                        Quando a conversa tiver esta etiqueta, o agente passa a atuar como Assistente de Projeto.
                                                    </p>
                                                </div>
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                                    <div className="form-group-premium">
                                                        <label className="premium-label">Palavra-chave (Ativar)</label>
                                                        <input type="text" placeholder="Ex: #projeto" value={safeEditForm.project_assistant_keyword || ''} onChange={e => setEditForm({ ...safeEditForm, project_assistant_keyword: e.target.value })} className="premium-input" />
                                                    </div>
                                                    <div className="form-group-premium">
                                                        <label className="premium-label">Palavra-chave (Desativar)</label>
                                                        <input type="text" placeholder="Ex: #sair_projeto" value={safeEditForm.project_assistant_deactivate_keyword || ''} onChange={e => setEditForm({ ...safeEditForm, project_assistant_deactivate_keyword: e.target.value })} className="premium-input" />
                                                    </div>
                                                </div>
                                                <div className="form-group-premium">
                                                    <label className="premium-label">Mensagem de Entrada</label>
                                                    <textarea placeholder="Mensagem enviada ao ativar o assistente..." value={safeEditForm.project_assistant_entry_message || ''} onChange={e => setEditForm({ ...safeEditForm, project_assistant_entry_message: e.target.value })} className="premium-input" style={{ minHeight: '60px', resize: 'vertical' }} />
                                                </div>
                                                <div className="form-group-premium">
                                                    <label className="premium-label">Mensagem de Saída</label>
                                                    <textarea placeholder="Mensagem enviada ao desativar o assistente..." value={safeEditForm.project_assistant_exit_message || ''} onChange={e => setEditForm({ ...safeEditForm, project_assistant_exit_message: e.target.value })} className="premium-input" style={{ minHeight: '60px', resize: 'vertical' }} />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {editError && <p className="toast-premium error" style={{ position: 'static', marginTop: '1rem' }}>{editError}</p>}
                        </form>
                    </div>
                </div>

                <div className="modal-footer-premium">
                    <button type="button" onClick={onClose} className="btn-action-edit">Cancelar</button>
                    <button 
                        type="submit" 
                        form="edit-webhook-form" 
                        disabled={editSaving} 
                        className="btn-new-webhook" 
                        style={{ padding: '0.75rem 2rem' }}
                    >
                        {editSaving ? (isCreateMode ? 'Criando...' : 'Salvando...') : (isCreateMode ? 'Criar Integração' : 'Salvar Alterações')}
                    </button>
                </div>
            </div>
            <FullscreenTextareaModal
                isOpen={fullscreenModal.isOpen}
                title={fullscreenModal.title}
                subtitle={fullscreenModal.subtitle}
                value={fullscreenModal.value}
                onChange={(val) => {
                    setFullscreenModal(prev => ({ ...prev, value: val }));
                    if (fullscreenModal.onChange) {
                        fullscreenModal.onChange(val);
                    }
                }}
                onClose={() => setFullscreenModal({ isOpen: false })}
                variables={fullscreenModal.variables || []}
                placeholder={fullscreenModal.placeholder}
                accentColor={fullscreenModal.accentColor || '#6366f1'}
            />
            <ConfirmModal
                type="cw-webhook"
                isOpen={cwWebhookToDelete !== null}
                onClose={() => setCwWebhookToDelete(null)}
                onConfirm={() => {
                    handleDeleteCwWebhook(cwWebhookToDelete);
                    setCwWebhookToDelete(null);
                }}
            />
        </div>
    );
};

export default EditWebhookModal;
