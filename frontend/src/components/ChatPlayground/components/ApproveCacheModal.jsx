import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { api } from '../../../api/client';
import LinkExistingCacheSection from './LinkExistingCacheSection';
import CacheThresholdControl from '../../ConfigPanel/components/Modals/CacheThresholdControl';
import ProductCategoryTagSelector from '../../ConfigPanel/components/Modals/ProductCategoryTagSelector';
import FullscreenTextareaModal from '../../WebhookManager/components/FullscreenTextareaModal';
import AlternateQueriesInput from '../../ConfigPanel/components/Modals/AlternateQueriesInput';

const ApproveCacheModal = ({ modal, agentId, onConfirm, onLinkExisting, onCancel, isSaving, defaultThreshold = 92 }) => {
    const [mode, setMode] = useState('new'); // 'new' | 'link'
    const [query, setQuery] = useState('');
    const [response, setResponse] = useState('');
    const [alternateQueries, setAlternateQueries] = useState([]);
    const [similarityThreshold, setSimilarityThreshold] = useState(null);
    const [categoryTag, setCategoryTag] = useState('');
    const [isMaximized, setIsMaximized] = useState(false);
    const [isFullscreenOpen, setIsFullscreenOpen] = useState(false);

    // Estados para o modo 'link' (Vincular a resposta existente)
    const [existingItems, setExistingItems] = useState([]);
    const [selectedCacheId, setSelectedCacheId] = useState('');
    const [loadingExisting, setLoadingExisting] = useState(false);

    useEffect(() => {
        if (modal) {
            setQuery(modal.userMsg || '');
            setResponse(modal.msg?.content || '');
            setAlternateQueries([]);
            setSimilarityThreshold(null);
            setCategoryTag('');
            setIsMaximized(false);
            setMode('new');

            // Carregar itens existentes caso o usuário queira vincular
            if (agentId) {
                setLoadingExisting(true);
                api.get(`/semantic-cache?agent_id=${agentId}&page_size=100`)
                    .then(async (res) => {
                        if (res.ok) {
                            const data = await res.json();
                            const items = data.items || data || [];
                            setExistingItems(items);
                            if (items.length > 0) {
                                setSelectedCacheId(String(items[0].id));
                            }
                        }
                    })
                    .catch(err => console.error("Erro ao carregar respostas do cache:", err))
                    .finally(() => setLoadingExisting(false));
            }
        }
    }, [modal, agentId]);

    if (!modal) return null;

    const handleSubmitNew = (e) => {
        e.preventDefault();
        if (!query.trim() || !response.trim()) return;
        onConfirm(query.trim(), response.trim(), alternateQueries, similarityThreshold, categoryTag.trim() || null);
    };

    const handleLinkSubmit = (e) => {
        e.preventDefault();
        if (!selectedCacheId || !query.trim()) return;
        const targetItem = existingItems.find(it => String(it.id) === String(selectedCacheId));
        if (onLinkExisting) {
            onLinkExisting({
                cacheId: Number(selectedCacheId),
                newVariation: query.trim(),
                existingAlternateQueries: targetItem?.alternate_queries || []
            });
        }
    };

    return ReactDOM.createPortal(
        <>
            <div
                className="modal-backdrop"
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                background: 'rgba(0, 0, 0, 0.78)',
                backdropFilter: 'blur(8px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 999999,
                transition: 'all 0.2s ease'
            }}
        >
            <div
                className="modal-panel"
                style={{
                    background: '#0f172a',
                    border: '1px solid rgba(16, 185, 129, 0.35)',
                    borderRadius: '16px',
                    padding: isMaximized ? '32px' : '26px',
                    maxWidth: isMaximized ? '920px' : '650px',
                    width: '92%',
                    maxHeight: '92vh',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '0 25px 60px rgba(0, 0, 0, 0.85)',
                    color: '#f8fafc',
                    position: 'relative',
                    transition: 'all 0.25s ease'
                }}
            >
                {/* Header com Fechar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h3 style={{ margin: 0, fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px', color: '#fff' }}>
                        ⚡ Salvar no Cache Semântico
                    </h3>
                    <button
                        onClick={onCancel}
                        disabled={isSaving}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#94a3b8',
                            fontSize: '1.25rem',
                            cursor: 'pointer'
                        }}
                    >
                        ✕
                    </button>
                </div>

                {/* Abas de Modo: Nova Resposta vs Vincular a Existente */}
                <div style={{
                    display: 'flex',
                    gap: '8px',
                    background: 'rgba(15, 23, 42, 0.8)',
                    padding: '4px',
                    borderRadius: '10px',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    marginBottom: '14px'
                }}>
                    <button
                        type="button"
                        data-testid="tab-mode-new-btn"
                        onClick={() => setMode('new')}
                        style={{
                            flex: 1,
                            padding: '8px 12px',
                            borderRadius: '8px',
                            border: 'none',
                            background: mode === 'new' ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                            color: mode === 'new' ? '#34d399' : '#94a3b8',
                            fontWeight: 700,
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        ✨ Criar Nova Resposta
                    </button>
                    <button
                        type="button"
                        data-testid="tab-mode-link-btn"
                        onClick={() => setMode('link')}
                        style={{
                            flex: 1,
                            padding: '8px 12px',
                            borderRadius: '8px',
                            border: 'none',
                            background: mode === 'link' ? 'rgba(99, 102, 241, 0.25)' : 'transparent',
                            color: mode === 'link' ? '#a5b4fc' : '#94a3b8',
                            fontWeight: 700,
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        🔗 Vincular a Resposta Existente
                    </button>
                </div>

                {/* ===================== MODO 1: CRIAR NOVA RESPOSTA ===================== */}
                {mode === 'new' && (
                    <form onSubmit={handleSubmitNew} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '18px', flex: 1, overflowY: 'auto' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#a5b4fc', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                                    ❓ Pergunta Principal / Intenção (Editável)
                                </label>
                                <input
                                    type="text"
                                    data-testid="approve-cache-query-input"
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    placeholder="Digite a intenção da pergunta principal..."
                                    style={{
                                        width: '100%',
                                        background: 'rgba(15, 23, 42, 0.9)',
                                        border: '1px solid rgba(99, 102, 241, 0.35)',
                                        borderRadius: '8px',
                                        padding: '9px 13px',
                                        fontSize: '0.9rem',
                                        color: '#fff',
                                        outline: 'none',
                                        boxSizing: 'border-box'
                                    }}
                                />
                            </div>

                            {/* Variações de Perguntas com Edição Inline */}
                            <AlternateQueriesInput
                                queries={alternateQueries}
                                onChange={setAlternateQueries}
                                testIdInput="approve-cache-alt-input"
                                testIdAddBtn="add-alt-query-btn"
                            />

                            {/* Tag de Produto / Categoria */}
                            <ProductCategoryTagSelector
                                value={categoryTag}
                                onChange={setCategoryTag}
                                agentId={agentId}
                            />

                            {/* Limiar de Similaridade Individual / Padrão */}
                            <CacheThresholdControl
                                value={similarityThreshold}
                                onChange={setSimilarityThreshold}
                                defaultThreshold={defaultThreshold}
                            />

                            {/* Resposta Aprovada */}
                            <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                        💬 Resposta Aprovada do Agente (Editável)
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => setIsFullscreenOpen(true)}
                                        data-testid="toggle-maximize-response-btn"
                                        style={{
                                            background: 'rgba(16, 185, 129, 0.15)',
                                            border: '1px solid rgba(16, 185, 129, 0.35)',
                                            borderRadius: '6px',
                                            color: '#34d399',
                                            padding: '4px 10px',
                                            fontSize: '0.78rem',
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '5px'
                                        }}
                                    >
                                        ⛶ Maximizar Campo
                                    </button>
                                </div>
                                <textarea
                                    data-testid="approve-cache-response-input"
                                    value={response}
                                    onChange={(e) => setResponse(e.target.value)}
                                    rows={5}
                                    placeholder="Digite a resposta perfeita do agente..."
                                    style={{
                                        width: '100%',
                                        minHeight: '120px',
                                        maxHeight: '200px',
                                        background: 'rgba(15, 23, 42, 0.9)',
                                        border: '1px solid rgba(16, 185, 129, 0.35)',
                                        borderRadius: '8px',
                                        padding: '11px 13px',
                                        fontSize: '0.88rem',
                                        color: '#cbd5e1',
                                        lineHeight: '1.5',
                                        resize: 'vertical',
                                        boxSizing: 'border-box'
                                    }}
                                />
                            </div>

                            {/* Footer do formulário */}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: 'auto' }}>
                                <button
                                    type="button"
                                    onClick={onCancel}
                                    disabled={isSaving}
                                    style={{
                                        padding: '9px 18px',
                                        borderRadius: '8px',
                                        border: '1px solid rgba(255, 255, 255, 0.12)',
                                        background: 'rgba(255, 255, 255, 0.05)',
                                        color: '#cbd5e1',
                                        fontSize: '0.85rem',
                                        fontWeight: 600,
                                        cursor: 'pointer'
                                    }}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSaving || !query.trim() || !response.trim()}
                                    data-testid="confirm-approve-cache-btn"
                                    style={{
                                        padding: '9px 22px',
                                        borderRadius: '8px',
                                        background: (!query.trim() || !response.trim()) ? 'rgba(16, 185, 129, 0.3)' : 'linear-gradient(135deg, #10b981, #059669)',
                                        border: 'none',
                                        color: '#fff',
                                        fontWeight: 700,
                                        cursor: isSaving ? 'wait' : 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)'
                                    }}
                                >
                                    {isSaving ? '⏳ Salvando no Cache...' : '⚡ Sim, Salvar no Cache'}
                                </button>
                            </div>
                        </div>
                    </form>
                )}

                {/* ===================== MODO 2: VINCULAR A RESPOSTA EXISTENTE COM FILTRO ===================== */}
                {mode === 'link' && (
                    <LinkExistingCacheSection
                        query={query}
                        setQuery={setQuery}
                        existingItems={existingItems}
                        loadingExisting={loadingExisting}
                        selectedCacheId={selectedCacheId}
                        setSelectedCacheId={setSelectedCacheId}
                        onLinkSubmit={handleLinkSubmit}
                        onCancel={onCancel}
                        isSaving={isSaving}
                    />
                )}
            </div>
        </div>

        {/* Popup Gigante de Edição em Tela Cheia */}
        <FullscreenTextareaModal
            isOpen={isFullscreenOpen}
            title="💬 Resposta Aprovada do Agente"
            subtitle="Edição expandida e confortável da resposta oficial que o agente responderá sem gastar tokens."
            value={response}
            onChange={(newVal) => setResponse(newVal)}
            onClose={() => setIsFullscreenOpen(false)}
            placeholder="Digite a resposta perfeita do agente..."
            accentColor="#10b981"
        />
    </>,
    document.body
    );
};

export default ApproveCacheModal;
