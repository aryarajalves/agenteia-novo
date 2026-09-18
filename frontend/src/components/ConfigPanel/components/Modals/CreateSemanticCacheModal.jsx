import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import CacheThresholdControl from './CacheThresholdControl';
import ProductCategoryTagSelector from './ProductCategoryTagSelector';
import LinkExistingCacheSection from '../../../ChatPlayground/components/LinkExistingCacheSection';
import FullscreenTextareaModal from '../../../WebhookManager/components/FullscreenTextareaModal';
import AlternateQueriesInput from './AlternateQueriesInput';
import { api } from '../../../../api/client';

const CreateSemanticCacheModal = ({
    isOpen,
    onClose,
    onSave,
    onLinkExisting,
    isSaving,
    defaultThreshold = 92,
    initialData = null,
    agentId = null,
    existingItems: propExistingItems = null
}) => {
    const [mode, setMode] = useState('new'); // 'new' | 'link'
    const [userQuery, setUserQuery] = useState('');
    const [approvedResponse, setApprovedResponse] = useState('');
    const [alternateQueries, setAlternateQueries] = useState([]);
    const [similarityThreshold, setSimilarityThreshold] = useState(null);
    const [categoryTag, setCategoryTag] = useState('');
    const [isFullscreenOpen, setIsFullscreenOpen] = useState(false);

    // Estados para o modo 'link'
    const [existingItems, setExistingItems] = useState([]);
    const [selectedCacheId, setSelectedCacheId] = useState('');
    const [searchLink, setSearchLink] = useState('');
    const [loadingExisting, setLoadingExisting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setUserQuery(initialData?.user_query || '');
            setApprovedResponse(initialData?.approved_response || '');
            setAlternateQueries(initialData?.alternate_queries || []);
            setSimilarityThreshold(initialData?.similarity_threshold ?? null);
            setCategoryTag(initialData?.category_tag || '');
            setIsFullscreenOpen(false);
            setMode('new');

            // Carregar itens existentes para vincular como variação
            if (propExistingItems && Array.isArray(propExistingItems) && propExistingItems.length > 0) {
                setExistingItems(propExistingItems);
                setSelectedCacheId(String(propExistingItems[0].id));
            } else if (agentId) {
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
    }, [isOpen, initialData, agentId, propExistingItems]);

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!userQuery.trim() || !approvedResponse.trim()) return;
        onSave({
            user_query: userQuery.trim(),
            approved_response: approvedResponse.trim(),
            alternate_queries: alternateQueries,
            similarity_threshold: similarityThreshold,
            category_tag: categoryTag.trim() || null
        });
    };

    const handleLinkSubmit = (e) => {
        if (e) e.preventDefault();
        if (!userQuery.trim() || !selectedCacheId) return;
        const targetItem = existingItems.find(it => String(it.id) === String(selectedCacheId));
        if (onLinkExisting) {
            onLinkExisting({
                cacheId: Number(selectedCacheId),
                newVariation: userQuery.trim(),
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
                        padding: '26px',
                        maxWidth: '680px',
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
                    {/* Header com Abas de Modo */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                        <div style={{ display: 'flex', gap: '8px', background: 'rgba(15, 23, 42, 0.8)', padding: '4px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                            <button
                                type="button"
                                data-testid="tab-mode-new"
                                onClick={() => setMode('new')}
                                style={{
                                    padding: '6px 14px',
                                    borderRadius: '7px',
                                    border: 'none',
                                    background: mode === 'new' ? 'rgba(16, 185, 129, 0.25)' : 'transparent',
                                    color: mode === 'new' ? '#34d399' : '#94a3b8',
                                    fontWeight: 700,
                                    fontSize: '0.85rem',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}
                            >
                                <span>✨ Cadastrar Nova Resposta no Cache</span>
                            </button>

                            <button
                                type="button"
                                data-testid="tab-mode-link"
                                onClick={() => setMode('link')}
                                style={{
                                    padding: '6px 14px',
                                    borderRadius: '7px',
                                    border: 'none',
                                    background: mode === 'link' ? 'rgba(56, 189, 248, 0.25)' : 'transparent',
                                    color: mode === 'link' ? '#38bdf8' : '#94a3b8',
                                    fontWeight: 700,
                                    fontSize: '0.85rem',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}
                            >
                                <span>🔗 Vincular como Variação</span>
                            </button>
                        </div>

                        <button
                            onClick={onClose}
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

                    {mode === 'new' ? (
                        <>
                            <p style={{ color: '#94a3b8', fontSize: '0.84rem', lineHeight: '1.4', marginBottom: '14px' }}>
                                Cadastre a pergunta principal, as possíveis formas que o cliente pode perguntar e a resposta aprovada. O agente responderá com <strong>custo R$ 0,00 e 0 tokens</strong>.
                            </p>

                            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '18px', flex: 1, overflowY: 'auto' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#c7d2fe', marginBottom: '6px' }}>
                                            ❓ Pergunta Principal / Intenção:
                                        </label>
                                        <input
                                            type="text"
                                            value={userQuery}
                                            onChange={(e) => setUserQuery(e.target.value)}
                                            data-testid="create-cache-query-input"
                                            required
                                            style={{
                                                width: '100%',
                                                background: 'rgba(15, 23, 42, 0.8)',
                                                border: '1px solid rgba(99, 102, 241, 0.3)',
                                                borderRadius: '8px',
                                                padding: '9px 13px',
                                                color: '#fff',
                                                fontSize: '0.9rem',
                                                boxSizing: 'border-box'
                                            }}
                                            placeholder="Ex: quanto custa o treinamento?"
                                        />
                                    </div>

                                    {/* Variações / Outras Perguntas com Edição */}
                                    <AlternateQueriesInput
                                        queries={alternateQueries}
                                        onChange={setAlternateQueries}
                                        testIdInput="create-cache-alt-input"
                                        testIdAddBtn="create-add-alt-btn"
                                    />

                                    {/* Tag de Produto / Categoria */}
                                    <ProductCategoryTagSelector
                                        value={categoryTag}
                                        onChange={setCategoryTag}
                                        agentId={agentId}
                                    />

                                    {/* Limiar de Similaridade Customizado */}
                                    <CacheThresholdControl
                                        value={similarityThreshold}
                                        onChange={setSimilarityThreshold}
                                        defaultThreshold={defaultThreshold}
                                    />

                                    {/* Resposta Aprovada */}
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#6ee7b7' }}>
                                                💬 Resposta Aprovada do Agente (Custo Zero):
                                            </label>
                                            <button
                                                type="button"
                                                data-testid="toggle-maximize-create-response-btn"
                                                onClick={() => setIsFullscreenOpen(true)}
                                                style={{
                                                    background: 'transparent',
                                                    border: 'none',
                                                    color: '#34d399',
                                                    fontSize: '0.75rem',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '4px'
                                                }}
                                            >
                                                ⛶ Maximizar Campo
                                            </button>
                                        </div>
                                        <textarea
                                            value={approvedResponse}
                                            onChange={(e) => setApprovedResponse(e.target.value)}
                                            data-testid="create-cache-response-input"
                                            rows={5}
                                            required
                                            style={{
                                                width: '100%',
                                                height: '110px',
                                                background: 'rgba(15, 23, 42, 0.8)',
                                                border: '1px solid rgba(16, 185, 129, 0.3)',
                                                borderRadius: '8px',
                                                padding: '10px 13px',
                                                color: '#fff',
                                                fontSize: '0.9rem',
                                                fontFamily: 'inherit',
                                                resize: 'vertical',
                                                boxSizing: 'border-box'
                                            }}
                                            placeholder="Digite a resposta oficial exata que o agente deve enviar ao cliente..."
                                        />
                                    </div>
                                </div>

                                {/* Footer */}
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: 'auto' }}>
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        disabled={isSaving}
                                        style={{
                                            padding: '9px 18px',
                                            borderRadius: '8px',
                                            border: '1px solid rgba(255, 255, 255, 0.1)',
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
                                        disabled={isSaving || !userQuery.trim() || !approvedResponse.trim()}
                                        data-testid="save-create-cache-btn"
                                        style={{
                                            padding: '9px 20px',
                                            borderRadius: '8px',
                                            border: 'none',
                                            background: 'linear-gradient(135deg, #059669, #10b981)',
                                            color: '#fff',
                                            fontSize: '0.88rem',
                                            fontWeight: 700,
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)'
                                        }}
                                    >
                                        {isSaving ? 'Salvando...' : '⚡ Salvar no Cache'}
                                    </button>
                                </div>
                            </form>
                        </>
                    ) : (
                        <LinkExistingCacheSection
                            query={userQuery}
                            setQuery={setUserQuery}
                            existingItems={existingItems}
                            loadingExisting={loadingExisting}
                            selectedCacheId={selectedCacheId}
                            setSelectedCacheId={setSelectedCacheId}
                            onLinkSubmit={handleLinkSubmit}
                            onCancel={onClose}
                            isSaving={isSaving}
                        />
                    )}
                </div>
            </div>

            {/* Popup Gigante de Edição em Tela Cheia */}
            <FullscreenTextareaModal
                isOpen={isFullscreenOpen}
                title="💬 Resposta Aprovada do Agente (Custo Zero)"
                subtitle="Edição expandida e confortável da resposta oficial que o agente responderá sem gastar tokens."
                value={approvedResponse}
                onChange={(newVal) => setApprovedResponse(newVal)}
                onClose={() => setIsFullscreenOpen(false)}
                placeholder="Digite a resposta oficial exata que o agente deve enviar ao cliente..."
                accentColor="#10b981"
            />
        </>,
        document.body
    );
};

export default CreateSemanticCacheModal;
