import React from 'react';
import FollowupStepCard from './FollowupStepCard';
import FollowupBusinessHours from './FollowupBusinessHours';
import FollowupSmartTriggers from './FollowupSmartTriggers';
import FollowupAbandonmentDelay from './FollowupAbandonmentDelay';

const FollowupTab = ({
    safeEditForm,
    setEditForm,
    activeFollowupStepTab,
    setActiveFollowupStepTab,
    smartTriggerTab,
    setSmartTriggerTab,
    zapvoiceTemplates = [],
    loadingTemplates = false,
    fetchZapvoiceTemplates,
    templateSearchTerm,
    setTemplateSearchTerm,
    uploadingMediaIndex,
    uploadingHeaderMedia,
    handleUploadStepMedia,
    handleUploadHeaderMedia,
    setFullscreenModal,
    setConfirmRemoveFU,
    labelsList = []
}) => {
    return (
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
                            const targetIcon = stepItem.target_audience === 'compradores' ? '🎉' : stepItem.target_audience === 'remarketing' ? '🎧' : (stepItem.target_audience === 'retentativas' || stepItem.type === 'whatsapp_template') ? '🔁' : '⚡';
                            const productBadge = stepItem.product_name ? ` • ${stepItem.product_name}` : '';

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
                                    <span>{targetIcon} Passo #{idx + 1} ({valStr}{unitLabel}){productBadge}</span>
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
                        return (
                            <FollowupStepCard
                                stepIndex={i}
                                stepItem={st}
                                safeEditForm={safeEditForm}
                                setEditForm={setEditForm}
                                setActiveFollowupStepTab={setActiveFollowupStepTab}
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
                            />
                        );
                    })()}
                </div>
            )}

            {/* Janela de Envio & Proteção Não Perturbe */}
            <FollowupBusinessHours
                safeEditForm={safeEditForm}
                setEditForm={setEditForm}
            />

            {/* Tempo Limite para Não Converteu / Desistiu */}
            <FollowupAbandonmentDelay
                safeEditForm={safeEditForm}
                setEditForm={setEditForm}
            />

            {/* Gatilhos Inteligentes & Cancelamento Automático */}
            <FollowupSmartTriggers
                safeEditForm={safeEditForm}
                setEditForm={setEditForm}
                smartTriggerTab={smartTriggerTab}
                setSmartTriggerTab={setSmartTriggerTab}
                labelsList={labelsList}
            />
        </div>
    );
};

export default FollowupTab;
