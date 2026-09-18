import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import React from 'react';
import ItemVariationQuickAdd from '../../components/KnowledgeBaseManager/components/ItemVariationQuickAdd';
import { api } from '../../api/client';

const mockReloadKnowledgeBase = vi.fn();

vi.mock('../../components/KnowledgeBaseManager/KBContext', () => ({
    useKB: () => ({
        reloadKnowledgeBase: mockReloadKnowledgeBase
    })
}));

vi.mock('../../api/client', () => ({
    api: {
        post: vi.fn(),
        delete: vi.fn()
    }
}));

describe('ItemVariationQuickAdd Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        cleanup();
    });

    const mockItem = {
        id: 101,
        question: 'Como funciona o curso?',
        answer: 'O curso é 100% online.',
        question_variations: ['Qual a metodologia do curso?']
    };

    it('renderiza as variações existentes e o botão "+ Adicionar Variação"', () => {
        render(<ItemVariationQuickAdd item={mockItem} defaultQuery="como funciona o curso MLD?" />);

        expect(screen.getByText(/Qual a metodologia do curso\?/i)).toBeInTheDocument();
        const addBtn = screen.getByTestId('add-var-btn-101');
        expect(addBtn).toBeInTheDocument();
        expect(addBtn).toHaveTextContent(/Adicionar Variação/i);
    });

    it('abre o formulário inline pré-preenchido com a query atual do simulador', () => {
        render(<ItemVariationQuickAdd item={mockItem} defaultQuery="como funciona o curso MLD?" />);

        const addBtn = screen.getByTestId('add-var-btn-101');
        fireEvent.click(addBtn);

        const input = screen.getByTestId('var-input-101');
        expect(input).toBeInTheDocument();
        expect(input.value).toBe('como funciona o curso MLD?');
        expect(screen.getByTestId('var-save-btn-101')).toBeInTheDocument();
        expect(screen.getByTestId('var-cancel-btn-101')).toBeInTheDocument();
    });

    it('fecha o formulário ao clicar em Cancelar', () => {
        render(<ItemVariationQuickAdd item={mockItem} defaultQuery="como funciona o curso MLD?" />);

        fireEvent.click(screen.getByTestId('add-var-btn-101'));
        expect(screen.getByTestId('var-input-101')).toBeInTheDocument();

        fireEvent.click(screen.getByTestId('var-cancel-btn-101'));
        expect(screen.queryByTestId('var-input-101')).not.toBeInTheDocument();
    });

    it('envia a requisição para a API e atualiza a lista de variações com sucesso', async () => {
        const onVariationAdded = vi.fn();
        api.post.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                message: 'Variação adicionada com sucesso.',
                item_id: 101,
                question_variations: ['Qual a metodologia do curso?', 'como funciona o curso MLD?']
            })
        });

        render(
            <ItemVariationQuickAdd 
                item={mockItem} 
                defaultQuery="como funciona o curso MLD?" 
                onVariationAdded={onVariationAdded} 
            />
        );

        fireEvent.click(screen.getByTestId('add-var-btn-101'));
        const saveBtn = screen.getByTestId('var-save-btn-101');
        fireEvent.click(saveBtn);

        await waitFor(() => {
            expect(api.post).toHaveBeenCalledWith('/knowledge-items/101/variations', {
                variation: 'como funciona o curso MLD?'
            });
            expect(screen.getByTestId('feedback-success-101')).toHaveTextContent(/Variação adicionada com sucesso!/i);
            expect(mockReloadKnowledgeBase).toHaveBeenCalled();
            expect(onVariationAdded).toHaveBeenCalledWith([
                'Qual a metodologia do curso?',
                'como funciona o curso MLD?'
            ]);
        });
    });

    it('exibe mensagem de erro quando a API falha', async () => {
        api.post.mockResolvedValueOnce({
            ok: false,
            json: async () => ({ detail: 'Não foi possível gerar embedding' })
        });

        render(<ItemVariationQuickAdd item={mockItem} defaultQuery="nova variação" />);

        fireEvent.click(screen.getByTestId('add-var-btn-101'));
        fireEvent.click(screen.getByTestId('var-save-btn-101'));

        await waitFor(() => {
            expect(screen.getByTestId('var-error-101')).toHaveTextContent(/Não foi possível gerar embedding/i);
        });
    });

    it('bloqueia o botão de adicionar e exibe badge e aviso explicativo ao atingir 8 variações', () => {
        const itemWithMaxVariations = {
            id: 101,
            question: 'Como funciona o curso?',
            question_variations: Array.from({ length: 8 }, (_, i) => `Variação ${i + 1}`)
        };

        render(<ItemVariationQuickAdd item={itemWithMaxVariations} defaultQuery="mais uma variação" />);

        // O botão + Adicionar não deve estar visível
        expect(screen.queryByTestId('add-var-btn-101')).not.toBeInTheDocument();

        // O badge de limite deve estar presente
        const limitBadge = screen.getByTestId('limit-reached-badge-101');
        expect(limitBadge).toBeInTheDocument();
        expect(limitBadge).toHaveTextContent(/Limite de 8\/8 variações atingido/i);

        // A explicação pedagógica (diluição do vetor) deve estar presente
        const limitExplanation = screen.getByTestId('limit-explanation-101');
        expect(limitExplanation).toBeInTheDocument();
        expect(limitExplanation).toHaveTextContent(/evitar diluição do vetor/i);
        expect(limitExplanation).toHaveTextContent(/máximo 8 variações/i);
    });

    it('permite deletar uma variação diretamente pelo botão ✕ no chip do simulador', async () => {
        const onVariationAdded = vi.fn();
        api.delete.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                message: 'Variação removida com sucesso.',
                item_id: 101,
                question_variations: []
            })
        });

        render(
            <ItemVariationQuickAdd 
                item={mockItem} 
                defaultQuery="como funciona o curso MLD?" 
                onVariationAdded={onVariationAdded} 
            />
        );

        // Verifica que o botão de deletar o chip está renderizado
        const deleteChipBtn = screen.getByTestId('delete-var-btn-101-0');
        expect(deleteChipBtn).toBeInTheDocument();

        fireEvent.click(deleteChipBtn);

        await waitFor(() => {
            expect(api.delete).toHaveBeenCalledWith(
                '/knowledge-items/101/variations?variation=' + encodeURIComponent('Qual a metodologia do curso?')
            );
            expect(screen.getByTestId('feedback-success-101')).toHaveTextContent(/Variação removida com sucesso!/i);
            expect(mockReloadKnowledgeBase).toHaveBeenCalled();
            expect(onVariationAdded).toHaveBeenCalledWith([]);
        });
    });
});
