import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import SimulatorResultCard from '../../components/KnowledgeBaseManager/components/SimulatorResultCard';
import SimulatorDiscardedCard, { getDiscardFilterStyle } from '../../components/KnowledgeBaseManager/components/SimulatorDiscardedCard';

vi.mock('../../components/KnowledgeBaseManager/KBContext', () => ({
    useKB: () => ({
        kbId: 10,
        simQuery: 'teste de busca',
        setSimQuery: vi.fn(),
        reloadKnowledgeBase: vi.fn(),
        setSimResults: vi.fn()
    })
}));

describe('SimulatorResultCard', () => {
    const mockItem = {
        id: 101,
        question: 'Como resetar minha senha?',
        answer: 'Clique em esqueci minha senha.',
        relevance_score: 0.92,
        category: 'Acesso',
        search_type: 'semantic',
        metadata_val: 'suporte | login'
    };

    it('renderiza os dados da pergunta, resposta e score corretamente', () => {
        render(
            <SimulatorResultCard
                item={mockItem}
                idx={0}
                queryContext="esqueci senha"
                setItemToEdit={vi.fn()}
                setIsEditOpen={vi.fn()}
                handleOpenDelete={vi.fn()}
            />
        );

        expect(screen.getByText(/1\. Como resetar minha senha\?/i)).toBeInTheDocument();
        expect(screen.getByText(/Clique em esqueci minha senha\./i)).toBeInTheDocument();
        expect(screen.getByText('92%')).toBeInTheDocument();
        expect(screen.getByText('Acesso')).toBeInTheDocument();
        expect(screen.getByText('semantic')).toBeInTheDocument();
    });

    it('dispara ações de editar e excluir ao clicar nos botões', () => {
        const mockSetItemToEdit = vi.fn();
        const mockSetIsEditOpen = vi.fn();
        const mockHandleOpenDelete = vi.fn();

        render(
            <SimulatorResultCard
                item={mockItem}
                idx={0}
                queryContext="esqueci senha"
                setItemToEdit={mockSetItemToEdit}
                setIsEditOpen={mockSetIsEditOpen}
                handleOpenDelete={mockHandleOpenDelete}
            />
        );

        const editBtn = screen.getByTestId('edit-result-btn-101');
        fireEvent.click(editBtn);
        expect(mockSetItemToEdit).toHaveBeenCalledWith(mockItem);
        expect(mockSetIsEditOpen).toHaveBeenCalledWith(true);

        const deleteBtn = screen.getByTestId('delete-result-btn-101');
        fireEvent.click(deleteBtn);
        expect(mockHandleOpenDelete).toHaveBeenCalledWith(mockItem);
    });
});

describe('SimulatorDiscardedCard & getDiscardFilterStyle', () => {
    it('determina corretamente os estilos de filtro de descarte', () => {
        const agentic = getDiscardFilterStyle({ discard_filter: 'AGENTIC_EVAL' });
        expect(agentic.label).toContain('AGENTIC EVAL');

        const threshold = getDiscardFilterStyle({ discard_filter: 'THRESHOLD_RELEVANCE', discard_reason: 'limiar baixo' });
        expect(threshold.label).toContain('RELEVÂNCIA MÍNIMA');

        const rerank = getDiscardFilterStyle({ discard_filter: 'RERANK_LIMIT', discard_reason: 'fora do limite' });
        expect(rerank.label).toContain('RERANK / LIMITE');
    });

    it('renderiza o card de item descartado com o motivo e badge', () => {
        const mockDiscarded = {
            id: 202,
            question: 'Qual o valor da assinatura?',
            answer: 'Custa R$ 99/mês.',
            relevance_score: 0.35,
            discard_filter: 'THRESHOLD',
            discard_reason: 'Relevância abaixo do limiar mínimo de 50%.'
        };

        render(
            <SimulatorDiscardedCard
                item={mockDiscarded}
                idx={1}
                queryContext="preço"
                setItemToEdit={vi.fn()}
                setIsEditOpen={vi.fn()}
                handleOpenDelete={vi.fn()}
            />
        );

        expect(screen.getByText(/2\. Qual o valor da assinatura\?/i)).toBeInTheDocument();
        expect(screen.getByText(/Relevância abaixo do limiar mínimo de 50%\./i)).toBeInTheDocument();
        expect(screen.getByTestId('discard-filter-badge-202')).toBeInTheDocument();
    });
});
