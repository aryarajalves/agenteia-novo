import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import KnowledgeBaseList from '../../components/KnowledgeBaseList';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';

const mockBases = [
    {
        id: 1,
        name: 'Base de Teste Produto',
        kb_type: 'product',
        description: 'Descrição de produto teste',
        items: [{ id: 101 }]
    },
    {
        id: 2,
        name: 'Base de Teste QA',
        kb_type: 'qa',
        description: 'Descrição de qa teste',
        items: [{ id: 201 }, { id: 202 }]
    },
    {
        id: 3,
        name: 'Base Adicional 1',
        kb_type: 'qa',
        description: 'Base adicional',
        items: []
    }
];

const mockGet = vi.fn((path) => {
    if (path === '/knowledge-bases') {
        return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockBases)
        });
    }
    if (path === '/knowledge-bases/1/export') {
        return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ name: 'Exported Base', items: [] })
        });
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
});

const mockDelete = vi.fn(() => Promise.resolve({ ok: true }));
const mockPost = vi.fn(() => Promise.resolve({ ok: true }));

vi.mock('../../api/client', () => ({
    api: {
        get: (...args) => mockGet(...args),
        delete: (...args) => mockDelete(...args),
        post: (...args) => mockPost(...args)
    }
}));

vi.mock('../../components/UnansweredQuestions/index', () => ({
    default: () => <div data-testid="unanswered-questions">Mock Inbox Dúvidas</div>
}));

vi.mock('../../components/TranscriptionHistory/index', () => ({
    default: () => <div data-testid="transcription-history">Mock Histórico</div>
}));

describe('KnowledgeBaseList Modular Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        cleanup();
    });

    it('deve renderizar os cards das bases de conhecimento com os dados e badges corretos', async () => {
        render(
            <MemoryRouter initialEntries={['/knowledge-bases?tab=bases']}>
                <KnowledgeBaseList />
            </MemoryRouter>
        );

        const titleProduct = await screen.findByText('Base de Teste Produto');
        const titleQA = await screen.findByText('Base de Teste QA');

        expect(titleProduct).toBeInTheDocument();
        expect(titleQA).toBeInTheDocument();
        expect(screen.getByText('Descrição de produto teste')).toBeInTheDocument();
        expect(screen.getByText('Catálogo')).toBeInTheDocument();
        expect(screen.getAllByText('FAQ / QA').length).toBeGreaterThanOrEqual(1);
    });

    it('deve filtrar bases por tipo ao clicar nos botões de filtro', async () => {
        render(
            <MemoryRouter initialEntries={['/knowledge-bases?tab=bases']}>
                <KnowledgeBaseList />
            </MemoryRouter>
        );

        await screen.findByText('Base de Teste Produto');

        // Filtra por FAQ
        const faqBtn = screen.getByText('FAQ');
        fireEvent.click(faqBtn);

        expect(screen.queryByText('Base de Teste Produto')).not.toBeInTheDocument();
        expect(screen.getByText('Base de Teste QA')).toBeInTheDocument();

        // Filtra por Produtos
        const produtosBtn = screen.getByText('Produtos');
        fireEvent.click(produtosBtn);

        expect(screen.getByText('Base de Teste Produto')).toBeInTheDocument();
        expect(screen.queryByText('Base de Teste QA')).not.toBeInTheDocument();
    });

    it('deve permitir selecionar bases e exibir a barra de ação em massa', async () => {
        render(
            <MemoryRouter initialEntries={['/knowledge-bases?tab=bases']}>
                <KnowledgeBaseList />
            </MemoryRouter>
        );

        await screen.findByText('Base de Teste Produto');

        // Clica no botão "Selecionar Todas"
        const selectAllBtn = screen.getByText('Selecionar Todas');
        fireEvent.click(selectAllBtn);

        expect(screen.getByText('3 bases selecionadas')).toBeInTheDocument();
        expect(screen.getByText('Excluir Selecionadas')).toBeInTheDocument();

        // Clica no Cancelar da barra flutuante
        const cancelBtn = screen.getByText('Cancelar');
        fireEvent.click(cancelBtn);

        expect(screen.queryByText('3 bases selecionadas')).not.toBeInTheDocument();
    });

    it('deve abrir o modal de confirmação ao clicar em excluir uma base', async () => {
        render(
            <MemoryRouter initialEntries={['/knowledge-bases?tab=bases']}>
                <KnowledgeBaseList />
            </MemoryRouter>
        );

        await screen.findByText('Base de Teste Produto');

        const deleteButtons = screen.getAllByTitle('Excluir Base');
        fireEvent.click(deleteButtons[0]);

        expect(screen.getByText('Excluir Base')).toBeInTheDocument();
        expect(screen.getByText(/Deseja realmente excluir a base "Base de Teste Produto"\?/i)).toBeInTheDocument();
    });

    it('deve renderizar a aba de Inbox de Dúvidas quando tab=inbox', async () => {
        render(
            <MemoryRouter initialEntries={['/knowledge-bases?tab=inbox']}>
                <KnowledgeBaseList />
            </MemoryRouter>
        );

        expect(await screen.findByTestId('unanswered-questions')).toBeInTheDocument();
    });

    it('deve renderizar a aba de Histórico quando tab=history', async () => {
        render(
            <MemoryRouter initialEntries={['/knowledge-bases?tab=history']}>
                <KnowledgeBaseList />
            </MemoryRouter>
        );

        expect(await screen.findByTestId('transcription-history')).toBeInTheDocument();
    });

    it('deve exibir o overlay de carregamento centralizado durante a importação do JSON', async () => {
        let resolveImport;
        mockPost.mockImplementationOnce((path) => {
            if (path === '/knowledge-bases/import-new') {
                return new Promise((resolve) => {
                    resolveImport = resolve;
                });
            }
            return Promise.resolve({ ok: true });
        });

        const { container } = render(
            <MemoryRouter initialEntries={['/knowledge-bases?tab=bases']}>
                <KnowledgeBaseList />
            </MemoryRouter>
        );

        await screen.findByText('Base de Teste Produto');

        const fileInput = container.querySelector('input[type="file"][accept=".json"]');
        expect(fileInput).toBeInTheDocument();

        const fakeFile = new File(['{"name":"Nova Base","items":[]}'], 'nova_base.json', { type: 'application/json' });
        fireEvent.change(fileInput, { target: { files: [fakeFile] } });

        // Overlay deve aparecer imediatamente no centro da tela
        expect(screen.getByTestId('import-loading-overlay')).toBeInTheDocument();
        expect(screen.getByText('Importando Base de Conhecimento...')).toBeInTheDocument();

        // Resolve a requisição
        resolveImport({ ok: true, json: () => Promise.resolve({ id: 99, name: 'Nova Base' }) });

        await waitFor(() => {
            expect(screen.queryByTestId('import-loading-overlay')).not.toBeInTheDocument();
        });
    });
});
