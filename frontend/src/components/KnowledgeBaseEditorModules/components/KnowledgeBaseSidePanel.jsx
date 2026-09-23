import React from 'react';

const KnowledgeBaseSidePanel = ({ isNew, itemsCount }) => {
    return (
        <div className="side-panel">
            {!isNew && (
                <div className="step-card" style={{ marginBottom: '1.5rem', background: 'rgba(99, 102, 241, 0.05)', borderColor: 'rgba(99, 102, 241, 0.1)' }}>
                    <h4 style={{ color: 'white', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        📊 Status da Base
                    </h4>
                    <div className="kb-stat" style={{ margin: 0, padding: '1rem' }}>
                        <span className="kb-stat-value" style={{ fontSize: '2rem' }}>{itemsCount}</span>
                        <span className="kb-stat-label">Itens indexados</span>
                    </div>
                    <div style={{ marginTop: '1rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        Esta base está ativa e pronta para ser consultada pelos seus robôs.
                    </div>
                </div>
            )}

            <div className="step-card" style={{ background: 'rgba(255, 255, 255, 0.02)' }}>
                <h4 style={{ color: 'white', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    💡 Dicas de Configuração
                </h4>
                <ul style={{ 
                    paddingLeft: '1.2rem', 
                    color: 'var(--text-secondary)', 
                    fontSize: '0.85rem', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '12px' 
                }}>
                    <li><strong>Nome Claro:</strong> Use nomes que identifiquem facilmente o conteúdo (ex: <i>Menu Pizzaria</i>).</li>
                    <li><strong>Descrição RAG:</strong> A descrição ajuda o algoritmo a entender quando buscar informações nesta base.</li>
                    <li><strong>Tipo FAQ:</strong> Ideal para respostas diretas a perguntas comuns.</li>
                    <li><strong>Tipo Produtos:</strong> Melhor para descrições técnicas, preços e estoque.</li>
                </ul>
            </div>
        </div>
    );
};

export default KnowledgeBaseSidePanel;
