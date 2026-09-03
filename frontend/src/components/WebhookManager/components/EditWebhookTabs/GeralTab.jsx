import React from 'react';

const GeralTab = ({
    safeEditForm,
    setEditForm,
    geralSubTab,
    setGeralSubTab
}) => {
    return (
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
        </div>
    );
};

export default GeralTab;
