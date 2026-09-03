import React from 'react';

const FollowupAbandonmentDelay = ({
    safeEditForm,
    setEditForm
}) => {
    const val = safeEditForm.abandonment_delay_value ?? 24;
    const unit = safeEditForm.abandonment_delay_unit || 'hours';

    return (
        <div style={{ marginTop: '1rem', background: 'rgba(15, 23, 42, 0.4)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', padding: '1rem' }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f87171', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.25rem' }}>
                🚪 Tempo Limite para "Não Converteu / Desistiu" (CRM)
            </div>
            <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.72rem', color: '#94a3b8' }}>
                Tempo de espera após o último disparo de follow-up/re-tentativa para mover o lead para a coluna <strong>"Não Converteu / Desistiu"</strong> caso o contato não responda nada.
            </p>

            <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ width: '110px' }}>
                    <input
                        type="number"
                        min="1"
                        max="365"
                        value={val}
                        onChange={(e) => setEditForm({ ...safeEditForm, abandonment_delay_value: parseInt(e.target.value) || 1 })}
                        className="premium-input"
                        style={{ textAlign: 'center', fontWeight: 700, fontSize: '0.85rem' }}
                    />
                </div>
                <div style={{ width: '130px' }}>
                    <select
                        value={unit}
                        onChange={(e) => setEditForm({ ...safeEditForm, abandonment_delay_unit: e.target.value })}
                        className="premium-input"
                        style={{ fontSize: '0.8rem', background: '#0f172a', color: '#f8fafc', border: '1px solid #334155', borderRadius: '6px' }}
                    >
                        <option value="minutes">Minutos</option>
                        <option value="hours">Horas</option>
                        <option value="days">Dias</option>
                    </select>
                </div>
                <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                    (Durante este período, o lead permanecerá na coluna <strong>🔁 Re-tentativas</strong>).
                </span>
            </div>
        </div>
    );
};

export default FollowupAbandonmentDelay;
