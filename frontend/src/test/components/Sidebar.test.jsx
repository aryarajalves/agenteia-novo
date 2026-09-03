/**
 * =============================================
 * TESTES UNITÁRIOS: Sidebar Component
 * =============================================
 * Mapeia todas as ações:
 * 1. Renderização dos links de navegação
 * 2. Controle de visibilidade por role (Super Admin, Admin, Usuário)
 * 3. Exibição do nome e role do usuário
 * 4. Modal de logout (abrir, cancelar, confirmar)
 * 5. Modal de configurações de perfil (abrir, preencher campos, cancelar)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';

describe('Sidebar Component', () => {
    let onLogoutMock;

    beforeEach(() => {
        onLogoutMock = vi.fn();
        localStorage.clear();
        global.fetch = vi.fn().mockImplementation(() =>
            Promise.resolve({
                ok: true,
                json: () => Promise.resolve({
                    name: 'Admin Teste',
                    email: 'admin@teste.com',
                    company_name: 'Minha Empresa S/A',
                    company_logo: '',
                    company_logo_size: 'medium'
                })
            })
        );
    });

    const renderSidebar = (role = 'Super Admin', name = 'Admin Super') => {
        localStorage.setItem('user_role', role);
        localStorage.setItem('user_name', name);
        return render(
            <MemoryRouter>
                <Sidebar onLogout={onLogoutMock} />
            </MemoryRouter>
        );
    };

    // ===== RENDERIZAÇÃO =====
    describe('Renderização Básica', () => {
        it('deve renderizar o logo do Agent Flow', () => {
            renderSidebar();
            expect(screen.getByText('Agent Flow')).toBeInTheDocument();
        });

        it('deve exibir o nome do usuário', () => {
            renderSidebar('Admin', 'João Silva');
            expect(screen.getByText('João Silva')).toBeInTheDocument();
        });

        it('deve exibir o role do usuário', () => {
            renderSidebar('Super Admin');
            expect(screen.getByText('Super Admin')).toBeInTheDocument();
        });

        it('deve renderizar o logo customizado e o nome da empresa se definidos no localStorage', () => {
            localStorage.setItem('company_name', 'Minha Empresa');
            localStorage.setItem('company_logo', 'https://example.com/logo.png');
            localStorage.setItem('company_logo_size', 'large');
            renderSidebar();
            
            expect(screen.getByText('Minha Empresa')).toBeInTheDocument();
            expect(screen.queryByText('Agent Flow')).not.toBeInTheDocument();
            const img = screen.getByAltText('Minha Empresa');
            expect(img).toBeInTheDocument();
            expect(img).toHaveAttribute('src', 'https://example.com/logo.png');
            expect(img.className).toContain('size-large');
            expect(document.title).toBe('Minha Empresa');
        });
    });

    // ===== VISIBILIDADE POR ROLE =====
    describe('Controle de Permissões - Super Admin', () => {
        it('Super Admin deve ver TODOS os links', () => {
            renderSidebar('Super Admin');

            expect(screen.getByText('Meus Agentes')).toBeInTheDocument();
            expect(screen.getByText('Bases de Conhecimento')).toBeInTheDocument();
            expect(screen.getByText('Inbox de Dúvidas')).toBeInTheDocument();
            expect(screen.getByText('Lead Scoring')).toBeInTheDocument();
            expect(screen.getByText('Ranking de Dúvidas')).toBeInTheDocument();
            expect(screen.getByText('Financeiro')).toBeInTheDocument();
            expect(screen.getByText('Integrações')).toBeInTheDocument();
            expect(screen.getByText('Gestão de Usuários')).toBeInTheDocument();
        });
    });

    describe('Controle de Permissões - Admin', () => {
        it('Admin deve ver links de gerenciamento, mas NÃO gestão de usuários', () => {
            renderSidebar('Admin');

            expect(screen.getByText('Meus Agentes')).toBeInTheDocument();
            expect(screen.getByText('Bases de Conhecimento')).toBeInTheDocument();
            expect(screen.getByText('Inbox de Dúvidas')).toBeInTheDocument();
            expect(screen.getByText('Lead Scoring')).toBeInTheDocument();
            expect(screen.getByText('Ranking de Dúvidas')).toBeInTheDocument();
            expect(screen.getByText('Financeiro')).toBeInTheDocument();
            expect(screen.getByText('Integrações')).toBeInTheDocument();
            expect(screen.queryByText('Gestão de Usuários')).not.toBeInTheDocument();
        });
    });

    describe('Controle de Permissões - Usuário', () => {
        it('Usuário deve ver "Meus Agentes" e "Ranking de Dúvidas", mas NÃO links de Admin', () => {
            renderSidebar('Usuário');

            // Deve ver
            expect(screen.getByText('Meus Agentes')).toBeInTheDocument();
            expect(screen.getByText('Ranking de Dúvidas')).toBeInTheDocument();

            // Não deve ver (restrito a Admin/SuperAdmin)
            expect(screen.queryByText('Bases de Conhecimento')).not.toBeInTheDocument();
            expect(screen.queryByText('Suporte Humano')).not.toBeInTheDocument();
            expect(screen.queryByText('Inbox de Dúvidas')).not.toBeInTheDocument();
            expect(screen.queryByText('Lead Scoring')).not.toBeInTheDocument();
            expect(screen.queryByText('Financeiro')).not.toBeInTheDocument();
            expect(screen.queryByText('Integrações')).not.toBeInTheDocument();
            expect(screen.queryByText('Gestão de Usuários')).not.toBeInTheDocument();
        });
    });

    // ===== MODAL DE LOGOUT =====
    describe('Modal de Logout', () => {
        it('deve abrir o modal de logout ao clicar em "Sair do Painel"', () => {
            renderSidebar();

            fireEvent.click(screen.getByText('Sair do Painel'));
            expect(screen.getByText('Até logo!')).toBeInTheDocument();
            expect(screen.getByText(/encerrar sua sessão/i)).toBeInTheDocument();
        });

        it('deve fechar o modal ao clicar em "Cancelar"', () => {
            renderSidebar();

            fireEvent.click(screen.getByText('Sair do Painel'));
            expect(screen.getByText('Até logo!')).toBeInTheDocument();

            fireEvent.click(screen.getByText('Cancelar'));
            expect(screen.queryByText('Até logo!')).not.toBeInTheDocument();
        });

        it('deve chamar onLogout ao clicar em "Sim, Sair"', () => {
            renderSidebar();

            fireEvent.click(screen.getByText('Sair do Painel'));
            fireEvent.click(screen.getByText('Sim, Sair'));

            expect(onLogoutMock).toHaveBeenCalledTimes(1);
        });
    });

    // ===== MODAL DE CONFIGURAÇÕES DE PERFIL =====
    describe('Modal de Configurações de Perfil', () => {
        it('deve abrir o modal de configurações ao clicar no ícone de engrenagem', async () => {
            renderSidebar('Admin', 'Carlos Admin');

            const settingsBtn = screen.getByTitle('Configurações de Perfil');
            fireEvent.click(settingsBtn);

            await waitFor(() => {
                expect(screen.getByText('Configurações de Perfil')).toBeInTheDocument();
            });

            expect(screen.getByPlaceholderText('Seu nome')).toBeInTheDocument();
            expect(screen.getByPlaceholderText('seu@email.com')).toBeInTheDocument();

            // Fechar modal
            fireEvent.click(screen.getByText('Cancelar'));
            expect(screen.queryByText('Configurações de Perfil')).not.toBeInTheDocument();
        });
    });
});
