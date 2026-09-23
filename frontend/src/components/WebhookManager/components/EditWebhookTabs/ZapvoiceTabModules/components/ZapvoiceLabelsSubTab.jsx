import React from 'react';
import { LabelMultiSelect, LabelSingleSelect } from '../../../Common/LabelSelect';

const ZapvoiceLabelsSubTab = ({
    safeEditForm,
    setEditForm,
    labelsList = [],
    labelsLoading = false,
    fetchChatwootLabels
}) => {
    return (
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
    );
};

export default ZapvoiceLabelsSubTab;
