import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';

const CreateQualificationFunnelModal = ({ isOpen, onClose, onSave, editingFunnel = null, existingFunnels = [] }) => {
    const [name, setName] = useState('');
    const [funnelId, setFunnelId] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            if (editingFunnel) {
                setName(editingFunnel.name || '');
                setFunnelId(editingFunnel.id || '');
            } else {
                setName('');
                setFunnelId('');
            }
            setError('');
        }
    }, [isOpen, editingFunnel]);

    if (!isOpen) return null;

    const handleNameChange = (e) => {
        const val = e.target.value;
        setName(val);
        if (!editingFunnel) {
            const slug = val
                .toLowerCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .replace(/[^a-z0-9]+/g, "_")
                .replace(/^_+|_+$/g, "");
            setFunnelId(slug);
        }
    };

    const handleSave = (e) => {
        if (e) e.preventDefault();
        const trimmedName = name.trim();
        const trimmedId = funnelId.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "_");

        if (!trimmedName) {
            setError('Por favor, informe o nome do funil.');
            return;
        }

        if (!trimmedId) {
            setError('Por favor, defina um identificador válido para a API.');
            return;
        }

        const isDuplicateId = existingFunnels.some(
            f => f.id === trimmedId && (!editingFunnel || editingFunnel.id !== trimmedId)
        );

        if (isDuplicateId) {
            setError(`O identificador "${trimmedId}" já está em uso por outro funil. Escolha outro.`);
            return;
        }

        onSave({
            id: trimmedId,
            name: trimmedName,
            is_default: editingFunnel ? !!editingFunnel.is_default : false
        });
        onClose();
    };

    return ReactDOM.createPortal(
        <div
            data-testid="qualification-funnel-overlay"
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                background: 'rgba(0, 0, 0, 0.85)',
                backdropFilter: 'blur(10px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 999999,
                padding: '1rem'
            }}
        >
            <div
                data-testid="create-qualification-funnel-modal"
                onClick={(e) => e.stopPropagation()}
                style={{
                    background: '#0f172a',
                    border: '1px solid rgba(99, 102, 241, 0.4)',
                    borderRadius: '16px',
                    width: '90vw',
                    maxWidth: '540px',
                    boxShadow: '0 25px 60px rgba(0, 0, 0, 0.9), 0 0 30px rgba(99, 102, 241, 0.2)',
                    color: '#f8fafc',
                    position: 'relative',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column'
                }}
            >
                {/* Gradiente superior decorativo */}
                <div style={{ height: '4px', width: '100%', background: 'linear-gradient(90deg, #6366f1, #a855f7, #38bdf8)' }} />

                {/* Cabeçalho */}
                <div style={{
                    padding: '1.25rem 1.5rem',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    background: 'rgba(255, 255, 255, 0.02)'
                }}>
                    <div style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '10px',
                        background: 'rgba(99, 102, 241, 0.2)',
                        border: '1px solid rgba(99, 102, 241, 0.4)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.3rem'
                    }}>
                        🎯
                    </div>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#ffffff' }}>
                            {editingFunnel ? 'Editar Nome do Funil' : 'Criar Novo Funil de Qualificação'}
                        </h3>
                        <p style={{ margin: '3px 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
                            {editingFunnel ? 'Atualize as informações deste funil' : 'Defina o nome e o identificador que usará nos disparos via API'}
                        </p>
                    </div>
                </div>

                {/* Formulário */}
                <form onSubmit={handleSave} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {error && (
                        <div style={{
                            padding: '0.75rem 1rem',
                            background: 'rgba(239, 68, 68, 0.15)',
                            border: '1px solid rgba(239, 68, 68, 0.4)',
                            borderRadius: '8px',
                            color: '#fca5a5',
                            fontSize: '0.85rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}>
                            <span>⚠️</span>
                            <span>{error}</span>
                        </div>
                    )}

                    <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#e2e8f0', marginBottom: '6px' }}>
                            Nome do Funil <span style={{ color: '#818cf8' }}>*</span>
                        </label>
                        <input
                            type="text"
                            data-testid="funnel-modal-name-input"
                            value={name}
                            onChange={handleNameChange}
                            placeholder="Ex: Venda de Mentoria, Imersão Presencial, Curso VIP"
                            style={{
                                width: '100%',
                                boxSizing: 'border-box',
                                background: 'rgba(15, 23, 42, 0.8)',
                                border: '1px solid rgba(148, 163, 184, 0.3)',
                                borderRadius: '10px',
                                padding: '10px 14px',
                                color: '#ffffff',
                                fontSize: '0.9rem',
                                outline: 'none',
                                transition: 'border-color 0.2s'
                            }}
                            autoFocus
                        />
                        <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
                            Nome descritivo exibido no menu do painel
                        </span>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#e2e8f0', marginBottom: '6px' }}>
                            Identificador / ID da API <span style={{ color: '#818cf8' }}>*</span>
                        </label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type="text"
                                data-testid="funnel-modal-id-input"
                                value={funnelId}
                                onChange={(e) => setFunnelId(e.target.value)}
                                disabled={editingFunnel?.is_default}
                                placeholder="Ex: mentoria, evento_presencial"
                                style={{
                                    width: '100%',
                                    boxSizing: 'border-box',
                                    background: editingFunnel?.is_default ? 'rgba(30, 41, 59, 0.5)' : 'rgba(15, 23, 42, 0.8)',
                                    border: '1px solid rgba(148, 163, 184, 0.3)',
                                    borderRadius: '10px',
                                    padding: '10px 14px',
                                    color: editingFunnel?.is_default ? '#64748b' : '#38bdf8',
                                    fontSize: '0.9rem',
                                    fontFamily: 'monospace',
                                    outline: 'none',
                                    cursor: editingFunnel?.is_default ? 'not-allowed' : 'text'
                                }}
                            />
                        </div>
                        <span style={{ display: 'block', fontSize: '0.75rem', color: '#38bdf8', marginTop: '4px' }}>
                            ✨ Use este valor na API: <code>{`POST /api/leads/assign-funnel`}</code> com <code>funnel_id: "{funnelId || '...'}"</code>
                        </span>
                    </div>

                    {/* Rodapé de Ações */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        gap: '10px',
                        paddingTop: '0.75rem',
                        borderTop: '1px solid rgba(255, 255, 255, 0.08)'
                    }}>
                        <button
                            type="button"
                            data-testid="funnel-modal-cancel-btn"
                            onClick={onClose}
                            style={{
                                padding: '8px 18px',
                                borderRadius: '10px',
                                border: '1px solid rgba(148, 163, 184, 0.25)',
                                background: 'transparent',
                                color: '#94a3b8',
                                fontSize: '0.85rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            data-testid="funnel-modal-save-btn"
                            style={{
                                padding: '8px 22px',
                                borderRadius: '10px',
                                border: 'none',
                                background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                                color: '#ffffff',
                                fontSize: '0.85rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)',
                                transition: 'all 0.2s'
                            }}
                        >
                            ✓ {editingFunnel ? 'Salvar Alterações' : 'Criar Funil'}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
};

export default CreateQualificationFunnelModal;
