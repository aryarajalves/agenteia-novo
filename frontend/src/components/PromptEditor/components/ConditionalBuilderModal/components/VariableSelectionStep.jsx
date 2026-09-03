import React from 'react';

export default function VariableSelectionStep({
    globalVarsList = [],
    temporalVars = [],
    onSelectVar
}) {
    return (
        <>
            {/* Seção 1: Variáveis Globais do Sistema */}
            <section>
                <h4 className="modal-section-title">📂 Variáveis Globais (Cadastradas no Sistema)</h4>
                <div className="variables-list-box custom-scrollbar">
                    {globalVarsList && globalVarsList.length > 0 ? (
                        globalVarsList.map((v) => (
                            <div
                                key={v.id}
                                className="var-row-item"
                                onClick={() => onSelectVar(v.key)}
                                title={`Clique para configurar condicional para {${v.key}}`}
                            >
                                <div className="var-row-info">
                                    <span className="var-row-badge">{v.key}</span>
                                    <span className="var-row-desc">{v.description || 'Variável do sistema de contexto.'}</span>
                                </div>
                                <span className="click-to-insert-hint">⚙️ Configurar</span>
                            </div>
                        ))
                    ) : (
                        <p style={{ fontSize: '0.8rem', opacity: 0.6, margin: '0.5rem 0' }}>
                            Nenhuma variável global encontrada. Cadastre variáveis na aba de variáveis globais do sistema.
                        </p>
                    )}
                </div>
            </section>

            {/* Seção 2: Consciência Temporal */}
            <section>
                <h4 className="modal-section-title">⏱️ Variáveis Temporais (Consciência Temporal)</h4>
                <div className="variables-list-box custom-scrollbar">
                    {temporalVars.map((v) => (
                        <div
                            key={v.key}
                            className="var-row-item"
                            onClick={() => onSelectVar(v.key)}
                            title={`Clique para configurar condicional para {${v.key}}`}
                        >
                            <div className="var-row-info">
                                <span
                                    className="var-row-badge"
                                    style={{
                                        color: '#818cf8',
                                        background: 'rgba(99, 102, 241, 0.1)',
                                        borderColor: 'rgba(99, 102, 241, 0.2)',
                                    }}
                                >
                                    {v.key}
                                </span>
                                <span className="var-row-desc">{v.desc}</span>
                            </div>
                            <span className="click-to-insert-hint" style={{ color: '#818cf8' }}>
                                ⚙️ Configurar
                            </span>
                        </div>
                    ))}
                </div>
            </section>
        </>
    );
}
