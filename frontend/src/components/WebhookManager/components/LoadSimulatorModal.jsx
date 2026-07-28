import React, { useState } from 'react';
import { api } from '../../../api/client';

const LoadSimulatorModal = ({ webhook, onClose, onFinish, onViewLeads }) => {
    const [contactCount, setContactCount] = useState(50);
    const [sampleMessage, setSampleMessage] = useState('Olá, gostaria de informações sobre o atendimento em escala.');
    const [concurrencyRate, setConcurrencyRate] = useState(20);
    const [respectDelay, setRespectDelay] = useState(false);
    
    const [simulating, setSimulating] = useState(false);
    const [progress, setProgress] = useState(0);
    const [results, setResults] = useState(null);
    const [errorMsg, setErrorMsg] = useState(null);

    const handleRunSimulation = async () => {
        setSimulating(true);
        setProgress(10);
        setErrorMsg(null);
        setResults(null);

        // Animação de progresso visual
        const interval = setInterval(() => {
            setProgress(prev => {
                if (prev >= 90) {
                    clearInterval(interval);
                    return 90;
                }
                return prev + 15;
            });
        }, 300);

        try {
            const res = await api.post(`/webhooks/${webhook.id}/simulate-load`, {
                contact_count: Number(contactCount),
                sample_message: sampleMessage,
                concurrency_rate: Number(concurrencyRate),
                respect_delay: respectDelay
            });

            clearInterval(interval);
            const data = await res.json();

            if (res.ok && data.ok) {
                setProgress(100);
                setResults(data);
                if (onFinish) onFinish();
            } else {
                setErrorMsg(data.detail || 'Erro ao processar simulação de carga.');
            }
        } catch (err) {
            clearInterval(interval);
            console.error('Erro na simulação de carga:', err);
            setErrorMsg('Erro de conexão ao comunicar com o servidor.');
        } finally {
            setSimulating(false);
        }
    };

    return (
        <div className="premium-modal-overlay">
            <div 
                className="premium-modal-content"
                style={{ maxWidth: '640px', padding: 0, overflow: 'hidden' }}
                onClick={e => e.stopPropagation()}
            >
                {/* Cabeçalho */}
                <div style={{
                    padding: '1.25rem 1.5rem',
                    background: 'linear-gradient(180deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.95) 100%)',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                        <div style={{
                            width: '40px', height: '40px', borderRadius: '12px',
                            background: 'rgba(99, 102, 241, 0.15)', border: '1px solid rgba(99, 102, 241, 0.3)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem'
                        }}>⚡</div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#f8fafc', fontWeight: 800 }}>
                                Simulador de Carga & Escala
                            </h3>
                            <p style={{ margin: 0, fontSize: '0.78rem', color: '#94a3b8' }}>
                                Integração: <strong>{webhook.name}</strong> (Modo MOCK / Zero Tokens)
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose} 
                        disabled={simulating}
                        style={{
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            color: '#94a3b8',
                            borderRadius: '8px',
                            width: '32px',
                            height: '32px',
                            cursor: simulating ? 'not-allowed' : 'pointer',
                            fontSize: '0.9rem'
                        }}
                    >✕</button>
                </div>

                {/* Conteúdo Principal */}
                <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    
                    {/* Formulário de Configuração */}
                    {!simulating && !results && (
                        <>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#a5b4fc', textTransform: 'uppercase', marginBottom: '0.45rem', letterSpacing: '0.05em' }}>
                                    👥 Quantidade de Contatos Fictícios
                                </label>
                                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.6rem' }}>
                                    {[10, 50, 100, 250, 500].map(cnt => (
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
                                        ⏱️ Aguardar Delay de Agrupamento ({webhook.delay_seconds || 30}s reais no Celery)
                                    </span>
                                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                                        {respectDelay 
                                            ? `Os contatos ficarão em 'Aguardando' por ${webhook.delay_seconds || 30}s no Celery antes da IA responder.`
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
                                onClick={handleRunSimulation}
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
                    )}

                    {/* Estado de Progresso Animado */}
                    {simulating && (
                        <div style={{ padding: '2.5rem 1rem', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '1.25rem', alignItems: 'center' }}>
                            <div style={{ fontSize: '2.5rem', animation: 'spin 1.5s infinite linear' }}>⚡</div>
                            <div>
                                <h4 style={{ margin: 0, color: '#f8fafc', fontSize: '1.1rem', fontWeight: 800 }}>
                                    Processando {contactCount} contatos fictícios...
                                </h4>
                                <p style={{ margin: '0.3rem 0 0 0', color: '#94a3b8', fontSize: '0.82rem' }}>
                                    Executando inserção paralela no banco e simulação de eventos MOCK
                                </p>
                            </div>

                            <div style={{ width: '100%', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '10px', height: '10px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                                <div style={{
                                    width: `${progress}%`,
                                    height: '100%',
                                    background: 'linear-gradient(90deg, #6366f1, #10b981)',
                                    transition: 'width 0.3s ease'
                                }} />
                            </div>
                        </div>
                    )}

                    {/* Painel de Resultados do Benchmark */}
                    {results && !simulating && (
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
                                    onClick={() => setResults(null)}
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
                                        onClick={onViewLeads}
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
                    )}
                </div>
            </div>
        </div>
    );
};

export default LoadSimulatorModal;
