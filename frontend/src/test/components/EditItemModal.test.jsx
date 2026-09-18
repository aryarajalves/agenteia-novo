import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import React from 'react';
import EditItemModal from '../../components/KnowledgeBaseManager/components/EditItemModal';

const mockSetIsEditOpen = vi.fn();
const mockSetItemToEdit = vi.fn();
const mockSetSimResults = vi.fn();
const mockReloadKnowledgeBase = vi.fn();
const mockHandleUpdateItem = vi.fn();

let mockIsEditOpen = true;
let mockItemToEdit = {
    id: 10,
    question: 'Como funciona o curso?',
    answer: 'O curso é online com certificado.',
    metadata_val: 'pagamento | boleto',
    category: 'Cursos',
    question_variations: ['O curso é online?']
};

vi.mock('../../components/KnowledgeBaseManager/KBContext', () => ({
    useKB: () => ({
        isEditOpen: mockIsEditOpen,
        setIsEditOpen: mockSetIsEditOpen,
        itemToEdit: mockItemToEdit,
        setItemToEdit: mockSetItemToEdit,
        kbLabels: { question: 'Pergunta', answer: 'Resposta', metadata: 'Metadado' },
        setSimResults: mockSetSimResults,
        reloadKnowledgeBase: mockReloadKnowledgeBase
    })
}));

vi.mock('../../components/KnowledgeBaseManager/hooks/useKBOperations', () => ({
    useKBOperations: () => ({
        handleUpdateItem: mockHandleUpdateItem
    })
}));

vi.mock('../../api/client', () => ({
    api: {
        get: vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ embedding: [0.1234, 0.5678] })
        }),
        put: vi.fn(),
        post: vi.fn(),
        delete: vi.fn()
    }
}));

describe('EditItemModal - Edição e Sincronização com Simulador', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockIsEditOpen = true;
        mockItemToEdit = {
            id: 10,
            question: 'Como funciona o curso?',
            answer: 'O curso é online com certificado.',
            metadata_val: 'pagamento | boleto',
            category: 'Cursos',
            question_variations: ['O curso é online?']
        };
    });

    afterEach(() => {
        cleanup();
    });

    it('renderiza os dados pré-preenchidos do item a ser editado', async () => {
        render(<EditItemModal />);

        // Aguarda carregar o vetor para evitar warning de act
        await waitFor(() => {
            expect(screen.getByText('2 dimensões')).toBeInTheDocument();
        });

        // Título do modal
        expect(screen.getByText('✏️ Editar Conhecimento')).toBeInTheDocument();

        // Pergunta e Resposta preenchidas
        const questionInput = screen.getByDisplayValue('Como funciona o curso?');
        expect(questionInput).toBeInTheDocument();

        const answerInput = screen.getByDisplayValue('O curso é online com certificado.');
        expect(answerInput).toBeInTheDocument();

        // Categoria preenchida
        const categoryInput = screen.getByDisplayValue('Cursos');
        expect(categoryInput).toBeInTheDocument();

        // Badges de metadados renderizadas
        expect(screen.getByText('pagamento')).toBeInTheDocument();
        expect(screen.getByText('boleto')).toBeInTheDocument();

        // Variação de pergunta existente
        expect(screen.getByText('O curso é online?')).toBeInTheDocument();
    });

    it('fecha o modal ao clicar em Cancelar', async () => {
        render(<EditItemModal />);

        await waitFor(() => {
            expect(screen.getByText('2 dimensões')).toBeInTheDocument();
        });

        const cancelBtn = screen.getByRole('button', { name: /Cancelar/i });
        fireEvent.click(cancelBtn);

        expect(mockSetIsEditOpen).toHaveBeenCalledWith(false);
        expect(mockSetItemToEdit).toHaveBeenCalledWith(null);
    });

    it('salva alterações, atualiza simResults e fecha o modal ao submeter com sucesso', async () => {
        mockHandleUpdateItem.mockResolvedValueOnce(true);

        render(<EditItemModal />);

        await waitFor(() => {
            expect(screen.getByText('2 dimensões')).toBeInTheDocument();
        });

        const saveBtn = screen.getByRole('button', { name: /Salvar Alterações/i });
        fireEvent.click(saveBtn);

        await waitFor(() => {
            expect(mockHandleUpdateItem).toHaveBeenCalledWith(10, expect.objectContaining({
                question: 'Como funciona o curso?',
                answer: 'O curso é online com certificado.',
                metadata_val: 'pagamento | boleto',
                category: 'Cursos',
                question_variations: ['O curso é online?']
            }));

            // Deve sincronizar com simResults para refletir nos cards do simulador
            expect(mockSetSimResults).toHaveBeenCalled();
            expect(mockReloadKnowledgeBase).toHaveBeenCalled();
            expect(mockSetIsEditOpen).toHaveBeenCalledWith(false);
            expect(mockSetItemToEdit).toHaveBeenCalledWith(null);
        });

        // Testa a função updater passada para mockSetSimResults
        const updater = mockSetSimResults.mock.calls[0][0];
        const prevResults = {
            items: [
                { id: 10, question: 'Velha pergunta', answer: 'Velha resposta' },
                { id: 20, question: 'Outro item', answer: 'Outra resposta' }
            ],
            discarded_items: [
                { id: 10, question: 'Velha pergunta descartada', answer: 'Velha resposta descartada' }
            ]
        };
        const nextResults = updater(prevResults);

        // O item 10 deve estar atualizado com a nova pergunta e resposta
        expect(nextResults.items[0].question).toBe('Como funciona o curso?');
        expect(nextResults.items[0].answer).toBe('O curso é online com certificado.');
        expect(nextResults.discarded_items[0].question).toBe('Como funciona o curso?');
        // O outro item não deve ser alterado
        expect(nextResults.items[1].question).toBe('Outro item');
    });
});
