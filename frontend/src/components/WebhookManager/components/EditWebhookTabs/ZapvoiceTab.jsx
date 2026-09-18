import React from 'react';
import { LabelMultiSelect, LabelSingleSelect } from '../Common/LabelSelect';

const ZapvoiceTab = ({
    safeEditForm,
    setEditForm,
    zapvoiceSubTab,
    setZapvoiceSubTab,
    showToken,
    setShowToken,
    labelsList = [],
    labelsLoading = false,
    fetchChatwootLabels
}) => {
    return (
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
                    {labelsLoading && (
                        <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.75rem' }}>⏳ Carregando etiquetas do ZapVoice...</p>
                    )}
                    {!labelsLoading && labelsList.length === 0 && safeEditForm.zapvoice_client_id && (
                        <div style={{ padding: '0.6rem 0.8rem', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.25)', borderRadius: '8px', marginTop: '0.75rem', marginBottom: '0.75rem' }}>
                            <p style={{ fontSize: '0.75rem', color: '#fbbf24', margin: 0 }}>
                                💡 Nenhuma etiqueta remota listada no momento pelo ZapVoice (ID: {safeEditForm.zapvoice_client_id}). Você pode digitar etiquetas manualmente nos campos abaixo ou clicar em "Sincronizar Etiquetas".
                            </p>
                        </div>
                    )}
                    {!labelsLoading && labelsList.length === 0 && !safeEditForm.zapvoice_client_id && (
                        <div style={{ padding: '0.6rem 0.8rem', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '8px', marginTop: '0.75rem', marginBottom: '0.75rem' }}>
                            <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: 0 }}>
                                ℹ️ ZapVoice/Client ID não configurado. Você pode digitar etiquetas manualmente abaixo ou configurar as credenciais na aba ao lado.
                            </p>
                        </div>
                    )}
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
                            <label className="premium-label" style={{ color: '#ef4444', fontSize: '0.65rem' }}>🚫 Cancelar 100% Follow-up & Disparos</label>
                            <LabelMultiSelect
                                selected={
                                    Array.isArray(safeEditForm.followup_cancel_label) 
                                        ? safeEditForm.followup_cancel_label 
                                        : (safeEditForm.followup_cancel_label || '').split(',').map(s => s.trim()).filter(Boolean)
                                }
                                options={labelsList}
                                onChange={selectedArr => setEditForm({ ...safeEditForm, followup_cancel_label: selectedArr.join(', ') })}
                                accentColor="#ef4444"
                                placeholder="Selecione etiqueta(s) para cancelar automações..."
                            />
                            <p className="premium-help-text" style={{ marginTop: '0.25rem', fontSize: '0.7rem' }}>
                                Quando aplicada no lead no chat do ZapVoice, desativa imediatamente 100% de qualquer automação de follow-up ou disparo para este contato.
                            </p>
                        </div>
                        <div className="form-group-premium">
                            <label className="premium-label" style={{ color: '#10b981', fontSize: '0.65rem' }}>🎉 Compra Realizada / Aluno (CRM)</label>
                            <LabelSingleSelect
                                selected={safeEditForm.purchased_label || ''}
                                options={labelsList}
                                onChange={v => setEditForm({ ...safeEditForm, purchased_label: v })}
                                accentColor="#10b981"
                                placeholder="Selecione a etiqueta de compra/aluno..."
                            />
                            <p className="premium-help-text" style={{ marginTop: '0.25rem', fontSize: '0.7rem' }}>
                                Etiqueta aplicada quando o lead diz que já comprou na conversa ou via webhook de vendas. Cancela disparos de cobrança e move para o status de compra no CRM.
                            </p>
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
    );
};

export default ZapvoiceTab;
