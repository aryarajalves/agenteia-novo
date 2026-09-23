import React from 'react';
import SimulatorResultCard from './SimulatorResultCard';
import SimulatorDiscardedCard from './SimulatorDiscardedCard';

const SimulatorResultsView = ({
    simResults,
    setSimResults,
    deleteToast,
    hasMultiQueryResults,
    simQuery,
    setItemToEdit,
    setIsEditOpen,
    handleOpenDelete
}) => {
    if (!simResults) return null;

    const totalTokens = simResults.usage?.total_tokens || 
        ((simResults.usage?.prompt_tokens || 0) + (simResults.usage?.completion_tokens || 0));

    return (
        <div style={{ marginTop: '2rem', background: 'rgba(0,0,0,0.3)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.05)', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <h5 style={{ color: '#818cf8', fontWeight: 700, margin: 0, fontSize: '0.9rem' }}>RESULTADOS DA BUSCA:</h5>
                    {simResults.usage && totalTokens > 0 && (
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
                            🪙 {totalTokens} tokens consumidos
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
                                        {group.items.map((item, idx) => (
                                            <SimulatorResultCard 
                                                key={item.id ?? `g${gIdx}-${idx}`}
                                                item={item} 
                                                idx={idx} 
                                                queryContext={group.sub_query} 
                                                keyPrefix={`g${gIdx}`}
                                                setItemToEdit={setItemToEdit}
                                                setIsEditOpen={setIsEditOpen}
                                                handleOpenDelete={handleOpenDelete}
                                            />
                                        ))}
                                    </div>
                                )}

                                {group.discarded_items && group.discarded_items.length > 0 && (
                                    <div style={{ marginTop: '1rem', paddingTop: '0.85rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                                        <h6 style={{ color: '#f59e0b', fontWeight: 700, margin: '0 0 0.65rem 0', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <span>⚠️</span>
                                            <span>Itens descartados para esta pergunta ({group.discarded_items.length}):</span>
                                        </h6>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                            {group.discarded_items.map((item, idx) => (
                                                <SimulatorDiscardedCard 
                                                    key={item.id ?? `g${gIdx}-disc-${idx}`}
                                                    item={item} 
                                                    idx={idx} 
                                                    queryContext={group.sub_query} 
                                                    keyPrefix={`g${gIdx}-disc`}
                                                    setItemToEdit={setItemToEdit}
                                                    setIsEditOpen={setIsEditOpen}
                                                    handleOpenDelete={handleOpenDelete}
                                                />
                                            ))}
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
                        {simResults.items?.map((item, idx) => (
                            <SimulatorResultCard 
                                key={item.id ?? `item-${idx}`}
                                item={item} 
                                idx={idx} 
                                queryContext={simQuery} 
                                keyPrefix="item"
                                setItemToEdit={setItemToEdit}
                                setIsEditOpen={setIsEditOpen}
                                handleOpenDelete={handleOpenDelete}
                            />
                        ))}
                    </div>

                    {simResults.discarded_items && simResults.discarded_items.length > 0 && (
                        <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                            <h5 style={{ color: '#f59e0b', fontWeight: 700, margin: '0 0 0.85rem 0', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span>⚠️</span>
                                <span>ITENS DESCARTADOS PELOS FILTROS DE IA (Total: {simResults.discarded_items.length} {simResults.discarded_items.length === 1 ? 'item' : 'itens'}):</span>
                            </h5>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {simResults.discarded_items.map((item, idx) => (
                                    <SimulatorDiscardedCard 
                                        key={item.id ?? `disc-${idx}`}
                                        item={item} 
                                        idx={idx} 
                                        queryContext={simQuery} 
                                        keyPrefix="disc"
                                        setItemToEdit={setItemToEdit}
                                        setIsEditOpen={setIsEditOpen}
                                        handleOpenDelete={handleOpenDelete}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default SimulatorResultsView;
