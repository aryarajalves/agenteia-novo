import React, { useEffect } from 'react';
import HistoryFilters from './Filters';
import { formatDate } from '../../utils/helpers';
import AutomationPipelineModal from '../AutomationPipelineModal';
import ApproveCacheModal from '../../../ChatPlayground/components/ApproveCacheModal';
import { useSaveToCache } from '../LeadHistoryModal/hooks/useSaveToCache';
import EventCostBadge from '../LeadHistoryModal/components/EventCostBadge';

const HistoryModal = ({
    selectedWebhook,
    selectedLead,
    onClose,
    historyTab,
    setHistoryTab,
    events,
    eventsLoading,
    historyFilters,
    setHistoryFilters,
    onFetchEvents,
    onClearFilters,
    historyTotal,
    historyPage,
    setHistoryPage,
    historyLimit,
    setHistoryLimit,
    selectedEvents,
    setSelectedEvents,
    handleBulkDelete,
    onDeleteEvent
}) => {
    const [selectedPipelineEvent, setSelectedPipelineEvent] = React.useState(null);

    const {
        approveCacheModal,
        setApproveCacheModal,
        isSavingCache,
        handleOpenSaveCache,
        handleConfirmSaveCache,
        handleLinkExistingCache
    } = useSaveToCache(selectedWebhook);

    // Bloquear scroll ao montar o modal
    useEffect(() => {
        const originalStyle = window.getComputedStyle(document.body).overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = originalStyle; };
    }, []);

    const safeEvents = Array.isArray(events) ? events : [];

    return (
        <div className="premium-modal-overlay" style={{ zIndex: 1010 }}>
            <div
                onClick={e => e.stopPropagation()}
                className="premium-modal-content"
                style={{ maxWidth: '1100px', height: '90vh', maxHeight: '950px' }}
            >
                {/* Cabeçalho — Atualizado para bater com a imagem 2 */}
                <div className="modal-header-premium" style={{ padding: '1.5rem 2rem' }}>
                    <div className="header-info" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                        <div style={{ 
                            width: '48px', height: '48px', borderRadius: '14px', 
                            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(99, 102, 241, 0.05))', 
                            border: '1px solid rgba(99, 102, 241, 0.3)', 
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem',
                            boxShadow: '0 8px 16px rgba(0,0,0,0.2)'
                        }}>📜</div>
                        <div>
                            <div style={{ fontWeight: 900, color: '#f8fafc', fontSize: '1.3rem', letterSpacing: '-0.02em' }}>Histórico</div>
                            <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '3px', fontWeight: 600 }}>
                                {selectedLead ? (
                                    <><span style={{ color: '#94a3b8' }}>{selectedLead.contato_nome || selectedLead.telefone}</span> · {historyTotal} mensagens no histórico</>
                                ) : (
                                    <>{selectedWebhook.name} · {historyTotal} mensagens no histórico</>
                                )}
                            </div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        {selectedEvents.size > 0 && (
                            <button onClick={handleBulkDelete} style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '10px', padding: '0.6rem 1rem', fontWeight: 700, cursor: 'pointer' }}>Excluir ({selectedEvents.size})</button>
                        )}
                        <button onClick={onClose} className="modal-close-btn" style={{ width: '36px', height: '36px' }}>✕</button>
                    </div>
                </div>

                {/* Tabs e Filtros */}
                <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(15, 23, 42, 0.2)' }}>
                    {[
                        { id: 'pipeline', label: '🔁 Follow-Ups' },
                        { id: 'memoria', label: '🧠 Logs de Memória' },
                    ].map(tab => (
                        <button key={tab.id}
                            onClick={() => setHistoryTab(tab.id)}
                            style={{
                                padding: '1.1rem 2rem', background: 'none', border: 'none',
                                color: historyTab === tab.id ? '#fff' : '#64748b',
                                fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer',
                                position: 'relative', transition: 'all 0.2s',
                                letterSpacing: '0.02em'
                            }}>
                            {tab.label}
                            {historyTab === tab.id && (
                                <div style={{ position: 'absolute', bottom: 0, left: '20%', right: '20%', height: '3px', background: '#6366f1', borderRadius: '3px 3px 0 0', boxShadow: '0 -4px 12px rgba(99, 102, 241, 0.6)' }} />
                            )}
                        </button>
                    ))}
                </div>

                {/* Filtros simplificados para Follow-Ups/Memória se necessário no futuro */}

                {/* Tabela de Eventos — Refatorada para bater com imagem 2 */}
                <div style={{ flex: 1, overflowY: 'auto', position: 'relative' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead style={{ position: 'sticky', top: 0, background: '#0f172a', zIndex: 1, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                            <tr>
                                <th style={{ padding: '1.25rem 1.5rem', fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em' }}>ID INTERNO</th>
                                <th style={{ padding: '1.25rem 1.5rem', fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em' }}>NÚMERO</th>
                                <th style={{ padding: '1.25rem 1.5rem', fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em' }}>MENSAGEM</th>
                                <th style={{ padding: '1.25rem 1.5rem', fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'center' }}>STATUS / TIPO</th>
                                <th style={{ padding: '1.25rem 1.5rem', fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em' }}>DATA/HORA</th>
                                <th style={{ padding: '1.25rem 1.5rem', fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'right' }}>AÇÕES</th>
                            </tr>
                        </thead>
                        <tbody>
                            {eventsLoading ? (
                                <tr><td colSpan="6" style={{ padding: '6rem', textAlign: 'center', color: '#64748b' }}>Buscando mensagens...</td></tr>
                            ) : safeEvents.length === 0 ? (
                                <tr><td colSpan="6" style={{ padding: '6rem', textAlign: 'center', color: '#64748b' }}>Nenhuma mensagem encontrada.</td></tr>
                            ) : safeEvents.map(event => {
                                const isAgent = event.dono === 'agente' || event.dono === 'bot';
                                const message = event.mensagem || event.conteudo || event.agent_response || '—';
                                const isFollowUp = Boolean(
                                    event.event_type === 'followup' || 
                                    event.is_followup || 
                                    (typeof event.mensagem === 'string' && event.mensagem.toLowerCase().includes('follow-up')) ||
                                    (typeof event.message_type === 'string' && event.message_type.toLowerCase() === 'followup')
                                );
                                
                                const getMessageTypeLabel = (type) => {
                                    switch (type) {
                                        case 'image': return '🖼️ Imagem';
                                        case 'audio': return '🎙️ Áudio';
                                        case 'video': return '🎥 Vídeo';
                                        case 'document': return '📄 Doc';
                                        default: return '📝 Texto';
                                    }
                                };
 
                                return (
                                    <tr key={event.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background 0.2s' }} className="history-row-hover">
                                        <td style={{ padding: '1.5rem', fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>{event.id}</td>
                                        <td style={{ padding: '1.5rem', fontSize: '0.85rem', color: '#cbd5e1', fontWeight: 700, fontFamily: 'monospace' }}>{event.telefone || event.phone}</td>
                                        <td style={{ padding: '1.5rem', fontSize: '0.95rem', color: '#e2e8f0', lineHeight: '1.7', maxWidth: '350px', fontWeight: 500 }}>
                                            <div style={{ maxHeight: '80px', overflowY: 'auto' }} className="custom-scrollbar">{message}</div>
                                        </td>
                                        <td style={{ padding: '1.5rem', textAlign: 'center' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                                                <span style={{ 
                                                    fontSize: '0.65rem', fontWeight: 900, padding: '4px 10px', borderRadius: '8px',
                                                    background: event.status === 'grouped' ? 'rgba(148, 163, 184, 0.12)' : (isAgent ? 'rgba(99, 102, 241, 0.12)' : 'rgba(16, 185, 129, 0.12)'),
                                                    color: event.status === 'grouped' ? '#94a3b8' : (isAgent ? '#818cf8' : '#10b981'),
                                                    border: `1px solid ${event.status === 'grouped' ? 'rgba(148, 163, 184, 0.2)' : (isAgent ? 'rgba(99, 102, 241, 0.2)' : 'rgba(16, 185, 129, 0.2)')}`,
                                                    textTransform: 'uppercase', letterSpacing: '0.05em'
                                                }}>
                                                    {event.status === 'grouped' ? 'AGRUPADO' : (isAgent ? 'AGENTE' : 'USUÁRIO')}
                                                </span>
                                                <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700 }}>
                                                    {getMessageTypeLabel(event.message_type)}
                                                </span>
                                                <EventCostBadge event={event} compact={true} style={{ marginTop: '2px' }} />
                                            </div>
                                        </td>
                                        <td style={{ padding: '1.5rem', fontSize: '0.85rem', color: '#64748b', fontWeight: 500 }}>{formatDate(event.created_at)}</td>
                                        <td style={{ padding: '1.5rem', textAlign: 'right' }}>
                                            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                                                {!isAgent && (
                                                    <button 
                                                        onClick={() => setSelectedPipelineEvent(event)}
                                                        style={{ 
                                                            background: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.15)', 
                                                            color: '#818cf8', borderRadius: '10px', width: '36px', height: '36px', 
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            cursor: 'pointer', transition: 'all 0.2s', fontSize: '1rem' 
                                                        }}
                                                        title="Ver Pipeline"
                                                    >⚡</button>
                                                )}
                                                {!isFollowUp && (event.agent_response || message) && (
                                                    <button 
                                                        onClick={() => handleOpenSaveCache(event)}
                                                        data-testid={`save-webhook-cache-btn-${event.id}`}
                                                        style={{ 
                                                            background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)', 
                                                            color: '#34d399', borderRadius: '10px', width: '36px', height: '36px', 
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            cursor: 'pointer', transition: 'all 0.2s', fontSize: '1rem' 
                                                        }}
                                                        title="Aprovar e Salvar no Cache Semântico (Custo Zero)"
                                                    >💾</button>
                                                )}
                                                <button 
                                                    onClick={() => onDeleteEvent ? onDeleteEvent(event) : null}
                                                    style={{ 
                                                        background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.15)', 
                                                        color: '#ef4444', borderRadius: '10px', width: '36px', height: '36px', 
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        cursor: 'pointer', transition: 'all 0.2s', fontSize: '1rem' 
                                                    }}
                                                    className="btn-trash-premium"
                                                    title="Excluir Mensagem"
                                                >🗑️</button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Rodapé: Paginação */}
                <div style={{ padding: '1.25rem 2rem', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(15, 23, 42, 0.6)' }}>
                    <div style={{ fontSize: '0.9rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <span>Exibir:</span>
                        <select 
                            value={historyLimit} 
                            onChange={e => { setHistoryLimit(Number(e.target.value)); setHistoryPage(1); }}
                            style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px', padding: '0.5rem 1rem', cursor: 'pointer' }}
                        >
                            <option value="20">20 itens</option>
                            <option value="50">50 itens</option>
                            <option value="100">100 itens</option>
                        </select>
                        <span>Página <strong>{historyPage}</strong> de <strong>{Math.max(1, Math.ceil(historyTotal / historyLimit))}</strong></span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <button 
                            disabled={historyPage <= 1 || eventsLoading}
                            onClick={() => setHistoryPage(prev => Math.max(1, prev - 1))}
                            style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', color: historyPage <= 1 ? '#475569' : '#fff', borderRadius: '10px', padding: '0.65rem 1.5rem', cursor: historyPage <= 1 ? 'not-allowed' : 'pointer', fontWeight: 600 }}
                        >← Anterior</button>
                        <button
                            disabled={historyPage >= Math.ceil(historyTotal / historyLimit) || eventsLoading}
                            onClick={() => setHistoryPage(prev => prev + 1)}
                            style={{
                                background: historyPage >= Math.ceil(historyTotal / historyLimit) ? '#1e293b' : 'rgba(99, 102, 241, 0.1)',
                                border: historyPage >= Math.ceil(historyTotal / historyLimit) ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(99, 102, 241, 0.2)',
                                color: historyPage >= Math.ceil(historyTotal / historyLimit) ? '#475569' : '#fff',
                                borderRadius: '10px', padding: '0.65rem 1.5rem',
                                cursor: historyPage >= Math.ceil(historyTotal / historyLimit) ? 'not-allowed' : 'pointer',
                                fontWeight: 700
                            }}
                        >Próxima →</button>
                    </div>
                </div>
                {approveCacheModal && (
                    <ApproveCacheModal
                        modal={approveCacheModal}
                        agentId={approveCacheModal.agentId}
                        onConfirm={handleConfirmSaveCache}
                        onLinkExisting={handleLinkExistingCache}
                        onCancel={() => setApproveCacheModal(null)}
                        isSaving={isSavingCache}
                    />
                )}
                {selectedPipelineEvent && (
                    <AutomationPipelineModal
                        event={selectedPipelineEvent}
                        events={events}
                        webhookId={selectedWebhook?.id}
                        onClose={() => setSelectedPipelineEvent(null)}
                        onNavigateEvent={setSelectedPipelineEvent}
                    />
                )}
            </div>
            <style>{`
                .history-row-hover:hover { background: rgba(255,255,255,0.02) !important; }
            `}</style>
        </div>
    );
};

export default HistoryModal;
