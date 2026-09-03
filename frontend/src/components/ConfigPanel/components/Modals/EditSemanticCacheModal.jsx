import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import CacheThresholdControl from './CacheThresholdControl';
import ProductCategoryTagSelector from './ProductCategoryTagSelector';
import FullscreenTextareaModal from '../../../WebhookManager/components/FullscreenTextareaModal';

const EditSemanticCacheModal = ({ isOpen, item, onClose, onSave, isSaving, defaultThreshold = 92 }) => {
    const [userQuery, setUserQuery] = useState('');
    const [approvedResponse, setApprovedResponse] = useState('');
    const [alternateQueries, setAlternateQueries] = useState([]);
    const [newAltInput, setNewAltInput] = useState('');
    const [similarityThreshold, setSimilarityThreshold] = useState(null);
    const [categoryTag, setCategoryTag] = useState('');
    const [isFullscreenOpen, setIsFullscreenOpen] = useState(false);

    useEffect(() => {
        if (item) {
            setUserQuery(item.user_query || '');
            setApprovedResponse(item.approved_response || '');
            setAlternateQueries(Array.isArray(item.alternate_queries) ? item.alternate_queries : []);
            setNewAltInput('');
            setSimilarityThreshold(item.similarity_threshold !== undefined ? item.similarity_threshold : null);
            setCategoryTag(item.category_tag || '');
            setIsFullscreenOpen(false);
        }
    }, [item]);

    if (!isOpen || !item) return null;

    const handleAddAlt = (e) => {
        if (e) e.preventDefault();
        const clean = newAltInput.trim();
        if (clean && !alternateQueries.includes(clean)) {
            setAlternateQueries([...alternateQueries, clean]);
            setNewAltInput('');
        }
    };

    const handleRemoveAlt = (index) => {
        setAlternateQueries(alternateQueries.filter((_, i) => i !== index));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!userQuery.trim() || !approvedResponse.trim()) return;
        onSave({
            id: item.id,
            user_query: userQuery.trim(),
            approved_response: approvedResponse.trim(),
            alternate_queries: alternateQueries,
            similarity_threshold: similarityThreshold,
            clear_similarity_threshold: similarityThreshold === null,
            category_tag: categoryTag.trim() || null,
            clear_category_tag: !categoryTag.trim()
        });
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
                        border: '1px solid rgba(99, 102, 241, 0.35)',
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                        <h3 style={{ margin: 0, fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px', color: '#fff' }}>
                            ✏️ Editar Resposta Aprovada do Cache
                        </h3>
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

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px', flex: 1, overflow: 'hidden' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
                            {/* Pergunta Principal */}
                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#c7d2fe', marginBottom: '6px' }}>
                                    ❓ Pergunta Principal / Intenção:
                                </label>
                                <input
                                    type="text"
                                    value={userQuery}
                                    onChange={(e) => setUserQuery(e.target.value)}
                                    data-testid="edit-cache-query-input"
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

                            {/* Variações de Pergunta */}
                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#c7d2fe', marginBottom: '6px' }}>
                                    ➕ Outras Perguntas / Variações que ativam esta resposta (Opcional):
                                </label>
                                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                                    <input
                                        type="text"
                                        value={newAltInput}
                                        onChange={(e) => setNewAltInput(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddAlt(); } }}
                                        data-testid="edit-cache-alt-input"
                                        style={{
                                            flex: 1,
                                            background: 'rgba(15, 23, 42, 0.8)',
                                            border: '1px solid rgba(255, 255, 255, 0.1)',
                                            borderRadius: '8px',
                                            padding: '8px 12px',
                                            color: '#fff',
                                            fontSize: '0.85rem'
                                        }}
                                        placeholder="Ex: qual o valor do investimento?"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleAddAlt}
                                        data-testid="edit-add-alt-btn"
                                        style={{
                                            background: 'rgba(99, 102, 241, 0.2)',
                                            border: '1px solid rgba(99, 102, 241, 0.4)',
                                            borderRadius: '8px',
                                            padding: '8px 14px',
                                            color: '#a5b4fc',
                                            fontSize: '0.85rem',
                                            fontWeight: 600,
                                            cursor: 'pointer'
                                        }}
                                    >
                                        ＋ Adicionar
                                    </button>
                                </div>

                                {alternateQueries.length > 0 && (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                        {alternateQueries.map((alt, idx) => (
                                            <span
                                                key={idx}
                                                style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    background: 'rgba(99, 102, 241, 0.15)',
                                                    border: '1px solid rgba(99, 102, 241, 0.3)',
                                                    borderRadius: '6px',
                                                    padding: '3px 8px',
                                                    fontSize: '0.8rem',
                                                    color: '#e0e7ff'
                                                }}
                                            >
                                                {alt}
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveAlt(idx)}
                                                    style={{
                                                        background: 'none',
                                                        border: 'none',
                                                        color: '#f87171',
                                                        cursor: 'pointer',
                                                        padding: 0,
                                                        fontSize: '0.85rem'
                                                    }}
                                                >
                                                    ✕
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Tag de Produto / Categoria */}
                            <ProductCategoryTagSelector
                                value={categoryTag}
                                onChange={setCategoryTag}
                                agentId={item.agent_id}
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
                                    <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#34d399' }}>
                                        💬 Resposta Aprovada do Agente (Custo Zero):
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => setIsFullscreenOpen(true)}
                                        data-testid="toggle-maximize-edit-response-btn"
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
                                            gap: '5px',
                                            transition: 'all 0.15s ease'
                                        }}
                                        title="Maximizar campo de resposta em tela cheia"
                                    >
                                        ⛶ Maximizar Campo
                                    </button>
                                </div>
                                <textarea
                                    value={approvedResponse}
                                    onChange={(e) => setApprovedResponse(e.target.value)}
                                    data-testid="edit-cache-response-input"
                                    rows={5}
                                    required
                                    style={{
                                        width: '100%',
                                        height: '110px',
                                        background: 'rgba(15, 23, 42, 0.8)',
                                        border: '1px solid rgba(16, 185, 129, 0.3)',
                                        borderRadius: '8px',
                                        padding: '11px 13px',
                                        color: '#fff',
                                        fontSize: '0.9rem',
                                        resize: 'vertical',
                                        boxSizing: 'border-box',
                                        lineHeight: '1.5'
                                    }}
                                    placeholder="Texto exato que o agente responderá sem gastar tokens..."
                                />
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', paddingTop: '4px' }}>
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={isSaving}
                                style={{
                                    padding: '9px 18px',
                                    borderRadius: '8px',
                                    background: 'rgba(255, 255, 255, 0.08)',
                                    border: '1px solid rgba(255, 255, 255, 0.15)',
                                    color: '#fff',
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                }}
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={isSaving || !userQuery.trim() || !approvedResponse.trim()}
                                data-testid="save-edit-cache-btn"
                                style={{
                                    padding: '9px 22px',
                                    borderRadius: '8px',
                                    background: (!userQuery.trim() || !approvedResponse.trim()) ? 'rgba(99, 102, 241, 0.3)' : 'linear-gradient(135deg, #6366f1, #4f46e5)',
                                    border: 'none',
                                    color: '#fff',
                                    fontWeight: 700,
                                    cursor: isSaving ? 'wait' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)'
                                }}
                            >
                                {isSaving ? '⏳ Salvando...' : '💾 Salvar Alterações'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* Popup Gigante de Edição em Tela Cheia */}
            <FullscreenTextareaModal
                isOpen={isFullscreenOpen}
                title="✏️ Editar Resposta Aprovada do Cache"
                subtitle="Edição expandida e confortável da resposta oficial que o agente responderá sem gastar tokens."
                value={approvedResponse}
                onChange={(newVal) => setApprovedResponse(newVal)}
                onClose={() => setIsFullscreenOpen(false)}
                placeholder="Texto exato que o agente responderá sem gastar tokens..."
                accentColor="#6366f1"
            />
        </>,
        document.body
    );
};

export default EditSemanticCacheModal;
