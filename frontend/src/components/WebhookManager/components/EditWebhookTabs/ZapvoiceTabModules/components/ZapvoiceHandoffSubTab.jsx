import React from 'react';
import { LabelMultiSelect } from '../../../Common/LabelSelect';

const ZapvoiceHandoffSubTab = ({
    safeEditForm,
    setEditForm,
    labelsList = []
}) => {
    return (
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
                            <LabelMultiSelect 
                                selected={safeEditForm.handoff_labels_to_remove || []} 
                                options={labelsList} 
                                onChange={v => setEditForm({ ...safeEditForm, handoff_labels_to_remove: v })} 
                                accentColor="#ef4444" 
                            />
                        </div>
                        <div className="form-group-premium">
                            <label className="premium-label" style={{ fontSize: '0.65rem' }}>Adicionar</label>
                            <LabelMultiSelect 
                                selected={safeEditForm.handoff_labels_to_add || []} 
                                options={labelsList} 
                                onChange={v => setEditForm({ ...safeEditForm, handoff_labels_to_add: v })} 
                                accentColor="#34d399" 
                            />
                        </div>
                    </div>
                    <div className="form-group-premium">
                        <label className="premium-label">Palavra-chave</label>
                        <input 
                            type="text" 
                            placeholder="#atendimento" 
                            value={safeEditForm.handoff_keyword || ''} 
                            onChange={e => setEditForm({ ...safeEditForm, handoff_keyword: e.target.value })} 
                            className="premium-input" 
                        />
                    </div>
                    <div className="form-group-premium">
                        <label className="premium-label">Mensagem</label>
                        <textarea 
                            placeholder="Mensagem de transição..." 
                            value={safeEditForm.handoff_message || ''} 
                            onChange={e => setEditForm({ ...safeEditForm, handoff_message: e.target.value })} 
                            className="premium-input" 
                            style={{ minHeight: '60px', resize: 'vertical' }} 
                        />
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
                            <LabelMultiSelect 
                                selected={safeEditForm.ai_handoff_labels_to_remove || []} 
                                options={labelsList} 
                                onChange={v => setEditForm({ ...safeEditForm, ai_handoff_labels_to_remove: v })} 
                                accentColor="#ef4444" 
                            />
                        </div>
                        <div className="form-group-premium">
                            <label className="premium-label" style={{ fontSize: '0.65rem' }}>Adicionar</label>
                            <LabelMultiSelect 
                                selected={safeEditForm.ai_handoff_labels_to_add || []} 
                                options={labelsList} 
                                onChange={v => setEditForm({ ...safeEditForm, ai_handoff_labels_to_add: v })} 
                                accentColor="#34d399" 
                            />
                        </div>
                    </div>
                    <div className="form-group-premium">
                        <label className="premium-label">Palavra-chave (Botão Finalizar)</label>
                        <input 
                            type="text" 
                            placeholder="#voltar" 
                            value={safeEditForm.ai_handoff_keyword || ''} 
                            onChange={e => setEditForm({ ...safeEditForm, ai_handoff_keyword: e.target.value })} 
                            className="premium-input" 
                        />
                    </div>
                    <div className="form-group-premium">
                        <label className="premium-label">Mensagem de Boas-vindas (Retorno)</label>
                        <textarea 
                            placeholder="Mensagem ao retomar atendimento..." 
                            value={safeEditForm.ai_handoff_message || ''} 
                            onChange={e => setEditForm({ ...safeEditForm, ai_handoff_message: e.target.value })} 
                            className="premium-input" 
                            style={{ minHeight: '60px', resize: 'vertical' }} 
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ZapvoiceHandoffSubTab;
