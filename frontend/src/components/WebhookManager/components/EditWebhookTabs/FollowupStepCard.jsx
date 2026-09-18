import React, { useState } from 'react';
import FollowupStepMessageFormat from './FollowupStepMessageFormat';
import FollowupStepTargetAudience from './FollowupStepTargetAudience';
import FollowupStepMedia from './FollowupStepMedia';

const FollowupStepCard = ({
    stepIndex: i,
    stepItem: st,
    safeEditForm,
    setEditForm,
    setActiveFollowupStepTab,
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
    setConfirmRemoveFU
}) => {
    const [activeStepSubTab, setActiveStepSubTab] = useState('message');

    if (!st) return null;

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

    // Badges dinâmicos e concisos para cada sub-aba do passo
    const formatBadge = stepType === 'ai' ? '🤖 IA' : stepType === 'fixed' ? '📝 Fixa' : '📱 Template';
    
    const currentAudience = st.target_audience || (stepType === 'whatsapp_template' ? 'retentativas' : 'ambos');
    const audienceBadge = currentAudience === 'retentativas' ? '🔁 Re-tentativa'
        : currentAudience === 'remarketing' ? '🎧 Remarketing'
        : currentAudience === 'compradores' ? '🎉 Compradores'
        : '🌐 Todos';

    const mediaBadge = !st.media_type || st.media_type === 'none' ? '🚫 Nenhuma'
        : st.media_type === 'audio' ? '🎙️ Áudio PTT'
        : st.media_type === 'video' ? '🎥 Vídeo'
        : st.media_type === 'image' ? '🖼️ Imagem'
        : '📄 Doc';

    const stepSubTabs = [
        {
            id: 'message',
            label: 'Mensagem',
            icon: '💬',
            badge: formatBadge
        },
        {
            id: 'audience',
            label: 'Público-Alvo',
            icon: '🎯',
            badge: audienceBadge
        },
        {
            id: 'media',
            label: 'Mídia',
            icon: '🎥',
            badge: mediaBadge
        }
    ];

    return (
        <div style={{
            background: 'rgba(15, 23, 42, 0.65)',
            padding: '1.1rem',
            borderRadius: '14px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.9rem',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)'
        }}>
            {/* CABEÇALHO DO PASSO: TEMPO, PRODUTO E EXCLUSÃO */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '0.75rem',
                flexWrap: 'wrap',
                paddingBottom: '0.75rem',
                borderBottom: '1px solid rgba(255, 255, 255, 0.07)'
            }}>
                <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#6366f1', background: 'rgba(99, 102, 241, 0.16)', padding: '4px 10px', borderRadius: '6px' }}>
                        Passo #{i + 1}
                    </span>
                    <input 
                        type="number" 
                        min="1" 
                        value={stepVal} 
                        onChange={e => updateFollowupStep(e.target.value, stepUnit)} 
                        className="premium-input" 
                        style={{ width: '75px', padding: '0.4rem 0.5rem', textAlign: 'center', fontWeight: 700, fontSize: '0.85rem' }} 
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

                    {/* Identificação de Produto / Esteira */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '0.5rem' }}>
                        <span style={{ fontSize: '0.75rem', color: '#a5b4fc', fontWeight: 600 }}>🏷️ Produto/Esteira:</span>
                        <input
                            type="text"
                            placeholder="Ex: Laser Day, Mentoria..."
                            value={st.product_name || ''}
                            onChange={e => updateStepProperty('product_name', e.target.value)}
                            className="premium-input"
                            style={{ width: '130px', padding: '0.35rem 0.5rem', fontSize: '0.78rem' }}
                        />
                    </div>
                </div>

                {safeEditForm.followup_steps.length > 1 && (
                    <button 
                        type="button" 
                        onClick={() => {
                            if (setConfirmRemoveFU) setConfirmRemoveFU({ modal: 'edit', index: i });
                            setActiveFollowupStepTab(Math.max(0, i - 1));
                        }} 
                        style={{
                            color: '#ef4444',
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.25)',
                            borderRadius: '6px',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            padding: '5px 11px',
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.3rem'
                        }}
                    >
                        ✕ Excluir Passo
                    </button>
                )}
            </div>

            {/* BARRA DE ABAS INTERNAS DO PASSO (MENSAGEM / PÚBLICO / MÍDIA) */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '6px',
                background: 'rgba(0, 0, 0, 0.35)',
                padding: '5px',
                borderRadius: '10px',
                border: '1px solid rgba(255, 255, 255, 0.06)'
            }}>
                {stepSubTabs.map((tab) => {
                    const isActive = activeStepSubTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            type="button"
                            data-testid={`step-subtab-${tab.id}`}
                            onClick={() => setActiveStepSubTab(tab.id)}
                            style={{
                                padding: '8px 10px',
                                borderRadius: '7px',
                                border: isActive ? '1px solid #6366f1' : '1px solid transparent',
                                background: isActive ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                                color: isActive ? '#fff' : '#94a3b8',
                                fontWeight: isActive ? 700 : 600,
                                fontSize: '0.78rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                transition: 'all 0.15s ease'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ fontSize: '0.95rem' }}>{tab.icon}</span>
                                <span>{tab.label}</span>
                            </div>
                            <span style={{
                                background: isActive ? 'rgba(99, 102, 241, 0.4)' : 'rgba(255, 255, 255, 0.07)',
                                padding: '2px 7px',
                                borderRadius: '8px',
                                fontSize: '0.67rem',
                                fontWeight: 600,
                                color: isActive ? '#fff' : '#94a3b8'
                            }}>
                                {tab.badge}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* CONTEÚDO DA SUB-ABA ATIVA */}
            {activeStepSubTab === 'message' && (
                <div className="tab-pane animate-fade-in">
                    <FollowupStepMessageFormat
                        stepIndex={i}
                        stepItem={st}
                        safeEditForm={safeEditForm}
                        setEditForm={setEditForm}
                        updateStepProperty={updateStepProperty}
                        zapvoiceTemplates={zapvoiceTemplates}
                        loadingTemplates={loadingTemplates}
                        fetchZapvoiceTemplates={fetchZapvoiceTemplates}
                        templateSearchTerm={templateSearchTerm}
                        setTemplateSearchTerm={setTemplateSearchTerm}
                        uploadingHeaderMedia={uploadingHeaderMedia}
                        handleUploadHeaderMedia={handleUploadHeaderMedia}
                        setFullscreenModal={setFullscreenModal}
                    />
                </div>
            )}

            {activeStepSubTab === 'audience' && (
                <div className="tab-pane animate-fade-in">
                    <FollowupStepTargetAudience
                        stepItem={st}
                        updateStepProperty={updateStepProperty}
                        stepType={stepType}
                    />
                </div>
            )}

            {activeStepSubTab === 'media' && (
                <div className="tab-pane animate-fade-in">
                    <FollowupStepMedia
                        stepIndex={i}
                        stepItem={st}
                        updateStepProperty={updateStepProperty}
                        uploadingMediaIndex={uploadingMediaIndex}
                        handleUploadStepMedia={handleUploadStepMedia}
                    />
                </div>
            )}
        </div>
    );
};

export default FollowupStepCard;
