import React from 'react';

const FollowupFunnelModals = ({
    isCreateModalOpen,
    setIsCreateModalOpen,
    isRenameModalOpen,
    setIsRenameModalOpen,
    isDeleteModalOpen,
    setIsDeleteModalOpen,
    newFunnelName,
    setNewFunnelName,
    newFunnelId,
    setNewFunnelId,
    renameValue,
    setRenameValue,
    handleCreate,
    handleRename,
    handleConfirmDelete,
    currentFunnel
}) => {
    return (
        <>
            {/* MODAL: CRIAR NOVO FLUXO */}
            {isCreateModalOpen && (
                <div
                    data-testid="modal-backdrop-create-funnel"
                    style={{
                        position: 'fixed',
                        inset: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.85)',
                        backdropFilter: 'blur(6px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 99999,
                        padding: '1rem'
                    }}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            width: '100%',
                            maxWidth: '460px',
                            background: '#0f172a',
                            border: '1px solid rgba(99, 102, 241, 0.4)',
                            borderRadius: '16px',
                            padding: '1.75rem',
                            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)'
                        }}
                    >
                        <h3 style={{ margin: '0 0 0.5rem', color: '#ffffff', fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>➕</span> Novo Fluxo de Follow-Up (Produto)
                        </h3>
                        <p style={{ margin: '0 0 1.25rem', color: '#94a3b8', fontSize: '0.85rem', lineHeight: '1.5' }}>
                            Crie uma esteira de follow-up dedicada para outro produto (ex: Mentoria, VSL, High Ticket).
                        </p>

                        <div>
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                                    Nome do Produto / Fluxo *
                                </label>
                                <input
                                    data-testid="new-followup-funnel-name-input"
                                    type="text"
                                    required
                                    placeholder="Ex: Mentoria VIP, VSL Produto X"
                                    value={newFunnelName}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            handleCreate(e);
                                        }
                                    }}
                                    onChange={(e) => {
                                        setNewFunnelName(e.target.value);
                                        if (!newFunnelId) {
                                            setNewFunnelId(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'));
                                        }
                                    }}
                                    style={{
                                        width: '100%',
                                        background: '#1e293b',
                                        border: '1px solid rgba(255, 255, 255, 0.15)',
                                        borderRadius: '8px',
                                        padding: '10px 12px',
                                        color: '#ffffff',
                                        fontSize: '0.9rem',
                                        outline: 'none',
                                        boxSizing: 'border-box'
                                    }}
                                />
                            </div>

                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                                    Identificador Único (ID para API) *
                                </label>
                                <input
                                    data-testid="new-followup-funnel-id-input"
                                    type="text"
                                    required
                                    placeholder="Ex: mentoria_vip"
                                    value={newFunnelId}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            handleCreate(e);
                                        }
                                    }}
                                    onChange={(e) => setNewFunnelId(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))}
                                    style={{
                                        width: '100%',
                                        background: '#1e293b',
                                        border: '1px solid rgba(255, 255, 255, 0.15)',
                                        borderRadius: '8px',
                                        padding: '10px 12px',
                                        color: '#38bdf8',
                                        fontFamily: 'monospace',
                                        fontSize: '0.85rem',
                                        outline: 'none',
                                        boxSizing: 'border-box'
                                    }}
                                />
                                <span style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
                                    Usado no parâmetro <code>followup_id</code> nos disparos via API.
                                </span>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                                <button
                                    type="button"
                                    onClick={() => setIsCreateModalOpen(false)}
                                    style={{
                                        padding: '9px 16px',
                                        borderRadius: '8px',
                                        background: 'transparent',
                                        border: '1px solid rgba(255, 255, 255, 0.15)',
                                        color: '#cbd5e1',
                                        cursor: 'pointer',
                                        fontWeight: 600,
                                        fontSize: '0.85rem'
                                    }}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="button"
                                    data-testid="confirm-create-followup-funnel-btn"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleCreate(e);
                                    }}
                                    style={{
                                        padding: '9px 18px',
                                        borderRadius: '8px',
                                        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                                        border: 'none',
                                        color: '#ffffff',
                                        cursor: 'pointer',
                                        fontWeight: 700,
                                        fontSize: '0.85rem',
                                        boxShadow: '0 4px 12px rgba(99, 102, 241, 0.35)'
                                    }}
                                >
                                    Criar Fluxo
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL: RENOMEAR FLUXO */}
            {isRenameModalOpen && (
                <div
                    data-testid="modal-backdrop-rename-funnel"
                    style={{
                        position: 'fixed',
                        inset: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.85)',
                        backdropFilter: 'blur(6px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 99999,
                        padding: '1rem'
                    }}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            width: '100%',
                            maxWidth: '440px',
                            background: '#0f172a',
                            border: '1px solid rgba(99, 102, 241, 0.4)',
                            borderRadius: '16px',
                            padding: '1.75rem',
                            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)'
                        }}
                    >
                        <h3 style={{ margin: '0 0 0.5rem', color: '#ffffff', fontSize: '1.15rem' }}>
                            ✏️ Renomear Fluxo
                        </h3>
                        <p style={{ margin: '0 0 1.25rem', color: '#94a3b8', fontSize: '0.85rem' }}>
                            Altere o nome exibido deste fluxo no painel. O identificador <code>{currentFunnel.id}</code> permanece inalterado.
                        </p>

                        <div>
                            <div style={{ marginBottom: '1.5rem' }}>
                                <input
                                    data-testid="rename-followup-funnel-input"
                                    type="text"
                                    required
                                    value={renameValue}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            handleRename(e);
                                        }
                                    }}
                                    onChange={(e) => setRenameValue(e.target.value)}
                                    style={{
                                        width: '100%',
                                        background: '#1e293b',
                                        border: '1px solid rgba(255, 255, 255, 0.15)',
                                        borderRadius: '8px',
                                        padding: '10px 12px',
                                        color: '#ffffff',
                                        fontSize: '0.9rem',
                                        outline: 'none',
                                        boxSizing: 'border-box'
                                    }}
                                />
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                                <button
                                    type="button"
                                    onClick={() => setIsRenameModalOpen(false)}
                                    style={{
                                        padding: '9px 16px',
                                        borderRadius: '8px',
                                        background: 'transparent',
                                        border: '1px solid rgba(255, 255, 255, 0.15)',
                                        color: '#cbd5e1',
                                        cursor: 'pointer',
                                        fontWeight: 600,
                                        fontSize: '0.85rem'
                                    }}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="button"
                                    data-testid="confirm-rename-followup-funnel-btn"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleRename(e);
                                    }}
                                    style={{
                                        padding: '9px 18px',
                                        borderRadius: '8px',
                                        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                                        border: 'none',
                                        color: '#ffffff',
                                        cursor: 'pointer',
                                        fontWeight: 700,
                                        fontSize: '0.85rem'
                                    }}
                                >
                                    Salvar Nome
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL: EXCLUIR FLUXO (REGRA experiência-usuário: popup preto centralizado, sem fechar no clique externo, 1 botão cancelar) */}
            {isDeleteModalOpen && (
                <div
                    data-testid="modal-backdrop-delete-funnel"
                    style={{
                        position: 'fixed',
                        inset: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.85)',
                        backdropFilter: 'blur(6px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 99999,
                        padding: '1rem'
                    }}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            width: '100%',
                            maxWidth: '440px',
                            background: '#0f172a',
                            border: '1px solid rgba(239, 68, 68, 0.4)',
                            borderRadius: '16px',
                            padding: '1.75rem',
                            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)'
                        }}
                    >
                        <h3 style={{ margin: '0 0 0.75rem', color: '#ef4444', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>⚠️</span> Confirmar Exclusão de Fluxo
                        </h3>
                        <p style={{ margin: '0 0 1rem', color: '#cbd5e1', fontSize: '0.9rem', lineHeight: '1.5' }}>
                            Tem certeza que deseja excluir o fluxo de follow-up <strong>"{currentFunnel.name}"</strong>?
                        </p>
                        <div style={{
                            padding: '10px 14px',
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.25)',
                            borderRadius: '8px',
                            marginBottom: '1.5rem',
                            fontSize: '0.8rem',
                            color: '#fca5a5'
                        }}>
                            🛡️ <strong>Proteção:</strong> Todos os contatos que estavam percorrendo este produto serão migrados com segurança para o fluxo <strong>"Padrão / Principal"</strong> no Passo #1.
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                            <button
                                type="button"
                                data-testid="cancel-delete-followup-funnel-btn"
                                onClick={() => setIsDeleteModalOpen(false)}
                                style={{
                                    padding: '9px 16px',
                                    borderRadius: '8px',
                                    background: 'transparent',
                                    border: '1px solid rgba(255, 255, 255, 0.15)',
                                    color: '#cbd5e1',
                                    cursor: 'pointer',
                                    fontWeight: 600,
                                    fontSize: '0.85rem'
                                }}
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                data-testid="confirm-delete-followup-funnel-btn"
                                onClick={handleConfirmDelete}
                                style={{
                                    padding: '9px 18px',
                                    borderRadius: '8px',
                                    background: '#ef4444',
                                    border: 'none',
                                    color: '#ffffff',
                                    cursor: 'pointer',
                                    fontWeight: 700,
                                    fontSize: '0.85rem',
                                    boxShadow: '0 4px 12px rgba(239, 68, 68, 0.35)'
                                }}
                            >
                                Sim, Excluir Fluxo
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default FollowupFunnelModals;
