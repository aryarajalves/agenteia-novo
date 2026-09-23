import React from 'react';
import CacheThresholdControl from '../CacheThresholdControl';
import ProductCategoryTagSelector from '../ProductCategoryTagSelector';
import AlternateQueriesInput from '../AlternateQueriesInput';

export const CreateCacheNewForm = ({
    userQuery,
    setUserQuery,
    alternateQueries,
    setAlternateQueries,
    categoryTag,
    setCategoryTag,
    similarityThreshold,
    setSimilarityThreshold,
    defaultThreshold,
    approvedResponse,
    setApprovedResponse,
    agentId,
    isSaving,
    onMaximizeResponse,
    onSubmit,
    onClose
}) => {
    return (
        <>
            <p style={{ color: '#94a3b8', fontSize: '0.84rem', lineHeight: '1.4', marginBottom: '14px' }}>
                Cadastre a pergunta principal, as possíveis formas que o cliente pode perguntar e a resposta aprovada. O agente responderá com <strong>custo R$ 0,00 e 0 tokens</strong>.
            </p>

            <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '18px', flex: 1, overflowY: 'auto' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#c7d2fe', marginBottom: '6px' }}>
                            ? Pergunta Principal / Intenção:
                        </label>
                        <input
                            type="text"
                             value={userQuery}
                            onChange={(e) => setUserQuery(e.target.value)}
                            data-testid="create-cache-query-input"
                            required
                            style={{
                                width: '100%',
                                background: 'rgba(15, 23, 42, 0.8)',
                                border: '1px solid rgba(99, 102, 241, 0.3)',
                                borderRadius: '8px',
                                padding: '9px 13px',
                                color: '#fff',
                                fontSize: '0.9rem',
                                boxSizing: 'border-box'
                            }}
                            placeholder="Ex: quanto custa o treinamento?"
                        />
                    </div>

                    {/* Variações / Outras Perguntas com Edição */}
                    <AlternateQueriesInput
                        queries={alternateQueries}
                        onChange={setAlternateQueries}
                        testIdInput="create-cache-alt-input"
                        testIdAddBtn="create-add-alt-btn"
                    />

                    {/* Tag de Produto / Categoria */}
                    <ProductCategoryTagSelector
                        value={categoryTag}
                        onChange={setCategoryTag}
                        agentId={agentId}
                    />

                    {/* Limiar de Similaridade Customizado */}
                    <CacheThresholdControl
                        value={similarityThreshold}
                        onChange={setSimilarityThreshold}
                        defaultThreshold={defaultThreshold}
                    />

                    {/* Resposta Aprovada */}
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#6ee7b7' }}>
                                 🟑 Resposta Aprovada do Agente (Custo Zero):
                            </label>
                            <button
                                type="button"
                                data-testid="toggle-maximize-create-response-btn"
                                onClick={onMaximizeResponse}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: '#34d399',
                                    fontSize: '0.75rem',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                }}
                            >
                                ⛶ Maximizar Campo
                            </button>
                        </div>
                        <textarea
                            value={approvedResponse}
                            onChange={(e) => setApprovedResponse(e.target.value)}
                            data-testid="create-cache-response-input"
                            rows={5}
                            required
                            style={{
                                width: '100%',
                                height: '110px',
                                background: 'rgba(15, 23, 42, 0.8)',
                                border: '1px solid rgba(16, 185, 129, 0.3)',
                                borderRadius: '8px',
                                padding: '10px 13px',
                                color: '#fff',
                                fontSize: '0.9rem',
                                fontFamily: 'inherit',
                                resize: 'vertical',
                                boxSizing: 'border-box'
                            }}
                            placeholder="Digite a resposta oficial exata que o agente deve enviar ao cliente..."
                        />
                    </div>
                </div>

                {/* Footer */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: 'auto' }}>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSaving}
                        style={{
                            padding: '9px 18px',
                            borderRadius: '8px',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            background: 'rgba(255, 255, 255, 0.05)',
                            color: '#cbd5e1',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            cursor: 'pointer'
                        }}
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={isSaving || !userQuery.trim() || !approvedResponse.trim()}
                        data-testid="save-create-cache-btn"
                        style={{
                            padding: '9px 20px',
                            borderRadius: '8px',
                            border: 'none',
                            background: 'linear-gradient(135deg, #059669, #10b981)',
                            color: '#fff',
                            fontSize: '0.88rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)'
                        }}
                    >
                        {isSaving ? 'Salvando...' : '⚡ Salvar no Cache'}
                    </button>
                </div>
            </form>
        </>
    );
};
