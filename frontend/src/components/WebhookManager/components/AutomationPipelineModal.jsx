import React, { useState, useEffect } from 'react';
import { API_URL } from '../../../config';
import PipelineCountdown from './Common/PipelineCountdown';
import RaioXViewerModal from './RaioXViewerModal';
import PreRouterViewerModal from './PreRouterViewerModal';
import RagViewerModal from './RagViewerModal';

const AutomationPipelineModal = ({
    event: initialEvent,
    webhookId,
    onClose
}) => {
    const [event, setEvent] = useState(initialEvent);
    const [maximizedStep, setMaximizedStep] = useState(null);
    const [loading, setLoading] = useState(false);
    const [isTimeout, setIsTimeout] = useState(false);

    // Fallback defensivo: alguns fluxos (telas de leads/histórico) montam este modal com um
    // "event" que não traz webhook_config_id (depende do endpoint de origem). Sem isso, o
    // polling automático e o botão de atualizar manual falham (early-return no guard), dando a
    // impressão de botão "quebrado" mesmo clicando nele.
    const webhookConfigId = event?.webhook_config_id ?? webhookId;

    // Helper para garantir que a data seja tratada como UTC se não tiver timezone
    const parseDate = (dateStr) => {
        try {
            if (!dateStr) return new Date();
            // Se já for uma data, retorna ela
            if (dateStr instanceof Date) return dateStr;
            
            // Se não tiver 'Z' nem offset (+/-), adiciona 'Z' para o browser tratar como UTC
            const normalized = (dateStr.includes('Z') || dateStr.match(/[+-]\d{2}:?\d{2}$/)) 
                ? dateStr 
                : dateStr + 'Z';
            const d = new Date(normalized);
            return isNaN(d.getTime()) ? new Date() : d;
        } catch (e) {
            return new Date();
        }
    };

    // Busca os detalhes completos do evento (incluindo os passos reais processing_steps)
    const fetchEventDetail = React.useCallback(async () => {
        if (!event?.id) return;

        try {
            const baseUrl = API_URL.replace(/\/$/, '');
            const url = webhookConfigId 
                ? `${baseUrl}/webhooks/${webhookConfigId}/events/${event.id}`
                : `${baseUrl}/webhooks/events/${event.id}`;
            const res = await fetch(url);
            if (!res.ok) return;
            const data = await res.json();
            setEvent(prev => ({ ...prev, ...data }));
        } catch (e) {
            console.error('Erro ao buscar detalhes do pipeline:', e);
        }
    }, [event?.id, webhookConfigId]);

    // Polling periódico apenas se o evento ainda estiver em processamento
    const pollEvent = React.useCallback(async () => {
        if (!event?.id || ['completed', 'error', 'canceled', 'grouped', 'ignored'].includes(event?.status)) return;
        await fetchEventDetail();
    }, [event?.id, event?.status, fetchEventDetail]);

    useEffect(() => {
        // Busca imediata ao abrir o modal, garantindo carregamento dos passos mesmo para eventos já concluídos
        fetchEventDetail();

        // WebSocket para atualizações instantâneas
        const wsUrl = API_URL.replace('http', 'ws') + '/ws/events';
        let ws;
        try {
            ws = new WebSocket(wsUrl);
            ws.onmessage = (msg) => {
                try {
                    const data = JSON.parse(msg.data);
                    if (data.type === 'status_update' && data.event_id === event.id) {
                        fetchEventDetail(); // Força um refresh dos dados completos
                    }
                } catch (e) { console.error('Erro WS Pipeline:', e); }
            };
        } catch (e) { console.error('Erro conexão WS Pipeline:', e); }

        const timer = setInterval(pollEvent, 3000);
        return () => {
            clearInterval(timer);
            if (ws) ws.close();
        };
    }, [event.id, fetchEventDetail, pollEvent]);

    // Detectar timeout de processamento longo no frontend
    useEffect(() => {
        setIsTimeout(false);
        if (!['processing', 'received', 'pending'].includes(event.status)) return;

        const checkTimeout = () => {
            const createdTime = parseDate(event.created_at || event.updated_at).getTime();
            const now = Date.now();
            // Timeout de 90 segundos
            if (now - createdTime > 90000) {
                setIsTimeout(true);
            }
        };

        checkTimeout();
        const interval = setInterval(checkTimeout, 2000);
        return () => clearInterval(interval);
    }, [event.status, event.created_at, event.updated_at]);

    // Bloquear scroll
    useEffect(() => {
        const originalStyle = window.getComputedStyle(document.body).overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = originalStyle; };
    }, []);

    // Parsear os passos reais do backend
    let rawSteps = [];
    try {
        rawSteps = JSON.parse(event.processing_steps || '[]');
    } catch (e) {
        console.error('Erro ao parsear steps:', e);
    }

    const steps = rawSteps.map((s, idx) => ({
        id: idx,
        title: s.step || 'Passo da Automação',
        time: s.timestamp ? parseDate(s.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '--:--:--',
        content: s.detail || '',
        icon: s.step?.includes('✅') ? '✔️' : 
              s.step?.includes('❌') ? '❌' : 
              s.step?.includes('🤖') ? '🤖' : 
              s.step?.includes('🔍') ? '🔍' : 
              s.step?.includes('📥') ? '📥' : '⚡',
        metadata: s.metadata
    }));

    // Se tiver resposta do agente e não estiver nos steps, adicionar como passo final
    if (event.agent_response && !steps.some(s => s.title.includes('Resposta gerada'))) {
        steps.push({
            id: 'final-resp',
            title: '✅ Resposta Final Enviada',
            time: event.updated_at ? parseDate(event.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--',
            content: event.agent_response,
            icon: '🤖'
        });
    }

    return (
        <div className="premium-modal-overlay" style={{ zIndex: 1100 }}>
            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes pulse {
                    0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.7); }
                    70% { transform: scale(1.1); box-shadow: 0 0 0 10px rgba(99, 102, 241, 0); }
                    100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(99, 102, 241, 0); }
                }
                @keyframes pulseCard {
                    0% { border-color: rgba(99, 102, 241, 0.2); background: rgba(99, 102, 241, 0.05); }
                    50% { border-color: rgba(99, 102, 241, 0.4); background: rgba(99, 102, 241, 0.09); }
                    100% { border-color: rgba(99, 102, 241, 0.2); background: rgba(99, 102, 241, 0.05); }
                }
                .pipeline-spinner {
                    width: 24px;
                    height: 24px;
                    border: 3px solid rgba(99, 102, 241, 0.1);
                    border-top-color: #6366f1;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    flex-shrink: 0;
                }
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            ` }} />
            <div
                onClick={e => e.stopPropagation()}
                className="premium-modal-content"
                style={{ maxWidth: '650px', width: '90%', borderRadius: '32px', padding: '2rem', height: '85vh', display: 'flex', flexDirection: 'column' }}
            >
                {/* Cabeçalho do Pipeline */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
                    <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
                        <div style={{ 
                            width: '56px', height: '56px', borderRadius: '18px', 
                            background: 'linear-gradient(135deg, #6366f1, #4f46e5)', 
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem',
                            boxShadow: '0 8px 24px rgba(99, 102, 241, 0.4)'
                        }}>⚡</div>
                        <div>
                            <h2 style={{ margin: 0, fontWeight: 900, color: '#f8fafc', fontSize: '1.5rem', letterSpacing: '-0.02em' }}>Pipeline</h2>
                            <p style={{ margin: '4px 0 0 0', fontSize: '0.9rem', color: '#64748b', fontWeight: 600 }}>
                                {parseDate(event.created_at).toLocaleDateString()} · {parseDate(event.created_at).toLocaleTimeString()}
                            </p>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <button
                            onClick={async () => {
                                if (loading || !event?.id) return;
                                setLoading(true);
                                const minSpinDelay = new Promise(resolve => setTimeout(resolve, 550));
                                try {
                                    const baseUrl = API_URL.replace(/\/$/, '');
                                    const url = webhookConfigId 
                                        ? `${baseUrl}/webhooks/${webhookConfigId}/events/${event.id}`
                                        : `${baseUrl}/webhooks/events/${event.id}`;
                                    const fetchPromise = fetch(url);
                                    const [res] = await Promise.all([fetchPromise, minSpinDelay]);
                                    if (res.ok) {
                                        const data = await res.json();
                                        setEvent(prev => ({ ...prev, ...data }));
                                    } else {
                                        console.error('Erro no refresh manual do pipeline: resposta não OK', res.status);
                                    }
                                } catch (e) {
                                    await minSpinDelay;
                                    console.error('Erro no refresh manual do pipeline:', e);
                                } finally {
                                    setLoading(false);
                                }
                            }}
                            disabled={loading}
                            className="modal-close-btn"
                            style={{
                                width: '40px',
                                height: '40px',
                                background: 'rgba(255,255,255,0.05)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '1.1rem',
                                color: '#94a3b8',
                                transition: 'all 0.2s',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                opacity: loading ? 0.7 : 1
                            }}
                            title="Atualizar pipeline"
                        >
                            <svg
                                width="18" height="18" viewBox="0 0 24 24" fill="none"
                                stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
                                style={{ animation: loading ? 'spin 0.8s linear infinite' : 'none' }}
                            >
                                <path d="M3 12a9 9 0 0 1 15.3-6.3L21 8" />
                                <path d="M21 3v5h-5" />
                                <path d="M21 12a9 9 0 0 1-15.3 6.3L3 16" />
                                <path d="M3 21v-5h5" />
                            </svg>
                        </button>
                        <button onClick={onClose} className="modal-close-btn" style={{ width: '40px', height: '40px', background: 'rgba(255,255,255,0.05)' }}>✕</button>
                    </div>
                </div>

                {/* Timeline Scrollable Area */}
                <div style={{ 
                    flex: 1, 
                    overflowY: 'auto', 
                    paddingRight: '1rem',
                    marginRight: '-1rem',
                    paddingBottom: '2rem'
                }} className="custom-scrollbar">
                    <div style={{ position: 'relative', paddingLeft: '3rem', display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
                        {/* Linha da Timeline */}
                        <div style={{ 
                            position: 'absolute', left: '14px', top: '10px', bottom: '10px', width: '2px', 
                            background: 'linear-gradient(to bottom, #6366f1 0%, rgba(99, 102, 241, 0.1) 100%)',
                            boxShadow: '0 0 15px rgba(99, 102, 241, 0.3)'
                        }} />

                        {/* Estado de Espera (Debounce) */}
                        {event.status === 'waiting' && event.scheduled_at && (
                            <div style={{ position: 'relative' }}>
                                <div style={{ 
                                    position: 'absolute', left: '-36px', top: '10px', width: '12px', height: '12px', 
                                    borderRadius: '50%', background: '#f59e0b', border: '4px solid #0f172a',
                                    boxShadow: '0 0 12px #f59e0b', zIndex: 1
                                }} />
                                <div style={{ 
                                    background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.1)', 
                                    borderRadius: '20px', padding: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <span style={{ fontSize: '1.2rem' }}>⏳</span>
                                        <div>
                                            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#fde68a' }}>Aguardando Debounce</h3>
                                            <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#b45309' }}>Aguardando para agrupar mensagens...</p>
                                        </div>
                                    </div>
                                    <div style={{ 
                                        background: 'rgba(245, 158, 11, 0.15)', padding: '8px 16px', borderRadius: '12px',
                                        color: '#f59e0b', fontWeight: 900, fontSize: '1.2rem'
                                    }}>
                                        <PipelineCountdown 
                                            isPending={true}
                                            onFinished={pollEvent}
                                            serverNow={event.server_now}
                                            step={{ 
                                                timestamp: event.created_at, 
                                                step: `${Math.max(1, Math.round((parseDate(event.scheduled_at) - parseDate(event.created_at)) / 1000) || 0)}s` 
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {steps.map((step) => {
                            const content = step.content || '';
                            const isLarge = content.length > 500;
                            const displayedContent = isLarge ? content.slice(0, 500) + '...' : content;

                            return (
                                <div key={step.id} style={{ position: 'relative' }}>
                                    {/* Ponto da Timeline */}
                                    <div style={{ 
                                        position: 'absolute', left: '-36px', top: '10px', width: '12px', height: '12px', 
                                        borderRadius: '50%', background: '#6366f1', border: '4px solid #0f172a',
                                        boxShadow: '0 0 12px #6366f1', zIndex: 1
                                    }} />

                                    {/* Card do Passo */}
                                    <div style={{ 
                                        background: 'rgba(30, 41, 59, 0.5)', border: '1px solid rgba(255,255,255,0.05)', 
                                        borderRadius: '20px', padding: '1.5rem'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                <span style={{ fontSize: '1.2rem' }}>{step.icon}</span>
                                                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#f1f5f9' }}>{step.title}</h3>
                                            </div>
                                            <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700 }}>{step.time}</span>
                                        </div>
                                        <div style={{ 
                                            background: 'rgba(15, 23, 42, 0.4)', borderRadius: '16px', padding: '1.25rem',
                                            color: '#cbd5e1', fontSize: '0.85rem', lineHeight: '1.6', fontFamily: 'monospace',
                                            whiteSpace: 'pre-wrap', position: 'relative', border: '1px solid rgba(255,255,255,0.02)',
                                            wordBreak: 'break-all', overflowWrap: 'break-word'
                                        }}>
                                             {step.title?.includes("Variáveis Extraídas") && step.metadata ? (
                                                 <div style={{ fontFamily: 'sans-serif', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                                     {/* Seção de Extraídas */}
                                                     <div>
                                                         <h4 style={{ margin: '0 0 0.75rem 0', color: '#10b981', fontSize: '0.9rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                             <span>✅</span> Extraídas & Salvas
                                                         </h4>
                                                         {step.metadata.saved && Object.keys(step.metadata.saved).length > 0 ? (
                                                             <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                                 {Object.entries(step.metadata.saved).map(([key, val]) => (
                                                                     <div key={key} style={{ 
                                                                         display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                                                                         background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.1)',
                                                                         padding: '10px 14px', borderRadius: '12px'
                                                                     }}>
                                                                         <code style={{ color: '#34d399', fontWeight: 700, fontSize: '0.8rem', fontFamily: 'monospace' }}>{key}</code>
                                                                         <span style={{ color: '#f8fafc', fontWeight: 600, fontSize: '0.85rem' }}>{String(val)}</span>
                                                                     </div>
                                                                 ))}
                                                             </div>
                                                         ) : (
                                                             <p style={{ margin: 0, color: '#64748b', fontSize: '0.8rem', fontStyle: 'italic' }}>Nenhuma variável foi extraída com sucesso até o momento.</p>
                                                         )}
                                                     </div>
                                                     
                                                     {/* Seção de Pendentes */}
                                                     <div>
                                                         <h4 style={{ margin: '0 0 0.75rem 0', color: '#6366f1', fontSize: '0.9rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                             <span>⏳</span> Aguardando Menção (Pendentes)
                                                         </h4>
                                                         {step.metadata.pending && step.metadata.pending.length > 0 ? (
                                                             <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                                                 {step.metadata.pending.map((key) => (
                                                                     <div key={key} style={{ 
                                                                         background: 'rgba(255, 255, 255, 0.03)', border: '1px dashed rgba(255, 255, 255, 0.1)',
                                                                         padding: '6px 12px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px'
                                                                     }}>
                                                                         <code style={{ color: '#94a3b8', fontSize: '0.75rem', fontFamily: 'monospace' }}>{key}</code>
                                                                     </div>
                                                                 ))}
                                                             </div>
                                                         ) : (
                                                             <p style={{ margin: 0, color: '#64748b', fontSize: '0.8rem', fontStyle: 'italic' }}>Todas as variáveis de IA foram extraídas!</p>
                                                         )}
                                                     </div>
                                                 </div>
                                             ) : (
                                                 displayedContent
                                             )}

                                            {isLarge && (
                                                <div style={{ 
                                                    marginTop: '1.25rem', display: 'flex', justifyContent: 'center',
                                                    borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1rem'
                                                }}>
                                                    <button 
                                                        onClick={() => setMaximizedStep(step)}
                                                        style={{ 
                                                            background: 'rgba(99, 102, 241, 0.15)', border: '1px solid rgba(99, 102, 241, 0.2)', 
                                                            color: '#818cf8', borderRadius: '10px', padding: '0.6rem 1.25rem',
                                                            fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer',
                                                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                                                            transition: 'all 0.2s'
                                                        }}
                                                    >
                                                        <span>🔍</span> Maximizar Informação
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                        
                                        {step.metadata && (
                                            <div style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                                                {step.metadata.model && (
                                                    <span style={{ fontSize: '0.7rem', background: 'rgba(99, 102, 241, 0.1)', color: '#818cf8', padding: '4px 10px', borderRadius: '6px', fontWeight: 800 }}>
                                                        🤖 {step.metadata.model}
                                                    </span>
                                                )}
                                                {step.metadata.usage && (
                                                    <>
                                                        <span style={{ fontSize: '0.7rem', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '4px 10px', borderRadius: '6px', fontWeight: 800 }} title="Total de tokens consumidos">
                                                            💎 {(step.metadata.usage.total_tokens || 0).toLocaleString()} tokens
                                                        </span>
                                                        {step.metadata.usage.cached_tokens ? (
                                                            <>
                                                                <span style={{ fontSize: '0.7rem', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '4px 10px', borderRadius: '6px', fontWeight: 800 }} title="Tokens de cache (Prompt Caching)">
                                                                    💾 {(step.metadata.usage.cached_tokens || 0).toLocaleString()} CACHED
                                                                </span>
                                                                <span style={{ fontSize: '0.7rem', background: 'rgba(99, 102, 241, 0.1)', color: '#818cf8', padding: '4px 10px', borderRadius: '6px', fontWeight: 800 }} title="Tokens de entrada efetivamente cobrados">
                                                                    📥 {((step.metadata.usage.prompt_tokens || 0) - (step.metadata.usage.cached_tokens || 0)).toLocaleString()} IN Cobrado
                                                                </span>
                                                            </>
                                                        ) : null}
                                                    </>
                                                )}
                                                {step.metadata.cost > 0 && (
                                                    <span style={{ fontSize: '0.7rem', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', padding: '4px 10px', borderRadius: '6px', fontWeight: 800 }}>
                                                        💰 R$ {(step.metadata.cost || 0).toFixed(2)}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}

                        {/* Indicador de Automação em Andamento (Premium) */}
                        {['processing', 'received', 'pending'].includes(event.status) && (
                            isTimeout ? (
                                <div style={{ position: 'relative' }}>
                                    {/* Ponto da Timeline Vermelho */}
                                    <div style={{ 
                                        position: 'absolute', left: '-36px', top: '10px', width: '12px', height: '12px', 
                                        borderRadius: '50%', background: '#ef4444', border: '4px solid #0f172a',
                                        boxShadow: '0 0 12px #ef4444', zIndex: 1
                                    }} />
                                    
                                    <div style={{ 
                                        background: 'rgba(239, 68, 68, 0.05)', border: '1px dashed rgba(239, 68, 68, 0.2)', 
                                        borderRadius: '20px', padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.5rem'
                                    }}>
                                        <div style={{ fontSize: '1.8rem', animation: 'pulse 1s infinite' }}>⚠️</div>
                                        <div>
                                            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#fca5a5' }}>Falha no Processamento (Timeout)</h3>
                                            <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#f87171', fontWeight: 600, lineHeight: 1.4 }}>
                                                A automação excedeu o tempo limite de 90 segundos sem resposta. Isso ocorre quando há lentidão extrema na API do LLM, falhas na conexão do calendário ou caso a fila de tarefas em background tenha sido interrompida.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div style={{ position: 'relative' }}>
                                    {/* Ponto da Timeline Animado */}
                                    <div style={{ 
                                        position: 'absolute', left: '-36px', top: '10px', width: '12px', height: '12px', 
                                        borderRadius: '50%', background: '#6366f1', border: '4px solid #0f172a',
                                        boxShadow: '0 0 12px #6366f1', zIndex: 1,
                                        animation: 'pulse 1.5s infinite'
                                    }} />
                                    
                                    <div style={{ 
                                        background: 'rgba(99, 102, 241, 0.05)', border: '1px dashed rgba(99, 102, 241, 0.2)', 
                                        borderRadius: '20px', padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem',
                                        animation: 'pulseCard 2s infinite'
                                    }}>
                                        {/* Spinner Animado em CSS */}
                                        <div className="pipeline-spinner" />
                                        <div>
                                            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#a5b4fc' }}>⚙️ Processando Automação...</h3>
                                            <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#6366f1', fontWeight: 600 }}>
                                                Executando fluxos subsequentes. Aguarde a conclusão da automação.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )
                        )}
                    </div>
                </div>

                {/* Modal Maximizado (Overlay Secundário) */}
                {maximizedStep && (
                    maximizedStep.title.includes('Decisão da IA') || maximizedStep.title.includes('Pre-Router') ? (
                        <PreRouterViewerModal 
                            data={maximizedStep.content} 
                            onClose={() => setMaximizedStep(null)} 
                        />
                    ) : maximizedStep.title.includes('Raio-X') ? (
                        <RaioXViewerModal
                            data={maximizedStep.content}
                            onClose={() => setMaximizedStep(null)}
                        />
                    ) : (maximizedStep.title.includes('RAG') || maximizedStep.title.includes('Base de Conhecimento')) ? (
                        <RagViewerModal
                            data={maximizedStep.content}
                            onClose={() => setMaximizedStep(null)}
                        />
                    ) : (
                        <div 
                            className="premium-modal-overlay" 
                            style={{ zIndex: 1200, background: 'rgba(0,0,0,0.85)' }}
                        >
                            <div 
                                className="premium-modal-content"
                                style={{ maxWidth: '900px', width: '95%', height: '80vh', borderRadius: '24px', padding: '2.5rem', display: 'flex', flexDirection: 'column' }}
                                onClick={e => e.stopPropagation()}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <span style={{ fontSize: '1.5rem' }}>{maximizedStep.icon}</span>
                                        <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 900, color: '#fff' }}>{maximizedStep.title}</h2>
                                    </div>
                                    <button 
                                        onClick={() => setMaximizedStep(null)}
                                        className="modal-close-btn"
                                        style={{ width: '36px', height: '36px' }}
                                    >✕</button>
                                </div>
                                <div 
                                    style={{ 
                                        flex: 1, background: 'rgba(15, 23, 42, 0.8)', borderRadius: '16px', padding: '2rem',
                                        color: '#cbd5e1', fontSize: '1rem', lineHeight: '1.6', fontFamily: 'monospace',
                                        whiteSpace: 'pre-wrap', overflowY: 'auto'
                                    }} 
                                    className="custom-scrollbar"
                                >
                                    {maximizedStep.content}
                                </div>
                            </div>
                        </div>
                    )
                )}
            </div>
        </div>
    );
};

export default AutomationPipelineModal;
