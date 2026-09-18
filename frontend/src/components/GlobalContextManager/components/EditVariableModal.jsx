import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import ExpandedFieldModal from './ExpandedFieldModal';

export default function EditVariableModal({
    isOpen,
    variable,
    onClose,
    onSave,
    saving
}) {
    const [form, setForm] = useState(null);
    const [expandedConfig, setExpandedConfig] = useState(null);

    useEffect(() => {
        if (variable) {
            setForm({
                id: variable.id,
                key: variable.key || '',
                value: variable.value || '',
                type: variable.type || 'string',
                extraction_method: variable.extraction_method || 'integration',
                extraction_prompt: variable.extraction_prompt || '',
                description: variable.description || '',
                is_default: !!variable.is_default
            });
        }
    }, [variable]);

    if (!isOpen || !form) return null;

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        await onSave(form);
    };

    const handleSaveExpanded = (text) => {
        if (!expandedConfig) return;
        setForm({ ...form, [expandedConfig.field]: text });
    };

    return ReactDOM.createPortal(
        <>
            <div className="add-var-overlay fade-in">
                <div className="add-var-modal">
                    <div className="modal-header-accent" style={{ background: 'linear-gradient(90deg, #38bdf8, #6366f1)' }}></div>
                    <div className="modal-content-padding">
                        <div className="modal-icon-top">✏️</div>
                        <h4>Editar Variável Global</h4>
                        <p className="modal-subtitle">Atualize as informações, regras de extração ou valor padrão da variável.</p>

                        <form onSubmit={handleSubmit} className="ft-edit-grid">
                            <div className="form-group-glow">
                                <label>Nome (Chave)</label>
                                <div className="input-wrapper-modern">
                                    <span className="input-icon">🔑</span>
                                    <input
                                        placeholder="ex: link_suporte"
                                        value={form.key}
                                        disabled={form.is_default}
                                        onChange={e => setForm({ ...form, key: e.target.value.replace(/\s+/g, '_').toLowerCase() })}
                                        style={form.is_default ? { opacity: 0.6, cursor: 'not-allowed' } : {}}
                                    />
                                </div>
                                {form.is_default ? (
                                    <small style={{ color: '#94a3b8' }}>Variável padrão do sistema — o nome não pode ser alterado.</small>
                                ) : (
                                    <small>Use letras, números e sublinhados.</small>
                                )}
                            </div>

                            <div className="form-group-glow">
                                <label>Valor Inicial / Atual</label>
                                <div className="input-wrapper-modern">
                                    <span className="input-icon">📄</span>
                                    <input
                                        placeholder="ex: https://wa.me/..."
                                        value={form.value}
                                        onChange={e => setForm({ ...form, value: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="form-group-glow">
                                <label>Tipo da Variável</label>
                                <div className="input-wrapper-modern">
                                    <span className="input-icon">⚙️</span>
                                    <select
                                        className="modal-type-select"
                                        value={form.type}
                                        onChange={e => setForm({ ...form, type: e.target.value })}
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
                                        value={form.extraction_method || 'integration'}
                                        onChange={e => setForm({ ...form, extraction_method: e.target.value })}
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

                            {form.extraction_method === 'ai' && (
                                <div className="form-group-glow">
                                    <div className="form-label-with-action">
                                        <label>Prompt de Extração com IA</label>
                                        <button
                                            type="button"
                                            className="btn-maximize-field"
                                            data-testid="maximize-edit-prompt-btn"
                                            onClick={() => setExpandedConfig({
                                                field: 'extraction_prompt',
                                                title: 'Prompt de Extração com IA',
                                                subtitle: 'Descreva detalhadamente como a IA deve identificar e extrair o valor desta variável durante as conversas.',
                                                icon: '🤖',
                                                placeholder: 'Descreva o que esta variável representa e as regras de como a IA deve extrair este valor do diálogo...',
                                                value: form.extraction_prompt || ''
                                            })}
                                            title="Maximizar editor de texto"
                                        >
                                            ⛶ Maximizar
                                        </button>
                                    </div>
                                    <div className="input-wrapper-modern" style={{ alignItems: 'flex-start' }}>
                                        <span className="input-icon" style={{ marginTop: '12px' }}>🤖</span>
                                        <textarea
                                            placeholder="Descreva o que esta variável representa e as regras de como a IA deve extrair este valor do diálogo..."
                                            value={form.extraction_prompt || ''}
                                            onChange={e => setForm({ ...form, extraction_prompt: e.target.value })}
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
                                <div className="form-label-with-action">
                                    <label>Descrição (Opcional)</label>
                                    <button
                                        type="button"
                                        className="btn-maximize-field"
                                        data-testid="maximize-edit-desc-btn"
                                        onClick={() => setExpandedConfig({
                                            field: 'description',
                                            title: 'Descrição da Variável',
                                            subtitle: 'Explique para que serve esta variável e onde ela é utilizada no sistema.',
                                            icon: '💡',
                                            placeholder: 'Explique para que serve esta variável...',
                                            value: form.description || ''
                                        })}
                                        title="Maximizar editor de texto"
                                    >
                                        ⛶ Maximizar
                                    </button>
                                </div>
                                <div className="input-wrapper-modern">
                                    <span className="input-icon">💡</span>
                                    <input
                                        placeholder="Explique para que serve esta variável..."
                                        value={form.description}
                                        onChange={e => setForm({ ...form, description: e.target.value })}
                                    />
                                </div>
                            </div>
                        </form>
                    </div>

                    <div className="modal-footer-grid">
                        <button onClick={onClose} className="btn-modal-secondary" disabled={saving}>
                            Cancelar
                        </button>
                        <button onClick={handleSubmit} className="btn-modal-primary" disabled={saving || !form.key.trim()}>
                            {saving ? 'Salvando...' : 'Salvar Alterações'}
                        </button>
                    </div>
                </div>
            </div>

            <ExpandedFieldModal
                isOpen={!!expandedConfig}
                title={expandedConfig?.title}
                subtitle={expandedConfig?.subtitle}
                icon={expandedConfig?.icon}
                placeholder={expandedConfig?.placeholder}
                value={expandedConfig?.value || ''}
                onSave={handleSaveExpanded}
                onClose={() => setExpandedConfig(null)}
            />
        </>,
        document.body
    );
}
