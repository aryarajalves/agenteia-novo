import React, { useState, useEffect } from 'react';
import { api } from '../../../api/client';

const CRMMassDispatchModal = ({
    leads = [],
    onClose,
    onSuccess,
    currentProduct = 'all'
}) => {
    const [selectedLeadIds, setSelectedLeadIds] = useState(leads.map(l => `${l.leads_table}_${l.id}`));
    const [templateName, setTemplateName] = useState('');
    const [templateLanguage, setTemplateLanguage] = useState('pt_BR');
    const [templates, setTemplates] = useState([]);
    const [loadingTemplates, setLoadingTemplates] = useState(false);
    const [dispatching, setDispatching] = useState(false);
    const [filterQuery, setFilterQuery] = useState('');

    useEffect(() => {
        // Tenta buscar os templates oficiais do WhatsApp no ZapVoice
        const fetchTemplates = async () => {
            setLoadingTemplates(true);
            try {
                const res = await api.get('/integrations/zapvoice/whatsapp-templates');
                if (res.ok) {
                    const data = await res.json();
                    if (data.templates && Array.isArray(data.templates)) {
                        setTemplates(data.templates);
                    }
                }
            } catch (err) {
                console.warn('Não foi possível sincronizar templates ZapVoice automaticamente:', err);
            } finally {
                setLoadingTemplates(false);
            }
        };

        fetchTemplates();
    }, []);

    const toggleSelectAll = () => {
        if (selectedLeadIds.length === leads.length) {
            setSelectedLeadIds([]);
        } else {
            setSelectedLeadIds(leads.map(l => `${l.leads_table}_${l.id}`));
        }
    };

    const toggleLead = (key) => {
        if (selectedLeadIds.includes(key)) {
            setSelectedLeadIds(selectedLeadIds.filter(id => id !== key));
        } else {
            setSelectedLeadIds([...selectedLeadIds, key]);
        }
    };

    const handleExecuteDispatch = async () => {
        if (!templateName.trim()) {
            window.dispatchEvent(new CustomEvent('app:toast', {
                detail: { message: 'Informe ou selecione o nome do template oficial.', type: 'error' }
            }));
            return;
        }

        const selectedLeadsList = leads.filter(l => selectedLeadIds.includes(`${l.leads_table}_${l.id}`));
        if (selectedLeadsList.length === 0) {
            window.dispatchEvent(new CustomEvent('app:toast', {
                detail: { message: 'Selecione pelo menos um contato para o disparo.', type: 'error' }
            }));
            return;
        }

        setDispatching(true);
        try {
            const res = await api.post('/leads/crm/mass-dispatch', {
                leads: selectedLeadsList.map(l => ({
                    id: l.id,
                    leads_table: l.leads_table,
                    telefone: l.telefone,
                    conversa_id: l.conversa_id,
                    conta_id: l.conta_id,
                    webhook_config_id: l.webhook_config_id,
                    contato_nome: l.contato_nome
                })),
                template_name: templateName.trim(),
                template_language: templateLanguage,
                product_name: currentProduct
            });

            if (res.ok) {
                const data = await res.json();
                window.dispatchEvent(new CustomEvent('app:toast', {
                    detail: { 
                        message: `🚀 Disparo concluído! ${data.sent_count} enviado(s)${data.failed_count > 0 ? `, ${data.failed_count} falha(s)` : ''}.`, 
                        type: data.sent_count > 0 ? 'success' : 'error' 
                    }
                }));
                if (onSuccess) onSuccess();
                onClose();
            } else {
                const errData = await res.json().catch(() => ({}));
                window.dispatchEvent(new CustomEvent('app:toast', {
                    detail: { message: errData.detail || 'Erro ao realizar disparo em massa.', type: 'error' }
                }));
            }
        } catch (err) {
            console.error('Erro no disparo em massa:', err);
            window.dispatchEvent(new CustomEvent('app:toast', {
                detail: { message: 'Erro de conexão no disparo em massa.', type: 'error' }
            }));
        } finally {
            setDispatching(false);
        }
    };

    const filteredLeads = leads.filter(l => {
        if (!filterQuery) return true;
        const q = filterQuery.toLowerCase();
        return (l.contato_nome && l.contato_nome.toLowerCase().includes(q)) ||
               (l.telefone && l.telefone.includes(q));
    });

    return (
        <div className="crm-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget && !dispatching) onClose(); }}>
            <div className="crm-modal-content" style={{ maxWidth: '640px', width: '92%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
                <div className="crm-modal-header" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <div style={{ fontSize: '1.6rem', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', width: '42px', height: '42px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            🚀
                        </div>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#f8fafc' }}>
                                Disparo em Massa • Esteira do Próximo Produto
                            </h2>
                            <p style={{ margin: '3px 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
                                Dispare um Template Oficial do WhatsApp (ZapVoice) para os alunos que já compraram.
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={dispatching}
                        className="crm-btn-close-fullscreen"
                        style={{ padding: '0.4rem 0.6rem' }}
                    >
                        ✕
                    </button>
                </div>

                <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.25rem', paddingRight: '0.35rem' }}>
                    {/* Escolha do Template Oficial */}
                    <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', padding: '1rem' }}>
                        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#e2e8f0', marginBottom: '0.5rem' }}>
                            📱 Template Oficial WhatsApp (Meta / ZapVoice):
                        </label>
                        {templates.length > 0 ? (
                            <select
                                value={templateName}
                                onChange={(e) => setTemplateName(e.target.value)}
                                className="premium-input"
                                style={{ width: '100%', padding: '0.55rem 0.75rem', background: '#0f172a', color: '#f8fafc', border: '1px solid #334155', borderRadius: '8px', fontSize: '0.85rem' }}
                            >
                                <option value="">Selecione um template aprovado...</option>
                                {templates.map(t => (
                                    <option key={t.name || t.id} value={t.name}>
                                        {t.name} ({t.language || 'pt_BR'})
                                    </option>
                                ))}
                            </select>
                        ) : (
                            <input
                                type="text"
                                placeholder="Digite o nome do template (ex: mentoria_convite_vip)"
                                value={templateName}
                                onChange={(e) => setTemplateName(e.target.value)}
                                className="premium-input"
                                style={{ width: '100%', padding: '0.55rem 0.75rem', fontSize: '0.85rem' }}
                            />
                        )}
                    </div>

                    {/* Seleção dos Contatos */}
                    <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#e2e8f0' }}>
                                👥 Alunos Selecionados: <strong style={{ color: '#34d399' }}>{selectedLeadIds.length}</strong> de {leads.length}
                            </span>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button
                                    type="button"
                                    onClick={toggleSelectAll}
                                    style={{
                                        background: 'rgba(99, 102, 241, 0.15)',
                                        border: '1px solid rgba(99, 102, 241, 0.3)',
                                        color: '#a5b4fc',
                                        padding: '4px 10px',
                                        borderRadius: '6px',
                                        fontSize: '0.74rem',
                                        fontWeight: 700,
                                        cursor: 'pointer'
                                    }}
                                >
                                    {selectedLeadIds.length === leads.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
                                </button>
                            </div>
                        </div>

                        <input
                            type="text"
                            placeholder="Filtrar por nome ou telefone..."
                            value={filterQuery}
                            onChange={(e) => setFilterQuery(e.target.value)}
                            className="premium-input"
                            style={{ width: '100%', padding: '0.45rem 0.65rem', fontSize: '0.8rem' }}
                        />

                        <div className="custom-scrollbar" style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '8px', padding: '0.4rem' }}>
                            {filteredLeads.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '1rem', color: '#64748b', fontSize: '0.78rem' }}>
                                    Nenhum aluno encontrado no filtro.
                                </div>
                            ) : (
                                filteredLeads.map(l => {
                                    const key = `${l.leads_table}_${l.id}`;
                                    const isSelected = selectedLeadIds.includes(key);
                                    return (
                                        <div
                                            key={key}
                                            onClick={() => toggleLead(key)}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                padding: '0.45rem 0.65rem',
                                                borderRadius: '6px',
                                                background: isSelected ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                                                border: isSelected ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid transparent',
                                                cursor: 'pointer',
                                                transition: 'all 0.15s'
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => {}}
                                                    style={{ cursor: 'pointer' }}
                                                />
                                                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#f1f5f9' }}>
                                                    {l.contato_nome || 'Sem Nome'}
                                                </span>
                                            </div>
                                            <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontFamily: 'monospace' }}>
                                                📱 {l.telefone}
                                            </span>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>

                {/* Rodapé de Ações */}
                <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '1rem', marginTop: '1.25rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={dispatching}
                        className="btn-cancel"
                        style={{ padding: '0.6rem 1.25rem', fontSize: '0.85rem' }}
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={handleExecuteDispatch}
                        disabled={dispatching || selectedLeadIds.length === 0 || !templateName.trim()}
                        className="btn-save-webhook"
                        style={{
                            padding: '0.6rem 1.5rem',
                            fontSize: '0.85rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            background: 'linear-gradient(135deg, #10b981, #059669)',
                            border: 'none',
                            cursor: dispatching || selectedLeadIds.length === 0 ? 'not-allowed' : 'pointer',
                            opacity: dispatching || selectedLeadIds.length === 0 ? 0.6 : 1
                        }}
                    >
                        <span>{dispatching ? '⏳' : '🚀'}</span>
                        <span>{dispatching ? 'Disparando...' : `Iniciar Disparo (${selectedLeadIds.length})`}</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CRMMassDispatchModal;
