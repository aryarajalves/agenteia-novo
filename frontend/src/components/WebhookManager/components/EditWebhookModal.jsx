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
    const isCreateMode = editingWebhook?.id === 'new';

    const [cwWebhooks, setCwWebhooks] = useState([]);
    const [cwWebhooksLoading, setCwWebhooksLoading] = useState(false);
    const [cwWebhooksError, setCwWebhooksError] = useState('');
    const [creatingCwWebhook, setCreatingCwWebhook] = useState(false);
    const [cwWebhookToDelete, setCwWebhookToDelete] = useState(null);
    const [showToken, setShowToken] = useState(false);

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

                                    <div className="media-controls-premium" style={{ marginTop: '0.5rem' }}>
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

                                    <div className="control-item" style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
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

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
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

                                    <div style={{ marginTop: '1.25rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--wh-border)', borderRadius: '16px', padding: '1.25rem' }}>
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

                                    <div style={{ marginTop: '1.25rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--wh-border)', borderRadius: '16px', padding: '1.25rem' }}>
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
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                                <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>A IA enviará mensagens automáticas baseadas no contexto da conversa.</p>
                                                {safeEditForm.followup_steps.map((step, i) => (
                                                    <div key={i} style={{ background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '12px', border: '1px solid var(--wh-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                                                            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#6366f1' }}>#{i+1}</span>
                                                            <input type="number" value={Math.floor((step.delay_minutes || 0) / 60)} onChange={e => {
                                                                const s = [...safeEditForm.followup_steps];
                                                                s[i].delay_minutes = (parseInt(e.target.value) * 60) + (s[i].delay_minutes % 60);
                                                                setEditForm({ ...safeEditForm, followup_steps: s });
                                                            }} className="premium-input" style={{ width: '60px', padding: '0.4rem' }} />
                                                            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>horas de atraso</span>
                                                        </div>
                                                        <button type="button" onClick={() => setConfirmRemoveFU({ modal: 'edit', index: i })} style={{ color: '#ef4444', background: 'none', border: 'none', fontSize: '1rem', cursor: 'pointer', padding: '4px' }}>✕</button>
                                                    </div>
                                                ))}
                                                <button type="button" onClick={() => setEditForm({ ...safeEditForm, followup_steps: [...safeEditForm.followup_steps, { delay_minutes: 1440 }] })} className="btn-action-edit" style={{ fontSize: '0.75rem', padding: '0.5rem' }}>+ Novo Passo</button>
                                            </div>
                                        )}
                                    </div>
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

                                    <div style={{ height: '1.5rem' }} />

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

                                    <div style={{ height: '1.5rem' }} />

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
                                </div>
                            )}

                            {editTab === 'memoria' && (
                                <div className="tab-pane animate-fade-in">
                                    <MemorySection config={safeEditForm} setConfig={setEditForm} accentColor="#0ea5e9" />
                                </div>
                            )}

                            {editTab === 'zapvoice' && (
                                <div className="tab-pane animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                    {/* Configurações de Credenciais do ZapVoice */}
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

                                    {/* Configuração de Etiquetas */}
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

                                    {/* Assistente de Projeto */}
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
