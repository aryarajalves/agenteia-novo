import React from 'react';

export default function ConditionalModalFooter({
    selectedVar,
    editMode,
    onClose,
    onBack,
    onSave,
    onDeleteClick
}) {
    return (
        <footer className="modal-footer">
            {!selectedVar ? (
                <button onClick={onClose} className="secondary-btn" style={{ padding: '0.75rem 2rem' }}>
                    Fechar
                </button>
            ) : (
                <div className="config-footer-buttons" style={{ display: 'flex', width: '100%', alignItems: 'center' }}>
                    {editMode && (
                        <button
                            onClick={onDeleteClick}
                            className="delete-cond-btn"
                            type="button"
                        >
                            🗑️ Deletar Condicional
                        </button>
                    )}
                    {!editMode ? (
                        <button
                            onClick={onBack}
                            className="secondary-btn"
                            style={{ marginRight: '8px' }}
                        >
                            ⬅️ Voltar
                        </button>
                    ) : (
                        <button
                            onClick={onClose}
                            className="secondary-btn"
                            style={{ marginRight: '8px' }}
                        >
                            ❌ Cancelar
                        </button>
                    )}
                    <button
                        id="cond-modal-save-btn"
                        onClick={onSave}
                        className={`primary-btn ${editMode ? 'update-cond-btn' : 'insert-configured-btn'}`}
                    >
                        {editMode ? '✅ Atualizar Condicional' : '✨ Inserir no Prompt'}
                    </button>
                </div>
            )}
        </footer>
    );
}
