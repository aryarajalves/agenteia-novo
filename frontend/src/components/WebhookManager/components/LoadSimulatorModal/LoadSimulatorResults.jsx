import React from 'react';

const LoadSimulatorResults = ({ results, onResetResults, webhook, onViewLeads }) => {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ padding: '0.9rem 1.1rem', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '10px', color: '#34d399', fontSize: '0.85rem', fontWeight: 700 }}>
                ✅ {results.message}
            </div>

            {/* Cards de Métricas em Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ padding: '1rem', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(99, 102, 241, 0.3)', borderRadius: '12px', textAlign: 'center' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#a5b4fc', textTransform: 'uppercase', display: 'block', marginBottom: '0.2rem' }}>
                        🚀 Vazão (Throughput)
                    </span>
                    <span style={{ fontSize: '1.6rem', fontWeight: 900, color: '#f8fafc' }}>
                        {results.throughput_per_sec} <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>req/s</span>
                    </span>
                </div>

                <div style={{ padding: '1rem', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(99, 102, 241, 0.3)', borderRadius: '12px', textAlign: 'center' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#a5b4fc', textTransform: 'uppercase', display: 'block', marginBottom: '0.2rem' }}>
                        ⏱️ Latência Média
                    </span>
                    <span style={{ fontSize: '1.6rem', fontWeight: 900, color: '#f8fafc' }}>
                        {results.avg_latency_ms} <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>ms</span>
                    </span>
                </div>

                <div style={{ padding: '1rem', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '12px', textAlign: 'center' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#34d399', textTransform: 'uppercase', display: 'block', marginBottom: '0.2rem' }}>
                        👥 Processados com Sucesso
                    </span>
                    <span style={{ fontSize: '1.6rem', fontWeight: 900, color: '#34d399' }}>
                        {results.contacts_processed} / {results.total_requested}
                    </span>
                </div>

                <div style={{ padding: '1rem', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', textAlign: 'center' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: '0.2rem' }}>
                        ⏱️ Tempo Total
                    </span>
                    <span style={{ fontSize: '1.6rem', fontWeight: 900, color: '#f8fafc' }}>
                        {results.elapsed_ms} <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>ms</span>
                    </span>
                </div>
            </div>

            {/* Botões de Ação Final */}
            <div style={{ display: 'flex', gap: '0.85rem', marginTop: '0.5rem' }}>
                <button
                    type="button"
                    onClick={onResetResults}
                    style={{
                        flex: 1,
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        color: '#cbd5e1',
                        borderRadius: '10px',
                        padding: '0.7rem',
                        fontWeight: 800,
                        fontSize: '0.85rem',
                        cursor: 'pointer'
                    }}
                >
                    🔄 Novo Teste
                </button>

                {onViewLeads && (
                    <button
                        type="button"
                        onClick={() => onViewLeads(webhook)}
                        style={{
                            flex: 1.3,
                            background: 'linear-gradient(135deg, #10b981, #059669)',
                            border: '1px solid rgba(255, 255, 255, 0.15)',
                            color: '#ffffff',
                            borderRadius: '10px',
                            padding: '0.7rem',
                            fontWeight: 800,
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px'
                        }}
                    >
                        👥 Ver Contatos Gerados
                    </button>
                )}
            </div>
        </div>
    );
};

export default LoadSimulatorResults;
