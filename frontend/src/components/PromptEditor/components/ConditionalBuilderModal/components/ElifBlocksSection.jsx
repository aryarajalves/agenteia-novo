import React from 'react';

export default function ElifBlocksSection({
    elifsList = [],
    handleAddElif,
    handleRemoveElif,
    handleUpdateElif,
    allVars = [],
    renderValueInput
}) {
    return (
        <div className="elif-section-container" style={{ marginTop: '1.5rem' }}>
            <div className="elif-header-row">
                <h5 className="sub-config-title">🔀 Condições Intermediárias (ELSEIF / ELIF)</h5>
                <button type="button" onClick={handleAddElif} className="add-elif-btn">
                    ➕ Adicionar Bloco ELSEIF
                </button>
            </div>

            <div className="elif-blocks-list">
                {elifsList && elifsList.length > 0 ? (
                    elifsList.map((elif, idx) => (
                        <div key={elif.id} className="elif-block-item fade-in">
                            <div className="elif-item-header">
                                <span>Opção ELSEIF #{idx + 1}</span>
                                <button
                                    type="button"
                                    onClick={() => handleRemoveElif(elif.id)}
                                    className="elif-remove-btn"
                                    title="Remover este bloco"
                                >
                                    ✖
                                </button>
                            </div>

                            <div className="cond-config-row" style={{ marginTop: '0.5rem' }}>
                                <div className="form-group-inline">
                                    <label>Variável</label>
                                    <select
                                        value={elif.variable}
                                        onChange={(e) => handleUpdateElif(elif.id, 'variable', e.target.value)}
                                        className="cond-custom-select"
                                    >
                                        <option value="">Selecione...</option>
                                        {allVars.map((v) => (
                                            <option key={v.key || v.id} value={v.key}>
                                                {v.key}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="form-group-inline">
                                    <label>Operador</label>
                                    <select
                                        value={elif.operator}
                                        onChange={(e) => handleUpdateElif(elif.id, 'operator', e.target.value)}
                                        className="cond-custom-select"
                                    >
                                        <option value="==">== (Igual)</option>
                                        <option value="!=">!= (Diferente)</option>
                                        <option value=">">&gt; (Maior)</option>
                                        <option value="<">&lt; (Menor)</option>
                                        <option value=">=">&gt;= (Maior ou igual)</option>
                                        <option value="<=">&lt;= (Menor ou igual)</option>
                                    </select>
                                </div>

                                <div className="form-group-inline flex-grow">
                                    <label>Valor de Comparação</label>
                                    {elif.variable ? (
                                        renderValueInput(
                                            elif.variable,
                                            elif.value,
                                            (val) => handleUpdateElif(elif.id, 'value', val),
                                            `elif-value-input-${elif.id}`
                                        )
                                    ) : (
                                        <input
                                            type="text"
                                            disabled
                                            placeholder="Selecione a variável..."
                                            className="cond-custom-input disabled"
                                        />
                                    )}
                                </div>
                            </div>

                            <div className="form-group-block" style={{ marginTop: '0.75rem' }}>
                                <label
                                    htmlFor={`elif-text-input-${elif.id}`}
                                    className="input-block-label"
                                >
                                    💬 Resposta para este ELSEIF
                                </label>
                                <textarea
                                    id={`elif-text-input-${elif.id}`}
                                    value={elif.trueText}
                                    onChange={(e) => handleUpdateElif(elif.id, 'trueText', e.target.value)}
                                    placeholder="Digite a resposta do bot para esta condição..."
                                    className="cond-custom-textarea"
                                />
                            </div>
                        </div>
                    ))
                ) : (
                    <p className="elif-empty-text">
                        Nenhum bloco ELSEIF adicionado. Você pode adicionar múltiplos caminhos se desejar.
                    </p>
                )}
            </div>
        </div>
    );
}
