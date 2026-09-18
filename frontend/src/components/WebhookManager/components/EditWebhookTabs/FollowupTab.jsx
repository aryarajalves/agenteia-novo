import React, { useState } from 'react';
import FollowupStepCard from './FollowupStepCard';
import FollowupBusinessHours from './FollowupBusinessHours';
import FollowupSmartTriggers from './FollowupSmartTriggers';
import FollowupAbandonmentDelay from './FollowupAbandonmentDelay';
import FollowupFunnelsBar from './FollowupFunnelsBar';

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
    const [activeFollowupFunnelId, setActiveFollowupFunnelId] = useState('followup_default');
    const [activeFollowupSubTab, setActiveFollowupSubTab] = useState('steps');

    const stepsCount = safeEditForm.followup_steps?.length || 0;
    const isHoursEnabled = safeEditForm.followup_business_hours?.enabled ?? false;
    const crmDelayStr = `${safeEditForm.abandonment_delay_value ?? 24}${safeEditForm.abandonment_delay_unit === 'days' ? 'd' : safeEditForm.abandonment_delay_unit === 'minutes' ? 'min' : 'h'}`;

    const subTabs = [
        {
            id: 'steps',
            label: 'Passos & Esteiras',
            icon: '💬',
            badge: `${stepsCount} ${stepsCount === 1 ? 'passo' : 'passos'}`
        },
        {
            id: 'hours',
            label: 'Janela Comercial',
            icon: '🌙',
            badge: isHoursEnabled ? 'Ativa' : '24 Horas'
        },
        {
            id: 'triggers',
            label: 'Gatilhos Inteligentes',
            icon: '🎯',
            badge: safeEditForm.followup_on_reply === 'stop' ? 'Para ao Responder' : 'Contínuo'
        },
        {
            id: 'crm',
            label: 'Regras de CRM',
            icon: '🚪',
            badge: crmDelayStr
        }
    ];

    return (
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--wh-border)', borderRadius: '16px', padding: '1.25rem' }}>
            {/* CABEÇALHO COM CHAVE MESTRA */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: safeEditForm.followup_enabled ? '1.25rem' : 0,
                paddingBottom: safeEditForm.followup_enabled ? '0.85rem' : 0,
                borderBottom: safeEditForm.followup_enabled ? '1px solid rgba(255, 255, 255, 0.08)' : 'none'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <span style={{ fontSize: '1.2rem' }}>🔁</span>
                    <div>
                        <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#f8fafc', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Follow-Up Automático
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                            Configure réguas de mensagens sequenciais por produto, horários de envio e gatilhos de cancelamento.
                        </div>
                    </div>
                </div>
                <button
                    type="button"
                    data-testid="followup-master-switch"
                    onClick={() => setEditForm({ ...safeEditForm, followup_enabled: !safeEditForm.followup_enabled })}
                    className={`premium-switch ${safeEditForm.followup_enabled ? 'active' : ''}`}
                    title={safeEditForm.followup_enabled ? 'Desativar Follow-Up' : 'Ativar Follow-Up'}
                >
                    <div className="switch-knob" />
                </button>
            </div>

            {safeEditForm.followup_enabled && (
                <>
                    {/* SUB-ABAS DE ORGANIZAÇÃO INTERNA DO FOLLOW-UP (GRID 2x2 MODERNO) */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, 1fr)',
                        gap: '8px',
                        background: 'rgba(15, 23, 42, 0.65)',
                        padding: '8px',
                        borderRadius: '12px',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        marginBottom: '1.25rem'
                    }}>
                {subTabs.map((tab) => {
                    const isActive = activeFollowupSubTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            type="button"
                            data-testid={`followup-subtab-${tab.id}`}
                            onClick={() => setActiveFollowupSubTab(tab.id)}
                            style={{
                                padding: '10px 14px',
                                borderRadius: '8px',
                                border: isActive ? '1px solid #6366f1' : '1px solid rgba(255, 255, 255, 0.05)',
                                background: isActive ? 'rgba(99, 102, 241, 0.22)' : 'rgba(255, 255, 255, 0.02)',
                                color: isActive ? '#a5b4fc' : '#94a3b8',
                                fontWeight: 700,
                                fontSize: '0.82rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                transition: 'all 0.2s ease',
                                boxShadow: isActive ? '0 4px 12px rgba(99, 102, 241, 0.2)' : 'none'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '1.05rem' }}>{tab.icon}</span>
                                <span>{tab.label}</span>
                            </div>
                            {tab.badge && (
                                <span style={{
                                    background: isActive ? 'rgba(99, 102, 241, 0.4)' : 'rgba(255, 255, 255, 0.08)',
                                    padding: '2px 8px',
                                    borderRadius: '10px',
                                    fontSize: '0.7rem',
                                    fontWeight: 600,
                                    color: isActive ? '#fff' : '#cbd5e1'
                                }}>
                                    {tab.badge}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* CONTEÚDO DA ABA SELECIONADA */}
            {activeFollowupSubTab === 'steps' && (
                <div className="tab-pane animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    {/* BARRA DE SELEÇÃO DE FLUXOS DE FOLLOW-UP POR PRODUTO */}
                    <FollowupFunnelsBar
                        safeEditForm={safeEditForm}
                        setEditForm={setEditForm}
                        activeFollowupFunnelId={activeFollowupFunnelId}
                        setActiveFollowupFunnelId={setActiveFollowupFunnelId}
                        setActiveFollowupStepTab={setActiveFollowupStepTab}
                    />

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
                                const newStep = { delay_minutes: 30, unit: 'minutes', value: 30, type: 'ai', custom_prompt: '', fixed_message: '', media_type: 'none', media_url: '' };
                                const newSteps = [...safeEditForm.followup_steps, newStep];
                                
                                const rawF = safeEditForm.followup_funnels;
                                const funnels = Array.isArray(rawF) && rawF.length > 0
                                    ? rawF
                                    : [{ id: 'followup_default', name: 'Padrão / Principal', is_default: true, steps: safeEditForm.followup_steps || [] }];
                                const updatedFunnels = funnels.map(f => f.id === activeFollowupFunnelId ? { ...f, steps: newSteps } : f);

                                setEditForm({ ...safeEditForm, followup_steps: newSteps, followup_funnels: updatedFunnels });
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

            {activeFollowupSubTab === 'hours' && (
                <div className="tab-pane animate-fade-in">
                    {/* Janela de Envio & Proteção Não Perturbe */}
                    <FollowupBusinessHours
                        safeEditForm={safeEditForm}
                        setEditForm={setEditForm}
                    />
                </div>
            )}

            {activeFollowupSubTab === 'triggers' && (
                <div className="tab-pane animate-fade-in">
                    {/* Gatilhos Inteligentes & Cancelamento Automático */}
                    <FollowupSmartTriggers
                        safeEditForm={safeEditForm}
                        setEditForm={setEditForm}
                        smartTriggerTab={smartTriggerTab}
                        setSmartTriggerTab={setSmartTriggerTab}
                        labelsList={labelsList}
                    />
                </div>
            )}

            {activeFollowupSubTab === 'crm' && (
                <div className="tab-pane animate-fade-in">
                    {/* Tempo Limite para Não Converteu / Desistiu */}
                    <FollowupAbandonmentDelay
                        safeEditForm={safeEditForm}
                        setEditForm={setEditForm}
                    />
                </div>
            )}
                </>
            )}
        </div>
    );
};

export default FollowupTab;
