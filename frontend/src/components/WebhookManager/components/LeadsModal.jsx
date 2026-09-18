import React, { useEffect, useState } from 'react';
import { api } from '../../../api/client';
import AutomationPipelineModal from './AutomationPipelineModal';
import FollowupPipelineModal from './FollowupPipelineModal';
import LeadVariablesModal from './LeadVariablesModal';
import LeadFilterBar from './LeadFilterBar';
import LeadCard from './LeadCard';
import LeadSelectionBar from './LeadSelectionBar';
import ImportChatProgressModal from './ImportChatProgressModal';
import ConfirmModal from '../../ConfirmModal';

const formatDuration = (totalSec) => {
    const s = Math.max(0, Math.floor(totalSec || 0));
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    if (mins >= 60) {
        const hrs = Math.floor(mins / 60);
        const remMins = mins % 60;
        return `${String(hrs).padStart(2, '0')}:${String(remMins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

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
    onImportChat,
    onCancelImport,
    isCancellingImport = false,
    importProgress,
    onCloseImportProgress,
    onOpenImportProgress,
    isStartingImport = false,
    onViewHistory
}) => {
    const { leads = [], total = 0, loading = false, page = 1, pageSize = 20, search = '', podeEnviar = 'all', dateStart = '', dateEnd = '', janelaAberta = 'all', semMensagens = 'all' } = leadsModal;
    const safeLeads = Array.isArray(leads) ? leads : [];

    const isImportRunning = Boolean(
        !importProgress?.done && !importProgress?.error &&
        (importProgress?.total > 0 || (importProgress?.status && importProgress.status.includes('...')))
    );

    // Estado local para controlar qual card está expandido (apenas 1 por vez - Accordion)
    const [expandedLeadId, setExpandedLeadId] = useState(null);
    const [, setHistoryEvents] = useState([]);
    const [, setHistoryLoading] = useState(false);
    const [pipelineEvent, setPipelineEvent] = useState(null);
    const [followupLead, setFollowupLead] = useState(null);
    const [selectedLeadForVariables, setSelectedLeadForVariables] = useState(null);
    const [showConfirmImport, setShowConfirmImport] = useState(false);
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
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <p style={{ margin: '0', color: '#64748b', fontSize: '0.75rem' }}>
                                    {total} contatos identificados
                                </p>
                                <span style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    fontSize: '0.68rem',
                                    color: '#10b981',
                                    background: 'rgba(16, 185, 129, 0.1)',
                                    border: '1px solid rgba(16, 185, 129, 0.25)',
                                    padding: '1px 7px',
                                    borderRadius: '12px',
                                    fontWeight: 600,
                                    letterSpacing: '0.02em'
                                }}>
                                    <span style={{
                                        width: '6px',
                                        height: '6px',
                                        borderRadius: '50%',
                                        backgroundColor: '#10b981',
                                        boxShadow: '0 0 6px #10b981'
                                    }} />
                                    Tempo Real
                                </span>
                            </div>
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
                        <button
                            onClick={() => {
                                if (isImportRunning) {
                                    if (onOpenImportProgress) onOpenImportProgress();
                                } else {
                                    setShowConfirmImport(true);
                                }
                            }}
                            disabled={isStartingImport}
                            style={{
                                background: isImportRunning
                                    ? 'rgba(99, 102, 241, 0.22)'
                                    : 'rgba(99, 102, 241, 0.12)',
                                border: `1px solid ${isImportRunning ? 'rgba(129, 140, 248, 0.6)' : 'rgba(99, 102, 241, 0.35)'}`,
                                color: isImportRunning ? '#c7d2fe' : '#a5b4fc',
                                borderRadius: '8px', padding: '0.4rem 1rem',
                                cursor: 'pointer',
                                fontSize: '0.8rem', fontWeight: 700,
                                display: 'flex', alignItems: 'center', gap: '6px',
                                transition: 'all 0.2s ease',
                                boxShadow: isImportRunning ? '0 0 12px rgba(99, 102, 241, 0.3)' : '0 2px 8px rgba(99, 102, 241, 0.12)'
                            }}
                        >
                            {isImportRunning ? (
                                <>
                                    <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⚡</span>
                                    {`⚡ Importando (${importProgress?.percentage || 0}%) - Ver Progresso`}
                                </>
                            ) : isStartingImport ? (
                                <>
                                    <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⚡</span>
                                    Importando...
                                </>
                            ) : (
                                '📥 Importar do ZapJords'
                            )}
                        </button>
                        <button onClick={onClose} className="modal-close-btn" style={{ width: '32px', height: '32px', fontSize: '0.9rem' }}>✕</button>
                    </div>
                </div>

                {/* Banner de Importação Ativa em Segundo Plano */}
                {isImportRunning && !importProgress?.isOpen && (
                    <div style={{
                        margin: '0.5rem 1.5rem 0',
                        padding: '0.65rem 1.1rem',
                        background: 'linear-gradient(90deg, rgba(99, 102, 241, 0.15), rgba(16, 185, 129, 0.15))',
                        border: '1px solid rgba(99, 102, 241, 0.35)',
                        borderRadius: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                        boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.8rem', color: '#e2e8f0', flex: 1, overflow: 'hidden' }}>
                            <span style={{ fontSize: '1rem', animation: 'spin 2s linear infinite', display: 'inline-block' }}>⚡</span>
                            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                <span style={{ fontWeight: 700, color: '#a5b4fc', marginRight: '6px' }}>
                                    Importação do ZapJords em andamento: {importProgress?.percentage || 0}% {importProgress?.elapsedSeconds !== undefined ? `(⏱️ ${formatDuration(importProgress.elapsedSeconds)})` : ''}
                                </span>
                                <span style={{ color: '#94a3b8' }}>
                                    {importProgress?.current && importProgress?.total ? `(${importProgress.current} de ${importProgress.total} conversas)` : ''}
                                    {` • +${importProgress?.createdLeads || 0} contatos, +${importProgress?.importedMessages || 0} mensagens`}
                                </span>
                            </div>
                        </div>
                        <button
                            onClick={onOpenImportProgress}
                            style={{
                                padding: '0.3rem 0.85rem',
                                borderRadius: '6px',
                                background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                                border: 'none',
                                color: '#fff',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                whiteSpace: 'nowrap',
                                boxShadow: '0 2px 8px rgba(99, 102, 241, 0.4)'
                            }}
                        >
                            👁️ Ver Progresso
                        </button>
                    </div>
                )}

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
                            onViewVariables={(lead) => setSelectedLeadForVariables(lead)}
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

                {/* Modal de Variáveis do Contato */}
                {selectedLeadForVariables && (
                    <LeadVariablesModal
                        isOpen={!!selectedLeadForVariables}
                        lead={selectedLeadForVariables}
                        webhookId={leadsModal?.webhook?.id}
                        onClose={() => setSelectedLeadForVariables(null)}
                    />
                )}

                {/* Modal de Progresso da Importação do ZapJords */}
                <ImportChatProgressModal
                    isOpen={importProgress?.isOpen}
                    onClose={onCloseImportProgress}
                    onCancel={onCancelImport}
                    isCancelling={isCancellingImport}
                    progress={importProgress}
                />

                {/* Modal de Confirmação da Importação */}
                {showConfirmImport && (
                    <ConfirmModal
                        isOpen={showConfirmImport}
                        icon="📥"
                        type="primary"
                        title="Importar do ZapJords"
                        message="Deseja sincronizar todas as conversas do ZapJords? Os contatos serão criados e suas mensagens salvas na memória sem custo de IA. O follow-up de novos contatos será pausado automaticamente."
                        confirmText="Sim, Importar"
                        cancelText="Cancelar"
                        onConfirm={() => {
                            setShowConfirmImport(false);
                            if (onImportChat) onImportChat();
                        }}
                        onCancel={() => setShowConfirmImport(false)}
                    />
                )}
            </div>
        </div>
    );
};

export default LeadsModal;
