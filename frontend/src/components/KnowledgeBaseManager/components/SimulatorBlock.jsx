import React, { useState } from 'react';
import { useKB } from '../KBContext';
import { api } from '../../../api/client';
import ItemVariationQuickAdd from './ItemVariationQuickAdd';
import ConfirmModal from '../../ConfirmModal';
import SimulatorSearchLoadingModal from './SimulatorSearchLoadingModal';

const OPTION_INFO = {
    translation: 'Detecta o idioma da pergunta e a traduz para português antes de buscar. Útil quando o lead escreve em outro idioma.',
    multiQuery: 'Gera variações da pergunta original (sinônimos e reformulações) para ampliar a cobertura da busca e achar mais itens relevantes.',
    rerank: 'Usa a IA para reordenar os itens encontrados, colocando os mais relevantes para a pergunta no topo da lista.',
    agenticEval: 'A IA revisa os itens retornados e descarta os que não são realmente úteis para responder à pergunta do usuário.',
    parentExpansion: 'Se o item encontrado for um trecho pequeno de um conteúdo maior, expande e retorna o documento completo para dar mais contexto.'
};

const InfoTooltip = ({ text }) => (
    <span className="kb-info-tooltip">
        <span
            className="kb-info-icon"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
        >
            ⓘ
        </span>
        <span className="kb-info-tooltip-text">{text}</span>
    </span>
);

const getDiscardFilterStyle = (item) => {
    const rawFilter = (item?.discard_filter || '').toUpperCase();
    const reason = (item?.discard_reason || '').toLowerCase();

    if (rawFilter.includes('AGENTIC') || reason.includes('não é relevante') || reason.includes('relevância negativa') || reason.includes('sem relação') || reason.includes('outro assunto')) {
        return {
            label: '🤖 AGENTIC EVAL (Avaliação de IA)',
            bg: 'rgba(99, 102, 241, 0.18)',
            color: '#a5b4fc',
            border: '1px solid rgba(99, 102, 241, 0.4)'
        };
    }

    if (rawFilter.includes('RELEVÂNCIA') || rawFilter.includes('THRESHOLD') || reason.includes('limiar') || reason.includes('relevância inferior')) {
        return {
            label: '🎯 RELEVÂNCIA MÍNIMA (Corte por %)',
            bg: 'rgba(245, 158, 11, 0.18)',
            color: '#fbbf24',
            border: '1px solid rgba(245, 158, 11, 0.4)'
        };
    }

    if (rawFilter.includes('RERANK') || rawFilter.includes('LIMITE') || reason.includes('fora do limite') || reason.includes('limit:')) {
        return {
            label: '⚡ RERANK / LIMITE (Fora do Top Resultados)',
            bg: 'rgba(14, 165, 233, 0.18)',
            color: '#38bdf8',
            border: '1px solid rgba(14, 165, 233, 0.4)'
        };
    }

    return {
        label: item?.discard_filter || '🤖 AGENTIC EVAL',
        bg: 'rgba(99, 102, 241, 0.18)',
        color: '#a5b4fc',
        border: '1px solid rgba(99, 102, 241, 0.4)'
    };
};

const SimulatorBlock = () => {
    const { 
        kbId, simQuery, setSimQuery, 
        simResults, setSimResults, 
        simLoading, setSimLoading,
        reloadKnowledgeBase,
        setItemToEdit, setIsEditOpen
    } = useKB();

    const [itemToDelete, setItemToDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteToast, setDeleteToast] = useState('');

    const handleOpenDelete = (item) => {
        setItemToDelete(item);
    };

    const handleConfirmDelete = async () => {
        if (!itemToDelete?.id) return;
        setIsDeleting(true);
        try {
            const res = await api.delete(`/knowledge-items/${itemToDelete.id}`);
            if (res.ok) {
                setSimResults(prev => {
                    if (!prev) return null;
                    const filterFn = i => i.id !== itemToDelete.id;
                    return {
                        ...prev,
                        items: (prev.items || []).filter(filterFn),
                        discarded_items: (prev.discarded_items || []).filter(filterFn),
                        grouped_results: (prev.grouped_results || []).map(g => ({
                            ...g,
                            items: (g.items || []).filter(filterFn),
                            discarded_items: (g.discarded_items || []).filter(filterFn)
                        }))
                    };
                });
                if (reloadKnowledgeBase) reloadKnowledgeBase();
                setDeleteToast(`Item "${itemToDelete.question}" excluído com sucesso!`);
                setTimeout(() => setDeleteToast(''), 4000);
            } else {
                const err = await res.json().catch(() => ({}));
                alert(err.detail || 'Erro ao excluir item.');
            }
        } catch (e) {
            console.error('Erro ao excluir item:', e);
            alert('Erro de conexão ao excluir item.');
        } finally {
            setIsDeleting(false);
            setItemToDelete(null);
        }
    };

    const [simConfig, setSimConfig] = useState({
        translation: false,
        multiQuery: true,
        rerank: true,
        agenticEval: true,
        parentExpansion: false
    });
    const [simRelevanceThreshold, setSimRelevanceThreshold] = useState(0);

    const handleSimulate = async () => {
        if (!simQuery.trim() || !kbId) return;
        setSimLoading(true);
        setSimResults(null);
        try {
            const response = await api.post(`/knowledge-bases/${kbId}/simulate-rag`, {
                query: simQuery,
                translation_enabled: simConfig.translation,
                multi_query_enabled: simConfig.multiQuery,
                rerank_enabled: simConfig.rerank,
                agentic_eval_enabled: simConfig.agenticEval,
                parent_expansion_enabled: simConfig.parentExpansion,
                relevance_threshold: (simRelevanceThreshold || 0) / 100,
                limit: 5
            });
            const data = await response.json().catch(() => ({}));
            if (response.ok) {
                setSimResults(data);
            } else {
                setSimResults({ error: data.detail || 'Erro ao consultar a base de conhecimento.' });
            }
        } catch (e) {
            console.error(e);
            setSimResults({ error: 'Erro de conexão ao testar a busca. Verifique sua internet ou tente novamente.' });
        } finally {
            setSimLoading(false);
        }
    };

    const renderResultCard = (item, idx, queryContext = simQuery, keyPrefix = 'item') => {
        const itemKey = item.id ?? `${keyPrefix}-${idx}`;
        return (
            <div key={itemKey} className="kb-result-card" data-testid={`result-card-${itemKey}`}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', marginBottom: '0.5rem' }}>
                    <span style={{ color: '#f1f5f9', fontWeight: 700, fontSize: '0.9rem' }}>
                        {idx + 1}. {item.question}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {typeof item.relevance_score === 'number' && (
                            <span className="kb-score-badge">
                                {Math.round(item.relevance_score * 100)}%
                            </span>
                        )}
                        <button
                            type="button"
                            onClick={() => {
                                setItemToEdit(item);
                                setIsEditOpen(true);
                            }}
                            className="kb-edit-result-btn"
                            title="Editar este item"
                            data-testid={`edit-result-btn-${itemKey}`}
                            style={{
                                background: 'rgba(99, 102, 241, 0.12)',
                                border: '1px solid rgba(99, 102, 241, 0.3)',
                                color: '#818cf8',
                                borderRadius: '6px',
                                padding: '2px 8px',
                                fontSize: '0.72rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            ✏️ Editar
                        </button>
                        <button
                            type="button"
                            onClick={() => handleOpenDelete(item)}
                            className="kb-delete-result-btn"
                            title="Excluir este item da base de conhecimento"
                            data-testid={`delete-result-btn-${itemKey}`}
                            style={{
                                background: 'rgba(239, 68, 68, 0.12)',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                color: '#f87171',
                                borderRadius: '6px',
                                padding: '2px 8px',
                                fontSize: '0.72rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            🗑️ Excluir
                        </button>
                    </div>
                </div>
                <div style={{ color: '#94a3b8', fontSize: '0.85rem', whiteSpace: 'pre-wrap' }}>
                    {item.answer}
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '0.75rem' }}>
                    {item.category && (
                        <span className="kb-meta-chip">{item.category}</span>
                    )}
                    {item.search_type && (
                        <span className="kb-meta-chip">{item.search_type}</span>
                    )}
                    {item.metadata_val && item.metadata_val.split('|').map((meta, mIdx) => (
                        <span key={mIdx} className="kb-meta-chip">🏷️ {meta.trim()}</span>
                    ))}
                </div>
                <ItemVariationQuickAdd item={item} defaultQuery={queryContext} />
            </div>
        );
    };

    const renderDiscardedResultCard = (item, idx, queryContext = simQuery, keyPrefix = 'disc') => {
        const itemKey = item.id ?? `${keyPrefix}-${idx}`;
        return (
            <div key={itemKey} className="kb-result-card" data-testid={`discarded-card-${itemKey}`} style={{ opacity: 0.95, borderColor: 'rgba(245, 158, 11, 0.35)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', marginBottom: '0.4rem' }}>
                    <span style={{ color: '#e2e8f0', fontWeight: 700, fontSize: '0.88rem' }}>
                        {idx + 1}. {item.question}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {typeof item.relevance_score === 'number' && (
                            <span className="kb-score-badge">
                                {Math.round(item.relevance_score * 100)}%
                            </span>
                        )}
                        <button
                            type="button"
                            onClick={() => {
                                setItemToEdit(item);
                                setIsEditOpen(true);
                            }}
                            className="kb-edit-result-btn"
                            title="Editar este item"
                            data-testid={`edit-result-btn-${itemKey}`}
                            style={{
                                background: 'rgba(99, 102, 241, 0.12)',
                                border: '1px solid rgba(99, 102, 241, 0.3)',
                                color: '#818cf8',
                                borderRadius: '6px',
                                padding: '2px 8px',
                                fontSize: '0.72rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            ✏️ Editar
                        </button>
                        <button
                            type="button"
                            onClick={() => handleOpenDelete(item)}
                            className="kb-delete-result-btn"
                            title="Excluir este item da base de conhecimento"
                            data-testid={`delete-result-btn-${itemKey}`}
                            style={{
                                background: 'rgba(239, 68, 68, 0.12)',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                color: '#f87171',
                                borderRadius: '6px',
                                padding: '2px 8px',
                                fontSize: '0.72rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            🗑️ Excluir
                        </button>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.45rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: 600 }}>
                        Filtro que descartou:
                    </span>
                    <span 
                        style={{
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            padding: '2px 8px',
                            borderRadius: '6px',
                            background: getDiscardFilterStyle(item).bg,
                            color: getDiscardFilterStyle(item).color,
                            border: getDiscardFilterStyle(item).border,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                        }}
                        data-testid={`discard-filter-badge-${itemKey}`}
                    >
                        {getDiscardFilterStyle(item).label}
                    </span>
                </div>

                {item.answer && (
                    <div style={{ color: '#94a3b8', fontSize: '0.82rem', whiteSpace: 'pre-wrap', marginBottom: '0.4rem' }}>
                        {item.answer}
                    </div>
                )}

                <div style={{ 
                    color: '#cbd5e1', 
                    fontSize: '0.8rem', 
                    background: 'rgba(0,0,0,0.25)', 
                    padding: '6px 10px', 
                    borderRadius: '6px', 
                    borderLeft: '3px solid #f59e0b', 
                    marginBottom: '0.5rem' 
                }}>
                    <strong style={{ color: '#fbbf24', fontWeight: 700 }}>Motivo do descarte: </strong>
                    <span>{item.discard_reason || 'Não especificado.'}</span>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                    {item.category && (
                        <span className="kb-meta-chip">{item.category}</span>
                    )}
                    {item.metadata_val && item.metadata_val.split('|').map((meta, mIdx) => (
                        <span key={mIdx} className="kb-meta-chip">🏷️ {meta.trim()}</span>
                    ))}
                </div>
                <ItemVariationQuickAdd item={item} defaultQuery={queryContext} />
            </div>
        );
    };

    const hasMultiQueryResults = Boolean(simResults?.grouped_results && simResults.grouped_results.length > 1);

    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.5rem' }}>
                <div style={{ width: '8px', height: '24px', background: 'linear-gradient(to bottom, #22c55e, #10b981)', borderRadius: '4px' }}></div>
                <h4 style={{ color: 'white', fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>Simulador RAG (Central de Testes)</h4>
            </div>
            <div className="kb-item-modern" style={{ cursor: 'default' }}>
                <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                    Escreva uma pergunta e veja como a base de dados vai responder ao usuário, ativando ou desativando os filtros de IA.
                </p>

                <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
                    {Object.keys(simConfig).map(key => (
                        <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#cbd5e1', fontSize: '0.85rem', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={simConfig[key]}
                                onChange={e => setSimConfig(prev => ({ ...prev, [key]: e.target.checked }))}
                            />
                            {key.toUpperCase()}
                            <InfoTooltip text={OPTION_INFO[key]} />
                        </label>
                    ))}
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#cbd5e1', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                        RELEVÂNCIA MÍNIMA PARA ENVIAR AO RAG
                        <InfoTooltip text="Itens encontrados com relevância abaixo desse percentual são descartados e não entram no contexto enviado à IA." />
                        <span style={{ color: '#34d399', fontWeight: 700 }}>{simRelevanceThreshold}%</span>
                    </label>
                    <input
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        value={simRelevanceThreshold}
                        onChange={e => setSimRelevanceThreshold(parseInt(e.target.value))}
                        style={{ width: '100%' }}
                    />
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                    <input
                        type="text"
                        className="kb-search-input-premium"
                        style={{ flex: 1, width: 'auto' }}
                        placeholder="Faça uma pergunta..."
                        value={simQuery}
                        onChange={e => setSimQuery(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSimulate()}
                    />
                    <button onClick={handleSimulate} disabled={simLoading} className="kb-save-btn-modern">
                        {simLoading ? 'Processando...' : '▶ Testar Busca'}
                    </button>
                </div>

                {simResults && (
                    <div style={{ marginTop: '2rem', background: 'rgba(0,0,0,0.3)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.05)', position: 'relative' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                                <h5 style={{ color: '#818cf8', fontWeight: 700, margin: 0, fontSize: '0.9rem' }}>RESULTADOS DA BUSCA:</h5>
                                {simResults.usage && ((simResults.usage.total_tokens || (simResults.usage.prompt_tokens + simResults.usage.completion_tokens)) > 0) && (
                                    <span 
                                        className="kb-token-usage-badge"
                                        title={`Entrada (Prompt): ${simResults.usage.prompt_tokens || 0} tokens\nSaída (Completion): ${simResults.usage.completion_tokens || 0} tokens`}
                                        data-testid="sim-token-usage-badge"
                                        style={{
                                            background: 'rgba(99, 102, 241, 0.12)',
                                            border: '1px solid rgba(99, 102, 241, 0.3)',
                                            color: '#c7d2fe',
                                            borderRadius: '6px',
                                            padding: '2px 8px',
                                            fontSize: '0.74rem',
                                            fontWeight: 600,
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '4px'
                                        }}
                                    >
                                        🪙 {simResults.usage.total_tokens || (simResults.usage.prompt_tokens + simResults.usage.completion_tokens)} tokens consumidos
                                    </span>
                                )}
                            </div>
                            <button onClick={() => setSimResults(null)} className="close-btn">✕</button>
                        </div>
                        {deleteToast && (
                            <div 
                                style={{ 
                                    background: 'rgba(16, 185, 129, 0.15)', 
                                    border: '1px solid rgba(16, 185, 129, 0.4)', 
                                    color: '#34d399', 
                                    padding: '0.6rem 1rem', 
                                    borderRadius: '8px', 
                                    marginBottom: '1rem',
                                    fontSize: '0.85rem',
                                    fontWeight: 600,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}
                                data-testid="sim-delete-toast"
                            >
                                <span>✓</span> {deleteToast}
                            </div>
                        )}
                        {simResults.error ? (
                            <div style={{ color: '#f87171', fontSize: '0.85rem' }}>{simResults.error}</div>
                        ) : hasMultiQueryResults ? (
                            /* Modo Múltiplas Perguntas: Renderiza cada pergunta com seu grupo de respostas e descartados */
                            <>
                                <div className="kb-multiquery-banner" data-testid="multiquery-banner">
                                    <div className="kb-multiquery-banner-title">
                                        <span>🔀</span>
                                        <span>{simResults.grouped_results.length} Perguntas Identificadas na Mensagem</span>
                                    </div>
                                    <div className="kb-multiquery-banner-desc">
                                        Identificamos dúvidas distintas na sua mensagem. Cada pergunta foi consultada separadamente no banco para trazer as suas próprias respostas específicas:
                                    </div>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {simResults.grouped_results.map((group, gIdx) => (
                                        <div key={gIdx} className="kb-subquery-group" data-testid={`subquery-group-${gIdx}`}>
                                            <div className="kb-subquery-header">
                                                <div className="kb-subquery-title-wrapper">
                                                    <span className="kb-subquery-badge">Pergunta {gIdx + 1}</span>
                                                    <span className="kb-subquery-title">"{group.sub_query}"</span>
                                                </div>
                                                <span className="kb-subquery-count">
                                                    {group.items?.length || 0} {group.items?.length === 1 ? 'item encontrado' : 'itens encontrados'}
                                                </span>
                                            </div>

                                            {(!group.items || group.items.length === 0) ? (
                                                <div style={{ color: '#64748b', fontSize: '0.85rem', fontStyle: 'italic', padding: '0.5rem 0' }}>
                                                    Nenhum item relevante foi encontrado para esta pergunta.
                                                </div>
                                            ) : (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                                    {group.items.map((item, idx) => renderResultCard(item, idx, group.sub_query, `g${gIdx}`))}
                                                </div>
                                            )}

                                            {group.discarded_items && group.discarded_items.length > 0 && (
                                                <div style={{ marginTop: '1rem', paddingTop: '0.85rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                                                    <h6 style={{ color: '#f59e0b', fontWeight: 700, margin: '0 0 0.65rem 0', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        <span>⚠️</span>
                                                        <span>Itens descartados para esta pergunta ({group.discarded_items.length}):</span>
                                                    </h6>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                                        {group.discarded_items.map((item, idx) => renderDiscardedResultCard(item, idx, group.sub_query, `g${gIdx}-disc`))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : (
                            /* Modo Padrão: Pergunta única */
                            <>
                                <div style={{ color: '#cbd5e1', fontSize: '0.85rem', marginBottom: '1rem' }}>
                                    Encontrados {simResults.items?.length || 0} itens.
                                </div>

                                {(!simResults.items || simResults.items.length === 0) && (
                                    <div style={{ color: '#64748b', fontSize: '0.85rem', fontStyle: 'italic' }}>
                                        Nenhum item relevante foi encontrado para essa pergunta.
                                    </div>
                                )}

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    {simResults.items?.map((item, idx) => renderResultCard(item, idx, simQuery, 'item'))}
                                </div>

                                {simResults.discarded_items && simResults.discarded_items.length > 0 && (
                                    <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                                        <h5 style={{ color: '#f59e0b', fontWeight: 700, margin: '0 0 0.85rem 0', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span>⚠️</span>
                                            <span>ITENS DESCARTADOS PELOS FILTROS DE IA (Total: {simResults.discarded_items.length} {simResults.discarded_items.length === 1 ? 'item' : 'itens'}):</span>
                                        </h5>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                            {simResults.discarded_items.map((item, idx) => renderDiscardedResultCard(item, idx, simQuery, 'disc'))}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}
            </div>

            <ConfirmModal
                isOpen={Boolean(itemToDelete)}
                title="Excluir Item da Base"
                message={itemToDelete ? `Tem certeza que deseja excluir permanentemente o item "${itemToDelete.question}"? Esta ação removerá a pergunta e resposta da base de conhecimento.` : ''}
                confirmText="Sim, Excluir"
                cancelText="Cancelar"
                onConfirm={handleConfirmDelete}
                onCancel={() => setItemToDelete(null)}
                isLoading={isDeleting}
                type="danger"
            />

            <SimulatorSearchLoadingModal
                isOpen={simLoading}
                query={simQuery}
                config={simConfig}
            />
        </div>
    );
};

export default SimulatorBlock;
