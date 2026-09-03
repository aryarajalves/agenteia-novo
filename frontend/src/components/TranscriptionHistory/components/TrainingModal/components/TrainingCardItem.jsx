import React from 'react';

export default function TrainingCardItem({
    item,
    index,
    isQaMode,
    onFieldChange,
    onRemove
}) {
    return (
        <div className="training-card-item" style={{ borderColor: item.isDuplicate ? '#ef4444' : '' }}>
            {item.isDuplicate && (
                <div style={{ background: '#ef4444', color: 'white', fontSize: '0.75rem', fontWeight: 'bold', padding: '2px 8px', borderRadius: '4px', position: 'absolute', top: '-10px', left: '10px' }}>
                    ⚠️ Já existe na base
                </div>
            )}
            <div className="training-card-header">
                <span>#{index + 1} — {isQaMode ? 'Conhecimento' : 'Trecho'}</span>
                <button onClick={() => onRemove(item.localId)} title="Remover" className="training-card-remove">
                    🗑️
                </button>
            </div>
            <div className="training-card-fields">
                <div className="training-card-field">
                    <span className="training-card-field-label">{isQaMode ? 'Pergunta' : 'Título'}</span>
                    <input 
                        type="text" 
                        value={item.question}
                        placeholder={isQaMode ? 'Digite a pergunta didática...' : 'Título do trecho...'}
                        onChange={e => onFieldChange(item.localId, 'question', e.target.value)}
                        className="training-card-input" 
                    />
                </div>
                <div className="training-card-field">
                    <span className="training-card-field-label">{isQaMode ? 'Resposta' : 'Conteúdo'}</span>
                    <textarea 
                        value={item.answer}
                        rows={isQaMode ? 3 : 5}
                        placeholder={isQaMode ? 'A resposta que a IA usará como referência...' : 'Conteúdo do trecho de transcrição...'}
                        onChange={e => onFieldChange(item.localId, 'answer', e.target.value)}
                        className="training-card-textarea" 
                    />
                </div>
            </div>
        </div>
    );
}
