import React from 'react';
import FollowupStepWhatsAppTemplate from './FollowupStepWhatsAppTemplate';
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

    return (
        <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '1rem 1.1rem', borderRadius: '12px', border: '1px solid var(--wh-border)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
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

                    {/* Campo de identificação de Produto / Esteira */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '0.5rem' }}>
                        <span style={{ fontSize: '0.75rem', color: '#a5b4fc', fontWeight: 600 }}>🏷️ Produto/Esteira:</span>
                        <input
                            type="text"
                            placeholder="Ex: Laser Day, Mentoria..."
                            value={st.product_name || ''}
                            onChange={e => updateStepProperty('product_name', e.target.value)}
                            className="premium-input"
                            style={{ width: '150px', padding: '0.35rem 0.6rem', fontSize: '0.78rem' }}
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
                        style={{ color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', border: 'none', borderRadius: '6px', fontSize: '0.78rem', cursor: 'pointer', padding: '5px 10px', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                    >
                        ✕ Excluir Passo
                    </button>
                )}
            </div>

            {/* Seletor de Finalidade do Passo (Re-tentativa Disparo Inicial vs Remarketing vs Compradores/Upsell) */}
            <div style={{ background: 'rgba(0, 0, 0, 0.28)', padding: '0.65rem 0.85rem', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.07)', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        🎯 Finalidade / Público deste Passo:
                    </span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button
                        type="button"
                        onClick={() => updateStepProperty('target_audience', 'retentativas')}
                        style={{
                            padding: '0.35rem 0.75rem',
                            borderRadius: '6px',
                            fontSize: '0.74rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            border: (st.target_audience === 'retentativas' || (!st.target_audience && stepType === 'whatsapp_template')) ? '1px solid #38bdf8' : '1px solid rgba(255,255,255,0.08)',
                            background: (st.target_audience === 'retentativas' || (!st.target_audience && stepType === 'whatsapp_template')) ? 'rgba(56, 189, 248, 0.18)' : 'transparent',
                            color: (st.target_audience === 'retentativas' || (!st.target_audience && stepType === 'whatsapp_template')) ? '#38bdf8' : '#94a3b8',
                            transition: 'all 0.15s'
                        }}
                    >
                        🔁 Re-tentativa (Disparo Inicial / Sem Resposta)
                    </button>
                    <button
                        type="button"
                        onClick={() => updateStepProperty('target_audience', 'remarketing')}
                        style={{
                            padding: '0.35rem 0.75rem',
                            borderRadius: '6px',
                            fontSize: '0.74rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            border: st.target_audience === 'remarketing' ? '1px solid #f59e0b' : '1px solid rgba(255,255,255,0.08)',
                            background: st.target_audience === 'remarketing' ? 'rgba(245, 158, 11, 0.18)' : 'transparent',
                            color: st.target_audience === 'remarketing' ? '#f59e0b' : '#94a3b8',
                            transition: 'all 0.15s'
                        }}
                    >
                        🎧 Remarketing D+1 (Pós-Conversa com IA)
                    </button>
                    <button
                        type="button"
                        onClick={() => updateStepProperty('target_audience', 'compradores')}
                        style={{
                            padding: '0.35rem 0.75rem',
                            borderRadius: '6px',
                            fontSize: '0.74rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            border: st.target_audience === 'compradores' ? '1px solid #10b981' : '1px solid rgba(255,255,255,0.08)',
                            background: st.target_audience === 'compradores' ? 'rgba(16, 185, 129, 0.18)' : 'transparent',
                            color: st.target_audience === 'compradores' ? '#34d399' : '#94a3b8',
                            transition: 'all 0.15s'
                        }}
                    >
                        🎉 Compradores (Esteira Próximo Produto / Upsell)
                    </button>
                    <button
                        type="button"
                        onClick={() => updateStepProperty('target_audience', 'ambos')}
                        style={{
                            padding: '0.35rem 0.75rem',
                            borderRadius: '6px',
                            fontSize: '0.74rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            border: (st.target_audience === 'ambos' || (!st.target_audience && stepType !== 'whatsapp_template')) ? '1px solid #a855f7' : '1px solid rgba(255,255,255,0.08)',
                            background: (st.target_audience === 'ambos' || (!st.target_audience && stepType !== 'whatsapp_template')) ? 'rgba(168, 85, 247, 0.18)' : 'transparent',
                            color: (st.target_audience === 'ambos' || (!st.target_audience && stepType !== 'whatsapp_template')) ? '#c084fc' : '#94a3b8',
                            transition: 'all 0.15s'
                        }}
                    >
                        🌐 Qualquer Lead Inativo
                    </button>
                </div>
            </div>

            {/* Seletor de Modo: IA Contextual vs Mensagem Fixa vs Template */}
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
                        if (zapvoiceTemplates.length === 0 && fetchZapvoiceTemplates) fetchZapvoiceTemplates();
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

            {stepType === 'whatsapp_template' && (
                <FollowupStepWhatsAppTemplate
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
                />
            )}
            
            {/* Seção de Mídia e Áudio Humanizado */}
            <FollowupStepMedia
                stepIndex={i}
                stepItem={st}
                updateStepProperty={updateStepProperty}
                uploadingMediaIndex={uploadingMediaIndex}
                handleUploadStepMedia={handleUploadStepMedia}
            />
        </div>
    );
};

export default FollowupStepCard;
