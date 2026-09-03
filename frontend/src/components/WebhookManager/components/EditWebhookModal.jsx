import React, { useEffect, useState, useCallback } from 'react';
import MemorySection from './Common/MemorySection';
import AgentTabSection from './Common/AgentTabSection';
import { GeralTab, FollowupTab, SegurancaTab, ZapvoiceTab } from './EditWebhookTabs';
import { showToast } from '../utils/helpers';
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
        followup_cancel_label: '',
        followup_required_label: '',
        followup_add_label: '',
        followup_on_reply: 'stop',
        abandonment_delay_value: 24,
        abandonment_delay_unit: 'hours',
        purchased_label: '',
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

    // Bloquear scroll ao montar o modal
    useEffect(() => {
        const originalStyle = window.getComputedStyle(document.body).overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = originalStyle; };
    }, []);

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
                                <>
                                    <GeralTab
                                        safeEditForm={safeEditForm}
                                        setEditForm={setEditForm}
                                        geralSubTab={geralSubTab}
                                        setGeralSubTab={setGeralSubTab}
                                    />
                                    {geralSubTab === 'followup' && (
                                        <FollowupTab
                                            safeEditForm={safeEditForm}
                                            setEditForm={setEditForm}
                                            activeFollowupStepTab={activeFollowupStepTab}
                                            setActiveFollowupStepTab={setActiveFollowupStepTab}
                                            smartTriggerTab={smartTriggerTab}
                                            setSmartTriggerTab={setSmartTriggerTab}
                                            zapvoiceTemplates={zapvoiceTemplates}
                                            loadingTemplates={loadingTemplates}
                                            fetchZapvoiceTemplates={fetchZapvoiceTemplates}
                                            templateSearchTerm={templateSearchTerm}
                                            setTemplateSearchTerm={setTemplateSearchTerm}
                                            uploadingMediaIndex={uploadingMediaIndex}
                                            uploadingHeaderMedia={uploadingHeaderMedia}
                                            handleUploadStepMedia={handleUploadStepMedia}
                                            handleUploadHeaderMedia={handleUploadHeaderMedia}
                                            setFullscreenModal={setFullscreenModal}
                                            setConfirmRemoveFU={setConfirmRemoveFU}
                                            labelsList={labelsList}
                                        />
                                    )}
                                </>
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
                                <SegurancaTab
                                    safeEditForm={safeEditForm}
                                    setEditForm={setEditForm}
                                    segurancaSubTab={segurancaSubTab}
                                    setSegurancaSubTab={setSegurancaSubTab}
                                    editAllowedInput={editAllowedInput}
                                    setEditAllowedInput={setEditAllowedInput}
                                    editBlockedInput={editBlockedInput}
                                    setEditBlockedInput={setEditBlockedInput}
                                    editDeleteInput={editDeleteInput}
                                    setEditDeleteInput={setEditDeleteInput}
                                    labelsList={labelsList}
                                />
                            )}

                            {editTab === 'memoria' && (
                                <div className="tab-pane animate-fade-in">
                                    <MemorySection config={safeEditForm} setConfig={setEditForm} accentColor="#0ea5e9" />
                                </div>
                            )}

                            {editTab === 'zapvoice' && (
                                <ZapvoiceTab
                                    safeEditForm={safeEditForm}
                                    setEditForm={setEditForm}
                                    zapvoiceSubTab={zapvoiceSubTab}
                                    setZapvoiceSubTab={setZapvoiceSubTab}
                                    showToken={showToken}
                                    setShowToken={setShowToken}
                                    labelsList={labelsList}
                                    labelsLoading={labelsLoading}
                                    fetchChatwootLabels={fetchChatwootLabels}
                                />
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
        </div>
    );
};

export default EditWebhookModal;
