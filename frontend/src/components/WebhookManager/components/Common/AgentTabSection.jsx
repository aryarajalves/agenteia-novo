import React from 'react';
import AgentMultiSelect from '../../../AgentMultiSelect.jsx';

const AgentTabSection = ({ safeEditForm, setEditForm, agentsList, handleGenerateDescription, syncingAgentId }) => {
    const isSyncing = String(syncingAgentId) === String(safeEditForm.agent_id);

    return (
        <div className="tab-pane animate-fade-in">
            <div className="form-group-premium">
                <label className="premium-label">🤖 Agente Principal *</label>
                <select value={safeEditForm.agent_id} onChange={e => setEditForm({ ...safeEditForm, agent_id: e.target.value })} className="premium-input">
                    <option value="">Selecione um agente...</option>
                    {agentsList.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
            </div>

            {safeEditForm.agent_id && (
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.25rem', borderRadius: '16px', border: '1px solid var(--wh-border)', margin: '1rem 0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', alignItems: 'center' }}>
                        <span className="premium-label" style={{ margin: 0 }}>Contexto do Agente</span>
                        <button
                            type="button"
                            disabled={isSyncing}
                            onClick={() => handleGenerateDescription(safeEditForm.agent_id)}
                            className="btn-action-edit"
                            style={{ padding: '0.3rem 0.75rem', fontSize: '0.7rem', opacity: isSyncing ? 0.6 : 1, cursor: isSyncing ? 'not-allowed' : 'pointer' }}
                        >
                            {isSyncing ? '⏳ Sincronizando...' : '✨ Sincronizar IA'}
                        </button>
                    </div>
                    <p style={{ fontSize: '0.8rem', color: '#94a3b8', lineHeight: 1.6, margin: 0 }}>
                        {agentsList.find(a => String(a.id) === String(safeEditForm.agent_id))?.description || 'Sem descrição.'}
                    </p>
                </div>
            )}

            <div className="form-group-premium" style={{ marginTop: '1rem' }}>
                <label className="premium-label">👥 Agentes Secundários</label>
                <AgentMultiSelect
                    selected={safeEditForm.secondary_agent_ids || []}
                    options={agentsList}
                    onChange={vals => setEditForm({ ...safeEditForm, secondary_agent_ids: vals })}
                    accentColor="#8b5cf6"
                    placeholder="Adicionar agentes..."
                />
            </div>
        </div>
    );
};

export default AgentTabSection;
