import React, { useState } from 'react';
import { useKB } from '../KBContext';
import { api } from '../../../api/client';
import ConfirmModal from '../../ConfirmModal';
import SimulatorSearchLoadingModal from './SimulatorSearchLoadingModal';
import SimulatorResultsView from './SimulatorResultsView';

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

                <SimulatorResultsView
                    simResults={simResults}
                    setSimResults={setSimResults}
                    deleteToast={deleteToast}
                    hasMultiQueryResults={hasMultiQueryResults}
                    simQuery={simQuery}
                    setItemToEdit={setItemToEdit}
                    setIsEditOpen={setIsEditOpen}
                    handleOpenDelete={handleOpenDelete}
                />
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
