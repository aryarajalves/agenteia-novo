import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { useConfig } from '../ConfigContext';
import HabilidadesGuideModal from './Modals/HabilidadesGuideModal';
import UnansweredQuestionsConfigSection from './UnansweredQuestionsConfigSection';

const TabHabilidades = () => {
    const {
        kbList, knowledgeBaseIds, setKnowledgeBaseIds,
        ragRetrievalCount, setRagRetrievalCount,
        ragTranslationEnabled, setRagTranslationEnabled,
        ragMultiQueryEnabled, setRagMultiQueryEnabled,
        ragRerankEnabled, setRagRerankEnabled,
        ragParentExpansionEnabled, setRagParentExpansionEnabled,
        ragAgenticEvalEnabled, setRagAgenticEvalEnabled,
        ragRelevanceThreshold, setRagRelevanceThreshold,
        toolsList, selectedTools, setSelectedTools,
        toolPrompts, setToolPrompts,
        googleConnected, showHabilidadesGuide, setShowHabilidadesGuide
    } = useConfig();

    const [activeSubTab, setActiveSubTab] = useState('rag');
    const [maximizedToolId, setMaximizedToolId] = useState(null);

    const subTabs = [
        { id: 'rag', label: '📚 Conhecimento (RAG)', desc: 'Bases semânticas de dados' },
        { id: 'actions', label: '🔗 Ações & Ferramentas', desc: 'Integrações de API e ações' }
    ];

    return (
        <div className="fade-in">
            {/* Header da aba com Guia e Sub-abas */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                    {subTabs.map(tab => (
                        <button
                            key={tab.id}
                            type="button;`"
                            onClick={() => setActiveSubTab(tab.id)}
                            className={`toggle-option ${activeSubTab === tab.id ? 'active' : ''}`}
                            style={{ 
                                padding: '0.5rem 1.25rem', 
                                borderRadius: '12px', 
                                fontSize: '0.8rem', 
                                fontWeight: 700,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'flex-start',
                                gap: '2px',
                                background: activeSubTab === tab.id ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255,255,255,0.02)',
                                border: activeSubTab === tab.id ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid var(--wh-border)',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease-in-out'
                            }}
                        >
                            <span style={{ color: activeSubTab === tab.id ? '#fff' : 'var(--wh-text-secondary)' }}>{tab.label}</span>
                            <span style={{ fontSize: '0.65rem', opacity: 0.6, fontWeight: 500, color: activeSubTab === tab.id ? 'rgba(255,255,255,0.8)' : 'var(--wh-text-secondary)' }}>{tab.desc}</span>
                        </button>
                    ))}
                </div>

                <button type="button" onClick={() => setShowHabilidadesGuide(true)} className="guide-btn skills" style={{ margin: 0 }}>
                    <span>📖</span><span>Guia das Habilidades</span>
                </button>
            </div>

            <HabilidadesGuideModal isOpen={showHabilidadesGuide} onClose={() => setShowHabilidadesGuide(false)} />

            {/* Conteúdo de RAG (Conhecimento Externo) */}
            {activeSubTab === 'rag' && (
                <div className="form-section fade-in">
                    <span className="section-label" style={{ marginBottom: '1.25rem' }}>📚 Conhecimento Externo (RAG)</span>
                    
                    <div className="form-group">
                        <label>Vincular Bases de Conhecimento</label>
                        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
                            <select
                                style={{ flex: 1 }}
                                value=""
                                onChange={(e) => {
                                    const val = parseInt(e.target.value);
                                    if (val && !knowledgeBaseIds.includes(val)) {
                                        setKnowledgeBaseIds([...knowledgeBaseIds, val]);
                                    }
                                }}
                            >
                                <option value="">+ Adicionar Base...</option>
                                {kbList
                                    .filter(kb => !knowledgeBaseIds.includes(kb.id))
                                    .map(kb => (
                                        <option key={kb.id} value={kb.id}>{kb.name} ({kb.items?.length || 0} itens)</option>
                                    ))}
                            </select>
                            <Link to="/knowledge-bases" className="access-btn">Gerenciar Bases</Link>
                        </div>

                        <div className="selected-chips-container">
                            {knowledgeBaseIds.length === 0 && <p className="empty-msg">Nenhuma base vinculada.</p>}
                            {knowledgeBaseIds.map(kbId => {
                                const kb = kbList.find(b => b.id === kbId);
                                return (
                                    <div key={kbId} className="tool-chip kb">
                                        <span>📚 {kb ? kb.name : `ID: ${kbId}`}</span>
                                        <button onClick={() => setKnowledgeBaseIds(knowledgeBaseIds.filter(id => id !== kbId))}>✕</button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="form-group" style={{ marginTop: '1.5rem' }}>
                        <label>Número de Respostas (RAG Limit) <span className="label-value">{ragRetrievalCount} itens</span></label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem' }}>
                            <input type="range" min="1" max="20" step="1" value={ragRetrievalCount} onChange={(e) => setRagRetrievalCount(parseInt(e.target.value))} style={{ flex: 1 }} />
                            <span className="range-val">{ragRetrievalCount}</span>
                        </div>
                    </div>

                    <div className="form-group" style={{ marginTop: '1.5rem' }}>
                        <label>Relevância Mínima para Envio ao RAG <span className="label-value">{ragRelevanceThreshold}%</span></label>
                        <p className="empty-msg" style={{ margin: '0.25rem 0 0.75rem' }}>
                            Itens encontrados na base com relevância abaixo desse percentual não serão enviados como contexto para a IA. Deixe em 0% para não filtrar nada.
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <input
                                type="range"
                                min="0"
                                max="100"
                                step="5"
                                value={ragRelevanceThreshold}
                                onChange={(e) => setRagRelevanceThreshold(parseInt(e.target.value))}
                                style={{ flex: 1 }}
                            />
                            <span className="range-val">{ragRelevanceThreshold}%</span>
                        </div>
                    </div>

                    {/* Advanced RAG Modules */}
                    <div className="advanced-rag-box" style={{ marginTop: '1.75rem' }}>
                        <label className="box-title">🧠 Módulos Avançados de RAG</label>
                        <div className="rag-modules-list">
                            {[
                                { label: '🌍 Tradução Automática de Busca', state: ragTranslationEnabled, setter: setRagTranslationEnabled, desc: 'Traduz perguntas para o idioma da base antes de procurar.' },
                                { label: '🔀 Busca Multi-Variável (Multi-Query)', state: ragMultiQueryEnabled, setter: setRagMultiQueryEnabled, desc: 'Gera diferentes interpretações da dúvida para maximizar resultados.' },
                                { label: '🎯 Re-Rankeador Semântico (LLM Reranking)', state: ragRerankEnabled, setter: setRagRerankEnabled, desc: 'Usa IA para ordenar os resultados por utilidade real.' },
                                { label: '📖 Expansão de Contexto Pai', state: ragParentExpansionEnabled, setter: setRagParentExpansionEnabled, desc: 'Inclui o contexto completo do documento de origem.' },
                                { label: '🛑 Avaliador Agêntico (Self-Correction)', state: ragAgenticEvalEnabled, setter: setRagAgenticEvalEnabled, desc: 'IA filtra trechos irrelevantes antes de responder.' }
                            ].map((mod, i) => (
                                <div key={i} className="rag-module-item">
                                    <div className="mod-info">
                                        <div className="mod-label">{mod.label}</div>
                                        <div className="mod-desc">{mod.desc}</div>
                                    </div>
                                    <div className={`status-badge ${mod.state ? 'active' : ''}`} onClick={() => mod.setter(!mod.state)}>
                                        {mod.state ? 'ON' : 'OFF'}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Conteúdo de Ações & Ferramentas (API) */}
            {activeSubTab === 'actions' && (
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
                            {selectedTools.filter(toolId => {
                                const tool = toolsList.find(t => t.id === toolId);
                                return tool?.name !== 'transferir_robo';
                            }).length === 0 && <p className="empty-msg">Nenhuma ferramenta vinculada.</p>}
                            {selectedTools
                                .filter(toolId => {
                                    const tool = toolsList.find(t => t.id === toolId);
                                    return tool?.name !== 'transferir_robo';
                                })
                                .map(toolId => {
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
                    {selectedTools.filter(toolId => {
                        const tool = toolsList.find(t => t.id === toolId);
                        return tool?.name !== 'transferir_robo';
                    }).length > 0 && (
                        <div className="advanced-rag-box" style={{ marginTop: '2rem' }}>
                            <label className="box-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                ⚙️ Prompts das Ferramentas no Pre-Router
                            </label>
                            <p className="empty-msg" style={{ margin: '0.25rem 0 1.25rem' }}>
                                Personalize como o Pre-Router AI deve identificar quando acionar cada habilidade ativa. Por padrão, ele usa a descrição original da ferramenta.
                            </p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                {selectedTools
                                    .filter(toolId => {
                                        const tool = toolsList.find(t => t.id === toolId);
                                        return tool?.name !== 'transferir_robo';
                                    })
                                    .map(toolId => {
                                        const tool = toolsList.find(t => t.id === toolId);
                                        if (!tool) return null;
                                        // Valor padrão: se for undefined ou null, usa a descrição original da ferramenta como valor inicial
                                        const customVal = toolPrompts[tool.id] !== undefined ? toolPrompts[tool.id] : (toolPrompts[String(tool.id)] !== undefined ? toolPrompts[String(tool.id)] : (tool.description || ''));
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

                                                {/* Modal centralizado para edição maximizada da ferramenta.
                                                    Renderizado via portal em document.body: assim o "position: fixed"
                                                    fica relativo à janela inteira, e não a algum ancestral desta árvore
                                                    (ex: painel com transform/filter em animações) que quebraria a
                                                    centralização e faria o overlay cobrir só parte da tela. */}
                                                {isMaximized && createPortal(
                                                    <div
                                                        style={{
                                                            position: 'fixed',
                                                            inset: 0,
                                                            background: 'rgba(2, 6, 23, 0.85)',
                                                            backdropFilter: 'blur(12px)',
                                                            zIndex: 2000,
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            padding: '2rem'
                                                        }}
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <div
                                                            style={{
                                                                background: 'linear-gradient(145deg, #0f172a 0%, #1e293b 100%)',
                                                                border: '1px solid rgba(99, 102, 241, 0.3)',
                                                                borderRadius: '20px',
                                                                width: '100%',
                                                                maxWidth: '700px',
                                                                display: 'flex',
                                                                flexDirection: 'column',
                                                                boxShadow: '0 50px 100px rgba(0,0,0,0.9), 0 0 50px rgba(99, 102, 241, 0.15)'
                                                            }}
                                                        >
                                                            {/* Header do modal */}
                                                            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                    <span style={{ fontSize: '1.2rem' }}>{tool.webhook_url ? '🔗' : '📅'}</span>
                                                                    <div style={{ fontWeight: 800, color: '#fff', fontSize: '0.95rem' }}>{tool.name}</div>
                                                                </div>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setMaximizedToolId(null)}
                                                                    style={{
                                                                        background: 'rgba(255, 255, 255, 0.05)',
                                                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                                                        color: '#94a3b8',
                                                                        borderRadius: '10px',
                                                                        width: '32px',
                                                                        height: '32px',
                                                                        cursor: 'pointer',
                                                                        fontSize: '0.9rem'
                                                                    }}
                                                                >
                                                                    ✕
                                                                </button>
                                                            </div>
                                                            {/* Corpo com textarea grande */}
                                                            <div style={{ padding: '1.5rem' }}>
                                                                <textarea
                                                                    style={{
                                                                        width: '100%',
                                                                        height: '350px',
                                                                        background: 'rgba(255, 255, 255, 0.01)',
                                                                        border: '1px solid var(--wh-border)',
                                                                        borderRadius: '12px',
                                                                        padding: '1rem',
                                                                        color: '#fff',
                                                                        fontSize: '0.9rem',
                                                                        lineHeight: 1.6,
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
                                                            </div>
                                                        </div>
                                                    </div>,
                                                    document.body
                                                )}
                                            </div>
                                        );
                                    })}
                            </div>
                        </div>
                    )}

                    {/* Configuração de Dúvidas Sem Resposta & Transbordo Humano */}
                    <UnansweredQuestionsConfigSection />
                </div>
            )}
        </div>
    );
};

export default TabHabilidades;
