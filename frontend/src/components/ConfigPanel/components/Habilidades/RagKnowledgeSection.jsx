import React from 'react';
import { Link } from 'react-router-dom';
import { useConfig } from '../../ConfigContext';

const RagKnowledgeSection = ({ globalVars = [] }) => {
    const {
        kbList, knowledgeBaseIds, setKnowledgeBaseIds,
        ragRetrievalCount, setRagRetrievalCount,
        ragTranslationEnabled, setRagTranslationEnabled,
        ragMultiQueryEnabled, setRagMultiQueryEnabled,
        ragRerankEnabled, setRagRerankEnabled,
        ragParentExpansionEnabled, setRagParentExpansionEnabled,
        ragAgenticEvalEnabled, setRagAgenticEvalEnabled,
        ragRelevanceThreshold, setRagRelevanceThreshold,
        ragKbRoutingEnabled, setRagKbRoutingEnabled,
        ragKbRoutingVariable, setRagKbRoutingVariable
    } = useConfig();

    const ragModules = [
        { id: 'translation', label: '🌍 Tradução Automática de Busca', state: ragTranslationEnabled, setter: setRagTranslationEnabled, desc: 'Traduz perguntas para o idioma da base antes de procurar.' },
        { id: 'multi-query', label: '🔀 Busca Multi-Variável (Multi-Query)', state: ragMultiQueryEnabled, setter: setRagMultiQueryEnabled, desc: 'Gera diferentes interpretações da dúvida para maximizar resultados.' },
        { id: 'rerank', label: '🎯 Re-Rankeador Semântico (LLM Reranking)', state: ragRerankEnabled, setter: setRagRerankEnabled, desc: 'Usa IA para ordenar os resultados por utilidade real.' },
        { id: 'parent-expansion', label: '📖 Expansão de Contexto Pai', state: ragParentExpansionEnabled, setter: setRagParentExpansionEnabled, desc: 'Inclui o contexto completo do documento de origem.' },
        { id: 'agentic-eval', label: '🛑 Avaliador Agêntico (Self-Correction)', state: ragAgenticEvalEnabled, setter: setRagAgenticEvalEnabled, desc: 'IA filtra trechos irrelevantes antes de responder.' },
        { id: 'kb-routing', label: '🎯 Roteamento Agêntico de Bases (KB Routing)', state: ragKbRoutingEnabled, setter: setRagKbRoutingEnabled, desc: 'Lê o nome e a descrição das bases vinculadas e direciona a busca apenas para a base certa usando a variável do produto/curso.' }
    ];

    return (
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
                    {ragModules.map((mod, i) => (
                        <div key={i} className="rag-module-item-container" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <div className="rag-module-item">
                                <div className="mod-info">
                                    <div className="mod-label">{mod.label}</div>
                                    <div className="mod-desc">{mod.desc}</div>
                                </div>
                                <div className={`status-badge ${mod.state ? 'active' : ''}`} onClick={() => mod.setter(!mod.state)}>
                                    {mod.state ? 'ON' : 'OFF'}
                                </div>
                            </div>
                            {mod.id === 'kb-routing' && ragKbRoutingEnabled && (
                                <div style={{ padding: '0.75rem', background: 'rgba(99, 102, 241, 0.08)', borderRadius: '8px', border: '1px solid rgba(99, 102, 241, 0.2)', marginBottom: '0.5rem' }}>
                                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#fff', marginBottom: '0.35rem' }}>
                                        Variável de Produto/Curso para Roteamento:
                                    </label>
                                    <select
                                        aria-label="Variável de Roteamento de Base"
                                        value={ragKbRoutingVariable || ''}
                                        onChange={(e) => setRagKbRoutingVariable(e.target.value)}
                                        style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', background: 'rgba(15, 23, 42, 0.8)', color: '#fff', border: '1px solid rgba(255, 255, 255, 0.15)', fontSize: '0.85rem' }}
                                    >
                                        <option value="">Detecção Automática (curso_interesse, produto_interesse, etc.)</option>
                                        {globalVars.map(v => (
                                            <option key={v.id || v.key} value={v.key}>{v.key} ({v.description || v.extraction_method || 'string'})</option>
                                        ))}
                                    </select>
                                    <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', margin: '0.4rem 0 0' }}>
                                        A IA lerá o valor desta variável e comparará com a descrição de cada base vinculada para filtrar a base correta antes da busca vetorial.
                                    </p>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default RagKnowledgeSection;
