import React, { useEffect, useState } from 'react';
import { formatDate, showToast } from '../../utils/helpers';
import { api } from '../../../../api/client';
import { API_URL } from '../../../../config';
import AutomationPipelineModal from '../AutomationPipelineModal';

// Import subcomponents
import LeadHistoryTableRow from './components/LeadHistoryTableRow';
import ConfirmDeleteModal from './components/ConfirmDeleteModal';
import ConfirmRetryModal from './components/ConfirmRetryModal';
import MaximizedTextModal from './components/MaximizedTextModal';

const LeadHistoryModal = ({
    lead,
    webhook,
    onClose
}) => {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(20);
    const [selectedPipelineEvent, setSelectedPipelineEvent] = useState(null);
    const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, eventId: null });
    const [confirmRetry, setConfirmRetry] = useState({ isOpen: false, eventId: null });
    const [maximizedText, setMaximizedText] = useState(null);
    const [retryingEvents, setRetryingEvents] = useState(new Set());

    // Bloquear scroll do body ao montar modal
    useEffect(() => {
        const originalStyle = window.getComputedStyle(document.body).overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = originalStyle; };
    }, []);

    const fetchLeadHistory = async () => {
        if (!webhook || !webhook.id) return;
        setLoading(true);
        try {
            const cleanPhone = (lead.telefone || '').replace(/\D/g, '');
            const res = await api.get(`/webhooks/${webhook.id}/events?search=${cleanPhone}&page=${page}&limit=${limit}&event_type=all`);
            const data = await res.json();
            setEvents(data.items || data.events || []);
            setTotal(data.total || 0);
        } catch (e) {
            console.error('Erro ao buscar histórico do lead:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLeadHistory();
    }, [page, limit, webhook, lead.telefone]);

    const handleDeleteEvent = (eventId) => {
        setConfirmDelete({ isOpen: true, eventId });
    };

    const confirmDeleteEvent = async () => {
        try {
            const res = await api.post(`/webhooks/${webhook.id}/events/bulk-delete`, { event_ids: [confirmDelete.eventId] });
            if (res.ok) {
                showToast('Mensagem excluída com sucesso!', 'success');
                fetchLeadHistory();
                setConfirmDelete({ isOpen: false, eventId: null });
            } else {
                showToast('Erro ao excluir mensagem.', 'error');
            }
        } catch (e) {
            console.error('Erro ao excluir evento:', e);
            showToast('Erro ao excluir mensagem.', 'error');
        }
    };

    const handleRetryEvent = (eventId) => {
        setConfirmRetry({ isOpen: true, eventId });
    };

    const confirmRetryEvent = async () => {
        const eventId = confirmRetry.eventId;
        if (!eventId || retryingEvents.has(eventId)) return;

        setRetryingEvents(prev => {
            const next = new Set(prev);
            next.add(eventId);
            return next;
        });

        setConfirmRetry({ isOpen: false, eventId: null });

        try {
            const res = await api.post(`/webhooks/${webhook.id}/events/${eventId}/retry`);
            if (res.ok) {
                showToast('Automação reiniciada com sucesso! Aguarde a resposta do agente.', 'success');
                fetchLeadHistory();
            } else {
                const errorData = await res.json().catch(() => ({}));
                const errorMsg = errorData.detail || 'Erro ao reiniciar automação.';
                showToast(errorMsg, 'error');
            }
        } catch (e) {
            console.error('Erro ao reiniciar automação:', e);
            showToast('Erro ao reiniciar automação.', 'error');
        } finally {
            setRetryingEvents(prev => {
                const next = new Set(prev);
                next.delete(eventId);
                return next;
            });
        }
    };

    // Polling automático silencioso para atualizar a lista enquanto houver mensagens em processamento
    useEffect(() => {
        const hasProcessingEvent = events.some(evt => evt.status === 'processing' || (!evt.agent_response && evt.dono !== 'agente' && evt.dono !== 'bot'));
        if (!hasProcessingEvent) return;

        const interval = setInterval(async () => {
            if (!webhook || !webhook.id) return;
            try {
                const cleanPhone = (lead.telefone || '').replace('+', '');
                const res = await api.get(`/webhooks/${webhook.id}/events?search=${cleanPhone}&page=${page}&limit=${limit}&event_type=all`);
                const data = await res.json();
                setEvents(data.items || data.events || []);
                setTotal(data.total || 0);
            } catch (e) {
                console.error('Erro no polling silencioso:', e);
            }
        }, 3000);

        return () => clearInterval(interval);
    }, [events, page, limit, webhook, lead.telefone]);

    // Conexão WebSocket para atualização em tempo real com auto-reconexão
    useEffect(() => {
        if (!webhook || !webhook.id) return;
        
        let ws;
        let reconnectTimeout;
        const cleanPhone = (lead.telefone || '').replace('+', '');
        
        const connectWS = () => {
            const wsUrl = API_URL.replace('http', 'ws') + '/ws/events';
            try {
                ws = new WebSocket(wsUrl);
                
                ws.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data);
                        if (data.type === 'new_event' && data.webhook_id === webhook.id) {
                            const eventPhone = (data.event.telefone || '').replace('+', '');
                            if (eventPhone === cleanPhone) {
                                setEvents(prev => {
                                    if (prev.some(e => e.id === data.event.id)) return prev;
                                    return [data.event, ...prev];
                                });
                                setTotal(prev => prev + 1);
                            }
                        } else if (data.type === 'status_update' && data.webhook_id === webhook.id) {
                            setEvents(prev => prev.map(evt => {
                                if (evt.id === data.event_id) {
                                    return {
                                        ...evt,
                                        status: data.status,
                                        processing_steps: JSON.stringify(data.steps)
                                    };
                                }
                                return evt;
                            }));

                            if (['completed', 'error', 'ignored'].includes(data.status)) {
                                api.get(`/webhooks/${webhook.id}/events/${data.event_id}`)
                                    .then(res => res.json())
                                    .then(updatedEvent => {
                                        setEvents(prev => prev.map(evt => {
                                            if (evt.id === data.event_id) {
                                                return {
                                                    ...evt,
                                                    ...updatedEvent
                                                };
                                            }
                                            return evt;
                                        }));
                                    })
                                    .catch(err => console.error("Erro ao buscar detalhes do evento pós-update:", err));
                            }
                        }
                    } catch (e) {
                        console.error('Erro ao processar mensagem WS:', e);
                    }
                };

                ws.onclose = () => {
                    // Tentar reconectar em 5 segundos se o modal ainda estiver aberto
                    reconnectTimeout = setTimeout(connectWS, 5000);
                };

                ws.onerror = (err) => {
                    console.error('Erro WS:', err);
                    ws.close();
                };
            } catch (e) {
                console.error('Falha ao conectar WS:', e);
                reconnectTimeout = setTimeout(connectWS, 5000);
            }
        };

        connectWS();

        return () => {
            if (ws) {
                ws.onclose = null; // desativa callback para não disparar reconexão ao fechar
                ws.close();
            }
            if (reconnectTimeout) clearTimeout(reconnectTimeout);
        };
    }, [webhook.id, lead.telefone]);

    if (!webhook) return null;

    const getMessageTypeLabel = (type) => {
        switch (type) {
            case 'image': return '🖼️ Imagem';
            case 'audio': return '🎙️ Áudio';
            case 'video': return '🎥 Vídeo';
            case 'document': return '📄 Doc';
            default: return '📝 Texto';
        }
    };

    // Consolida e filtra eventos para que as respostas do agente apareçam APENAS na linha do disparo do usuário
    const displayEvents = React.useMemo(() => {
        if (!events || events.length === 0) return [];

        const isAgentEvent = (e) => e.dono === 'agente' || e.dono === 'bot' || e.dono === 'Agente' || e.dono === 'Agente de IA' || e.dono === 'agent';

        const hiddenIds = new Set();
        const responseAdditions = new Map();

        for (let i = 0; i < events.length; i++) {
            const current = events[i];
            const isAgentCurrent = isAgentEvent(current);

            if (!isAgentCurrent && (current.mensagem || current.conteudo)) {
                let additions = '';

                for (let j = i - 1; j >= 0; j--) {
                    const prev = events[j];
                    const isPrevUser = !isAgentEvent(prev) && (prev.dono === 'usuario' || prev.dono === 'cliente' || (!prev.dono && prev.event_type !== 'memory'));
                    
                    if (isPrevUser) break;

                    if (isAgentEvent(prev)) {
                        const prevText = (prev.mensagem || prev.agent_response || prev.conteudo || '').trim();
                        if (prevText) {
                            const curResp = (current.agent_response || '').trim();
                            if (!curResp.includes(prevText) && !additions.includes(prevText)) {
                                additions += (additions ? '\n\n' : '') + prevText;
                            }
                            hiddenIds.add(prev.id);
                        }
                    }
                }

                if (additions) {
                    responseAdditions.set(current.id, additions);
                }
            }
        }

        return events
            .filter(evt => {
                if (hiddenIds.has(evt.id)) return false;
                const isAgent = isAgentEvent(evt);
                if (isAgent) {
                    const text = (evt.mensagem || evt.agent_response || '').trim();
                    const isPartOfSomeResponse = events.some(other => 
                        other.id !== evt.id && 
                        other.agent_response && 
                        other.agent_response.includes(text)
                    );
                    if (isPartOfSomeResponse) return false;
                }
                return true;
            })
            .map(evt => {
                const add = responseAdditions.get(evt.id);
                if (add) {
                    const base = (evt.agent_response || '').trim();
                    return {
                        ...evt,
                        agent_response: base ? `${base}\n\n${add}` : add
                    };
                }
                return evt;
            });
    }, [events]);

    return (
        <div className="premium-modal-overlay" style={{ zIndex: 1050 }}>
            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes spin-reload {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                .loading-spin {
                    animation: spin-reload 0.8s linear infinite;
                    display: inline-block;
                }
            ` }} />
            <div
                onClick={e => e.stopPropagation()}
                className="premium-modal-content"
                style={{ maxWidth: '1050px', height: '90vh', maxHeight: '900px', display: 'flex', flexDirection: 'column' }}
            >
                {/* Cabeçalho Premium */}
                <div className="modal-header-premium" style={{ padding: '1rem 2rem' }}>
                    <div className="header-info" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{
                            width: '36px', height: '36px', borderRadius: '10px',
                            background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.2)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem'
                        }}>📊</div>
                        <div>
                            <h2 style={{ margin: 0, fontWeight: 900, color: '#f8fafc', fontSize: '1.1rem' }}>Histórico</h2>
                            <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
                                <span style={{ color: '#94a3b8' }}>{lead.contato_nome || lead.telefone}</span> · {total} disparos
                            </p>
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <button 
                            onClick={fetchLeadHistory} 
                            className={`modal-action-btn-reload ${loading ? 'loading-spin' : ''}`}
                            title="Atualizar Histórico"
                            disabled={loading}
                            style={{ 
                                width: '32px', height: '32px', borderRadius: '8px',
                                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                                color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '0.9rem', cursor: loading ? 'not-allowed' : 'pointer', transition: 'all 0.3s ease'
                            }}
                            onMouseOver={e => {
                                if (!loading) {
                                    e.currentTarget.style.background = 'rgba(99, 102, 241, 0.15)';
                                    e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.3)';
                                    e.currentTarget.style.color = '#818cf8';
                                }
                            }}
                            onMouseOut={e => {
                                if (!loading) {
                                    e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                                    e.currentTarget.style.color = '#94a3b8';
                                }
                            }}
                        >🔄</button>
                        <button onClick={onClose} className="modal-close-btn" style={{ width: '32px', height: '32px' }}>✕</button>
                    </div>
                </div>

                {/* Tabela de Disparos */}
                <div style={{ flex: 1, overflowY: 'auto', background: 'rgba(15, 23, 42, 0.2)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', tableLayout: 'fixed' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(15, 23, 42, 0.4)' }}>
                                <th style={{ width: '80px', padding: '1rem', fontSize: '0.65rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>ID INTERNO</th>
                                <th style={{ width: '28%', padding: '1rem', fontSize: '0.65rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>MENSAGEM USUÁRIO</th>
                                <th style={{ width: '130px', padding: '1rem', fontSize: '0.65rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', textAlign: 'center' }}>ORIGEM / TIPO</th>
                                <th style={{ width: '32%', padding: '1rem', fontSize: '0.65rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>RESPOSTA IA</th>
                                <th style={{ width: '150px', padding: '1rem', fontSize: '0.65rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>DATA/HORA</th>
                                <th style={{ width: '120px', padding: '1rem', fontSize: '0.65rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', textAlign: 'center' }}>AÇÕES</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="6" style={{ padding: '5rem', textAlign: 'center', color: '#64748b' }}>Buscando disparos...</td>
                                </tr>
                            ) : displayEvents.length === 0 ? (
                                <tr>
                                    <td colSpan="6" style={{ padding: '5rem', textAlign: 'center', color: '#64748b' }}>Nenhum disparo encontrado.</td>
                                </tr>
                            ) : displayEvents.map(event => (
                                <LeadHistoryTableRow
                                    key={event.id}
                                    event={event}
                                    getMessageTypeLabel={getMessageTypeLabel}
                                    setMaximizedText={setMaximizedText}
                                    setSelectedPipelineEvent={setSelectedPipelineEvent}
                                    handleDeleteEvent={handleDeleteEvent}
                                    handleRetryEvent={handleRetryEvent}
                                    isRetrying={retryingEvents.has(event.id)}
                                />
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Rodapé - Paginação */}
                <div style={{ padding: '1.25rem 2.5rem', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(15, 23, 42, 0.6)' }}>
                    <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                        Exibir: <select value={limit} onChange={e => { setLimit(Number(e.target.value)); setPage(1); }} style={{ background: '#1e293b', border: 'none', color: '#fff', padding: '4px 8px', borderRadius: '6px' }}><option value="10">10</option><option value="20">20</option><option value="50">50</option></select>
                        <span style={{ marginLeft: '1rem' }}>Mostrando {events.length} de {total} eventos</span>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{ fontSize: '0.85rem', color: '#64748b', marginRight: '0.5rem' }}>
                                Página <strong>{page}</strong> de <strong>{Math.max(1, Math.ceil(total / limit))}</strong>
                            </div>
                            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="btn-page" style={{ background: 'rgba(30, 41, 59, 0.5)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px', padding: '0.5rem 1rem', cursor: page <= 1 ? 'not-allowed' : 'pointer' }}>Anterior</button>
                            <button disabled={page >= Math.ceil(total / limit)} onClick={() => setPage(p => p + 1)} className="btn-page" style={{ background: 'rgba(30, 41, 59, 0.5)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px', padding: '0.5rem 1rem', cursor: page >= Math.ceil(total / limit) ? 'not-allowed' : 'pointer' }}>Próxima</button>
                        </div>
                    </div>
                </div>

                {/* Submodais Dinâmicos */}
                {selectedPipelineEvent && (
                    <AutomationPipelineModal
                        event={selectedPipelineEvent}
                        webhookId={webhook?.id}
                        onClose={() => setSelectedPipelineEvent(null)}
                    />
                )}

                <ConfirmDeleteModal
                    isOpen={confirmDelete.isOpen}
                    eventId={confirmDelete.eventId}
                    onCancel={() => setConfirmDelete({ isOpen: false, eventId: null })}
                    onConfirm={confirmDeleteEvent}
                />

                <ConfirmRetryModal
                    isOpen={confirmRetry.isOpen}
                    eventId={confirmRetry.eventId}
                    onCancel={() => setConfirmRetry({ isOpen: false, eventId: null })}
                    onConfirm={confirmRetryEvent}
                />

                <MaximizedTextModal
                    text={maximizedText}
                    onClose={() => setMaximizedText(null)}
                />
            </div>
        </div>
    );
};

export default LeadHistoryModal;
