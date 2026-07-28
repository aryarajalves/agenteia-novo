import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import ConfirmModal from './ConfirmModal';
import UnansweredQuestions from './UnansweredQuestions/index';
import TranscriptionHistory from './TranscriptionHistory/index';
import { useSearchParams } from 'react-router-dom';

function KnowledgeBaseList() {
    const [bases, setBases] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isDeleting, setIsDeleting] = useState(false);
    const [modalConfig, setModalConfig] = useState({ isOpen: false, baseId: null, baseName: '' });
    const [searchParams, setSearchParams] = useSearchParams();
    const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'bases');
    const [filterType, setFilterType] = useState('all'); // 'all', 'qa', 'product'
    const [selectedBases, setSelectedBases] = useState(new Set());
    const [isBulkDeleteConfirmOpen, setIsBulkDeleteConfirmOpen] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const BASES_PER_PAGE = 6;

    // Sincroniza a aba ativa quando a URL muda (ex: via navigate de outro componente)
    useEffect(() => {
        const tab = searchParams.get('tab') || 'bases';
        if (tab !== activeTab) {
            setActiveTab(tab);
        }
    }, [searchParams, activeTab]);

    const fetchBases = () => {
        setLoading(bases.length === 0);
        api.get('/knowledge-bases')
            .then(res => res.json())
            .then(data => {
                setBases(data);
                setLoading(false);
            })
            .catch(err => {
                console.error("Erro ao buscar bases:", err);
                setLoading(false);
            });
    };

    useEffect(() => {
        fetchBases();
    }, []);

    const handleExportJSON = async (e, baseId) => {
        e.preventDefault();
        e.stopPropagation();
        try {
            const res = await api.get(`/knowledge-bases/${baseId}/export`);
            if (!res.ok) throw new Error('Falha ao exportar base.');
            const data = await res.json();
            const jsonStr = JSON.stringify(data, null, 2);
            const blob = new Blob([jsonStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `base_conhecimento_${baseId}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            window.dispatchEvent(new CustomEvent('app:toast', { detail: { message: 'Base exportada com sucesso!', type: 'success' } }));
        } catch (err) {
            console.error('Erro ao exportar:', err);
            window.dispatchEvent(new CustomEvent('app:toast', { detail: { message: 'Erro ao exportar base.', type: 'error' } }));
        }
    };

    const handleImportNewJSON = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        e.target.value = '';
        try {
            const formData = new FormData();
            formData.append('file', file);
            const res = await api.post('/knowledge-bases/import-new', formData);
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.detail || 'Erro ao importar nova base.');
            }
            window.dispatchEvent(new CustomEvent('app:toast', { detail: { message: 'Nova base importada com sucesso!', type: 'success' } }));
            fetchBases();
        } catch (err) {
            console.error('Erro na importação:', err);
            window.dispatchEvent(new CustomEvent('app:toast', { detail: { message: err.message || 'Falha ao importar nova base.', type: 'error' } }));
        }
    };

    const handleDeleteClick = (e, id, name) => {
        e.preventDefault();
        setModalConfig({ isOpen: true, baseId: id, baseName: name });
    };

    const handleConfirmDelete = () => {
        const { baseId } = modalConfig;
        setIsDeleting(true);
        api.delete(`/knowledge-bases/${baseId}`)
            .then(res => {
                if (res.ok) {
                    setBases(bases.filter(b => b.id !== baseId));
                } else {
                    alert('Erro ao excluir');
                }
            })
            .catch(err => alert('Erro de conexão'))
            .finally(() => {
                setIsDeleting(false);
                setModalConfig({ isOpen: false, baseId: null, baseName: '' });
            });
    };

    const filteredBases = bases.filter(base => {
        if (filterType === 'all') return true;
        if (filterType === 'qa') return base.kb_type === 'qa';
        if (filterType === 'product') return base.kb_type === 'product';
        return true;
    });

    const totalPages = Math.max(1, Math.ceil(filteredBases.length / BASES_PER_PAGE));
    const paginatedBases = filteredBases.slice(
        (currentPage - 1) * BASES_PER_PAGE,
        currentPage * BASES_PER_PAGE
    );

    // Reseta para a primeira página quando o filtro muda ou a página atual fica fora do range
    useEffect(() => {
        setCurrentPage(1);
    }, [filterType]);

    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [totalPages, currentPage]);

    const toggleSelectBase = (id) => {
        const newSelected = new Set(selectedBases);
        if (newSelected.has(id)) newSelected.delete(id);
        else newSelected.add(id);
        setSelectedBases(newSelected);
    };

    const toggleSelectAllBases = () => {
        if (selectedBases.size === filteredBases.length && filteredBases.length > 0) {
            setSelectedBases(new Set());
        } else {
            setSelectedBases(new Set(filteredBases.map(b => b.id)));
        }
    };

    const handleBulkDelete = async () => {
        setIsDeleting(true);
        try {
            const response = await api.post('/knowledge-bases/batch-delete', {
                item_ids: Array.from(selectedBases).map(Number)
            });
            if (response.ok) {
                const idsToRemove = Array.from(selectedBases);
                setBases(prev => prev.filter(b => !idsToRemove.includes(b.id)));
                setSelectedBases(new Set());
            } else {
                alert('Erro ao excluir bases em massa');
            }
        } catch (err) {
            alert('Erro de conexão');
        } finally {
            setIsDeleting(false);
            setIsBulkDeleteConfirmOpen(false);
        }
    };

    return (
        <div className="dashboard-container">
            <div className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1>{activeTab === 'inbox' ? 'Inbox de Dúvidas' : 'Centrais de Conhecimento'}</h1>
                    <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                        {activeTab === 'inbox' 
                            ? 'Responda perguntas pendentes e melhore a inteligência dos seus agentes.' 
                            : 'Gerencie bibliotecas de respostas e ensine seus agentes.'}
                    </p>
                </div>
                {activeTab !== 'inbox' && (
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <label className="create-agent-btn" style={{ cursor: 'pointer', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', display: 'flex', alignItems: 'center', gap: '6px', padding: '0.8rem 1.2rem', borderRadius: '12px', fontSize: '0.9rem', fontWeight: 700 }}>
                            <span>📥</span> Importar Base (JSON)
                            <input type="file" accept=".json" onChange={handleImportNewJSON} style={{ display: 'none' }} />
                        </label>
                        <Link to="/knowledge-bases/new" className="create-agent-btn-shiny">
                            <span>+</span> Nova Base
                        </Link>
                    </div>
                )}            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                {activeTab !== 'inbox' && (
                    <div className="tab-control" style={{
                        display: 'flex',
                        gap: '1rem',
                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                        paddingBottom: '0.5rem'
                    }}>
                        <button
                            onClick={() => setSearchParams({ tab: 'bases' })}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: activeTab === 'bases' ? 'white' : 'var(--text-secondary)',
                                fontWeight: activeTab === 'bases' ? 800 : 500,
                                fontSize: '1rem',
                                cursor: 'pointer',
                                borderBottom: activeTab === 'bases' ? '2px solid #6366f1' : 'none',
                                paddingBottom: '0.5rem',
                                transition: 'all 0.2s'
                            }}
                        >
                            📚 Minhas Bases
                        </button>
                        <button
                            onClick={() => setSearchParams({ tab: 'history' })}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: activeTab === 'history' ? 'white' : 'var(--text-secondary)',
                                fontWeight: activeTab === 'history' ? 800 : 500,
                                fontSize: '1rem',
                                cursor: 'pointer',
                                borderBottom: activeTab === 'history' ? '2px solid #6366f1' : 'none',
                                paddingBottom: '0.5rem',
                                transition: 'all 0.2s'
                            }}
                        >
                            📜 Histórico
                        </button>
                    </div>
                )}

                {activeTab === 'bases' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                        <div className="filter-controls" style={{
                            display: 'flex',
                            gap: '8px',
                            background: 'rgba(255, 255, 255, 0.02)',
                            padding: '4px',
                            borderRadius: '12px',
                            border: '1px solid rgba(255, 255, 255, 0.05)'
                        }}>
                            {[
                                { id: 'all', label: 'Tudo', icon: '🌈' },
                                { id: 'qa', label: 'FAQ', icon: '💬' },
                                { id: 'product', label: 'Produtos', icon: '📦' }
                            ].map(f => (
                                <button
                                    key={f.id}
                                    onClick={() => setFilterType(f.id)}
                                    style={{
                                        padding: '6px 14px',
                                        borderRadius: '8px',
                                        border: 'none',
                                        fontSize: '0.8rem',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                        background: filterType === f.id ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                                        color: filterType === f.id ? '#818cf8' : '#64748b',
                                        boxShadow: filterType === f.id ? '0 4px 12px rgba(99, 102, 241, 0.1)' : 'none'
                                    }}
                                >
                                    <span style={{ opacity: filterType === f.id ? 1 : 0.6 }}>{f.icon}</span>
                                    {f.label}
                                </button>
                            ))}
                        </div>

                        {filteredBases.length > 0 && (
                            <button 
                                onClick={toggleSelectAllBases}
                                style={{ 
                                    background: 'rgba(255, 255, 255, 0.05)', 
                                    border: '1px solid rgba(255, 255, 255, 0.1)', 
                                    color: '#94a3b8', 
                                    padding: '8px 14px', 
                                    borderRadius: '10px', 
                                    fontSize: '0.8rem', 
                                    fontWeight: 700, 
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    transition: 'all 0.2s'
                                }}
                                onMouseOver={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'; e.currentTarget.style.color = '#fff'; }}
                                onMouseOut={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'; e.currentTarget.style.color = '#94a3b8'; }}
                            >
                                <div style={{ 
                                    width: '18px', height: '18px', borderRadius: '4px', border: '2px solid currentColor',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s',
                                    background: selectedBases.size === filteredBases.length ? '#6366f1' : 'transparent',
                                    borderColor: selectedBases.size === filteredBases.length ? '#6366f1' : 'currentColor'
                                }}>
                                    {selectedBases.size === filteredBases.length && (
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                                    )}
                                </div>
                                Selecionar Todas
                            </button>
                        )}
                    </div>
                )}
            </div>

            {selectedBases.size > 0 && activeTab === 'bases' && (
                <div style={{
                    position: 'fixed',
                    bottom: '2rem',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 1000,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    background: 'linear-gradient(90deg, #4f46e5 0%, #6366f1 100%)',
                    padding: '0.75rem 1.5rem',
                    borderRadius: '16px',
                    boxShadow: '0 12px 30px rgba(79, 70, 229, 0.4)',
                    animation: 'slideUpCentered 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                    color: '#fff',
                    fontSize: '0.9rem',
                    fontWeight: 600
                }}>
                    <span>{selectedBases.size} base{selectedBases.size !== 1 ? 's' : ''} selecionada{selectedBases.size !== 1 ? 's' : ''}</span>
                    <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.2)' }} />
                    <button 
                        onClick={() => setIsBulkDeleteConfirmOpen(true)}
                        style={{ 
                            background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', 
                            color: '#fff', borderRadius: '10px', padding: '8px 16px', cursor: 'pointer', 
                            display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', 
                            fontWeight: 700, transition: 'all 0.2s' 
                        }}
                        onMouseOver={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.25)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                        onMouseOut={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                    >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                        Excluir Selecionadas
                    </button>
                    <button 
                        onClick={() => setSelectedBases(new Set())}
                        style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.8)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}
                    >
                        Cancelar
                    </button>
                </div>
            )}

            {activeTab === 'bases' ? (
                loading ? (
                    <div className="loading">Carregando bases...</div>
                ) : (
                    <>
                    <div className="agents-grid">
                        {filteredBases.length === 0 ? (
                            <div className="empty-state" style={{
                                gridColumn: '1/-1',
                                padding: '4rem 2rem',
                                textAlign: 'center',
                                background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.4) 0%, rgba(15, 23, 42, 0.2) 100%)',
                                borderRadius: '2.5rem',
                                border: '1px solid rgba(255, 255, 255, 0.05)',
                                backdropFilter: 'blur(20px)',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '1.5rem'
                            }}>
                                <div>
                                    <h2 style={{ color: 'white', marginBottom: '0.75rem', fontSize: '1.8rem', fontWeight: 800 }}>Nenhuma base encontrada</h2>
                                    <p style={{ color: 'var(--text-secondary)', maxWidth: '450px', margin: '0 auto', fontSize: '1rem', lineHeight: '1.6' }}>
                                        {filterType === 'all'
                                            ? "Crie sua primeira biblioteca de conhecimento para começar a treinar seus agentes de IA com dados reais."
                                            : `Você ainda não possui bases do tipo ${filterType === 'qa' ? 'FAQ' : 'Produtos'}.`}
                                    </p>
                                </div>
                                {filterType === 'all' && (
                                    <Link to="/knowledge-bases/new" className="create-agent-btn" style={{ 
                                        marginTop: '1.5rem',
                                        padding: '1.2rem 2.5rem',
                                        fontSize: '1.1rem',
                                        background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                                        border: 'none',
                                        boxShadow: '0 10px 25px -5px rgba(99, 102, 241, 0.5)',
                                        transform: 'scale(1.05)',
                                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                                    }}>
                                        🚀 Criar Minha Primeira Base
                                    </Link>
                                )}

                            </div>
                        ) : (
                            paginatedBases.map(base => (
                                <div key={base.id} className="agent-card" style={{ position: 'relative' }}>
                                    <div 
                                        onClick={() => toggleSelectBase(base.id)}
                                        style={{
                                            position: 'absolute',
                                            top: '1rem',
                                            left: '1rem',
                                            width: '24px',
                                            height: '24px',
                                            borderRadius: '6px',
                                            background: selectedBases.has(base.id) ? '#6366f1' : 'rgba(255, 255, 255, 0.05)',
                                            border: '2px solid',
                                            borderColor: selectedBases.has(base.id) ? '#6366f1' : 'rgba(255, 255, 255, 0.1)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            cursor: 'pointer',
                                            zIndex: 10,
                                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                            boxShadow: selectedBases.has(base.id) ? '0 4px 12px rgba(99, 102, 241, 0.3)' : 'none'
                                        }}
                                        onMouseEnter={e => !selectedBases.has(base.id) && (e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)')}
                                        onMouseLeave={e => !selectedBases.has(base.id) && (e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)')}
                                    >
                                        {selectedBases.has(base.id) && (
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                                        )}
                                    </div>

                                    <div className="agent-card-header" style={{ paddingLeft: '2.5rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                                            <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>{base.kb_type === 'product' ? '📦' : '💬'}</span>
                                            <h3 title={base.name}>{base.name}</h3>
                                        </div>
                                        <span className="agent-model-badge" style={{ flexShrink: 0 }}>
                                            KB #{base.id}
                                        </span>
                                    </div>
                                    <p className="agent-description" style={{ minHeight: '2.9rem' }}>
                                        {base.description || "Sem descrição definida para esta base de conhecimento."}
                                    </p>

                                    <div style={{ display: 'flex', gap: '8px', marginBottom: '1.5rem' }}>
                                        <span style={{
                                            fontSize: '0.65rem',
                                            padding: '3px 8px',
                                            borderRadius: '6px',
                                            background: base.kb_type === 'product' ? 'rgba(168, 85, 247, 0.1)' : 'rgba(99, 102, 241, 0.1)',
                                            color: base.kb_type === 'product' ? '#a855f7' : '#6366f1',
                                            fontWeight: 800,
                                            textTransform: 'uppercase'
                                        }}>
                                            {base.kb_type === 'product' ? 'Catálogo' : 'FAQ / QA'}
                                        </span>
                                    </div>

                                    <div className="kb-stat">
                                        <span className="kb-stat-value">{base.items?.length || 0}</span>
                                        <span className="kb-stat-label">Itens de Conhecimento</span>
                                    </div>

                                    <div className="agent-actions">
                                        <Link to={`/knowledge-bases/${base.id}?view=content`} className="access-btn">
                                            Editar Conteúdo
                                        </Link>
                                        <button
                                            onClick={(e) => handleExportJSON(e, base.id)}
                                            className="delete-btn"
                                            style={{ background: 'rgba(255,255,255,0.05)', color: '#818cf8' }}
                                            title="Exportar Base (JSON)"
                                        >
                                            📤
                                        </button>
                                        <Link 
                                            to={`/knowledge-bases/${base.id}?view=metadata`} 
                                            className="delete-btn" 
                                            style={{ background: 'rgba(255,255,255,0.05)', color: '#94a3b8' }}
                                            title="Configurações da Base"
                                        >
                                            ⚙️
                                        </Link>
                                        <button
                                            onClick={(e) => handleDeleteClick(e, base.id, base.name)}
                                            className="delete-btn"
                                            title="Excluir Base"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {filteredBases.length > 0 && totalPages > 1 && (
                        <div style={{
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            gap: '0.5rem',
                            marginTop: '2.5rem'
                        }}>
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                style={{
                                    padding: '0.6rem 1rem',
                                    borderRadius: '10px',
                                    border: '1px solid rgba(255, 255, 255, 0.08)',
                                    background: 'rgba(255, 255, 255, 0.03)',
                                    color: currentPage === 1 ? '#475569' : '#e2e8f0',
                                    fontWeight: 700,
                                    fontSize: '0.85rem',
                                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                                    transition: 'all 0.2s'
                                }}
                            >
                                ← Anterior
                            </button>

                            <div style={{ display: 'flex', gap: '0.4rem' }}>
                                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                    <button
                                        key={page}
                                        onClick={() => setCurrentPage(page)}
                                        style={{
                                            width: '38px',
                                            height: '38px',
                                            borderRadius: '10px',
                                            border: page === currentPage ? 'none' : '1px solid rgba(255, 255, 255, 0.08)',
                                            background: page === currentPage
                                                ? 'linear-gradient(135deg, #6366f1, #a855f7)'
                                                : 'rgba(255, 255, 255, 0.03)',
                                            color: page === currentPage ? '#fff' : '#94a3b8',
                                            fontWeight: 800,
                                            fontSize: '0.85rem',
                                            cursor: 'pointer',
                                            boxShadow: page === currentPage ? '0 4px 12px rgba(99, 102, 241, 0.35)' : 'none',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        {page}
                                    </button>
                                ))}
                            </div>

                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                style={{
                                    padding: '0.6rem 1rem',
                                    borderRadius: '10px',
                                    border: '1px solid rgba(255, 255, 255, 0.08)',
                                    background: 'rgba(255, 255, 255, 0.03)',
                                    color: currentPage === totalPages ? '#475569' : '#e2e8f0',
                                    fontWeight: 700,
                                    fontSize: '0.85rem',
                                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                                    transition: 'all 0.2s'
                                }}
                            >
                                Próxima →
                            </button>
                        </div>
                    )}
                    </>
                )
            ) : activeTab === 'inbox' ? (
                <UnansweredQuestions />
            ) : (
                <TranscriptionHistory onKnowledgeBaseUpdate={fetchBases} />
            )}

            <ConfirmModal
                isOpen={modalConfig.isOpen}
                title="Excluir Base"
                message={`Deseja realmente excluir a base "${modalConfig.baseName}"? Todos os agentes vinculados a ela perderão este conhecimento.`}
                onConfirm={handleConfirmDelete}
                onCancel={() => setModalConfig({ isOpen: false, baseId: null, baseName: '' })}
                confirmText="Excluir"
                cancelText="Cancelar"
                type="danger"
                isLoading={isDeleting}
            />

            <ConfirmModal
                isOpen={isBulkDeleteConfirmOpen}
                title="Excluir em Massa"
                message={`Você está prestes a excluir ${selectedBases.size} bases de conhecimento. Esta ação é irreversível e afetará todos os agentes vinculados. Deseja continuar?`}
                onConfirm={handleBulkDelete}
                onCancel={() => setIsBulkDeleteConfirmOpen(false)}
                confirmText={`Excluir ${selectedBases.size} Bases`}
                cancelText="Cancelar"
                type="danger"
                isLoading={isDeleting}
            />
        </div>
    );
}

export default KnowledgeBaseList;
