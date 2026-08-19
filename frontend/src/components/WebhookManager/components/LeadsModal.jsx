import React, { useEffect, useState } from 'react';
import { api } from '../../../api/client';
import AutomationPipelineModal from './AutomationPipelineModal';
import FollowupPipelineModal from './FollowupPipelineModal';
import LeadFilterBar from './LeadFilterBar';
import LeadCard from './LeadCard';
import LeadSelectionBar from './LeadSelectionBar';

const LeadsModal = ({
    leadsModal,
    onClose,
    onSearch,
    onFilterChange,
    onPageChange,
    selectedLeads,
    toggleSelectLead,
    toggleSelectAllLeads,
    onSelectAllTotal,
    onClearSelection,
    isSelectingAllTotal = false,
    onBulkDelete,
    onDeleteLead,
    onSyncAll,
    isSyncing,
    onViewHistory
}) => {
    const { leads = [], total = 0, loading = false, page = 1, pageSize = 20, search = '', podeEnviar = 'all', dateStart = '', dateEnd = '', janelaAberta = 'all', semMensagens = 'all' } = leadsModal;
    const safeLeads = Array.isArray(leads) ? leads : [];

    // Estado local para controlar qual card está expandido (apenas 1 por vez - Accordion)
    const [expandedLeadId, setExpandedLeadId] = useState(null);
    const [, setHistoryEvents] = useState([]);
    const [, setHistoryLoading] = useState(false);
    const [pipelineEvent, setPipelineEvent] = useState(null);
    const [followupLead, setFollowupLead] = useState(null);
    const [currentTime, setCurrentTime] = useState(new Date());

    // Timer para atualizar contagens regressivas
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const getRemainingTime = (lastInteraction) => {
        if (!lastInteraction) return 'Expirado';
        const dateStr = lastInteraction.includes('T') && !lastInteraction.endsWith('Z') && !lastInteraction.includes('+')
            ? `${lastInteraction}Z`
            : lastInteraction;
        
        const lastDate = new Date(dateStr);
        const expiryDate = new Date(lastDate.getTime() + 24 * 60 * 60 * 1000);
        const diff = expiryDate - currentTime;
        
        if (diff <= 0) return 'Expirado';
        
        const h = Math.floor(diff / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((diff % (1000 * 60)) / 1000);
        return `${h}h ${m}m ${s}s`;
    };

    // Efeito para buscar histórico quando expandir
    useEffect(() => {
        const fetchHistory = async () => {
            if (!expandedLeadId) return;
            setHistoryLoading(true);
            try {
                const lead = safeLeads.find(l => l.id === expandedLeadId);
                if (!lead) return;
                const cleanPhone = (lead.telefone || '').replace('+', '');
                const res = await api.get(`/webhooks/${leadsModal.webhook.id}/events?search=${cleanPhone}&dono=usuario&limit=5`);
                const data = await res.json();
                setHistoryEvents(data.items || data.events || []);
            } catch (e) {
                console.error('Erro ao buscar histórico expandido:', e);
            } finally {
                setHistoryLoading(false);
            }
        };
        fetchHistory();
    }, [expandedLeadId, leadsModal.webhook.id]);

    // Bloquear scroll ao montar o modal
    useEffect(() => {
        const originalStyle = window.getComputedStyle(document.body).overflow;
        document.body.style.overflow = 'hidden';
        return () => { 
            document.body.style.overflow = originalStyle;
            if (onClearSelection) onClearSelection();
        };
    }, []);

    const toggleExpandLead = (id) => {
        setExpandedLeadId(prev => prev === id ? null : id);
    };

    return (
        <div className="premium-modal-overlay">
            <div
                className="premium-modal-content"
                style={{ maxWidth: '1100px', height: '90vh', maxHeight: '950px', display: 'flex', flexDirection: 'column' }}
                onClick={e => e.stopPropagation()}
            >
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
                            <p style={{ margin: '0', color: '#64748b', fontSize: '0.75rem' }}>
                                {total} contatos identificados
                            </p>
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
                        <button onClick={onClose} className="modal-close-btn" style={{ width: '32px', height: '32px', fontSize: '0.9rem' }}>✕</button>
                    </div>
                </div>

                {/* Filtros - Componente Modular de Alto Contraste */}
                <LeadFilterBar
                    search={search}
                    onSearch={onSearch}
                    podeEnviar={podeEnviar}
                    janelaAberta={janelaAberta}
                    semMensagens={semMensagens}
                    dateStart={dateStart}
                    dateEnd={dateEnd}
                    onFilterChange={onFilterChange}
                />

                {/* Barra de Seleção em Massa (Página e Total) */}
                <LeadSelectionBar
                    safeLeads={safeLeads}
                    total={total}
                    selectedLeads={selectedLeads}
                    toggleSelectAllLeads={toggleSelectAllLeads}
                    onSelectAllTotal={onSelectAllTotal}
                    onClearSelection={onClearSelection}
                    isSelectingAllTotal={isSelectingAllTotal}
                    onBulkDelete={onBulkDelete}
                />

                {/* Lista de Cards - Área de Scroll */}
                <div 
                    className="custom-scrollbar"
                    style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', background: 'rgba(0,0,0,0.1)' }}
                >
                    {loading ? (
                        <div style={{ padding: '6rem 0', textAlign: 'center', color: '#64748b' }}>Carregando...</div>
                    ) : safeLeads.length === 0 ? (
                        <div style={{ padding: '6rem 0', textAlign: 'center', color: '#64748b' }}>Nenhum contato encontrado.</div>
                    ) : safeLeads.map(l => (
                        <LeadCard
                            key={l.id}
                            lead={l}
                            isExpanded={expandedLeadId === l.id}
                            isSelected={selectedLeads?.has(l.id)}
                            onToggleExpand={toggleExpandLead}
                            onToggleSelect={toggleSelectLead}
                            onViewHistory={onViewHistory}
                            onViewFollowupPipeline={(lead) => setFollowupLead(lead)}
                            onDeleteLead={onDeleteLead}
                            getRemainingTime={getRemainingTime}
                        />
                    ))}
                </div>

                {/* Rodapé: Paginação */}
                <div style={{ padding: '0.75rem 1.5rem', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(15, 23, 42, 0.6)' }}>
                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                        Exibir: <select
                            value={pageSize}
                            onChange={e => onFilterChange({ pageSize: Number(e.target.value) })}
                            style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '6px', padding: '2px 6px', margin: '0 8px' }}
                        >
                            <option value="10">10 por vez</option>
                            <option value="20">20 por vez</option>
                            <option value="50">50 por vez</option>
                        </select>
                        Página <strong>{page}</strong> de <strong>{Math.max(1, Math.ceil(total / pageSize))}</strong>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <button
                            disabled={page <= 1 || loading}
                            onClick={() => onPageChange(page - 1)}
                            style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', color: page <= 1 ? '#475569' : '#fff', borderRadius: '8px', padding: '0.4rem 1rem', cursor: page <= 1 ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: '0.75rem' }}
                        >← Anterior</button>
                        <button
                            disabled={page >= Math.ceil(total / pageSize) || loading}
                            onClick={() => onPageChange(page + 1)}
                            style={{
                                background: page >= Math.ceil(total / pageSize) ? '#1e293b' : 'rgba(99, 102, 241, 0.1)',
                                border: page >= Math.ceil(total / pageSize) ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(99, 102, 241, 0.2)',
                                color: page >= Math.ceil(total / pageSize) ? '#475569' : '#fff',
                                borderRadius: '8px', padding: '0.4rem 1rem',
                                cursor: page >= Math.ceil(total / pageSize) ? 'not-allowed' : 'pointer',
                                fontWeight: 700, fontSize: '0.75rem'
                            }}
                        >Próxima →</button>
                    </div>
                </div>

                {/* Modal de Pipeline Integrado */}
                {pipelineEvent && (
                    <AutomationPipelineModal
                        event={pipelineEvent}
                        webhookId={leadsModal?.webhook?.id}
                        onClose={() => setPipelineEvent(null)}
                    />
                )}

                {/* Modal de Pipeline de Follow-Up */}
                {followupLead && (
                    <FollowupPipelineModal
                        lead={followupLead}
                        webhook={leadsModal?.webhook}
                        onClose={() => setFollowupLead(null)}
                    />
                )}
            </div>
        </div>
    );
};

export default LeadsModal;
