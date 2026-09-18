import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useKB } from '../KBContext';
import ExpandableField from '../../ExpandableField';
import QuestionVariationsInput from './QuestionVariationsInput';
import MetadataBadgesInput from './MetadataBadgesInput';
import { useKBOperations } from '../hooks/useKBOperations';
import { api } from '../../../api/client';

const VectorSection = ({ itemId, refreshKey }) => {
    const [embedding, setEmbedding] = useState(null);
    const [loading, setLoading] = useState(false);
    const [showFull, setShowFull] = useState(false);

    const fetchVector = useCallback(async () => {
        if (!itemId) return;
        setLoading(true);
        try {
            const res = await api.get(`/knowledge-items/${itemId}`);
            if (res.ok) {
                const data = await res.json();
                setEmbedding(Array.isArray(data.embedding) ? data.embedding : null);
            }
        } catch (e) {
            console.error('Erro ao buscar vetor do item:', e);
        } finally {
            setLoading(false);
        }
    }, [itemId]);

    useEffect(() => {
        setShowFull(false);
        fetchVector();
    }, [fetchVector, refreshKey]);

    return (
        <div className="kb-vector-section">
            <div className="kb-vector-header">
                <span>🧬 Vetor Semântico (Embedding)</span>
                {embedding && <span className="kb-vector-badge">{embedding.length} dimensões</span>}
            </div>

            {loading ? (
                <div className="kb-vector-empty">Carregando vetor...</div>
            ) : !embedding ? (
                <div className="kb-vector-empty">Este item ainda não possui vetor gerado.</div>
            ) : (
                <>
                    <div className="kb-vector-preview">
                        [{embedding.slice(0, showFull ? embedding.length : 12).map(v => v.toFixed(4)).join(', ')}
                        {!showFull && embedding.length > 12 ? ', …' : ''}]
                    </div>
                    {embedding.length > 12 && (
                        <button className="kb-vector-toggle" onClick={() => setShowFull(v => !v)}>
                            {showFull ? 'Mostrar menos' : 'Mostrar vetor completo'}
                        </button>
                    )}
                </>
            )}

            <p className="kb-vector-note">
                O vetor é gerado a partir da {'"'}{'Pergunta'}{'"'} e suas variações, e é recalculado automaticamente sempre que você salvar alterações.
            </p>
        </div>
    );
};

const EditItemModal = () => {
    const { 
        isEditOpen, setIsEditOpen, 
        itemToEdit, setItemToEdit, 
        kbLabels, 
        setSimResults, reloadKnowledgeBase 
    } = useKB();
    const { handleUpdateItem } = useKBOperations();
    const [form, setForm] = useState({ 
        question: '', 
        answer: '', 
        metadata_val: '', 
        category: 'Geral', 
        question_variations: [] 
    });
    const [isSaving, setIsSaving] = useState(false);
    const [vectorRefreshKey, setVectorRefreshKey] = useState(0);

    useEffect(() => {
        if (itemToEdit) {
            let parsedVars = [];
            if (Array.isArray(itemToEdit.question_variations)) {
                parsedVars = itemToEdit.question_variations;
            } else if (typeof itemToEdit.question_variations === 'string') {
                try {
                    parsedVars = JSON.parse(itemToEdit.question_variations);
                } catch {
                    parsedVars = [];
                }
            }

            setForm({
                question: itemToEdit.question || '',
                answer: itemToEdit.answer || '',
                metadata_val: itemToEdit.metadata_val || '',
                category: itemToEdit.category || 'Geral',
                question_variations: parsedVars
            });
            setVectorRefreshKey(k => k + 1);
        }
    }, [itemToEdit]);

    if (!isEditOpen || !itemToEdit) return null;

    const handleClose = () => {
        if (isSaving) return;
        setIsEditOpen(false);
        setItemToEdit(null);
    };

    const handleSave = async () => {
        if (!form.question.trim() || !form.answer.trim()) return;
        setIsSaving(true);
        const success = await handleUpdateItem(itemToEdit.id, form);
        setIsSaving(false);
        if (success) {
            if (setSimResults) {
                setSimResults(prev => {
                    if (!prev) return prev;
                    const updateItem = (item) => {
                        if (item.id === itemToEdit.id) {
                            return {
                                ...item,
                                question: form.question,
                                answer: form.answer,
                                metadata_val: form.metadata_val,
                                category: form.category,
                                question_variations: form.question_variations
                            };
                        }
                        return item;
                    };
                    return {
                        ...prev,
                        items: (prev.items || []).map(updateItem),
                        discarded_items: (prev.discarded_items || []).map(updateItem),
                        grouped_results: (prev.grouped_results || []).map(g => ({
                            ...g,
                            items: (g.items || []).map(updateItem),
                            discarded_items: (g.discarded_items || []).map(updateItem)
                        }))
                    };
                });
            }
            if (reloadKnowledgeBase) {
                reloadKnowledgeBase();
            }
            handleClose();
        }
    };

    return createPortal(
        // Overlay sem onClick: clicar fora do card não deve fechar o popup,
        // só o botão "Cancelar" ou uma ação de salvar bem-sucedida.
        <div className="kb-edit-modal-overlay">
            <div className="kb-edit-modal-card" onClick={e => e.stopPropagation()}>
                <div className="kb-edit-modal-header">
                    <h3>✏️ Editar Conhecimento</h3>
                    <button className="close-btn" onClick={handleClose} disabled={isSaving}>✕</button>
                </div>

                <div className="kb-edit-modal-body">
                    <div className="form-row-kb">
                        <div className="form-group flex-2">
                            <ExpandableField
                                label={kbLabels.question}
                                value={form.question}
                                onChange={(e) => setForm({ ...form, question: e.target.value })}
                            />
                        </div>
                        <div className="form-group flex-2">
                            <MetadataBadgesInput
                                label={kbLabels.metadata}
                                placeholder="Ex: forma de pagamento | boleto (Enter)"
                                value={form.metadata_val}
                                onChange={(val) => setForm({ ...form, metadata_val: val })}
                                disabled={isSaving}
                            />
                        </div>
                        <div className="form-group flex-1">
                            <label>Categoria</label>
                            <input
                                type="text"
                                value={form.category}
                                onChange={(e) => setForm({ ...form, category: e.target.value })}
                                placeholder="Geral, Preços, etc."
                            />
                        </div>
                    </div>

                    <QuestionVariationsInput
                        variations={form.question_variations}
                        onChange={(vars) => setForm(prev => ({ ...prev, question_variations: vars }))}
                        disabled={isSaving}
                    />

                    <div className="form-group">
                        <ExpandableField
                            label={kbLabels.answer}
                            type="textarea"
                            value={form.answer}
                            onChange={(e) => setForm({ ...form, answer: e.target.value })}
                            style={{ minHeight: '140px' }}
                        />
                    </div>

                    <VectorSection itemId={itemToEdit.id} refreshKey={vectorRefreshKey} />
                </div>

                <div className="kb-edit-modal-footer">
                    <button className="kb-edit-modal-cancel-btn" onClick={handleClose} disabled={isSaving}>
                        Cancelar
                    </button>
                    <button
                        className="create-agent-btn"
                        onClick={handleSave}
                        disabled={isSaving}
                        style={{ border: 'none', flex: 1 }}
                    >
                        {isSaving ? 'Salvando...' : '✓ Salvar Alterações'}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default EditItemModal;
