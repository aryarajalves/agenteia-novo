import React from 'react';
import { LEVEL_COLORS, PAGE_SIZE_OPTIONS, inputStyle } from './constants';

const LogsTable = ({
    filteredLogs,
    pagedLogs,
    loading,
    pageSize,
    setPageSize,
    safePage,
    totalPages,
    currentPage,
    setCurrentPage,
    handleLoadLogs,
    handleCopy,
    handleDownload
}) => {
    return (
        <div style={{
            background: 'rgba(15, 23, 42, 0.5)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '16px', overflow: 'hidden'
        }}>
            <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '0.9rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.06)', flexWrap: 'wrap', gap: '0.5rem'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <strong style={{ fontSize: '0.9rem' }}>{filteredLogs.length.toLocaleString('pt-BR')} linhas</strong>
                    <span style={{ color: 'rgba(255,255,255,0.1)' }}>|</span>
                    <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        Mostrar
                        <select
                            value={pageSize}
                            onChange={(e) => setPageSize(parseInt(e.target.value))}
                            style={{ ...inputStyle, width: 'auto', padding: '0.3rem 0.5rem', fontSize: '0.78rem' }}
                        >
                            {PAGE_SIZE_OPTIONS.map((n) => (
                                <option key={n} value={n} style={{ background: '#0f172a' }}>{n.toLocaleString('pt-BR')}</option>
                            ))}
                        </select>
                        linhas por vez
                    </label>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={handleLoadLogs} disabled={loading} title="Buscar logs mais recentes com os filtros atuais" style={{ background: 'rgba(139, 92, 246, 0.15)', border: '1px solid rgba(139, 92, 246, 0.3)', color: '#c4b5fd', padding: '0.4rem 0.9rem', borderRadius: '6px', cursor: loading ? 'wait' : 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>🔄 Atualizar</button>
                    <button onClick={handleCopy} disabled={filteredLogs.length === 0} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: '#fff', padding: '0.4rem 0.9rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' }}>📋 Copiar</button>
                    <button onClick={handleDownload} disabled={filteredLogs.length === 0} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: '#fff', padding: '0.4rem 0.9rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' }}>⬇️ Download</button>
                </div>
            </div>

            <div style={{ maxHeight: '60vh', overflowY: 'auto', fontFamily: "'JetBrains Mono', 'Fira Code', monospace", fontSize: '0.78rem' }}>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>Carregando logs...</div>
                ) : filteredLogs.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                        Nenhum log carregado. Escolha um dia ou clique em "Carregar Logs" para buscar o console dos containers.
                    </div>
                ) : (
                    pagedLogs.map((entry, idx) => {
                        const colorSet = LEVEL_COLORS[entry.level] || LEVEL_COLORS.INFO;
                        return (
                            <div key={entry.id} style={{
                                display: 'flex', gap: '0.75rem', alignItems: 'flex-start',
                                padding: '0.4rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.03)',
                                background: 'transparent'
                            }}>
                                <span style={{ color: '#475569', flexShrink: 0, marginTop: '2px', minWidth: '3em', textAlign: 'right', userSelect: 'none' }}>
                                    {(safePage - 1) * pageSize + idx + 1}
                                </span>
                                <span style={{
                                    background: colorSet.bg, color: colorSet.color, padding: '1px 8px',
                                    borderRadius: '4px', fontWeight: 700, fontSize: '0.68rem', flexShrink: 0, marginTop: '2px'
                                }}>
                                    {entry.level}
                                </span>
                                <span style={{ color: '#64748b', flexShrink: 0, marginTop: '2px' }}>
                                    {entry.timestamp_display || '--'}
                                </span>
                                <span style={{ color: '#a78bfa', flexShrink: 0, marginTop: '2px' }}>
                                    [{entry.container}]
                                </span>
                                <span style={{ color: '#e2e8f0', wordBreak: 'break-word', flex: 1 }}>
                                    <span style={{ color: '#7dd3fc' }}>{entry.logger}</span> — {entry.message}
                                </span>
                            </div>
                        );
                    })
                )}
            </div>

            {filteredLogs.length > 0 && totalPages > 1 && (
                <div style={{
                    display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem',
                    padding: '0.75rem 1.25rem', borderTop: '1px solid rgba(255,255,255,0.06)'
                }}>
                    <button
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={safePage <= 1}
                        style={{
                            background: 'rgba(255,255,255,0.05)', border: 'none', color: '#fff',
                            padding: '0.4rem 0.9rem', borderRadius: '6px', fontSize: '0.8rem',
                            cursor: safePage <= 1 ? 'not-allowed' : 'pointer', opacity: safePage <= 1 ? 0.4 : 1
                        }}
                    >
                        ← Anterior
                    </button>
                    <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                        Página {safePage.toLocaleString('pt-BR')} de {totalPages.toLocaleString('pt-BR')}
                    </span>
                    <button
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={safePage >= totalPages}
                        style={{
                            background: 'rgba(255,255,255,0.05)', border: 'none', color: '#fff',
                            padding: '0.4rem 0.9rem', borderRadius: '6px', fontSize: '0.8rem',
                            cursor: safePage >= totalPages ? 'not-allowed' : 'pointer', opacity: safePage >= totalPages ? 0.4 : 1
                        }}
                    >
                        Próxima →
                    </button>
                </div>
            )}
        </div>
    );
};

export default LogsTable;
