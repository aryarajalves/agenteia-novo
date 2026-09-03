import React from 'react';

const BackupScheduleForm = ({
    config,
    setConfig,
    handleSaveConfig,
    savingConfig
}) => {
    return (
        <div className="card-premium" style={{ background: 'rgba(30, 41, 59, 0.3)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', padding: '1.5rem', marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                <span>📅</span> Agendamento Automático
            </h3>

            <form onSubmit={handleSaveConfig}>
                <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(15,23,42,0.3)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '1.5rem' }}>
                    <label className="switch" style={{ position: 'relative', display: 'inline-block', width: '50px', height: '26px', marginRight: '1rem' }}>
                        <input
                            type="checkbox"
                            checked={config.enabled}
                            onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                            style={{ opacity: 0, width: 0, height: 0 }}
                        />
                        <span className="slider round" style={{
                            position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                            backgroundColor: config.enabled ? '#6366f1' : '#475569',
                            transition: '.4s', borderRadius: '34px'
                        }}>
                            <span style={{
                                position: 'absolute', content: '""', height: '18px', width: '18px', left: config.enabled ? '28px' : '4px', bottom: '4px',
                                backgroundColor: 'white', transition: '.4s', borderRadius: '50%'
                            }}></span>
                        </span>
                    </label>
                    <div>
                        <strong style={{ display: 'block', fontSize: '0.9rem' }}>Agendamento Ativado</strong>
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Backups serão realizados automaticamente.</span>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8', marginBottom: '0.5rem' }}>
                            Frequência
                        </label>
                        <select
                            value={config.frequency_type}
                            onChange={(e) => setConfig({ ...config, frequency_type: e.target.value })}
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                borderRadius: '8px',
                                backgroundColor: 'rgba(15, 23, 42, 0.6)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                color: '#fff',
                                outline: 'none'
                            }}
                        >
                            <option value="hours">A cada X horas</option>
                            <option value="days">A cada X dias</option>
                        </select>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8', marginBottom: '0.5rem' }}>
                            Valor do Intervalo
                        </label>
                        <input
                            type="number"
                            min="1"
                            value={config.interval_value}
                            onChange={(e) => setConfig({ ...config, interval_value: parseInt(e.target.value) || 1 })}
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                borderRadius: '8px',
                                backgroundColor: 'rgba(15, 23, 42, 0.6)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                color: '#fff',
                                outline: 'none'
                            }}
                        />
                        <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginTop: '0.25rem' }}>
                            Backup a cada {config.interval_value} {config.frequency_type === 'hours' ? 'hora(s)' : 'dia(s)'}
                        </span>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8', marginBottom: '0.5rem' }}>
                            Pasta do Backup no S3
                        </label>
                        <input
                            type="text"
                            placeholder="Ex: backups/ ou backups/cliente1"
                            value={config.backup_folder || ''}
                            onChange={(e) => setConfig({ ...config, backup_folder: e.target.value })}
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                borderRadius: '8px',
                                backgroundColor: 'rgba(15, 23, 42, 0.6)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                color: '#fff',
                                outline: 'none'
                            }}
                        />
                        <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginTop: '0.25rem' }}>
                            Subpasta onde os backups serão salvos no bucket do Backblaze S3. Ex: backups/ ou backups/cliente1
                        </span>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8', marginBottom: '0.5rem' }}>
                            Retenção — Máximo de Backups no S3
                        </label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <input
                                type="number"
                                min="1"
                                value={config.retention_count}
                                onChange={(e) => setConfig({ ...config, retention_count: parseInt(e.target.value) || 30 })}
                                style={{
                                    width: '80px',
                                    padding: '0.75rem',
                                    borderRadius: '8px',
                                    backgroundColor: 'rgba(15, 23, 42, 0.6)',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    color: '#fff',
                                    outline: 'none'
                                }}
                            />
                            <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                                backups — auto-deleção dos antigos.
                            </span>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                        type="submit"
                        disabled={savingConfig}
                        style={{
                            background: '#8b5cf6',
                            color: 'white',
                            padding: '0.75rem 1.75rem',
                            borderRadius: '8px',
                            border: 'none',
                            fontWeight: '600',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            boxShadow: '0 4px 12px rgba(139, 92, 246, 0.2)',
                            transition: 'opacity 0.2s'
                        }}
                    >
                        ⚙️ {savingConfig ? 'Salvando...' : 'Salvar Configuração'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default BackupScheduleForm;
