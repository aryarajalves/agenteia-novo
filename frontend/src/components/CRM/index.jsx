import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import CRMHeader from './components/CRMHeader';
import CRMBoard from './components/CRMBoard';
import CRMLeadDetailsModal from './components/CRMLeadDetailsModal';
import CRMMassDispatchModal from './components/CRMMassDispatchModal';
import './styles/CRM.css';

const CRM = () => {
    const navigate = useNavigate();
    const [pipelineData, setPipelineData] = useState({
        products: [],
        selected_product: 'all',
        stats: {
            total_leads: 0,
            total_comprou: 0,
            total_em_atendimento: 0,
            total_remarketing: 0,
            conversion_rate: 0
        },
        columns: {
            template_enviado: [],
            retentativas: [],
            em_atendimento: [],
            remarketing: [],
            comprou: [],
            desistiu: []
        }
    });

    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedProduct, setSelectedProduct] = useState('all');
    const [temperatureFilter, setTemperatureFilter] = useState('all');
    const [dateFilter, setDateFilter] = useState('all');
    const [selectedMonth, setSelectedMonth] = useState('');
    const [selectedLead, setSelectedLead] = useState(null);
    const [massDispatchModalLeads, setMassDispatchModalLeads] = useState(null);

    // Atalho de teclado ESC para voltar
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && !selectedLead && !massDispatchModalLeads) {
                navigate(-1);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [navigate, selectedLead, massDispatchModalLeads]);

    const fetchCRMData = useCallback(async (silent = false, prod = selectedProduct) => {
        if (!silent) setLoading(true);
        try {
            const url = prod && prod !== 'all' ? `/leads/crm?product=${encodeURIComponent(prod)}` : '/leads/crm';
            const res = await api.get(url);
            if (res.ok) {
                const data = await res.json();
                setPipelineData(data);
            }
        } catch (err) {
            console.error('Erro ao carregar dados do CRM:', err);
            if (!silent) {
                window.dispatchEvent(new CustomEvent('app:toast', {
                    detail: { message: 'Erro ao carregar dados do CRM.', type: 'error' }
                }));
            }
        } finally {
            if (!silent) setLoading(false);
        }
    }, [selectedProduct]);

    useEffect(() => {
        fetchCRMData();

        // Conexão WebSocket para atualização em tempo real do CRM
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsHost = window.location.hostname;
        const wsPort = window.location.port ? `:${window.location.port}` : '';
        const wsUrl = `${wsProtocol}//${wsHost}${wsPort === ':5300' ? ':8002' : wsPort}/ws/events`;
        
        let ws = null;
        let reconnectTimeout = null;

        const connectWS = () => {
            try {
                ws = new WebSocket(wsUrl);
                ws.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data);
                        // Atualiza o pipeline automaticamente quando houver novas mensagens, disparos ou eventos
                        if (data && (data.type === 'new_event' || data.type === 'status_update' || data.type === 'lead_update' || data.event === 'crm_update')) {
                            fetchCRMData(true);
                        }
                    } catch (e) {
                        // ignore parse error
                    }
                };
                ws.onclose = () => {
                    reconnectTimeout = setTimeout(connectWS, 4000);
                };
                ws.onerror = () => {
                    if (ws) ws.close();
                };
            } catch (e) {
                console.warn('WebSocket CRM fallback:', e);
            }
        };

        connectWS();

        // Polling de sincronização suave a cada 10 segundos
        const intervalId = setInterval(() => {
            fetchCRMData(true);
        }, 10000);

        return () => {
            if (ws) ws.close();
            if (reconnectTimeout) clearTimeout(reconnectTimeout);
            clearInterval(intervalId);
        };
    }, [fetchCRMData]);

    const handleDragStart = (e, lead) => {
        e.dataTransfer.setData('application/json', JSON.stringify(lead));
    };

    const handleLeadDrop = async (lead, newStage) => {
        if (!lead || lead.stage === newStage) return;

        // Atualização Otimista local
        setPipelineData(prev => {
            const oldStage = lead.stage;
            const updatedLead = { ...lead, stage: newStage };
            const oldColumn = (prev.columns[oldStage] || []).filter(l => l.id !== lead.id || l.leads_table !== lead.leads_table);
            const newColumn = [updatedLead, ...(prev.columns[newStage] || [])];

            return {
                ...prev,
                columns: {
                    ...prev.columns,
                    [oldStage]: oldColumn,
                    [newStage]: newColumn
                }
            };
        });

        try {
            const table = lead.leads_table || 'leads';
            const res = await api.put(`/leads/${table}/${lead.id}/crm-stage`, { stage: newStage });
            if (res.ok) {
                window.dispatchEvent(new CustomEvent('app:toast', {
                    detail: { message: `Lead movido para "${newStage}" com sucesso!`, type: 'success' }
                }));
            } else {
                fetchCRMData();
            }
        } catch (err) {
            console.error('Erro ao mover lead:', err);
            fetchCRMData();
            window.dispatchEvent(new CustomEvent('app:toast', {
                detail: { message: 'Erro ao salvar novo estágio do lead.', type: 'error' }
            }));
        }
    };

    const handleStageChangeFromModal = async (lead, newStage) => {
        await handleLeadDrop(lead, newStage);
    };

    const handleDeleteLead = async (lead) => {
        if (!lead) return;
        try {
            const table = lead.leads_table || 'leads';
            const res = await api.delete(`/leads/${table}/${lead.id}/full-delete`);
            if (res.ok) {
                // Remove do estado local
                setPipelineData(prev => {
                    const stageKey = lead.stage;
                    const updatedCol = (prev.columns[stageKey] || []).filter(l => l.id !== lead.id || l.leads_table !== lead.leads_table);
                    return {
                        ...prev,
                        columns: {
                            ...prev.columns,
                            [stageKey]: updatedCol
                        }
                    };
                });
                window.dispatchEvent(new CustomEvent('app:toast', {
                    detail: { message: `Contato "${lead.contato_nome || lead.telefone}" excluído com sucesso!`, type: 'success' }
                }));
            } else {
                const errData = await res.json().catch(() => ({}));
                window.dispatchEvent(new CustomEvent('app:toast', {
                    detail: { message: errData.detail || 'Erro ao excluir contato.', type: 'error' }
                }));
            }
        } catch (err) {
            console.error('Erro ao excluir lead:', err);
            window.dispatchEvent(new CustomEvent('app:toast', {
                detail: { message: 'Erro ao excluir contato.', type: 'error' }
            }));
        }
    };

    // Filtragem de busca, temperatura e período (Hoje, 7d, 14d, 30d, Mês)
    const filteredColumns = useMemo(() => {
        const result = {};
        const query = (search || '').toLowerCase().trim();
        const now = new Date();

        Object.keys(pipelineData.columns || {}).forEach(stageKey => {
            const list = pipelineData.columns[stageKey] || [];
            result[stageKey] = list.filter(lead => {
                // 1. Filtro de busca
                const name = (lead.contato_nome || '').toLowerCase();
                const phone = (lead.telefone || '').toLowerCase();
                const msg = (lead.mensagem || '').toLowerCase();
                const matchesSearch = !query || name.includes(query) || phone.includes(query) || msg.includes(query);

                // 2. Filtro de temperatura
                const isQuente = lead.lead_classification?.includes('Quente') || (lead.lead_score && lead.lead_score >= 70);
                const isMorno = lead.lead_classification?.includes('Morno') || (lead.lead_score && lead.lead_score >= 40 && lead.lead_score < 70);
                const isFrio = !isQuente && !isMorno;

                let matchesTemp = true;
                if (temperatureFilter === 'quente') matchesTemp = isQuente;
                else if (temperatureFilter === 'morno') matchesTemp = isMorno;
                else if (temperatureFilter === 'frio') matchesTemp = isFrio;

                // 3. Filtro de data / período
                let matchesDate = true;
                const rawDateStr = lead.ultima_mensagem_em || lead.created_at || lead.updated_at;
                let leadDate = null;
                if (rawDateStr) {
                    try {
                        leadDate = new Date(rawDateStr);
                    } catch {
                        leadDate = null;
                    }
                }

                if (dateFilter === 'today') {
                    matchesDate = leadDate ? leadDate.toDateString() === now.toDateString() : false;
                } else if (dateFilter === '7d') {
                    if (!leadDate) matchesDate = false;
                    else {
                        const diffMs = now - leadDate;
                        matchesDate = diffMs <= 7 * 24 * 60 * 60 * 1000 && diffMs >= -3600000;
                    }
                } else if (dateFilter === '14d') {
                    if (!leadDate) matchesDate = false;
                    else {
                        const diffMs = now - leadDate;
                        matchesDate = diffMs <= 14 * 24 * 60 * 60 * 1000 && diffMs >= -3600000;
                    }
                } else if (dateFilter === '30d') {
                    if (!leadDate) matchesDate = false;
                    else {
                        const diffMs = now - leadDate;
                        matchesDate = diffMs <= 30 * 24 * 60 * 60 * 1000 && diffMs >= -3600000;
                    }
                } else if (dateFilter === 'this_month') {
                    if (!leadDate) matchesDate = false;
                    else {
                        matchesDate = leadDate.getMonth() === now.getMonth() && leadDate.getFullYear() === now.getFullYear();
                    }
                } else if (dateFilter === 'custom_month' && selectedMonth) {
                    if (!leadDate) matchesDate = false;
                    else {
                        const [yearStr, monthStr] = selectedMonth.split('-');
                        matchesDate = leadDate.getFullYear() === parseInt(yearStr) && (leadDate.getMonth() + 1) === parseInt(monthStr);
                    }
                }

                return matchesSearch && matchesTemp && matchesDate;
            });
        });

        return result;
    }, [pipelineData.columns, search, temperatureFilter, dateFilter, selectedMonth]);

    // Recálculo dinâmico das estatísticas do topo baseado no filtro ativo
    const dynamicStats = useMemo(() => {
        let totalLeads = 0;
        let totalComprou = (filteredColumns.comprou || []).length;
        let totalEmAtendimento = (filteredColumns.em_atendimento || []).length;
        let totalRemarketing = (filteredColumns.remarketing || []).length;

        Object.keys(filteredColumns).forEach(k => {
            totalLeads += (filteredColumns[k] || []).length;
        });

        const conversionRate = totalLeads > 0 ? ((totalComprou / totalLeads) * 100).toFixed(1) : '0';

        return {
            total_leads: totalLeads,
            total_comprou: totalComprou,
            total_em_atendimento: totalEmAtendimento,
            total_remarketing: totalRemarketing,
            conversion_rate: conversionRate
        };
    }, [filteredColumns]);

    return (
        <div className="crm-container">
            <CRMHeader
                stats={dynamicStats}
                products={pipelineData.products || []}
                selectedProduct={selectedProduct}
                onProductChange={(newProd) => {
                    setSelectedProduct(newProd);
                    fetchCRMData(false, newProd);
                }}
                search={search}
                onSearchChange={setSearch}
                temperatureFilter={temperatureFilter}
                onTemperatureChange={setTemperatureFilter}
                dateFilter={dateFilter}
                onDateFilterChange={setDateFilter}
                selectedMonth={selectedMonth}
                onMonthChange={setSelectedMonth}
                onRefresh={() => fetchCRMData(false, selectedProduct)}
                loading={loading}
                onClose={() => navigate(-1)}
            />

            <CRMBoard
                columnsData={filteredColumns}
                onLeadClick={(lead) => setSelectedLead(lead)}
                onLeadDrop={handleLeadDrop}
                onDragStart={handleDragStart}
                onMassDispatch={(leads) => setMassDispatchModalLeads(leads)}
            />

            {selectedLead && (
                <CRMLeadDetailsModal
                    lead={selectedLead}
                    onClose={() => setSelectedLead(null)}
                    onStageChange={handleStageChangeFromModal}
                    onDeleteLead={handleDeleteLead}
                />
            )}

            {massDispatchModalLeads && (
                <CRMMassDispatchModal
                    leads={massDispatchModalLeads}
                    currentProduct={selectedProduct}
                    onClose={() => setMassDispatchModalLeads(null)}
                    onSuccess={() => fetchCRMData(true, selectedProduct)}
                />
            )}
        </div>
    );
};

export default CRM;
