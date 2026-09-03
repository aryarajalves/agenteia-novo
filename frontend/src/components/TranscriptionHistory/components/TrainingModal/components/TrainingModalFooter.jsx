import React from 'react';

export default function TrainingModalFooter({
    usedLlmModel,
    generationCostBrl,
    generationCostUsd,
    isGenerating,
    isSaving,
    qaListLength,
    hasDuplicates,
    onClose,
    onSave
}) {
    return (
        <div className="training-modal-footer" style={{ justifyContent: usedLlmModel ? 'space-between' : 'flex-end' }}>
            {usedLlmModel && (
                <div style={{ fontSize: '0.8rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: '#a855f7' }}>✨</span> Gerado com <strong>{usedLlmModel}</strong>
                    {generationCostBrl > 0 && (
                        <div style={{ fontSize: '0.85rem', color: '#10b981', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '6px 12px', borderRadius: '8px', fontWeight: '500' }}>
                            💵 Custo: R$ {generationCostBrl.toFixed(2)} (${generationCostUsd.toFixed(2)})
                        </div>
                    )}
                </div>
            )}
            <div style={{ display: 'flex', gap: '15px' }}>
                <button
                    onClick={onClose}
                    disabled={isSaving || isGenerating}
                    className="training-btn-cancel"
                    title={isGenerating ? 'Aguarde a geração terminar...' : ''}
                >
                    Fechar
                </button>
                {qaListLength > 0 && (
                    <button 
                        onClick={onSave} 
                        disabled={isSaving || hasDuplicates} 
                        className="training-btn-save" 
                        id="btn-save-training"
                    >
                        {isSaving ? <><span className="training-save-spinner" />Gravando na Base...</> : 'Salvar na Base de Conhecimento 🚀'}
                    </button>
                )}
            </div>
        </div>
    );
}
