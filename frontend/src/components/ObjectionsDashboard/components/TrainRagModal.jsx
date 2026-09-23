import React from 'react';

const TrainRagModal = ({
    isOpen,
    onClose,
    onSubmit,
    ragForm,
    setRagForm,
    knowledgeBases,
    savingRag
}) => {
    if (!isOpen) return null;

    return (
        <div className="rag-modal-overlay" onClick={onClose}>
            <div className="rag-modal-card" onClick={(e) => e.stopPropagation()}>
                <div className="rag-modal-header">
                    <span className="rag-modal-icon">📚</span>
                    <h2 className="rag-modal-title">Treinar Base de Conhecimento</h2>
                </div>

                <form onSubmit={onSubmit} className="rag-modal-form">
                    <div className="form-group-rag">
                        <label>Base de Conhecimento de Destino</label>
                        <select
                            value={ragForm.kbId}
                            onChange={(e) => setRagForm({ ...ragForm, kbId: e.target.value })}
                            className="input-rag select-rag"
                            required
                        >
                            <option value="" disabled>Selecione uma base...</option>
                            {knowledgeBases.map(kb => (
                                <option key={kb.id} value={kb.id}>
                                    📁 {kb.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group-rag">
                        <label>Pergunta (Gatilho)</label>
                        <input
                            type="text"
                            value={ragForm.question}
                            onChange={(e) => setRagForm({ ...ragForm, question: e.target.value })}
                            className="input-rag"
                            placeholder="Pergunta comum do lead"
                            required
                        />
                    </div>

                    <div className="form-group-rag">
                        <label>Resposta Ideal (Quebra de Objeção)</label>
                        <textarea
                            value={ragForm.answer}
                            onChange={(e) => setRagForm({ ...ragForm, answer: e.target.value })}
                            className="input-rag"
                            placeholder="Escreva a resposta perfeita para o robô usar"
                            rows={4}
                            required
                            style={{ resize: 'vertical', fontFamily: 'inherit' }}
                        />
                    </div>

                    <div className="rag-modal-footer">
                        <button
                            type="button"
                            className="btn-rag-modal cancel"
                            onClick={onClose}
                            disabled={savingRag}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="btn-rag-modal confirm"
                            disabled={savingRag || !ragForm.kbId}
                        >
                            {savingRag ? "Salvando..." : "Adicionar ao Conhecimento"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default TrainRagModal;
