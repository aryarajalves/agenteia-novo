import React from 'react';

export default function ElseSection({
    condFalseText,
    setCondFalseText
}) {
    return (
        <div className="form-group-block" style={{ marginTop: '1.5rem', marginBottom: '1.25rem' }}>
            <label htmlFor="cond-false-text-input" className="input-block-label">
                💬 Resposta Padrão Alternativa (ELSE)
            </label>
            <textarea
                id="cond-false-text-input"
                value={condFalseText}
                onChange={(e) => setCondFalseText(e.target.value)}
                placeholder="Digite a resposta padrão alternativa aqui..."
                className="cond-custom-textarea"
            />
        </div>
    );
}
