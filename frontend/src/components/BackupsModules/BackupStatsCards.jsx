import React from 'react';

const BackupStatsCards = ({ config, formatDateTime }) => {
    return (
        <div className="stats-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
            <div className="stat-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.5rem', background: 'rgba(30, 41, 59, 0.45)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ padding: '12px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', borderRadius: '12px', fontSize: '1.5rem' }}>
                    ✅
                </div>
                <div>
                    <span style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Último Backup</span>
                    <h3 style={{ fontSize: '0.95rem', margin: '0.2rem 0 0 0', wordBreak: 'break-all' }}>
                        {config.last_success_filename || 'Nenhum backup realizado'}
                    </h3>
                    {config.last_success_created_at && (
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            {formatDateTime(config.last_success_created_at)}
                        </span>
                    )}
                </div>
            </div>

            <div className="stat-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.5rem', background: 'rgba(30, 41, 59, 0.45)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ padding: '12px', background: 'rgba(14, 165, 233, 0.1)', color: '#0ea5e9', borderRadius: '12px', fontSize: '1.5rem' }}>
                    🕒
                </div>
                <div>
                    <span style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Próximo Backup</span>
                    <h3 style={{ fontSize: '1.1rem', margin: '0.2rem 0' }}>
                        {config.enabled ? formatDateTime(config.next_run) : 'Agendamento desativado'}
                    </h3>
                    {config.enabled && (
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            A cada {config.interval_value} {config.frequency_type === 'hours' ? 'hora(s)' : 'dia(s)'}
                        </span>
                    )}
                </div>
            </div>

            <div className="stat-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.5rem', background: 'rgba(30, 41, 59, 0.45)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ padding: '12px', background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6', borderRadius: '12px', fontSize: '1.5rem' }}>
                    🛡️
                </div>
                <div>
                    <span style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Retenção</span>
                    <h3 style={{ fontSize: '1.4rem', margin: '0.2rem 0', fontWeight: 'bold' }}>
                        {config.retention_count}
                    </h3>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        backups mantidos no S3
                    </span>
                </div>
            </div>
        </div>
    );
};

export default BackupStatsCards;
