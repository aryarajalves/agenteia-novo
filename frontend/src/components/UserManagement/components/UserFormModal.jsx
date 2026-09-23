import React from 'react';

const UserFormModal = ({
    showModal,
    editingUser,
    formData,
    setFormData,
    showPassword,
    setShowPassword,
    onClose,
    onSubmit
}) => {
    if (!showModal) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content user-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header-refined">
                    <div className="modal-title-with-icon">
                        <div className="user-icon-circle">
                            <span className="user-emoji">👤</span>
                            <span className="plus-badge">+</span>
                        </div>
                        <h2 className="modal-title">{editingUser ? 'Editar Usuário' : 'Criar Novo Usuário'}</h2>
                    </div>
                    <button type="button" className="modal-close-btn" onClick={onClose}>✕</button>
                </div>
                <form onSubmit={onSubmit} className="user-form">
                    <div className="form-group">
                        <label>NOME COMPLETO</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            placeholder="Ex: João Silva"
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label>EMAIL DAS BOAS-VINDAS</label>
                        <input
                            type="email"
                            value={formData.email}
                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                            placeholder="exemplo@email.com"
                            required
                            autoComplete="off"
                        />
                    </div>
                    <div className="form-group">
                        <label>SENHA INICIAL</label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={formData.password}
                                onChange={e => setFormData({ ...formData, password: e.target.value })}
                                placeholder="........"
                                required={!editingUser}
                                autoComplete="new-password"
                                style={{ paddingRight: '40px', width: '100%' }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(v => !v)}
                                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', color: '#94a3b8' }}
                            >
                                {showPassword ? '👁️' : '👁️‍🗨️'}
                            </button>
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group half">
                            <label>NÍVEL DE ACESSO (ROLE)</label>
                            <select
                                value={formData.role}
                                onChange={e => setFormData({ ...formData, role: e.target.value })}
                            >
                                <option value="Usuário">Usuário (Acesso Limitado)</option>
                                <option value="Admin">Admin (Controle Total)</option>
                            </select>
                        </div>
                        <div className="form-group half">
                            <label>Status</label>
                            <select
                                value={formData.status}
                                onChange={e => setFormData({ ...formData, status: e.target.value })}
                            >
                                <option value="ATIVO">Ativo</option>
                                <option value="INATIVO">Inativo</option>
                            </select>
                        </div>
                    </div>
                    <div className="modal-actions">
                        <button type="button" className="modal-btn modal-btn-cancel" onClick={onClose}>
                            Cancelar
                        </button>
                        <button type="submit" className="modal-btn modal-btn-confirm">
                            Salvar Usuário
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default UserFormModal;
