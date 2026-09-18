import React from 'react';
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

            {/* Conteúdo específico de cada modo */}
            {stepType === 'ai' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <label className="premium-label" style={{ fontSize: '0.72rem', color: '#818cf8', margin: 0, fontWeight: 700 }}>
                            🧠 Diretriz Específica do Passo (Prompt da IA)
                        </label>
                        {setFullscreenModal && (
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
                        )}
                    </div>
                    <textarea 
                        placeholder="Ex: Retome o assunto de forma amigável, perguntando se o lead ficou com alguma dúvida sobre o curso e ofereça ajuda para concluir a inscrição..." 
                        value={st.custom_prompt || ''} 
                        onChange={e => updateStepProperty('custom_prompt', e.target.value)} 
                        className="premium-input" 
                        style={{ minHeight: '80px', fontSize: '0.8rem', resize: 'vertical', lineHeight: '1.45' }}
                    />
                    <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
                        💡 A IA consultará o histórico recente da conversa e o contexto deste produto para formular a resposta ideal.
                    </div>
                </div>
            )}

            {stepType === 'fixed' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <label className="premium-label" style={{ fontSize: '0.72rem', color: '#c084fc', margin: 0, fontWeight: 700 }}>
                            📝 Template de Mensagem Fixa
                        </label>
                        {setFullscreenModal && (
                            <button
                                type="button"
                                onClick={() => setFullscreenModal({
                                    isOpen: true,
                                    title: `📝 Mensagem Fixa - Passo #${i + 1}`,
                                    subtitle: 'Edite o texto pré-definido enviado neste passo de follow-up',
                                    value: st.fixed_message || '',
                                    onChange: (v) => updateStepProperty('fixed_message', v),
                                    variables: ['{nome}', '{primeiro_nome}', '{telefone}'],
                                    placeholder: 'Ex: Olá {primeiro_nome}! Vi que você ainda não finalizou seu pedido. Posso te ajudar?',
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
                        )}
                    </div>
                    <textarea 
                        placeholder="Ex: Olá {primeiro_nome}! Vi que você ainda não finalizou sua compra. Ficou com alguma dúvida sobre o valor ou formas de pagamento?" 
                        value={st.fixed_message || ''} 
                        onChange={e => updateStepProperty('fixed_message', e.target.value)} 
                        className="premium-input" 
                        style={{ minHeight: '80px', fontSize: '0.8rem', resize: 'vertical', lineHeight: '1.45' }}
                    />
                    <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.2rem', flexWrap: 'wrap', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.68rem', color: '#64748b' }}>Inserir variável:</span>
                        <code onClick={() => updateStepProperty('fixed_message', (st.fixed_message || '') + ' {nome}')} style={{ fontSize: '0.68rem', color: '#c084fc', background: 'rgba(168,85,247,0.12)', padding: '2px 6px', borderRadius: '4px', cursor: 'pointer' }}>{`{nome}`}</code>
                        <code onClick={() => updateStepProperty('fixed_message', (st.fixed_message || '') + ' {primeiro_nome}')} style={{ fontSize: '0.68rem', color: '#c084fc', background: 'rgba(168,85,247,0.12)', padding: '2px 6px', borderRadius: '4px', cursor: 'pointer' }}>{`{primeiro_nome}`}</code>
                        <code onClick={() => updateStepProperty('fixed_message', (st.fixed_message || '') + ' {telefone}')} style={{ fontSize: '0.68rem', color: '#c084fc', background: 'rgba(168,85,247,0.12)', padding: '2px 6px', borderRadius: '4px', cursor: 'pointer' }}>{`{telefone}`}</code>
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
