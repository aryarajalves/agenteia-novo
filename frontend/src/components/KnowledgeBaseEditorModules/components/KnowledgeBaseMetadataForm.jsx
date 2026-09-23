import React from 'react';
import ExpandableField from '../../ExpandableField';
import { typeBtnStyle } from '../styles/editorStyles';

const KnowledgeBaseMetadataForm = ({
    name,
    setName,
    description,
    setDescription,
    kbType,
    setKbType,
    isNew,
    handleSave
}) => {
    return (
        <div className="step-card" style={{ width: '100%', margin: 0 }}>
            <div className="step-indicator">
                <div className="step-number">1</div>
                <span className="step-title">Identificação da Base</span>
            </div>

            <div className="form-group">
                <label>Nome da Base</label>
                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: FAQ de Vendas"
                    style={{ fontSize: '1.1rem', padding: '15px' }}
                />
            </div>

            <div className="form-group">
                <label>Tipo de Base</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '10px' }}>
                    <button
                        type="button"
                        onClick={() => isNew && setKbType('qa')}
                        className={`type-select-btn ${kbType === 'qa' ? 'active' : ''} ${!isNew ? 'disabled' : ''}`}
                        style={typeBtnStyle(kbType === 'qa', '#6366f1', !isNew)}
                        disabled={!isNew}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', textAlign: 'left' }}>
                            <span style={{ fontSize: '1.4rem', opacity: kbType === 'qa' ? 1 : 0.5 }}>💬</span>
                            <div>
                                <div style={{ fontWeight: 800, fontSize: '0.9rem' }}>FAQ / QA</div>
                                <div style={{ fontSize: '0.65rem', opacity: 0.6, fontWeight: 500 }}>Respostas Diretas</div>
                            </div>
                        </div>
                    </button>
                    <button
                        type="button"
                        onClick={() => isNew && setKbType('product')}
                        className={`type-select-btn ${kbType === 'product' ? 'active' : ''} ${!isNew ? 'disabled' : ''}`}
                        style={typeBtnStyle(kbType === 'product', '#a855f7', !isNew)}
                        disabled={!isNew}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', textAlign: 'left' }}>
                            <span style={{ fontSize: '1.4rem', opacity: kbType === 'product' ? 1 : 0.5 }}>📦</span>
                            <div>
                                <div style={{ fontWeight: 800, fontSize: '0.9rem' }}>Produtos</div>
                                <div style={{ fontSize: '0.65rem', opacity: 0.6, fontWeight: 500 }}>Catálogo Técnico</div>
                            </div>
                        </div>
                    </button>
                </div>
                {!isNew && (
                    <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '12px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <span>ℹ️</span> O tipo da base não pode ser alterado após a criação.
                    </p>
                )}
            </div>

            <div className="form-group">
                <ExpandableField
                    label="Descrição Opcional"
                    type="textarea"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Sobre o que é este conhecimento? Descreva para que os agentes entendam o contexto."
                    style={{ minHeight: '160px' }}
                />
            </div>

            <button 
                type="button"
                onClick={handleSave} 
                className="create-agent-btn" 
                style={{ width: '100%', marginTop: '1.5rem', padding: '1.2rem' }}
            >
                {isNew ? 'Criar e Ir para Conteúdo →' : 'Salvar Alterações de Identificação'}
            </button>
        </div>
    );
};

export default KnowledgeBaseMetadataForm;
