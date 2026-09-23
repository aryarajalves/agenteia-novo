import React, { useState } from 'react';
import { useConfig } from '../../ConfigContext';
import ToolPromptModal from './ToolPromptModal';
import UnansweredQuestionsConfigSection from '../UnansweredQuestionsConfigSection';

const ActionsToolsSection = () => {
    const {
        toolsList, selectedTools, setSelectedTools,
        toolPrompts, setToolPrompts
    } = useConfig();

    const [maximizedToolId, setMaximizedToolId] = useState(null);

    const activeTools = selectedTools.filter(toolId => {
        const tool = toolsList.find(t => t.id === toolId);
        return tool?.name !== 'transferir_robo';
    });

    const getToolPromptValue = (tool) => {
        if (toolPrompts[tool.id] !== undefined) return toolPrompts[tool.id];
        if (toolPrompts[String(tool.id)] !== undefined) return toolPrompts[String(tool.id)];
        return tool.description || '';
    };

    return (
        <div className="form-section fade-in">
            <span className="section-label" style={{ marginBottom: '1.25rem' }}>🔗 Ações & Ferramentas (API)</span>
            
            <div className="form-group">
                <label>Adicionar Habilidades ao Agente</label>
                <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
                    <select
                        style={{ flex: 1 }}
                        value=""
                        onChange={(e) => {
                            const val = parseInt(e.target.value);
                            if (val && !selectedTools.includes(val)) {
                                setSelectedTools([...selectedTools, val]);
                            }
                        }}
                    >
                        <option value="">Escolher Ferramenta...</option>
                        {toolsList.filter(t => !t.webhook_url && t.name !== 'transferir_robo' && !selectedTools.includes(t.id)).length > 0 && (
                            <optgroup label="📅 Ferramentas Nativas">
                                {toolsList
                                    .filter(t => !t.webhook_url && t.name !== 'transferir_robo' && !selectedTools.includes(t.id))
                                    .map(tool => (
                                        <option key={tool.id} value={tool.id}>📅 {tool.name}</option>
                                    ))}
                            </optgroup>
                        )}
                        {toolsList.filter(t => t.webhook_url && t.name !== 'transferir_robo' && !selectedTools.includes(t.id)).length > 0 && (
                            <optgroup label="🔗 Ferramentas Externas (Webhooks)">
                                {toolsList
                                    .filter(t => t.webhook_url && t.name !== 'transferir_robo' && !selectedTools.includes(t.id))
                                    .map(tool => (
                                        <option key={tool.id} value={tool.id}>🔗 {tool.name}</option>
                                    ))}
                            </optgroup>
                        )}
                    </select>
                </div>

                <div className="selected-chips-container">
                    {activeTools.length === 0 && <p className="empty-msg">Nenhuma ferramenta vinculada.</p>}
                    {activeTools.map(toolId => {
                        const tool = toolsList.find(t => t.id === toolId);
                        return (
                            <div key={toolId} className="tool-chip">
                                <span>{tool?.webhook_url ? '🔗' : '📅'} {tool ? tool.name : `ID: ${toolId}`}</span>
                                <button onClick={() => setSelectedTools(selectedTools.filter(id => id !== toolId))}>✕</button>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Prompts Customizados das Ferramentas Ativas */}
            {activeTools.length > 0 && (
                <div className="advanced-rag-box" style={{ marginTop: '2rem' }}>
                    <label className="box-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        ⚙️ Prompts das Ferramentas no Pre-Router
                    </label>
                    <p className="empty-msg" style={{ margin: '0.25rem 0 1.25rem' }}>
                        Personalize como o Pre-Router AI deve identificar quando acionar cada habilidade ativa. Por padrão, ele usa a descrição original da ferramenta.
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        {activeTools.map(toolId => {
                            const tool = toolsList.find(t => t.id === toolId);
                            if (!tool) return null;
                            const customVal = getToolPromptValue(tool);
                            const isMaximized = maximizedToolId === tool.id;
                            
                            return (
                                <div key={toolId} style={{ display: 'flex', flexDirection: 'column', gap: '6px', position: 'relative' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', fontWeight: 700, color: '#fff' }}>
                                            <span>{tool.webhook_url ? '🔗' : '📅'}</span>
                                            <span>{tool.name}</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setMaximizedToolId(tool.id)}
                                            style={{
                                                background: 'rgba(255, 255, 255, 0.05)',
                                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                                color: '#818cf8',
                                                borderRadius: '6px',
                                                padding: '2px 8px',
                                                fontSize: '0.72rem',
                                                cursor: 'pointer',
                                                fontWeight: 600,
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px'
                                            }}
                                        >
                                            🔍 Maximizar
                                        </button>
                                    </div>
                                    <textarea
                                        style={{
                                            width: '100%',
                                            minHeight: '80px',
                                            maxHeight: '80px',
                                            background: 'rgba(255, 255, 255, 0.02)',
                                            border: '1px solid var(--wh-border)',
                                            borderRadius: '8px',
                                            padding: '0.65rem 0.75rem',
                                            color: '#fff',
                                            fontSize: '0.8rem',
                                            lineHeight: 1.5,
                                            resize: 'none',
                                            fontFamily: 'inherit'
                                        }}
                                        placeholder="Descreva quando esta ferramenta deve ser chamada..."
                                        value={customVal}
                                        onChange={(e) => {
                                            setToolPrompts({
                                                ...toolPrompts,
                                                [tool.id]: e.target.value
                                            });
                                        }}
                                    />

                                    <ToolPromptModal
                                        tool={tool}
                                        isOpen={isMaximized}
                                        onClose={() => setMaximizedToolId(null)}
                                        value={customVal}
                                        onChange={(e) => {
                                            setToolPrompts({
                                                ...toolPrompts,
                                                [tool.id]: e.target.value
                                            });
                                        }}
                                    />
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Configuração de Dúvidas Sem Resposta & Transbordo Humano */}
            <UnansweredQuestionsConfigSection />
        </div>
    );
};

export default ActionsToolsSection;
