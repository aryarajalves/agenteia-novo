import React from 'react';

const formatDuration = (totalSec) => {
    const s = Math.max(0, Math.floor(totalSec || 0));
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    if (mins >= 60) {
        const hrs = Math.floor(mins / 60);
        const remMins = mins % 60;
        return `${String(hrs).padStart(2, '0')}:${String(remMins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

const LeadsModalHeader = ({
    total,
    onSyncAll,
    isSyncing,
    isImportRunning,
    isStartingImport,
    importProgress,
    onOpenImportProgress,
    setShowConfirmImport,
    onClose
}) => {
    return (
        <>
            {/* Cabeçalho */}
            <div className="modal-header-premium" style={{ padding: '0.8rem 1.5rem' }}>
                <div className="header-info">
                    <div style={{
                        width: '36px', height: '36px', borderRadius: '10px',
                        background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem'
                    }}>👥</div>
                    <div>
                        <h3 className="header-title" style={{ margin: 0, fontSize: '1.1rem' }}>Contatos Capturados</h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <p style={{ margin: '0', color: '#64748b', fontSize: '0.75rem' }}>
                                {total} contatos identificados
                            </p>
                            <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                fontSize: '0.68rem',
                                color: '#10b981',
                                background: 'rgba(16, 185, 129, 0.1)',
                                border: '1px solid rgba(16, 185, 129, 0.25)',
                                padding: '1px 7px',
                                borderRadius: '12px',
                                fontWeight: 600,
                                letterSpacing: '0.02em'
                            }}>
                                <span style={{
                                    width: '6px',
                                    height: '6px',
                                    borderRadius: '50%',
                                    backgroundColor: '#10b981',
                                    boxShadow: '0 0 6px #10b981'
                                }} />
                                Tempo Real
                            </span>
                        </div>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <button
                        onClick={onSyncAll}
                        disabled={isSyncing}
                        style={{
                            background: isSyncing ? 'rgba(16, 185, 129, 0.05)' : '#10b98111',
                            border: '1px solid #10b98133',
                            color: isSyncing ? '#6ee7b7aa' : '#34d399',
                            borderRadius: '8px', padding: '0.4rem 1rem',
                            cursor: isSyncing ? 'not-allowed' : 'pointer',
                            fontSize: '0.8rem', fontWeight: 700,
                            display: 'flex', alignItems: 'center', gap: '6px',
                            opacity: isSyncing ? 0.7 : 1,
                            transition: 'all 0.2s ease'
                        }}
                    >
                        {isSyncing ? (
                            <>
                                <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>🔄</span>
                                Sincronizando...
                            </>
                        ) : (
                            '🔄 Sincronizar Tudo'
                        )}
                    </button>
                    <button
                        onClick={() => {
                            if (isImportRunning) {
                                if (onOpenImportProgress) onOpenImportProgress();
                            } else {
                                setShowConfirmImport(true);
                            }
                        }}
                        disabled={isStartingImport}
                        style={{
                            background: isImportRunning
                                ? 'rgba(99, 102, 241, 0.22)'
                                : 'rgba(99, 102, 241, 0.12)',
                            border: `1px solid ${isImportRunning ? 'rgba(129, 140, 248, 0.6)' : 'rgba(99, 102, 241, 0.35)'}`,
                            color: isImportRunning ? '#c7d2fe' : '#a5b4fc',
                            borderRadius: '8px', padding: '0.4rem 1rem',
                            cursor: 'pointer',
                            fontSize: '0.8rem', fontWeight: 700,
                            display: 'flex', alignItems: 'center', gap: '6px',
                            transition: 'all 0.2s ease',
                            boxShadow: isImportRunning ? '0 0 12px rgba(99, 102, 241, 0.3)' : '0 2px 8px rgba(99, 102, 241, 0.12)'
                        }}
                    >
                        {isImportRunning ? (
                            <>
                                <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⚡</span>
                                {`⚡ Importando (${importProgress?.percentage || 0}%) - Ver Progresso`}
                            </>
                        ) : isStartingImport ? (
                            <>
                                <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⚡</span>
                                Importando...
                            </>
                        ) : (
                            '📥 Importar do ZapJords'
                        )}
                    </button>
                    <button onClick={onClose} className="modal-close-btn" style={{ width: '32px', height: '32px', fontSize: '0.9rem' }}>✕</button>
                </div>
            </div>

            {/* Banner de Importação Ativa em Segundo Plano */}
            {isImportRunning && !importProgress?.isOpen && (
                <div style={{
                    margin: '0.5rem 1.5rem 0',
                    padding: '0.65rem 1.1rem',
                    background: 'linear-gradient(90deg, rgba(99, 102, 241, 0.15), rgba(16, 185, 129, 0.15))',
                    border: '1px solid rgba(99, 102, 241, 0.35)',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.8rem', color: '#e2e8f0', flex: 1, overflow: 'hidden' }}>
                        <span style={{ fontSize: '1rem', animation: 'spin 2s linear infinite', display: 'inline-block' }}>⚡</span>
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            <span style={{ fontWeight: 700, color: '#a5b4fc', marginRight: '6px' }}>
                                Importação do ZapJords em andamento: {importProgress?.percentage || 0}% {importProgress?.elapsedSeconds !== undefined ? `(⏱️ ${formatDuration(importProgress.elapsedSeconds)})` : ''}
                            </span>
                            <span style={{ color: '#94a3b8' }}>
                                {importProgress?.current && importProgress?.total ? `(${importProgress.current} de ${importProgress.total} conversas)` : ''}
                                {` • +${importProgress?.createdLeads || 0} contatos, +${importProgress?.importedMessages || 0} mensagens`}
                            </span>
                        </div>
                    </div>
                    <button
                        onClick={onOpenImportProgress}
                        style={{
                            padding: '0.3rem 0.85rem',
                            borderRadius: '6px',
                            background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                            border: 'none',
                            color: '#fff',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            whiteSpace: 'nowrap',
                            boxShadow: '0 2px 8px rgba(99, 102, 241, 0.4)'
                        }}
                    >
                        👁️ Ver Progresso
                    </button>
                </div>
            )}
        </>
    );
};

export default LeadsModalHeader;
