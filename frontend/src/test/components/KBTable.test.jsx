import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import KBTable from '../../components/KnowledgeBaseManager/components/KBTable';
import React from 'react';

const mockItems = [
    {
        id: 1,
        question: 'O que é RAG?',
        answer: 'RAG significa Retrieval-Augmented Generation.',
        category: 'Geral',
        metadata_val: 'IA | NLP',
        question_variations: ['O que significa RAG?', 'Como funciona o RAG?'],
        embedding: [0.1, 0.2, 0.3],
        originalIndex: 0
    },
    {
        id: 2,
        question: 'Qual o valor?',
        answer: 'R$ 997,00.',
        category: 'Preços',
        metadata_val: '',
        question_variations: [],
        embedding: [0.4, 0.5, 0.6],
        originalIndex: 1
    }
];

const mockSetItemToEdit = vi.fn();
const mockSetIsEditOpen = vi.fn();
const mockSetItemToDelete = vi.fn();
const mockSetIsConfirmOpen = vi.fn();

// Mock do KBContext
vi.mock('../../components/KnowledgeBaseManager/KBContext', () => ({
    useKB: vi.fn(() => ({
        kbFilterTerm: '',
        setKbFilterTerm: vi.fn(),
        selectedItems: new Set(),
        kbLabels: { question: 'Pergunta', answer: 'Resposta', metadata: 'Metadado' },
        setItemToEdit: mockSetItemToEdit,
        setIsEditOpen: mockSetIsEditOpen,
        setItemToDelete: mockSetItemToDelete,
        setIsConfirmOpen: mockSetIsConfirmOpen,
        itemsPerPage: 20,
        setItemsPerPage: vi.fn(),
        typeFilter: 'all',
        setTypeFilter: vi.fn(),
        currentPage: 1,
        setCurrentPage: vi.fn()
    }))
}));

// Mock do KBData
vi.mock('../../components/KnowledgeBaseManager/hooks/useKBData', () => ({
    useKBData: vi.fn(() => ({
        paginatedItems: mockItems,
        totalPages: 1,
        totalCount: 2
    }))
}));

// Mock do KBOperations
vi.mock('../../components/KnowledgeBaseManager/hooks/useKBOperations', () => ({
    useKBOperations: vi.fn(() => ({
        toggleSelect: vi.fn(),
        toggleSelectAll: vi.fn()
    }))
}));

describe('KBTable - Ações e Variações de Pergunta', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        cleanup();
    });

    it('deve renderizar a tabela, itens e o badge de variações de pergunta', () => {
        render(<KBTable />);

        // Verifica renderização dos itens
        expect(screen.getByText('O que é RAG?')).toBeInTheDocument();
        expect(screen.getByText('RAG significa Retrieval-Augmented Generation.')).toBeInTheDocument();
        expect(screen.getByText('Qual o valor?')).toBeInTheDocument();

        // O primeiro item possui 2 variações, logo o badge deve ser renderizado
        expect(screen.getByTestId('variation-badge-1')).toBeInTheDocument();
        expect(screen.getByText('🔀 +2 variações')).toBeInTheDocument();

        // O segundo item não tem variações, logo não deve renderizar badge para ele
        expect(screen.queryByTestId('variation-badge-2')).not.toBeInTheDocument();
    });

    it('deve disparar abertura de edição ao clicar no botão de editar', () => {
        render(<KBTable />);

        const editButtons = screen.getAllByTitle('Editar item');
        expect(editButtons.length).toBe(2);

        fireEvent.click(editButtons[0]);

        expect(mockSetItemToEdit).toHaveBeenCalledWith(mockItems[0]);
        expect(mockSetIsEditOpen).toHaveBeenCalledWith(true);
    });

    it('deve disparar confirmação de exclusão ao clicar no botão de excluir', () => {
        render(<KBTable />);

        const deleteButtons = screen.getAllByTitle('Excluir item');
        expect(deleteButtons.length).toBe(2);

        fireEvent.click(deleteButtons[1]);

        expect(mockSetItemToDelete).toHaveBeenCalledWith({ id: 2, index: 1 });
        expect(mockSetIsConfirmOpen).toHaveBeenCalledWith(true);
    });

    it('deve renderizar badges visíveis de metadados para itens que possuem metadados configurados', () => {
        render(<KBTable />);

        // O primeiro item possui metadata_val: 'IA | NLP', logo deve renderizar 2 badges de metadados
        expect(screen.getByTestId('metadata-badge-1-0')).toBeInTheDocument();
        expect(screen.getByText('🏷️ IA')).toBeInTheDocument();
        expect(screen.getByTestId('metadata-badge-1-1')).toBeInTheDocument();
        expect(screen.getByText('🏷️ NLP')).toBeInTheDocument();

        // O segundo item possui metadata_val: '', logo não deve renderizar badge de metadado
        expect(screen.queryByTestId('metadata-badge-2-0')).not.toBeInTheDocument();
    });
});
