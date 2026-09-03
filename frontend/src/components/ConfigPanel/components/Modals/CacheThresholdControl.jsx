import React, { useState, useEffect } from 'react';

const CacheThresholdControl = ({
    value, // float 0.70-0.99, int 70-99, or null/undefined
    onChange,
    defaultThreshold = 92
}) => {
    // Normalizar defaultThreshold para porcentagem inteira (ex: 92)
    const normDefault = defaultThreshold > 1 ? Math.round(defaultThreshold) : Math.round(defaultThreshold * 100);

    // Determinar modo inicial: se value != null, modo 'custom', senão 'default'
    const isCustomInitial = value !== null && value !== undefined;
    const [mode, setMode] = useState(isCustomInitial ? 'custom' : 'default');

    const getInitialPct = () => {
        if (value !== null && value !== undefined) {
            return value > 1 ? Math.round(value) : Math.round(value * 100);
        }
        return 98; // Sugestão para perguntas específicas que querem quase a mesma mensagem
    };

    const [customPct, setCustomPct] = useState(getInitialPct);

    useEffect(() => {
        if (value !== null && value !== undefined) {
            setMode('custom');
            setCustomPct(value > 1 ? Math.round(value) : Math.round(value * 100));
        } else {
            setMode('default');
        }
    }, [value]);

    const handleModeChange = (newMode) => {
        setMode(newMode);
        if (newMode === 'default') {
            onChange(null);
        } else {
            onChange(customPct / 100);
        }
    };

    const handleSliderChange = (e) => {
        const newPct = Number(e.target.value);
        setCustomPct(newPct);
        onChange(newPct / 100);
    };

    const getDescriptor = (pct) => {
        if (pct >= 96) return '🎯 Quase a mesma mensagem (Máxima Precisão)';
        if (pct >= 90) return '⚖️ Equilibrado (Variações naturais)';
        return '🔍 Flexível (Aceita formulações mais distantes)';
    };

    return (
        <div style={{
            background: 'rgba(15, 23, 42, 0.65)',
            border: '1px solid rgba(99, 102, 241, 0.25)',
            borderRadius: '10px',
            padding: '12px 14px',
            marginTop: '4px'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#c7d2fe', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    🎯 Limiar de Similaridade desta Pergunta
                </label>
                {mode === 'custom' && (
                    <span style={{
                        background: 'rgba(99, 102, 241, 0.25)',
                        border: '1px solid rgba(99, 102, 241, 0.4)',
                        color: '#a5b4fc',
                        fontSize: '0.78rem',
                        fontWeight: 800,
                        padding: '2px 8px',
                        borderRadius: '6px'
                    }}>
                        {customPct}% Exigido
                    </span>
                )}
            </div>

            <div style={{ display: 'flex', gap: '10px', marginBottom: mode === 'custom' ? '12px' : '2px', flexWrap: 'wrap' }}>
                <button
                    type="button"
                    onClick={() => handleModeChange('default')}
                    data-testid="threshold-mode-default-btn"
                    style={{
                        flex: 1,
                        minWidth: '170px',
                        background: mode === 'default' ? 'rgba(99, 102, 241, 0.25)' : 'rgba(255, 255, 255, 0.03)',
                        border: `1px solid ${mode === 'default' ? 'rgba(99, 102, 241, 0.5)' : 'rgba(255, 255, 255, 0.08)'}`,
                        color: mode === 'default' ? '#e0e7ff' : '#94a3b8',
                        padding: '7px 10px',
                        borderRadius: '8px',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        transition: 'all 0.2s ease'
                    }}
                >
                    <span>🌐</span>
                    <span>Padrão do Agente ({normDefault}%)</span>
                </button>

                <button
                    type="button"
                    onClick={() => handleModeChange('custom')}
                    data-testid="threshold-mode-custom-btn"
                    style={{
                        flex: 1,
                        minWidth: '170px',
                        background: mode === 'custom' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                        border: `1px solid ${mode === 'custom' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(255, 255, 255, 0.08)'}`,
                        color: mode === 'custom' ? '#34d399' : '#94a3b8',
                        padding: '7px 10px',
                        borderRadius: '8px',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        transition: 'all 0.2s ease'
                    }}
                >
                    <span>⚡</span>
                    <span>Personalizado (Individual)</span>
                </button>
            </div>

            {mode === 'custom' && (
                <div style={{ marginTop: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                            {getDescriptor(customPct)}
                        </span>
                        <strong style={{ fontSize: '0.82rem', color: '#34d399' }}>
                            {customPct}%
                        </strong>
                    </div>

                    <input
                        type="range"
                        min="70"
                        max="99"
                        step="1"
                        value={customPct}
                        onChange={handleSliderChange}
                        data-testid="cache-threshold-slider"
                        style={{
                            width: '100%',
                            accentColor: '#10b981',
                            cursor: 'pointer',
                            marginTop: '2px'
                        }}
                    />

                    <p style={{ margin: '6px 0 0 0', fontSize: '0.72rem', color: '#64748b', lineHeight: '1.3' }}>
                        💡 <strong>Dica:</strong> Use <strong>96% a 99%</strong> para respostas críticas que só devem responder se a pergunta do cliente for quase idêntica à cadastrada.
                    </p>
                </div>
            )}
        </div>
    );
};

export default CacheThresholdControl;
