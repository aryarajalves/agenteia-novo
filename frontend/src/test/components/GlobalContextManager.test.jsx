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

    it('não deve fechar o modal de adicionar variável ao clicar fora dele (no overlay)', async () => {
        render(<GlobalContextManager />);

        await waitFor(() => {
            expect(screen.getByText('+ Nova Variável')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('+ Nova Variável'));
        expect(screen.getByText('Criar Nova Variável Global')).toBeInTheDocument();

        const overlay = document.querySelector('.add-var-overlay');
        expect(overlay).toBeInTheDocument();
        fireEvent.click(overlay);

        expect(screen.getByText('Criar Nova Variável Global')).toBeInTheDocument();
    });

    it('deve renderizar o botão Editar e abrir o modal de edição ao clicar', async () => {
        render(<GlobalContextManager />);

        await waitFor(() => {
            expect(screen.getByText('link_suporte')).toBeInTheDocument();
        });

        const editBtns = screen.getAllByText(/Editar/);
        expect(editBtns.length).toBeGreaterThan(0);

        fireEvent.click(editBtns[0]);

        expect(screen.getByText('Editar Variável Global')).toBeInTheDocument();
        expect(screen.getByText('Salvar Alterações')).toBeInTheDocument();

        // Não deve fechar ao clicar no overlay
        const overlay = document.querySelector('.add-var-overlay');
        expect(overlay).toBeInTheDocument();
        fireEvent.click(overlay);
        expect(screen.getByText('Editar Variável Global')).toBeInTheDocument();
    });

    it('deve salvar as alterações ao submeter o modal de edição', async () => {
        api.put.mockResolvedValue({ ok: true, json: () => Promise.resolve({ id: 2, key: 'link_suporte', value: 'https://wa.me/novo' }) });

        render(<GlobalContextManager />);

        await waitFor(() => {
            expect(screen.getByText('link_suporte')).toBeInTheDocument();
        });

        const editBtns = screen.getAllByText(/Editar/);
        fireEvent.click(editBtns[1]); // Clica no segundo botão de editar (link_suporte)

        expect(screen.getByText('Editar Variável Global')).toBeInTheDocument();

        const modal = document.querySelector('.add-var-modal');
        const valueInput = modal.querySelector('input[placeholder="ex: https://wa.me/..."]');
        fireEvent.change(valueInput, { target: { value: 'https://wa.me/novo' } });

        const saveBtn = screen.getByText('Salvar Alterações');
        fireEvent.click(saveBtn);

        await waitFor(() => {
            expect(api.put).toHaveBeenCalledWith('/global-variables/2', expect.objectContaining({
                id: 2,
                value: 'https://wa.me/novo'
            }));
        });
    });

    it('deve abrir o modal expandido ao clicar no botão de maximizar o prompt de extração ou descrição no modal de edição', async () => {
        render(<GlobalContextManager />);

        await waitFor(() => {
            expect(screen.getByText('link_suporte')).toBeInTheDocument();
        });

        const editBtns = screen.getAllByText(/Editar/);
        fireEvent.click(editBtns[1]); // link_suporte (tem extraction_method: ai)

        expect(screen.getByText('Editar Variável Global')).toBeInTheDocument();

        // Clica no botão de maximizar o prompt
        const maxPromptBtn = screen.getByTestId('maximize-edit-prompt-btn');
        expect(maxPromptBtn).toBeInTheDocument();
        fireEvent.click(maxPromptBtn);

        // Deve abrir o ExpandedFieldModal
        expect(screen.getByTestId('expanded-field-modal')).toBeInTheDocument();
        expect(screen.getAllByText('Prompt de Extração com IA').length).toBeGreaterThanOrEqual(1);

        // Modifica o texto no textarea expandido
        const expandedTextarea = screen.getByTestId('expanded-field-textarea');
        fireEvent.change(expandedTextarea, { target: { value: 'Nova instrução super detalhada da IA' } });

        // Conclui
        const finishBtn = screen.getByTestId('expanded-field-save-btn');
        fireEvent.click(finishBtn);

        // ExpandedFieldModal fechou
        expect(screen.queryByTestId('expanded-field-modal')).not.toBeInTheDocument();

        // O valor no formulário original foi atualizado
        const originalTextarea = document.querySelector('textarea[placeholder*="Descreva o que esta variável"]');
        expect(originalTextarea).toHaveValue('Nova instrução super detalhada da IA');
    });

    it('deve abrir o modal expandido ao clicar no botão de maximizar no modal de criação de variável', async () => {
        render(<GlobalContextManager />);

        await waitFor(() => {
            expect(screen.getByText('+ Nova Variável')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('+ Nova Variável'));

        expect(screen.getByText('Criar Nova Variável Global')).toBeInTheDocument();

        // Maximizar Descrição
        const maxDescBtn = screen.getByTestId('maximize-add-desc-btn');
        expect(maxDescBtn).toBeInTheDocument();
        fireEvent.click(maxDescBtn);

        // ExpandedFieldModal abre com título da descrição
        expect(screen.getByTestId('expanded-field-modal')).toBeInTheDocument();
        expect(screen.getByText('Descrição da Variável')).toBeInTheDocument();

        const expandedTextarea = screen.getByTestId('expanded-field-textarea');
        fireEvent.change(expandedTextarea, { target: { value: 'Esta variável guarda a descrição completa' } });

        fireEvent.click(screen.getByTestId('expanded-field-save-btn'));

        // Campo de descrição no modal de criação atualizado
        const descInput = document.querySelector('input[placeholder="Explique para que serve esta variável..."]');
        expect(descInput).toHaveValue('Esta variável guarda a descrição completa');
    });
});



