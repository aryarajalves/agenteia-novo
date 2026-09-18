import React, { useState } from 'react';
import { api } from '../../../../api/client';

const TestFunnelModal = ({ isOpen, agentId, onClose, initialFunnel }) => {
    const [testQuery, setTestQuery] = useState(initialFunnel ? initialFunnel.trigger_question : '');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const handleRunTest = async (e) => {
        if (e) e.preventDefault();
        if (!testQuery.trim()) return;
        setLoading(true);
        setError('');
        setResult(null);

        try {
            const res = await api.post('/question-funnels/test-trigger', {
                agent_id: agentId,
                test_query: testQuery.trim()
            });
            if (res.ok) {
                const data = await res.json();
                setResult(data);
            } else {
                setError('Falha ao processar teste de gatilho.');
            }
        } catch (err) {
            setError(`Erro: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div 
            style={{ 
                backgroundColor: 'rgba(0, 0, 0, 0.75)', 
                backdropFilter: 'blur(5px)',
                position: 'fixed',
                top: 0, left: 0, right: 0, bottom: 0,
                zIndex: 60,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '1rem'
            }}
        >
            <div 
                style={{
                    background: '#0f172a',
                    border: '1px solid rgba(56, 189, 248, 0.3)',
                    borderRadius: '16px',
                    width: '100%',
                    maxWidth: '560px',
                    maxHeight: '85vh',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
                    overflow: 'hidden'
                }}
            >
                {/* Header */}
                <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <span style={{ fontSize: '1.3rem' }}>🧪</span>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#f8fafc', fontWeight: 700 }}>
                                Testar Gatilho de Funil
                            </h3>
                            <p style={{ margin: 0, fontSize: '0.78rem', color: '#94a3b8' }}>
                                Digite uma mensagem de lead para simular o matching semântico
                            </p>
                        </div>
                    </div>
                    <button 
                        type="button" 
                        onClick={onClose}
                        style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer' }}
                    >
                        ✕
                    </button>
                </div>

                {/* Body */}
                <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <form onSubmit={handleRunTest} style={{ display: 'flex', gap: '0.5rem' }}>
                        <input 
                            type="text" 
                            placeholder="Ex: como funciona o curso de vcs?"
                            value={testQuery}
                            onChange={(e) => setTestQuery(e.target.value)}
                            style={{ flex: 1, padding: '0.55rem 0.75rem', background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#f8fafc', fontSize: '0.9rem' }}
                        />
                        <button
                            type="submit"
                            disabled={loading || !testQuery.trim()}
                            style={{ padding: '0.55rem 1.1rem', background: '#0284c7', border: 'none', borderRadius: '8px', color: '#ffffff', fontWeight: 600, fontSize: '0.85rem', cursor: loading ? 'wait' : 'pointer' }}
                        >
                            {loading ? '⏳ Testando...' : '🔍 Simular'}
                        </button>
                    </form>

                    {error && (
                        <div style={{ padding: '0.6rem', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', borderRadius: '8px', color: '#fca5a5', fontSize: '0.85rem' }}>
                            {error}
                        </div>
                    )}

                    {result && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {/* Best Match Result Card */}
                            {result.matched && result.best_match ? (
                                <div style={{ padding: '1rem', background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.4)', borderRadius: '10px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#4ade80', fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.35rem' }}>
                                        <span>✅ GATILHO ATIVADO!</span>
                                    </div>
                                    <div style={{ fontSize: '0.9rem', color: '#f8fafc', fontWeight: 600, marginBottom: '0.2rem' }}>
                                        Funil: "{result.best_match.name}"
                                    </div>
                                    <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                                        Similaridade: <strong>{result.best_match.similarity_pct}</strong> (Mínimo exigido: {result.best_match.threshold_pct})
                                    </div>
                                </div>
                            ) : (
                                <div style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '10px' }}>
                                    <div style={{ color: '#f87171', fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.35rem' }}>
                                        ❌ NENHUM FUNIL ATIVADO
                                    </div>
                                    <div style={{ fontSize: '0.82rem', color: '#cbd5e1' }}>
                                        A mensagem não atingiu o percentual de similaridade de nenhum funil ativo. A IA convencional responderia a este lead via RAG.
                                    </div>
                                </div>
                            )}

                            {/* All Candidates Breakdown */}
                            {result.all_candidates && result.all_candidates.length > 0 && (
                                <div style={{ marginTop: '0.5rem' }}>
                                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#94a3b8', marginBottom: '0.4rem' }}>
                                        📊 Análise de Similaridade de Todos os Funis:
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                        {result.all_candidates.map((cand, idx) => (
                                            <div 
                                                key={idx}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    padding: '0.5rem 0.75rem',
                                                    background: '#1e293b',
                                                    border: cand.would_trigger ? '1px solid rgba(34, 197, 94, 0.4)' : '1px solid rgba(255, 255, 255, 0.05)',
                                                    borderRadius: '6px',
                                                    fontSize: '0.82rem'
                                                }}
                                            >
                                                <div style={{ color: '#f8fafc', fontWeight: 600 }}>
                                                    {cand.name}
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                                    <span style={{ color: cand.would_trigger ? '#4ade80' : '#94a3b8', fontWeight: 700 }}>
                                                        {cand.similarity_pct}
                                                    </span>
                                                    <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                                                        (min: {cand.threshold_pct})
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div style={{ padding: '0.75rem 1.5rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', justifyContent: 'flex-end', background: 'rgba(15, 23, 42, 0.5)' }}>
                    <button
                        type="button"
                        onClick={onClose}
                        style={{ padding: '0.45rem 1rem', background: '#1e293b', border: '1px solid #334155', color: '#cbd5e1', borderRadius: '8px', cursor: 'pointer', fontSize: '0.82rem' }}
                    >
                        Fechar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TestFunnelModal;
