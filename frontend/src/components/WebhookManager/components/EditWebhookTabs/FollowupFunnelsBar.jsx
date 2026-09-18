import React, { useState } from 'react';
import { showToast } from '../../utils/helpers';
import FollowupFunnelModals from './FollowupFunnelModals';

const FollowupFunnelsBar = ({
    safeEditForm,
    setEditForm,
    activeFollowupFunnelId = 'followup_default',
    setActiveFollowupFunnelId,
    setActiveFollowupStepTab
}) => {
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    const [newFunnelName, setNewFunnelName] = useState('');
    const [newFunnelId, setNewFunnelId] = useState('');
    const [renameValue, setRenameValue] = useState('');

    // Garante lista de funis válida com ao menos o padrão
    const rawFunnels = safeEditForm.followup_funnels;
    const funnels = Array.isArray(rawFunnels) && rawFunnels.length > 0
        ? rawFunnels
        : [{ id: 'followup_default', name: 'Padrão / Principal', is_default: true, steps: safeEditForm.followup_steps || [] }];

    const currentFunnel = funnels.find(f => f.id === activeFollowupFunnelId) || funnels.find(f => f.is_default) || funnels[0] || {
        id: 'followup_default',
        name: 'Padrão / Principal',
        is_default: true,
        steps: safeEditForm.followup_steps || []
    };

    const handleSelectFunnel = (targetId) => {
        if (targetId === activeFollowupFunnelId) return;

        // Salva os passos do fluxo que está sendo desativado
        const updatedFunnels = funnels.map(f => {
            if (f.id === currentFunnel.id) {
                return { ...f, steps: safeEditForm.followup_steps || [] };
            }
            return f;
        });

        const target = updatedFunnels.find(f => f.id === targetId);
        if (target) {
            setActiveFollowupFunnelId(targetId);
            setEditForm({
                ...safeEditForm,
                followup_funnels: updatedFunnels,
                followup_steps: target.steps || []
            });
            if (setActiveFollowupStepTab) setActiveFollowupStepTab(0);
        }
    };

    const handleCreate = (e) => {
        e.preventDefault();
        const trimmedName = newFunnelName.trim();
        const cleanId = (newFunnelId.trim() || trimmedName.toLowerCase().replace(/[^a-z0-9_]/g, '_')).slice(0, 50);

        if (!trimmedName || !cleanId) {
            showToast('Informe o nome e identificador do produto/fluxo.', 'error');
            return;
        }

        if (funnels.some(f => f.id === cleanId)) {
            showToast('Já existe um fluxo com este identificador ID.', 'error');
            return;
        }

        const currentSavedFunnels = funnels.map(f => {
            if (f.id === currentFunnel.id) {
                return { ...f, steps: safeEditForm.followup_steps || [] };
            }
            return f;
        });

        const newFunnel = {
            id: cleanId,
            name: trimmedName,
            is_default: false,
            steps: []
        };

        const updated = [...currentSavedFunnels, newFunnel];
        setActiveFollowupFunnelId(cleanId);
        setEditForm({
            ...safeEditForm,
            followup_funnels: updated,
            followup_steps: []
        });
        if (setActiveFollowupStepTab) setActiveFollowupStepTab(0);

        setNewFunnelName('');
        setNewFunnelId('');
        setIsCreateModalOpen(false);
        showToast(`Fluxo "${trimmedName}" criado com sucesso!`, 'success');
    };

    const handleRename = (e) => {
        e.preventDefault();
        const trimmedName = renameValue.trim();
        if (!trimmedName) return;

        const updated = funnels.map(f => {
            if (f.id === currentFunnel.id) {
                return { ...f, name: trimmedName };
            }
            return f;
        });

        setEditForm({ ...safeEditForm, followup_funnels: updated });
        setIsRenameModalOpen(false);
        showToast('Fluxo renomeado com sucesso!', 'success');
    };

    const handleConfirmDelete = () => {
        if (currentFunnel.is_default) return;

        const filtered = funnels.filter(f => f.id !== currentFunnel.id);
        const fallback = filtered.find(f => f.is_default) || filtered[0] || {
            id: 'followup_default',
            name: 'Padrão / Principal',
            is_default: true,
            steps: []
        };

        setActiveFollowupFunnelId(fallback.id);
        setEditForm({
            ...safeEditForm,
            followup_funnels: filtered,
            followup_steps: fallback.steps || []
        });
        if (setActiveFollowupStepTab) setActiveFollowupStepTab(0);

        setIsDeleteModalOpen(false);
        showToast(`Fluxo "${currentFunnel.name}" excluído. Contatos migrados para o fluxo padrão.`, 'success');
    };

    return (
        <div style={{
            background: 'rgba(15, 23, 42, 0.75)',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            borderRadius: '14px',
            padding: '1rem',
            marginBottom: '1rem',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)'
        }}>
            {/* BARRA SUPERIOR: DROPDOWN + AÇÕES */}
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: '1', minWidth: '280px' }}>
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
                        📦
                    </div>

                    <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                Fluxo de Follow-Up (Produto)
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

                        <select
                            data-testid="followup-funnels-select"
                            value={currentFunnel.id || activeFollowupFunnelId}
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

                {/* BOTÕES DE AÇÃO */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                        type="button"
                        data-testid="new-followup-funnel-btn"
                        onClick={() => {
                            setNewFunnelName('');
                            setNewFunnelId('');
                            setIsCreateModalOpen(true);
                        }}
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
                        title="Criar novo fluxo de follow-up para outro produto"
                    >
                        <span>➕</span>
                        <span>Novo Fluxo</span>
                    </button>

                    <button
                        type="button"
                        data-testid="rename-followup-funnel-btn"
                        onClick={() => {
                            setRenameValue(currentFunnel.name || '');
                            setIsRenameModalOpen(true);
                        }}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '8px 12px',
                            borderRadius: '8px',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            color: '#cbd5e1',
                            background: 'rgba(255, 255, 255, 0.06)',
                            border: '1px solid rgba(255, 255, 255, 0.12)',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                        title="Renomear este fluxo"
                    >
                        <span>✏️</span>
                        <span>Renomear</span>
                    </button>

                    {!currentFunnel.is_default && (
                        <button
                            type="button"
                            data-testid="delete-followup-funnel-btn"
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
                            title="Excluir este fluxo"
                        >
                            <span>🗑️</span>
                            <span>Excluir</span>
                        </button>
                    )}
                </div>
            </div>

            {/* RODAPÉ INFORMATIVO DA BARRA */}
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
                    <span>Para direcionar contatos de um disparo para este follow-up, envie via API:</span>
                    <code style={{
                        padding: '2px 6px',
                        background: 'rgba(0, 0, 0, 0.4)',
                        borderRadius: '4px',
                        color: '#38bdf8',
                        fontFamily: 'monospace',
                        border: '1px solid rgba(56, 189, 248, 0.2)'
                    }}>
                        followup_id: "{currentFunnel.id}"
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
                        Passos neste fluxo: {(safeEditForm.followup_steps || []).length}
                    </span>
                </div>
            </div>

            {/* MODAIS (CRIAR, RENOMEAR, EXCLUIR) */}
            <FollowupFunnelModals
                isCreateModalOpen={isCreateModalOpen}
                setIsCreateModalOpen={setIsCreateModalOpen}
                isRenameModalOpen={isRenameModalOpen}
                setIsRenameModalOpen={setIsRenameModalOpen}
                isDeleteModalOpen={isDeleteModalOpen}
                setIsDeleteModalOpen={setIsDeleteModalOpen}
                newFunnelName={newFunnelName}
                setNewFunnelName={setNewFunnelName}
                newFunnelId={newFunnelId}
                setNewFunnelId={setNewFunnelId}
                renameValue={renameValue}
                setRenameValue={setRenameValue}
                handleCreate={handleCreate}
                handleRename={handleRename}
                handleConfirmDelete={handleConfirmDelete}
                currentFunnel={currentFunnel}
            />
        </div>
    );
};

export default FollowupFunnelsBar;
