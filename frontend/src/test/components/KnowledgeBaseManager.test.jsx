/**
 * ============================================
 * TESTES UNITÁRIOS: KnowledgeBaseManager
 * ============================================
 * Foco: Validar a coluna de ID, exibição dos badges #ID
 * e filtragem por ID e texto na base de conhecimento.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import KnowledgeBaseManager from '../../components/KnowledgeBaseManager';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';

// Mock do cliente de API
vi.mock('../../api/client', () => ({
    api: {
        get: vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ items: [], question_label: 'Pergunta' }) })),
        post: vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true }) })),
        put: vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true }) })),
    }
}));

// Mock do createPortal para facilitar testes de portais
vi.mock('react-dom', async () => {
    const actual = await vi.importActual('react-dom');
    return {
        ...actual,
        createPortal: (node) => node,
    };
});

describe('KnowledgeBaseManager - Tabela, IDs e Filtragem', () => {
    const mockKb = [
        { id: 10, question: 'O certificado é reconhecido pelo MEC?', answer: 'Sim, certificado oficial.', category: 'Geral', metadata_val: '' },
        { id: 25, question: 'Quem é a professora do curso?', answer: 'Tarcira Martins.', category: 'Professora', metadata_val: '' },
        { id: 42, question: 'Quais são as formas de pagamento?', answer: 'Pix à vista ou cartão.', category: 'Valores', metadata_val: '' }
    ];

    beforeEach(() => {
        document.body.style.overflow = '';
        vi.clearAllMocks();
    });

    afterEach(() => {
        cleanup();
    });

    it('deve renderizar o cabeçalho com a coluna ID e os badges correspondentes', () => {
        render(
            <MemoryRouter>
                <KnowledgeBaseManager knowledgeBase={mockKb} kbId={1} />
            </MemoryRouter>
        );

        // Clicar na aba "Itens da Base" para exibir a tabela
        const itemsTab = screen.getByRole('button', { name: /Itens da Base/i });
        fireEvent.click(itemsTab);

        // Validar cabeçalho da coluna ID
        expect(screen.getByRole('columnheader', { name: /^ID$/i })).toBeInTheDocument();

        // Validar os badges de ID
        expect(screen.getByText('#10')).toBeInTheDocument();
        expect(screen.getByText('#25')).toBeInTheDocument();
        expect(screen.getByText('#42')).toBeInTheDocument();
    });

    it('deve filtrar os itens pelo ID exato ou com prefixo #', () => {
        render(
            <MemoryRouter>
                <KnowledgeBaseManager knowledgeBase={mockKb} kbId={1} />
            </MemoryRouter>
        );

        // Clicar na aba "Itens da Base"
        const itemsTab = screen.getByRole('button', { name: /Itens da Base/i });
        fireEvent.click(itemsTab);

        const searchInput = screen.getByTestId('kb-search-input');

        // Filtrar por ID "25"
        fireEvent.change(searchInput, { target: { value: '25' } });
        expect(screen.getByText('#25')).toBeInTheDocument();
        expect(screen.getByText('Quem é a professora do curso?')).toBeInTheDocument();
        expect(screen.queryByText('#10')).not.toBeInTheDocument();
        expect(screen.queryByText('#42')).not.toBeInTheDocument();

        // Filtrar por "#42"
        fireEvent.change(searchInput, { target: { value: '#42' } });
        expect(screen.getByText('#42')).toBeInTheDocument();
        expect(screen.getByText('Quais são as formas de pagamento?')).toBeInTheDocument();
        expect(screen.queryByText('#10')).not.toBeInTheDocument();
        expect(screen.queryByText('#25')).not.toBeInTheDocument();
    });

    it('deve filtrar os itens por texto na pergunta ou resposta', () => {
        render(
            <MemoryRouter>
                <KnowledgeBaseManager knowledgeBase={mockKb} kbId={1} />
            </MemoryRouter>
        );

        // Clicar na aba "Itens da Base"
        const itemsTab = screen.getByRole('button', { name: /Itens da Base/i });
        fireEvent.click(itemsTab);

        const searchInput = screen.getByTestId('kb-search-input');
        fireEvent.change(searchInput, { target: { value: 'MEC' } });

        expect(screen.getByText('#10')).toBeInTheDocument();
        expect(screen.getByText('O certificado é reconhecido pelo MEC?')).toBeInTheDocument();
        expect(screen.queryByText('#25')).not.toBeInTheDocument();
        expect(screen.queryByText('#42')).not.toBeInTheDocument();
    });

    it('deve renderizar os botões de exportação e importação de JSON', () => {
        render(
            <MemoryRouter>
                <KnowledgeBaseManager knowledgeBase={mockKb} kbId={1} />
            </MemoryRouter>
        );
        expect(screen.getByText(/Exportar Base \(JSON\)/i)).toBeInTheDocument();
        expect(screen.getByText(/Importar JSON/i)).toBeInTheDocument();
    });
});
