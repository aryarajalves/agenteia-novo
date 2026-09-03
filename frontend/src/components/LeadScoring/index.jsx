import React, { useState, useEffect } from 'react';
import { API_URL, AGENT_API_KEY } from '../../config';
import DeleteMessageModal from '../ConfigPanel/components/Modals/DeleteMessageModal';

const LeadScoring = () => {
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterClass, setFilterClass] = useState('Todos');
    const [sortBy, setSortBy] = useState('hot'); // 'hot' = mais quentes, 'recent' = mais recentes
    const [expandedLeadIds, setExpandedLeadIds] = useState(new Set());
    const [recalculatingIds, setRecalculatingIds] = useState(new Set());
    const [toast, setToast] = useState(null);
    const [deleteLeadModal, setDeleteLeadModal] = useState({ isOpen: false, lead: null });
    const [deletingLeadIds, setDeletingLeadIds] = useState(new Set());

    // Sistema de feedback por toast
    const showToast = (message, type = 'success') => {
        setToast({ message, type, id: Date.now() });
    };

    useEffect(() => {
        if (!toast) return;
        const timer = setTimeout(() => setToast(null), 3500);
        return () => clearTimeout(timer);
    }, [toast]);

    // Buscar leads qualificados
    const fetchLeads = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('admin_token');
            const response = await fetch(`${API_URL}/leads/qualified`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'X-API-Key': AGENT_API_KEY
                }
            });

            if (response.ok) {
                const data = await response.json();
                setLeads(data);
            } else {
                console.error("Erro ao buscar leads qualificados");
                showToast("Não foi possível carregar os leads qualificados.", "error");
            }
        } catch (error) {
            console.error("Erro de conexão ao buscar leads:", error);
            showToast("Erro de conexão com o servidor.", "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLeads();
    }, []);

    // Alternar expandir/recolher accordion do lead
    const toggleExpand = (leadUniqueId) => {
        const newExpanded = new Set(expandedLeadIds);
        if (newExpanded.has(leadUniqueId)) {
            newExpanded.delete(leadUniqueId);
        } else {
            newExpanded.add(leadUniqueId);
        }
        setExpandedLeadIds(newExpanded);
    };

    // Recalcular o score do lead individualmente
    const handleRecalculateScore = async (e, lead) => {
        e.stopPropagation(); // Evita expandir/recolher ao clicar no botão
        const leadUniqueId = `${lead.leads_table}_${lead.id}`;
        
        if (recalculatingIds.has(leadUniqueId)) return;

        try {
            const newRecalculating = new Set(recalculatingIds);
            newRecalculating.add(leadUniqueId);
            setRecalculatingIds(newRecalculating);

            const token = localStorage.getItem('admin_token');
            const response = await fetch(`${API_URL}/leads/${lead.leads_table}/${lead.id}/recalculate-score`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'X-API-Key': AGENT_API_KEY
                }
            });

            if (response.ok) {
                const result = await response.json();
                
                // Atualizar o lead localmente na lista
                setLeads(prevLeads => prevLeads.map(item => {
                    if (item.id === lead.id && item.leads_table === lead.leads_table) {
                        return {
                            ...item,
                            lead_score: result.lead_score,
                            lead_classification: result.lead_classification,
                            lead_justification: result.lead_justification,
                            updated_at: new Date().toISOString()
                        };
                    }
                    return item;
                }));

                showToast(`Lead score do contato ${lead.contato_nome || 'Lead'} recalculado! ✨`, "success");
            } else {
                const errData = await response.json();
                showToast(errData.detail || "Erro ao recalcular o lead score.", "error");
            }
        } catch (error) {
            console.error("Erro ao recalcular score:", error);
            showToast("Erro de rede ao recalcular score.", "error");
        } finally {
            const newRecalculating = new Set(recalculatingIds);
            newRecalculating.delete(leadUniqueId);
            setRecalculatingIds(newRecalculating);
        }
    };

    // Efeito para adicionar blur no body quando o modal estiver aberto
    useEffect(() => {
        if (deleteLeadModal.isOpen) {
            document.body.classList.add('modal-open-blur');
        } else {
            document.body.classList.remove('modal-open-blur');
        }
        return () => document.body.classList.remove('modal-open-blur');
    }, [deleteLeadModal.isOpen]);

    // Deletar a qualificação do lead (desqualificação parcial)
    const handleDeleteLead = async () => {
        const lead = deleteLeadModal.lead;
        if (!lead) return;
        const leadUniqueId = `${lead.leads_table}_${lead.id}`;
        if (deletingLeadIds.has(leadUniqueId)) return;

        try {
            const newDeleting = new Set(deletingLeadIds);
            newDeleting.add(leadUniqueId);
            setDeletingLeadIds(newDeleting);

            const token = localStorage.getItem('admin_token');
            const response = await fetch(`${API_URL}/leads/${lead.leads_table}/${lead.id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'X-API-Key': AGENT_API_KEY
                }
            });

            if (response.ok) {
                setLeads(prevLeads => prevLeads.filter(item => !(item.id === lead.id && item.leads_table === lead.leads_table)));
                showToast(`Qualificação do contato ${lead.contato_nome || 'Lead'} removida com sucesso!`, "success");
            } else {
                const errData = await response.json();
                showToast(errData.detail || "Erro ao remover qualificação do lead.", "error");
            }
        } catch (error) {
            console.error("Erro ao deletar qualificação do lead:", error);
            showToast("Erro de rede ao remover qualificação.", "error");
        } finally {
            const newDeleting = new Set(deletingLeadIds);
            newDeleting.delete(leadUniqueId);
            setDeletingLeadIds(newDeleting);
            setDeleteLeadModal({ isOpen: false, lead: null });
        }
    };

    // Formatar data localmente
    const formatDate = (isoString) => {
        if (!isoString) return '';
        const d = new Date(isoString);
        return d.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Obter classe correspondente para a temperatura do lead
    const getClassificationClass = (classification) => {
        if (!classification) return 'frio';
        const clean = classification.toLowerCase();
        if (clean.includes('quente')) return 'quente';
        if (clean.includes('morno')) return 'morno';
        return 'frio';
    };

    // Filtrar e ordenar leads
    const filteredLeads = leads
        .filter(lead => {
            const nameMatch = (lead.contato_nome || '').toLowerCase().includes(searchQuery.toLowerCase());
            const phoneMatch = (lead.telefone || '').toLowerCase().includes(searchQuery.toLowerCase());
            const queryMatch = nameMatch || phoneMatch;

            if (filterClass === 'Todos') return queryMatch;
            const itemClass = getClassificationClass(lead.lead_classification);
            const filterClassClean = getClassificationClass(filterClass);
            return queryMatch && itemClass === filterClassClean;
        })
        .sort((a, b) => {
            if (sortBy === 'hot') {
                // Pontuações mais altas primeiro
                const scoreA = a.lead_score !== null ? a.lead_score : -1;
                const scoreB = b.lead_score !== null ? b.lead_score : -1;
                if (scoreB !== scoreA) return scoreB - scoreA;
            }
            // Fallback para os mais recentes/atualizados primeiro
            const dateA = a.updated_at || a.created_at || '';
            const dateB = b.updated_at || b.created_at || '';
            return dateB.localeCompare(dateA);
        });

    return (
        <div className="lead-scoring-container">
            <header className="lead-scoring-header">
                <h1 className="lead-scoring-title">
                    <span>🔥</span> Lead Scoring & Qualificação
                </h1>
                <p className="lead-scoring-subtitle">
                    Visualize os contatos que responderam a todas as perguntas e veja a pontuação de qualificação calculada pela IA.
                </p>
            </header>

            {/* Painel de Filtros e Busca */}
            <div className="filters-panel">
                <div className="search-box">
                    <span className="search-icon">🔍</span>
                    <input
                        type="text"
                        placeholder="Buscar por nome ou telefone..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="search-input"
                    />
                </div>

                <div className="filter-groups">
                    <div className="filter-group">
                        <span className="filter-label">Temperatura:</span>
                        <div className="filter-badges">
                            {['Todos', 'Quente 🔥', 'Morno ⚡', 'Frio ❄️'].map(type => (
                                <button
                                    key={type}
                                    className={`filter-badge ${filterClass === type ? 'active' : ''}`}
                                    onClick={() => setFilterClass(type)}
                                >
                                    {type.replace(/🔥|⚡|❄️/g, '').trim()}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="filter-group">
                        <span className="filter-label">Ordenar:</span>
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="sort-select"
                        >
                            <option value="hot">Mais Quentes (Score)</option>
                            <option value="recent">Mais Recentes</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Lista de Leads */}
            {loading ? (
                <div className="spinner-container">
                    <div className="loading-spinner"></div>
                    <span className="loading-text">Carregando contatos qualificados...</span>
                </div>
            ) : filteredLeads.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon">❄️</div>
                    <h3 className="empty-title">Nenhum lead qualificado encontrado</h3>
                    <p className="empty-desc">
                        {searchQuery || filterClass !== 'Todos'
                            ? "Não encontramos leads para os critérios de busca ou filtros selecionados."
                            : "Quando os contatos finalizarem o fluxo de perguntas dos agentes, eles aparecerão qualificados aqui."}
                    </p>
                </div>
            ) : (
                <div className="leads-grid">
                    {filteredLeads.map(lead => {
                        const leadUniqueId = `${lead.leads_table}_${lead.id}`;
                        const isExpanded = expandedLeadIds.has(leadUniqueId);
                        const isRecalculating = recalculatingIds.has(leadUniqueId);
                        const scoreClass = getClassificationClass(lead.lead_classification);
                        const hasScore = lead.lead_score !== null && lead.lead_score !== undefined;

                        return (
                            <div key={leadUniqueId} className="lead-card">
                                <div className="lead-card-header" onClick={() => toggleExpand(leadUniqueId)}>
                                    <div className="lead-main-info">
                                        <div className={`lead-score-circle score-${scoreClass}`}>
                                            <span className="lead-score-value">{hasScore ? lead.lead_score : '?'}</span>
                                            <span className="lead-score-max">/13</span>
                                        </div>

                                        <div className="lead-meta-details">
                                            <h3 className="lead-name">{lead.contato_nome}</h3>
                                            <div className="lead-phone">
                                                <span>📱</span> {lead.telefone || 'Sem telefone'}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="lead-meta-badges">
                                        <span className={`classification-badge ${scoreClass}`}>
                                            {lead.lead_classification || 'Pendente ⏳'}
                                        </span>
                                        {lead.inbox_nome && (
                                            <span className="inbox-badge">
                                                📥 {lead.inbox_nome}
                                            </span>
                                        )}
                                        {lead.agent_name && (
                                            <span className="inbox-badge" style={{
                                                background: 'rgba(99, 102, 241, 0.15)',
                                                color: '#a5b4fc',
                                                border: '1px solid rgba(99, 102, 241, 0.25)'
                                            }}>
                                                🤖 {lead.agent_name}
                                            </span>
                                        )}
                                        <span className="date-badge">
                                            {formatDate(lead.updated_at || lead.created_at)}
                                        </span>
                                    </div>

                                    <div className="lead-actions-summary" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                        <button 
                                            type="button"
                                            className="btn-trash"
                                            disabled={deletingLeadIds.has(leadUniqueId)}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setDeleteLeadModal({ isOpen: true, lead });
                                            }}
                                            style={{
                                                background: 'transparent',
                                                border: 'none',
                                                color: '#ef4444',
                                                fontSize: '1rem',
                                                padding: '0.5rem',
                                                borderRadius: '6px',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                transition: 'all 0.2s',
                                                opacity: deletingLeadIds.has(leadUniqueId) ? 0.5 : 1
                                            }}
                                            onMouseOver={(e) => {
                                                if (!deletingLeadIds.has(leadUniqueId)) {
                                                    e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                                                }
                                            }}
                                            onMouseOut={(e) => {
                                                e.currentTarget.style.background = 'transparent';
                                            }}
                                            title="Remover qualificação do lead"
                                        >
                                            🗑️
                                        </button>
                                        <button className={`btn-chevron ${isExpanded ? 'expanded' : ''}`}>
                                            ▼
                                        </button>
                                    </div>
                                </div>

                                {isExpanded && (
                                    <div className="lead-card-content">
                                        {/* Perguntas e Respostas */}
                                        <div className="lead-details-section">
                                            <h4 className="lead-section-title">💬 Respostas de Qualificação</h4>
                                            <div className="qa-list">
                                                {Array.isArray(lead.respostas_decoded) && lead.respostas_decoded.length > 0 ? (
                                                    lead.respostas_decoded.map((qa, index) => (
                                                        <div key={index} className="qa-item">
                                                            <div className="qa-question">
                                                                Perg: {qa.pergunta || qa.question || `Pergunta ${index + 1}`}
                                                            </div>
                                                            <div className="qa-answer">
                                                                {qa.resposta || qa.answer || "Sem resposta"}
                                                            </div>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="qa-item">
                                                        <div className="qa-answer" style={{ color: 'var(--text-secondary)' }}>
                                                            {typeof lead.respostas_decoded === 'string' 
                                                                ? lead.respostas_decoded 
                                                                : 'Nenhuma resposta decodificada.'}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Justificativa da IA */}
                                        {lead.lead_justification && (
                                            <div className="lead-details-section">
                                                <h4 className="lead-section-title">🧠 Justificativa da IA</h4>
                                                <div className="justification-block">
                                                    <p className="justification-text">
                                                        {lead.lead_justification}
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        {/* Ações */}
                                        <div className="lead-card-actions">
                                            <button
                                                className="btn-lead-action recalc"
                                                onClick={(e) => handleRecalculateScore(e, lead)}
                                                disabled={isRecalculating}
                                            >
                                                {isRecalculating ? (
                                                    <>
                                                        <div className="mini-spinner"></div>
                                                        <span>Recalculando...</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <span>🔄</span>
                                                        <span>Recalcular Score</span>
                                                    </>
                                                )}
                                            </button>

                                            {(lead.chatwoot_conversation_url || lead.telefone) && (
                                                <a
                                                    href={lead.chatwoot_conversation_url || `https://web.whatsapp.com/send?phone=${String(lead.telefone).replace(/\D/g, '')}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="btn-lead-action chatwoot"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <span>💬</span>
                                                    <span>Conversar no ZapVoice</span>
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            <DeleteMessageModal
                isOpen={deleteLeadModal.isOpen}
                descriptionText="Você tem certeza que deseja remover a qualificação deste contato? As respostas, score e etiqueta de qualificado serão apagados."
                messageText={deleteLeadModal.lead?.contato_nome || ''}
                onConfirm={handleDeleteLead}
                onCancel={() => setDeleteLeadModal({ isOpen: false, lead: null })}
            />

            {/* Notificação Toast */}
            {toast && (
                <div className={`global-toast global-toast-${toast.type}`}>
                    <span className="global-toast-icon">
                        {toast.type === 'success' ? '✅' : '❌'}
                    </span>
                    <span>{toast.message}</span>
                </div>
            )}
        </div>
    );
};

export default LeadScoring;
