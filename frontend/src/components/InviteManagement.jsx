import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import ConfirmModal from './ConfirmModal';

const copyTextToClipboard = async (text) => {
    if (navigator.clipboard && (window.isSecureContext || process.env.NODE_ENV === 'test')) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (err) {
            console.warn("Clipboard API failed, falling back to textarea method", err);
        }
    }
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-999999px";
    textArea.style.top = "-999999px";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        if (successful) return true;
        throw new Error('Fallback copy failed');
    } catch (err) {
        document.body.removeChild(textArea);
        throw err;
    }
};

const InviteManagement = ({ onInviteCreated, triggerInviteModal, hideHeader = false }) => {
    const [invites, setInvites] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedLink, setGeneratedLink] = useState('');
    const [copied, setCopied] = useState(false);
    const [confirmRevoke, setConfirmRevoke] = useState({ isOpen: false, token: null, role: '' });
    const [formData, setFormData] = useState({
        role: 'Usuário',
        validity_hours: 24
    });

    useEffect(() => {
        fetchInvites();
    }, []);

    useEffect(() => {
        if (triggerInviteModal > 0) {
            handleOpenCreateModal();
        }
    }, [triggerInviteModal]);

    const fetchInvites = async () => {
        try {
            setLoading(true);
            const response = await api.get('/users/invites');
            if (response.ok) {
                const data = await response.json();
                setInvites(data);
            }
        } catch (error) {
            console.error("Erro ao buscar convites:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenCreateModal = () => {
        setFormData({ role: 'Usuário', validity_hours: 24 });
        setGeneratedLink('');
        setCopied(false);
        setShowCreateModal(true);
    };

    const handleGenerateInvite = async (e) => {
        e.preventDefault();
        try {
            setIsGenerating(true);
            const response = await api.post('/users/invites', formData);
            if (response.ok) {
                const data = await response.json();
                const link = `${window.location.origin}/register/${data.token}`;
                setGeneratedLink(link);
                fetchInvites();
                if (onInviteCreated) onInviteCreated();
                window.dispatchEvent(new CustomEvent('app:toast', {
                    detail: { message: 'Convite gerado com sucesso!', type: 'success' }
                }));
            } else {
                window.dispatchEvent(new CustomEvent('app:toast', {
                    detail: { message: 'Erro ao gerar convite.', type: 'error' }
                }));
            }
        } catch (error) {
            console.error("Erro ao gerar convite:", error);
            window.dispatchEvent(new CustomEvent('app:toast', {
                detail: { message: 'Erro de conexão ao gerar convite.', type: 'error' }
            }));
        } finally {
            setIsGenerating(false);
        }
    };

    const handleCopyLink = async () => {
        try {
            await copyTextToClipboard(generatedLink);
            setCopied(true);
            window.dispatchEvent(new CustomEvent('app:toast', {
                detail: { message: 'Link copiado para a área de transferência!', type: 'success' }
            }));
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error("Erro ao copiar link:", err);
            window.dispatchEvent(new CustomEvent('app:toast', {
                detail: { message: 'Erro ao copiar link.', type: 'error' }
            }));
        }
    };

    const handleCopyExistingLink = async (token) => {
        try {
            const link = `${window.location.origin}/register/${token}`;
            await copyTextToClipboard(link);
            window.dispatchEvent(new CustomEvent('app:toast', {
                detail: { message: 'Link do convite copiado!', type: 'success' }
            }));
        } catch (err) {
            console.error("Erro ao copiar link:", err);
            window.dispatchEvent(new CustomEvent('app:toast', {
                detail: { message: 'Erro ao copiar link.', type: 'error' }
            }));
        }
    };

    const handleRevokeClick = (invite) => {
        setConfirmRevoke({
            isOpen: true,
            token: invite.token,
            role: invite.role
        });
    };

    const handleConfirmRevoke = async () => {
        try {
            const response = await api.delete(`/users/invites/${confirmRevoke.token}`);
            if (response.ok) {
                window.dispatchEvent(new CustomEvent('app:toast', {
                    detail: { message: 'Convite revogado com sucesso!', type: 'success' }
                }));
                fetchInvites();
            } else {
                window.dispatchEvent(new CustomEvent('app:toast', {
                    detail: { message: 'Erro ao revogar convite.', type: 'error' }
                }));
            }
        } catch (error) {
            console.error("Erro ao revogar convite:", error);
        } finally {
            setConfirmRevoke({ isOpen: false, token: null, role: '' });
        }
    };

    const formatDateTime = (dateString) => {
        try {
            const date = new Date(dateString);
            return date.toLocaleString('pt-BR');
        } catch (e) {
            return dateString;
        }
    };

    return (
        <div className="invite-management">
            {!hideHeader && (
                <header className="page-header" style={{ justifyContent: 'flex-end', marginBottom: '20px' }}>
                    <button className="add-user-btn" onClick={handleOpenCreateModal}>
                        <span className="icon">✉️</span> + Gerar Convite
                    </button>
                </header>
            )}

            <div className="users-table-container card-premium">
                <table className="users-table">
                    <thead>
                        <tr>
                            <th>CARGO</th>
                            <th>CRIADO EM</th>
                            <th>EXPIRA EM</th>
                            <th>TOKEN</th>
                            <th className="text-right">AÇÕES</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="5" className="text-center">Carregando convites ativos...</td></tr>
                        ) : invites.length === 0 ? (
                            <tr><td colSpan="5" className="text-center">Nenhum convite pendente ativo encontrado.</td></tr>
                        ) : invites.map(invite => (
                            <tr key={invite.id} className="user-row">
                                <td>
                                    <span className={`badge badge-${(invite.role || '').toLowerCase().replace(' ', '-')}`}>{invite.role}</span>
                                </td>
                                <td>{formatDateTime(invite.created_at)}</td>
                                <td>{formatDateTime(invite.expires_at)}</td>
                                <td>
                                    <code style={{ background: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.85rem' }}>{`${invite.token.substring(0, 8)}...`}</code>
                                </td>
                                <td className="text-right">
                                    <div className="row-actions">
                                        <button className="action-btn edit" onClick={() => handleCopyExistingLink(invite.token)} title="Copiar Link">
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                                        </button>
                                        <button className="action-btn delete" onClick={() => handleRevokeClick(invite)} title="Revogar">
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {showCreateModal && (
                <div className="modal-overlay">
                    <div className="modal-content user-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header-refined">
                            <div className="modal-title-with-icon">
                                <div className="user-icon-circle">
                                    <span className="user-emoji">✉️</span>
                                    <span className="plus-badge">+</span>
                                </div>
                                <h2 className="modal-title">Gerar Novo Convite</h2>
                            </div>
                            <button className="modal-close-btn" onClick={() => setShowCreateModal(false)}>✕</button>
                        </div>
                        
                        {!generatedLink ? (
                            <form onSubmit={handleGenerateInvite} className="user-form">
                                <div className="form-row">
                                    <div className="form-group half">
                                        <label htmlFor="role-select">NÍVEL DE ACESSO (CARGO)</label>
                                        <select
                                            id="role-select"
                                            value={formData.role}
                                            onChange={e => setFormData({ ...formData, role: e.target.value })}
                                        >
                                            <option value="Usuário">Usuário (Acesso Limitado)</option>
                                            <option value="Admin">Admin (Controle Total)</option>
                                        </select>
                                    </div>
                                    <div className="form-group half">
                                        <label htmlFor="validity-select">VALIDADE DO LINK</label>
                                        <select
                                            id="validity-select"
                                            value={formData.validity_hours}
                                            onChange={e => setFormData({ ...formData, validity_hours: parseInt(e.target.value) })}
                                        >
                                            <option value={7}>7 Horas</option>
                                            <option value={14}>14 Horas</option>
                                            <option value={24}>24 Horas (1 dia)</option>
                                            <option value={48}>48 Horas (2 dias)</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="modal-actions" style={{ marginTop: '2rem' }}>
                                    <button type="button" className="modal-btn modal-btn-cancel" onClick={() => setShowCreateModal(false)}>
                                        Cancelar
                                    </button>
                                    <button type="submit" className="modal-btn modal-btn-confirm" disabled={isGenerating}>
                                        {isGenerating ? 'Gerando...' : 'Gerar Convite'}
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <div className="invite-result-card">
                                <div className="invite-status-banner">
                                    <span>⚡</span>
                                    <span>Convite Criado com Sucesso!</span>
                                </div>

                                <p style={{ color: '#94a3b8', fontSize: '0.92rem', margin: '0', textAlign: 'center' }}>
                                    Envie o link abaixo para o convidado realizar o cadastro como <strong>{formData.role}</strong>.
                                </p>

                                <div className="invite-meta-badges">
                                    <span className="invite-badge-item role">
                                        <span>👤</span> Cargo: <strong>{formData.role}</strong>
                                    </span>
                                    <span className="invite-badge-item expiry">
                                        <span>⏳</span> Válido por <strong>{formData.validity_hours}h</strong>
                                    </span>
                                </div>

                                <div className="invite-url-section">
                                    <div className="invite-url-header">
                                        <label htmlFor="generated-link">LINK DE CONVITE</label>
                                        <span className="invite-url-hint">Clique para copiar</span>
                                    </div>
                                    <div className="invite-url-box-premium" onClick={handleCopyLink}>
                                        <span className="invite-url-prefix-icon">🔗</span>
                                        <input
                                            id="generated-link"
                                            type="text"
                                            value={generatedLink}
                                            readOnly
                                            className="invite-link-input-display"
                                            title="Clique para copiar o link"
                                        />
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleCopyLink();
                                            }}
                                            className={`invite-copy-btn-primary ${copied ? 'copied' : ''}`}
                                        >
                                            <span>{copied ? '✓' : '📋'}</span>
                                            <span>{copied ? 'Copiado! ✓' : 'Copiar'}</span>
                                        </button>
                                    </div>
                                </div>

                                <div className="invite-security-tip">
                                    <span className="tip-icon">ℹ️</span>
                                    <span>
                                        Este link é de uso único. Após a conclusão do cadastro, o token é invalidado automaticamente por segurança.
                                    </span>
                                </div>

                                <div className="modal-actions" style={{ marginTop: '0.5rem', justifyContent: 'center' }}>
                                    <button
                                        type="button"
                                        className="modal-btn modal-btn-cancel"
                                        onClick={() => setShowCreateModal(false)}
                                        style={{ width: '100%', maxWidth: '220px' }}
                                    >
                                        Fechar
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <ConfirmModal
                isOpen={confirmRevoke.isOpen}
                onCancel={() => setConfirmRevoke({ ...confirmRevoke, isOpen: false })}
                onConfirm={handleConfirmRevoke}
                title="Revogar Convite"
                message={`Tem certeza que deseja revogar este convite para o cargo de "${confirmRevoke.role}"? O link gerado deixará de funcionar imediatamente.`}
                confirmText="Revogar"
                cancelText="Cancelar"
                type="danger"
            />
        </div>
    );
};

export default InviteManagement;
