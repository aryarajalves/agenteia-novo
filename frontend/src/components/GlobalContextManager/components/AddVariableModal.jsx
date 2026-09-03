import React from 'react';
import ReactDOM from 'react-dom';

export default function AddVariableModal({
    isOpen,
    newVar,
    setNewVar,
    onClose,
    onCreate
}) {
    if (!isOpen) return null;

    return ReactDOM.createPortal(
        <div className="add-var-overlay fade-in" onClick={onClose}>
            <div className="add-var-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header-accent"></div>
                <div className="modal-content-padding">
                    <div className="modal-icon-top">🌍</div>
                    <h4>Criar Nova Variável Global</h4>
                    <p className="modal-subtitle">Defina uma chave que poderá ser usada em qualquer prompt do sistema.</p>

                    <div className="ft-edit-grid">
                        <div className="form-group-glow">
                            <label>Nome (Chave)</label>
                            <div className="input-wrapper-modern">
                                <span className="input-icon">🔑</span>
                                <input
                                    placeholder="ex: link_suporte"
                                    value={newVar.key}
                                    onChange={e => setNewVar({ ...newVar, key: e.target.value.replace(/\s+/g, '_').toLowerCase() })}
                                />
                            </div>
                            <small>Use letras, números e sublinhados.</small>
                        </div>
                        <div className="form-group-glow">
                            <label>Valor Inicial</label>
                            <div className="input-wrapper-modern">
                                <span className="input-icon">📄</span>
                                <input
                                    placeholder="ex: https://wa.me/..."
                                    value={newVar.value}
                                    onChange={e => setNewVar({ ...newVar, value: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="form-group-glow">
                            <label>Tipo da Variável</label>
                            <div className="input-wrapper-modern">
                                <span className="input-icon">⚙️</span>
                                <select
                                    className="modal-type-select"
                                    value={newVar.type}
                                    onChange={e => setNewVar({ ...newVar, type: e.target.value })}
                                    style={{
                                        width: '100%', background: 'rgba(0, 0, 0, 0.2)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '14px', padding: '14px 14px 14px 44px',
                                        color: 'white', fontSize: '0.95rem', cursor: 'pointer',
                                        appearance: 'none', outline: 'none'
                                    }}
                                >
                                    <option value="string">Texto (String)</option>
                                    <option value="number">Número (Number)</option>
                                    <option value="boolean">Lógico (Boolean)</option>
                                </select>
                            </div>
                        </div>
                        <div className="form-group-glow">
                            <label>Origem dos Dados</label>
                            <div className="input-wrapper-modern">
                                <span className="input-icon">📡</span>
                                <select
                                    className="modal-type-select"
                                    value={newVar.extraction_method || 'integration'}
                                    onChange={e => setNewVar({ ...newVar, extraction_method: e.target.value })}
                                    style={{
                                        width: '100%', background: 'rgba(0, 0, 0, 0.2)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '14px', padding: '14px 14px 14px 44px',
                                        color: 'white', fontSize: '0.95rem', cursor: 'pointer',
                                        appearance: 'none', outline: 'none'
                                    }}
                                >
                                    <option value="integration">Pegar da Integração (ZapVoice/WhatsApp)</option>
                                    <option value="ai">Extrair com IA da conversa</option>
                                </select>
                            </div>
                        </div>
                        {newVar.extraction_method === 'ai' && (
                            <div className="form-group-glow">
                                <label>Prompt de Extração com IA</label>
                                <div className="input-wrapper-modern" style={{ alignItems: 'flex-start' }}>
                                    <span className="input-icon" style={{ marginTop: '12px' }}>🤖</span>
                                    <textarea
                                        placeholder="Descreva o que esta variável representa e as regras de como a IA deve extrair este valor do diálogo..."
                                        value={newVar.extraction_prompt || ''}
                                        onChange={e => setNewVar({ ...newVar, extraction_prompt: e.target.value })}
                                        style={{
                                            width: '100%', background: 'rgba(0, 0, 0, 0.2)',
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            borderRadius: '14px', padding: '14px 14px 14px 44px',
                                            color: 'white', fontSize: '0.95rem', minHeight: '100px',
                                            outline: 'none', resize: 'vertical'
                                        }}
                                    />
                                </div>
                            </div>
                        )}
                        <div className="form-group-glow">
                            <label>Descrição (Opcional)</label>
                            <div className="input-wrapper-modern">
                                <span className="input-icon">💡</span>
                                <input
                                    placeholder="Explique para que serve esta variável..."
                                    value={newVar.description}
                                    onChange={e => setNewVar({ ...newVar, description: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="modal-footer-grid">
                    <button onClick={onClose} className="btn-modal-secondary">
                        Cancelar
                    </button>
                    <button onClick={onCreate} className="btn-modal-primary" disabled={!newVar.key.trim()}>
                        Criar Variável
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
