import React from 'react';

const UserManagementTable = ({
    searchTerm,
    setSearchTerm,
    roleFilter,
    setRoleFilter,
    loading,
    hasSuperAdminInDb,
    filteredUsers,
    onEditUser,
    onDeleteUser
}) => {
    return (
        <>
            <div className="filter-bar">
                <div className="search-box">
                    <span className="search-icon">🔍</span>
                    <input
                        type="text"
                        placeholder="Buscar por nome ou email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="role-select"
                >
                    <option value="all">Todos os Cargos</option>
                    <option value="Super Admin">Super Admin</option>
                    <option value="Admin">Admin</option>
                    <option value="Usuário">Usuário</option>
                </select>
            </div>

            <div className="users-table-container card-premium">
                <table className="users-table">
                    <thead>
                        <tr>
                            <th>NOME / EMAIL</th>
                            <th>CARGO</th>
                            <th>STATUS</th>
                            <th className="text-right">AÇÕES</th>
                        </tr>
                    </thead>
                    <tbody>
                        {/* Renderizar Super Admin Manual do .env primeiro se não estiver cadastrado no banco */}
                        {!hasSuperAdminInDb && (
                            <tr className="user-row super-admin-row">
                                <td>
                                    <div className="user-cell">
                                        <span className="user-name">Aryaraj</span>
                                        <span className="user-email">aryarajmarketing@gmail.com</span>
                                    </div>
                                </td>
                                <td>
                                    <span className="badge badge-super-admin">Super Admin</span>
                                </td>
                                <td>
                                    <span className="status-indicator active">
                                        <span className="checkmark">✓</span> ATIVO
                                    </span>
                                </td>
                                <td className="text-right">
                                    {/* Sem ações para Super Admin do .env */}
                                </td>
                            </tr>
                        )}

                        {loading ? (
                            <tr><td colSpan="4" className="text-center">Carregando usuários...</td></tr>
                        ) : filteredUsers.map(user => (
                            <tr key={user.id} className="user-row">
                                <td>
                                    <div className="user-cell">
                                        <span className="user-name">{user.name}</span>
                                        <span className="user-email">{user.email}</span>
                                    </div>
                                </td>
                                <td>
                                    <span className={`badge badge-${(user.role || '').toLowerCase().replace(' ', '-')}`}>
                                        {user.role}
                                    </span>
                                </td>
                                <td>
                                    <span className={`status-indicator ${user.status === 'ATIVO' ? 'active' : 'inactive'}`}>
                                        <span className="checkmark">{user.status === 'ATIVO' ? '✓' : '○'}</span> {user.status}
                                    </span>
                                </td>
                                <td className="text-right">
                                    <div className="row-actions">
                                        <button 
                                            type="button"
                                            className="action-btn edit" 
                                            onClick={() => onEditUser(user)} 
                                            title="Editar"
                                        >
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                        </button>
                                        {user.role !== 'Super Admin' && (
                                            <button 
                                                type="button"
                                                className="action-btn delete" 
                                                onClick={() => onDeleteUser(user)} 
                                                title="Excluir"
                                            >
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </>
    );
};

export default UserManagementTable;
