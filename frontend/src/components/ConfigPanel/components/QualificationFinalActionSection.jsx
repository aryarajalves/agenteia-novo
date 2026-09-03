import React from 'react';

const QualificationFinalActionSection = ({ value = '', onChange }) => {
    const suggestions = [
        "Pergunte se eu posso enviar o link do curso para ele.",
        "Pergunte se ele gostaria de receber o link de matrícula com a condição especial.",
        "Pergunte se ele tem alguma dúvida antes de enviarmos o link de inscrição.",
        "Convide o lead para agendar uma demonstração prática ou falar com um especialista."
    ];

    return (
        <div 
            className="form-section" 
            data-testid="qualification-final-action-section"
            style={{ 
                marginTop: '1.5rem', 
                borderTop: '1px solid rgba(255,255,255,0.08)', 
                paddingTop: '1.5rem' 
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span className="section-label" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: '#f8fafc' }}>
                    🎯 Pergunta / Ação Final Pós-Qualificação (Fechamento)
                </span>
                <span style={{ 
                    fontSize: '0.75rem', 
                    padding: '2px 8px', 
                    borderRadius: '12px', 
                    background: 'rgba(56, 189, 248, 0.15)', 
                    border: '1px solid rgba(56, 189, 248, 0.3)', 
                    color: '#38bdf8',
                    fontWeight: 600
                }}>
                    ✨ Fechamento do Funil
                </span>
            </div>

            <p className="subtab-tip" style={{ marginBottom: '0.75rem', color: '#94a3b8', fontSize: '0.82rem', lineHeight: '1.4' }}>
                Defina a pergunta ou diretriz que a IA formulará <strong>imediatamente após o lead responder a todas as etapas</strong> de qualificação (ex: pedir permissão para enviar o link do curso, convidar para fechar, etc.).
            </p>

            <textarea
                id="qualification-final-action-textarea"
                data-testid="qualification-final-action-input"
                placeholder="Ex: Pergunte pro usuário de forma consultiva e simpática se eu posso enviar o link do curso para ele..."
                value={value || ''}
                onChange={(e) => onChange(e.target.value)}
                style={{ 
                    minHeight: '85px', 
                    width: '100%', 
                    background: 'rgba(15, 23, 42, 0.8)', 
                    border: '1px solid rgba(255, 255, 255, 0.12)', 
                    borderRadius: '8px', 
                    padding: '10px 14px', 
                    color: '#fff', 
                    fontSize: '0.85rem',
                    boxSizing: 'border-box',
                    outline: 'none'
                }}
            />

            {/* Sugestões Rápidas */}
            <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>💡 Sugestões rápidas:</span>
                {suggestions.map((sug, i) => (
                    <button
                        key={i}
                        type="button"
                        onClick={() => onChange(sug)}
                        style={{
                            background: 'rgba(255, 255, 255, 0.04)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            borderRadius: '6px',
                            color: '#cbd5e1',
                            fontSize: '0.72rem',
                            padding: '3px 8px',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(99, 102, 241, 0.2)';
                            e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.4)';
                            e.currentTarget.style.color = '#c7d2fe';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                            e.currentTarget.style.color = '#cbd5e1';
                        }}
                    >
                        {sug}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default QualificationFinalActionSection;
