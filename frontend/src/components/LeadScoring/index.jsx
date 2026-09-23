import React, { useState, useEffect } from 'react';
import { API_URL, AGENT_API_KEY } from '../../config';
import DeleteMessageModal from '../ConfigPanel/components/Modals/DeleteMessageModal';
import LeadScoringFilters from './components/LeadScoringFilters';
import LeadScoringCard from './components/LeadScoringCard';
import { filterAndSortLeads } from './utils/leadScoringUtils';

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

    // Filtrar e ordenar leads usando utilitário
    const filteredLeads = filterAndSortLeads(leads, searchQuery, filterClass, sortBy);

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
            <LeadScoringFilters
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                filterClass={filterClass}
                setFilterClass={setFilterClass}
                sortBy={sortBy}
                setSortBy={setSortBy}
            />

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
                        return (
                            <LeadScoringCard
                                key={leadUniqueId}
                                lead={lead}
                                isExpanded={expandedLeadIds.has(leadUniqueId)}
                                isRecalculating={recalculatingIds.has(leadUniqueId)}
                                isDeleting={deletingLeadIds.has(leadUniqueId)}
                                onToggleExpand={toggleExpand}
                                onRecalculate={handleRecalculateScore}
                                onRequestDelete={(selectedLead) => setDeleteLeadModal({ isOpen: true, lead: selectedLead })}
                            />
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
