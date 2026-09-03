import React from 'react';

export default function GlobalVariableCard({
    variable: v,
    saving,
    onUpdate,
    onDeleteRequest,
    onChangeField
}) {
    return (
        <div className="var-item">
            <div className="var-main-info">
                <div className="var-key-box">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <code className="var-key">{v.key}</code>
                        {v.is_default && <span className="default-badge">Padrão</span>}
                    </div>
                    <select
                        className="var-type-select"
                        value={v.type || 'string'}
                        onChange={e => {
                            const updated = { ...v, type: e.target.value };
                            onChangeField(v.id, 'type', e.target.value);
                            onUpdate(updated);
                        }}
                    >
                        <option value="string">abc Texto</option>
                        <option value="number">123 Número</option>
                        <option value="boolean">🔘 Booleano</option>
                    </select>
                </div>
                <input
                    placeholder="Valor da variável"
                    value={v.value || ''}
                    onChange={e => onChangeField(v.id, 'value', e.target.value)}
                    onBlur={() => onUpdate(v)}
                    className="var-input"
                />
            </div>

            {/* Configuração de Origem e Prompt para Variáveis Existentes */}
            <div style={{ marginTop: '0.8rem', display: 'flex', gap: '0.75rem', flexDirection: 'column', borderTop: '1px dashed rgba(255,255,255,0.03)', paddingTop: '0.8rem' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <label style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Origem:</label>
                    <select
                        className="var-type-select"
                        value={v.extraction_method || 'integration'}
                        onChange={e => {
                            const updated = { ...v, extraction_method: e.target.value };
                            onChangeField(v.id, 'extraction_method', e.target.value);
                            onUpdate(updated);
                        }}
                    >
                        <option value="integration">Pegar da Integração (ZapVoice/WhatsApp)</option>
                        <option value="ai">Extrair com IA da conversa</option>
                    </select>
                </div>
                {v.extraction_method === 'ai' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Prompt de Extração:</label>
                        <textarea
                            placeholder="Regras de extração para a IA..."
                            value={v.extraction_prompt || ''}
                            onChange={e => onChangeField(v.id, 'extraction_prompt', e.target.value)}
                            onBlur={() => onUpdate(v)}
                            className="var-desc-input"
                            style={{ 
                                minHeight: '60px', 
                                padding: '8px 12px', 
                                resize: 'vertical', 
                                fontFamily: 'sans-serif',
                                background: 'rgba(0,0,0,0.2)',
                                border: '1px solid rgba(255,255,255,0.05)',
                                borderRadius: '8px',
                                color: 'white'
                            }}
                        />
                    </div>
                )}
            </div>

            <div className="var-meta" style={{ borderTop: 'none', paddingTop: '0.4rem' }}>
                <input
                    placeholder="Descrição opcional..."
                    value={v.description || ''}
                    onChange={e => onChangeField(v.id, 'description', e.target.value)}
                    onBlur={() => onUpdate(v)}
                    className="var-desc-input"
                />
                <div className="var-actions">
                    {saving === v.id ? (
                        <span className="saving-indicator">Salvando...</span>
                    ) : (
                        !v.is_default && (
                            <button className="var-del-btn" onClick={() => onDeleteRequest(v)} title="Remover variável">
                                🗑️
                            </button>
                        )
                    )}
                </div>
            </div>
        </div>
    );
}
