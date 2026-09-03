import React from 'react';

export default function MainConditionSection({
    selectedVar,
    condTitle,
    setCondTitle,
    condOperator,
    setCondOperator,
    condValue,
    setCondValue,
    addAndCondition,
    setAddAndCondition,
    andVar,
    setAndVar,
    andOperator,
    setAndOperator,
    andValue,
    setAndValue,
    allVars = [],
    renderValueInput,
    condTrueText,
    setCondTrueText
}) {
    return (
        <>
            <div className="configurer-header-info">
                <span className="current-var-badge">Variável Principal: {selectedVar}</span>
            </div>

            <div className="form-group-block" style={{ marginBottom: '1.25rem' }}>
                <label htmlFor="cond-title-input" className="input-block-label">
                    🏷️ Título / Comentário da Condicional (Texto após o #)
                </label>
                <input
                    id="cond-title-input"
                    type="text"
                    value={condTitle}
                    onChange={(e) => setCondTitle(e.target.value)}
                    placeholder="Ex: Condicional de data_atual..."
                    className="cond-custom-input"
                    style={{ width: '100%' }}
                />
            </div>

            <div className="cond-config-row">
                <div className="form-group-inline">
                    <label>Operador</label>
                    <select
                        value={condOperator}
                        onChange={(e) => setCondOperator(e.target.value)}
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
                    <label>Valor de Comparação (Opcional se for verificar existência)</label>
                    {renderValueInput(selectedVar, condValue, setCondValue, 'cond-main-value-input')}
                </div>
            </div>

            {/* AND opcional */}
            <div className="and-toggle-container">
                <label className="checkbox-toggle-label">
                    <input
                        type="checkbox"
                        checked={addAndCondition}
                        onChange={(e) => setAddAndCondition(e.target.checked)}
                        className="cond-checkbox"
                    />
                    <span className="checkbox-custom-text">➕ Adicionar Condição AND (&&)</span>
                </label>
            </div>

            {addAndCondition && (
                <div className="and-configurer-block slide-down">
                    <h5 className="sub-config-title">Conectar via AND com:</h5>
                    <div className="cond-config-row">
                        <div className="form-group-inline">
                            <label>Segunda Variável</label>
                            <select
                                value={andVar}
                                onChange={(e) => setAndVar(e.target.value)}
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
                                value={andOperator}
                                onChange={(e) => setAndOperator(e.target.value)}
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
                            <label>Valor</label>
                            {andVar ? (
                                renderValueInput(andVar, andValue, setAndValue, 'cond-and-value-input')
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
                </div>
            )}

            {/* Texto verdadeiro (IF) */}
            <div className="form-group-block" style={{ marginTop: '1.25rem' }}>
                <label htmlFor="cond-true-text-input" className="input-block-label">
                    💬 Resposta se a Condição Principal for Verdadeira
                </label>
                <textarea
                    id="cond-true-text-input"
                    value={condTrueText}
                    onChange={(e) => setCondTrueText(e.target.value)}
                    placeholder="Digite a resposta do bot aqui..."
                    className="cond-custom-textarea"
                />
            </div>
        </>
    );
}
