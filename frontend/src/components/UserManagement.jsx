import React from 'react';
import ConfirmModal from './ConfirmModal';
import ResetSuccessModal from './ResetSuccessModal';
import InviteManagement from './InviteManagement';
import {
    useUserManagement,
    UserManagementHeader,
    UserManagementTable,
    UserFormModal
} from './UserManagement/index';

const UserManagement = () => {
    const {
        loading,
        searchTerm,
        setSearchTerm,
        roleFilter,
        setRoleFilter,
        showModal,
        setShowModal,
        editingUser,
        confirmDelete,
        setConfirmDelete,
        showResetConfirm,
        setShowResetConfirm,
        showResetSuccess,
        setShowResetSuccess,
        isResetting,
        showPassword,
        setShowPassword,
        activeTab,
        setActiveTab,
        triggerInviteModal,
        formData,
        setFormData,
        isSuperAdmin,
        hasSuperAdminInDb,
        filteredUsers,
        handleAddUserClick,
        handleResetSystem,
        handleOpenModal,
        handleSubmit,
        handleDeleteClick,
        handleConfirmDelete
    } = useUserManagement();

    return (
        <div className="user-management">
            <UserManagementHeader
                isSuperAdmin={isSuperAdmin}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                onResetClick={() => setShowResetConfirm(true)}
                onAddUserClick={handleAddUserClick}
                onGenerateInviteClick={handleAddUserClick}
            />

            {activeTab === 'users' ? (
                <UserManagementTable
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                    roleFilter={roleFilter}
                    setRoleFilter={setRoleFilter}
                    loading={loading}
                    hasSuperAdminInDb={hasSuperAdminInDb}
                    filteredUsers={filteredUsers}
                    onEditUser={handleOpenModal}
                    onDeleteUser={handleDeleteClick}
                />
            ) : (
                <InviteManagement 
                    triggerInviteModal={triggerInviteModal} 
                    hideHeader={true} 
                />
            )}

            <UserFormModal
                showModal={showModal}
                editingUser={editingUser}
                formData={formData}
                setFormData={setFormData}
                showPassword={showPassword}
                setShowPassword={setShowPassword}
                onClose={() => setShowModal(false)}
                onSubmit={handleSubmit}
            />

            <ConfirmModal
                isOpen={confirmDelete.isOpen}
                onCancel={() => setConfirmDelete({ ...confirmDelete, isOpen: false })}
                onConfirm={handleConfirmDelete}
                title="Excluir Usuário"
                message={`Tem certeza que deseja excluir o usuário "${confirmDelete.userName}"? Esta ação não pode ser desfeita.`}
                confirmText="Excluir Usuário"
                cancelText="Cancelar"
                type="danger"
            />

            <ConfirmModal
                isOpen={showResetConfirm}
                onCancel={() => setShowResetConfirm(false)}
                onConfirm={handleResetSystem}
                title="⚠️ ZERAR TODO O SISTEMA?"
                message="ESTA É UMA AÇÃO IRREVERSÍVEL! Todos os agentes, configurações de RAG, bases de conhecimento, logs de conversas e ferramentas serão EXCLUÍDOS PERMANENTEMENTE para deixar o projeto limpo. Apenas os usuários cadastrados serão mantidos. Deseja prosseguir?"
                confirmText={isResetting ? "Limpando..." : "Sim, Zerar Agora"}
                cancelText="Cancelar"
                type="danger"
            />

            <ResetSuccessModal
                isOpen={showResetSuccess}
                onClose={() => window.location.reload()}
            />
        </div>
    );
};

export default UserManagement;
