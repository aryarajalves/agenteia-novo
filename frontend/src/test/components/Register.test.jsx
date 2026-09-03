import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mockGet = vi.fn();
const mockPost = vi.fn();
vi.mock('../../api/client', () => ({
    api: {
        get: (...args) => mockGet(...args),
        post: (...args) => mockPost(...args),
        put: vi.fn(),
        delete: vi.fn(),
    },
}));

vi.mock('../../config', () => ({
    API_URL: 'http://localhost:8002',
    AGENT_API_KEY: 'test-key',
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
    useParams: () => ({ token: 'mock-token-123' }),
    useNavigate: () => mockNavigate
}));

import Register from '../../components/Register';

describe('Register Component', () => {
    beforeEach(() => {
        mockGet.mockReset();
        mockPost.mockReset();
        mockNavigate.mockReset();
    });

    it('deve exibir tela de carregamento enquanto valida o token', () => {
        mockGet.mockReturnValue(new Promise(() => {})); // Nunca resolve
        render(<Register />);
        expect(screen.getByText('Validando...')).toBeInTheDocument();
    });

    it('deve exibir erro se o token for invalido', async () => {
        mockGet.mockResolvedValue({
            ok: false,
            status: 400,
            json: () => Promise.resolve({ detail: 'Este convite expirou ou já foi utilizado.' }),
        });

        render(<Register />);

        await waitFor(() => {
            expect(screen.getByText('Convite Inválido')).toBeInTheDocument();
            expect(screen.getByText('Este convite expirou ou já foi utilizado.')).toBeInTheDocument();
        });
    });

    it('deve renderizar o formulario com campo de confirmacao de senha e checklist se o token for valido', async () => {
        mockGet.mockResolvedValue({
            ok: true,
            status: 200,
            json: () => Promise.resolve({ valid: true, role: 'Admin' }),
        });

        render(<Register />);

        await waitFor(() => {
            expect(screen.getByText('Criar Conta')).toBeInTheDocument();
            expect(screen.getByPlaceholderText('Seu nome completo')).toBeInTheDocument();
            expect(screen.getByPlaceholderText('seu@email.com')).toBeInTheDocument();
            expect(screen.getByPlaceholderText('Crie uma senha forte')).toBeInTheDocument();
            expect(screen.getByPlaceholderText('Digite a senha novamente')).toBeInTheDocument();
            expect(screen.getByText('Mínimo 10 caracteres')).toBeInTheDocument();
        });
    });

    it('deve manter botao desativado se a senha nao cumprir requisitos', async () => {
        mockGet.mockResolvedValue({
            ok: true,
            status: 200,
            json: () => Promise.resolve({ valid: true, role: 'Admin' }),
        });

        render(<Register />);

        await waitFor(() => {
            expect(screen.getByText('Criar Conta')).toBeInTheDocument();
        });

        await userEvent.type(screen.getByPlaceholderText('Seu nome completo'), 'Maria Silva');
        await userEvent.type(screen.getByPlaceholderText('seu@email.com'), 'maria@silva.com');
        await userEvent.type(screen.getByPlaceholderText('Crie uma senha forte'), 'fraca');
        await userEvent.type(screen.getByPlaceholderText('Digite a senha novamente'), 'fraca');

        const submitBtn = screen.getByText('Finalizar Cadastro');
        expect(submitBtn).toBeDisabled();
    });

    it('deve enviar o cadastro com sucesso ao preencher senha forte e confirmacao correspondente', async () => {
        mockGet.mockResolvedValue({
            ok: true,
            status: 200,
            json: () => Promise.resolve({ valid: true, role: 'Admin' }),
        });

        mockPost.mockResolvedValue({
            ok: true,
            status: 200,
            json: () => Promise.resolve({ success: true, user_id: 1 }),
        });

        render(<Register />);

        await waitFor(() => {
            expect(screen.getByText('Criar Conta')).toBeInTheDocument();
        });

        await userEvent.type(screen.getByPlaceholderText('Seu nome completo'), 'Maria Silva');
        await userEvent.type(screen.getByPlaceholderText('seu@email.com'), 'maria@silva.com');
        await userEvent.type(screen.getByPlaceholderText('Crie uma senha forte'), 'Senha@Forte2026');
        await userEvent.type(screen.getByPlaceholderText('Digite a senha novamente'), 'Senha@Forte2026');

        const submitBtn = screen.getByText('Finalizar Cadastro');
        expect(submitBtn).not.toBeDisabled();

        fireEvent.submit(submitBtn.closest('form'));

        await waitFor(() => {
            expect(mockPost).toHaveBeenCalledWith('/users/register/mock-token-123', {
                name: 'Maria Silva',
                email: 'maria@silva.com',
                password: 'Senha@Forte2026'
            });
            expect(mockNavigate).toHaveBeenCalledWith('/login');
        });
    });

    it('deve exibir erro se o email ja estiver em uso', async () => {
        mockGet.mockResolvedValue({
            ok: true,
            status: 200,
            json: () => Promise.resolve({ valid: true, role: 'Admin' }),
        });

        mockPost.mockResolvedValue({
            ok: false,
            status: 400,
            json: () => Promise.resolve({ detail: 'Este e-mail já está em uso' }),
        });

        render(<Register />);

        await waitFor(() => {
            expect(screen.getByText('Criar Conta')).toBeInTheDocument();
        });

        await userEvent.type(screen.getByPlaceholderText('Seu nome completo'), 'Maria Silva');
        await userEvent.type(screen.getByPlaceholderText('seu@email.com'), 'maria@silva.com');
        await userEvent.type(screen.getByPlaceholderText('Crie uma senha forte'), 'Senha@Forte2026');
        await userEvent.type(screen.getByPlaceholderText('Digite a senha novamente'), 'Senha@Forte2026');

        const submitBtn = screen.getByText('Finalizar Cadastro');
        expect(submitBtn).not.toBeDisabled();

        fireEvent.submit(submitBtn.closest('form'));

        await waitFor(() => {
            expect(screen.getByText('Este e-mail já está em uso')).toBeInTheDocument();
        });
        expect(mockNavigate).not.toHaveBeenCalled();
    });
});
