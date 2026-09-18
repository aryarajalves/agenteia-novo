import React, { useState } from 'react';
import { useConfig } from '../ConfigContext';
import CreateQualificationFunnelModal from './Modals/CreateQualificationFunnelModal';
import DeleteMessageModal from './Modals/DeleteMessageModal';

const QualificationFunnelsBar = () => {
    const {
        qualificationFunnels = [],
        setQualificationFunnels,
        activeFunnelId = 'funnel_default',
        setActiveFunnelId,
        qualificationQuestions = [],
        setQualificationQuestions,
        qualificationLabels = [],
        setQualificationLabels,
        qualificationCriteria = '',
        setQualificationCriteria,
        qualificationFinalAction = '',
        setQualificationFinalAction,
        qualificationFinalActionTrigger = 'all',
        setQualificationFinalActionTrigger
    } = useConfig();

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    const funnels = qualificationFunnels && qualificationFunnels.length > 0 
        ? qualificationFunnels 
        : [{ id: 'funnel_default', name: 'Padrão / Principal', is_default: true, questions: qualificationQuestions || [] }];

    // Identificar funil atual
    const currentFunnel = funnels.find(f => f.id === activeFunnelId) || funnels[0] || {
        id: 'funnel_default',
        name: 'Padrão / Principal',
        is_default: true,
        questions: qualificationQuestions || []
    };

    const handleSelectFunnel = (targetId) => {
        if (targetId === activeFunnelId) return;

        // Salvar dados do funil que está sendo desativado
        const updatedFunnels = funnels.map(f => {
            if (f.id === activeFunnelId) {
                return {
                    ...f,
                    questions: qualificationQuestions || [],
                    labels: qualificationLabels || [],
                    criteria: qualificationCriteria || '',
                    final_action: qualificationFinalAction || '',
                    final_action_trigger: qualificationFinalActionTrigger || 'all'
                };
            }
            return f;
        });

        // Localizar novo funil selecionado
        const targetFunnel = updatedFunnels.find(f => f.id === targetId);
        if (targetFunnel) {
            setQualificationFunnels(updatedFunnels);
            setActiveFunnelId(targetId);

            // Carregar dados do novo funil
            setQualificationQuestions(targetFunnel.questions || []);
            setQualificationLabels(targetFunnel.labels || []);
            setQualificationCriteria(targetFunnel.criteria || '');
            setQualificationFinalAction(targetFunnel.final_action || '');
            setQualificationFinalActionTrigger(targetFunnel.final_action_trigger || 'all');
        }
    };

    const handleCreateFunnel = ({ id, name }) => {
        // Salvar estado atual do funil ativo
        const currentSavedFunnels = funnels.map(f => {
            if (f.id === activeFunnelId) {
                return {
                    ...f,
                    questions: qualificationQuestions || [],
                    labels: qualificationLabels || [],
                    criteria: qualificationCriteria || '',
                    final_action: qualificationFinalAction || '',
                    final_action_trigger: qualificationFinalActionTrigger || 'all'
                };
            }
            return f;
        });

        const newFunnel = {
            id,
            name,
            is_default: false,
            questions: [],
            labels: [],
            criteria: '',
            final_action: '',
            final_action_trigger: 'all'
        };

        const updated = [...currentSavedFunnels, newFunnel];
        setQualificationFunnels(updated);
        setActiveFunnelId(id);

        // Limpar os campos para o novo funil vazio
        setQualificationQuestions([]);
        setQualificationLabels([]);
        setQualificationCriteria('');
        setQualificationFinalAction('');
        setQualificationFinalActionTrigger('all');
    };

    const handleRenameFunnel = ({ name }) => {
        const updated = funnels.map(f => {
            if (f.id === currentFunnel.id) {
                return { ...f, name };
            }
            return f;
        });
        setQualificationFunnels(updated);
    };

    const handleConfirmDelete = () => {
        if (currentFunnel.is_default) return;

        const filtered = funnels.filter(f => f.id !== currentFunnel.id);
        const fallback = filtered.find(f => f.is_default) || filtered[0] || {
            id: 'funnel_default',
            name: 'Padrão / Principal',
            is_default: true,
            questions: []
        };

        setQualificationFunnels(filtered);
        setActiveFunnelId(fallback.id);

        if (fallback) {
            setQualificationQuestions(fallback.questions || []);
            setQualificationLabels(fallback.labels || []);
            setQualificationCriteria(fallback.criteria || '');
            setQualificationFinalAction(fallback.final_action || '');
            setQualificationFinalActionTrigger(fallback.final_action_trigger || 'all');
        }
        setIsDeleteModalOpen(false);
    };

    return (
        <div
            data-testid="qualification-funnels-bar"
            style={{
                marginBottom: '1.5rem',
                padding: '1.1rem 1.25rem',
                borderRadius: '12px',
                background: 'rgba(15, 23, 42, 0.7)',
                border: '1px solid rgba(99, 102, 241, 0.35)',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.45)',
                backdropFilter: 'blur(8px)'
            }}
        >
            {/* Modais */}
            <CreateQualificationFunnelModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSave={handleCreateFunnel}
                existingFunnels={funnels}
            />

            <CreateQualificationFunnelModal
                isOpen={isRenameModalOpen}
                onClose={() => setIsRenameModalOpen(false)}
                onSave={handleRenameFunnel}
                editingFunnel={currentFunnel}
                existingFunnels={funnels}
            />

            <DeleteMessageModal
                isOpen={isDeleteModalOpen}
                messageText={`o funil de qualificação "${currentFunnel.name}" (ID: ${currentFunnel.id})`}
                onConfirm={handleConfirmDelete}
                onCancel={() => setIsDeleteModalOpen(false)}
            />

            {/* Barra Superior: Dropdown + Ações */}
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: '1', minWidth: '300px' }}>
                    <div style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '10px',
                        background: 'rgba(99, 102, 241, 0.2)',
                        border: '1px solid rgba(99, 102, 241, 0.4)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.2rem',
                        flexShrink: 0
                    }}>
                        🎯
                    </div>

                    <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                Funil de Qualificação Ativo
                            </span>
                            {currentFunnel.is_default && (
                                <span style={{
                                    fontSize: '0.7rem',
                                    fontWeight: 700,
                                    padding: '2px 8px',
                                    borderRadius: '999px',
                                    background: 'rgba(245, 158, 11, 0.15)',
                                    color: '#fbbf24',
                                    border: '1px solid rgba(245, 158, 11, 0.35)'
                                }}>
                                    ⭐ Padrão
                                </span>
                            )}
                        </div>

                        {/* Dropdown de Seleção */}
                        <select
                            data-testid="funnels-select"
                            value={currentFunnel.id || activeFunnelId}
                            onChange={(e) => handleSelectFunnel(e.target.value)}
                            style={{
                                width: '100%',
                                background: '#1e293b',
                                border: '1px solid rgba(99, 102, 241, 0.45)',
                                borderRadius: '8px',
                                padding: '8px 12px',
                                fontSize: '0.9rem',
                                fontWeight: 600,
                                color: '#ffffff',
                                outline: 'none',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
                            }}
                        >
                            {funnels.map(f => (
                                <option key={f.id} value={f.id}>
                                    {f.name} {f.is_default ? '(Padrão)' : `[ID: ${f.id}]`}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Botões de Ação */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                        type="button"
                        data-testid="new-funnel-btn"
                        onClick={() => setIsCreateModalOpen(true)}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '8px 14px',
                            borderRadius: '8px',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            color: '#e0e7ff',
                            background: 'rgba(99, 102, 241, 0.22)',
                            border: '1px solid rgba(99, 102, 241, 0.45)',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            boxShadow: '0 2px 6px rgba(99, 102, 241, 0.2)'
                        }}
                        title="Criar novo funil de perguntas"
                    >
                        <span>➕</span>
                        <span>Novo Funil</span>
                    </button>

                    <button
                        type="button"
                        data-testid="rename-funnel-btn"
                        onClick={() => setIsRenameModalOpen(true)}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '8px 12px',
                            borderRadius: '8px',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            color: '#cbd5e1',
                            background: 'rgba(51, 65, 85, 0.4)',
                            border: '1px solid rgba(148, 163, 184, 0.3)',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                        title="Renomear funil atual"
                    >
                        <span>✏️</span>
                        <span>Renomear</span>
                    </button>

                    {!currentFunnel.is_default && (
                        <button
                            type="button"
                            data-testid="delete-funnel-btn"
                            onClick={() => setIsDeleteModalOpen(true)}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '8px 12px',
                                borderRadius: '8px',
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                color: '#fca5a5',
                                background: 'rgba(239, 68, 68, 0.15)',
                                border: '1px solid rgba(239, 68, 68, 0.35)',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                            title="Excluir este funil"
                        >
                            <span>🗑️</span>
                            <span>Excluir</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Rodapé Informativo da Barra */}
            <div style={{
                marginTop: '12px',
                paddingTop: '10px',
                borderTop: '1px solid rgba(255, 255, 255, 0.07)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '8px',
                fontSize: '0.78rem',
                color: '#94a3b8'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ color: '#38bdf8' }}>✨</span>
                    <span>Para direcionar contatos de um disparo para este funil, envie via API:</span>
                    <code style={{
                        padding: '2px 6px',
                        background: 'rgba(0, 0, 0, 0.4)',
                        borderRadius: '4px',
                        color: '#38bdf8',
                        fontFamily: 'monospace',
                        border: '1px solid rgba(56, 189, 248, 0.2)'
                    }}>
                        funnel_id: "{currentFunnel.id}"
                    </code>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{
                        padding: '2px 8px',
                        borderRadius: '6px',
                        background: 'rgba(99, 102, 241, 0.15)',
                        border: '1px solid rgba(99, 102, 241, 0.3)',
                        color: '#a5b4fc',
                        fontWeight: 600
                    }}>
                        Total de etapas neste funil: {(qualificationQuestions || []).length}
                    </span>
                </div>
            </div>
        </div>
    );
};

export default QualificationFunnelsBar;
