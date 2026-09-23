import React from 'react';

const QuestionFunnelBasicFields = ({
    name,
    setName,
    triggerQuestion,
    setTriggerQuestion,
    variations,
    newVariation,
    setNewVariation,
    onAddVariation,
    onRemoveVariation
}) => {
    return (
        <>
            {/* Funnel Name */}
            <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '0.35rem' }}>
                    Nome do Funil:
                </label>
                <input 
                    type="text" 
                    className="premium-input"
                    placeholder="Ex: Como Funciona o Curso (Apresentação Principal)"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    style={{ width: '100%', padding: '0.55rem 0.75rem', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#f8fafc', fontSize: '0.9rem' }}
                />
            </div>

            {/* Trigger Question */}
            <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '0.35rem' }}>
                    💬 Pergunta Principal que Ativa este Funil:
                </label>
                <input 
                    type="text" 
                    className="premium-input"
                    placeholder="Ex: como funciona o curso de vcs?"
                    value={triggerQuestion}
                    onChange={(e) => setTriggerQuestion(e.target.value)}
                    style={{ width: '100%', padding: '0.55rem 0.75rem', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#f8fafc', fontSize: '0.9rem' }}
                />
            </div>

            {/* Variations */}
            <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '0.35rem' }}>
                    🔄 Variações e Sinônimos da Pergunta (Opcional):
                </label>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <input 
                        type="text" 
                        className="premium-input"
                        placeholder="Ex: me explica como é as aulas"
                        value={newVariation}
                        onChange={(e) => setNewVariation(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onAddVariation(); } }}
                        style={{ flex: 1, padding: '0.45rem 0.65rem', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#f8fafc', fontSize: '0.82rem' }}
                    />
                    <button
                        type="button"
                        onClick={onAddVariation}
                        style={{ padding: '0.45rem 0.85rem', background: 'rgba(59, 130, 246, 0.2)', border: '1px solid #3b82f6', color: '#60a5fa', borderRadius: '6px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600 }}
                    >
                        + Adicionar
                    </button>
                </div>
                {variations.length > 0 && (
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                        {variations.map((v, i) => (
                            <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.2rem 0.55rem', background: 'rgba(51, 65, 85, 0.5)', border: '1px solid #475569', borderRadius: '6px', fontSize: '0.78rem', color: '#cbd5e1' }}>
                                "{v}"
                                <button type="button" onClick={() => onRemoveVariation(i)} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '0.75rem' }}>✕</button>
                            </span>
                        ))}
                    </div>
                )}
            </div>
        </>
    );
};

export default QuestionFunnelBasicFields;
