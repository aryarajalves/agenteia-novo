import React, { useState } from 'react';
import { showToast } from '../utils/helpers';

export const RaioXViewerModal = ({ data, onClose }) => {
    const [activeTab, setActiveTab] = useState('prompt');
    if (!data) return null;

    let parsed = {};
    try {
        parsed = JSON.parse(data);
    } catch {
        parsed = { error: "Erro ao processar dados.", raw: data };
    }

    const tabs = [
        { id: 'prompt', label: '📜 Prompt do Sistema', icon: '📝' },
        { id: 'memory', label: '🧠 Memória (Contexto)', icon: '📖' },
        { id: 'metadata', label: '🔍 Metadados & Tools', icon: '⚙️' },
        { id: 'raw', label: 'JSON Bruto', icon: '💻' },
    ];

    return (
        <div 
            className="fade-in"
            style={{
                position: 'fixed', inset: 0, zIndex: 1200,
                background: 'rgba(2, 6, 23, 0.95)',
                backdropFilter: 'blur(20px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '1.5rem', transition: 'all 0.3s'
            }}
        >
            <div 
                onClick={e => e.stopPropagation()}
                style={{
                    background: 'linear-gradient(145deg, #0f172a 0%, #1e293b 100%)',
                    border: '1px solid rgba(99, 102, 241, 0.2)',
                    borderRadius: '24px',
                    width: '100%', maxWidth: '850px',
                    height: '85vh',
                    display: 'flex', flexDirection: 'column',
                    boxShadow: '0 50px 100px rgba(0,0,0,0.9), 0 0 40px rgba(99, 102, 241, 0.1)',
                    overflow: 'hidden', position: 'relative'
                }}
            >
                <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', boxShadow: '0 0 20px rgba(251, 191, 36, 0.2)' }}>🔬</div>
                        <div>
                            <div style={{ fontWeight: 800, color: '#fff', fontSize: '1.1rem' }}>Visualizador de Contexto Raio-X</div>
                            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>O que foi enviado para a IA neste momento</div>
                        </div>
                    </div>
                    <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', borderRadius: '12px', width: '36px', height: '36px', cursor: 'pointer' }}>✕</button>
                </div>

                <div style={{ display: 'flex', gap: '4px', padding: '0.75rem 1rem', background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    {tabs.map(t => (
                        <button
                            key={t.id}
                            onClick={() => setActiveTab(t.id)}
                            style={{
                                padding: '0.6rem 1rem', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 700,
                                background: activeTab === t.id ? '#6366f1' : 'transparent',
                                border: 'none', color: activeTab === t.id ? '#fff' : '#64748b',
                                cursor: 'pointer', transition: 'all 0.2s',
                                display: 'flex', alignItems: 'center', gap: '8px'
                            }}
                        >
                            <span>{t.icon}</span> {t.label}
                        </button>
                    ))}
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '2rem', color: '#cbd5e1' }} className="custom-scrollbar">
                    {activeTab === 'prompt' && (
                        <div className="fade-in">
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#6366f1', textTransform: 'uppercase' }}>System Prompt</span>
                                <button 
                                    onClick={() => {
                                        if (navigator?.clipboard?.writeText) {
                                            Promise.resolve(navigator.clipboard.writeText(parsed.prompt_sistema || "")).then(() => {
                                                showToast('Prompt copiado para a área de transferência!', 'success');
                                            }).catch(() => {
                                                showToast('Erro ao copiar prompt.', 'error');
                                            });
                                        }
                                    }} 
                                    style={{ fontSize: '0.65rem', padding: '4px 8px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', cursor: 'pointer' }}
                                >Copiar Prompt</button>
                            </div>
                            <div style={{ 
                                background: '#020617', 
                                borderRadius: '12px', 
                                border: '1px solid rgba(255,255,255,0.05)', 
                                overflow: 'hidden',
                                display: 'flex',
                                fontSize: '0.82rem',
                                fontFamily: 'monospace',
                                lineHeight: 1.6
                            }}>
                                <div style={{ 
                                    padding: '1.5rem 0.75rem', 
                                    background: 'rgba(255,255,255,0.02)', 
                                    borderRight: '1px solid rgba(255,255,255,0.05)',
                                    color: '#475569',
                                    textAlign: 'right',
                                    userSelect: 'none',
                                    minWidth: '45px'
                                }}>
                                    {(parsed.prompt_sistema || "").split('\n').map((_, i) => (
                                        <div key={i}>{i + 1}</div>
                                    ))}
                                </div>
                                <pre style={{ 
                                    margin: 0,
                                    padding: '1.5rem', 
                                    whiteSpace: 'pre-wrap', 
                                    wordBreak: 'break-word',
                                    color: '#cbd5e1',
                                    flex: 1
                                }}>
                                    {parsed.prompt_sistema || "Nenhum prompt disponível."}
                                </pre>
                            </div>
                        </div>
                    )}

                    {activeTab === 'memory' && (
                        <div className="fade-in">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <h4 style={{ margin: 0, color: '#6366f1', fontSize: '0.8rem', textTransform: 'uppercase' }}>Histórico Injetado (Memória)</h4>
                                <span style={{ fontSize: '0.7rem', color: '#94a3b8', background: 'rgba(255,255,255,0.05)', padding: '4px 10px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                                    {parsed.memoria_contexto ? parsed.memoria_contexto.length : 0} / {parsed.limite_janela || '?'} mensagens
                                </span>
                            </div>
                            {(!parsed.memoria_contexto || parsed.memoria_contexto.length === 0) ? (
                                <div style={{ padding: '2rem', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
                                    Nenhuma memória de contexto foi enviada para esta mensagem.
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {[...parsed.memoria_contexto].reverse().map((msg, i) => (
                                        <div key={i} style={{ 
                                            background: msg.role === 'assistant' ? 'rgba(99, 102, 241, 0.05)' : 'rgba(255, 255, 255, 0.02)',
                                            padding: '1rem', borderRadius: '12px', border: msg.role === 'assistant' ? '1px solid rgba(99, 102, 241, 0.2)' : '1px solid rgba(255, 255, 255, 0.05)'
                                        }}>
                                            <div style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', color: msg.role === 'assistant' ? '#818cf8' : '#94a3b8', marginBottom: '0.5rem' }}>
                                                {msg.role === 'assistant' ? '🤖 Agente' : '👤 Usuário'}
                                            </div>
                                            <div style={{ fontSize: '0.85rem', lineHeight: 1.5 }}>{msg.content}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'metadata' && (
                        <div className="fade-in">
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                <section>
                                    <h4 style={{ fontSize: '0.8rem', color: '#6366f1', textTransform: 'uppercase', marginBottom: '1rem' }}>Sessão & Contato</h4>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                        {[
                                            { label: 'Sessão', val: parsed.metadados?.session_id },
                                            { label: 'Nome', val: parsed.metadados?.user_name },
                                            { label: 'Telefone', val: parsed.metadados?.phone },
                                            { label: 'Modelo', val: parsed.modelo }
                                        ].map(item => (
                                            <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                                                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>{item.label}</span>
                                                <span style={{ fontSize: '0.8rem', color: '#fff', fontWeight: 700 }}>{item.val || '-'}</span>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                                <section>
                                    <h4 style={{ fontSize: '0.8rem', color: '#fbbf24', textTransform: 'uppercase', marginBottom: '1rem' }}>Ferramentas Disponíveis</h4>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                        {(!parsed.ferramentas_habilitadas || parsed.ferramentas_habilitadas.length === 0) ? (
                                            <span style={{ color: '#475569', fontSize: '0.8rem' }}>Nenhuma ferramenta vinculada.</span>
                                        ) : (
                                            parsed.ferramentas_habilitadas.map(tool => (
                                                <span key={tool} style={{ padding: '6px 12px', background: 'rgba(251, 191, 36, 0.1)', border: '1px solid rgba(251, 191, 36, 0.3)', color: '#fbbf24', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700 }}>
                                                    🛠️ {tool}
                                                </span>
                                            ))
                                        )}
                                    </div>
                                </section>
                            </div>
                        </div>
                    )}

                    {activeTab === 'raw' && (
                        <div className="fade-in">
                            <pre style={{ 
                                margin: 0, padding: '1.5rem', background: '#020617', borderRadius: '12px', 
                                border: '1px solid rgba(255,255,255,0.05)', fontSize: '0.75rem', color: '#4ade80',
                                fontFamily: 'monospace', overflowX: 'auto', whiteSpace: 'pre'
                            }}>
                                {JSON.stringify(parsed, null, 2)}
                            </pre>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RaioXViewerModal;
