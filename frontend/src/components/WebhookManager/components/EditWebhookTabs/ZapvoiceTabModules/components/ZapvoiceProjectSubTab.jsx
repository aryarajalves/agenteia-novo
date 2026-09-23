import React from 'react';
import { LabelSingleSelect } from '../../../Common/LabelSelect';

const ZapvoiceProjectSubTab = ({
    safeEditForm,
    setEditForm,
    labelsList = []
}) => {
    return (
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
                        <input 
                            type="text" 
                            placeholder="Ex: #projeto" 
                            value={safeEditForm.project_assistant_keyword || ''} 
                            onChange={e => setEditForm({ ...safeEditForm, project_assistant_keyword: e.target.value })} 
                            className="premium-input" 
                        />
                    </div>
                    <div className="form-group-premium">
                        <label className="premium-label">Palavra-chave (Desativar)</label>
                        <input 
                            type="text" 
                            placeholder="Ex: #sair_projeto" 
                            value={safeEditForm.project_assistant_deactivate_keyword || ''} 
                            onChange={e => setEditForm({ ...safeEditForm, project_assistant_deactivate_keyword: e.target.value })} 
                            className="premium-input" 
                        />
                    </div>
                </div>
                <div className="form-group-premium">
                    <label className="premium-label">Mensagem de Entrada</label>
                    <textarea 
                        placeholder="Mensagem enviada ao ativar o assistente..." 
                        value={safeEditForm.project_assistant_entry_message || ''} 
                        onChange={e => setEditForm({ ...safeEditForm, project_assistant_entry_message: e.target.value })} 
                        className="premium-input" 
                        style={{ minHeight: '60px', resize: 'vertical' }} 
                    />
                </div>
                <div className="form-group-premium">
                    <label className="premium-label">Mensagem de Saída</label>
                    <textarea 
                        placeholder="Mensagem enviada ao desativar o assistente..." 
                        value={safeEditForm.project_assistant_exit_message || ''} 
                        onChange={e => setEditForm({ ...safeEditForm, project_assistant_exit_message: e.target.value })} 
                        className="premium-input" 
                        style={{ minHeight: '60px', resize: 'vertical' }} 
                    />
                </div>
            </div>
        </div>
    );
};

export default ZapvoiceProjectSubTab;
