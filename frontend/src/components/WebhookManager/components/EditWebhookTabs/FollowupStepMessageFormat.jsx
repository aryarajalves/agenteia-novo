import React, { useState } from 'react';
import FollowupStepWhatsAppTemplate from './FollowupStepWhatsAppTemplate';

const FollowupStepMessageFormat = ({
    stepIndex: i,
    stepItem: st,
    safeEditForm,
    setEditForm,
    updateStepProperty,
    zapvoiceTemplates = [],
    loadingTemplates = false,
    fetchZapvoiceTemplates,
    templateSearchTerm,
    setTemplateSearchTerm,
    uploadingHeaderMedia,
    handleUploadHeaderMedia,
    setFullscreenModal
}) => {
    const stepType = st?.type || 'ai';
    const isAbEnabled = !!st?.ab_test_enabled;
    const [activeAbTab, setActiveAbTab] = useState('A');

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {/* Seletor de Modo: IA Contextual vs Mensagem Fixa vs Template */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
                gap: '8px',
                background: 'rgba(0, 0, 0, 0.25)',
                padding: '6px',
                borderRadius: '10px',
                border: '1px solid rgba(255, 255, 255, 0.06)'
            }}>
                <button 
                    type="button" 
                    data-testid="followup-step-type-ai"
                    onClick={() => updateStepProperty('type', 'ai')}
                    style={{
                        padding: '0.45rem 0.75rem',
                        borderRadius: '7px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        border: stepType === 'ai' ? '1px solid #6366f1' : '1px solid transparent',
                        background: stepType === 'ai' ? 'rgba(99, 102, 241, 0.22)' : 'transparent',
                        color: stepType === 'ai' ? '#a5b4fc' : '#94a3b8',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.4rem',
                        transition: 'all 0.15s',
                        boxShadow: stepType === 'ai' ? '0 0 10px rgba(99,102,241,0.2)' : 'none'
                    }}
                >
                    <span>🤖</span>
                    <span>IA Contextual</span>
                </button>
                <button 
                    type="button" 
                    data-testid="followup-step-type-fixed"
                    onClick={() => updateStepProperty('type', 'fixed')}
                    style={{
                        padding: '0.45rem 0.75rem',
                        borderRadius: '7px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        border: stepType === 'fixed' ? '1px solid #a855f7' : '1px solid transparent',
                        background: stepType === 'fixed' ? 'rgba(168, 85, 247, 0.22)' : 'transparent',
                        color: stepType === 'fixed' ? '#d8b4fe' : '#94a3b8',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.4rem',
                        transition: 'all 0.15s',
                        boxShadow: stepType === 'fixed' ? '0 0 10px rgba(168,85,247,0.2)' : 'none'
                    }}
                >
                    <span>📝</span>
                    <span>Mensagem Fixa</span>
                </button>
                <button 
                    type="button" 
                    data-testid="followup-step-type-template"
                    onClick={() => {
                        updateStepProperty('type', 'whatsapp_template');
                        if (zapvoiceTemplates.length === 0 && fetchZapvoiceTemplates) fetchZapvoiceTemplates();
                    }}
                    style={{
                        padding: '0.45rem 0.75rem',
                        borderRadius: '7px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        border: stepType === 'whatsapp_template' ? '1px solid #10b981' : '1px solid transparent',
                        background: stepType === 'whatsapp_template' ? 'rgba(16, 185, 129, 0.22)' : 'transparent',
                        color: stepType === 'whatsapp_template' ? '#6ee7b7' : '#94a3b8',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.4rem',
                        transition: 'all 0.15s',
                        boxShadow: stepType === 'whatsapp_template' ? '0 0 10px rgba(16,185,129,0.2)' : 'none'
                    }}
                >
                    <span>📱</span>
                    <span>Template WhatsApp</span>
                </button>
            </div>

            {/* Bloco de Teste A/B de Copy */}
            <div style={{
                background: isAbEnabled ? 'rgba(245, 158, 11, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                border: isAbEnabled ? '1px solid rgba(245, 158, 11, 0.25)' : '1px solid rgba(255, 255, 255, 0.05)',
                borderRadius: '8px',
                padding: '0.5rem 0.75rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'all 0.2s'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.9rem' }}>🧪</span>
                    <div>
                        <div style={{ fontSize: '0.74rem', fontWeight: 700, color: isAbEnabled ? '#fbbf24' : '#e2e8f0' }}>
                            Teste A/B de Copy (Divisão 50% / 50%)
                        </div>
                        <div style={{ fontSize: '0.66rem', color: '#94a3b8' }}>
                            Compare duas abordagens diferentes para medir qual converte mais respostas
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    {isAbEnabled && (
                        <div style={{ display: 'flex', background: 'rgba(0,0,0,0.3)', padding: '2px', borderRadius: '6px' }}>
                            <button
                                type="button"
                                data-testid="followup-ab-tab-a"
                                onClick={() => setActiveAbTab('A')}
                                style={{
                                    padding: '0.2rem 0.5rem',
                                    fontSize: '0.7rem',
                                    fontWeight: 700,
                                    borderRadius: '4px',
                                    border: 'none',
                                    cursor: 'pointer',
                                    background: activeAbTab === 'A' ? '#6366f1' : 'transparent',
                                    color: activeAbTab === 'A' ? '#fff' : '#94a3b8'
                                }}
                            >
                                Variação A (50%)
                            </button>
                            <button
                                type="button"
                                data-testid="followup-ab-tab-b"
                                onClick={() => setActiveAbTab('B')}
                                style={{
                                    padding: '0.2rem 0.5rem',
                                    fontSize: '0.7rem',
                                    fontWeight: 700,
                                    borderRadius: '4px',
                                    border: 'none',
                                    cursor: 'pointer',
                                    background: activeAbTab === 'B' ? '#f59e0b' : 'transparent',
                                    color: activeAbTab === 'B' ? '#fff' : '#94a3b8'
                                }}
                            >
                                Variação B (50%)
                            </button>
                        </div>
                    )}
                    <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', margin: 0 }}>
                        <input
                            type="checkbox"
                            data-testid="followup-ab-toggle"
                            checked={isAbEnabled}
                            onChange={(e) => updateStepProperty('ab_test_enabled', e.target.checked)}
                            style={{ width: '16px', height: '16px', accentColor: '#f59e0b', cursor: 'pointer' }}
                        />
                    </label>
                </div>
            </div>

            {/* Conteúdo específico de cada modo */}
            {stepType === 'ai' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <label className="premium-label" style={{ fontSize: '0.72rem', color: isAbEnabled && activeAbTab === 'B' ? '#fbbf24' : '#818cf8', margin: 0, fontWeight: 700 }}>
                            🧠 Diretriz Específica do Passo {isAbEnabled ? `(Variação ${activeAbTab})` : '(Prompt da IA)'}
                        </label>
                        {setFullscreenModal && (
                            <button
                                type="button"
                                onClick={() => setFullscreenModal({
                                    isOpen: true,
                                    title: `🧠 Prompt de IA - Passo #${i + 1} ${isAbEnabled ? `(Variação ${activeAbTab})` : ''}`,
                                    subtitle: 'Edite as instruções detalhadas que a IA usará para gerar a mensagem deste follow-up',
                                    value: (isAbEnabled && activeAbTab === 'B') ? (st.variation_b_prompt || '') : (st.custom_prompt || ''),
                                    onChange: (v) => updateStepProperty(isAbEnabled && activeAbTab === 'B' ? 'variation_b_prompt' : 'custom_prompt', v),
                                    placeholder: 'Ex: Retome o assunto focando em tirar dúvidas sobre o checkout...',
                                    accentColor: isAbEnabled && activeAbTab === 'B' ? '#f59e0b' : '#6366f1'
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
                        )}
                    </div>
                    <textarea 
                        data-testid="followup-step-prompt-input"
                        placeholder={isAbEnabled && activeAbTab === 'B' ? "Variação B: Teste outra abordagem (ex: ofereça bônus exclusivo ou tire dúvidas sobre a garantia)..." : "Ex: Retome o assunto focando na principal dúvida e ofereça ajuda para concluir a inscrição..."} 
                        value={(isAbEnabled && activeAbTab === 'B') ? (st.variation_b_prompt || '') : (st.custom_prompt || '')} 
                        onChange={e => updateStepProperty(isAbEnabled && activeAbTab === 'B' ? 'variation_b_prompt' : 'custom_prompt', e.target.value)} 
                        className="premium-input" 
                        style={{ minHeight: '80px', fontSize: '0.8rem', resize: 'vertical', lineHeight: '1.45' }}
                    />
                    <div style={{ fontSize: '0.68rem', color: '#64748b', fontStyle: 'italic' }}>
                        Dica: Esta instrução é enviada para a IA analisar o contexto recente da conversa e criar uma mensagem natural e personalizada.
                    </div>
                </div>
            )}

            {stepType === 'fixed' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <label className="premium-label" style={{ fontSize: '0.72rem', color: isAbEnabled && activeAbTab === 'B' ? '#fbbf24' : '#c084fc', margin: 0, fontWeight: 700 }}>
                            📝 Mensagem de Texto Fixa {isAbEnabled ? `(Variação ${activeAbTab})` : ''}
                        </label>
                        {setFullscreenModal && (
                            <button
                                type="button"
                                onClick={() => setFullscreenModal({
                                    isOpen: true,
                                    title: `📝 Mensagem Fixa - Passo #${i + 1} ${isAbEnabled ? `(Variação ${activeAbTab})` : ''}`,
                                    subtitle: 'Edite o texto fixo com suporte a variáveis dinâmicas {nome}, {primeiro_nome} e {telefone}',
                                    value: (isAbEnabled && activeAbTab === 'B') ? (st.variation_b_message || '') : (st.fixed_message || ''),
                                    onChange: (v) => updateStepProperty(isAbEnabled && activeAbTab === 'B' ? 'variation_b_message' : 'fixed_message', v),
                                    placeholder: 'Ex: Olá {primeiro_nome}! Tudo bem? Vi que você não finalizou sua matrícula...',
                                    accentColor: isAbEnabled && activeAbTab === 'B' ? '#f59e0b' : '#a855f7'
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
                        )}
                    </div>
                    <textarea 
                        data-testid="followup-step-fixed-input"
                        placeholder={isAbEnabled && activeAbTab === 'B' ? "Variação B: Olá {primeiro_nome}! Preparei uma condição especial para você fechar hoje..." : "Ex: Olá {primeiro_nome}! Vi que você ainda não finalizou sua compra. Ficou com alguma dúvida sobre o valor ou formas de pagamento?"} 
                        value={(isAbEnabled && activeAbTab === 'B') ? (st.variation_b_message || '') : (st.fixed_message || '')} 
                        onChange={e => updateStepProperty(isAbEnabled && activeAbTab === 'B' ? 'variation_b_message' : 'fixed_message', e.target.value)} 
                        className="premium-input" 
                        style={{ minHeight: '80px', fontSize: '0.8rem', resize: 'vertical', lineHeight: '1.45' }}
                    />
                    <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.2rem', flexWrap: 'wrap', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.68rem', color: '#64748b' }}>Inserir variável:</span>
                        <code onClick={() => {
                            const field = (isAbEnabled && activeAbTab === 'B') ? 'variation_b_message' : 'fixed_message';
                            updateStepProperty(field, (st[field] || '') + ' {nome}');
                        }} style={{ fontSize: '0.68rem', color: '#c084fc', background: 'rgba(168,85,247,0.12)', padding: '2px 6px', borderRadius: '4px', cursor: 'pointer' }}>{`{nome}`}</code>
                        <code onClick={() => {
                            const field = (isAbEnabled && activeAbTab === 'B') ? 'variation_b_message' : 'fixed_message';
                            updateStepProperty(field, (st[field] || '') + ' {primeiro_nome}');
                        }} style={{ fontSize: '0.68rem', color: '#c084fc', background: 'rgba(168,85,247,0.12)', padding: '2px 6px', borderRadius: '4px', cursor: 'pointer' }}>{`{primeiro_nome}`}</code>
                        <code onClick={() => {
                            const field = (isAbEnabled && activeAbTab === 'B') ? 'variation_b_message' : 'fixed_message';
                            updateStepProperty(field, (st[field] || '') + ' {telefone}');
                        }} style={{ fontSize: '0.68rem', color: '#c084fc', background: 'rgba(168,85,247,0.12)', padding: '2px 6px', borderRadius: '4px', cursor: 'pointer' }}>{`{telefone}`}</code>
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
        </div>
    );
};

export default FollowupStepMessageFormat;
