import React from 'react';
import { LabelMultiSelect, LabelSingleSelect } from '../Common/LabelSelect';

const FollowupSmartTriggers = ({
    safeEditForm,
    setEditForm,
    smartTriggerTab,
    setSmartTriggerTab,
    labelsList = []
}) => {
    return (
        <div style={{ marginTop: '1rem', background: 'rgba(15, 23, 42, 0.4)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', padding: '1rem' }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#a855f7', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.35rem' }}>
                🎯 Gatilhos Inteligentes & Regras de Etiquetas (Smart Triggers)
            </div>
            <p style={{ margin: '0 0 0.85rem 0', fontSize: '0.72rem', color: '#94a3b8' }}>
                Organize as regras de etiquetas do ZapVoice em abas para desativar, filtrar ou marcar conversas durante o ciclo de follow-up.
            </p>

            {/* Sub-abas de Etiquetas */}
            <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1rem', background: 'rgba(0, 0, 0, 0.25)', padding: '4px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <button
                    type="button"
                    onClick={() => setSmartTriggerTab('cancel')}
                    style={{
                        flex: 1,
                        padding: '0.45rem 0.6rem',
                        borderRadius: '6px',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        border: smartTriggerTab === 'cancel' ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid transparent',
                        background: smartTriggerTab === 'cancel' ? 'rgba(239, 68, 68, 0.15)' : 'transparent',
                        color: smartTriggerTab === 'cancel' ? '#f87171' : '#94a3b8',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.35rem'
                    }}
                >
                    <span>🚫</span> Desativar / Cancelar
                </button>

                <button
                    type="button"
                    onClick={() => setSmartTriggerTab('required')}
                    style={{
                        flex: 1,
                        padding: '0.45rem 0.6rem',
                        borderRadius: '6px',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        border: smartTriggerTab === 'required' ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid transparent',
                        background: smartTriggerTab === 'required' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                        color: smartTriggerTab === 'required' ? '#38bdf8' : '#94a3b8',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.35rem'
                    }}
                >
                    <span>📌</span> Ativar (Requisito)
                </button>

                <button
                    type="button"
                    onClick={() => setSmartTriggerTab('add')}
                    style={{
                        flex: 1,
                        padding: '0.45rem 0.6rem',
                        borderRadius: '6px',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        border: smartTriggerTab === 'add' ? '1px solid rgba(168, 85, 247, 0.4)' : '1px solid transparent',
                        background: smartTriggerTab === 'add' ? 'rgba(168, 85, 247, 0.15)' : 'transparent',
                        color: smartTriggerTab === 'add' ? '#c084fc' : '#94a3b8',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.35rem'
                    }}
                >
                    <span>🏷️</span> Pós-Envio (Aplicar)
                </button>
            </div>

            {/* Conteúdo da Aba 1: Cancelamento */}
            {smartTriggerTab === 'cancel' && (
                <div className="form-group-premium" style={{ animation: 'fadeIn 0.2s ease' }}>
                    <label className="premium-label" style={{ fontSize: '0.7rem', color: '#ef4444' }}>
                        🚫 Etiqueta(s) para Desativar 100% o Follow-up
                    </label>
                    <LabelMultiSelect 
                        selected={
                            Array.isArray(safeEditForm.followup_cancel_label) 
                                ? safeEditForm.followup_cancel_label 
                                : (safeEditForm.followup_cancel_label || '').split(',').map(s => s.trim()).filter(Boolean)
                        } 
                        options={labelsList} 
                        onChange={selectedArr => setEditForm({ ...safeEditForm, followup_cancel_label: selectedArr.join(', ') })} 
                        accentColor="#ef4444" 
                        placeholder="Selecione ou busque etiquetas no ZapVoice..."
                    />
                    <p className="premium-help-text" style={{ marginTop: '0.35rem', fontSize: '0.68rem' }}>
                        Clique no campo para abrir o dropdown de etiquetas sincronizadas do ZapVoice. Se a conversa tiver qualquer uma dessas etiquetas, o ciclo de follow-up é cancelado imediatamente.
                    </p>
                </div>
            )}

            {/* Conteúdo da Aba 2: Requisito Obrigatório */}
            {smartTriggerTab === 'required' && (
                <div className="form-group-premium" style={{ animation: 'fadeIn 0.2s ease' }}>
                    <label className="premium-label" style={{ fontSize: '0.7rem', color: '#38bdf8' }}>
                        📌 Etiqueta Obrigatória para Ativar Follow-up (Opcional)
                    </label>
                    <LabelSingleSelect 
                        selected={safeEditForm.followup_required_label || ''} 
                        options={labelsList} 
                        onChange={selectedVal => setEditForm({ ...safeEditForm, followup_required_label: selectedVal })} 
                        accentColor="#38bdf8" 
                        placeholder="Selecione a etiqueta no ZapVoice..."
                    />
                    <p className="premium-help-text" style={{ marginTop: '0.35rem', fontSize: '0.68rem' }}>
                        Se preenchido, apenas contatos que tiverem esta etiqueta ativa no ZapVoice receberão os disparos de follow-up.
                    </p>
                </div>
            )}

            {/* Conteúdo da Aba 3: Adicionar Pós-Envio */}
            {smartTriggerTab === 'add' && (
                <div className="form-group-premium" style={{ animation: 'fadeIn 0.2s ease' }}>
                    <label className="premium-label" style={{ fontSize: '0.7rem', color: '#a855f7' }}>
                        🏷️ Etiqueta a Adicionar ao Enviar o Follow-up (ZapVoice)
                    </label>
                    <LabelSingleSelect 
                        selected={safeEditForm.followup_add_label || ''} 
                        options={labelsList} 
                        onChange={selectedVal => setEditForm({ ...safeEditForm, followup_add_label: selectedVal })} 
                        accentColor="#a855f7" 
                        placeholder="Selecione a etiqueta no ZapVoice..."
                    />
                    <p className="premium-help-text" style={{ marginTop: '0.35rem', fontSize: '0.68rem' }}>
                        Esta etiqueta será aplicada automaticamente na conversa do cliente no chat do ZapVoice no momento em que a mensagem de follow-up for enviada.
                    </p>
                </div>
            )}

            {/* Comportamento ao Receber Resposta do Cliente */}
            <div style={{ marginTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.85rem' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#38bdf8', marginBottom: '0.45rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <span>⚡</span> Comportamento ao Receber Resposta do Lead:
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                    <div 
                        onClick={() => setEditForm({ ...safeEditForm, followup_on_reply: 'stop' })}
                        style={{
                            padding: '0.65rem 0.75rem',
                            borderRadius: '8px',
                            border: (safeEditForm.followup_on_reply || 'stop') === 'stop' ? '1px solid #10b981' : '1px solid rgba(255,255,255,0.08)',
                            background: (safeEditForm.followup_on_reply || 'stop') === 'stop' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(0,0,0,0.2)',
                            cursor: 'pointer',
                            transition: 'all 0.15s'
                        }}
                    >
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: (safeEditForm.followup_on_reply || 'stop') === 'stop' ? '#34d399' : '#e2e8f0' }}>
                            🛑 Encerrar Follow-Up
                        </div>
                        <div style={{ fontSize: '0.66rem', color: '#94a3b8', marginTop: '3px', lineHeight: '1.2' }}>
                            (Recomendado) Meta atingida! O lead engajou e não recebe mais mensagens da régua.
                        </div>
                    </div>

                    <div 
                        onClick={() => setEditForm({ ...safeEditForm, followup_on_reply: 'continue_next' })}
                        style={{
                            padding: '0.65rem 0.75rem',
                            borderRadius: '8px',
                            border: safeEditForm.followup_on_reply === 'continue_next' ? '1px solid #3b82f6' : '1px solid rgba(255,255,255,0.08)',
                            background: safeEditForm.followup_on_reply === 'continue_next' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(0,0,0,0.2)',
                            cursor: 'pointer',
                            transition: 'all 0.15s'
                        }}
                    >
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: safeEditForm.followup_on_reply === 'continue_next' ? '#60a5fa' : '#e2e8f0' }}>
                            ⏭️ Avançar sem Repetir
                        </div>
                        <div style={{ fontSize: '0.66rem', color: '#94a3b8', marginTop: '3px', lineHeight: '1.2' }}>
                            Se o lead silenciar de novo, avança para a próxima etapa sem nunca repetir a anterior.
                        </div>
                    </div>

                    <div 
                        onClick={() => setEditForm({ ...safeEditForm, followup_on_reply: 'restart' })}
                        style={{
                            padding: '0.65rem 0.75rem',
                            borderRadius: '8px',
                            border: safeEditForm.followup_on_reply === 'restart' ? '1px solid #a855f7' : '1px solid rgba(255,255,255,0.08)',
                            background: safeEditForm.followup_on_reply === 'restart' ? 'rgba(168, 85, 247, 0.15)' : 'rgba(0,0,0,0.2)',
                            cursor: 'pointer',
                            transition: 'all 0.15s'
                        }}
                    >
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: safeEditForm.followup_on_reply === 'restart' ? '#c084fc' : '#e2e8f0' }}>
                            🔄 Reiniciar Régua
                        </div>
                        <div style={{ fontSize: '0.66rem', color: '#94a3b8', marginTop: '3px', lineHeight: '1.2' }}>
                            Reinicia todos os passos do início a cada novo silêncio.
                        </div>
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem', marginTop: '0.85rem' }}>
                <div style={{ background: 'rgba(34, 197, 94, 0.08)', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
                    <div style={{ fontSize: '0.73rem', fontWeight: 700, color: '#4ade80' }}>🛒 Confirmação de Venda</div>
                    <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '2px' }}>Quando o pagamento for confirmado via webhook, os follow-ups são encerrados imediatamente.</div>
                </div>
            </div>
        </div>
    );
};

export default FollowupSmartTriggers;
