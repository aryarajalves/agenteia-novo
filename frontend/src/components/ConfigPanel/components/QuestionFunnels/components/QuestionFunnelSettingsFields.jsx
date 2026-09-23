import React from 'react';

const QuestionFunnelSettingsFields = ({
    similarityThreshold,
    onSimilarityChange,
    frequencyMode,
    onFrequencyChange
}) => {
    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            {/* Sensitivity Slider */}
            <div style={{ padding: '0.75rem', background: 'rgba(15, 23, 42, 0.6)', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#cbd5e1' }}>🎯 Sensibilidade Semântica:</label>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#60a5fa' }}>
                        {Math.round(similarityThreshold * 100)}%
                    </span>
                </div>
                <input 
                    type="range" 
                    min="0.70" 
                    max="0.95" 
                    step="0.01" 
                    value={similarityThreshold}
                    onChange={(e) => onSimilarityChange(parseFloat(e.target.value))}
                    style={{ width: '100%', accentColor: '#3b82f6', cursor: 'pointer' }}
                />
                <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.2rem' }}>
                    Padrão: 82% (Ideal para reconhecer sinônimos sem falsos positivos)
                </div>
            </div>

            {/* Frequency Mode */}
            <div style={{ padding: '0.75rem', background: 'rgba(15, 23, 42, 0.6)', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '0.45rem' }}>
                    🔁 Frequência de Disparo:
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', color: frequencyMode === 'once_per_lead' ? '#c084fc' : '#94a3b8', cursor: 'pointer' }}>
                        <input 
                            type="radio" 
                            name="freq_mode" 
                            checked={frequencyMode === 'once_per_lead'} 
                            onChange={() => onFrequencyChange('once_per_lead')} 
                        />
                        <strong>👤 1x por lead</strong> (IA responde se perguntar de novo)
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', color: frequencyMode === 'always' ? '#4ade80' : '#94a3b8', cursor: 'pointer' }}>
                        <input 
                            type="radio" 
                            name="freq_mode" 
                            checked={frequencyMode === 'always'} 
                            onChange={() => onFrequencyChange('always')} 
                        />
                        <strong>♾️ Sempre que o lead perguntar</strong>
                    </label>
                </div>
            </div>
        </div>
    );
};

export default QuestionFunnelSettingsFields;
