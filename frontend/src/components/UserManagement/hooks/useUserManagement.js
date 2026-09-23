import { useState, useEffect } from 'react';
import { api } from '../../../api/client';

export const useUserManagement = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [showModal, setShowModal] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, userId: null, userName: '' });
    const [showResetConfirm, setShowResetConfirm] = useState(false);
    const [showResetSuccess, setShowResetSuccess] = useState(false);
    const [isResetting, setIsResetting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [activeTab, setActiveTab] = useState('users');
    const [triggerInviteModal, setTriggerInviteModal] = useState(0);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        role: 'Usuário',
        status: 'ATIVO'
    });

    const userRole = localStorage.getItem('user_role') || 'Usuário';
    const isSuperAdmin = userRole === 'Super Admin';
    const hasSuperAdminInDb = users.some(user => user.role === 'Super Admin');

    const handleAddUserClick = () => {
        setActiveTab('invites');
        setTriggerInviteModal(prev => prev + 1);
    };

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const response = await api.get('/users');
            const data = await response.json();
            setUsers(data);
        } catch (error) {
            console.error("Erro ao buscar usuários:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleResetSystem = async () => {
        try {
            setIsResetting(true);
            const response = await api.post('/system/reset-database');
            if (response.ok) {
                setShowResetConfirm(false); // Fecha o de confirmacao primeiro
                setShowResetSuccess(true);  // Abre o de sucesso bonito
            } else {
                alert("Erro ao resetar sistema. Verifique as permissões de rede.");
            }
        } catch (error) {
            console.error("Erro no reset:", error);
        } finally {
            setIsResetting(false);
            setShowResetConfirm(false);
        }
    };

    const handleOpenModal = (user = null) => {
        if (user) {
            setEditingUser(user);
            setFormData({
                name: user.name,
                email: user.email,
                password: user.password,
                role: user.role,
                status: user.status
            });
        } else {
            setEditingUser(null);
            setFormData({
                name: '',
                email: '',
                password: '',
                role: 'Usuário',
                status: 'ATIVO'
            });
        }
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = editingUser
                ? await api.put(`/users/${editingUser.id}`, formData)
                : await api.post('/users', formData);

            if (response.ok) {
                setShowModal(false);
                fetchUsers();
            } else {
                alert("Erro ao salvar usuário. Verifique se o e-mail já existe.");
            }
        } catch (error) {
            console.error("Erro ao salvar usuário:", error);
        }
    };

    const handleDeleteClick = (user) => {
        setConfirmDelete({
            isOpen: true,
            userId: user.id,
            userName: user.name
        });
    };

    const handleConfirmDelete = async () => {
        try {
            await api.delete(`/users/${confirmDelete.userId}`);
            setConfirmDelete({ isOpen: false, userId: null, userName: '' });
            fetchUsers();
        } catch (error) {
            console.error("Erro ao deletar usuário:", error);
        }
    };

    const filteredUsers = users.filter(user => {
        const matchesSearch = (user.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (user.email || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesRole = roleFilter === 'all' || user.role === roleFilter;
        return matchesSearch && matchesRole;
    });

    return {
        users,
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
        setTriggerInviteModal,
        formData,
        setFormData,
        userRole,
        isSuperAdmin,
        hasSuperAdminInDb,
        filteredUsers,
        fetchUsers,
        handleAddUserClick,
        handleResetSystem,
        handleOpenModal,
        handleSubmit,
        handleDeleteClick,
        handleConfirmDelete
    };
};

export default useUserManagement;
