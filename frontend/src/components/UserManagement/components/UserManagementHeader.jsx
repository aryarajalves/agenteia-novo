import React from 'react';

const UserManagementHeader = ({
    isSuperAdmin,
    activeTab,
    setActiveTab,
    onResetClick,
    onAddUserClick,
    onGenerateInviteClick
}) => {
    return (
        <>
            <header className="page-header">
                <div className="title-group">
                    <h1>Gestão de Usuários</h1>
                    {isSuperAdmin && (
                        <button
                            type="button"
                            className="reset-system-btn"
                            onClick={onResetClick}
                            title="Limpar todos os dados do banco"
                        >
                            <span className="icon">⚠️</span> Zerar Sistema
                        </button>
                    )}
                </div>
                {activeTab === 'users' ? (
                    <button type="button" className="add-user-btn" onClick={onAddUserClick}>
                        <span className="icon">👤</span> + Novo Usuário
                    </button>
                ) : (
                    <button type="button" className="add-user-btn" onClick={onGenerateInviteClick}>
                        <span className="icon">✉️</span> + Gerar Convite
                    </button>
                )}
            </header>

            <div className="tabs-container">
                <button 
                    type="button"
                    className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`} 
                    onClick={() => setActiveTab('users')}
                >
                    Usuários Ativos
                </button>
                <button 
                    type="button"
                    className={`tab-btn ${activeTab === 'invites' ? 'active' : ''}`} 
                    onClick={() => setActiveTab('invites')}
                >
                    Convites Pendentes
                </button>
            </div>
        </>
    );
};

export default UserManagementHeader;
