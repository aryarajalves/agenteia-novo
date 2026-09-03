import React from 'react';

export default function ProfileSettingsModal({
    isOpen,
    userData,
    setUserData,
    isSuperAdmin,
    loading,
    status,
    onSubmit,
    onClose
}) {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px', maxHeight: '90vh', overflowY: 'auto' }}>
                <span className="modal-icon">⚙️</span>
                <h2 className="modal-title">Configurações de Perfil</h2>
                <p className="modal-message">Atualize seus dados de acesso ao Agent Flow.</p>
                
                <form onSubmit={onSubmit} className="settings-form" style={{ textAlign: 'left', marginTop: '1.5rem' }}>
                    <div className="form-group">
                        <label>Nome Completo</label>
                        <input 
                            type="text" 
                            value={userData.name}
                            onChange={e => setUserData({...userData, name: e.target.value})}
                            placeholder="Seu nome"
                            required
                            autoComplete="name"
                        />
                    </div>

                    {!isSuperAdmin && (
                        <>
                            <div className="form-group">
                                <label>E-mail (Login)</label>
                                <input 
                                    type="email" 
                                    value={userData.email}
                                    onChange={e => setUserData({...userData, email: e.target.value})}
                                    placeholder="seu@email.com"
                                    required
                                    autoComplete="username"
                                />
                            </div>
                            <div className="form-group">
                                <label>Nova Senha (deixe em branco para manter)</label>
                                <input 
                                    type="password" 
                                    value={userData.password}
                                    onChange={e => setUserData({...userData, password: e.target.value})}
                                    placeholder="Sua senha secreta"
                                    autoComplete="new-password"
                                />
                            </div>
                        </>
                    )}

                    <div className="form-group" style={{ marginTop: '1rem' }}>
                        <label>Nome da Empresa (White-label)</label>
                        <input 
                            type="text" 
                            value={userData.company_name || ''}
                            onChange={e => setUserData({...userData, company_name: e.target.value})}
                            placeholder="Ex: Minha Empresa"
                        />
                    </div>

                    <div className="form-group">
                        <label>Logo da Empresa (Upload)</label>
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.75rem',
                            border: '2px dashed rgba(255, 255, 255, 0.15)',
                            borderRadius: '8px',
                            padding: '1.25rem',
                            textAlign: 'center',
                            backgroundColor: 'rgba(255, 255, 255, 0.02)',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            position: 'relative',
                            transition: 'border-color 0.2s ease, background-color 0.2s ease'
                        }}>
                            {userData.company_logo ? (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', zIndex: 2 }}>
                                    <img 
                                        src={userData.company_logo} 
                                        alt="Preview da Logo" 
                                        style={{ maxHeight: '80px', maxWidth: '100%', objectFit: 'contain', borderRadius: '6px', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }} 
                                    />
                                    <button 
                                        type="button" 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setUserData({...userData, company_logo: ''});
                                        }}
                                        style={{
                                            background: 'rgba(239, 68, 68, 0.2)',
                                            color: '#f87171',
                                            border: '1px solid rgba(239, 68, 68, 0.4)',
                                            padding: '0.35rem 0.75rem',
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                            fontSize: '0.8rem',
                                            fontWeight: '600',
                                            transition: 'all 0.2s'
                                        }}
                                        onMouseOver={(e) => { e.target.style.background = '#ef4444'; e.target.style.color = 'white'; }}
                                        onMouseOut={(e) => { e.target.style.background = 'rgba(239, 68, 68, 0.2)'; e.target.style.color = '#f87171'; }}
                                    >
                                        Remover Logo
                                    </button>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                                    <span style={{ fontSize: '1.75rem', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }}>📤</span>
                                    <span style={{ fontSize: '0.85rem', color: '#cbd5e1', fontWeight: '500' }}>Clique ou arraste uma imagem aqui</span>
                                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>PNG, JPG ou SVG (Máx. 2MB)</span>
                                </div>
                            )}
                            <input 
                                type="file" 
                                accept="image/*"
                                onChange={async (e) => {
                                    const file = e.target.files[0];
                                    if (file) {
                                        const reader = new FileReader();
                                        reader.onloadend = () => {
                                            setUserData({...userData, company_logo: reader.result});
                                        };
                                        reader.readAsDataURL(file);
                                    }
                                }}
                                style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: '100%',
                                    height: '100%',
                                    opacity: 0,
                                    cursor: 'pointer',
                                    zIndex: 1
                                }}
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Tamanho da Logo na Sidebar</label>
                        <select 
                            value={userData.company_logo_size || 'medium'}
                            onChange={e => setUserData({...userData, company_logo_size: e.target.value})}
                            className="form-control-select"
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                borderRadius: '8px',
                                backgroundColor: 'rgba(15, 23, 42, 0.6)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                color: '#fff',
                                outline: 'none'
                            }}
                        >
                            <option value="small" style={{ backgroundColor: '#0f172a' }}>Pequeno</option>
                            <option value="medium" style={{ backgroundColor: '#0f172a' }}>Médio</option>
                            <option value="large" style={{ backgroundColor: '#0f172a' }}>Grande</option>
                        </select>
                    </div>

                    {status.message && (
                        <div className={`status-message ${status.type}`} style={{ marginBottom: '1.5rem' }}>
                            {status.message}
                        </div>
                    )}

                    <div className="modal-actions">
                        <button
                            type="button"
                            className="modal-btn modal-btn-cancel"
                            onClick={onClose}
                            disabled={loading}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="modal-btn modal-btn-confirm"
                            style={{ background: 'var(--primary-color)', boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)' }}
                            disabled={loading}
                        >
                            {loading ? 'Salvando...' : 'Salvar Alterações'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
