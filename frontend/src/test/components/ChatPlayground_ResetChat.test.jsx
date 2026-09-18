import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ChatPlayground from '../../components/ChatPlayground';

// Mocks
const mockAgents = [
    {
        id: 1,
        name: 'Agente - Tarcira',
        system_prompt: 'Você é a assistente oficial da Tarcira.',
        dynamic_prompt: 'Diretrizes dinâmicas do agente.',
        model: 'gpt-4o'
    }
];

const mockGet = vi.fn((path) => {
    if (path === '/agents') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockAgents) });
    }
    if (path === '/global-variables') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    }
    if (path === '/models') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ models: [{ id: 'gpt-4o' }] }) });
    }
    if (path.includes('/sessions')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
});

vi.mock('../../api/client', () => ({
    api: {
        get: (...args) => mockGet(...args),
        post: vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({}) })),
        delete: vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({}) })),
        upload: vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({}) }))
    }
}));

describe('ChatPlayground - Botão Resetar Conversa', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('deve renderizar o botão "🔄 Resetar" no cabeçalho ao lado de "Exportar"', async () => {
        render(
            <MemoryRouter initialEntries={['/playground?agentId=1']}>
                <ChatPlayground />
            </MemoryRouter>
        );

        const resetBtn = await screen.findByTestId('reset-chat-header-btn');
        const exportBtn = await screen.findByTestId('export-training-btn');

        expect(resetBtn).toBeInTheDocument();
        expect(resetBtn).toHaveTextContent(/Resetar/i);
        expect(exportBtn).toBeInTheDocument();

        // Validar que ambos estão dentro da mesma div de ações do cabeçalho
        expect(resetBtn.parentElement).toBe(exportBtn.parentElement);
        expect(resetBtn.parentElement).toHaveClass('header-actions-row');
    });

    it('deve abrir o popup de confirmação centralizado ao clicar no botão Resetar', async () => {
        render(
            <MemoryRouter initialEntries={['/playground?agentId=1']}>
                <ChatPlayground />
            </MemoryRouter>
        );

        const resetBtn = await screen.findByTestId('reset-chat-header-btn');
        fireEvent.click(resetBtn);

        // Verifica abertura do ConfirmModal
        const modalTitle = await screen.findByRole('heading', { name: /Resetar Conversa/i });
        expect(modalTitle).toBeInTheDocument();
        expect(screen.getByText(/Tem certeza que deseja resetar a conversa atual/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /^Resetar$/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Cancelar/i })).toBeInTheDocument();
    });

    it('deve fechar o popup sem resetar ao clicar em Cancelar', async () => {
        render(
            <MemoryRouter initialEntries={['/playground?agentId=1']}>
                <ChatPlayground />
            </MemoryRouter>
        );

        const resetBtn = await screen.findByTestId('reset-chat-header-btn');
        fireEvent.click(resetBtn);

        const cancelBtn = await screen.findByRole('button', { name: /Cancelar/i });
        fireEvent.click(cancelBtn);

        await waitFor(() => {
            expect(screen.queryByRole('heading', { name: /Resetar Conversa/i })).not.toBeInTheDocument();
        });
    });

    it('deve resetar a conversa e exibir toast de sucesso ao confirmar o reset', async () => {
        render(
            <MemoryRouter initialEntries={['/playground?agentId=1']}>
                <ChatPlayground />
            </MemoryRouter>
        );

        const resetBtn = await screen.findByTestId('reset-chat-header-btn');
        fireEvent.click(resetBtn);

        const confirmBtn = await screen.findByRole('button', { name: /^Resetar$/i });
        fireEvent.click(confirmBtn);

        // Modal deve fechar
        await waitFor(() => {
            expect(screen.queryByRole('heading', { name: /Resetar Conversa/i })).not.toBeInTheDocument();
        });

        // Toast de confirmação deve ser exibido
        await waitFor(() => {
            expect(screen.getByText(/Sessão resetada com sucesso!/i)).toBeInTheDocument();
        });
    });
});
