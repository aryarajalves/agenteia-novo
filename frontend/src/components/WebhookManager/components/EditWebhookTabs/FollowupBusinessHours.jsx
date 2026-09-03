import React from 'react';

const FollowupBusinessHours = ({
    safeEditForm,
    setEditForm
}) => {
    const bh = safeEditForm.followup_business_hours || { enabled: false, start: '08:00', end: '20:00', weekdays: true, saturday: false, sunday: false };

    return (
        <div style={{ marginTop: '1.25rem', background: 'rgba(15, 23, 42, 0.4)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', padding: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: (bh?.enabled ?? false) ? '1rem' : 0 }}>
                <div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        🌙 Proteção "Não Perturbe" & Janela Comercial
                    </div>
                    <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.72rem', color: '#64748b' }}>
                        Reagenda disparos noturnos para o primeiro minuto da janela comercial seguinte (ex: 08:00 AM).
                    </p>
                </div>
                <button type="button"
                    onClick={() => {
                        setEditForm({ ...safeEditForm, followup_business_hours: { ...bh, enabled: !bh.enabled } });
                    }}
                    className={`premium-switch ${(bh?.enabled ?? false) ? 'active' : ''}`}
                >
                    <div className="switch-knob" />
                </button>
            </div>

            {(bh?.enabled ?? false) && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div className="form-group-premium">
                            <label className="premium-label" style={{ fontSize: '0.7rem' }}>Início da Janela (Permitido)</label>
                            <input 
                                type="time" 
                                value={bh?.start || '08:00'} 
                                onChange={e => {
                                    setEditForm({ ...safeEditForm, followup_business_hours: { ...bh, start: e.target.value } });
                                }}
                                className="premium-input"
                            />
                        </div>
                        <div className="form-group-premium">
                            <label className="premium-label" style={{ fontSize: '0.7rem' }}>Fim da Janela (Bloqueia Noturno)</label>
                            <input 
                                type="time" 
                                value={bh?.end || '20:00'} 
                                onChange={e => {
                                    setEditForm({ ...safeEditForm, followup_business_hours: { ...bh, end: e.target.value } });
                                }}
                                className="premium-input"
                            />
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: '#cbd5e1', cursor: 'pointer' }}>
                            <input 
                                type="checkbox" 
                                checked={bh?.weekdays ?? true} 
                                onChange={e => {
                                    setEditForm({ ...safeEditForm, followup_business_hours: { ...bh, weekdays: e.target.checked } });
                                }}
                            />
                            Seg a Sex
                        </label>

                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: '#cbd5e1', cursor: 'pointer' }}>
                            <input 
                                type="checkbox" 
                                checked={bh?.saturday ?? false} 
                                onChange={e => {
                                    setEditForm({ ...safeEditForm, followup_business_hours: { ...bh, saturday: e.target.checked } });
                                }}
                            />
                            Sáb
                        </label>

                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: '#cbd5e1', cursor: 'pointer' }}>
                            <input 
                                type="checkbox" 
                                checked={bh?.sunday ?? false} 
                                onChange={e => {
                                    setEditForm({ ...safeEditForm, followup_business_hours: { ...bh, sunday: e.target.checked } });
                                }}
                            />
                            Dom
                        </label>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FollowupBusinessHours;
