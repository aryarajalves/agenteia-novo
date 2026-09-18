import React from 'react';

const QualificationStagesTab = ({
    qualificationQuestions = [],
    onOpenNewStage,
    onOpenStageModal,
    onMoveStage,
    onRemoveStageClick
}) => {
    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span className="section-label" style={{ margin: 0 }}>🎯 Etapas de Sondagem do Funil Ativo</span>
                <button
                    type="button"
                    onClick={onOpenNewStage}
                    style={{
                        background: 'rgba(99, 102, 241, 0.2)',
                        border: '1px solid rgba(99, 102, 241, 0.4)',
                        color: '#a5b4fc',
                        padding: '0.4rem 0.8rem',
                        borderRadius: '8px',
                        fontSize: '0.8rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                    }}
                >
                    ➕ Nova Etapa / Prompt
                </button>
            </div>
            
            <p className="subtab-tip" style={{ marginBottom: '1rem' }}>
                A IA conduzirá o lead por cada objetivo de forma natural e consultiva. Você não precisa escrever perguntas fixas: forneça uma <strong>diretriz / prompt</strong> e a IA formulará a pergunta ideal adaptada à conversa. Clique em qualquer etapa para abrir os detalhes no popup.
            </p>

            {/* Listagem de Etapas do Funil */}
            <div className="ignore-msg-list" style={{ marginTop: '0.5rem' }}>
                {qualificationQuestions.length === 0 ? (
                    <div className="empty-state">
                        Nenhuma etapa cadastrada. Clique em "➕ Nova Etapa / Prompt" para criar o funil de sondagem.
                    </div>
                ) : (
                    qualificationQuestions.map((q, idx) => {
                        const title = typeof q === 'string' ? q : (q.title || q.text || `Etapa ${idx + 1}`);
                        const prompt = typeof q === 'string' ? '' : (q.prompt || q.prompt_instruction || q.instruction || '');
                        const criteria = typeof q === 'string' ? '' : (q.criteria || q.completion_criteria || '');

                        return (
                            <div 
                                key={idx} 
                                className="ignore-msg-item" 
                                onClick={() => onOpenStageModal(idx, q)}
                                style={{ 
                                    flexDirection: 'column', 
                                    alignItems: 'stretch', 
                                    gap: '0.5rem',
                                    padding: '0.85rem 1rem',
                                    background: 'rgba(255,255,255,0.02)',
                                    border: '1px solid rgba(255,255,255,0.06)',
                                    borderRadius: '10px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease'
                                }}
                                onMouseOver={(e) => {
                                    e.currentTarget.style.background = 'rgba(99, 102, 241, 0.06)';
                                    e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.28)';
                                }}
                                onMouseOut={(e) => {
                                    e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
                                }}
                                title="Clique para abrir etapa no popup centralizado"
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%' }}>
                                    <span style={{
                                        minWidth: '26px', height: '26px', borderRadius: '50%',
                                        background: 'rgba(99,102,241,0.3)', color: '#a5b4fc',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '0.8rem', fontWeight: 700, flexShrink: 0
                                    }}>{idx + 1}</span>
                                    
                                    <div 
                                        className="msg-text" 
                                        style={{ flex: 1, userSelect: 'none', fontWeight: '600', color: '#f1f5f9', fontSize: '0.9rem' }}
                                    >
                                        🎯 {title}
                                    </div>

                                    <div style={{ display: 'flex', gap: '6px', flexShrink: 0, alignItems: 'center' }}>
                                        <button 
                                            type="button" 
                                            onClick={(e) => { e.stopPropagation(); onOpenStageModal(idx, q); }} 
                                            className="delete-btn" 
                                            style={{ 
                                                color: '#c7d2fe', 
                                                fontSize: '0.78rem', 
                                                display: 'flex', 
                                                alignItems: 'center', 
                                                gap: '4px', 
                                                background: 'rgba(99, 102, 241, 0.15)', 
                                                border: '1px solid rgba(99, 102, 241, 0.3)', 
                                                borderRadius: '6px', 
                                                padding: '3px 8px' 
                                            }}
                                            title="Abrir etapa no popup centralizado"
                                        >
                                            ✏️ Abrir
                                        </button>
                                        <button 
                                            type="button" 
                                            onClick={(e) => { e.stopPropagation(); onMoveStage(idx, -1); }} 
                                            disabled={idx === 0}
                                            className="delete-btn" 
                                            style={{ opacity: idx === 0 ? 0.3 : 1, fontSize: '0.75rem' }}
                                            title="Mover para cima"
                                        >
                                            ▲
                                        </button>
                                        <button 
                                            type="button" 
                                            onClick={(e) => { e.stopPropagation(); onMoveStage(idx, 1); }} 
                                            disabled={idx === qualificationQuestions.length - 1}
                                            className="delete-btn" 
                                            style={{ opacity: idx === qualificationQuestions.length - 1 ? 0.3 : 1, fontSize: '0.75rem' }}
                                            title="Mover para baixo"
                                        >
                                            ▼
                                        </button>
                                        <button 
                                            type="button" 
                                            onClick={(e) => { e.stopPropagation(); onRemoveStageClick(idx, title); }} 
                                            className="delete-btn"
                                            title="Excluir etapa"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </div>

                                <div style={{ paddingLeft: '2.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '-0.1rem' }}>
                                    {prompt && (
                                        <div style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                                            <span style={{ color: '#818cf8', fontWeight: 'bold' }}>🤖 Prompt:</span>
                                            <span style={{ color: '#cbd5e1' }}>{prompt}</span>
                                        </div>
                                    )}
                                    {criteria && (
                                        <div style={{ fontSize: '0.75rem', color: '#64748b', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <span style={{ color: '#10b981', fontWeight: 'bold' }}>↳ Critério:</span> {criteria}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default QualificationStagesTab;
