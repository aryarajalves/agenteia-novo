import React from 'react';

const PreRouterDecisionView = ({ activePreRouterTab, rawData }) => {
    if (!rawData) return null;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', color: '#e2e8f0', textAlign: 'left' }}>
            {activePreRouterTab === 'classifications' && (
                <div style={{ background: 'rgba(7, 10, 19, 0.4)', padding: '24px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <h4 style={{ margin: '0 0 16px 0', color: '#fbbf24', fontSize: '1rem' }}>Filtros e Intenções do Usuário</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
                        {Object.entries(rawData)
                            .filter(([key]) => typeof rawData[key] === 'boolean' || key === 'id_agente_alvo')
                            .map(([key, val]) => (
                                <div key={key} style={{
                                    background: 'rgba(255, 255, 255, 0.03)',
                                    border: '1px solid rgba(255,255,255,0.05)',
                                    borderRadius: '10px',
                                    padding: '12px 16px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: '12px',
                                    minHeight: '48px'
                                }}>
                                    <span style={{ 
                                        fontSize: '0.85rem', 
                                        color: '#94a3b8', 
                                        fontWeight: '500',
                                        wordBreak: 'break-word',
                                        flex: 1
                                    }}>
                                        {key}
                                    </span>
                                    <span style={{
                                        fontSize: '0.78rem',
                                        fontWeight: 'bold',
                                        color: typeof val === 'boolean' ? (val ? '#4ade80' : '#f87171') : '#818cf8',
                                        background: typeof val === 'boolean' ? (val ? 'rgba(74, 222, 128, 0.12)' : 'rgba(248, 113, 113, 0.12)') : 'rgba(99, 102, 241, 0.12)',
                                        border: typeof val === 'boolean' ? (val ? '1px solid rgba(74, 222, 128, 0.25)' : '1px solid rgba(248, 113, 113, 0.25)') : '1px solid rgba(99, 102, 241, 0.25)',
                                        padding: '4px 10px',
                                        borderRadius: '8px',
                                        whiteSpace: 'nowrap',
                                        flexShrink: 0,
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        lineHeight: 1.2
                                    }}>
                                        {typeof val === 'boolean' ? (val ? 'Sim (True)' : 'Não (False)') : val}
                                    </span>
                                </div>
                            ))}
                    </div>
                </div>
            )}

            {activePreRouterTab === 'questions' && (
                <div style={{ background: 'rgba(7, 10, 19, 0.4)', padding: '24px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <h4 style={{ margin: '0 0 12px 0', color: '#fbbf24', fontSize: '1rem' }}>Perguntas Extraídas</h4>
                    <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '0 0 16px 0' }}>
                        Perguntas e dúvidas extraídas pelo classificador para alimentar o RAG ou busca de conhecimento.
                    </p>
                    <div style={{
                        background: 'rgba(255,255,255,0.02)',
                        padding: '16px 20px',
                        borderRadius: '12px',
                        borderLeft: '4px solid #fbbf24',
                        fontSize: '0.9rem',
                        lineHeight: '1.6',
                        color: rawData.perguntas_extraidas ? '#f8fafc' : '#64748b',
                        fontStyle: rawData.perguntas_extraidas ? 'normal' : 'italic'
                    }}>
                        {rawData.perguntas_extraidas || "Nenhuma pergunta foi extraída desta mensagem."}
                    </div>
                </div>
            )}

            {activePreRouterTab === 'memory' && (
                <div style={{ background: 'rgba(7, 10, 19, 0.4)', padding: '24px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <h4 style={{ margin: '0 0 12px 0', color: '#fbbf24', fontSize: '1rem' }}>Resumo de Memórias</h4>
                    <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '0 0 16px 0' }}>
                        Resumo condensado das interações anteriores mantido no contexto do Pre-Router.
                    </p>
                    <div style={{
                        background: 'rgba(255,255,255,0.02)',
                        padding: '16px 20px',
                        borderRadius: '12px',
                        borderLeft: '4px solid #6366f1',
                        fontSize: '0.9rem',
                        lineHeight: '1.6',
                        color: rawData.resumo_memorias ? '#f8fafc' : '#64748b',
                        fontStyle: rawData.resumo_memorias ? 'normal' : 'italic',
                        whiteSpace: 'pre-wrap'
                    }}>
                        {rawData.resumo_memorias || "Nenhum histórico ou memória foi processado ainda."}
                    </div>
                </div>
            )}
        </div>
    );
};

export default PreRouterDecisionView;
