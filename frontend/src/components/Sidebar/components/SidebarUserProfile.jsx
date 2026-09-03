import React from 'react';

export default function SidebarUserProfile({
    onOpenSettings,
    onOpenLogoutModal
}) {
    const userName = localStorage.getItem('user_name') || 'Usuário';
    const userRole = localStorage.getItem('user_role') || 'Admin';
    const userInitial = (localStorage.getItem('user_name') || 'A')[0];

    return (
        <div className="sidebar-footer">
            <div className="user-profile-container">
                <div className="user-profile">
                    <div className="user-avatar text-white">
                        {userInitial}
                    </div>
                    <div className="user-info">
                        <span className="user-name">{userName}</span>
                        <span className="user-role">{userRole}</span>
                    </div>
                </div>
                <button 
                    className="settings-sidebar-btn" 
                    onClick={onOpenSettings}
                    title="Configurações de Perfil"
                >
                    ⚙️
                </button>
            </div>
            <button
                onClick={onOpenLogoutModal}
                className="logout-btn-new"
                title="Sair do sistema"
            >
                <span className="logout-btn-icon">🚪</span>
                <span>Sair do Painel</span>
            </button>
        </div>
    );
}
