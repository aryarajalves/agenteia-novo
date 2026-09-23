import React from 'react';

const ObjectionCard = ({
    cluster,
    index,
    maxCount,
    isExpanded,
    onToggleExpand,
    onOpenRagModal
}) => {
    const percentage = Math.round((cluster.count / maxCount) * 100);

    return (
        <div className="objection-card">
            <div className="objection-card-header" onClick={onToggleExpand}>
                {/* Badge da posição no Ranking */}
                <div className="objection-rank-badge">
                    <span className="objection-rank-num">{index + 1}º</span>
                    <span className="objection-rank-freq">{cluster.count}x</span>
                </div>

                {/* Informações da categoria */}
                <div className="objection-info-wrapper">
                    <h3 className="objection-category-name">{cluster.category_name}</h3>
                    <p className="objection-representative">
                        ex: "{cluster.representative_question}"
                    </p>
                </div>

                {/* Barra de Progresso */}
                <div className="objection-progress-container">
                    <span className="objection-progress-lbl">Densidade: {percentage}%</span>
                    <div className="objection-progress-bar-bg">
                        <div 
                            className="objection-progress-bar-fill"
                            style={{ width: `${percentage}%` }}
                        ></div>
                    </div>
                </div>

                {/* Ação de Expandir */}
                <button className={`btn-objection-expand ${isExpanded ? 'expanded' : ''}`}>
                    ▼
                </button>
            </div>

            {isExpanded && (
                <div className="objection-card-content">
                    {/* Exemplos de Perguntas Reais */}
                    <div className="objection-details-section">
                        <h4 className="objection-section-title">💬 Perguntas Reais dos Leads</h4>
                        <div className="examples-grid">
                            {cluster.examples && cluster.examples.map((ex, exIdx) => (
                                <div key={exIdx} className="example-item">
                                    {ex}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Script de Resposta Sugerido por IA */}
                    <div className="objection-details-section">
                        <h4 className="objection-section-title">🧠 Quebra de Objeção Sugerida (IA)</h4>
                        <div className="script-box">
                            <p className="script-text">{cluster.suggested_script}</p>
                        </div>
                    </div>

                    {/* Botão de Ação Rápida */}
                    <div className="objection-card-actions">
                        <button
                            className="btn-objection-action save-rag"
                            onClick={() => onOpenRagModal(cluster)}
                        >
                            <span>📚</span>
                            <span>Treinar Base de Conhecimento (RAG)</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ObjectionCard;
