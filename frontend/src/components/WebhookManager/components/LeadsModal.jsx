import React, { useEffect, useState } from 'react';
import { formatDate } from '../utils/helpers';
import { api } from '../../../api/client';
import AutomationPipelineModal from './AutomationPipelineModal';
import LeadFilterBar from './LeadFilterBar';

const parseLabels = (labelsField) => {
    if (!labelsField) return [];
    if (Array.isArray(labelsField)) return labelsField;
    if (typeof labelsField === 'string') {
        try {
            const parsed = JSON.parse(labelsField);
            if (Array.isArray(parsed)) return parsed;
            return [labelsField];
        } catch (e) {
            if (labelsField.startsWith('[') && labelsField.endsWith(']')) {
                return [];
            }
            return [labelsField];
        }
    }
    return [];
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
    onBulkDelete,
    onDeleteLead,
    onSyncAll,
    onViewHistory
}) => {
    const { leads = [], total = 0, loading = false, page = 1, pageSize = 20, search = '', podeEnviar = 'all', dateStart = '', dateEnd = '', janelaAberta = 'all', semMensagens = 'all' } = leadsModal;
    const safeLeads = Array.isArray(leads) ? leads : [];

    // Estado local para controlar qual card está expandido (apenas 1 por vez - Accordion)
    const [expandedLeadId, setExpandedLeadId] = useState(null);
    const [historyEvents, setHistoryEvents] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [pipelineEvent, setPipelineEvent] = useState(null);
    const [currentTime, setCurrentTime] = useState(new Date());

    // Timer para atualizar contagens regressivas
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const getRemainingTime = (lastInteraction) => {
        if (!lastInteraction) return 'Expirado';
        // Garantir que a data seja tratada como UTC se não tiver timezone
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
        return () => { document.body.style.overflow = originalStyle; };
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
                {/* Cabeçalho - Reduzido */}
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
                            style={{
                                background: '#10b98111', border: '1px solid #10b98133', color: '#34d399',
                                borderRadius: '8px', padding: '0.4rem 1rem', cursor: 'pointer',
                                fontSize: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px'
                            }}
                        >
                            🔄 Sincronizar Tudo
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

                {/* Seleção em Massa - Compacta */}
                <div style={{
                    padding: '0.6rem 1.5rem',
                    borderBottom: '1px solid rgba(255,255,255,0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    background: selectedLeads?.size > 0 ? 'rgba(239, 68, 68, 0.08)' : 'rgba(255,255,255,0.01)',
                    transition: 'all 0.2s ease'
                }}>
                    <div
                        onClick={() => toggleSelectAllLeads()}
                        style={{
                            width: '20px', height: '20px', borderRadius: '6px', border: '2px solid rgba(255,255,255,0.15)',
                            background: safeLeads.length > 0 && safeLeads.every(l => selectedLeads?.has(l.id)) ? '#6366f1' : 'rgba(255,255,255,0.03)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', marginRight: '0.75rem'
                        }}
                    >
                        {safeLeads.length > 0 && safeLeads.every(l => selectedLeads?.has(l.id)) && <span style={{ color: '#fff', fontSize: '0.7rem' }}>✓</span>}
                    </div>
                    <span style={{ fontSize: '0.82rem', color: '#cbd5e1', fontWeight: 700 }}>Selecionar Todos</span>

                    {/* Botão de Excluir em Massa para Contatos Selecionados */}
                    {selectedLeads?.size > 0 && (
                        <div style={{ marginLeft: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#f87171' }}>
                                ({selectedLeads.size} {selectedLeads.size === 1 ? 'contato selecionado' : 'contatos selecionados'})
                            </span>
                            <button
                                type="button"
                                onClick={onBulkDelete}
                                style={{
                                    background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                                    boxShadow: '0 4px 14px rgba(239, 68, 68, 0.35)',
                                    border: '1.5px solid rgba(255, 255, 255, 0.15)',
                                    color: '#ffffff',
                                    borderRadius: '8px',
                                    padding: '0.45rem 1.1rem',
                                    cursor: 'pointer',
                                    fontSize: '0.82rem',
                                    fontWeight: 800,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                🗑️ Excluir Selecionados
                            </button>
                        </div>
                    )}

                    <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: '#64748b' }}>
                        Dica: Clique no contato para ver detalhes
                    </span>
                </div>

                {/* Lista de Cards - Área de Scroll */}
                <div 
                    className="custom-scrollbar"
                    style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', background: 'rgba(0,0,0,0.1)' }}
                >
                    {loading ? (
                        <div style={{ padding: '6rem 0', textAlign: 'center', color: '#64748b' }}>Carregando...</div>
                    ) : safeLeads.length === 0 ? (
                        <div style={{ padding: '6rem 0', textAlign: 'center', color: '#64748b' }}>Nenhum contato encontrado.</div>
                    ) : safeLeads.map(l => {
                        const isExpanded = expandedLeadId === l.id;
                        return (
                            <div key={l.id} className="lead-card-premium" style={{
                                background: isExpanded ? 'rgba(30, 41, 59, 0.7)' : 'rgba(15, 23, 42, 0.3)',
                                border: `1px solid ${selectedLeads.has(l.id) ? 'rgba(99, 102, 241, 0.6)' : isExpanded ? 'rgba(99, 102, 241, 0.3)' : 'rgba(255,255,255,0.03)'}`,
                                borderRadius: '16px', padding: '1rem 1.25rem',
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                boxShadow: isExpanded ? '0 20px 40px -15px rgba(0,0,0,0.6)' : 'none',
                                marginBottom: isExpanded ? '0.5rem' : '0'
                            }}>
                                {/* Top Info - Agora clicável para expandir */}
                                <div
                                    onClick={() => toggleExpandLead(l.id)}
                                    style={{ display: 'flex', justifyContent: 'space-between', cursor: 'pointer', alignItems: 'center' }}
                                >
                                    <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
                                        <div style={{
                                            width: '46px', height: '46px', borderRadius: '14px',
                                            background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: '1.2rem', color: '#fff', border: '1px solid rgba(255,255,255,0.1)',
                                            flexShrink: 0, boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                                        }}>
                                            {l.contato_nome ? l.contato_nome[0].toUpperCase() : '👤'}
                                        </div>
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap', rowGap: '0.4rem' }}>
                                                <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f8fafc' }}>{l.contato_nome || '—'}</span>
                                                <span style={{ fontSize: '0.65rem', fontWeight: 800, padding: '2px 10px', borderRadius: '20px', background: 'rgba(34, 197, 94, 0.1)', color: '#4ade80', border: '1px solid rgba(34, 197, 94, 0.2)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                    ● Ativa
                                                </span>
                                                {l.sem_mensagem_usuario && (
                                                    <span style={{ fontSize: '0.65rem', fontWeight: 800, padding: '2px 10px', borderRadius: '20px', background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                        ⚠️ Sem Mensagens
                                                    </span>
                                                )}
                                                 <span style={{ fontSize: '0.7rem', fontWeight: 600, color: l.janela_24h_aberta ? '#4ade80' : '#ef4444', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    ⏰ {l.janela_24h_aberta ? `Aberta (${getRemainingTime(l.ultima_mensagem_em)})` : 'Fechada'}
                                                </span>
                                                {l.total_disparos > 0 && (
                                                    <span style={{
                                                        fontSize: '0.65rem', fontWeight: 800, padding: '2px 12px', borderRadius: '20px',
                                                        background: 'rgba(99, 102, 241, 0.1)', color: '#818cf8', border: '1px solid rgba(99, 102, 241, 0.2)'
                                                    }}>
                                                        {l.total_disparos} disparos
                                                    </span>
                                                )}
                                                {l.message_type === 'audio' && (
                                                    <span title="Última mensagem foi um áudio" style={{ fontSize: '1rem' }}>🎤</span>
                                                )}
                                                {l.message_type === 'image' && (
                                                    <span title="Última mensagem foi uma imagem" style={{ fontSize: '1rem' }}>🖼️</span>
                                                )}
                                                <span style={{ fontSize: '0.9rem', color: isExpanded ? '#6366f1' : '#475569', transition: 'transform 0.3s ease', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                                                    ▼
                                                </span>
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem', marginTop: '0.6rem' }}>
                                                <div style={{ fontSize: '0.9rem', color: '#6366f1', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>{l.telefone}</div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', flexWrap: 'wrap', rowGap: '0.4rem' }}>
                                                {parseLabels(l.labels).map((label, idx) => (
                                                    <span
                                                        key={idx} 
                                                        style={{
                                                            fontSize: '0.65rem', 
                                                            fontWeight: 700, 
                                                            padding: '3px 10px',
                                                            borderRadius: '12px',
                                                            background: 'rgba(99, 102, 241, 0.15)', 
                                                            color: '#a5b4fc', 
                                                            border: '1px solid rgba(99, 102, 241, 0.25)', 
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '4px',
                                                            backdropFilter: 'blur(4px)'
                                                        }}
                                                    >
                                                        🏷️ {label}
                                                    </span>
                                                ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '2rem' }}>
                                        {!isExpanded && (
                                            <div style={{ fontSize: '0.75rem', color: '#64748b', whiteSpace: 'nowrap', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', fontStyle: 'italic' }}>
                                                Última: {l.mensagem || '—'}
                                            </div>
                                        )}
                                        <div style={{ display: 'flex', gap: '0.6rem' }}>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onViewHistory(l); }}
                                                className="btn-action-history"
                                                style={{ borderRadius: '10px', padding: '0.5rem 1rem', fontSize: '0.8rem', fontWeight: 700 }}
                                            ><span>💬</span> Histórico</button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onDeleteLead(l); }}
                                                className="btn-action-delete"
                                                style={{ borderRadius: '10px', padding: '0.5rem 0.8rem', fontSize: '0.8rem' }}
                                            ><span>🗑️</span></button>
                                        </div>
                                        {/* Seleção Individual */}
                                        <div
                                            onClick={(e) => { e.stopPropagation(); toggleSelectLead(l.id); }}
                                            style={{
                                                width: '22px', height: '22px', borderRadius: '7px', border: '2px solid rgba(255,255,255,0.1)',
                                                background: selectedLeads.has(l.id) ? '#6366f1' : 'rgba(255,255,255,0.03)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                                                boxShadow: selectedLeads.has(l.id) ? '0 0 15px rgba(99, 102, 241, 0.4)' : 'none',
                                                flexShrink: 0
                                            }}
                                        >
                                            {selectedLeads.has(l.id) && <span style={{ color: '#fff', fontSize: '0.8rem' }}>✓</span>}
                                        </div>
                                    </div>
                                </div>

                                {/* Conteúdo Expandido - Detalhes Completos */}
                                {isExpanded && (
                                    <div style={{ marginTop: '1.5rem', padding: '0.5rem 0', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '1rem' }}>
                                            {[
                                                { label: 'CRIADO EM', value: formatDate(l.created_at), icon: '📅' },
                                                { label: 'ID INTERNO', value: l.id, icon: '🆔' },
                                                { label: 'ID DO CLIENTE (CLIENT ID)', value: l.inbox_id || '—', icon: '🏦' },
                                                { label: 'CONTATO ID', value: l.contato_id || '—', icon: '👤' },
                                                { label: 'JANELA 24H', value: getRemainingTime(l.ultima_mensagem_em), icon: '⏰', color: l.janela_24h_aberta ? '#4ade80' : '#ef4444' },
                                                { label: 'TIPO DE MENSAGEM', value: (l.message_type || 'text').toUpperCase(), icon: '🏷️' },
                                                { 
                                                    label: 'LINK DA MÍDIA', 
                                                    value: l.link ? (
                                                        <a href={l.link} target="_blank" rel="noopener noreferrer" style={{ color: '#6366f1', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            🔗 Abrir Mídia Original
                                                        </a>
                                                    ) : 'Sem mídia', 
                                                    icon: '🔗' 
                                                },
                                                { label: 'ÚLTIMA MENSAGEM DO USUÁRIO', value: l.mensagem || '—', icon: '💬', fullWidth: true },
                                                { label: 'ÚLTIMA RESPOSTA DO AGENTE', value: l.ultima_resposta_agente || '—', icon: '🤖', fullWidth: true },
                                                { 
                                                    label: 'ETIQUETAS DO ZAPVOICE', 
                                                    value: parseLabels(l.labels).length > 0 ? (
                                                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                                            {parseLabels(l.labels).map((label, idx) => (
                                                                <span 
                                                                    key={idx} 
                                                                    style={{
                                                                        fontSize: '0.7rem', 
                                                                        fontWeight: 700, 
                                                                        padding: '2px 10px', 
                                                                        borderRadius: '20px',
                                                                        background: 'rgba(99, 102, 241, 0.15)', 
                                                                        color: '#a5b4fc', 
                                                                        border: '1px solid rgba(99, 102, 241, 0.25)',
                                                                        display: 'inline-flex',
                                                                        alignItems: 'center',
                                                                        gap: '4px'
                                                                    }}
                                                                >
                                                                    🏷️ {label}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    ) : 'Sem etiquetas', 
                                                    icon: '🏷️', 
                                                    fullWidth: true 
                                                },
                                            ].map((item, i) => (
                                                <div key={i} style={{ 
                                                    background: 'rgba(255, 255, 255, 0.03)', 
                                                    border: '1px solid rgba(255, 255, 255, 0.05)', 
                                                    borderRadius: '12px', 
                                                    padding: '0.75rem 1rem',
                                                    gridColumn: item.fullWidth ? 'span 4' : 'auto',
                                                    boxShadow: 'inset 0 0 10px rgba(0,0,0,0.1)'
                                                }}>
                                                    <div style={{ fontSize: '0.6rem', fontWeight: 900, color: '#64748b', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '6px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                                                        <span>{item.icon}</span> {item.label}
                                                    </div>
                                                    <div style={{ 
                                                        fontSize: '0.85rem', 
                                                        color: item.color || '#f1f5f9', 
                                                        fontWeight: 600, 
                                                        overflow: item.fullWidth ? 'visible' : 'hidden', 
                                                        textOverflow: item.fullWidth ? 'unset' : 'ellipsis', 
                                                        whiteSpace: item.fullWidth ? 'pre-wrap' : 'nowrap',
                                                        lineHeight: 1.5,
                                                        maxHeight: item.fullWidth ? '120px' : 'unset',
                                                        overflowY: item.fullWidth ? 'auto' : 'unset'
                                                    }} className="custom-scrollbar">
                                                        {item.value}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Rodapé: Paginação - Reduzido */}
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
            </div>
        </div>
    );
};

export default LeadsModal;
