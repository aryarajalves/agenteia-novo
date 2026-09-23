import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import UserManagement from '../../components/UserManagement';
import UserManagementHeader from '../../components/UserManagement/components/UserManagementHeader';
import UserManagementTable from '../../components/UserManagement/components/UserManagementTable';
import UserFormModal from '../../components/UserManagement/components/UserFormModal';

// Mock api client
vi.mock('../../api/client', () => ({
    api: {
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
        delete: vi.fn()
    }
}));

// Mock InviteManagement
vi.mock('../../components/InviteManagement', () => ({
    default: () => <div data-testid="invite-management-mock">InviteManagement Mock</div>
}));

// Mock ConfirmModal
vi.mock('../../components/ConfirmModal', () => ({
    default: ({ isOpen, title, message, onConfirm, onCancel }) => (
        isOpen ? (
            <div data-testid="confirm-modal-mock">
                <h3>{title}</h3>
                <p>{message}</p>
                <button onClick={onConfirm}>Confirmar Mock</button>
                <button onClick={onCancel}>Cancelar Mock</button>
            </div>
        ) : null
    )
}));

// Mock ResetSuccessModal
vi.mock('../../components/ResetSuccessModal', () => ({
    default: ({ isOpen, onClose }) => (
        isOpen ? (
            <div data-testid="reset-success-modal-mock">
                Reset Sucesso
                <button onClick={onClose}>Fechar</button>
            </div>
        ) : null
    )
}));

import { api } from '../../api/client';

describe('UserManagement & Subcomponentes', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
    });

    describe('UserManagementHeader Component', () => {
        it('deve renderizar botão Zerar Sistema quando o cargo for Super Admin', () => {
            const onResetClick = vi.fn();
            render(
                <UserManagementHeader
                    isSuperAdmin={true}
                    activeTab="users"
                    setActiveTab={vi.fn()}
                    onResetClick={onResetClick}
                    onAddUserClick={vi.fn()}
                    onGenerateInviteClick={vi.fn()}
                />
            );

            const resetBtn = screen.getByTitle('Limpar todos os dados do banco');
            expect(resetBtn).toBeInTheDocument();

            fireEvent.click(resetBtn);
            expect(onResetClick).toHaveBeenCalledTimes(1);
        });

        it('não deve renderizar botão Zerar Sistema se não for Super Admin', () => {
            render(
                <UserManagementHeader
                    isSuperAdmin={false}
                    activeTab="users"
                    setActiveTab={vi.fn()}
                    onResetClick={vi.fn()}
                    onAddUserClick={vi.fn()}
                    onGenerateInviteClick={vi.fn()}
                />
            );

            expect(screen.queryByTitle('Limpar todos os dados do banco')).toBeNull();
        });

        it('deve alternar abas ao clicar', () => {
            const setActiveTab = vi.fn();
            render(
                <UserManagementHeader
                    isSuperAdmin={false}
                    activeTab="users"
                    setActiveTab={setActiveTab}
                    onResetClick={vi.fn()}
                    onAddUserClick={vi.fn()}
                    onGenerateInviteClick={vi.fn()}
                />
            );

            const invitesTab = screen.getByRole('button', { name: /Convites Pendentes/i });
            fireEvent.click(invitesTab);
            expect(setActiveTab).toHaveBeenCalledWith('invites');
        });
    });

    describe('UserManagementTable Component', () => {
        const mockUsers = [
            { id: 1, name: 'Carlos Santos', email: 'carlos@teste.com', role: 'Admin', status: 'ATIVO' },
            { id: 2, name: 'Beatriz Lima', email: 'beatriz@teste.com', role: 'Usuário', status: 'INATIVO' }
        ];

        it('deve renderizar a tabela com os usuários e linha do Super Admin se não cadastrado no banco', () => {
            render(
                <UserManagementTable
                    searchTerm=""
                    setSearchTerm={vi.fn()}
                    roleFilter="all"
                    setRoleFilter={vi.fn()}
                    loading={false}
                    hasSuperAdminInDb={false}
                    filteredUsers={mockUsers}
                    onEditUser={vi.fn()}
                    onDeleteUser={vi.fn()}
                />
            );

            // Linha do Super Admin padrão do .env
            expect(screen.getByText('Aryaraj')).toBeInTheDocument();
            expect(screen.getByText('aryarajmarketing@gmail.com')).toBeInTheDocument();

            // Linhas dos usuários normais
            expect(screen.getByText('Carlos Santos')).toBeInTheDocument();
            expect(screen.getByText('Beatriz Lima')).toBeInTheDocument();
        });

        it('deve disparar onEditUser e onDeleteUser', () => {
            const onEditUser = vi.fn();
            const onDeleteUser = vi.fn();

            render(
                <UserManagementTable
                    searchTerm=""
                    setSearchTerm={vi.fn()}
                    roleFilter="all"
                    setRoleFilter={vi.fn()}
                    loading={false}
                    hasSuperAdminInDb={true}
                    filteredUsers={mockUsers}
                    onEditUser={onEditUser}
                    onDeleteUser={onDeleteUser}
                />
            );

            const editButtons = screen.getAllByTitle('Editar');
            fireEvent.click(editButtons[0]);
            expect(onEditUser).toHaveBeenCalledWith(mockUsers[0]);

            const deleteButtons = screen.getAllByTitle('Excluir');
            fireEvent.click(deleteButtons[0]);
            expect(onDeleteUser).toHaveBeenCalledWith(mockUsers[0]);
        });
    });

    describe('UserFormModal Component', () => {
        it('deve alternar a visibilidade da senha e permitir preenchimento', () => {
            const setFormData = vi.fn();
            const setShowPassword = vi.fn();
            const onSubmit = vi.fn(e => e.preventDefault());

            render(
                <UserFormModal
                    showModal={true}
                    editingUser={null}
                    formData={{ name: 'Novo Usuario', email: 'novo@email.com', password: '123', role: 'Usuário', status: 'ATIVO' }}
                    setFormData={setFormData}
                    showPassword={false}
                    setShowPassword={setShowPassword}
                    onClose={vi.fn()}
                    onSubmit={onSubmit}
                />
            );

            expect(screen.getByText('Criar Novo Usuário')).toBeInTheDocument();

            const toggleEyeBtn = screen.getByRole('button', { name: /👁️‍🗨️/i });
            fireEvent.click(toggleEyeBtn);
            expect(setShowPassword).toHaveBeenCalledTimes(1);

            const submitBtn = screen.getByRole('button', { name: /Salvar Usuário/i });
            fireEvent.click(submitBtn);
            expect(onSubmit).toHaveBeenCalledTimes(1);
        });
    });

    describe('UserManagement Integrado', () => {
        it('deve carregar usuários da API e abrir modal de exclusão', async () => {
            api.get.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve([
                    { id: 10, name: 'Lucas Silva', email: 'lucas@empresa.com', role: 'Usuário', status: 'ATIVO' }
                ])
            });

            render(<UserManagement />);

            expect(screen.getByText('Carregando usuários...')).toBeInTheDocument();

            await waitFor(() => {
                expect(screen.getByText('Lucas Silva')).toBeInTheDocument();
            });

            const deleteBtn = screen.getByTitle('Excluir');
            fireEvent.click(deleteBtn);

            expect(screen.getByTestId('confirm-modal-mock')).toBeInTheDocument();
            expect(screen.getByText(/Tem certeza que deseja excluir o usuário "Lucas Silva"/i)).toBeInTheDocument();
        });
    });
});
