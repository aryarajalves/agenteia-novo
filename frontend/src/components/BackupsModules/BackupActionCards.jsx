import React from 'react';

const BackupActionCards = ({
    handleRunBackup,
    runningBackup,
    isAnyBackupRunning,
    handleFileUpload,
    uploadingBackup
}) => {
    return (
        <>
            {/* Painel do Backup Manual */}
            <div className="card-premium" style={{ background: 'rgba(30, 41, 59, 0.3)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span>☁️</span> Backup Manual
                    </h3>
                    <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                        Clique para criar um backup imediato do banco de dados e enviar ao Backblaze S3.
                    </p>
                </div>
                <button
                    onClick={handleRunBackup}
                    disabled={runningBackup || isAnyBackupRunning}
                    style={{
                        background: '#2563eb',
                        color: 'white',
                        padding: '0.75rem 1.5rem',
                        borderRadius: '8px',
                        border: 'none',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)',
                        transition: 'opacity 0.2s'
                    }}
                >
                    {runningBackup || isAnyBackupRunning ? 'Processando...' : 'Fazer Backup Agora'}
                </button>
            </div>

            {/* Painel do Upload Externo */}
            <div className="card-premium" style={{ background: 'rgba(30, 41, 59, 0.3)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span>📤</span> Importar Backup Externo
                    </h3>
                    <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                        Envie um arquivo de backup (.dump ou .dump.gz) de outro servidor para salvá-lo no S3 e restaurar quando desejar.
                    </p>
                </div>
                <div>
                    <label
                        htmlFor="external-backup-file"
                        style={{
                            background: '#d97706',
                            color: 'white',
                            padding: '0.75rem 1.5rem',
                            borderRadius: '8px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            boxShadow: '0 4px 12px rgba(217, 119, 6, 0.2)',
                            transition: 'opacity 0.2s'
                        }}
                    >
                        {uploadingBackup ? 'Fazendo Upload...' : 'Fazer Upload de Backup'}
                    </label>
                    <input
                        type="file"
                        id="external-backup-file"
                        accept=".dump,.gz,.sql"
                        onChange={handleFileUpload}
                        disabled={uploadingBackup}
                        style={{ display: 'none' }}
                    />
                </div>
            </div>
        </>
    );
};

export default BackupActionCards;
