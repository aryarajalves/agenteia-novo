import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import React from 'react';
import GlobalContextManager from '../../components/GlobalContextManager';
import { api } from '../../api/client';

vi.mock('../../api/client', () => ({
    api: {
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
        delete: vi.fn()
    }
}));

describe('GlobalContextManager Component', () => {
    const mockVariables = [
        {
            id: 1,
            key: 'nome_empresa',
            value: 'Minha Empresa Tech',
            type: 'string',
            description: 'Nome fantasia da empresa',
            extraction_method: 'integration',
            extraction_prompt: '',
            is_default: true
        },
        {
            id: 2,
            key: 'link_suporte',
            value: 'https://wa.me/5511999999999',
            type: 'string',
            description: 'Link do WhatsApp de suporte',
            extraction_method: 'ai',
            extraction_prompt: 'Extrair número e gerar link',
            is_default: false
        },
        {
            id: 3,
            key: 'PUBLIC_ACCESS_TOKEN_SECRET',
            value: 'secret123',
            type: 'string',
            is_default: false
        }
    ];

    beforeEach(() => {
        api.get.mockImplementation((url) => {
            if (url.includes('/global-variables')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve(mockVariables)
                });
            }
            return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
        });
    });

    afterEach(() => {
        cleanup();
        vi.clearAllMocks();
    });

    it('deve carregar e renderizar as variáveis globais ignorando tokens de acesso público', async () => {
        render(<GlobalContextManager />);

        await waitFor(() => {
            expect(screen.getByText('Variáveis de Contexto Globais')).toBeInTheDocument();
        });

        expect(screen.getByText('nome_empresa')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Minha Empresa Tech')).toBeInTheDocument();
        expect(screen.getByText('Padrão')).toBeInTheDocument();

        expect(screen.getByText('link_suporte')).toBeInTheDocument();
        expect(screen.getByDisplayValue('https://wa.me/5511999999999')).toBeInTheDocument();

        // Variáveis com prefixo PUBLIC_ACCESS_TOKEN_ não devem ser exibidas
        expect(screen.queryByText('PUBLIC_ACCESS_TOKEN_SECRET')).not.toBeInTheDocument();
    });

    it('deve permitir alterar o valor de uma variável e chamar api.put no blur', async () => {
        api.put.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });

        render(<GlobalContextManager />);

        await waitFor(() => {
            expect(screen.getByDisplayValue('Minha Empresa Tech')).toBeInTheDocument();
        });

        const input = screen.getByDisplayValue('Minha Empresa Tech');
        fireEvent.change(input, { target: { value: 'Nova Empresa 2026' } });
        fireEvent.blur(input);

        expect(api.put).toHaveBeenCalledWith('/global-variables/1', expect.objectContaining({
            value: 'Nova Empresa 2026'
        }));
    });

    it('deve abrir o modal de confirmação ao clicar em deletar uma variável não-padrão', async () => {
        api.delete.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });

        render(<GlobalContextManager />);

        await waitFor(() => {
            expect(screen.getByText('link_suporte')).toBeInTheDocument();
        });

        const deleteButtons = screen.getAllByTitle('Remover variável');
        expect(deleteButtons).toHaveLength(1); // Apenas link_suporte, pois nome_empresa é is_default

        fireEvent.click(deleteButtons[0]);

        expect(screen.getByText('Remover Variável')).toBeInTheDocument();
        expect(screen.getByText(/Deseja realmente excluir "link_suporte"?/i)).toBeInTheDocument();

        const confirmBtn = screen.getByText('Excluir');
        fireEvent.click(confirmBtn);

        await waitFor(() => {
            expect(api.delete).toHaveBeenCalledWith('/global-variables/2');
        });
    });

    it('deve abrir o modal de adicionar variável e criar uma nova com sucesso', async () => {
        api.post.mockResolvedValue({ ok: true, json: () => Promise.resolve({ id: 4, key: 'telefone_sac' }) });

        render(<GlobalContextManager />);

        await waitFor(() => {
            expect(screen.getByText('+ Nova Variável')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('+ Nova Variável'));

        expect(screen.getByText('Criar Nova Variável Global')).toBeInTheDocument();

        const keyInput = screen.getByPlaceholderText('ex: link_suporte');
        const valueInput = screen.getByPlaceholderText('ex: https://wa.me/...');

        fireEvent.change(keyInput, { target: { value: 'telefone_sac' } });
        fireEvent.change(valueInput, { target: { value: '0800 123 456' } });

        const submitBtn = screen.getByText('Criar Variável');
        fireEvent.click(submitBtn);

        await waitFor(() => {
            expect(api.post).toHaveBeenCalledWith('/global-variables', expect.objectContaining({
                key: 'telefone_sac',
                value: '0800 123 456'
            }));
        });
    });
});
