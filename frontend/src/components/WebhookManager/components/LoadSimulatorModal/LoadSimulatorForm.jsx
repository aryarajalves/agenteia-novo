import React from 'react';

const CONTACT_PRESETS = [10, 50, 100, 250, 500];

const LoadSimulatorForm = ({
    contactCount,
    setContactCount,
    sampleMessage,
    setSampleMessage,
    concurrencyRate,
    setConcurrencyRate,
    respectDelay,
    setRespectDelay,
    webhook,
    errorMsg,
    onRunSimulation
}) => {
    return (
        <>
            <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#a5b4fc', textTransform: 'uppercase', marginBottom: '0.45rem', letterSpacing: '0.05em' }}>
                    👥 Quantidade de Contatos Fictícios
                </label>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.6rem' }}>
                    {CONTACT_PRESETS.map(cnt => (
                        <button
                            key={cnt}
                            type="button"
                            onClick={() => setContactCount(cnt)}
                            style={{
                                flex: 1,
                                background: contactCount === cnt ? 'rgba(99, 102, 241, 0.25)' : 'rgba(15, 23, 42, 0.6)',
                                border: contactCount === cnt ? '1.5px solid #818cf8' : '1px solid rgba(255, 255, 255, 0.1)',
                                color: contactCount === cnt ? '#f8fafc' : '#94a3b8',
                                borderRadius: '8px',
                                padding: '0.45rem 0',
                                fontWeight: 800,
                                fontSize: '0.82rem',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            {cnt} contatos
                        </button>
                    ))}
                </div>
                <input 
                    type="number"
                    min="1"
                    max="1000"
                    value={contactCount}
                    onChange={e => setContactCount(Math.max(1, Math.min(1000, Number(e.target.value))))}
                    style={{
                        width: '100%',
                        background: 'rgba(15, 23, 42, 0.8)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        borderRadius: '8px',
                        padding: '0.55rem 0.85rem',
                        color: '#fff',
                        fontSize: '0.85rem',
                        fontWeight: 600
                    }}
                />
            </div>

            <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#a5b4fc', textTransform: 'uppercase', marginBottom: '0.45rem', letterSpacing: '0.05em' }}>
                    💬 Mensagem do Teste de Carga
                </label>
                <textarea
                    rows="2"
                    value={sampleMessage}
                    onChange={e => setSampleMessage(e.target.value)}
                    placeholder="Escreva a mensagem enviada pelos contatos simulados..."
                    style={{
                        width: '100%',
                        background: 'rgba(15, 23, 42, 0.8)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        borderRadius: '8px',
                        padding: '0.6rem 0.85rem',
                        color: '#fff',
                        fontSize: '0.85rem',
                        resize: 'none',
                        outline: 'none'
                    }}
                />
            </div>

            <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#a5b4fc', textTransform: 'uppercase', marginBottom: '0.45rem', letterSpacing: '0.05em' }}>
                    🚀 Concorrência Desejada (requisições / seg)
                </label>
                <select
                    value={concurrencyRate}
                    onChange={e => setConcurrencyRate(e.target.value)}
                    style={{
                        width: '100%',
                        background: 'rgba(15, 23, 42, 0.8)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        borderRadius: '8px',
                        padding: '0.55rem 0.85rem',
                        color: '#fff',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        cursor: 'pointer'
                    }}
                >
                    <option value="10" style={{ background: '#0f172a' }}>10 req/seg (Carga Leve)</option>
                    <option value="20" style={{ background: '#0f172a' }}>20 req/seg (Carga Média)</option>
                    <option value="50" style={{ background: '#0f172a' }}>50 req/seg (Alta Concorrência)</option>
                    <option value="100" style={{ background: '#0f172a' }}>100 req/seg (Estresse Máximo)</option>
                </select>
            </div>

            <div style={{
                background: 'rgba(99, 102, 241, 0.08)',
                border: '1px solid rgba(99, 102, 241, 0.2)',
                borderRadius: '10px',
                padding: '0.85rem 1rem',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.75rem',
                cursor: 'pointer'
            }} onClick={() => setRespectDelay(!respectDelay)}>
                <input
                    type="checkbox"
                    checked={respectDelay}
                    onChange={e => setRespectDelay(e.target.checked)}
                    style={{ marginTop: '3px', cursor: 'pointer' }}
                />
                <div>
                    <span style={{ fontSize: '0.83rem', fontWeight: 800, color: '#f8fafc', display: 'block' }}>
                        ⏱️ Aguardar Delay de Agrupamento ({webhook?.delay_seconds || 30}s reais no Celery)
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                        {respectDelay 
                            ? `Os contatos ficarão em 'Aguardando' por ${webhook?.delay_seconds || 30}s no Celery antes da IA responder.`
                            : `Modo Velocidade Máxima: A pipeline roda instantaneamente mantendo o histórico de debounce (30s) na timeline.`
                        }
                    </span>
                </div>
            </div>

            {errorMsg && (
                <div style={{ padding: '0.75rem', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', borderRadius: '8px', fontSize: '0.82rem' }}>
                    ⚠️ {errorMsg}
                </div>
            )}

            <button
                type="button"
                onClick={onRunSimulation}
                style={{
                    width: '100%',
                    background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                    boxShadow: '0 4px 18px rgba(99, 102, 241, 0.4)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#ffffff',
                    borderRadius: '10px',
                    padding: '0.75rem',
                    fontSize: '0.92rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    marginTop: '0.5rem'
                }}
            >
                ⚡ Iniciar Simulação de Carga
            </button>
        </>
    );
};

export default LoadSimulatorForm;
